const { bsv, buildContractClass, SigHashPreimage } = require('scryptlib');
const { DataLen, loadDesc, deployContract, sendTx, showError } = require('../helper');
const { privateKey } = require('../privateKey');
(async () => {
    try {
        const OptimalPushTx = buildContractClass(loadDesc('optimalPushtx_debug_desc.json'))
        const optimalPushTx = new OptimalPushTx()

        let amount = 1
        // lock fund to the script
        const lockingTx = await deployContract(optimalPushTx, amount)
        console.log('funding txid:      ', lockingTx.id);

        let prevTx = lockingTx;

        // unlock
        for (i = 0; i < 10; i++) {

            const unlockingTx = new bsv.Transaction();

            unlockingTx.addInputFromPrevTx(prevTx)
                .addInputFromPrevTx(prevTx, 1)
                .change(privateKey.toAddress())
                .addOutput(new bsv.Transaction.Output({
                    script: optimalPushTx.lockingScript,
                    satoshis: 1,
                }))
                .setInputScript({
                    inputIndex: 0,
                    isLowS: true
                }, (tx) => {
                    return optimalPushTx.validate(new SigHashPreimage(tx.getPreimage(0))).toScript()
                })
                .sign(privateKey)
                .seal()

            await sendTx(unlockingTx)
            console.log('iteration #' + i + ' txid: ', unlockingTx.id)
            prevTx = unlockingTx;
        }

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()
