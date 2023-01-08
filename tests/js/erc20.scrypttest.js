const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, signTx, PubKey, getSortedItem } = require('scryptlib');

const {
  inputIndex,
  inputSatoshis,
  newTx,
  compileContract
} = require('../../helper');

const Signature = bsv.crypto.Signature

const outputAmount = inputSatoshis

const privateKeyMinter = bsv.PrivateKey.fromRandom('testnet');
const publicKeyMinter = privateKeyMinter.publicKey;
const publicKeyHashMinter = bsv.crypto.Hash.sha256ripemd160(publicKeyMinter.toBuffer());

const privateKeyReceiver = bsv.PrivateKey.fromRandom('testnet');
const publicKeyReceiver = privateKeyReceiver.publicKey;
const publicKeyHashReceiver = bsv.crypto.Hash.sha256ripemd160(privateKeyReceiver.toBuffer());

const receiver = PubKey(toHex(publicKeyReceiver));
const sender = PubKey(toHex(publicKeyMinter));

describe('Test sCrypt contract Erc20 In Javascript', () => {
  

  let coin, preimage, result, map, erc20, Coin

  before(() => {
    Coin = buildContractClass(compileContract('erc20.scrypt'))
    map = new Map();
    erc20 = [0n, map];
    coin = new Coin(PubKey(toHex(publicKeyMinter)), erc20)
  });


  
  const FIRST_MINT = 1000000000n;
  it('should succeed when mint coin', () => {


    map.set(sender, FIRST_MINT)

    const liberc20 = {
      _totalSupply: FIRST_MINT,
      balances: map
    }

    let newLockingScript = coin.getNewStateScript({
      liberc20: liberc20
    })


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))


    preimage = getPreimage(tx, coin.lockingScript, inputSatoshis, 0, Signature.SINGLE)

    const sigMinter = signTx(tx, privateKeyMinter, coin.lockingScript, inputSatoshis, 0, Signature.SINGLE);

    // set txContext for verification
    coin.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    result = coin.mint(getSortedItem(map, sender), sigMinter, 0n, FIRST_MINT, preimage).verify()
    expect(result.success, result.error).to.be.true

    coin.liberc20 = liberc20;
  });



  it('should succeed when transferFrom coin: 1000000 from Minter to Receiver ', () => {
    const amount = 1000000n;

    const senderKey = getSortedItem(map, sender);
    const senderBalance = FIRST_MINT;


    const receiverBalance = 0n;

    map.set(receiver, receiverBalance + amount)
    map.set(sender, senderBalance - amount)

    const receiverKey = getSortedItem(map, receiver);


    const liberc20 = {
      _totalSupply: coin.liberc20._totalSupply,
      balances: map
    }


    let newLockingScript = coin.getNewStateScript({
      liberc20: liberc20
    })


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))


    preimage = getPreimage(tx, coin.lockingScript, inputSatoshis, 0, Signature.SINGLE)

    const senderSig = signTx(tx, privateKeyMinter, coin.lockingScript, inputSatoshis, 0, Signature.SINGLE);

    // set txContext for verification
    coin.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }




    result = coin.transferFrom(senderKey, receiverKey, amount, senderSig, senderBalance, receiverBalance, preimage).verify()
    expect(result.success, result.error).to.be.true

    coin.liberc20 = liberc20;

  });



  it('should succeed when transferFrom coin: 50 from Receiver to Minter ', () => {
    const amount = 50n;

    const senderKey = getSortedItem(map, receiver);
    const senderBalance = 1000000n;

    const receiverKey = getSortedItem(map, sender);
    const receiverBalance = FIRST_MINT - 1000000n;

    map.set(receiver, senderBalance - amount)
    map.set(sender, receiverBalance + amount)


    const liberc20 = {
      _totalSupply: coin.liberc20._totalSupply,
      balances: map
    }


    let newLockingScript = coin.getNewStateScript({
      liberc20: liberc20
    })


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))


    preimage = getPreimage(tx, coin.lockingScript, inputSatoshis, 0, Signature.SINGLE)

    const senderSig = signTx(tx, privateKeyReceiver, coin.lockingScript, inputSatoshis, 0, Signature.SINGLE);

    // set txContext for verification
    coin.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }




    result = coin.transferFrom(senderKey, receiverKey, amount, senderSig, senderBalance, receiverBalance, preimage).verify()
    expect(result.success, result.error).to.be.true

    coin.liberc20 = liberc20;
  });



  it('should fail when transferFrom coin: 1000000 from Receiver to Minter ', () => {
    const amount = 1000000n;

    const senderKey = getSortedItem(map, receiver);
    const senderBalance = 1000000n - 50n;


    const receiverBalance = FIRST_MINT - 1000000n + 50n;

    map.set(receiver, senderBalance - amount)
    map.set(sender, receiverBalance + amount)

    const receiverKey = getSortedItem(map, sender);

    const liberc20 = {
      _totalSupply: coin.liberc20._totalSupply,
      balances: map
    }

    let newLockingScript = coin.getNewStateScript({
      liberc20: liberc20
    })


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))


    preimage = getPreimage(tx, coin.lockingScript, inputSatoshis, 0, Signature.SINGLE)

    const senderSig = signTx(tx, privateKeyReceiver, coin.lockingScript, inputSatoshis, 0, Signature.SINGLE);

    // set txContext for verification
    coin.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    result = coin.transferFrom(senderKey, receiverKey, amount, senderSig, senderBalance, receiverBalance, preimage).verify()
    expect(result.success, result.error).to.be.false
  });


});