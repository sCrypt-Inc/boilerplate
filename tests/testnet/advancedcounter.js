const path = require('path');
const { buildContractClass, lockScriptTx, unlockFundedScriptTx, getFundedSighashPreimage, showError } = require('scrypttest');

const { num2SM } = require('../testHelper');

// private key on testnet in WIF
const key = ''
if (!key) {
    throw new Error('You must provide a private key');
}
// PKH for receiving change from each transaction (20 bytes - 40 hexadecimal characters)
// Set this to your private key's PKH
// bsv.crypto.Hash.sha256ripemd160(PubKey)
const EXT_FUNDING_CHANGE_PKH = ''
if (!EXT_FUNDING_CHANGE_PKH) {
    throw new Error('You must provide a PKH for receiving change');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async() => {
    try {
        // get locking script
        const AdvancedCounter = buildContractClass(path.join(__dirname, '../../contracts/advancedcounter.scrypt'))
        const advCounter = new AdvancedCounter()

        lockingScript = advCounter.getScriptPubKey()
        // append state as passive data
        let scriptPubKey = lockingScript + ' OP_RETURN 00'

        // initial contract funding
        let amount = 1000

        // lock funds to the script
        let txInfo = await lockScriptTx(scriptPubKey, key, amount)

        let lockingTxid = txInfo.txid
        console.log('funding txid:      ', lockingTxid)

        // We'll pass-in the newChange, as part of the scriptSig

        // Run five transactions /iterations
        for (i = 0; i < 5; i++) {
            // avoid mempool conflicts
            // sleep to allow previous tx to "sink-into" the network
            await sleep(9000);
            console.log('==============================')
            console.log('DONE SLEEPING before iteration ', i)
            console.log('------------------------------')

            // Set the state for the next transaction
            const newScriptPubKey = lockingScript + ' OP_RETURN 0' + (i + 1)    // only works for i < 9
            const newAmount = 1000  // keep the contract funding constant

            // Get preimage, AND the change amount
            console.log('====== Getting funded sighash preinage...')
            const preData = await getFundedSighashPreimage(key, lockingTxid, scriptPubKey, amount, newScriptPubKey, newAmount)

            console.log('Got preimage data: ', preData)
            const preimage = preData.preimage
            const changeASM = num2SM(preData.change)
            const amountASM = num2SM(newAmount)

            // Inform the contract how its state is being updated
            // This format must match the contract's public function:
            //             sighashPreimage     amount            changePKH                      changeSats
            const scriptSig = preimage + ' ' + amountASM + ' ' + EXT_FUNDING_CHANGE_PKH + ' ' + changeASM

            console.log(' ====== Unlocking...')
            lockingTxid = await unlockFundedScriptTx(key, scriptSig, lockingTxid, scriptPubKey, amount, newScriptPubKey, newAmount)
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
