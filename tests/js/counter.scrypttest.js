

const { expect } = require('chai');
const { compileContract, newTx } = require('../../helper');
const { buildContractClass, Bool, Bytes, Int, SigHashPreimage, bsv, toHex, getPreimage, buildTypeClasses } = require('scryptlib');
const inputIndex = 0;
const inputSatoshis = 100000;

const outputAmount = 222222




describe('Counter', () => {

    let counter, Counter

    before(() => {
        Counter = buildContractClass(compileContract('counter.scrypt'));
        counter = new Counter(0);
    });

    it('should call success', () => {

        let newLockingScript = counter.getNewStateScript({
            counter: 1
        })
        const tx1 = newTx(inputSatoshis);
        tx1.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage1 = getPreimage(tx1, counter.lockingScript, inputSatoshis)

        counter.txContext = {
            tx: tx1,
            inputIndex,
            inputSatoshis
        }

        const result1 = counter.inc(new SigHashPreimage(toHex(preimage1)), outputAmount).verify()
        expect(result1.success, result1.error).to.be.true

        // save state
        counter.counter = 1

        newLockingScript = counter.getNewStateScript({
            counter: 2
        })


        const tx2 = newTx(inputSatoshis);
        tx2.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage2 = getPreimage(tx2, counter.lockingScript, inputSatoshis)

        counter.txContext = {
            tx: tx2,
            inputIndex,
            inputSatoshis
        }

        const result2 = counter.inc(new SigHashPreimage(toHex(preimage2)), outputAmount).verify()
        expect(result2.success, result2.error).to.be.true

    });

    it('should fail when pushing wrong amount', () => {
        counter = new Counter(0);

        let newLockingScript = counter.getNewStateScript({
            counter: 1
        })
        const tx1 = newTx(inputSatoshis);
        tx1.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage1 = getPreimage(tx1, counter.lockingScript, inputSatoshis)

        counter.txContext = {
            tx: tx1,
            inputIndex,
            inputSatoshis
        }

        const result1 = counter.inc(new SigHashPreimage(toHex(preimage1)), outputAmount - 1).verify()
        expect(result1.success, result1.error).to.be.false
    });

    it('should fail when pushing wrong new state', () => {
        counter = new Counter(0);

        let newLockingScript = counter.getNewStateScript({
            counter: 2
        })
        const tx1 = newTx(inputSatoshis);
        tx1.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage1 = getPreimage(tx1, counter.lockingScript, inputSatoshis)

        counter.txContext = {
            tx: tx1,
            inputIndex,
            inputSatoshis
        }

        const result1 = counter.increment(new SigHashPreimage(toHex(preimage1)), outputAmount).verify()
        expect(result1.success, result1.error).to.be.false
    });

})
