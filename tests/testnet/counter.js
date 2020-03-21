const path = require('path');
const { buildContractClass, lockScriptTx, unlockScriptTx, getSighashPreimage, showError } = require('scrypttest');

const { num2SM } = require('../testHelper');

// private key on testnet in WIF
const key = ''
if (!key) {
    throw new Error('You must provide a private key');
}

(async() => {
    try {
        // get locking script
        const Counter = buildContractClass(path.join(__dirname, '../../contracts/counter.scrypt'))
        const counter = new Counter()

        lockingScript = counter.getScriptPubKey()
        // append state as passive data
        let scriptPubKey = lockingScript + ' OP_RETURN 00'
        
        let amount = 10000
        const FEE = amount / 10
        
        // lock fund to the script
        let lockingTxid = await lockScriptTx(scriptPubKey, key, amount)
        console.log('funding txid:      ', lockingTxid)
        
        // unlock
        for (i = 0; i < 8; i++) {
            const newScriptPubKey = lockingScript + ' OP_RETURN 0' + (i + 1)    // only works for i < 9
            const newAmount = amount - FEE
            const preimage = getSighashPreimage(lockingTxid, scriptPubKey, amount, newScriptPubKey, newAmount)
            const amountASM = num2SM(newAmount)
            const scriptSig = preimage + ' ' + amountASM
            lockingTxid = await unlockScriptTx(scriptSig, lockingTxid, scriptPubKey, amount, newScriptPubKey, newAmount)
            console.log('iteration #' + i + ' txid: ', lockingTxid)

            scriptPubKey = newScriptPubKey
            amount = newAmount
        }

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()