const path = require('path');
const { buildContractClass, int2Asm, lockScriptTx, unlockScriptTx, getSighashPreimage, showError } = require('scrypttest');

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

        lockingScriptCodePart = counter.getLockingScript()
        // append state as passive data
        let lockingScript = lockingScriptCodePart +' OP_RETURN 00'
        
        let amount = 10000
        const FEE = amount / 10
        
        // lock fund to the script
        let lockingTxid = await lockScriptTx(lockingScript, key, amount)
        console.log('funding txid:      ', lockingTxid)
        
        // unlock
        for (i = 0; i < 8; i++) {
            const newLockingScript = lockingScriptCodePart +' OP_RETURN 0' + (i + 1)    // only works for i < 9
            const newAmount = amount - FEE
            const preimage = getSighashPreimage(lockingTxid, lockingScript, amount, newLockingScript, newAmount)
            const amountASM = int2Asm(newAmount)
            const unlockingScript = preimage + ' ' + amountASM
            lockingTxid = await unlockScriptTx(unlockingScript, lockingTxid, lockingScript, amount, newLockingScript, newAmount)
            console.log('iteration #' + i + ' txid: ', lockingTxid)

            lockingScript = newLockingScript
            amount = newAmount
        }

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()