const { buildContractClass, bsv, toHex, Bytes, String, PubKey, signTx, getPreimage, Ripemd160 } = require('scryptlib');
const { loadDesc, showError, createMetaNetChildNode, createMetaNetRootNode, sleep } = require('../helper');
const { privateKey } = require('../privateKey');


const privateKeyRoot = privateKey;
const rootNode = privateKeyRoot.publicKey;
console.log(`Root node: '${toHex(rootNode)}'`);

const privateKeyNodeA = new bsv.PrivateKey.fromRandom('testnet');
const nodeA = privateKeyNodeA.publicKey;
console.log(`NodeA: '${toHex(nodeA)}'`);


const privateKeyNodeB = new bsv.PrivateKey.fromRandom('testnet');
const nodeB = privateKeyNodeB.publicKey;
console.log(`nodeB: '${toHex(nodeB)}'`);

const privateKeyNodeAA = new bsv.PrivateKey.fromRandom('testnet');
const nodeAA = privateKeyNodeAA.publicKey;
console.log(`NodeAA: '${toHex(nodeAA)}'`);



(async () => {
    try {
        const changePKH = bsv.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer())


        const MetaNetHelloworld = buildContractClass(loadDesc('meta_debug_desc.json'));
        const meta = new MetaNetHelloworld();

        const txRoot = await createMetaNetRootNode(toHex(rootNode), meta, 1);

        console.log('root node txid:     ', txRoot.id)

        await sleep(8)

        const hello_worldZ_str = new String("hello world")

        // create a child node of root node

        const txNodeA = await createMetaNetChildNode(toHex(nodeA), txRoot, hello_worldZ_str.toASM(), meta.lockingScript, 1, (tx, output) => {
            const sig = signTx(tx, privateKeyRoot, output.script, output.satoshis)
            const preimage = getPreimage(tx, output.script, output.satoshis)

            return meta.unlock(sig, new PubKey(toHex(nodeA)), new Bytes(txRoot.toString()), new Ripemd160(toHex(changePKH)), tx.getChangeAmount(), preimage).toScript();
        })


        console.log('NodeA txid:   ', txNodeA.id)

        await sleep(10)

        // create a child node of root nodeA
        const txNodeAA = await createMetaNetChildNode(toHex(nodeAA), txNodeA, hello_worldZ_str.toASM(), meta.lockingScript, 1, (tx, output) => {
            const sig = signTx(tx, privateKeyNodeA, output.script, output.satoshis)
            const preimage = getPreimage(tx, output.script, output.satoshis)

            // for debugging
            // meta.txContext = {
            //     tx,
            //     inputIndex: 0,
            //     inputSatoshis: output.satoshis
            // }

            // const result = meta.unlock(sig, new PubKey(toHex(nodeAA)), new Bytes(txNodeA.toString()), new Ripemd160(toHex(changePKH)), tx.getChangeAmount(), preimage).verify();

            // console.log(result)
            return meta.unlock(sig, new PubKey(toHex(nodeAA)), new Bytes(txNodeA.toString()), new Ripemd160(toHex(changePKH)), tx.getChangeAmount(), preimage).toScript();
        })



        console.log('txNodeAA txid:   ', txNodeAA.id)

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()