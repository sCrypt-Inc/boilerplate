const { expect } = require('chai');
const { bsv, buildContractClass, PubKey, Sha256, Bytes, buildTypeClasses, num2bin } = require('scryptlib');
const { compileContract, toLittleIndian, pdiff2Target } = require('../../helper');
const { COINBASETX, header, COINBASETX_FAKE_HEIGHT, merklePathOfNotLastTx, Last_TX_ID,
    NotLastTxID, merklePath, merklePathOfLastTx, merklePathOfLastTxCopy, buildMerkleProof, toBlockHeader, headers } = require('./blockchainhelper');


describe('Test sCrypt contract blockchainTest In Javascript', () => {
    const BlockchainTest = buildContractClass(compileContract('blockchainTest.scrypt'))

    const { BlockHeader, Node } = buildTypeClasses(BlockchainTest);

    before(() => {
        //Normally, the difficulty of the current network should be used
        blockchainTest = new BlockchainTest()
    })

    it('blockchainTest should succeed when using right block header', () => {


        const result = blockchainTest.testBlockHeight(toBlockHeader(BlockHeader, header),
            buildMerkleProof(Node, merklePath), new Bytes(COINBASETX), 575191).verify()

        expect(result.success, result.error).to.be.true
    });


    it('blockchainTest should FAIL when using fake coinbase tx', () => {


        const result = blockchainTest.testBlockHeight(toBlockHeader(BlockHeader, header),
            buildMerkleProof(Node, merklePath), new Bytes(COINBASETX_FAKE_HEIGHT), 575191).verify()

        expect(result.success, result.error).to.be.false
    });


    it('testBlockTxCount should succeed when using last tx id', () => {

        const result = blockchainTest.testBlockTxCount(toBlockHeader(BlockHeader, header),
            buildMerkleProof(Node, merklePathOfLastTx),
            new Sha256(toLittleIndian(Last_TX_ID)),
            3).verify()

        expect(result.success, result.error).to.be.true
    });


    it('testBlockTxCount should FAIL when using last tx copy in the merkle tree', () => {

        const result = blockchainTest.testBlockTxCount(toBlockHeader(BlockHeader, header),
            buildMerkleProof(Node, merklePathOfLastTxCopy),
            new Sha256(toLittleIndian(Last_TX_ID)),
            3).verify()

        expect(result.success, result.error).to.be.false
    });

    it('testBlockTxCount should FAIL when using NOT the last tx', () => {

        const result = blockchainTest.testBlockTxCount(toBlockHeader(BlockHeader, header),
            buildMerkleProof(Node, merklePathOfNotLastTx),
            new Sha256(toLittleIndian(NotLastTxID)),
            3).verify()

        expect(result.success, result.error).to.be.false
    });


    it('testIsBlockHeaderValid should succeed when using right header ', () => {

        const result = blockchainTest.testIsBlockHeaderValid(toBlockHeader(BlockHeader, header),
            pdiff2Target(header.difficulty)).verify()

        expect(result.success, result.error).to.be.true
    });


    it('testIsBlockHeaderValid should FAIL when header validation fails due to low difficulty ', () => {

        const result = blockchainTest.testIsBlockHeaderValid(toBlockHeader(BlockHeader, header),
            pdiff2Target(header.difficulty + 100)).verify()

        expect(result.success, result.error).to.be.false
    });


    it('testIsBlockHeaderChainValid should succeed when all headers validation and they are actually chained one after another', () => {

        const result = blockchainTest.testIsBlockHeaderChainValid(headers.map(header =>
            toBlockHeader(BlockHeader, header)),
            pdiff2Target(headers[0].difficulty / 2)).verify()

        expect(result.success, result.error).to.be.true
    });


    it('testIsBlockHeaderChainValid should FAIL when all headers NOT chained', () => {

        const headersNotChained = headers.map(header =>
            toBlockHeader(BlockHeader, header));
        const tmp = headersNotChained[2];

        headersNotChained[2] = headersNotChained[3]
        headersNotChained[3] = tmp;

        const result = blockchainTest.testIsBlockHeaderChainValid(headersNotChained,
            pdiff2Target(headers[0].difficulty / 2)).verify()

        expect(result.success, result.error).to.be.false
    });



    it('testIsBlockHeaderChainValid should FAIL when NOT all difficulty larger than blockchainTarget', () => {

        // headers[1].difficulty < headers[0].difficulty
        const result = blockchainTest.testIsBlockHeaderChainValid(
            headers.map(header => toBlockHeader(BlockHeader, header)),
            pdiff2Target(headers[0].difficulty)).verify()

        expect(result.success, result.error).to.be.false
    });

});
