const { expect } = require('chai');
const { bsv, buildContractClass, PubKey, toHex, Sha256, Bytes, getPreimage, signTx, buildTypeClasses, num2bin } = require('scryptlib');
const { compileContract, inputIndex, inputSatoshis, uint322bin,
    pdiff2Target } = require('../../helper');

const { newTxInBlock, header, wrongMerklePath, merklePath,
    headers, toBlockHeader, buildMerkleProof } = require('./blockchainhelper');



const alicePrivateKey = new bsv.PrivateKey.fromRandom('testnet')
const alicePublicKey = bsv.PublicKey.fromPrivateKey(alicePrivateKey)

const bobPrivateKey = new bsv.PrivateKey.fromRandom('testnet')
const bobPublicKey = bsv.PublicKey.fromPrivateKey(bobPrivateKey)

const tx = newTxInBlock();
const outputAmount = 222222


describe('Test sCrypt contract blockTimeBet In Javascript', () => {
    const BlockTimeBet = buildContractClass(compileContract('blockTimeBet.scrypt'))

    const { BlockHeader, Node } = buildTypeClasses(BlockTimeBet);

    before(() => {
        //Normally, the difficulty of the current network should be used
        blockTimeBet = new BlockTimeBet(pdiff2Target(headers[1].difficulty), new PubKey(toHex(alicePublicKey)), new PubKey(toHex(bobPublicKey)))
    })

    function runMain(privateKey, headers, proof) {
        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
            satoshis: outputAmount
        }));


        blockTimeBet.txContext = { tx, inputIndex, inputSatoshis }


        preimage = getPreimage(tx, blockTimeBet.lockingScript, inputSatoshis)

        const sig = signTx(tx, privateKey, blockTimeBet.lockingScript, inputSatoshis);

        return blockTimeBet.main(headers, proof, sig, preimage).verify()

    }

    it('blockTimeBet should succeed when using right block header', () => {

        const result = runMain(alicePrivateKey,
            headers.map(h => toBlockHeader(BlockHeader, h)),
            buildMerkleProof(Node, merklePath))
        expect(result.success, result.error).to.be.true
    });


    it('blockTimeBet should fail when using wrong block header', () => {

        const result = runMain(alicePrivateKey,
            headers.map(h => toBlockHeader(BlockHeader, Object.assign({}, h, {
                version: 1
            }))),
            buildMerkleProof(Node, merklePath))

        expect(result.success, result.error).to.be.false
    });


    it('blockTimeBet should fail when using wrongMerklePath', () => {

        const result = runMain(alicePrivateKey,
            headers.map(h => toBlockHeader(BlockHeader, h)),
            buildMerkleProof(Node, wrongMerklePath))
        expect(result.success, result.error).to.be.false
    });


    it('when time is less 10 minutes , Bob should NOT win and not able to unlock', () => {

        const result = runMain(bobPrivateKey,
            headers.map(h => toBlockHeader(BlockHeader, h)),
            buildMerkleProof(Node, merklePath))
        expect(result.success, result.error).to.be.false
    });

});
