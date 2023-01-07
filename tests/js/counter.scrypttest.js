

const { expect } = require('chai');
const { compileContract, newTx, inputIndex, inputSatoshis } = require('../../helper');
const { buildContractClass, SigHashPreimage, bsv, toHex, getPreimage } = require('scryptlib');


const outputAmount = 222222




describe('Counter', () => {

    let counter, Counter

    before(() => {
        Counter = buildContractClass(compileContract('counter.scrypt'));
        counter = new Counter(0n);
    });

    it('should call success', () => {

        let newLockingScript = counter.getNewStateScript({
            counter: 1n
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

        const result1 = counter.increment(SigHashPreimage(toHex(preimage1)), BigInt(outputAmount)).verify()
        expect(result1.success, result1.error).to.be.true

        // save state
        counter.counter = 1n

        newLockingScript = counter.getNewStateScript({
            counter: 2n
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

        const result2 = counter.increment(SigHashPreimage(toHex(preimage2)), BigInt(outputAmount)).verify()
        expect(result2.success, result2.error).to.be.true

    });

    it('should fail when pushing wrong amount', () => {
        counter = new Counter(0n);

        let newLockingScript = counter.getNewStateScript({
            counter: 1n
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

        const result1 = counter.increment(SigHashPreimage(toHex(preimage1)), BigInt(outputAmount - 1)).verify()
        expect(result1.success, result1.error).to.be.false
    });


    it('should fail when pushing wrong new state', () => {
        counter = new Counter(0n);

        let newLockingScript = counter.getNewStateScript({
            counter: 2n
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

        const result1 = counter.increment(SigHashPreimage(toHex(preimage1)), BigInt(outputAmount)).verify()
        expect(result1.success, result1.error).to.be.false
    });

})
