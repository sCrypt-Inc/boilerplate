const path = require('path');
const { buildContractClass, lockScriptTx, unlockScriptTx, showError } = require('scrypttest');
const { genPrivKey } = require('../testHelper');

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
        const Demo = buildContractClass(path.join(__dirname, '../../contracts/demo.scrypt'));
        demo = new Demo(4, 7);
        const lockingScript = demo.getLockingScript()
        
        // lock fund to the script
        const lockingTxid = await lockScriptTx(lockingScript, key, amount)
        console.log('locking txid:     ', lockingTxid)
        
        // unlock
        const unlockingScript = 'OP_11 OP_1' // OP_1: first public function
        const unlockingTxid = await unlockScriptTx(unlockingScript, lockingTxid, lockingScript, amount, lockingScript, newAmount)
        console.log('unlocking txid:   ', unlockingTxid)

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()