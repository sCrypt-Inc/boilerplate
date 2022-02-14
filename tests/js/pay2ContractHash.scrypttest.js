

const { expect } = require('chai');
const { compileContract, newTx, createInputFromPrevTx} = require('../../helper');
const {  buildContractClass, Bytes, Sig, SigHashPreimage,  bsv, toHex, getPreimage, buildTypeClasses, SigHash, PubKeyHash, PubKey } = require('scryptlib');
const {  toHashedMap, findKeyIndex, hash160, signTx, buildOpreturnScript } = require('scryptlib/dist/utils');

const inputIndex = 0;
const inputSatoshis = 100000;

const outputAmount = inputSatoshis

const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())


const Counter = buildContractClass(compileContract('advancedCounter.scrypt'));

const Pay2ContractHash = buildContractClass(compileContract('pay2ContractHash.scrypt'));


let map = new Map();

const tokenId = 111;
map.set(tokenId, new PubKeyHash(toHex(pkh)))

// tx that transfers token from PubKeyHash to Counter's contract hash
const tx1 = newTx(inputSatoshis);

describe('Pay2ContractHash', () => {
    let counter, pay2ContractHash, counterContractHash
    before(() => {
        counter = new Counter(0);

        pay2ContractHash = new Pay2ContractHash(toHashedMap(map));

        counterContractHash = new PubKeyHash(hash160(counter.lockingScript.toHex()));
      });
    

    it('should succeed when token is transferred from a PubKeyHash to hash of Counter contract', () => {


        map.set(tokenId, counterContractHash)


        let newLockingScript = pay2ContractHash.getNewStateScript({
            owners: toHashedMap(map)
        })


        tx1.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage = getPreimage(tx1, pay2ContractHash.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID);

        const fromSig = signTx(tx1, privateKey, pay2ContractHash.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID);

        pay2ContractHash.txContext = {
            tx: tx1,
            inputIndex,
            inputSatoshis
        }

        const result = pay2ContractHash.transferFrom(new PubKeyHash(toHex(pkh)), counterContractHash, fromSig, new PubKey(toHex(publicKey)), new Bytes(''),
            new Bytes(''), 0, tokenId, findKeyIndex(map, tokenId), preimage).verify()
        expect(result.success, result.error).to.be.true

        pay2ContractHash.owners = toHashedMap(map)

    });


    it('should succeed when token is transferred from Counter to a PubKeyHash', () => {


        // tx that deploying a Counter
        const tx2 = newTx(inputSatoshis);

        tx2.addOutput(new bsv.Transaction.Output({
            script: counter.lockingScript,
            satoshis: outputAmount
        }))

        map.set(tokenId, new PubKeyHash(toHex(pkh)))


        let newLockingScript = pay2ContractHash.getNewStateScript({
            owners: toHashedMap(map)
        })

        // tx that transfering token from Counter ContractHash to PubKeyHash
        const tx3 = new bsv.Transaction();
        tx3.addInput(createInputFromPrevTx(tx1))
        .addInput(createInputFromPrevTx(tx2))


        tx3.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage = getPreimage(tx3, pay2ContractHash.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID);

        pay2ContractHash.txContext = {
            tx: tx3,
            inputIndex,
            inputSatoshis
        }

        const result = pay2ContractHash.transferFrom(counterContractHash, new PubKeyHash(toHex(pkh)), new Sig('00'), new PubKey(toHex(publicKey)), new Bytes(tx3.prevouts()),
            new Bytes(toHex(tx2)), 1 /**contractInputIndex */, tokenId, findKeyIndex(map, tokenId), preimage).verify()
        expect(result.success, result.error).to.be.true

    });



    it('should fail when transferring token without Counter as an input', () => {


        // tx that deploying a Counter
        const tx2 = newTx(inputSatoshis);

        tx2.addOutput(new bsv.Transaction.Output({
            script: buildOpreturnScript("01"),
            satoshis: outputAmount
        }))

        map.set(tokenId, new PubKeyHash(toHex(pkh)))


        let newLockingScript = pay2ContractHash.getNewStateScript({
            owners: toHashedMap(map)
        })

        // tx that transferstoken from Counter ContractHash to PubKeyHash
        const tx3 = new bsv.Transaction();
        tx3.addInput(createInputFromPrevTx(tx1))
        .addInput(createInputFromPrevTx(tx2))


        tx3.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage = getPreimage(tx3, pay2ContractHash.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID);

        pay2ContractHash.txContext = {
            tx: tx3,
            inputIndex,
            inputSatoshis
        }

        const result = pay2ContractHash.transferFrom(counterContractHash, new PubKeyHash(toHex(pkh)), new Sig('00'), new PubKey(toHex(publicKey)), new Bytes(tx3.prevouts()),
            new Bytes(toHex(tx2)), 1 /**contractInputIndex */, tokenId, findKeyIndex(map, tokenId), preimage).verify()
        expect(result.success, result.error).to.be.false
    });

})
