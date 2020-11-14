const { expect, assert } = require('chai');
const { buildContractClass, Ripemd160, Sig } = require('scryptlib');
const { compileContract } = require('../../helper');


describe('Test sCrypt contract Demo In Javascript', () => {
    let arraydemo, result

    before(() => {
        const ArrayDemo = buildContractClass(compileContract('arraydemo.scrypt'));
        arraydemo = new ArrayDemo(33, [
            true,
            false
        ], [
            3311,
            333
        ], [
            new Ripemd160('2235c953af7c83cffa6f192477fb431941400162'),
            new Ripemd160('0176de27477fb7ffd7c99a7e9b931c22fd125c2b')
        ]);
    });
    

    it('should return true', () => {
        result = arraydemo.testArrayConstructor(
            33,
            [
                true,
                false
            ],
            [
                3311,
                333
            ],
            [
                new Ripemd160('2235c953af7c83cffa6f192477fb431941400162'),
                new Ripemd160('0176de27477fb7ffd7c99a7e9b931c22fd125c2b')
            ]
        ).verify()
        expect(result.success, result.error).to.be.true
    });


    // it('should return true', () => {
    //     result = arraydemo.testArrayInt([1, 1321, 243213, 32132]).verify()
    //     expect(result.success, result.error).to.be.true
    // });

    // it('should return true', () => {
    //     result = arraydemo.testArrayBool([false, true, false, true, true]).verify()
    //     expect(result.success, result.error).to.be.true
    // });


    // it('should return true', () => {
    //     result = arraydemo.testArrayRipemd160([new Ripemd160("0176de27477fb7ffd7c99a7e9b931c22fd125c2b"), new Ripemd160("0176de27477fb7ffd7c99a7e9b931c22fd125c2b")]).verify()
    //     expect(result.success, result.error).to.be.true
    // });

    // it('should return true', () => {
    //     result = arraydemo.testArraySig([new Sig("30440220349eb89c004114bf238ea1b5db996b709675a9446aa33677f2848e839d64dfe2022046af3cf48ef13855594e7cc8c31771c5b159af19ea077b9c986beacf9a43791841"),
    //     new Sig("30440220349eb89c004114bf238ea1b5db996b709675a9446aa33677f2848e839d64dfe2022046af3cf48ef13855594e7cc8c31771c5b159af19ea077b9c986beacf9a437918414444")]).verify()
    //     expect(result.success, result.error).to.be.true
    // });



});
