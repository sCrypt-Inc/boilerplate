const { bsv } = require('scrypttest');
const Signature = bsv.crypto.Signature
const Interpreter = bsv.Script.Interpreter

/**
 * a dummy transaction used in script evaluation
 */

const inputIndex = 0
const inputSatoshis = 100000
const flags = Interpreter.SCRIPT_VERIFY_MINIMALDATA | Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID | Interpreter.SCRIPT_ENABLE_MAGNETIC_OPCODES | Interpreter.SCRIPT_ENABLE_MONOLITH_OPCODES

const utxo = {
  txId: 'a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458',
  outputIndex: 0,
  script: '',   // placeholder
  satoshis: inputSatoshis
}
const tx = new bsv.Transaction().from(utxo)

getPreimage = (tx, lockingScript, sighashType = Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID) => bsv.Transaction.sighash.sighashPreimage(tx, sighashType, inputIndex, bsv.Script.fromASM(lockingScript), new bsv.crypto.BN(inputSatoshis), flags)

signTx = (tx, privateKey, lockingScript, sighashType = Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID) => bsv.Transaction.sighash.sign(tx, privateKey, sighashType, inputIndex, bsv.Script.fromASM(lockingScript), new bsv.crypto.BN(inputSatoshis), flags).toTxFormat()

toHex = x => x.toString('hex')

module.exports = {
    inputIndex: inputIndex,
    inputSatoshis: inputSatoshis,
    tx: tx,
    signTx: signTx,
    getPreimage: getPreimage,
    toHex: toHex,
}