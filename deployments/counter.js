const { bsv, buildContractClass, getPreimage, toHex, num2bin, SigHashPreimage } = require('scryptlib');
const { DataLen, loadDesc, createUnlockingTx, createLockingTx, sendTx, showError  } = require('../helper');
const { privateKey } = require('../privateKey');

(async() => {
    try {
        const Counter = buildContractClass(loadDesc('counter_desc.json'))
        const counter = new Counter()
        // append state as op_return data
        counter.setDataPart(num2bin(0, DataLen))
        
        let amount = 10000
        const FEE = amount / 10
        
        // lock fund to the script
        const lockingTx =  await createLockingTx(privateKey.toAddress(), amount)
        lockingTx.outputs[0].setScript(counter.lockingScript)
        lockingTx.sign(privateKey)
        let lockingTxid = await sendTx(lockingTx)
        console.log('funding txid:      ', lockingTxid)

        // unlock
        for (i = 0; i < 9; i++) {
            let prevLockingScript = counter.lockingScript.toASM();
            
            // update state
            counter.setDataPart(num2bin(i + 1, DataLen))
            const newLockingScript = counter.lockingScript.toASM();
            const newAmount = amount - FEE

            const unlockingTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript, newAmount, newLockingScript)

            const preimage = getPreimage(unlockingTx, prevLockingScript, amount)
            const unlockingScript = counter.increment(new SigHashPreimage(toHex(preimage)), newAmount).toScript()
            unlockingTx.inputs[0].setScript(unlockingScript)

            lockingTxid = await sendTx(unlockingTx)
            console.log('iteration #' + i + ' txid: ', lockingTxid)

            amount = newAmount
        }

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()
