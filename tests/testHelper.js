const { exit } = require('process')
const { bsv } = require('scrypttest');
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

const utxo = {
  txId: 'a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458',
  outputIndex: 0,
  script: '',   // placeholder
  satoshis: inputSatoshis
}
const tx = new bsv.Transaction().from(utxo)

getPreimage = (tx, lockingScript, inputIndex = 0, inputAmount = inputSatoshis, sighashType = Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID) => bsv.Transaction.sighash.sighashPreimage(tx, sighashType, inputIndex, bsv.Script.fromASM(lockingScript), new bsv.crypto.BN(inputAmount), flags)

signTx = (tx, privateKey, lockingScript, inputIndex = 0, inputAmount = inputSatoshis, sighashType = Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID) => bsv.Transaction.sighash.sign(tx, privateKey, sighashType, inputIndex, bsv.Script.fromASM(lockingScript), new bsv.crypto.BN(inputAmount), flags).toTxFormat()

toHex = x => x.toString('hex')

genPrivKey = () => {
  const newPrivKey = new bsv.PrivateKey.fromRandom('testnet')
  console.log(`Missing private key, generating a new one ...
Private key generated: '${newPrivKey.toWIF()}'
You can fund its address '${newPrivKey.toAddress()}' from some faucet and use it to complete the test
Example faucets are https://faucet.bitcoincloud.net and https://testnet.satoshisvision.network`)
  exit(1)
}

async function createLockingTx(address, amountInContract) {
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
  tx.change(address).fee(minFee)
  return tx
}

function createUnlockingTx(prevTxId, inputAmount, lockingScript, spendAmount, changeAddr, spendLockingScript) {
  const tx = new bsv.Transaction()

  tx.addInput(new bsv.Transaction.Input({
    prevTxId,
    outputIndex: inputIndex,
    script: new bsv.Script(), // placeholder
  }), bsv.Script.fromASM(lockingScript), inputAmount)

  tx.addOutput(new bsv.Transaction.Output({
    script: bsv.Script.fromASM(spendLockingScript || lockingScript),
    satoshis: spendAmount,
  })).change(changeAddr).fee(minFee)

  return tx
}

async function sendTx(tx) {
  const {
    data: txid
  } = await axios.post(`${API_PREFIX}/tx/raw`, {
    txhex: tx.serialize()
  })
  return txid
}

// Converts a number into a sign-magnitude representation of certain size as a string
// Throws if the number cannot be accommodated
// Often used to append numbers to OP_RETURN, which are read in contracts
// TODO: handle bigint
function num2bin(n, DataLen) {
  if (n === 0) {
    return "00".repeat(DataLen)
  }

  const num = BN.fromNumber(n)
  const s = num.toSM({ endian: 'little' }).toString('hex')

  const byteLen_ = s.length / 2
  if (byteLen_ > DataLen) {
    throw new Error(`${n} cannot fit in ${DataLen} byte[s]`)
  }
  if (byteLen_ === DataLen) {
    return s
  }

  const paddingLen = DataLen - byteLen_
  const lastByte = s.substring(s.length - 2)
  const rest = s.substring(0, s.length - 2)
  let m = parseInt(lastByte, 16)
  if (n < 0) {
    // reset sign bit
    m &= 0x7F
  }
  let mHex = m.toString(16)
  if (mHex.length < 2) {
    mHex = '0' + mHex
  }
  
  const padding = n > 0 ? '00'.repeat(paddingLen) : '00'.repeat(paddingLen - 1) + '80'
  return rest + mHex + padding
}

module.exports = {
    inputIndex,
    inputSatoshis,
    tx,
    signTx,
    getPreimage,
    toHex,
    num2bin,
    createLockingTx,
    createUnlockingTx,
    genPrivKey,
    DataLen,
    sendTx
}