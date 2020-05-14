const path = require('path');
const { bsv, buildContractClass, lockScriptTx, unlockScriptTx, getSighashPreimage, getSignature, showError } = require('scrypttest');

const { num2SM } = require('../testHelper');

// private key on testnet in WIF
const key = ''
if (!key) {
    throw new Error('You must provide a private key');
}

(async() => {
    const privateKey1 = new bsv.PrivateKey.fromRandom('testnet')
    const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)
    const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')
    const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)
    
    try {
        // get locking script
        const Token = buildContractClass(path.join(__dirname, '../../contracts/token.scrypt'))
        const token = new Token()

        // code part
        const lockingScriptCode = token.getScriptPubKey()
        
        // append state as passive data part
        // initial token supply 100: publicKey1 has 100, publicKey2 0
        let lockingScript = lockingScriptCode + ' OP_RETURN ' + toHex(publicKey1) + num2SM(100) + toHex(publicKey2) + '00' // do not use num2SM(0) since it gives "OP_0"
        token.setScriptPubKey(lockingScript)
        
        let amount = 10000
        const FEE = amount / 10
        
        // lock fund to the script
        let lockingTxid = await lockScriptTx(lockingScript, key, amount)
        console.log('funding txid:      ', lockingTxid)
        
        // transfer 40 tokens from publicKey1 to publicKey2
        {
            const newScriptPubKey = lockingScriptCode + ' OP_RETURN ' + toHex(publicKey1) + num2SM(60) + toHex(publicKey2) + num2SM(40)
            const newAmount = amount - FEE
            const preimage = getSighashPreimage(lockingTxid, lockingScript, amount, newScriptPubKey, newAmount)
            const sig1 = getSignature(lockingTxid, privateKey1, lockingScript, amount, newScriptPubKey, newAmount)
            const scriptSig = toHex(publicKey1) + ' ' + sig1 + ' ' + toHex(publicKey2) + ' ' + num2SM(40) + ' ' + preimage + ' ' + num2SM(newAmount)
            lockingTxid = await unlockScriptTx(scriptSig, lockingTxid, lockingScript, amount, newScriptPubKey, newAmount)
            console.log('transfer txid1:    ', lockingTxid)

            lockingScript = newScriptPubKey
            amount = newAmount
        }

        // transfer 10 tokens from publicKey2 to publicKey1
        {
            const newScriptPubKey = lockingScriptCode + ' OP_RETURN ' + toHex(publicKey1) + num2SM(70) + toHex(publicKey2) + num2SM(30)
            const newAmount = amount - FEE
            const preimage = getSighashPreimage(lockingTxid, lockingScript, amount, newScriptPubKey, newAmount)
            const sig2 = getSignature(lockingTxid, privateKey2, lockingScript, amount, newScriptPubKey, newAmount)
            const scriptSig = toHex(publicKey2) + ' ' + sig2 + ' ' + toHex(publicKey1) + ' ' + num2SM(10) + ' ' + preimage + ' ' + num2SM(newAmount)
            lockingTxid = await unlockScriptTx(scriptSig, lockingTxid, lockingScript, amount, newScriptPubKey, newAmount)
            console.log('transfer txid2:    ', lockingTxid)
        }

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()