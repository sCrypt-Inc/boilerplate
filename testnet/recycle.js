const { bsv } = require('scryptlib');
const { sendTx, fetchUtxos } = require('../helper');
const { privateKey } = require('../privateKey');

async function buildTx(tx, address, recycle_address) {
  tx
  .from(await fetchUtxos(address))
  .change(recycle_address)
  .sign(privateKey)
  return tx
}


async function recycle(recycle_address) {
  const tx = new bsv.Transaction();
  let unlockingTx = await buildTx(tx, `${privateKey.toAddress()}`, recycle_address);
  const lockingTxid = await sendTx(unlockingTx)
  console.log(`recycle to address ${recycle_address}, tx: ${lockingTxid}`)
}


recycle('')