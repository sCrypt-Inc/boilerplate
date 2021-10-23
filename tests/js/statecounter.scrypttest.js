

const { expect } = require('chai');
const { compileContract, newTx} = require('../../helper');
const {  buildContractClass, Bool, Bytes, Int, SigHashPreimage, bsv, toHex, getPreimage, buildTypeClasses } = require('scryptlib');
const inputIndex = 0;
const inputSatoshis = 100000;

const outputAmount = 222222

const result = compileContract('statecounter.scrypt');
const StateCounter = buildContractClass(result);

const {ST} = buildTypeClasses(result);


describe('state_statecounter', () => {

    it('should call success', () => {
        const stateCounter = new StateCounter(0);

        let newLockingScript = stateCounter.getNewStateScript({
            counter: 1
        })
        const tx1 = newTx(inputSatoshis);
        tx1.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage1 = getPreimage(tx1, stateCounter.lockingScript, inputSatoshis)

        stateCounter.txContext = {
            tx: tx1,
            inputIndex,
            inputSatoshis
        }

        const result1 = stateCounter.unlock(new SigHashPreimage(toHex(preimage1)), outputAmount).verify()
        expect(result1.success, result1.error).to.be.true

        // save state
        stateCounter.counter = 1

        newLockingScript = stateCounter.getNewStateScript({
            counter: 2
        })


        const tx2 = newTx(inputSatoshis);
        tx2.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage2 = getPreimage(tx2, stateCounter.lockingScript, inputSatoshis)

        stateCounter.txContext = {
            tx: tx2,
            inputIndex,
            inputSatoshis
        }

        const result2 = stateCounter.unlock(new SigHashPreimage(toHex(preimage2)), outputAmount).verify()
        expect(result2.success, result2.error).to.be.true

    });

})
