const { expect } = require('chai');
const { buildContractClass, Sha256, Bytes } = require('scryptlib');
const { compileContract, toLittleIndian, pdiff2Target } = require('../../helper');
const { COINBASETX, header, COINBASETX_FAKE_HEIGHT, merklePathOfNotLastTx, Last_TX_ID,
    NotLastTxID, merklePath, merklePathOfLastTx, merklePathOfLastTxCopy, buildMerkleProof, toBlockHeader, headers } = require('./blockchainhelper');


describe('Test sCrypt contract blockchainTest In Javascript', () => {


    let blockchainTest
    before(() => {
        //Normally, the difficulty of the current network should be used
        const BlockchainTest = buildContractClass(compileContract('blockchainTest.scrypt'))
        blockchainTest = new BlockchainTest();
    })

    it('blockchainTest should succeed when using right block header', () => {

        const result = blockchainTest.testBlockHeight(toBlockHeader(header),
            buildMerkleProof(merklePath), Bytes(COINBASETX), 575191n).verify()

        expect(result.success, result.error).to.be.true
    });


    it('blockchainTest should FAIL when using fake coinbase tx', () => {


        const result = blockchainTest.testBlockHeight(toBlockHeader(header),
            buildMerkleProof(merklePath), Bytes(COINBASETX_FAKE_HEIGHT), 575191n).verify()

        expect(result.success, result.error).to.be.false
    });


    it('testBlockTxCount should succeed when using last tx id', () => {

        const result = blockchainTest.testBlockTxCount(toBlockHeader(header),
            buildMerkleProof(merklePathOfLastTx),
            Sha256(toLittleIndian(Last_TX_ID)),
            3n).verify()

        expect(result.success, result.error).to.be.true
    });


    it('testBlockTxCount should FAIL when using last tx copy in the merkle tree', () => {

        const result = blockchainTest.testBlockTxCount(toBlockHeader(header),
            buildMerkleProof(merklePathOfLastTxCopy),
            Sha256(toLittleIndian(Last_TX_ID)),
            3n).verify()

        expect(result.success, result.error).to.be.false
    });

    it('testBlockTxCount should FAIL when using NOT the last tx', () => {

        const result = blockchainTest.testBlockTxCount(toBlockHeader(header),
            buildMerkleProof(merklePathOfNotLastTx),
            Sha256(toLittleIndian(NotLastTxID)),
            3n).verify()

        expect(result.success, result.error).to.be.false
    });


    it('testIsBlockHeaderValid should succeed when using right header ', () => {

        const result = blockchainTest.testIsBlockHeaderValid(toBlockHeader(header),
            pdiff2Target(header.difficulty)).verify()

        expect(result.success, result.error).to.be.true
    });


    it('testIsBlockHeaderValid should FAIL when header validation fails due to low difficulty ', () => {

        const result = blockchainTest.testIsBlockHeaderValid(toBlockHeader(header),
            pdiff2Target(header.difficulty + 100)).verify()

        expect(result.success, result.error).to.be.false
    });


    it('testIsBlockHeaderChainValid should succeed when all headers validation and they are actually chained one after another', () => {

        const result = blockchainTest.testIsBlockHeaderChainValid(headers.map(header =>
            toBlockHeader(header)),
            pdiff2Target(headers[0].difficulty / 2)).verify()

        expect(result.success, result.error).to.be.true
    });


    it('testIsBlockHeaderChainValid should FAIL when all headers NOT chained', () => {

        const headersNotChained = headers.map(header =>
            toBlockHeader(header));
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
            headers.map(header => toBlockHeader(header)),
            pdiff2Target(headers[0].difficulty)).verify()

        expect(result.success, result.error).to.be.false
    });

});
