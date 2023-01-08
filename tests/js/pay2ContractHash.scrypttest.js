

const { expect } = require('chai');
const { compileContract, newTx, inputIndex, inputSatoshis} = require('../../helper');
const {  buildContractClass, Bytes, Sig,  bsv, toHex, getPreimage, PubKeyHash, PubKey, buildOpreturnScript, signTx, getSortedItem, hash160 } = require('scryptlib');

const Signature = bsv.crypto.Signature
const outputAmount = inputSatoshis

const privateKey = bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())



let map = new Map();

const tokenId = 111n;
map.set(tokenId, PubKeyHash(toHex(pkh)))

// tx that transfers token from PubKeyHash to Counter's contract hash
const tx1 = newTx(inputSatoshis);

describe('Pay2ContractHash', () => {
    let counter, pay2ContractHash, counterContractHash
    before(() => {

        const Counter = buildContractClass(compileContract('advancedCounter.scrypt'));

        const Pay2ContractHash = buildContractClass(compileContract('pay2ContractHash.scrypt'));


        counter = new Counter(0n);

        pay2ContractHash = new Pay2ContractHash(map);

        counterContractHash = PubKeyHash(hash160(counter.lockingScript.toHex()));
      });
    

    it('should succeed when token is transferred from a PubKeyHash to hash of Counter contract', () => {


        map.set(tokenId, counterContractHash)


        let newLockingScript = pay2ContractHash.getNewStateScript({
            owners: map
        })


        tx1.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage = getPreimage(tx1, pay2ContractHash.lockingScript, inputSatoshis, 0, Signature.SINGLE);

        const fromSig = signTx(tx1, privateKey, pay2ContractHash.lockingScript, inputSatoshis, 0, Signature.SINGLE);

        pay2ContractHash.txContext = {
            tx: tx1,
            inputIndex,
            inputSatoshis
        }

        const result = pay2ContractHash.transferFrom(PubKeyHash(toHex(pkh)), counterContractHash, fromSig, PubKey(toHex(publicKey)), Bytes(''),
            Bytes(''), 0, getSortedItem(map, tokenId), preimage).verify()
        expect(result.success, result.error).to.be.true

        pay2ContractHash.owners = map

    });


    it('should succeed when token is transferred from Counter to a PubKeyHash', () => {


        // tx that deploying a Counter
        const tx2 = newTx(inputSatoshis);

        tx2.addOutput(new bsv.Transaction.Output({
            script: counter.lockingScript,
            satoshis: outputAmount
        }))

        map.set(tokenId, PubKeyHash(toHex(pkh)))


        let newLockingScript = pay2ContractHash.getNewStateScript({
            owners: map
        })

        // tx that transfering token from Counter ContractHash to PubKeyHash
        const tx3 = new bsv.Transaction();
        tx3.addInputFromPrevTx(tx1)
        .addInputFromPrevTx(tx2)


        tx3.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage = getPreimage(tx3, pay2ContractHash.lockingScript, inputSatoshis, 0, Signature.SINGLE);

        pay2ContractHash.txContext = {
            tx: tx3,
            inputIndex,
            inputSatoshis
        }

        const result = pay2ContractHash.transferFrom(counterContractHash, PubKeyHash(toHex(pkh)), Sig('00'), PubKey(toHex(publicKey)), Bytes(tx3.prevouts()),
            Bytes(toHex(tx2)), 1 /**contractInputIndex */, getSortedItem(map, tokenId), preimage).verify()
        expect(result.success, result.error).to.be.true

    });



    it('should fail when transferring token without Counter as an input', () => {


        // tx that deploying a Counter
        const tx2 = newTx(inputSatoshis);

        tx2.addOutput(new bsv.Transaction.Output({
            script: buildOpreturnScript("01"),
            satoshis: outputAmount
        }))

        map.set(tokenId, PubKeyHash(toHex(pkh)))


        let newLockingScript = pay2ContractHash.getNewStateScript({
            owners: map
        })

        // tx that transferstoken from Counter ContractHash to PubKeyHash
        const tx3 = new bsv.Transaction();
        tx3.addInputFromPrevTx(tx1)
        .addInputFromPrevTx(tx2)


        tx3.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage = getPreimage(tx3, pay2ContractHash.lockingScript, inputSatoshis, 0, Signature.SINGLE);

        pay2ContractHash.txContext = {
            tx: tx3,
            inputIndex,
            inputSatoshis
        }

        const result = pay2ContractHash.transferFrom(counterContractHash, PubKeyHash(toHex(pkh)), Sig('00'), PubKey(toHex(publicKey)), Bytes(tx3.prevouts()),
            Bytes(toHex(tx2)), 1 /**contractInputIndex */, getSortedItem(map, tokenId), preimage).verify()
        expect(result.success, result.error).to.be.false
    });

})
