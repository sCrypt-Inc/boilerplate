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
  sendTx,
  sleep,
  deployContract,
  fetchUtxos,
  showError
} = require('../helper');
const Signature = bsv.crypto.Signature;
const { privateKey, privateKey2 } = require('../privateKey');


(async () => {

  // DO NOT USE FOR REAL BITCOIN TRANSACTIONS. THE FUNDS WILL BE STOLEN.
  // REPLACE with your own private keys

  // Generate your own private keys (Ex: https://console.matterpool.io/tools)
  // And fund the addresses for them.
  const publicKey = bsv.PublicKey.fromPrivateKey(privateKey)

  const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)

  // BEGIN
  // Step 1: Deploy contract
  // Step 2: Transfer and update it
  // Step 3: Melt it back to plain satoshi (p2pkh)
  try {
    const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID;
    // Instantiate a SuperAsset10 NFT asset from the compiled constract
    const Token = buildContractClass(loadDesc('SuperAsset10_debug_desc.json'))
    const token = new Token();
    // Todo: Replace with optimized checkPreimage (will not affect functionality)
    // const asmVars = {'Tx.checkPreimageOpt_.sigHashType': sighashType.toString() } // '41'} // FORKID | ALL
    // token.replaceAsmVars(asmVars);

    // -----------------------------------------------------
    // Step 1: Deploy NFT with initial owner and satoshis value of 2650 (Lower than this may hit dust limit)
    let assetId = null;
    const nftSatoshiValue = 2650;
    const initialState = '000000000000000000000000000000000000000000000000000000000000000000000000 ' + toHex(publicKey);
    token.setDataPart(initialState)
    const lockingTx = await deployContract(token, nftSatoshiValue)

    console.log('Step 1 complete. Deployment Tx: ', lockingTx.id)
    console.log('assetId: ', assetId);
    // -----------------------------------------------------
    // Step 2: Update NFT with payload


    console.log('Preparing first transfer update...');
    assetId = Buffer.from(lockingTx.id, 'hex').reverse().toString('hex') + '00000000'; // 0th output. Use full outpoint for identifier
    const pushDataPayload = Buffer.from(`{ "hello": "world" }`, 'utf8').toString('hex');
    const newState = ' ' + assetId + ' ' + toHex(publicKey) + ' ' + pushDataPayload;

    await sleep(6);
    const transferTx = new bsv.Transaction()
    // Add input is the NFT

    transferTx.addInputFromPrevTx(lockingTx)
      // Add funding input
      .from(await fetchUtxos(privateKey.toAddress()))
      .setOutput(0, (_) => {
        const newLockingScript = bsv.Script.fromASM(token.codePart.toASM() + newState);
        return new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: nftSatoshiValue
        })
      })
      .change(publicKey2.toAddress())
      .setInputScript(0, (tx, output) => {
        const preimage = getPreimage(tx, output.script, output.satoshis, 0, sighashType)
        const sig = signTx(tx, privateKey, output.script, output.satoshis, 0, sighashType)
        // Use for debugging, with launch.json
        // console.log('preimagehex', preimage.toJSON(), 'preimagejson', preimage.toString(), 'signature', toHex(sig));
        const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey2.toBuffer())
        const changeAddress = toHex(pkh) // Needs to be unprefixed address

        return token.transfer(
          new Sig(toHex(sig)),
          new PubKey(toHex(publicKey)),
          preimage,
          new Ripemd160(changeAddress),
          tx.getChangeAmount(),
          new Bytes(pushDataPayload)
        ).toScript()
      })
      .sign(privateKey)
      .seal()

    await sendTx(transferTx)
    console.log('Step 2 complete. Transfer Tx: ', transferTx.id)
    console.log('assetId: ', assetId);

    token.setDataPart(newState);
    // -----------------------------------------------------
    // Step 3: Melt NFT'

    await sleep(10);
    console.log('Preparing melt...');

    const meltTx = new bsv.Transaction()
    // Add input is the NFT

    meltTx.addInputFromPrevTx(transferTx)
      // Add funding input
      .from(await fetchUtxos(privateKey.toAddress()))
      .setOutput(0, (_) => {
        const changeOutputScriptRedeem = bsv.Script.buildPublicKeyHashOut(publicKey2)
        return new bsv.Transaction.Output({
          script: changeOutputScriptRedeem,
          satoshis: nftSatoshiValue
        })
      })
      .change(publicKey2.toAddress())
      .setInputScript(0, (tx, output) => {
        const preimage = getPreimage(tx, output.script, output.satoshis, 0, sighashType)
        const sig = signTx(tx, privateKey, output.script, output.satoshis, 0, sighashType)
        // console.log('preimagehex', preimage.toJSON(), 'preimagejson', preimage.toString(), 'signature', toHex(sig));
        const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey2.toBuffer())
        const changeAddress = toHex(pkh) // Needs to be unprefixed address
        const recpkh = bsv.crypto.Hash.sha256ripemd160(publicKey2.toBuffer());
        const recAddress = toHex(recpkh)

        return token.melt(
          new Sig(toHex(sig)),
          new Ripemd160(recAddress),
          preimage,
          new Ripemd160(changeAddress),
          tx.getChangeAmount()).toScript();
      })
      .sign(privateKey2)
      .seal()


    await sendTx(meltTx)
    console.log('Step 3 complete. Melt Tx: ', meltTx.id)
    console.log('assetId (melted): ', assetId);

    console.log('Succeeded on testnet')
  } catch (error) {
    console.log('Failed on testnet')
    console.log(error.stack)
    showError(error)
  }

})()

