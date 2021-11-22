const { expect } = require('chai');
const { bsv, buildContractClass, PubKey, toHex, Sha256, Bytes, getPreimage, signTx, buildTypeClasses, num2bin } = require('scryptlib');
const { num2hex, sha256d, reverseEndian, compileContract, inputIndex, inputSatoshis, uint322bin,
    pdiff2Target, toLittleIndian } = require('../../helper');
const BN = bsv.crypto.BN

function newTx() {
    const utxo = {
        txId: 'c1d32f28baa27a376ba977f6a8de6ce0a87041157cef0274b20bfda2b0d8df96',
        outputIndex: 0,
        script: '',   // placeholder
        satoshis: inputSatoshis
    };
    return new bsv.Transaction().from(utxo);
}


let merklePath = {
    "blockHash": "0000000000000000091216c46973d82db057a6f9911352892b7769ed517681c3",
    "branches": [
        {
            "hash": "7e0ba1980522125f1f40d19a249ab3ae036001b991776813d25aebe08e8b8a50",
            "pos": "R"
        },
        {
            "hash": "1e3a5a8946e0caf07006f6c4f76773d7e474d4f240a276844f866bd09820adb3",
            "pos": "R"
        }
    ],
    "hash": "c1d32f28baa27a376ba977f6a8de6ce0a87041157cef0274b20bfda2b0d8df96",
    "merkleRoot": "95a920b1002bed05379a0d2650bb13eb216138f28ee80172f4cf21048528dc60"
}

let wrongMerklePath = {
    "blockHash": "0000000000000000091216c46973d82db057a6f9911352892b7769ed517681c3",
    "branches": [
        {
            "hash": "7e0ba1980522125f1f40d19a249ab3ae036001b991776813d25aebe08e8b8a50",
            "pos": "R"
        },
        {
            "hash": "1e3a5a8946e0caf07006f6c4f76773d7e474d4f240a276844f866bd09820adb3",
            "pos": "L"
        }
    ],
    "hash": "c1d32f28baa27a376ba977f6a8de6ce0a87041157cef0274b20bfda2b0d8df96",
    "merkleRoot": "95a920b1002bed05379a0d2650bb13eb216138f28ee80172f4cf21048528dc60"
}


// block hash: 0000000000000000091216c46973d82db057a6f9911352892b7769ed517681c3
// height: 575191
let headers = [{
    height: 575190,
    hash: "00000000000000000012ce7f4bbce3346ac438ab7fdcb6fa5440db9857856a7f",
    version: 536870912,
    previousblockhash: "0000000000000000053c806b768d74f4915d78fd2a4913fa099f4a50b1b442ae",
    merkleroot: "d6048f7e997478df41845bd978b659c4be1bf1fcdcd6b84fc52f3f12a78a7c94",
    time: 1553501800,
    bits: "18097441",
    nonce: 1491582841,
    difficulty: 116297997088.8581
}, {
    height: 575191,
    hash: "0000000000000000091216c46973d82db057a6f9911352892b7769ed517681c3",
    version: 536870912,
    previousblockhash: "00000000000000000012ce7f4bbce3346ac438ab7fdcb6fa5440db9857856a7f",
    merkleroot: "95a920b1002bed05379a0d2650bb13eb216138f28ee80172f4cf21048528dc60",
    time: 1553501874,
    bits: "180978d5",
    nonce: 2482491775,
    difficulty: 116078424449.9863
}, {
    height: 575192,
    hash: "0000000000000000072908e2ca635d247b3b1083133b7d651bd85a4a52917bcd",
    version: 545259520,
    previousblockhash: "0000000000000000091216c46973d82db057a6f9911352892b7769ed517681c3",
    merkleroot: "eafc291c22ea981aa92b396557e7d1abe635a22d5ea6a4f984e49f07304ee7e9",
    time: 1553503057,
    bits: "1809706d",
    nonce: 3967797946,
    difficulty: 116482237496.1408
}, {
    height: 575193,
    hash: "000000000000000002e245c5e16b8da8edce69b06e0aa68aa3bb3594c8425c25",
    version: 536870912,
    previousblockhash: "0000000000000000072908e2ca635d247b3b1083133b7d651bd85a4a52917bcd",
    merkleroot: "0a08049dacca2daf9661876ca96f299b691f6e15529c47a60ac9b9346b8a6dad",
    time: 1553503419,
    bits: "18097162",
    nonce: 2499332973,
    difficulty: 116436122689.3434
}, {
    height: 575194,
    hash: "000000000000000003778e0d797dc8d24ae42a9a1665ec09c2b0ad34cbaa47bd",
    version: 536870912,
    previousblockhash: "000000000000000002e245c5e16b8da8edce69b06e0aa68aa3bb3594c8425c25",
    merkleroot: "cac99010bcb1dc7a9f7cef330b84a498c884275b38dcd600bd7881e33f307073",
    time: 1553503507,
    bits: "1809760d",
    nonce: 3325277277,
    difficulty: 116211717740.3256
}, {
    height: 575195,
    hash: "0000000000000000049518f381ffe4b6d44d22066a8ccbdd925ed20182e7aa0c",
    version: 545259520,
    previousblockhash: "000000000000000003778e0d797dc8d24ae42a9a1665ec09c2b0ad34cbaa47bd",
    merkleroot: "a8958bafb8186faafa5f902f0644424eced2c6b245d1d9f750d4939170bef00a",
    time: 1553504197,
    bits: "1809693c",
    nonce: 1657687289,
    difficulty: 116829929318.67
}, {
    height: 575196,
    hash: "000000000000000008eada7984bc383e2f12b7162e54dd712735ab17fbdb3ae9",
    version: 536870912,
    previousblockhash: "0000000000000000049518f381ffe4b6d44d22066a8ccbdd925ed20182e7aa0c",
    merkleroot: "4c90d9eb07a6987bb858d63bcdeeee62958889e5d7ca2975467bbdf377f9a837",
    time: 1553504635,
    bits: "18095f79",
    nonce: 658862919,
    difficulty: 117305225800.4284
}]





const alicePrivateKey = new bsv.PrivateKey.fromRandom('testnet')
const alicePublicKey = bsv.PublicKey.fromPrivateKey(alicePrivateKey)

const bobPrivateKey = new bsv.PrivateKey.fromRandom('testnet')
const bobPublicKey = bsv.PublicKey.fromPrivateKey(bobPrivateKey)

const tx = newTx();
const outputAmount = 222222


describe('Test sCrypt contract blockTimeBet In Javascript', () => {
    const BlockTimeBet = buildContractClass(compileContract('blockTimeBet.scrypt'))

    const { BlockHeader, Sibling } = buildTypeClasses(BlockTimeBet);

    function buildMerklePath(merklePath) {
        const array = new Array(32);
        array.fill(new Sibling({
            hash: new Sha256("0000000000000000000000000000000000000000000000000000000000000000"),
            left: 0 //invalid sibling
        }))

        merklePath.branches.forEach((m, index) => {
            array[index] = new Sibling({
                hash: new Sha256(toLittleIndian(m.hash)),
                left: m.pos === "L" ? 1 : 2
            });
        })

        return array;

    }



    function toBlockHeader(header) {

        return new BlockHeader({
            version: new Bytes(uint322bin(header.version)),
            prevBlockHash: new Sha256(toLittleIndian(header.previousblockhash)),
            merkleRoot: new Sha256(toLittleIndian(header.merkleroot)),
            time: new Bytes(uint322bin(header.time)),
            bits: new Bytes(toLittleIndian(header.bits)),
            nonce: new Bytes(uint322bin(header.nonce))
        })
    }




    before(() => {
        //Normally, the difficulty of the current network should be used
        blockTimeBet = new BlockTimeBet(pdiff2Target(headers[1].difficulty), new PubKey(toHex(alicePublicKey)), new PubKey(toHex(bobPublicKey)))
    })

    it('blockTimeBet should succeed when using right block header', () => {

        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(alicePrivateKey.toAddress()),
            satoshis: outputAmount
        }));


        blockTimeBet.txContext = { tx, inputIndex, inputSatoshis }


        preimage = getPreimage(tx, blockTimeBet.lockingScript, inputSatoshis)

        const sig = signTx(tx, alicePrivateKey, blockTimeBet.lockingScript, inputSatoshis);

        const result = blockTimeBet.main(headers.map(h => toBlockHeader(h)), buildMerklePath(merklePath), sig, preimage).verify()

        expect(result.success, result.error).to.be.true
    });


    it('blockTimeBet should fail when using wrong block header', () => {

        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(alicePrivateKey.toAddress()),
            satoshis: outputAmount
        }));


        blockTimeBet.txContext = { tx, inputIndex, inputSatoshis }


        preimage = getPreimage(tx, blockTimeBet.lockingScript, inputSatoshis)

        const sig = signTx(tx, alicePrivateKey, blockTimeBet.lockingScript, inputSatoshis);

        const result = blockTimeBet.main(headers.map(h => toBlockHeader(Object.assign({}, h, {
            version: 1
        }))), buildMerklePath(merklePath), sig, preimage).verify()

        expect(result.success, result.error).to.be.false
    });


    it('blockTimeBet should fail when using wrongMerklePath', () => {

        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(alicePrivateKey.toAddress()),
            satoshis: outputAmount
        }));


        blockTimeBet.txContext = { tx, inputIndex, inputSatoshis }


        preimage = getPreimage(tx, blockTimeBet.lockingScript, inputSatoshis)

        const sig = signTx(tx, alicePrivateKey, blockTimeBet.lockingScript, inputSatoshis);

        const result = blockTimeBet.main(headers.map(h => toBlockHeader(h)), buildMerklePath(wrongMerklePath), sig, preimage).verify()

        expect(result.success, result.error).to.be.false
    });


    it('blockTimeBet should fail when using wrong sig', () => {

        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(alicePrivateKey.toAddress()),
            satoshis: outputAmount
        }));


        blockTimeBet.txContext = { tx, inputIndex, inputSatoshis }


        preimage = getPreimage(tx, blockTimeBet.lockingScript, inputSatoshis)

        const sig = signTx(tx, bobPrivateKey, blockTimeBet.lockingScript, inputSatoshis);

        const result = blockTimeBet.main(headers.map(h => toBlockHeader(h)), buildMerklePath(merklePath), sig, preimage).verify()

        expect(result.success, result.error).to.be.false
    });

});
