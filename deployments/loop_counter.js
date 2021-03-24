const { buildContractClass, bsv, num2bin, getPreimage, SigHashPreimage, toHex } = require('scryptlib');
const { loadDesc, showError, createLockingTx, sendTx, createUnlockingTx } = require('../helper');
const { privateKey } = require('../privateKey');

DataLen = 1
const fee = 5000


function Memory(a, b) {
  this.a = a
  this.b = b
}

function State(state, txid, loop, amount) {
  this.current_state = state
  this.txid = txid
  this.loop = loop
  this.amount = amount
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
  const Loop = buildContractClass(loadDesc('final_loop_main_desc.json'))
  loop = new Loop()
  loop.setDataPart(tobin(state) + num2bin(0, DataLen) + tobin(state))
  // lock fund to the script
  const lockingTx = await createLockingTx(privateKey.toAddress(), amount, fee)
  lockingTx.outputs[0].setScript(loop.lockingScript)
  lockingTx.sign(privateKey)
  const lockingTxid = await sendTx(lockingTx)
  new_state = new State(state, lockingTxid, loop, amount)
  log_state("create_contract", new_state)
  return new_state
}
async function begin_loop(state) {
  current_state = state.current_state; lockingTxid = state.txid; loop = state.loop; amount = state.amount;
  let prevLockingScript = state.loop.lockingScript.toASM()

  // update state
  loop.setDataPart(tobin(current_state) + num2bin(1, DataLen) + tobin(current_state))
  const newLockingScript = loop.lockingScript.toASM();
  newAmount = amount - fee

  const unlockingTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript, newAmount, newLockingScript)
  const preimage = getPreimage(unlockingTx, prevLockingScript, amount)
  const unlockingScript = loop.to_loop_1(new SigHashPreimage(toHex(preimage))).toScript()
  unlockingTx.inputs[0].setScript(unlockingScript)
  unlockingTxid = await sendTx(unlockingTx)
  new_state = new State(current_state, unlockingTxid, loop, newAmount)
  log_state("begin_loop", new_state)
  return new_state
}
async function iter_loop(mem_n, state) {
  current_state = state.current_state; lockingTxid = state.txid; loop = state.loop; amount = state.amount;

  current_state = recursive_function(current_state)

  let prevLockingScript = state.loop.lockingScript.toASM()

  // update state
  loop.setDataPart(tobin(mem_n) + num2bin(1, DataLen) + tobin(current_state))
  const newLockingScript = loop.lockingScript.toASM();
  newAmount = amount - fee

  const unlockingTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript, newAmount, newLockingScript)
  const preimage = getPreimage(unlockingTx, prevLockingScript, amount)
  const unlockingScript = loop.to_loop_2(new SigHashPreimage(toHex(preimage))).toScript()
  unlockingTx.inputs[0].setScript(unlockingScript)
  unlockingTxid = await sendTx(unlockingTx)
  new_state = new State(current_state, unlockingTxid, loop, newAmount)
  log_state("iter_loop", new_state)
  return new_state
}
async function end_loop(mem_n, state) {
  current_state= state.current_state; lockingTxid = state.txid; loop = state.loop; amount = state.amount;

  let prevLockingScript = state.loop.lockingScript.toASM()

  // update state
  loop.setDataPart(tobin(mem_n) + num2bin(2, DataLen) + tobin(current_state))
  const newLockingScript = loop.lockingScript.toASM();
  newAmount = amount - fee

  const unlockingTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript, newAmount, newLockingScript)
  const preimage = getPreimage(unlockingTx, prevLockingScript, amount)
  const unlockingScript = loop.to_loop_2(new SigHashPreimage(toHex(preimage))).toScript()
  unlockingTx.inputs[0].setScript(unlockingScript)
  unlockingTxid = await sendTx(unlockingTx)
  new_state = new State(current_state, unlockingTxid, loop, newAmount)
  log_state("end_loop", new_state)
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
  log_state("random_computation", new_state)
  return new_state
}

(async() => {
    try {
        const amount = 50000
        const first_state = new Memory(7, 5)

        var state
        state = await create_contract(first_state, amount)
        state = await begin_loop(state)
        while(condition(state.current_state)) {
          state = await iter_loop(first_state, state)
        }
        state = await end_loop(first_state, state)
        state = await unlock_utxo(first_state, state)

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()
