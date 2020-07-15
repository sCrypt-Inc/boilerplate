const path = require('path');
const { buildContractClass, bsv, literal2Asm, lockScriptTx, unlockFundedScriptTx, getFundedSighashPreimage, showError } = require('scrypttest');
const { toHex, num2bin, genPrivKey, DataLen } = require('../testHelper');

// private key on testnet in WIF
const key = ''
if (!key) {
    genPrivKey()
}

const privateKey = new bsv.PrivateKey.fromWIF(key)
const publicKey = privateKey.publicKey
// PKH for receiving change from each transaction (20 bytes - 40 hexadecimal characters)
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async() => {
    try {
        // get locking script
        const AdvancedCounter = buildContractClass(path.join(__dirname, '../../contracts/advancedcounter.scrypt'))
        const advCounter = new AdvancedCounter()

        lockingScriptCodePart =advCounter.getLockingScript()
        // append state as passive data
        let lockingScript = lockingScriptCodePart +' OP_RETURN ' + num2bin(0, DataLen)

        // initial contract funding
        let amount = 10000

        // lock funds to the script
        let lockingTxid = await lockScriptTx(lockingScript, key, amount)

        console.log('funding txid:      ', lockingTxid)

        // We'll pass-in the newChange, as part of the unlockingScript

        // Run five transactions /iterations
        for (i = 0; i < 5; i++) {
            // avoid mempool conflicts
            // sleep to allow previous tx to "sink-into" the network
            await sleep(9000);
            console.log('==============================')
            console.log('DONE SLEEPING before iteration ', i)
            console.log('------------------------------')

            // Set the state for the next transaction
            const newLockingScript = lockingScriptCodePart +' OP_RETURN ' + num2bin(i + 1, DataLen)

            // keep the contract funding constant
            const newAmount = amount

            // Get preimage, AND the change amount
            console.log('====== Getting funded sighash preimage...')
            const preData = await getFundedSighashPreimage(key, lockingTxid, lockingScript, amount, newLockingScript, newAmount)

            const preimage = preData.preimage
            const changeASM = literal2Asm(preData.change)
            const amountASM = literal2Asm(newAmount)

            // Inform the contract how its state is being updated
            // This format must match the contract's public function:
            //             sighashPreimage     amount            changePKH          changeSats
            const unlockingScript = [preimage, amountASM, toHex(pkh), changeASM].join(' ')
            console.log(' ====== Unlocking...')
            lockingTxid = await unlockFundedScriptTx(key, unlockingScript, lockingTxid, lockingScript, amount, newLockingScript, newAmount)
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