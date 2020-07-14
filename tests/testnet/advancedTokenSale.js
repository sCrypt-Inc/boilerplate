const path = require('path');
const { buildContractClass, bsv, literal2Asm, lockScriptTx, unlockFundedScriptTx, getFundedSighashPreimage, showError } = require('scrypttest');
const { toHex } = require('../testHelper');

// number of bytes to denote token amount
const ByteLen = 1

// Token price is 1000 satoshis each
// NOTE: a price that is too low could run afoul of dust policy
const satsPerToken = 1000

// one iteration per buyer
const boughtEachIteration = [ 1, 3, 5, 7, 9 ]
const numIterations = boughtEachIteration.length

// private key of original contract publisher
const key0 = ''

// private keys of buyers - on testnet in WIF
const key1 = ''
const key2 = ''
const key3 = ''
const key4 = ''
const key5 = ''
if (!key1 || !key2 || !key3 || !key4 || !key5) {
    throw new Error('You must provide private keys to purchase tokens');
}


const privateKeys = [ key1, key2, key3, key4, key5 ]
const publicKeys = new Array( privateKeys.length )
// PKHs for receiving change from each transaction (20 bytes - 40 hexadecimal characters)
const pkhs = new Array( privateKeys.length )

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function hexit(dec) {
    var hex = dec.toString(16)
    if ( hex.length == 1 ) {
        return '0' + hex
    } else {
        return hex
    }
}

(async() => {
    try {
        // generate public keys, and PKHs
        for (k=0; k < privateKeys.length; k++) {
            privateKey = new bsv.PrivateKey.fromWIF( privateKeys[k] )
            publicKeys[k] = bsv.PublicKey.fromPrivateKey(privateKey)
            pkhs[k] = bsv.crypto.Hash.sha256ripemd160(publicKeys[k].toBuffer())
        }

        // get locking script
        const AdvancedTokenSale = buildContractClass(path.join(__dirname, '../../contracts/advancedTokenSale.scrypt'))
        const advTokenSale = new AdvancedTokenSale( satsPerToken )

        lockingScriptCodePart =advTokenSale.getLockingScript()
        // append state as passive data
        let lockingScript = lockingScriptCodePart +' OP_RETURN 00'

        // initial contract funding - arbitrary amount
        let amount = 1000

        // lock funds to the script
        let lockingTxid = await lockScriptTx(lockingScript, key0, amount)

        // funded by key0
        console.log('funding txid:      ', lockingTxid)

        // matches initial state. We'll append from here
        var salesEntries = ' 00'

        // Run five transactions /iterations
        for (i = 0; i < numIterations; i++) {
            // avoid mempool conflicts
            // sleep to allow previous tx to "sink-into" the network
            console.log('==============================')
            console.log('Sleeping before iteration ', i)
            console.log('------------------------------')
            await sleep(9000);

            const numBought = boughtEachIteration[ i ]
            const numBoughtHex = hexit( numBought )         // num2bin(1, ByteLen) would return OP_1 instead of 1
            console.log('buying ', numBoughtHex, '(hex) tokens...')

            // build-up a list of sales
            salesEntries = salesEntries + ' ' + toHex(publicKeys[i]) + numBoughtHex

            // Set the state for the transaction/sale we're building
            const newLockingScript = lockingScriptCodePart +' OP_RETURN' + salesEntries

            // Increase contract funding to match proceeds from sale
            // The contract expects/enforces this
            const newAmount = amount + numBought * satsPerToken

            // Get preimage, AND the change amount
            console.log('====== Getting funded sighash preimage...')
            const preData = await getFundedSighashPreimage(privateKeys[i], lockingTxid, lockingScript, amount, newLockingScript, newAmount)

            const preimage = preData.preimage
            const changeASM = literal2Asm(preData.change)

            // Inform the contract how its state is being updated
            // This unlockingScript format must match the contract's public function:
            const unlockingScript = [preimage,     // sighashPreimage
                    toHex(pkhs[i]),         // changePKH
                    changeASM,              // changeSats
                    toHex(publicKeys[i]),   // buyer's public key
                    literal2Asm( numBought )           // number of tokens purchased
            ].join(' ')

            console.log(' ====== Unlocking...')
            lockingTxid = await unlockFundedScriptTx(privateKeys[i], unlockingScript, lockingTxid, lockingScript, amount, newLockingScript, newAmount)
            console.log('iteration #' + i + ' txid: ', lockingTxid)

            // preserve for next iteration
            lockingScript = newLockingScript
            amount = newAmount
        }

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()
