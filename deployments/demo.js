const { buildContractClass, bsv } = require('scryptlib');
const { loadDesc, showError, createLockingTx, sendTx, createUnlockingTx } = require('../helper');
const { privateKey } = require('../privateKey');

(async() => {
    try {
        const amount = 2000
        const newAmount = 546

        // get locking script
        const Demo = buildContractClass(loadDesc('demo_desc.json'));
        demo = new Demo(4, 7);
        
        // lock fund to the script
        const lockingTx =  await createLockingTx(privateKey.toAddress(), amount)
        lockingTx.outputs[0].setScript(demo.lockingScript)
        lockingTx.sign(privateKey)
        const lockingTxid = await sendTx(lockingTx)
        console.log('locking txid:     ', lockingTxid)
        
        // unlock
        const unlockingScript = demo.add(11).toScript()
        const unlockingTx = await createUnlockingTx(lockingTxid, amount, demo.lockingScript.toASM(), newAmount)
        unlockingTx.inputs[0].setScript(unlockingScript)
        const unlockingTxid = await sendTx(unlockingTx)
        console.log('unlocking txid:   ', unlockingTxid)

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()