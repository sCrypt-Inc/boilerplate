const {
  bsv,
  buildContractClass,
  getPreimage,
  toHex,
  num2bin,
  SigHashPreimage,
  signTx,
  PubKey,
  Sig
} = require('scryptlib');
const {
  DataLen,
  loadDesc,
  createLockingTx,
  sendTx,
  showError
} = require('../helper');
const {
  privateKey
} = require('../privateKey');

(async () => {
  const privateKeyIssuer = new bsv.PrivateKey.fromRandom('testnet')
  const publicKeyIssuer = bsv.PublicKey.fromPrivateKey(privateKeyIssuer)
  const privateKeyReceiver1 = new bsv.PrivateKey.fromRandom('testnet')
  const publicKeyReceiver1 = bsv.PublicKey.fromPrivateKey(privateKeyReceiver1)
  const privateKeyReceiver2 = new bsv.PrivateKey.fromRandom('testnet')
  const publicKeyReceiver2 = bsv.PublicKey.fromPrivateKey(privateKeyReceiver2)
  const actionIssue = '00'
  const actionTransfer = '01'

  try {
    const NonFungibleToken = buildContractClass(loadDesc('nonFungibleToken_desc.json'))
    const token = new NonFungibleToken()

    // set token id start
    const uniqTokenId = 1;

    // append state as passive data part, initial uniqTokenId
    token.setDataPart(num2bin(uniqTokenId, DataLen) + toHex(publicKeyIssuer) + actionIssue)

    let inputSatoshis = 10000
    const FEE = inputSatoshis / 4
    let outputSatoshis = Math.floor((inputSatoshis - FEE) / 2)

    // lock fund to the script & issue the first token
    const lockingTx = await createLockingTx(privateKey.toAddress(), inputSatoshis, FEE)
    lockingTx.outputs[0].setScript(token.lockingScript)
    lockingTx.sign(privateKey)
    let lockingTxid = await sendTx(lockingTx)
    console.log('funding txid:      ', lockingTxid)

    // increment token ID and issue another new token
    let issueTxid, lockingScript0, lockingScript1 
    {
      const tx = new bsv.Transaction()
      tx.addInput(new bsv.Transaction.Input({
        prevTxId: lockingTxid,
        outputIndex: 0,
        script: ''
      }), token.lockingScript, inputSatoshis)

      // issue new token
      lockingScript0 = [token.codePart.toASM(), num2bin((uniqTokenId + 1), DataLen) + toHex(publicKeyIssuer) + actionIssue].join(' ')
      tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(lockingScript0),
        satoshis: outputSatoshis
      }))

      // transfer previous token to another receiver
      lockingScript1 = [token.codePart.toASM(), num2bin(uniqTokenId, DataLen) + toHex(publicKeyReceiver1) + actionTransfer].join(' ')
      tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(lockingScript1),
        satoshis: outputSatoshis
      }))

      const preimage = getPreimage(tx, token.lockingScript.toASM(), inputSatoshis)
      const sig1 = signTx(tx, privateKeyIssuer, token.lockingScript.toASM(), inputSatoshis)
      const unlockingScript = token.issue(
        new Sig(toHex(sig1)),
        new PubKey(toHex(publicKeyReceiver1)),
        outputSatoshis, outputSatoshis,
        new SigHashPreimage(toHex(preimage))
      ).toScript()
      tx.inputs[0].setScript(unlockingScript);
      issueTxid = await sendTx(tx);
      console.log('issue txid:       ', issueTxid)
    }


    inputSatoshis = outputSatoshis
    outputSatoshis -= FEE
    // transfer token to publicKeyReceiver2
    {
      const tx = new bsv.Transaction()
      tx.addInput(new bsv.Transaction.Input({
        prevTxId: issueTxid,
        outputIndex: 1,
        script: ''
      }), bsv.Script.fromASM(lockingScript1), inputSatoshis)

      const lockingScript2 = [token.codePart.toASM(), num2bin(uniqTokenId, DataLen) + toHex(publicKeyReceiver2) + actionTransfer].join(' ')

      tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(lockingScript2),
        satoshis: outputSatoshis
      }))

      const preimage = getPreimage(tx, lockingScript1, inputSatoshis, 0)
      const sig2 = signTx(tx, privateKeyReceiver1, lockingScript1, inputSatoshis, 0)
      const unlockingScript = token.transfer(
        new Sig(toHex(sig2)), new PubKey(toHex(publicKeyReceiver2)), outputSatoshis, new SigHashPreimage(toHex(preimage))
      ).toScript()
      tx.inputs[0].setScript(unlockingScript);
      const transferTxid = await sendTx(tx);
      console.log('transfer txid:       ', transferTxid)
    }

    console.log('Succeeded on testnet')
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
})()