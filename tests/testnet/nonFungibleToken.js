const path = require('path');
const { bsv, buildContractClass, lockScriptTx, showError, literal2Asm } = require('scrypttest');
const { getPreimage, signTx, sendTx, num2bin, genPrivKey, DataLen } = require('../testHelper');

// private key on testnet in WIF
const key = ''
if (!key) {
    genPrivKey()
}

(async() => {
    const privateKeyIssuer = new bsv.PrivateKey.fromRandom('testnet')
    const publicKeyIssuer = bsv.PublicKey.fromPrivateKey(privateKeyIssuer)
    const privateKeyReceiver1 = new bsv.PrivateKey.fromRandom('testnet')
    const publicKeyReceiver1 = bsv.PublicKey.fromPrivateKey(privateKeyReceiver1)
    const privateKeyReceiver2 = new bsv.PrivateKey.fromRandom('testnet')
    const publicKeyReceiver2 = bsv.PublicKey.fromPrivateKey(privateKeyReceiver2)
    
    try {
        // get locking script
        const NonFungibleToken = buildContractClass(path.join(__dirname, '../../contracts/nonFungibleToken.scrypt'))
        const token = new NonFungibleToken()

        // code part
        const lockingScriptCodePart = token.getLockingScript()
        
        //read previous locking script: codePart + OP_RETURN + currTokenId + issuer
        const currTokenId = 10;
        // issue a new token 
        let lockingScript = lockingScriptCodePart + ' OP_RETURN '  + num2bin(currTokenId, DataLen) + toHex(publicKeyIssuer)

        token.setLockingScript(lockingScript)
        
        let inputSatoshis = 10000
        const FEE = inputSatoshis / 4
        let outputAmount = Math.floor((inputSatoshis - FEE) / 2)
        // lock fund to the script
        const lockingTxid = await lockScriptTx(lockingScript, key, inputSatoshis) 
        console.log('funding txid:      ', lockingTxid)
        
        // increment token ID and issue two new token
        let issueTxid, lockingScript0, lockingScript1
        {
            const tx = new bsv.Transaction()
            tx.addInput(new bsv.Transaction.Input({
                prevTxId: lockingTxid,
                outputIndex: 0,
                script: ''
            }), bsv.Script.fromASM(lockingScript), inputSatoshis)

            lockingScript0 = lockingScriptCodePart + ' OP_RETURN ' + num2bin((currTokenId+1), DataLen) + toHex(publicKeyIssuer)
            tx.addOutput(new bsv.Transaction.Output({
                script: bsv.Script.fromASM(lockingScript0),
                satoshis: outputAmount
            }))

            lockingScript1 = lockingScriptCodePart + ' OP_RETURN ' + num2bin(currTokenId, DataLen) + toHex(publicKeyReceiver1)
            tx.addOutput(new bsv.Transaction.Output({
                script: bsv.Script.fromASM(lockingScript1),
                satoshis: outputAmount
            }))
            
            const preimage = getPreimage(tx, lockingScript, 0, inputSatoshis)
            const sig1 = signTx(tx, privateKeyIssuer, lockingScript, 0, inputSatoshis)
            const unlockingScript = [toHex(sig1), toHex(publicKeyReceiver1),  literal2Asm(outputAmount), literal2Asm(outputAmount),
                 toHex(preimage), literal2Asm(1)].join(' ')
            tx.inputs[0].setScript(bsv.Script.fromASM(unlockingScript));
            issueTxid = await sendTx(tx);
            console.log('issue txid:       ', issueTxid)
        }


        inputSatoshis = outputAmount
        outputAmount -= FEE
        // transfer token to publicKeyReceiver2
        {

            const tx = new bsv.Transaction()

            tx.addInput(new bsv.Transaction.Input({
                prevTxId: issueTxid,
                outputIndex: 1,
                script: ''
            }), bsv.Script.fromASM(lockingScript1), inputSatoshis)
            const lockingScript2 = lockingScriptCodePart + ' OP_RETURN ' + num2bin(currTokenId, DataLen) + toHex(publicKeyReceiver2)

            tx.addOutput(new bsv.Transaction.Output({
                script: bsv.Script.fromASM(lockingScript2),
                satoshis: outputAmount
            }))

            const preimage = getPreimage(tx, lockingScript1, 0, inputSatoshis)
            const sig2 = signTx(tx, privateKeyReceiver1, lockingScript1, 0, inputSatoshis)
            const unlockingScript = [toHex(sig2), toHex(publicKeyReceiver2), literal2Asm(outputAmount), toHex(preimage), literal2Asm(2)].join(' ')
            tx.inputs[0].setScript(bsv.Script.fromASM(unlockingScript));
            const transferTxid = await sendTx(tx);
            console.log('transfer txid:       ', transferTxid)
        }

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()