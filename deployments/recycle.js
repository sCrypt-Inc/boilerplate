const { bsv } = require('scryptlib');
const {  sendTx,  unlockP2PKHInput } = require('../helper');
const { privateKey } = require('../privateKey');
const axios = require('axios')
const Signature = bsv.crypto.Signature
const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID

bsv.Transaction.Input.prototype.clearSignatures = function() {

}
async function buildTx(tx, address, recycle_address, fee) {
    // step 1: fetch utxos
    let {
      data: utxos
    } = await axios.get(`https://api.whatsonchain.com/v1/bsv/main/address/${address}/unspent`)
  
    utxos.map(utxo => {
      tx.addInput(new bsv.Transaction.Input({
        prevTxId:  utxo.tx_hash,
        outputIndex: utxo.tx_pos,
        script: new bsv.Script(), // placeholder
      }), bsv.Script.buildPublicKeyHashOut(address).toHex(), utxo.value)
    })
  
    tx.change(recycle_address).fee(fee)
  
    return tx
  }


async function recycle(recycle_address) {
    const FEE = 500;
    const tx = new bsv.Transaction();
    let unlockingTx = await buildTx(tx, `${privateKey.toAddress()}`, recycle_address, FEE);

    // unlock other p2pkh inputs
    for (let index = 0; index < unlockingTx.inputs.length; index++) {
        unlockP2PKHInput(privateKey, unlockingTx, index, sighashType)
    }

    const lockingTxid = await sendTx(unlockingTx)
    console.log(`recycle to address ${recycle_address}, tx: ${lockingTxid}` )
}


recycle('')