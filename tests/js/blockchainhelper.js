const { bsv, Bytes, Sha256 } = require('scryptlib');
const {  uint32Tobin, toLittleIndian } = require('../../helper');

// a common file for blockchainTest.scrypttest.js, blockPRNG.scrypttest.js, blockTimeBet.scrypttest.js



// COINBASE TX of block 575191
const COINBASETX = '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff1c03d7c6082f7376706f6f6c2e636f6d2f3edff034600055b8467f0040ffffffff01247e814a000000001976a914492558fb8ca71a3591316d095afc0f20ef7d42f788ac00000000';

// wrong block height 
const COINBASETX_FAKE_HEIGHT = '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff1c03d1c6082f7376706f6f6c2e636f6d2f3edff034600055b8467f0040ffffffff01247e814a000000001976a914492558fb8ca71a3591316d095afc0f20ef7d42f788ac00000000';
// merklePath of transaction corresponding to the input
const merklePath = {
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
const Last_TX_ID = '5c4d44b9b8d2ec6e0835ac90f206cecb26bf51033f31d4c659975b7534853409';

const merklePathOfLastTx = {
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
const merklePathOfLastTxCopy = {
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


// it's the second tx in the block
const NotLastTxID = '7e0ba1980522125f1f40d19a249ab3ae036001b991776813d25aebe08e8b8a50';
// merklePath of second tx in the block
const merklePathOfNotLastTx = {
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
const headers = [{
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
}];


function newTxInBlock() {
    const utxo = {
        txId: 'c1d32f28baa27a376ba977f6a8de6ce0a87041157cef0274b20bfda2b0d8df96',
        outputIndex: 0,
        script: '',   // placeholder
        satoshis: 100000
    };
    return new bsv.Transaction().from(utxo);
}

// Whether the Node is valid, or its position in the merkle tree
const NodeCode = {
    INVALID: 0n,
    LEFT: 1n,
    RIGHT: 2n
}


// a wrong MerklePath of tx c1d32f28baa27a376ba977f6a8de6ce0a87041157cef0274b20bfda2b0d8df96
const wrongMerklePath = {
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



// convert json object to BlockHeader struct
function toBlockHeader(json) {
    return {
        version: Bytes(uint32Tobin(json.version)),
        prevBlockHash: Sha256(toLittleIndian(json.previousblockhash)),
        merkleRoot: Sha256(toLittleIndian(json.merkleroot)),
        time: BigInt(json.time),
        bits: Bytes(toLittleIndian(json.bits)),
        nonce: BigInt(json.nonce)
    }
}

// build Merkle Proof by merklePath, The generated proof is an array of 32 lengths.
// If the merkle path is less than 32 levels, 
// the rest will be filled with default values
function buildMerkleProof(merklePath) {
    const proof = new Array(32);
    proof.fill({
        hash: Sha256("0000000000000000000000000000000000000000000000000000000000000000"),
        left: NodeCode.INVALID //invalid Node
    })

    merklePath.branches.forEach((m, index) => {
        proof[index] = {
            hash: Sha256(toLittleIndian(m.hash)),
            left: m.pos === "L" ? 1n : 2n
        };
    })

    return proof;

}


module.exports = {
    newTxInBlock,
    COINBASETX,
    COINBASETX_FAKE_HEIGHT,
    merklePath,
    Last_TX_ID,
    merklePathOfLastTx,
    merklePathOfLastTxCopy,
    NotLastTxID,
    merklePathOfNotLastTx,
    NodeCode,
    headers,
    wrongMerklePath,
    toBlockHeader,
    buildMerkleProof,
    header: headers[1] //height: 575191
}
