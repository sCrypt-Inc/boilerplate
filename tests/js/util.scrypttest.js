const { expect } = require('chai');
const { buildContractClass, getPreimage, toHex, Bytes } = require('scryptlib');

const { tx, compileContract, inputIndex, inputSatoshis } = require('../../helper');

describe('Test sCrypt contract Util In Javascript', () => {
    let util, preimage, result

    before(() => {
        const Util = buildContractClass(compileContract('util.scrypt'));
        util = new Util();
        preimage = getPreimage(tx, util.lockingScript.toASM(), inputSatoshis)
    });

    it('should return true', () => {
        result = util.testPreimageParsing(new Bytes(toHex(preimage))).verify({ tx, inputIndex, inputSatoshis })
        expect(result.success, result.error).to.be.true
    });
});