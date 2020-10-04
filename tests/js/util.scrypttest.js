const { expect } = require('chai');
const { buildContractClass, getPreimage, toHex, SigHashPreimage } = require('scryptlib');

const { tx, compileContract, inputIndex, inputSatoshis } = require('../../helper');

describe('Test sCrypt contract Util In Javascript', () => {
    let util, preimage, result

    before(() => {
        const Util = buildContractClass(compileContract('util.scrypt'));
        util = new Util();
        preimage = getPreimage(tx, util.lockingScript.toASM(), inputSatoshis)
    });

    it('should return true', () => {
        const context = { tx, inputIndex, inputSatoshis }
        result = util.testPreimageParsing(new SigHashPreimage(toHex(preimage))).verify(context)
        expect(result.success, result.error).to.be.true
    });
});