const { bsv, buildContractClass, getPreimage, toHex, SigHashPreimage } = require('scryptlib');
const { loadDesc, showError, deployContract , sendTx, createInputFromPrevTx } = require('../helper');
const { privateKey } = require('../privateKey');

(async () => {
    try {
        const amount = 2000

        // get locking script
        const CLTVOCS = buildContractClass(loadDesc('cltvOCS_debug_desc.json'));
        cltv = new CLTVOCS(1422674);

        // lock fund to the script
        const lockingTx = await deployContract(cltv, amount)
        console.log('funding txid:      ', lockingTx.id);

        // unlock
        const unlockingTx = new bsv.Transaction();

        unlockingTx.addInput(createInputFromPrevTx(lockingTx))
            .setLockTime(1422674 + 1)
            .change(privateKey.toAddress())
            .setInputScript(0, (tx, output) => {
                const preimage = getPreimage(tx, output.script.cropCodeseparators(0), output.satoshis)
                return cltv.spend(new SigHashPreimage(toHex(preimage))).toScript()
            })
            .seal()


        const unlockingTxid = await sendTx(unlockingTx)
        console.log('unlocking txid:   ', unlockingTxid)

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()