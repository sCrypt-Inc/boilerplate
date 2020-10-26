/**
 * This is an implementation and sample usage of SuperAsset (SA10).
 *
 * Learn more:
 *  - Announcement: https://blog.matterpool.io/launch-of-superasset-sa10-nft-smart-contract-for-bitcoin/
 *  - SuperAsset white paper: https://bitcoinfiles.org/t/d6c18189966ea060452bcf59157235f2e15df3abf7383d9d450acff69cf29181
 *  - Github: https://github.com/MatterPool/superasset-js
 * Example transactions:
 *  - Deploy: https://whatsonchain.com/tx/afd702c8ccd5b3193f7be0afaace551430593b2e1af7264908e003f63bd5883f
 *  - Transfer (mint with JSON paylod update): https://whatsonchain.com/tx/9a731acb3ef5af7ec97a14725f481aa9cac69beba7567c596e155cd1993f2905
 *  - Transfer (Update with hex payload): https://whatsonchain.com/tx/b402d74aced39ef78489977b6dff0baadb0756f3f7a09de30af3fc9b7ff579a7
 *  - Transfer (Update with empty payload): https://whatsonchain.com/tx/e2253ec3f66f23b21726eae65f93d1a002e12413dceb7809ee7423a4794bc328
 *  - Melt: https://whatsonchain.com/tx/24e81130d115a67975c4558c3a617e0fdcb1def9126f8748b7c1072b0430e9b0
 */
const {
  bsv,
  buildContractClass,
  getPreimage,
  toHex,
  Bytes,
  signTx,
  PubKey,
  Sig,
  Ripemd160,
  SigHash
} = require('scryptlib');
const {
  loadDesc,
  createLockingTx,
  sendTx,
  fetchUtxoLargeThan,
  unlockP2PKHInput
} = require('../helper');
const Signature = bsv.crypto.Signature;

const sleeper = async(seconds) => {
  return new Promise((resolve) => {
     setTimeout(() => {
        resolve();
     }, seconds * 1000);
  })
}

(async () => {

// DO NOT USE FOR REAL BITCOIN TRANSACTIONS. THE FUNDS WILL BE STOLEN.
// REPLACE with your own private keys

// Generate your own private keys (Ex: https://console.matterpool.io/tools)
// And fund the addresses for them.
const privateKey1= new bsv.PrivateKey('yourwifkey1');
const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)
console.log('privateKey1', privateKey1, publicKey1, publicKey1.toAddress().toString());

const privateKey2 = new bsv.PrivateKey('yourwifkey2')
const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)
console.log('privateKey2', privateKey2, publicKey2, publicKey2.toAddress().toString());

// BEGIN
// Step 1: Deploy contract
// Step 2: Transfer and update it
// Step 3: Melt it back to plain satoshi (p2pkh)
try {
  const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID;
  // Instantiate a SuperAsset10 NFT asset from the compiled constract
  const Token = buildContractClass(loadDesc('SuperAsset10_desc.json'))
  const token = new Token();
  // Todo: Replace with optimized checkPreimage (will not affect functionality)
  // const asmVars = {'Tx.checkPreimageOpt_.sigHashType': sighashType.toString() } // '41'} // FORKID | ALL
  // token.replaceAsmVars(asmVars);

  // -----------------------------------------------------
  // Step 1: Deploy NFT with initial owner and satoshis value of 2650 (Lower than this may hit dust limit)
  let assetId = null;
  const nftSatoshiValue = 2650;
  const FEE = 3000;
  const lockingTx = await createLockingTx(privateKey1.toAddress(), nftSatoshiValue, FEE)
  const initialState =  ' OP_RETURN ' + '000000000000000000000000000000000000000000000000000000000000000000000000 ' + toHex(publicKey1);
  const initialLockingScript = bsv.Script.fromASM(token.lockingScript.toASM() + initialState);
  lockingTx.outputs[0].setScript(initialLockingScript);
  lockingTx.sign(privateKey1)
  const lockingTxid = await sendTx(lockingTx)
  console.log('Step 1 complete. Deployment Tx: ', lockingTxid)
  console.log('assetId: ', assetId);
  // -----------------------------------------------------
  // Step 2: Update NFT with payload
  let newLockingScript = null;
  let transferTx = null;
  {
    const prevLockingScript = initialLockingScript;
    console.log('Preparing first transfer update...');
    assetId = Buffer.from(lockingTxid, 'hex').reverse().toString('hex') + '00000000'; // 0th output. Use full outpoint for identifier
    const pushDataPayload = Buffer.from(`{ "hello": "world" }`, 'utf8').toString('hex');
    const newState = ' ' + assetId + ' ' + toHex(publicKey1) + ' ' + pushDataPayload;
    newLockingScript = bsv.Script.fromASM(token.codePart.toASM() + newState);
    const tx = new bsv.Transaction()
    const utxo = await fetchUtxoLargeThan(privateKey2.toAddress(), 20000);
    // Add input is the NFT
    token.setDataPart(newState);
    tx.addInput(new bsv.Transaction.Input({
      prevTxId: lockingTxid,
      outputIndex: 0,
      script: ''
    }), initialLockingScript, nftSatoshiValue);
    // Add funding input
    tx.addInput(new bsv.Transaction.Input({
      prevTxId: utxo.txId,
      outputIndex: utxo.outputIndex,
      script: ''
    }), utxo.script, utxo.satoshis);
    console.log('tx', tx.toString());
    changeSatoshis = utxo.satoshis - FEE;
    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: nftSatoshiValue
    }))
    const changeOutputScript = bsv.Script.buildPublicKeyHashOut(publicKey2)
    tx.addOutput(new bsv.Transaction.Output({
      script: changeOutputScript,
      satoshis: changeSatoshis
    }))
    const preimage = getPreimage(tx, prevLockingScript.toASM(), nftSatoshiValue, 0, sighashType)
    const sig = signTx(tx, privateKey1, prevLockingScript.toASM(), nftSatoshiValue, 0, sighashType)
    // Use for debugging, with launch.json
    // console.log('preimagehex', preimage.toJSON(), 'preimagejson', preimage.toString(), 'signature', toHex(sig));
    const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey2.toBuffer())
    const changeAddress = toHex(pkh) // Needs to be unprefixed address
    const unlockingScript = token.transfer(
      new Sig(toHex(sig)),
      new PubKey(toHex(publicKey1)),
      preimage,
      new Ripemd160(changeAddress),
      changeSatoshis,
      new Bytes(pushDataPayload)
    ).toScript()
    tx.inputs[0].setScript(unlockingScript)
    unlockP2PKHInput(privateKey2, tx, 1, Signature.SIGHASH_ALL | Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_FORKID);
    console.log('About to broadcast...', tx.toString());
    transferTx = await sendTx(tx)
    console.log('Step 2 complete. Transfer Tx: ', transferTx)
    console.log('assetId: ', assetId);
  }

  // -----------------------------------------------------
  // Step 3: Melt NFT'
  {
    await sleeper(10);
    console.log('Preparing melt...');
    const tx = new bsv.Transaction()
    const utxo = await fetchUtxoLargeThan(privateKey2.toAddress(), 20000);
    // Add input is the NFT
    tx.addInput(new bsv.Transaction.Input({
      prevTxId: transferTx,
      outputIndex: 0,
      script: ''
    }), newLockingScript, nftSatoshiValue);
    // Add funding input
    tx.addInput(new bsv.Transaction.Input({
      prevTxId: utxo.txId,
      outputIndex: utxo.outputIndex,
      script: ''
    }), utxo.script, utxo.satoshis);
    changeSatoshis = utxo.satoshis - FEE;

    const changeOutputScriptRedeem = bsv.Script.buildPublicKeyHashOut(publicKey2)
    tx.addOutput(new bsv.Transaction.Output({
      script: changeOutputScriptRedeem,
      satoshis: nftSatoshiValue
    }))

    const changeOutputScript = bsv.Script.buildPublicKeyHashOut(publicKey2)
    tx.addOutput(new bsv.Transaction.Output({
      script: changeOutputScript,
      satoshis: changeSatoshis
    }))
    const preimage = getPreimage(tx, newLockingScript.toASM(), nftSatoshiValue, 0, sighashType)
    const sig = signTx(tx, privateKey1, newLockingScript.toASM(), nftSatoshiValue, 0, sighashType)
    // console.log('preimagehex', preimage.toJSON(), 'preimagejson', preimage.toString(), 'signature', toHex(sig));
    const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey2.toBuffer())
    const changeAddress = toHex(pkh) // Needs to be unprefixed address
    const recpkh = bsv.crypto.Hash.sha256ripemd160(publicKey2.toBuffer());
    const recAddress = toHex(recpkh)

    const unlockingScript = token.melt(
      new Sig(toHex(sig)),
      new Ripemd160(recAddress),
      preimage,
      new Ripemd160(changeAddress),
      changeSatoshis).toScript();

    tx.inputs[0].setScript(unlockingScript)
    unlockP2PKHInput(privateKey2, tx, 1, Signature.SIGHASH_ALL | Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_FORKID);
    console.log('About to broadcast...', tx.toString());
    let meltTx = await sendTx(tx)
    console.log('Step 3 complete. Melt Tx: ', meltTx)
    console.log('assetId (melted): ', assetId);
  }
  console.log('Success.')
} catch (error) {
  console.log('Failure.', error)
}

})()

