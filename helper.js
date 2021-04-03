const path = require('path')
const {
  readFileSync,
  existsSync,
  mkdirSync
} = require('fs')
const {
  bsv,
  compileContract: compileContractImpl
} = require('scryptlib')
const {
  getPlatformScryptc,
} = require('scryptlib/dist/compilerWrapper')
const { exit } = require('process');

const Signature = bsv.crypto.Signature
const BN = bsv.crypto.BN
const Interpreter = bsv.Script.Interpreter

// number of bytes to denote some numeric value
const DataLen = 1

const axios = require('axios')
const API_PREFIX = 'https://api.whatsonchain.com/v1/bsv/test'

const inputIndex = 0
const inputSatoshis = 100000
const flags = Interpreter.SCRIPT_VERIFY_MINIMALDATA | Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID | Interpreter.SCRIPT_ENABLE_MAGNETIC_OPCODES | Interpreter.SCRIPT_ENABLE_MONOLITH_OPCODES
const minFee = 546
const dummyTxId = 'a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458'
const reversedDummyTxId = '5884e5db9de218238671572340b207ee85b628074e7e467096c267266baf77a4'
const sighashType2Hex = s => s.toString(16)

function newTx() {
  const utxo = {
    txId: 'a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458',
    outputIndex: 0,
    script: '',   // placeholder
    satoshis: inputSatoshis
  };
  return new bsv.Transaction().from(utxo);
}



// reverse hexStr byte order
function reverseEndian(hexStr) {
  let num = new BN(hexStr, 'hex')
  let buf = num.toBuffer()
  return buf.toString('hex').match(/.{2}/g).reverse().join('')
}

async function createPayByOthersTx(address) {
  // step 1: fetch utxos
  let {
    data: utxos
  } = await axios.get(`${API_PREFIX}/address/${address}/unspent`)

  utxos = utxos.map((utxo) => ({
    txId: utxo.tx_hash,
    outputIndex: utxo.tx_pos,
    satoshis: utxo.value,
    script: bsv.Script.buildPublicKeyHashOut(address).toHex(),
  }))

  // step 2: build the tx
  const tx = new bsv.Transaction().from(utxos)

  return tx
}

async function createLockingTx(address, amountInContract, fee) {
  // step 1: fetch utxos
  let {
    data: utxos
  } = await axios.get(`${API_PREFIX}/address/${address}/unspent`)

  utxos = utxos.map((utxo) => ({
    txId: utxo.tx_hash,
    outputIndex: utxo.tx_pos,
    satoshis: utxo.value,
    script: bsv.Script.buildPublicKeyHashOut(address).toHex(),
  }))

  // step 2: build the tx
  const tx = new bsv.Transaction().from(utxos)
  tx.addOutput(new bsv.Transaction.Output({
    script: new bsv.Script(), // place holder
    satoshis: amountInContract,
  }))

  tx.change(address).fee(fee || minFee)

  return tx
}

async function anyOnePayforTx(tx, address, fee) {
  // step 1: fetch utxos
  let {
    data: utxos
  } = await axios.get(`${API_PREFIX}/address/${address}/unspent`)

  utxos.map(utxo => {
    tx.addInput(new bsv.Transaction.Input({
      prevTxId:  utxo.tx_hash,
      outputIndex: utxo.tx_pos,
      script: new bsv.Script(), // placeholder
    }), bsv.Script.buildPublicKeyHashOut(address).toHex(), utxo.value)
  })

  tx.change(address).fee(fee)

  return tx
}

function createUnlockingTx(prevTxId, inputAmount, inputLockingScriptASM, outputAmount, outputLockingScriptASM) {
  const tx = new bsv.Transaction()

  tx.addInput(new bsv.Transaction.Input({
    prevTxId,
    outputIndex: inputIndex,
    script: new bsv.Script(), // placeholder
  }), bsv.Script.fromASM(inputLockingScriptASM), inputAmount)

  tx.addOutput(new bsv.Transaction.Output({
    script: bsv.Script.fromASM(outputLockingScriptASM || inputLockingScriptASM),
    satoshis: outputAmount,
  }))

  tx.fee(inputAmount - outputAmount)

  return tx
}

function unlockP2PKHInput(privateKey, tx, inputIndex, sigtype) {
  const sig = new bsv.Transaction.Signature({
    publicKey: privateKey.publicKey,
    prevTxId: tx.inputs[inputIndex].prevTxId,
    outputIndex: tx.inputs[inputIndex].outputIndex,
    inputIndex,
    signature: bsv.Transaction.Sighash.sign(tx, privateKey, sigtype,
      inputIndex,
      tx.inputs[inputIndex].output.script,
      tx.inputs[inputIndex].output.satoshisBN),
    sigtype,
  });

  tx.inputs[inputIndex].setScript(bsv.Script.buildPublicKeyHashIn(
    sig.publicKey,
    sig.signature.toDER(),
    sig.sigtype,
  ))
}

async function sendTx(tx) {
  const {
    data: txid
  } = await axios.post(`${API_PREFIX}/tx/raw`, {
    txhex: tx.serialize()
  })
  return txid
}

function compileContract(fileName) {
  const filePath = path.join(__dirname, 'contracts', fileName)
  const out = path.join(__dirname, 'deployments/fixture/autoGen')

  const result = compileContractImpl(filePath, out);
  if (result.errors.length > 0) {
    console.log(`Compile contract ${filePath} fail: `, result.errors)
    throw result.errors;
  }

  return result;
}

function compileTestContract(fileName) {
  const filePath = path.join(__dirname, 'tests', 'testFixture', fileName)
  const out = path.join(__dirname, 'tests', 'out')
  if (!existsSync(out)) {
      mkdirSync(out)
  }
  const result = compileContractImpl(filePath, out);
  if (result.errors.length > 0) {
    console.log(`Compile contract ${filePath} fail: `, result.errors)
    throw result.errors;
  }

  return result;
}

function loadDesc(fileName) {
  const filePath = path.join(__dirname, `deployments/fixture/autoGen/${fileName}`);
  if (!existsSync(filePath)) {
    throw new Error(`Description file ${filePath} not exist!\nIf You already run 'npm run watch', maybe fix the compile error first!`)
  }
  return JSON.parse(readFileSync(filePath).toString());
}

function showError(error) {
  // Error
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.log('Failed - StatusCodeError: ' + error.response.status + ' - "' + error.response.data + '"');
    // console.log(error.response.headers);
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the
    // browser and an instance of
    // http.ClientRequest in node.js
    console.log(error.request);
  } else {
    // Something happened in setting up the request that triggered an Error
    console.log('Error:', error.message);
    if (error.context) {
      console.log(error.context);
    }
  }
};

function padLeadingZero(hex) {
  if(hex.length % 2 === 0) return hex;
  return "0" + hex;
}

const emptyPublicKey = '000000000000000000000000000000000000000000000000000000000000000000'

module.exports = {
  inputIndex,
  inputSatoshis,
  newTx,
  createPayByOthersTx,
  createLockingTx,
  createUnlockingTx,
  DataLen,
  dummyTxId,
  reversedDummyTxId,
  reverseEndian,
  unlockP2PKHInput,
  sendTx,
  compileContract,
  loadDesc,
  sighashType2Hex,
  showError,
  compileTestContract,
  padLeadingZero,
  anyOnePayforTx,
  emptyPublicKey
}
