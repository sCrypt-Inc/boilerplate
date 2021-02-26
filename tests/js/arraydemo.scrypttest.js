const { expect, assert } = require('chai');
const { buildContractClass, Ripemd160, Sig, Bytes, buildTypeClasses } = require('scryptlib');
const { compileContract } = require('../../helper');

const compileResult = compileContract('arraydemo.scrypt');
const ArrayDemo = buildContractClass(compileResult);
const { ST1, ST2, ST3, MDArrayST1, AliasST2 } = buildTypeClasses(compileResult);

describe('Test sCrypt contract ArrayDemo In Javascript', () => {
    let arraydemo, result

    before(() => {

        arraydemo = new ArrayDemo(33, [
            true,
            false
        ], [
            3311,
            333
        ], [
            new Ripemd160('2235c953af7c83cffa6f192477fb431941400162'),
            new Ripemd160('0176de27477fb7ffd7c99a7e9b931c22fd125c2b')
        ], [
            [
                [
                    1, 2, 3, 4
                ],
                [
                    5, 6, 7, 8
                ],
                [
                    9, 10, 11, 12
                ]
            ],
            [
                [
                    13, 14, 15, 16
                ],
                [
                    17, 18, 19, 20
                ],
                [
                    21, 22, 23, 24
                ]
            ]
        ],
            [[[new ST1({
                x: false,
                y: new Bytes("aa"),
                i: 1
            }), new ST1({
                y: new Bytes("bb"),
                x: true,
                i: 2
            })], [new ST1({
                x: false,
                y: new Bytes("cc"),
                i: 3
            }), new ST1({
                y: new Bytes("dd"),
                x: true,
                i: 4
            })]], [[new ST1({
                x: false,
                y: new Bytes("ee"),
                i: 5
            }), new ST1({
                y: new Bytes("ff"),
                x: true,
                i: 6
            })], [new ST1({
                x: false,
                y: new Bytes("00"),
                i: 7
            }), new ST1({
                y: new Bytes("11"),
                x: true,
                i: 8
            })]]]
        );
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


    it('should return true', () => {
        result = arraydemo.unlockST2(new ST2(
            {
                x: true,
                y: new Bytes("68656c6c6f20776f726c6420"),
                st3: new ST3({
                    x: true,
                    y: [4,5,6],
                    st1: new ST1({
                        x: false,
                        y: new Bytes("68656c6c6f20776f726c6420"),
                        i: 42
                    })
                }) 
            })
        ).verify()
        expect(result.success, result.error).to.be.true
    });

    it('should return true', () => {
        result = arraydemo.testArrayInt([0, 1321, 243213, 32132]).verify()
        expect(result.success, result.error).to.be.true
    });

    it('should return true', () => {
        result = arraydemo.testArrayBool([true, true, false, true, true]).verify()
        expect(result.success, result.error).to.be.true
    });


    it('should return true', () => {
        result = arraydemo.testArrayRipemd160([new Ripemd160("0176de27477fb7ffd7c99a7e9b931c22fd125c2b"), new Ripemd160("0176de27477fb7ffd7c99a7e9b931c22fd125c2b")]).verify()
        expect(result.success, result.error).to.be.true
    });

    it('should return true', () => {
        result = arraydemo.testArraySig([new Sig("30440220349eb89c004114bf238ea1b5db996b709675a9446aa33677f2848e839d64dfe2022046af3cf48ef13855594e7cc8c31771c5b159af19ea077b9c986beacf9a43791841"),
        new Sig("30440220349eb89c004114bf238ea1b5db996b709675a9446aa33677f2848e839d64dfe2022046af3cf48ef13855594e7cc8c31771c5b159af19ea077b9c986beacf9a437918414444")]).verify()
        expect(result.success, result.error).to.be.true
    });



});
