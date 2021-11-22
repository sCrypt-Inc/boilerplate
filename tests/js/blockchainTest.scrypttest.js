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

// COINBASE TX of block 575191
let COINBASETX = '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff1c03d7c6082f7376706f6f6c2e636f6d2f3edff034600055b8467f0040ffffffff01247e814a000000001976a914492558fb8ca71a3591316d095afc0f20ef7d42f788ac00000000';

let FAKE_COINBASETX = '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff1c03d1c6082f7376706f6f6c2e636f6d2f3edff034600055b8467f0040ffffffff01247e814a000000001976a914492558fb8ca71a3591316d095afc0f20ef7d42f788ac00000000';
// merklePath of transaction corresponding to the input
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


// last TX ID of block 575191, There are 3 transactions in total
let Last_TX_ID = '5c4d44b9b8d2ec6e0835ac90f206cecb26bf51033f31d4c659975b7534853409';

let merklePathOfLastTx = {
    "blockHash": "0000000000000000091216c46973d82db057a6f9911352892b7769ed517681c3",
    "branches": [
        {
            "hash": "5c4d44b9b8d2ec6e0835ac90f206cecb26bf51033f31d4c659975b7534853409",
            "pos": "R"
        },
        {
            "hash": "66e3dee0ace4efd7b4f5406ea63d5bfb5703ba35ddd4c091e8fb2a99a707fe3e",
            "pos": "L"
        }
    ],
    "hash": "5c4d44b9b8d2ec6e0835ac90f206cecb26bf51033f31d4c659975b7534853409",
    "merkleRoot": "95a920b1002bed05379a0d2650bb13eb216138f28ee80172f4cf21048528dc60"
}

// The merklePath of the fourth transaction, which is a copy of the last transaction,  in the merkle tree
let merklePathOfLastTxCopy = {
    "blockHash": "0000000000000000091216c46973d82db057a6f9911352892b7769ed517681c3",
    "branches": [
        {
            "hash": "5c4d44b9b8d2ec6e0835ac90f206cecb26bf51033f31d4c659975b7534853409",
            "pos": "L"
        },
        {
            "hash": "66e3dee0ace4efd7b4f5406ea63d5bfb5703ba35ddd4c091e8fb2a99a707fe3e",
            "pos": "L"
        }
    ],
    "hash": "5c4d44b9b8d2ec6e0835ac90f206cecb26bf51033f31d4c659975b7534853409",
    "merkleRoot": "95a920b1002bed05379a0d2650bb13eb216138f28ee80172f4cf21048528dc60"
}


// it's the secound tx in the block
let NotLastTxID = '7e0ba1980522125f1f40d19a249ab3ae036001b991776813d25aebe08e8b8a50';
// merklePath of secound tx in the block
let merklePathOfNotLastTx = {
    "blockHash": "0000000000000000091216c46973d82db057a6f9911352892b7769ed517681c3",
    "branches": [
        {
            "hash": "c1d32f28baa27a376ba977f6a8de6ce0a87041157cef0274b20bfda2b0d8df96",
            "pos": "L"
        },
        {
            "hash": "1e3a5a8946e0caf07006f6c4f76773d7e474d4f240a276844f866bd09820adb3",
            "pos": "R"
        }
    ],
    "hash": "7e0ba1980522125f1f40d19a249ab3ae036001b991776813d25aebe08e8b8a50",
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


const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = bsv.PublicKey.fromPrivateKey(privateKey)

const tx = newTx();
const outputAmount = 222222


describe('Test sCrypt contract blockchainTest In Javascript', () => {
    const BlockchainTest = buildContractClass(compileContract('blockchainTest.scrypt'))

    const { BlockHeader, Sibling } = buildTypeClasses(BlockchainTest);

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
        blockchainTest = new BlockchainTest(pdiff2Target(header.difficulty))
    })

    it('blockchainTest should succeed when using right block header', () => {

        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
            satoshis: outputAmount
        }));


        blockchainTest.txContext = { tx, inputIndex, inputSatoshis }


        preimage = getPreimage(tx, blockchainTest.lockingScript, inputSatoshis)

        const result = blockchainTest.testBlockHeight(toBlockHeader(header),
            buildMerklePath(merklePath), new Bytes(COINBASETX), 575191, preimage).verify()

        expect(result.success, result.error).to.be.true
    });


    it('blockchainTest should FAIL when using fake coinbase tx', () => {

        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
            satoshis: outputAmount
        }));


        blockchainTest.txContext = { tx, inputIndex, inputSatoshis }


        preimage = getPreimage(tx, blockchainTest.lockingScript, inputSatoshis)


        const result = blockchainTest.testBlockHeight(toBlockHeader(header),
            buildMerklePath(merklePath), new Bytes(FAKE_COINBASETX), 575191, preimage).verify()

        expect(result.success, result.error).to.be.false
    });


    it('testBlockTxCount should succeed when using last tx id', () => {

        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
            satoshis: outputAmount
        }));


        blockchainTest.txContext = { tx, inputIndex, inputSatoshis }

        preimage = getPreimage(tx, blockchainTest.lockingScript, inputSatoshis)

        const result = blockchainTest.testBlockTxCount(toBlockHeader(header),
            buildMerklePath(merklePath),
            buildMerklePath(merklePathOfLastTx),
            new Sha256(toLittleIndian(Last_TX_ID)),
            3,
            preimage).verify()

        expect(result.success, result.error).to.be.true
    });


    it('testBlockTxCount should FAIL when using last tx copy in the merkle tree', () => {

        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
            satoshis: outputAmount
        }));


        blockchainTest.txContext = { tx, inputIndex, inputSatoshis }

        preimage = getPreimage(tx, blockchainTest.lockingScript, inputSatoshis)

        const result = blockchainTest.testBlockTxCount(toBlockHeader(header),
            buildMerklePath(merklePath),
            buildMerklePath(merklePathOfLastTxCopy),
            new Sha256(toLittleIndian(Last_TX_ID)),
            3,
            preimage).verify()

        expect(result.success, result.error).to.be.false
    });

    it('testBlockTxCount should FAIL when using NOT last tx', () => {

        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
            satoshis: outputAmount
        }));


        blockchainTest.txContext = { tx, inputIndex, inputSatoshis }

        preimage = getPreimage(tx, blockchainTest.lockingScript, inputSatoshis)

        const result = blockchainTest.testBlockTxCount(toBlockHeader(header),
            buildMerklePath(merklePath),
            buildMerklePath(merklePathOfNotLastTx),
            new Sha256(toLittleIndian(NotLastTxID)),
            3,
            preimage).verify()

        expect(result.success, result.error).to.be.false
        expect(result.error).to.be.contains("blockchain.scrypt#72")
    });


});
