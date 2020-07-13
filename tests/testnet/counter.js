const path = require('path');
const { buildContractClass, literal2Asm, lockScriptTx, unlockScriptTx, getSighashPreimage, showError } = require('scrypttest');
const { num2bin } = require('../testHelper');

// private key on testnet in WIF
const key = ''
if (!key) {
    throw new Error('You must provide a private key');
}

// number of bytes to denote counter
const ByteLen = 1

(async() => {
    try {
        // get locking script
        const Counter = buildContractClass(path.join(__dirname, '../../contracts/counter.scrypt'))
        const counter = new Counter()

        lockingScriptCodePart = counter.getLockingScript()
        // append state as passive data
        let lockingScript = lockingScriptCodePart +' OP_RETURN ' + num2bin(0, ByteLen)
        
        let amount = 10000
        const FEE = amount / 10
        
        // lock fund to the script
        let lockingTxid = await lockScriptTx(lockingScript, key, amount)
        console.log('funding txid:      ', lockingTxid)
        
        // unlock
        for (i = 0; i < 8; i++) {
            const newLockingScript = lockingScriptCodePart +' OP_RETURN ' + num2bin(i + 1, ByteLen)
            const newAmount = amount - FEE
            const preimage = getSighashPreimage(lockingTxid, lockingScript, amount, newLockingScript, newAmount)
            const amountASM = literal2Asm(newAmount)
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