const { expect } = require('chai');
const { buildContractClass } = require('scryptlib');
const { compileContract } = require('../../helper');

describe('Heavy: Test sCrypt contract Demo In Javascript', () => {
    let demo, result

    before(() => {
        const Matrix = buildContractClass(compileContract('matrix.scrypt'));
        demo = new Matrix();
    });

    it('should return true', () => {
        result = demo.main([
            [10, 10, 10, 10],
            [20, 20, 20, 20],
            [30, 30, 30, 30],
            [40, 40, 40, 40]
        ]).verify()
        expect(result.success, result.error).to.be.true
    });
});