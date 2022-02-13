const {
  buildContractClass, Bytes, Sig, SigHashPreimage, bsv, toHex, getPreimage, buildTypeClasses, SigHash, PubKeyHash, PubKey
} = require('scryptlib');

const {
  toHashedMap,
  findKeyIndex,
  hash160,
  signTx
} = require('scryptlib/dist/utils');
const {
  loadDesc,
  showError,
  fetchUtxos,
  createInputFromPrevTx,
  sendTx,
  deployContract,
  sleep
} = require('../helper');
const {
  privateKey
} = require('../privateKey');

// initial contract funding
let amount = 10000

const pubKey = new PubKey(toHex(privateKey.publicKey))
const pkh = new PubKeyHash(toHex(bsv.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer())))

let map = new Map();

const tokenId = 111;
map.set(tokenId, pkh)


async function transferToContractHash(pay2ContractHash, prevTx, contractHash) {

  map.set(tokenId, contractHash)
  let newLockingScript = pay2ContractHash.getNewStateScript({
    owners: toHashedMap(map)
  })
  const unlockingTx = new bsv.Transaction();

  unlockingTx
    .addInput(createInputFromPrevTx(prevTx))
    .addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: amount,
    }))
    .setInputScript(0, (tx, output) => {

      const preimage = getPreimage(tx, output.script, output.satoshis, 0, SigHash.SINGLE_FORKID);

      const fromSig = signTx(tx, privateKey, output.script, output.satoshis, 0, SigHash.SINGLE_FORKID);

      return pay2ContractHash.transferFrom(pkh, contractHash, fromSig, pubKey, new Bytes(''),
        new Bytes(''), 0, tokenId, findKeyIndex(map, tokenId), preimage)
        .toScript();
    })
    .from(await fetchUtxos(privateKey.toAddress()))
    .change(privateKey.toAddress())
    .sign(privateKey)
    .seal()

  console.log('start transfering token from PubKeyHash to ContractHash ...');
  await sendTx(unlockingTx)
  //update state
  pay2ContractHash.owners = toHashedMap(map)

  console.log('transfering token from PubKeyHash to ContractHash txid:   ', unlockingTx.id);

  return unlockingTx
}



async function transferToPubKeyHash(pay2ContractHash, prevTx, advCounter, advCounterTx, contractHash) {

  map.set(tokenId, pkh)

  let newLockingScriptOfPay2ContractHash = pay2ContractHash.getNewStateScript({
    owners: toHashedMap(map)
  })

  let newLockingScriptOfAdvCounter = advCounter.getNewStateScript({ counter: 1 })

  const unlockingTx = new bsv.Transaction();

  unlockingTx
    .addInput(createInputFromPrevTx(prevTx))
    .addInput(createInputFromPrevTx(advCounterTx))
    .from(await fetchUtxos(privateKey.toAddress()))
    .change(privateKey.toAddress())
    .addOutput(new bsv.Transaction.Output({
      script: newLockingScriptOfPay2ContractHash,
      satoshis: amount,
    }))
    .addOutput(new bsv.Transaction.Output({
      script: newLockingScriptOfAdvCounter,
      satoshis: amount,
    }))
    .setInputScript(0, (tx, output) => {

      const preimage = getPreimage(tx, output.script, output.satoshis, 0, SigHash.SINGLE_FORKID);

      const fromSig = new Sig('00');

      return pay2ContractHash.transferFrom(contractHash, pkh, fromSig, pubKey, new Bytes(tx.prevouts()),
        new Bytes(toHex(advCounterTx)), 1 /**contractInputIndex */, tokenId, findKeyIndex(map, tokenId), preimage)
        .toScript();

    })
    .setInputScript(1, (tx, output) => {

      const preimage = getPreimage(
        tx,
        output.script,
        output.satoshis,
        1,
        SigHash.ANYONECANPAY_SINGLE_FORKID
      );

      return advCounter
        .increment(new SigHashPreimage(toHex(preimage)))
        .toScript();
    })
    .sign(privateKey)
    .seal()

  console.log('start transfering token from ContractHash to PubKeyHash ...');
  await sendTx(unlockingTx)

  console.log('transfering token from  ContractHash to PubKeyHash txid:   ', unlockingTx.id);

  return unlockingTx
}


(async () => {
  try {

    const Signature = bsv.crypto.Signature
    const Pay2ContractHash = buildContractClass(loadDesc('pay2ContractHash_debug_desc.json'))
    const AdvancedCounter = buildContractClass(loadDesc('advancedCounter_debug_desc.json'))
    const advCounter = new AdvancedCounter(0)

    const pay2ContractHash = new Pay2ContractHash(toHashedMap(map));

    const advCounterContractHash = new PubKeyHash(hash160(advCounter.lockingScript.toHex()));

    // lock funds to the script
    const lockingTxAdvCounter = await deployContract(advCounter, amount);
    console.log('deploying AdvancedCounter txid:      ', lockingTxAdvCounter.id);

    await sleep(6)
    const lockingTxPay2ContractHash = await deployContract(pay2ContractHash, amount);
    console.log('deploying pay2ContractHash txid:      ', lockingTxPay2ContractHash.id);
    await sleep(6)
    const transferTx1 = await transferToContractHash(pay2ContractHash, lockingTxPay2ContractHash, advCounterContractHash)

    await sleep(6)
    await transferToPubKeyHash(pay2ContractHash, transferTx1, advCounter, lockingTxAdvCounter, advCounterContractHash)

    console.log('Succeeded on testnet')
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
})()