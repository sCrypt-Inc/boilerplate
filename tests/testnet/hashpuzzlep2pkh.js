/**
 * Testnet test for HashPuzzleP2PKH contract in JavaScript
 **/
const path = require('path');
const { buildContractClass, lockScriptTx, bsv, unlockScriptTx, getSignature, showError } = require('scrypttest');
const { inputIndex, inputSatoshis, tx, toHex, genPrivKey } = require('../testHelper');

// Test keys
const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())

// NIST Test Vectors (https://www.nist.gov/itl/ssd/software-quality-group/nsrl-test-data)
const dataBuffer = Buffer.from("abc");
const data =  dataBuffer
const sha256Data = bsv.crypto.Hash.sha256(dataBuffer);

// private key on testnet in WIF
const key = ''
if (!key) {
    genPrivKey()
}

(async() => {
    try {
        const amount = 1000
        const newAmount = 546

        // get locking script
        const HashPuzzleP2PKH = buildContractClass(path.join(__dirname, '../../contracts/hashpuzzlep2pkh.scrypt'), tx, inputIndex, inputSatoshis);
        testTx = new HashPuzzleP2PKH(toHex(pkh), toHex(sha256Data))
        const lockingScript = testTx.getLockingScript()
        // lock fund to the script
        const lockingTxid = await lockScriptTx(lockingScript, key, amount)
        console.log('locking txid:     ', lockingTxid)
        
        // unlock
        const sig = getSignature(lockingTxid, privateKey, lockingScript, amount, lockingScript, newAmount)
        const unlockingScript = toHex(data)+ ' ' + sig + ' ' + toHex(publicKey)
        const unlockingTxid = await unlockScriptTx(unlockingScript, lockingTxid, lockingScript, amount, lockingScript, newAmount)
        console.log('unlocking txid:   ', unlockingTxid)

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()