const path = require('path');
const { expect } = require('chai');
const { buildContractClass, bsv } = require('scrypttest');

const { tx, getPreimage, toHex } = require('../testHelper');

describe('Test sCrypt contract Util In Javascript', () => {
    let util;
    let preimage

    before(() => {
        const Util = buildContractClass(path.join(__dirname, '../../contracts/util.scrypt'));
        util = new Util();
        const lockingScript = util.getScriptPubKey()
        preimage = getPreimage(tx, lockingScript)
    });

    it('should return true', () => {
        expect(util.testPreimageParsing(toHex(preimage))).to.equal(true);
    });
});