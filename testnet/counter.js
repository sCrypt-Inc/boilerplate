const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage } = require('scryptlib');
const { DataLen, loadDesc, deployContract, sendTx, showError  } = require('../helper');

(async() => {
    try {
        const Counter = buildContractClass(loadDesc('counter_debug_desc.json'))
        const counter = new Counter(0)

        let amount = 8000
        // lock fund to the script
        const lockingTx =  await deployContract(counter, amount)
        console.log('funding txid:      ', lockingTx.id);

        let prevTx = lockingTx;

        // unlock
        for (i = 0; i < 3; i++) {

            const newLockingScript = counter.getNewStateScript({
                counter : i + 1
            })

            const unlockingTx = new bsv.Transaction();
            
            unlockingTx.addInputFromPrevTx(prevTx)
            .setOutput(0, (tx) => {
                return new bsv.Transaction.Output({
                    script: newLockingScript,
                    satoshis: amount - tx.getEstimateFee(),
                  })
            })
            .setInputScript(0, (tx) => {
                const newAmount = tx.outputs[0].satoshis;
                return counter.increment(new SigHashPreimage(tx.getPreimage(0)), newAmount).toScript()
            })
            .seal()

            await sendTx(unlockingTx)
            console.log('iteration #' + i + ' txid: ', unlockingTx.id)

            amount = unlockingTx.outputs[0].satoshis
            // update state
            counter.counter = i + 1
            prevTx = unlockingTx;
        }

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()
