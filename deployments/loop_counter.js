const { buildContractClass, bsv, num2bin, getPreimage, SigHashPreimage, toHex, Bytes } = require('scryptlib');
const { loadDesc, showError, createLockingTx, sendTx, createUnlockingTx } = require('../helper');
const { privateKey } = require('../privateKey');

DataLen = 1
const fee = 7000

function sha256(hexstr) {
  // We transform the string into an arraybuffer.
  var buffer = new Uint8Array(hexstr.match(/[\da-f]{2}/gi).map(function (h) {
    return parseInt(h, 16)
  }));
  return bsv.crypto.Hash.sha256(buffer).toString('hex');
}

//Function for the recursive function

function Memory(a, b) {
  this.a = a
  this.b = b
}

function State(state, txid, loop, amount, h) {
  this.current_state = state
  this.txid = txid
  this.loop = loop
  this.amount = amount
  this.h = h
}
function tobin(state) {
  return num2bin(state.a, DataLen) + num2bin(state.b, DataLen)
}
function recursive_function(state) {
  a = state.a
  b = state.b
  if (b != 0) {
    t = b
    b = a % b
    a = t
  }
  return new Memory(a, b)
}
function condition(state) {
  return state.b > 0
}

function log_state(f, state) {
  console.log("function:", f, "current_state:", state.current_state.a, state.current_state.b, "amount:", this.amount, "txid:", state.txid)
}

async function create_contract(state, amount) {
  const After = buildContractClass(loadDesc('after_desc.json'))
  const after = new After()
  script = after.lockingScript.toHex()

  const Loop = buildContractClass(loadDesc('final_loop_main_desc.json'))
  loop = new Loop(new Bytes(sha256(script)))
  loop.setDataPart(tobin(state) + "848a3e708ebad6315d9bc31700b1c549f7da807b8882c144bd9418c361621fca" + num2bin(0, DataLen) + tobin(state))
  // lock fund to the script
  const lockingTx = await createLockingTx(privateKey.toAddress(), amount, fee)
  lockingTx.outputs[0].setScript(loop.lockingScript)
  lockingTx.sign(privateKey)
  const lockingTxid = await sendTx(lockingTx)
  new_state = new State(state, lockingTxid, loop, amount, "848a3e708ebad6315d9bc31700b1c549f7da807b8882c144bd9418c361621fca")
  log_state("create_contract", new_state)
  return new_state
}
async function morph(state) {
  current_state = state.current_state; lockingTxid = state.txid; loop = state.loop; amount = state.amount;

  const After = buildContractClass(loadDesc('after_desc.json'))
  const after = new After()
  script = after.lockingScript.toHex()
  const code = after.lockingScript.toHex()

  const Loop = buildContractClass(loadDesc('final_loop_main_desc.json'))
  const newLoop = new Loop(new Bytes(sha256(script)))




  h_before = sha256(newLoop.lockingScript.toHex());
  newLoop.setDataPart(tobin(current_state) + "848a3e708ebad6315d9bc31700b1c549f7da807b8882c144bd9418c361621fca" + num2bin(0, DataLen) + tobin(current_state));





  after.setDataPart(tobin(current_state) + h_before + num2bin(0, DataLen) + tobin(current_state));

  let prevLockingScript = state.loop.lockingScript.toASM()

  // update state
  const newLockingScript = after.lockingScript.toASM();
  newAmount = amount - fee

  const unlockingTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript, newAmount, newLockingScript)
  const preimage = getPreimage(unlockingTx, prevLockingScript, amount)
  const unlockingScript = loop.morph(new SigHashPreimage(toHex(preimage)), new Bytes(code), new Bytes(h_before), newAmount).toScript()
  unlockingTx.inputs[0].setScript(unlockingScript)
  unlockingTxid = await sendTx(unlockingTx)
  new_state = new State(current_state, unlockingTxid, after, newAmount, h_before)
  log_state("morph", new_state)
  return new_state
}
async function begin_loop(state) {
  current_state = state.current_state; lockingTxid = state.txid; loop = state.loop; amount = state.amount; h = state.h;
  let prevLockingScript = state.loop.lockingScript.toASM()

  // update state
  loop.setDataPart(tobin(current_state) + h + num2bin(1, DataLen) + tobin(current_state))
  const newLockingScript = loop.lockingScript.toASM();
  newAmount = amount - fee

  const unlockingTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript, newAmount, newLockingScript)
  const preimage = getPreimage(unlockingTx, prevLockingScript, amount)
  const unlockingScript = loop.to_loop_1(new SigHashPreimage(toHex(preimage))).toScript()
  unlockingTx.inputs[0].setScript(unlockingScript)
  unlockingTxid = await sendTx(unlockingTx)
  new_state = new State(current_state, unlockingTxid, loop, newAmount, h)
  log_state("begin_loop", new_state)
  return new_state
}
async function iter_loop(mem_n, state) {
  current_state = state.current_state; lockingTxid = state.txid; loop = state.loop; amount = state.amount; h = state.h;

  current_state = recursive_function(current_state)

  let prevLockingScript = state.loop.lockingScript.toASM()

  // update state
  loop.setDataPart(tobin(mem_n) + h + num2bin(1, DataLen) + tobin(current_state))
  const newLockingScript = loop.lockingScript.toASM();
  newAmount = amount - fee

  const unlockingTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript, newAmount, newLockingScript)
  const preimage = getPreimage(unlockingTx, prevLockingScript, amount)
  const unlockingScript = loop.to_loop_2(new SigHashPreimage(toHex(preimage))).toScript()
  unlockingTx.inputs[0].setScript(unlockingScript)
  unlockingTxid = await sendTx(unlockingTx)
  new_state = new State(current_state, unlockingTxid, loop, newAmount, h)
  log_state("iter_loop", new_state)
  return new_state
}
async function end_loop(mem_n, state) {
  current_state= state.current_state; lockingTxid = state.txid; loop = state.loop; amount = state.amount; h = state.h;

  let prevLockingScript = state.loop.lockingScript.toASM()

  // update state
  loop.setDataPart(tobin(mem_n) + h + num2bin(2, DataLen) + tobin(current_state))
  const newLockingScript = loop.lockingScript.toASM();
  newAmount = amount - fee

  const unlockingTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript, newAmount, newLockingScript)
  const preimage = getPreimage(unlockingTx, prevLockingScript, amount)
  const unlockingScript = loop.to_loop_2(new SigHashPreimage(toHex(preimage))).toScript()
  unlockingTx.inputs[0].setScript(unlockingScript)
  unlockingTxid = await sendTx(unlockingTx)
  new_state = new State(current_state, unlockingTxid, loop, newAmount, h)
  log_state("end_loop", new_state)
  return new_state
}
async function morph_back(mem_n, state) {
  current_state = state.current_state; lockingTxid = state.txid; loop = state.loop; amount = state.amount; h = state.h;

  const After = buildContractClass(loadDesc('after_desc.json'))
  const after = new After()
  script = after.lockingScript.toHex()

  const Loop = buildContractClass(loadDesc('final_loop_main_desc.json'))
  const newLoop = new Loop(new Bytes(sha256(script)))
  const newLoop2 = new Loop(new Bytes(sha256(script)))
  const code = newLoop2.lockingScript.toHex()
  newLoop.setDataPart(tobin(mem_n) + h + num2bin(2, DataLen) + tobin(current_state));

  h_before = sha256(newLoop.lockingScript.toHex());

  loop.setDataPart(tobin(mem_n) + h + num2bin(2, DataLen) + tobin(current_state));

  let prevLockingScript = state.loop.lockingScript.toASM()

  // update state
  const newLockingScript = newLoop.lockingScript.toASM();
  newAmount = amount - fee

  const unlockingTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript, newAmount, newLockingScript)
  const preimage = getPreimage(unlockingTx, prevLockingScript, amount)
  const unlockingScript = state.loop.morph_back(new SigHashPreimage(toHex(preimage)), new Bytes(code), newAmount).toScript()
  unlockingTx.inputs[0].setScript(unlockingScript)
  unlockingTxid = await sendTx(unlockingTx)
  new_state = new State(current_state, unlockingTxid, newLoop, newAmount)
  log_state("morph back", new_state)
  return new_state
}
async function unlock_utxo(first_state, state) {
  current_state = state.current_state; lockingTxid = state.txid; loop = state.loop; amount = state.amount;

  let prevLockingScript = state.loop.lockingScript.toASM()

  // update state
  loop.setDataPart(num2bin(0, DataLen)); //Whatever this is the end of the computation anyway
  const newLockingScript = loop.lockingScript.toASM();
  newAmount = amount - fee

  const unlockingTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript, newAmount, newLockingScript)
  const preimage = getPreimage(unlockingTx, prevLockingScript, amount)
  const unlockingScript = loop.unlock_utxo(new SigHashPreimage(toHex(preimage)), first_state.a, first_state.b).toScript()
  unlockingTx.inputs[0].setScript(unlockingScript)
  unlockingTxid = await sendTx(unlockingTx)
  new_state = new State(current_state, unlockingTxid, loop, newAmount)
  log_state("unlock_utxo", new_state)
  return new_state
}

(async() => {
    try {
        const amount = 60000
        const first_state = new Memory(7, 5)

        var state
        state = await create_contract(first_state, amount)
        state = await morph(state)
        state = await begin_loop(state)
        while(condition(state.current_state)) {
          state = await iter_loop(first_state, state)
        }
        state = await end_loop(first_state, state)
        state = await morph_back(first_state, state)
        state = await unlock_utxo(first_state, state)

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()
