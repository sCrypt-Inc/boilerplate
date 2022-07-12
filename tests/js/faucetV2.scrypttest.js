const { expect } = require('chai');
const { buildContractClass, bsv, getPreimage, SigHashPreimage, toHex, PubKeyHash, signTx, Sig, PubKey } = require('scryptlib');
const { compileContract, inputIndex, inputSatoshis, newTx } = require('../../helper');

// miner fee in satoshi per each withdraw
const withdrawMinerFee = 6000
// withdraw interval limit in seconds
const withdrawIntervals = 300
// how many satoshis can be withdrawn each time
const withdrawAmount = 20000

const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())

const initialTimestamp = 1646992089

const Signature = bsv.crypto.Signature
const sigHashType = Signature.SIGHASH_SINGLE | Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_FORKID

describe('Test Faucet', () => {

    let faucet

    before(() => {
        const Faucet = buildContractClass(compileContract('faucetV2.scrypt'))
        faucet = new Faucet(withdrawIntervals, withdrawAmount, new PubKeyHash(toHex(publicKeyHash)), initialTimestamp)
    })


    describe('Test Faucet Withdraw', () => {

        let tx, preimage, newLocktime, newLockingScript, contractAmount

        before(() => {

            newLocktime = initialTimestamp + withdrawIntervals
            newLockingScript = faucet.getNewStateScript({ lastWithdrawTimestamp: newLocktime })
            contractAmount = inputSatoshis - withdrawAmount - withdrawMinerFee
            tx = newTx()
            tx.addOutput(new bsv.Transaction.Output({ script: newLockingScript, satoshis: contractAmount }))
            tx.addOutput(new bsv.Transaction.Output({ script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()), satoshis: withdrawAmount }))
            tx.inputs[0].sequenceNumber = 0xfffffffe
            tx.nLockTime = newLocktime

            preimage = getPreimage(tx, faucet.lockingScript, inputSatoshis)
            faucet.txContext = { tx, inputIndex, inputSatoshis }
        })

        it('should succeed', () => {
            const result = faucet.withdraw(new SigHashPreimage(toHex(preimage)), new PubKeyHash(toHex(publicKeyHash))).verify()
            expect(result.success, result.error).to.be.true
        })

        it('should fail when passing incorrect contract amount', () => {
            tx.setOutput(0, new bsv.Transaction.Output({ script: newLockingScript, satoshis: contractAmount - 1 }))

            const _preimage = getPreimage(tx, faucet.lockingScript, inputSatoshis)
            const context = { tx, inputIndex, inputSatoshis }
            const result = faucet.withdraw(new SigHashPreimage(toHex(_preimage)), new PubKeyHash(toHex(publicKeyHash))).verify(context)
            expect(result.success, result.error).to.be.false

            tx.setOutput(0, new bsv.Transaction.Output({ script: newLockingScript, satoshis: contractAmount }))
        })

        it('should fail if not meet withdraw interval', () => {
            // nLocktime too low
            let _newLocktime = newLocktime - 1
            let _newLockingScript = faucet.getNewStateScript({ lastWithdrawTimestamp: _newLocktime })
            tx.setOutput(0, new bsv.Transaction.Output({ script: _newLockingScript, satoshis: contractAmount }))
            tx.nLockTime = _newLocktime

            let _preimage = getPreimage(tx, faucet.lockingScript, inputSatoshis)
            let context = { tx, inputIndex, inputSatoshis }
            let result = faucet.withdraw(new SigHashPreimage(toHex(_preimage)), new PubKeyHash(toHex(publicKeyHash))).verify(context)
            expect(result.success, result.error).to.be.false

            // nLocktime too high
            _newLocktime = newLocktime * 2
            _newLockingScript = faucet.getNewStateScript({ lastWithdrawTimestamp: _newLocktime })
            tx.setOutput(0, new bsv.Transaction.Output({ script: _newLockingScript, satoshis: contractAmount }))
            tx.nLockTime = _newLocktime

            _preimage = getPreimage(tx, faucet.lockingScript, inputSatoshis)
            context = { tx, inputIndex, inputSatoshis }
            result = faucet.withdraw(new SigHashPreimage(toHex(_preimage)), new PubKeyHash(toHex(publicKeyHash))).verify(context)
            expect(result.success, result.error).to.be.false

            tx.setOutput(0, new bsv.Transaction.Output({ script: newLockingScript, satoshis: contractAmount }))
            tx.nLockTime = newLocktime
        })

        it('should fail if withdraw amount is invalid', () => {
            tx.setOutput(1, new bsv.Transaction.Output({ script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()), satoshis: withdrawAmount + 1 }))

            const _preimage = getPreimage(tx, faucet.lockingScript, inputSatoshis)
            const context = { tx, inputIndex, inputSatoshis }
            const result = faucet.withdraw(new SigHashPreimage(toHex(_preimage)), new PubKeyHash(toHex(publicKeyHash))).verify(context)
            expect(result.success, result.error).to.be.false

            tx.setOutput(1, new bsv.Transaction.Output({ script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()), satoshis: withdrawAmount }))
        })

        it('should fail if not enbale nlocktime', () => {
            tx.inputs[0].sequenceNumber = 0xffffffff

            const _preimage = getPreimage(tx, faucet.lockingScript, inputSatoshis)
            const context = { tx, inputIndex, inputSatoshis }
            const result = faucet.withdraw(new SigHashPreimage(toHex(_preimage)), new PubKeyHash(toHex(publicKeyHash))).verify(context)
            expect(result.success, result.error).to.be.false

            tx.inputs[0].sequenceNumber = 0xfffffffe
        })

        it('should succeed again', () => {
            const result = faucet.withdraw(new SigHashPreimage(toHex(preimage)), new PubKeyHash(toHex(publicKeyHash))).verify()
            expect(result.success, result.error).to.be.true
        })
    })

    describe('Test Faucet Deposit', () => {

        let tx, preimage, depositAmount

        before(() => {
            depositAmount = 10000
            const newLockingScript = faucet.getNewStateScript({ lastWithdrawTimestamp: initialTimestamp })
            tx = newTx()
            tx.addOutput(new bsv.Transaction.Output({ script: newLockingScript, satoshis: inputSatoshis + depositAmount }))

            preimage = getPreimage(tx, faucet.lockingScript, inputSatoshis, inputIndex, sigHashType)
            faucet.txContext = { tx, inputIndex, inputSatoshis }
        })

        it('should succeed with only 1 output', () => {
            const result = faucet.deposit(new SigHashPreimage(toHex(preimage)), depositAmount).verify()
            expect(result.success, result.error).to.be.true
        })

        it('should fail if deposit amount is not positive', () => {
            const result = faucet.deposit(new SigHashPreimage(toHex(preimage)), 0).verify()
            expect(result.success, result.error).to.be.false
        })

        it('should succeed with more outputs', () => {
            tx.addOutput(new bsv.Transaction.Output({ script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()), satoshis: 1000 }))
            let _preimage = getPreimage(tx, faucet.lockingScript, inputSatoshis, inputIndex, sigHashType)
            let context = { tx, inputIndex, inputSatoshis }
            let result = faucet.deposit(new SigHashPreimage(toHex(_preimage)), depositAmount).verify(context)
            expect(result.success, result.error).to.be.true

            tx.addOutput(new bsv.Transaction.Output({ script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()), satoshis: 1000 }))
            _preimage = getPreimage(tx, faucet.lockingScript, inputSatoshis, inputIndex, sigHashType)
            context = { tx, inputIndex, inputSatoshis }
            result = faucet.deposit(new SigHashPreimage(toHex(_preimage)), depositAmount).verify(context)
            expect(result.success, result.error).to.be.true

            tx.outputs.pop()
            tx.outputs.pop()
        })

        it('should succeed again', () => {
            const result = faucet.deposit(new SigHashPreimage(toHex(preimage)), depositAmount).verify()
            expect(result.success, result.error).to.be.true
        })
    })

    describe('Test Faucet Destroy', () => {

        let tx

        before(() => {
            tx = newTx()
            faucet.txContext = { tx, inputIndex, inputSatoshis }
        })

        it('should succeed', () => {
            const signature = signTx(tx, privateKey, faucet.lockingScript, inputSatoshis)
            const result = faucet.destroy(new Sig(toHex(signature)), new PubKey(toHex(publicKey))).verify()
            expect(result.success, result.error).to.be.true
        })

        it('should fail when passing incorrect signature', () => {
            const incorrectPrivateKey = new bsv.PrivateKey.fromRandom('testnet')
            const incorrectSignature = signTx(tx, incorrectPrivateKey, faucet.lockingScript, inputSatoshis)
            const result = faucet.destroy(new Sig(toHex(incorrectSignature)), new PubKey(toHex(publicKey))).verify()
            expect(result.success, result.error).to.be.false
        })

        it('should fail when passing incorrect public key', () => {
            const incorrectPublicKey = new bsv.PrivateKey.fromRandom('testnet').publicKey
            const signature = signTx(tx, privateKey, faucet.lockingScript, inputSatoshis)
            const result = faucet.destroy(new Sig(toHex(signature)), new PubKey(toHex(incorrectPublicKey))).verify()
            expect(result.success, result.error).to.be.false
        })
    })
})
