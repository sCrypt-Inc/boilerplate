const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage, Bytes } = require('scryptlib');
const { DataLen, loadDesc, deployContract, sendTx, createInputFromPrevTx, showError  } = require('../helper');

(async() => {
    try {
        const Counter = buildContractClass(loadDesc('counter1_debug_desc.json'))
        let DATA_LEN = 2
        // 103 is offset of state， which can be calculated very well in the SDK
        let counter = new Counter(new Bytes(num2bin(0, DATA_LEN)))
        
        let amount = 6000
        // lock fund to the script
        const lockingTx =  await deployContract(counter, amount)
        console.log('funding txid:      ', lockingTx.id);

        let prevTx = lockingTx;

        // unlock
        for (i = 0; i < 3; i++) {
            
            const newState = num2bin(i + 1, DATA_LEN);
        
            const newcounter = new Counter(new Bytes(newState))
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
                const preimage = getPreimage(tx, output.script.subScript(0), output.satoshis)
                const newAmount = unlockingTx.outputs[0].satoshis;
                counter.txContext = {
                    tx,
                    inputIndex: 0,
                    inputSatoshis: output.satoshis
                }
                const misslockingScript = bsv.Script.fromASM("ab OP_1 40 97dfd76851bf465e8f715593b217714858bbe9570ff3bd5e33840a34e20ff026 02ba79df5f8ae7604a9830f03c7933028186aede0675a16f025dc4f8be8eec0382 1008ce7480da41702918d1ec8e6849ba32b4d65b1e40dc669c31a1e6306b266c")
                console.log(counter.increment(new SigHashPreimage(toHex(preimage)), newAmount, new Bytes(misslockingScript.toHex())).verify())
                return counter.increment(new SigHashPreimage(toHex(preimage)), newAmount, new Bytes(misslockingScript.toHex())).toScript()
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
