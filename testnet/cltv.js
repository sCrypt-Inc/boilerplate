const { bsv, buildContractClass, getPreimage, toHex, SigHashPreimage } = require('scryptlib');
const { loadDesc, showError, createLockingTx, sendTx, createUnlockingTx } = require('../helper');
const { privateKey } = require('../privateKey');

(async() => {
    try {
        const amount = 2000
        const newAmount = 546

        // get locking script
        const CLTV = buildContractClass(loadDesc('cltv_debug_desc.json'));
        cltv = new CLTV(1422674);
        
        // lock fund to the script
        const lockingTx =  await createLockingTx(privateKey.toAddress(), amount, cltv.lockingScript)
        lockingTx.sign(privateKey)
        const lockingTxid = await sendTx(lockingTx)
        console.log('locking txid:     ', lockingTxid)
        
        // unlock
        const unlockingTx = await createUnlockingTx(lockingTxid, amount, cltv.lockingScript, newAmount, cltv.lockingScript)
        unlockingTx.nLockTime = 1422674 + 1

 
        const preimage = getPreimage(unlockingTx, cltv.lockingScript, amount)
        const unlockingScript = cltv.spend(new SigHashPreimage(toHex(preimage))).toScript()
        unlockingTx.inputs[0].setScript(unlockingScript)
  
        const unlockingTxid = await sendTx(unlockingTx)
        console.log('unlocking txid:   ', unlockingTxid)

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()