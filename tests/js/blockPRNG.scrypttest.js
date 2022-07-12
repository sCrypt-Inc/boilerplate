const { expect } = require('chai');
const { bsv, buildContractClass, PubKey, toHex, Sha256, Bytes, getPreimage, signTx, buildTypeClasses, num2bin } = require('scryptlib');
const { compileContract, inputIndex, inputSatoshis, toLittleIndian, pdiff2Target, uint32Tobin } = require('../../helper');


const { newTxInBlock, header, wrongMerklePath, merklePath, toBlockHeader, buildMerkleProof } = require('./blockchainhelper');


const alicePrivateKey = new bsv.PrivateKey.fromRandom('testnet')
const alicePublicKey = bsv.PublicKey.fromPrivateKey(alicePrivateKey)

const bobPrivateKey = new bsv.PrivateKey.fromRandom('testnet')
const bobPublicKey = bsv.PublicKey.fromPrivateKey(bobPrivateKey)

const tx = newTxInBlock();
const outputAmount = 222222


describe('Test sCrypt contract BlockchainPRNG In Javascript', () => {

    let blockchainPRNG, BlockHeader, Node
    before(() => {
        const BlockchainPRNG = buildContractClass(compileContract('blockPRNG.scrypt'))

        const Types = buildTypeClasses(BlockchainPRNG);
        Node = Types.Node;
        BlockHeader = Types.BlockHeader;
        //Normally, the difficulty of the current network should be used
        blockchainPRNG = new BlockchainPRNG(pdiff2Target(header.difficulty), new PubKey(toHex(alicePublicKey)), new PubKey(toHex(bobPublicKey)))
    })

    function runBet(privatekey, header, proof) {
        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(privatekey.toAddress()),
            satoshis: outputAmount
        }));

        blockchainPRNG.txContext = { tx, inputIndex, inputSatoshis }

        preimage = getPreimage(tx, blockchainPRNG.lockingScript, inputSatoshis)

        const sig = signTx(tx, privatekey, blockchainPRNG.lockingScript, inputSatoshis);

        const result = blockchainPRNG.bet(header,
            proof, sig, preimage).verify()

        return result;
    }

    it('blockchainPRNG should succeed when using right block header', () => {

        const result = runBet(alicePrivateKey, toBlockHeader(BlockHeader, header),
            buildMerkleProof(Node, merklePath))

        expect(result.success, result.error).to.be.true
    });


    it('blockchainPRNG should fail when using wrong block header', () => {
        const wrongHeader = Object.assign({}, header);
        wrongHeader.nonce++;
        const result = runBet(alicePrivateKey, toBlockHeader(BlockHeader, wrongHeader),
            buildMerkleProof(Node, merklePath))
        expect(result.success, result.error).to.be.false
    });


    it('blockchainPRNG should fail when using wrong wrongMerklePath', () => {

        const result = runBet(alicePrivateKey, toBlockHeader(BlockHeader, header),
            buildMerkleProof(Node, wrongMerklePath))

        expect(result.success, result.error).to.be.false
    });


    it('when nonce is odd, Bob should NOT win and not able to unlock', () => {

        const result = runBet(bobPrivateKey, toBlockHeader(BlockHeader, header),
            buildMerkleProof(Node, merklePath))

        expect(result.success, result.error).to.be.false
    });

});
