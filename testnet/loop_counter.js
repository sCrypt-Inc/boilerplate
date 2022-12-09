const { buildContractClass, bsv, num2bin, getPreimage, SigHashPreimage, toHex } = require('scryptlib');
const { DataLen, loadDesc, showError, sendTx, deployContract } = require('../helper');
const { privateKey } = require('../privateKey');

function Memory(a, b) {
  this.a = a
  this.b = b
}

function State(state, tx, loop, amount) {
  this.current_state = state
  this.tx = tx
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
  console.log("function:", f, "current_state:", state.current_state.a, state.current_state.b, "amount:", state.amount, "txid:", state.tx.id)
}

async function create_contract(state, amount) {
  const Loop = buildContractClass(loadDesc('final_loop_main_debug_desc.json'))
  loop = new Loop()
  loop.setDataPart(tobin(state) + num2bin(0, DataLen) + tobin(state))
  // lock fund to the script
  const lockingTx = await deployContract(loop, amount)

  new_state = new State(state, lockingTx, loop, amount)
  log_state("create_contract", new_state)
  return new_state
}
async function begin_loop(state) {
  current_state = state.current_state; prevTx = state.tx; loop = state.loop; amount = state.amount;
  // update state
  loop.setDataPart(tobin(current_state) + num2bin(1, DataLen) + tobin(current_state))
  const newLockingScript = loop.lockingScript;


  const unlockingTx = new bsv.Transaction();
  unlockingTx.addInputFromPrevTx(prevTx)
    .setOutput(0, (tx) => {
      const newAmount = amount - tx.getEstimateFee()
      return new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: newAmount,
      })
    })
    .setInputScript(0, (tx, output) => {
      const preimage = getPreimage(tx, output.script, output.satoshis)
      const newAmount = amount - tx.getEstimateFee()
      return loop.to_loop_1(new SigHashPreimage(toHex(preimage)), newAmount).toScript()
    })
    .seal()

  unlockingTxid = await sendTx(unlockingTx)

  const newAmount = unlockingTx.outputs[0].satoshis

  new_state = new State(current_state, unlockingTx, loop, newAmount)
  log_state("begin_loop", new_state)
  return new_state
}
async function iter_loop(mem_n, state) {
  current_state = state.current_state; prevTx = state.tx; loop = state.loop; amount = state.amount;

  current_state = recursive_function(current_state)

  // update state
  loop.setDataPart(tobin(mem_n) + num2bin(1, DataLen) + tobin(current_state))
  const newLockingScript = loop.lockingScript;

  
  const unlockingTx = new bsv.Transaction();
  unlockingTx.addInputFromPrevTx(prevTx)
    .setOutput(0, (tx) => {
      const newAmount = amount - tx.getEstimateFee()
      return new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: newAmount,
      })
    })
    .setInputScript(0, (tx, output) => {
      const preimage = getPreimage(tx, output.script, output.satoshis)
      const newAmount = amount - tx.getEstimateFee()
      return loop.to_loop_2(new SigHashPreimage(toHex(preimage)), newAmount).toScript()
    })
    .seal()


  unlockingTxid = await sendTx(unlockingTx)

  const newAmount = unlockingTx.outputs[0].satoshis
  new_state = new State(current_state, unlockingTx, loop, newAmount)
  log_state("iter_loop", new_state)
  return new_state
}
async function end_loop(mem_n, state) {
  current_state = state.current_state; prevTx = state.tx; loop = state.loop; amount = state.amount;

  // update state
  loop.setDataPart(tobin(mem_n) + num2bin(2, DataLen) + tobin(current_state))
  const newLockingScript = loop.lockingScript;

  
  const unlockingTx = new bsv.Transaction();
  unlockingTx.addInputFromPrevTx(prevTx)
    .setOutput(0, (tx) => {
      const newAmount = amount - tx.getEstimateFee()
      return new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: newAmount,
      })
    })
    .setInputScript(0, (tx, output) => {
      const preimage = getPreimage(tx, output.script, output.satoshis)
      const newAmount = amount - tx.getEstimateFee()
      return loop.to_loop_2(new SigHashPreimage(toHex(preimage)), newAmount).toScript()
    })
    .seal()

  unlockingTxid = await sendTx(unlockingTx)

  const newAmount = unlockingTx.outputs[0].satoshis
  new_state = new State(current_state, unlockingTx, loop, newAmount)
  log_state("end_loop", new_state)
  return new_state
}
async function unlock_utxo(first_state, state) {
  current_state = state.current_state; prevTx = state.tx; loop = state.loop; amount = state.amount;
  // update state
  loop.setDataPart(num2bin(0, DataLen)); //Whatever this is the end of the computation anyway
  const newLockingScript = bsv.Script.buildPublicKeyHashOut(privateKey.toAddress())

  const unlockingTx = new bsv.Transaction();
  unlockingTx.addInputFromPrevTx(prevTx)
    .setOutput(0, (tx) => {
      const newAmount = amount - tx.getEstimateFee()
      return new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: newAmount,
      })
    })
    .setInputScript(0, (tx, output) => {
      const preimage = getPreimage(tx, output.script, output.satoshis)
      return loop.unlock_utxo(new SigHashPreimage(toHex(preimage)), first_state.a, first_state.b).toScript()
    })
    .seal()



  unlockingTxid = await sendTx(unlockingTx)
  const newAmount = unlockingTx.outputs[0].satoshis
  new_state = new State(current_state, unlockingTx, loop, newAmount)
  log_state("random_computation", new_state)
  return new_state
}

(async () => {
  try {
    const amount = 50000
    const first_state = new Memory(7, 5)

    var state
    state = await create_contract(first_state, amount)
    state = await begin_loop(state)
    while (condition(state.current_state)) {
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
