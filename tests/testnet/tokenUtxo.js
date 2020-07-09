const path = require('path');
const { bsv, int2Asm, buildContractClass, lockScriptTx, unlockScriptTx, getSighashPreimage, getSignature, sendTx, showError } = require('scrypttest');
const { getPreimage, int2Hex } = require('../testHelper');
const { split } = require('ts-node');

// private key on testnet in WIF
const key = 'cU2eUM62Hkur8sQVv7z1VtkXHHTA1YSGqxjAGYgbDPQaYcg5NXKd'
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
        const Token = buildContractClass(path.join(__dirname, '../../contracts/tokenUtxo.scrypt'))
        const token = new Token()

        // code part
        const lockingScriptCodePart = token.getLockingScript()
        
        // append state as passive data part
        // initial token supply 100: publicKey1 has 100, publicKey2 0
        let lockingScript = lockingScriptCodePart + ' OP_RETURN ' + int2Hex(10) + int2Hex(90)
        token.setLockingScript(lockingScript)
        
        let inputSatoshis = 10000
        const FEE = inputSatoshis / 4
        let outputAmount = Math.floor((inputSatoshis - FEE) / 2)
        
        // lock fund to the script
        const lockingTxid = await lockScriptTx(lockingScript, key, inputSatoshis)
        console.log('funding txid:      ', lockingTxid)
        
        // transfer 40 tokens from publicKey1 to publicKey2
        let splitTxid, lockingScript0, lockingScript1
        {
            const tx = new bsv.Transaction()
            tx.addInput(new bsv.Transaction.Input({
                prevTxId: lockingTxid,
                outputIndex: 0,
                script: ''
            }), bsv.Script.fromASM(lockingScript), inputSatoshis)

            lockingScript0 = lockingScriptCodePart + ' OP_RETURN ' + int2Hex(0) + int2Hex(70)
            tx.addOutput(new bsv.Transaction.Output({
                script: bsv.Script.fromASM(lockingScript0),
                satoshis: outputAmount
            }))
            lockingScript1 = lockingScriptCodePart + ' OP_RETURN ' + int2Hex(0) + int2Hex(30)
            tx.addOutput(new bsv.Transaction.Output({
                script: bsv.Script.fromASM(lockingScript1),
                satoshis: outputAmount
            }))
            
            const preimage = getPreimage(tx, lockingScript, 0, inputSatoshis)
            // const sig1 = getSignature(lockingTxid, privateKey1, lockingScript, amount, lockingScript, newAmount)
            const unlockingScript = toHex(preimage) + ' ' + int2Asm(70) + ' ' + int2Asm(30) + ' ' + int2Asm(outputAmount) + ' ' + int2Asm(outputAmount) + ' ' + int2Asm(1)
            tx.inputs[0].setScript(bsv.Script.fromASM(unlockingScript));
            splitTxid = await sendTx(tx.serialize());
            console.log('split txid1:       ', splitTxid)
        }

        inputSatoshis = outputAmount
        outputAmount -= FEE
        {
            const tx = new bsv.Transaction()
            tx.addInput(new bsv.Transaction.Input({
                prevTxId: splitTxid,
                outputIndex: 0,
                script: ''
            }), bsv.Script.fromASM(lockingScript0), inputSatoshis)
              
            tx.addInput(new bsv.Transaction.Input({
                prevTxId: splitTxid,
                outputIndex: 1,
                script: ''
            }), bsv.Script.fromASM(lockingScript1), inputSatoshis)
    
            const lockingScript2 = lockingScriptCodePart + ' OP_RETURN ' + int2Hex(70) + int2Hex(30)
            tx.addOutput(new bsv.Transaction.Output({
                script: bsv.Script.fromASM(lockingScript2),
                satoshis: outputAmount
            }))
            
            // input 0
            {
                const preimage = getPreimage(tx, lockingScript0, 0, inputSatoshis)
                // const sig1 = getSignature(lockingTxid, privateKey1, lockingScript, amount, lockingScript, newAmount)
                const unlockingScript = toHex(preimage) + ' ' + 'OP_TRUE' + ' ' + int2Asm(30) + ' ' + int2Asm(outputAmount) +' ' + int2Asm(2)
                tx.inputs[0].setScript(bsv.Script.fromASM(unlockingScript));
            }

            // input 1
            {
                const preimage = getPreimage(tx, lockingScript1, 1, inputSatoshis)
                // const sig1 = getSignature(lockingTxid, privateKey1, lockingScript, amount, lockingScript, newAmount)
                const unlockingScript = toHex(preimage) + ' ' + 'OP_FALSE' + ' ' + int2Asm(70) + ' ' + int2Asm(outputAmount) +' ' + int2Asm(2)
                tx.inputs[1].setScript(bsv.Script.fromASM(unlockingScript));
            }

            const mergeTxid = await sendTx(tx.serialize());
            console.log('merge txid1:       ', mergeTxid)
        }

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()