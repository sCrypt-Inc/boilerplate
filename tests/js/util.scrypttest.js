const { expect } = require('chai');
const { buildContractClass, getPreimage, toHex, SigHashPreimage } = require('scryptlib');

const { newTx, compileTestContract, inputIndex, inputSatoshis } = require('../../helper');

describe('Test sCrypt library Util In Javascript', () => {
    let util, preimage, result, tx = newTx()

    before(() => {
        const UtilTest = buildContractClass(compileTestContract('utiltest.scrypt'));
        util = new UtilTest();
        preimage = getPreimage(tx, util.lockingScript.toASM(), inputSatoshis)
    });

    it('should return true', () => {
        const context = { tx, inputIndex, inputSatoshis }
        result = util.testPreimageParsing(new SigHashPreimage(toHex(preimage))).verify(context)
        expect(result.success, result.error).to.be.true

    });
});