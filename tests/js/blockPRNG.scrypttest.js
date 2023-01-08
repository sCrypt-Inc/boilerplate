const { expect } = require('chai');
const { bsv, buildContractClass, PubKey, toHex, Sha256, Bytes, getPreimage, signTx, num2bin } = require('scryptlib');
const { compileContract, inputIndex, inputSatoshis, pdiff2Target } = require('../../helper');


const { newTxInBlock, header, wrongMerklePath, merklePath, toBlockHeader, buildMerkleProof } = require('./blockchainhelper');


const alicePrivateKey = bsv.PrivateKey.fromRandom('testnet')
const alicePublicKey = bsv.PublicKey.fromPrivateKey(alicePrivateKey)

const bobPrivateKey = bsv.PrivateKey.fromRandom('testnet')
const bobPublicKey = bsv.PublicKey.fromPrivateKey(bobPrivateKey)

const tx = newTxInBlock();
const outputAmount = 222222


describe('Test sCrypt contract BlockchainPRNG In Javascript', () => {

    let blockchainPRNG
    before(() => {
        const BlockchainPRNG = buildContractClass(compileContract('blockPRNG.scrypt'))

        //Normally, the difficulty of the current network should be used
        blockchainPRNG = new BlockchainPRNG(pdiff2Target(header.difficulty), PubKey(toHex(alicePublicKey)), PubKey(toHex(bobPublicKey)))
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

        const result = runBet(alicePrivateKey, toBlockHeader( header),
            buildMerkleProof(merklePath))

        expect(result.success, result.error).to.be.true
    });


    it('blockchainPRNG should fail when using wrong block header', () => {
        const wrongHeader = Object.assign({}, header);
        wrongHeader.nonce++;
        const result = runBet(alicePrivateKey, toBlockHeader(wrongHeader),
            buildMerkleProof(merklePath))
        expect(result.success, result.error).to.be.false
    });


    it('blockchainPRNG should fail when using wrong wrongMerklePath', () => {

        const result = runBet(alicePrivateKey, toBlockHeader(header),
            buildMerkleProof(wrongMerklePath))

        expect(result.success, result.error).to.be.false
    });


    it('when nonce is odd, Bob should NOT win and not able to unlock', () => {

        const result = runBet(bobPrivateKey, toBlockHeader(header),
            buildMerkleProof(merklePath))

        expect(result.success, result.error).to.be.false
    });

});
