const path = require('path');
const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, SigHashPreimage, getLowSPreimage } = require('scryptlib');

const {
    inputIndex,
    inputSatoshis,
    newTx,
    compileContract,
    sighashType2Hex,
} = require("../../helper");

const Hash = bsv.crypto.Hash
const tx = newTx();

const Signature = bsv.crypto.Signature

// MSB of the sighash  due to lower S policy
const MSB_THRESHOLD = 0x7E

describe('Test sCrypt contract OptimalPushTx In Javascript', () => {
    let test, preimage, result

    before(() => {
        const Test = buildContractClass(compileContract('optimalPushtx.scrypt'))
        test = new Test();
        
        // // use this if sigHashType needs to be customized, using Tx.checkPreimageOpt_(txPreimage)
        // const asmVars = {'Tx.checkPreimageOpt_.sigHashType': sighashType2Hex(sighashType)}
        // test.replaceAsmVars(asmVars)

        // set txContext for verification
        test.txContext = {
            tx,
            inputIndex,
            inputSatoshis
        }
    });

    it('should return true', () => {
        const preimage = getLowSPreimage(tx, test.lockingScript, inputSatoshis, inputIndex, Signature.ALL)
        result = test.validate(SigHashPreimage(preimage)).verify()
        expect(result.success, result.error).to.be.true
    });
});