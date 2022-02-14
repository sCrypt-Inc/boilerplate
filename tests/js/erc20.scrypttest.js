const { expect } = require('chai');
const { bsv, buildContractClass, getPreimage, toHex, signTx, SigHash, PubKey, buildTypeClasses, findKeyIndex } = require('scryptlib');
const { HashedMap } = require('scryptlib/dist/scryptTypes');
const { toHashedMap } = require('scryptlib/dist/utils');

const {
  inputIndex,
  inputSatoshis,
  newTx,
  DataLen,
  compileContract
} = require('../../helper');


const outputAmount = inputSatoshis

const privateKeyMinter = new bsv.PrivateKey.fromRandom('testnet');
const publicKeyMinter = privateKeyMinter.publicKey;
const publicKeyHashMinter = bsv.crypto.Hash.sha256ripemd160(publicKeyMinter.toBuffer());

const privateKeyReceiver = new bsv.PrivateKey.fromRandom('testnet');
const publicKeyReceiver = privateKeyReceiver.publicKey;
const publicKeyHashReceiver = bsv.crypto.Hash.sha256ripemd160(privateKeyReceiver.toBuffer());

const receiver = new PubKey(toHex(publicKeyReceiver));
const sender = new PubKey(toHex(publicKeyMinter));

describe('Test sCrypt contract Erc20 In Javascript', () => {
  

  let coin, preimage, result, map, erc20
  const Coin = buildContractClass(compileContract('erc20.scrypt'))
  const { ERC20 } = buildTypeClasses(Coin)
  before(() => {
    map = new Map();
    erc20 = new ERC20(0, toHashedMap(map));
    coin = new Coin(new PubKey(toHex(publicKeyMinter)), erc20)
  });


  
  const FIRST_MINT = 1000000000;
  it('should succeed when mint coin', () => {


    map.set(sender, FIRST_MINT)

    erc20._totalSupply = FIRST_MINT
    erc20.balances = toHashedMap(map)

    let newLockingScript = coin.getNewStateScript({
      liberc20: erc20
    })


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))


    preimage = getPreimage(tx, coin.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID)

    const sigMinter = signTx(tx, privateKeyMinter, coin.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID);

    // set txContext for verification
    coin.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    const keyIndex = findKeyIndex(map, sender);

    result = coin.mint(sender, sigMinter, 0, FIRST_MINT, keyIndex, preimage).verify()
    expect(result.success, result.error).to.be.true

    coin.liberc20 = erc20;
  });



  it('should succeed when transferFrom coin: 1000000 from Minter to Receiver ', () => {
    const amount = 1000000;

    const senderKeyIndex = findKeyIndex(map, sender);
    const senderBalance = FIRST_MINT;


    const receiverBalance = 0;

    map.set(receiver, receiverBalance + amount)
    map.set(sender, senderBalance - amount)

    const receiverKeyIndex = findKeyIndex(map, receiver);

    const erc20 = coin.liberc20.clone();
    erc20.balances = toHashedMap(map)
    let newLockingScript = coin.getNewStateScript({
      liberc20: erc20
    })


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))


    preimage = getPreimage(tx, coin.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID)

    const senderSig = signTx(tx, privateKeyMinter, coin.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID);

    // set txContext for verification
    coin.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }




    result = coin.transferFrom(sender, receiver, amount, senderSig, senderBalance, senderKeyIndex, receiverBalance, receiverKeyIndex, preimage).verify()
    expect(result.success, result.error).to.be.true

    coin.liberc20 = erc20;

  });



  it('should succeed when transferFrom coin: 50 from Receiver to Minter ', () => {
    const amount = 50;

    const senderKeyIndex = findKeyIndex(map, receiver);
    const senderBalance = 1000000;

    const receiverKeyIndex = findKeyIndex(map, sender);
    const receiverBalance = FIRST_MINT - 1000000;

    map.set(receiver, senderBalance - amount)
    map.set(sender, receiverBalance + amount)

    const erc20 = coin.liberc20.clone();
    erc20.balances = toHashedMap(map)
    let newLockingScript = coin.getNewStateScript({
      liberc20: erc20
    })


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))


    preimage = getPreimage(tx, coin.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID)

    const senderSig = signTx(tx, privateKeyReceiver, coin.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID);

    // set txContext for verification
    coin.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }




    result = coin.transferFrom(receiver, sender, amount, senderSig, senderBalance, senderKeyIndex, receiverBalance, receiverKeyIndex, preimage).verify()
    expect(result.success, result.error).to.be.true

    coin.liberc20 = erc20;
  });



  it('should fail when transferFrom coin: 1000000 from Receiver to Minter ', () => {
    const amount = 1000000;

    const senderKeyIndex = findKeyIndex(map, receiver);
    const senderBalance = 1000000 - 50;


    const receiverBalance = FIRST_MINT - 1000000 + 50;

    map.set(receiver, senderBalance - amount)
    map.set(sender, receiverBalance + amount)

    const receiverKeyIndex = findKeyIndex(map, sender);

    const erc20 = coin.liberc20.clone();
    erc20.balances = toHashedMap(map)
    let newLockingScript = coin.getNewStateScript({
      liberc20: erc20
    })


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))


    preimage = getPreimage(tx, coin.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID)

    const senderSig = signTx(tx, privateKeyReceiver, coin.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID);

    // set txContext for verification
    coin.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    result = coin.transferFrom(receiver, sender, amount, senderSig, senderBalance, senderKeyIndex, receiverBalance, receiverKeyIndex, preimage).verify()
    expect(result.success, result.error).to.be.false
  });


});