const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage, Bytes } = require('scryptlib');
const { DataLen, loadDesc, deployContract, sendTx, createInputFromPrevTx, showError  } = require('../helper');

(async() => {
    try {
        const Counter = buildContractClass(loadDesc('statecounter1_debug_desc.json'))
        let DATA_LEN = 4
        // 103 is offset of state， which can be calculated very well in the SDK
        let counter = new Counter(new Bytes(num2bin(0, DATA_LEN)), 103)
        
        let amount = 6000
        // lock fund to the script
        const lockingTx =  await deployContract(counter, amount)
        console.log('funding txid:      ', lockingTx.id);

        let prevTx = lockingTx;

        // unlock
        for (i = 0; i < 3; i++) {
            
            const newState = num2bin(i + 1, DATA_LEN);
        
            const newcounter = new Counter(new Bytes(newState), 103)
            const newLockingScript = newcounter.lockingScript

            const unlockingTx = new bsv.Transaction();
            
            unlockingTx.addInput(createInputFromPrevTx(prevTx))
            .setOutput(0, (tx) => {
                return new bsv.Transaction.Output({
                    script: newLockingScript,
                    satoshis: amount - tx.getEstimateFee(),
                  })
            })
            .setInputScript(0, (tx, output) => {
                const preimage = getPreimage(tx, output.script, output.satoshis)
                const newAmount = unlockingTx.outputs[0].satoshis;
                counter.txContext = {
                    tx,
                    inputIndex: 0,
                    inputSatoshis: output.satoshis
                }
                console.log(counter.increment(new SigHashPreimage(toHex(preimage)), newAmount).verify())
                return counter.increment(new SigHashPreimage(toHex(preimage)), newAmount).toScript()
            })
            .seal()

            await sendTx(unlockingTx)
            console.log('iteration #' + i + ' txid: ', unlockingTx.id, unlockingTx.outputs[0].satoshis)

            amount = unlockingTx.outputs[0].satoshis
            counter = newcounter
            prevTx = unlockingTx;
        }

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()
