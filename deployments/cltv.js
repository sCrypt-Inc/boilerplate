const { bsv, buildContractClass, getPreimage, toHex, SigHashPreimage } = require('scryptlib');
const { loadDesc, showError, createLockingTx, sendTx, createUnlockingTx } = require('../helper');
const { privateKey } = require('../privateKey');

(async() => {
    try {
        const amount = 2000
        const newAmount = 546

        // get locking script
        const CLTV = buildContractClass(loadDesc('cltv_desc.json'));
        cltv = new CLTV(1422674);
        
        // lock fund to the script
        const lockingTx =  await createLockingTx(privateKey.toAddress(), amount)
        lockingTx.outputs[0].setScript(cltv.lockingScript)
        lockingTx.sign(privateKey)
        const lockingTxid = await sendTx(lockingTx)
        console.log('locking txid:     ', lockingTxid)
        
        // unlock
        const unlockingTx = await createUnlockingTx(lockingTxid, amount, cltv.lockingScript.toASM(), newAmount)
        unlockingTx.nLockTime = 1422674 + 1

        let prevLockingScript = cltv.lockingScript.toASM();
        const preimage = getPreimage(unlockingTx, prevLockingScript, amount)
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