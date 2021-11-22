const { expect } = require('chai');
const { bsv, buildContractClass, PubKey, toHex, Sha256, Bytes, getPreimage, signTx, buildTypeClasses, num2bin } = require('scryptlib');
const { num2hex, sha256d, reverseEndian, compileContract, inputIndex, inputSatoshis, uint322bin, toLittleIndian, pdiff2Target } = require('../../helper');
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
let header = {
    version: 536870912,
    previousblockhash: "00000000000000000012ce7f4bbce3346ac438ab7fdcb6fa5440db9857856a7f",
    merkleroot: "95a920b1002bed05379a0d2650bb13eb216138f28ee80172f4cf21048528dc60",
    time: 1553501874,
    bits: "180978d5",
    nonce: 2482491775,
    difficulty: 116078424449.9863
}


const alicePrivateKey = new bsv.PrivateKey.fromRandom('testnet')
const alicePublicKey = bsv.PublicKey.fromPrivateKey(alicePrivateKey)

const bobPrivateKey = new bsv.PrivateKey.fromRandom('testnet')
const bobPublicKey = bsv.PublicKey.fromPrivateKey(bobPrivateKey)

const tx = newTx();
const outputAmount = 222222


describe('Test sCrypt contract BlockchainPRNG In Javascript', () => {
    const BlockchainPRNG = buildContractClass(compileContract('blockPRNG.scrypt'))

    const { BlockHeader,  Sibling } = buildTypeClasses(BlockchainPRNG);

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


    before(() => {
        //Normally, the difficulty of the current network should be used
        blockchainPRNG = new BlockchainPRNG(pdiff2Target(header.difficulty), new PubKey(toHex(alicePublicKey)), new PubKey(toHex(bobPublicKey)))
    })

    it('blockchainPRNG should succeed when using right block header', () => {

        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(alicePrivateKey.toAddress()),
            satoshis: outputAmount
        }));


        blockchainPRNG.txContext = { tx, inputIndex, inputSatoshis }


        preimage = getPreimage(tx, blockchainPRNG.lockingScript, inputSatoshis)

        const sig = signTx(tx, alicePrivateKey, blockchainPRNG.lockingScript, inputSatoshis);

        const result = blockchainPRNG.bet(new BlockHeader({
            version: new Bytes(uint322bin(header.version)),
            prevBlockHash: new Sha256(toLittleIndian(header.previousblockhash)),
            merkleRoot: new Sha256(toLittleIndian(header.merkleroot)),
            time: new Bytes(uint322bin(header.time)),
            bits: new Bytes(toLittleIndian(header.bits)),
            nonce: new Bytes(uint322bin(header.nonce))
        }), buildMerklePath(merklePath), sig, preimage).verify()

        expect(result.success, result.error).to.be.true
    });


    it('blockchainPRNG should fail when using wrong block header', () => {

        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(alicePrivateKey.toAddress()),
            satoshis: outputAmount
        }));


        blockchainPRNG.txContext = { tx, inputIndex, inputSatoshis }


        preimage = getPreimage(tx, blockchainPRNG.lockingScript, inputSatoshis)

        const sig = signTx(tx, alicePrivateKey, blockchainPRNG.lockingScript, inputSatoshis);

        const result = blockchainPRNG.bet(new BlockHeader({
            version: new Bytes(uint322bin(header.version)),
            prevBlockHash: new Sha256(toLittleIndian(header.previousblockhash)),
            merkleRoot: new Sha256(toLittleIndian(header.merkleroot)),
            time: new Bytes(uint322bin(header.time)),
            bits: new Bytes(toLittleIndian(header.bits)),
            nonce: new Bytes(uint322bin(header.nonce + 1))
        }), buildMerklePath(merklePath), sig, preimage).verify()

        expect(result.success, result.error).to.be.false
    });


    it('blockchainPRNG should fail when using wrong wrongMerklePath', () => {

        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(alicePrivateKey.toAddress()),
            satoshis: outputAmount
        }));


        blockchainPRNG.txContext = { tx, inputIndex, inputSatoshis }

        preimage = getPreimage(tx, blockchainPRNG.lockingScript, inputSatoshis)

        const sig = signTx(tx, alicePrivateKey, blockchainPRNG.lockingScript, inputSatoshis);

        const result = blockchainPRNG.bet(new BlockHeader({
            version: new Bytes(uint322bin(header.version)),
            prevBlockHash: new Sha256(toLittleIndian(header.previousblockhash)),
            merkleRoot: new Sha256(toLittleIndian(header.merkleroot)),
            time: new Bytes(uint322bin(header.time)),
            bits: new Bytes(toLittleIndian(header.bits)),
            nonce: new Bytes(uint322bin(header.nonce))
        }), buildMerklePath(wrongMerklePath), sig, preimage).verify()

        expect(result.success, result.error).to.be.false
    });

    
});
