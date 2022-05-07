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
  createInputFromPrevTx,
  deployContract,
  sendTx,
  showError,
  compileContract
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
    const NonFungibleToken = buildContractClass(compileContract('nonFungibleToken.scrypt'))
    const token = new NonFungibleToken()

    // set token id start
    const uniqTokenId = 1;

    // append state as passive data part, initial uniqTokenId
    token.setDataPart(num2bin(uniqTokenId, DataLen) + toHex(publicKeyIssuer) + actionIssue)

    const amount = 18000

    // deploy contract on testnet
    const lockingTx = await deployContract(token, amount);
    console.log('locking txid:     ', lockingTx.id)

    const issueTx = new bsv.Transaction()

    issueTx.addInput(createInputFromPrevTx(lockingTx))
      .setOutput(0, (tx) => {

        // issue new token
        const newLockingScript = [token.codePart.toASM(), num2bin((uniqTokenId + 1), DataLen)
          + toHex(publicKeyIssuer) + actionIssue].join(' ')

        return new bsv.Transaction.Output({
          script: bsv.Script.fromASM(newLockingScript),
          satoshis: Math.floor((amount - tx.getEstimateFee()) / 2)
        })
      })
      .setOutput(1, (tx) => {

        // transfer previous token to another receiver
        const newLockingScript = [token.codePart.toASM(), num2bin(uniqTokenId, DataLen)
          + toHex(publicKeyReceiver1) + actionTransfer].join(' ')

        return new bsv.Transaction.Output({
          script: bsv.Script.fromASM(newLockingScript),
          satoshis: Math.floor((amount - tx.getEstimateFee()) / 2)
        })
      })
      .setInputScript(0, (tx, output) => {
        const preimage = getPreimage(tx, output.script, output.satoshis)
        const sig = signTx(tx, privateKeyIssuer, output.script, output.satoshis)
        const outputSatoshis = Math.floor((amount - tx.getEstimateFee()) / 2)
        return token.issue(
          sig,
          new PubKey(toHex(publicKeyReceiver1)),
          outputSatoshis, outputSatoshis,
          new SigHashPreimage(toHex(preimage))
        ).toScript()
      })
      .seal()


    const issueTxid = await sendTx(issueTx);
    console.log('issue txid: ', issueTxid)


    const issueTxAmount = issueTx.outputs[0].satoshis;

    const transferTx = new bsv.Transaction()

    transferTx.addInput(createInputFromPrevTx(issueTx, 1))
    .setOutput(0, (tx) => {

      // transfer token to publicKeyReceiver2
      const newLockingScript =  [token.codePart.toASM(), num2bin(uniqTokenId, DataLen) 
        + toHex(publicKeyReceiver2) + actionTransfer].join(' ')

      return new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript),
        satoshis: issueTxAmount - tx.getEstimateFee()
      })
    })
    .setInputScript(0, (tx, output) => {
      const preimage = getPreimage(tx, output.script, output.satoshis)
      const sig = signTx(tx, privateKeyReceiver1, output.script, output.satoshis)
      const newAmount = issueTxAmount - tx.getEstimateFee()
      return token.transfer(
        sig, new PubKey(toHex(publicKeyReceiver2)), newAmount, preimage
      ).toScript()
    })
    .seal()

    const transferTxid = await sendTx(transferTx);
    console.log('transfer txid: ', transferTxid)

    console.log('Succeeded on testnet')
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
})()