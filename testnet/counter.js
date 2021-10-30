const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage } = require('scryptlib');
const { DataLen, loadDesc, deployContract, sendTx, createInputFromTx, showError  } = require('../helper');
const { privateKey } = require('../privateKey');

(async() => {
    try {
        const Counter = buildContractClass(loadDesc('counter_debug_desc.json'))
        const counter = new Counter()
        // append state as op_return data
        counter.setDataPart(num2bin(0, DataLen))
        
        let amount = 6000
        const FEE = 1500;
        
        // lock fund to the script
        const lockingTx =  await deployContract(counter, amount)
        console.log('funding txid:      ', lockingTx.id);

        let prevTx = lockingTx;

        // unlock
        for (i = 0; i < 3; i++) {
            let prevLockingScript = counter.lockingScript;
            
            // update state
            const newState = num2bin(i + 1, DataLen);

            const newLockingScript = bsv.Script.fromASM([counter.codePart.toASM(), newState].join(' '))
            const newAmount = amount - FEE

            const unlockingTx = new bsv.Transaction();
            
            unlockingTx.addInput(createInputFromTx(prevTx))
            .addOutput(new bsv.Transaction.Output({
                script: newLockingScript,
                satoshis: newAmount,
              }))
            .setInputScript(0, (self, output) => {
                const preimage = getPreimage(self, output.script, output.satoshis)
                return counter.increment(new SigHashPreimage(toHex(preimage)), newAmount).toScript()
            });

            await sendTx(unlockingTx)
            console.log('iteration #' + i + ' txid: ', unlockingTx.id)

            amount = newAmount
            counter.setDataPart(newState);
            prevTx = unlockingTx;
        }

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()
