const { expect } = require('chai');
const { buildContractClass, Ripemd160, Sig, Bytes } = require('scryptlib');
const { compileContract } = require('../../helper');


describe('Test sCrypt contract ArrayDemo In Javascript', () => {
    let arraydemo, result,Types

    before(() => {

        const ArrayDemo = buildContractClass(compileContract('arraydemo.scrypt'));

        arraydemo = new ArrayDemo(33n, [
            true,
            false
        ], [
            3311n,
            333n
        ], [
            Ripemd160('2235c953af7c83cffa6f192477fb431941400162'),
            Ripemd160('0176de27477fb7ffd7c99a7e9b931c22fd125c2b')
        ], [
            [
                [
                    1n, 2n, 3n, 4n
                ],
                [
                    5n, 6n, 7n, 8n
                ],
                [
                    9n, 10n, 11n, 12n
                ]
            ],
            [
                [
                    13n, 14n, 15n, 16n
                ],
                [
                    17n, 18n, 19n, 20n
                ],
                [
                    21n, 22n, 23n, 24n
                ]
            ]
        ],
            [[[{
                x: false,
                y: Bytes("aa"),
                i: 1n
            }, {
                y: Bytes("bb"),
                x: true,
                i: 2n
            }], [{
                x: false,
                y: Bytes("cc"),
                i: 3n
            }, {
                y: Bytes("dd"),
                x: true,
                i: 4n
            }]], [[{
                x: false,
                y: Bytes("ee"),
                i: 5n
            }, {
                y: Bytes("ff"),
                x: true,
                i: 6n
            }], [{
                x: false,
                y: Bytes("00"),
                i: 7n
            }, {
                y: Bytes("11"),
                x: true,
                i: 8n
            }]]]
        );
    });


    it('test public function testArrayConstructor', () => {
        result = arraydemo.testArrayConstructor(
            33n,
            [
                true,
                false
            ],
            [
                3311n,
                333n
            ],
            [
                Ripemd160('2235c953af7c83cffa6f192477fb431941400162'),
                Ripemd160('0176de27477fb7ffd7c99a7e9b931c22fd125c2b')
            ]
        ).verify()
        expect(result.success, result.error).to.be.true
    });


    it('test public function unlockST2', () => {
        result = arraydemo.unlockST2({
            x: true,
            y: Bytes("68656c6c6f20776f726c6420"),
            st3: {
                x: true,
                y: [4n, 5n, 6n],
                st1: {
                    x: false,
                    y: Bytes("68656c6c6f20776f726c6420"),
                    i: 42n
                }
            }
        }).verify()
        expect(result.success, result.error).to.be.true
    });

    it('test public function testArrayInt', () => {
        result = arraydemo.testArrayInt([0n, 1321n, 243213n, 32132n]).verify()
        expect(result.success, result.error).to.be.true
    });

    it('test public function testArrayBool', () => {
        result = arraydemo.testArrayBool([true, true, false, true, true]).verify()
        expect(result.success, result.error).to.be.true
    });


    it('test public function testArrayRipemd160', () => {
        result = arraydemo.testArrayRipemd160([Ripemd160("0176de27477fb7ffd7c99a7e9b931c22fd125c2b"), Ripemd160("0176de27477fb7ffd7c99a7e9b931c22fd125c2b")]).verify()
        expect(result.success, result.error).to.be.true
    });

    it('test public function testArraySig', () => {
        result = arraydemo.testArraySig([Sig("30440220349eb89c004114bf238ea1b5db996b709675a9446aa33677f2848e839d64dfe2022046af3cf48ef13855594e7cc8c31771c5b159af19ea077b9c986beacf9a43791841"),
        Sig("30440220349eb89c004114bf238ea1b5db996b709675a9446aa33677f2848e839d64dfe2022046af3cf48ef13855594e7cc8c31771c5b159af19ea077b9c986beacf9a437918414444")]).verify()
        expect(result.success, result.error).to.be.true
    });



    it('test public function unlock', () => {
        result = arraydemo.unlock([
            [
                3n, 1n, 2n
            ],
            [4n, 5n, 6n]
        ],
            [
                1n, 32n
            ]
        ).verify()
        expect(result.success, result.error).to.be.true
    });


    it('test public function unlockST1', () => {
        result = arraydemo.unlockST1([{
            "x": false,
            "y": Bytes("68656c6c6f20776f726c6421"),
            "i": 1n
        }, {
            "x": true,
            "y": Bytes("68656c6c6f20776f726c6420"),
            "i": 2n
        }]
        ).verify()
        expect(result.success, result.error).to.be.true
    });

    it('test public function unlockAliasST2', () => {
        result = arraydemo.unlockAliasST2([{
            x: false,
            y: Bytes("68656c6c6f20776f726c6421"),
            st3: {
                x: false,
                y: [1n, 2n, 3n],
                st1: {
                    x: false,
                    y: Bytes("68656e"),
                    i: 11n
                }
            }
        }, {
            x: true,
            y: Bytes("68656c6c6f20776f726c6420"),
            st3: {
                x: true,
                y: [4n, 5n, 6n],
                st1: {
                    x: true,
                    y: Bytes("6420"),
                    i: 12n
                }
            }
        }]
        ).verify()
        expect(result.success, result.error).to.be.true
    });



    it('test public function unlockMDArrayST1', () => {
        result = arraydemo.unlockMDArrayST1([
            [[
                {
                    x: false,
                    y: Bytes("aa"),
                    i: 1n
                },
                {
                    x: true,
                    y: Bytes("bb"),
                    i: 2n
                }
            ], [{
                x: false,
                y: Bytes("cc"),
                i: 3n
            },
            {
                x: true,
                y: Bytes("dd"),
                i: 4n
            }]],
            [[{
                x: false,
                y: Bytes("ee"),
                i: 5n
            },
            {
                x: true,
                y: Bytes("ff"),
                i: 6n
            }], [{
                x: false,
                y: Bytes("22"),
                i: 7n
            },
            {
                x: true,
                y: Bytes("11"),
                i: 8n
            }]]
        ]
        ).verify()
        expect(result.success, result.error).to.be.true
    });


});
