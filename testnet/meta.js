const { buildContractClass, bsv, toHex, Bytes, String,PubKey, signTx, getPreimage } = require('scryptlib');
const { loadDesc, showError, metaFlag, sendTx, createInputFromPrevTx, fetchUtxos, createMetaNetNode, createMetaNetRootNode, sleep } = require('../helper');
const { privateKey } = require('../privateKey');


const privateKeyRoot = privateKey;
const rootNode = privateKeyRoot.publicKey;
console.log(`Root node: '${toHex(rootNode)}'`);

const privateKeyNodeA = new bsv.PrivateKey.fromRandom('testnet');
const nodeA = privateKeyNodeA.publicKey;
console.log(`NodeA: '${toHex(nodeA)}'`);

const privateKeyNodeAA = new bsv.PrivateKey.fromRandom('testnet');
const nodeAA = privateKeyNodeAA.publicKey;
console.log(`NodeAA: '${toHex(nodeAA)}'`);


const Signature = bsv.crypto.Signature;
const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_SINGLE | Signature.SIGHASH_FORKID;

(async() => {
    try {


        const MetaNetHelloworld = buildContractClass(loadDesc('meta_debug_desc.json'));
        const meta = new MetaNetHelloworld();
        
        const txRoot = await createMetaNetRootNode(toHex(rootNode));

        console.log('root node txid:     ', txRoot.id)

        await sleep(5)
        const txNodeA = await createMetaNetNode(privateKeyRoot, toHex(nodeA), txRoot.id, meta, 1);

        console.log('NodeA txid:     ', txNodeA.id)

        const hello_worldZ_str = new String("hello world")
        await sleep(5)
        const txNodeAA = new bsv.Transaction();
        txNodeAA.addInput(createInputFromPrevTx(txNodeA, 1))
        .addOutput(
            new bsv.Transaction.Output({
              script: bsv.Script.fromASM(`OP_0 OP_RETURN ${metaFlag} ${toHex(nodeAA)} ${toHex(txNodeA.id)} ${hello_worldZ_str.toHex()}`),
              satoshis: 0,
            })
          )
        .setInputScript(0, (tx, output) => {
            const sig = signTx(tx, privateKeyNodeA, output.script, output.satoshis, 0, sighashType)
            const preimage = getPreimage(tx, output.script, output.satoshis, 0, sighashType)

            return meta.unlock(sig, new PubKey(toHex(nodeA)), new PubKey(toHex(nodeAA)), new Bytes(txNodeA.toString()), preimage).toScript();
        })
        .from(await fetchUtxos(privateKey.toAddress()))
        .change(privateKey.toAddress())
        .sign(privateKey)
        .seal()
        
        // unlock
        await sendTx(txNodeAA)

        console.log('NodeAA txid:   ', txNodeAA.id)

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()