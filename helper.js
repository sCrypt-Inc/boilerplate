const path = require('path')
const {
  readFileSync,
  existsSync,
  mkdirSync
} = require('fs')
const {
  bsv,
  compileContract: compileContractImpl,
  getPreimage,
  toHex
} = require('scryptlib')
const crypto = require('crypto');
const MSB_THRESHOLD = 0x7e;

const BN = bsv.crypto.BN
const Interpreter = bsv.Script.Interpreter

// number of bytes to denote some numeric value
const DataLen = 1

const axios = require('axios')
const API_PREFIX = 'https://api.whatsonchain.com/v1/bsv/test'

const inputIndex = 0
const inputSatoshis = 100000
const dummyTxId = crypto.randomBytes(32).toString('hex');
const reversedDummyTxId =  Buffer.from(dummyTxId, 'hex').reverse().toString('hex');
const sighashType2Hex = s => s.toString(16)

function newTx() {
  const utxo = {
    txId: dummyTxId,
    outputIndex: 0,
    script: '',   // placeholder
    satoshis: inputSatoshis
  };
  return new bsv.Transaction().from(utxo);
}



// reverse hexStr byte order
function reverseEndian(hexStr) {
  return hexStr.match(/../g).reverse().join('')
}


async function sendTx(tx) {
  const hex = tx.toString();

  if(!tx.checkFeeRate(500)) {
    throw new Error(`checkFeeRate fail, transaction fee is too low`)
  }

  try {
    const {
      data: txid
    } = await axios.post(`${API_PREFIX}/tx/raw`, {
      txhex: hex
    });
      
    return txid
  } catch (error) {
    if (error.response && error.response.data === '66: insufficient priority') {
      throw new Error(`Rejected by miner. Transaction with fee is too low: expected Fee is ${expectedFee}, but got ${fee}, hex: ${hex}`)
    } 
    throw error
  }

}

function compileContract(fileName, options) {
  const filePath = path.join(__dirname, 'contracts', fileName)
  const out = path.join(__dirname, 'out')

  const result = compileContractImpl(filePath, options ? options : {
    out: out
  });
  if (result.errors.length > 0) {
    console.log(`Compile contract ${filePath} failed: `, result.errors)
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
  const result = compileContractImpl(filePath, {
    out: out
  });
  if (result.errors.length > 0) {
    console.log(`Compile contract ${filePath} fail: `, result.errors)
    throw result.errors;
  }

  return result;
}

function loadDesc(fileName) {
  const filePath = path.join(__dirname, `out/${fileName}`);
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

function padLeadingZero(hex, byteslen = 0) {
  if(byteslen > 0) {
    if(hex.length < byteslen * 2) {
      return "0".repeat(byteslen * 2 - hex.length) + hex
    }
  }
  if(hex.length % 2 === 0) return hex;
  return "0" + hex;
}

// fixLowS increments the first input's sequence number until the sig hash is safe for low s.
function fixLowS(tx, lockingScript, inputSatoshis, inputIndex) {
  for (i=0;i<25;i++) {
    const preimage = getPreimage(tx, lockingScript, inputSatoshis, inputIndex);
    const sighash = bsv.crypto.Hash.sha256sha256(Buffer.from(toHex(preimage), 'hex'));
    const msb = sighash.readUInt8();
    if (msb < MSB_THRESHOLD) {
      return;
    }
    tx.inputs[0].sequenceNumber++;
  }
}

// checkLowS returns true if the sig hash is safe for low s.
function checkLowS(tx, lockingScript, inputSatoshis, inputIndex) {
  const preimage = getPreimage(tx, lockingScript, inputSatoshis, inputIndex);
  const sighash = bsv.crypto.Hash.sha256sha256(Buffer.from(toHex(preimage), 'hex'));
  const msb = sighash.readUInt8();
  return (msb < MSB_THRESHOLD);
}


const sleep = async(seconds) => {
  return new Promise((resolve) => {
     setTimeout(() => {
        resolve();
     }, seconds * 1000);
  })
}

async function deployContract(contract, amount) {
  const { privateKey } = require('./privateKey');
  const address = privateKey.toAddress()
  const tx = new bsv.Transaction()
  
  tx.from(await fetchUtxos(address))
  .addOutput(new bsv.Transaction.Output({
    script: contract.lockingScript,
    satoshis: amount,
  }))
  .change(address)
  .sign(privateKey)

  await sendTx(tx)
  return tx
}

//create an input spending from prevTx's output, with empty script
function createInputFromPrevTx(tx, outputIndex) {
  const outputIdx = outputIndex || 0
  return new bsv.Transaction.Input({
    prevTxId: tx.id,
    outputIndex: outputIdx,
    script: new bsv.Script(), // placeholder
    output: tx.outputs[outputIdx]
  })
}


async function fetchUtxos(address) {
  // step 1: fetch utxos
  let {
    data: utxos
  } = await axios.get(`${API_PREFIX}/address/${address}/unspent`)

  return utxos.map((utxo) => ({
    txId: utxo.tx_hash,
    outputIndex: utxo.tx_pos,
    satoshis: utxo.value,
    script: bsv.Script.buildPublicKeyHashOut(address).toHex(),
  }))
}

const emptyPublicKey = '000000000000000000000000000000000000000000000000000000000000000000'

function toLittleIndian(hexstr) {
  return reverseEndian(hexstr)
}

function toBigIndian(hexstr) {
  return reverseEndian(hexstr)
}

function uint32Tobin(d) {
  var s = (+d).toString(16);
  if(s.length < 4) {
      s = '0' + s;
  }
  return toLittleIndian(s);
}

function num2hex(d, padding) {
  var s = Number(d).toString(16);
  // add padding if needed.
  while (s.length < padding) {
      s = "0" + s;
  }
  return s;
}



/**
 * inspired by : https://bigishdata.com/2017/11/13/how-to-build-a-blockchain-part-4-1-bitcoin-proof-of-work-difficulty-explained/
 * @param {*} bitsHex bits of block header, in big endian
 * @returns a target number 
 */
 function toTarget(bitsHex) {
  const shift = bitsHex.substr(0, 2);
  const exponent = parseInt(shift, 16);
  const value = bitsHex.substr(2, bitsHex.length);
  const coefficient = parseInt(value, 16);
  const target = coefficient * 2 ** (8 * (exponent - 3));
  return BigInt(target);
}

/**
* convert pool difficulty to a target number 
* @param {*}  difficulty which can fetch by api https://api.whatsonchain.com/v1/bsv/<network>/chain/info
* @returns target
*/
function pdiff2Target(difficulty) {
  if (typeof difficulty === 'number') {
      difficulty = BigInt(Math.floor(difficulty))
  }

  return BigInt(toTarget("1d00ffff") / difficulty);
}


// serialize Header to get raw header
function serializeHeader(header) {
  return uint32Tobin(header.version)
      + toLittleIndian(header.previousblockhash)
      + toLittleIndian(header.merkleroot)
      + uint32Tobin(header.time)
      + toLittleIndian(header.bits)
      + uint32Tobin(header.nonce)
}

module.exports = {
  inputIndex,
  inputSatoshis,
  sleep,
  newTx,
  DataLen,
  dummyTxId,
  reversedDummyTxId,
  reverseEndian,
  sendTx,
  compileContract,
  loadDesc,
  sighashType2Hex,
  showError,
  compileTestContract,
  padLeadingZero,
  emptyPublicKey,
  fixLowS,
  checkLowS,
  deployContract,
  createInputFromPrevTx,
  fetchUtxos,
  toLittleIndian,
  toBigIndian,
  uint32Tobin,
  num2hex,
  toTarget,
  pdiff2Target,
  serializeHeader
}
