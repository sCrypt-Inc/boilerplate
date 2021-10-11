

const { expect } = require('chai');
const { compileContract, newTx} = require('../../helper');
const {  buildContractClass, Bool, Bytes, Int, SigHashPreimage, bsv, toHex, getPreimage } = require('scryptlib');
const inputIndex = 0;
const inputSatoshis = 100000;

const outputAmount = 222222

const StateExample = buildContractClass(compileContract('state.scrypt'));


describe('state_test', () => {


    it('should serializer state success', () => {
        const stateExample = new StateExample(1000, new Bytes('0101'), true);

        expect(stateExample.dataPart.toHex()).to.be.equal('02e803020101010700000000');
        stateExample.counter++;
        stateExample.state_bytes = new Bytes('010101');
        stateExample.state_bool = false;

        expect(stateExample.dataPart.toHex()).to.be.equal('02e90303010101000800000000');

    });


    it('should deserializer state success', () => {
        const stateExample = new StateExample(1000, new Bytes('0101'), true);

        let newStateExample = StateExample.fromHex(stateExample.lockingScript.toHex());

        expect(newStateExample.counter.equals(new Int(1000))).to.be.true;
        expect(newStateExample.state_bytes.equals(new Bytes('0101'))).to.be.true;
        expect(newStateExample.state_bool.equals(new Bool(true))).to.be.true;
    });

    it('should call success', () => {
        const stateExample = new StateExample(1000, new Bytes('0101'), true);

        expect(stateExample.dataPart.toHex()).to.be.equal('02e803020101010700000000');


        let newLockingScript = stateExample.getStateScript({
            counter: 1001,
            state_bytes:  new Bytes('010101'),
            state_bool: false
        })
        const tx1 = newTx(inputSatoshis);
        tx1.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage1 = getPreimage(tx1, stateExample.lockingScript, inputSatoshis)

        stateExample.txContext = {
            tx: tx1,
            inputIndex,
            inputSatoshis
        }

        const result1 = stateExample.unlock(new SigHashPreimage(toHex(preimage1)), outputAmount).verify()
        expect(result1.success, result1.error).to.be.true

        // save state
        stateExample.counter = 1001
        stateExample.state_bytes = new Bytes('010101');
        stateExample.state_bool = false;


        newLockingScript = stateExample.getStateScript({
            counter: 1002,
            state_bytes:  new Bytes('01010101'),
            state_bool: true
        })


        const tx2 = newTx(inputSatoshis);
        tx2.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage2 = getPreimage(tx2, stateExample.lockingScript, inputSatoshis)

        stateExample.txContext = {
            tx: tx2,
            inputIndex,
            inputSatoshis
        }

        const result2 = stateExample.unlock(new SigHashPreimage(toHex(preimage2)), outputAmount).verify()
        expect(result2.success, result2.error).to.be.true

    });

})
