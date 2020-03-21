const { bsv } = require('scrypttest');

/**
 * a dummy transaction used in script evaluation
 */

const inputIndex = 0
const inputSatoshis = 100000
const sighashType = bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_FORKID
const flags = bsv.Script.Interpreter.SCRIPT_VERIFY_MINIMALDATA | bsv.Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID | bsv.Script.Interpreter.SCRIPT_ENABLE_MAGNETIC_OPCODES | bsv.Script.Interpreter.SCRIPT_ENABLE_MONOLITH_OPCODES

const utxo = {
  txId: 'a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458',
  outputIndex: 0,
  script: '',   // placeholder
  satoshis: inputSatoshis
}
let tx = new bsv.Transaction().from(utxo)

getPreimage = (tx, lockingScript) => bsv.Transaction.sighash.sighashPreimage(tx, sighashType, inputIndex, bsv.Script.fromASM(lockingScript), new bsv.crypto.BN(inputSatoshis), flags)

signTx = (tx, privateKey, scriptPubKey) => bsv.Transaction.sighash.sign(tx, privateKey, sighashType, inputIndex, bsv.Script.fromASM(scriptPubKey), new bsv.crypto.BN(inputSatoshis), flags).toTxFormat()

toHex = x => '0x' + x.toString('hex')

num2SM = num => {
  if (num === -1) return 'OP_1NEGATE'

  if (num >= 0 && num <= 16) return 'OP_' + num

  let n = bsv.crypto.BN.fromNumber(num)
  let m = n.toSM({ endian: 'little'} )
  return m.toString('hex')
}

module.exports = {
    inputIndex: inputIndex,
    inputSatoshis: inputSatoshis,
    tx: tx,
    signTx: signTx,
    getPreimage: getPreimage,
    toHex: toHex,
    num2SM: num2SM
}