const {
  bsv,
  buildContractClass,
  getPreimage,
  toHex,
  num2bin,
  Bytes,
  signTx,
  PubKey,
  SigHashPreimage,
  Sig
} = require('scryptlib');
const {
  DataLen,
  loadDesc,
  sendTx,
  reverseEndian,
  showError,
  deployContract
} = require('../helper');

(async () => {
  const privateKey1 = new bsv.PrivateKey.fromRandom('testnet')
  const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)
  const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')
  const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)
  const privateKey3 = new bsv.PrivateKey.fromRandom('testnet')
  const publicKey3 = bsv.PublicKey.fromPrivateKey(privateKey3)

  try {
    const Token = buildContractClass(loadDesc('tokenUtxo_debug_desc.json'))
    const token = new Token()

    // append state as passive data part
    // initial token supply 100: publicKey1 has 100, publicKey2 0
    token.setDataPart(toHex(publicKey1) + num2bin(10, DataLen) + num2bin(90, DataLen))

    let amount = 15000
    // lock fund to the script
    const lockingTx = await deployContract(token, amount)
    console.log('funding txid:      ', lockingTx.id)

    // split one UTXO of 100 tokens into one with 70 tokens and one with 30
    const splitTx = new bsv.Transaction();

    splitTx.addInputFromPrevTx(lockingTx)
      .setOutput(0, (tx) => {
        const newLockingScript = [token.codePart.toASM(), toHex(publicKey2) + num2bin(0, DataLen) + num2bin(70, DataLen)].join(' ')
        const newAmount = Math.floor((amount - tx.getEstimateFee()) /2)
        return new bsv.Transaction.Output({
          script: bsv.Script.fromASM(newLockingScript),
          satoshis: newAmount,
        })
      })
      .setOutput(1, (tx) => {
        const newLockingScript = [token.codePart.toASM(), toHex(publicKey3) + num2bin(0, DataLen) + num2bin(30, DataLen)].join(' ')
        const newAmount = Math.floor((amount - tx.getEstimateFee()) /2)
        return new bsv.Transaction.Output({
          script: bsv.Script.fromASM(newLockingScript),
          satoshis: newAmount,
        })
      })
      .setInputScript(0, (tx, output) => {
        const preimage = getPreimage(tx, output.script, output.satoshis)
        const sig1 = signTx(tx, privateKey1, output.script, output.satoshis)
        const newAmount = Math.floor((amount - tx.getEstimateFee()) /2)
        return token.split(
          new Sig(toHex(sig1)),
          new PubKey(toHex(publicKey2)),
          70,
          newAmount,
          new PubKey(toHex(publicKey3)),
          30,
          newAmount,
          new SigHashPreimage(toHex(preimage))
        ).toScript()
      })
      .seal()

    const splitTxid = await sendTx(splitTx);
    console.log('split txid:       ', splitTxid)


    // merge one UTXO with 70 tokens and one with 30 into a single UTXO of 100 tokens

    const mergeTx = new bsv.Transaction();

    mergeTx.addInputFromPrevTx(splitTx, 0)
      .addInputFromPrevTx(splitTx, 1)
      .setOutput(0, (tx) => {
        const newLockingScript = [token.codePart.toASM(), toHex(publicKey1) + num2bin(70, DataLen) + num2bin(30, DataLen)].join(' ')
        const newAmount = tx.inputAmount - tx.getEstimateFee()
        return new bsv.Transaction.Output({
          script: bsv.Script.fromASM(newLockingScript),
          satoshis: newAmount,
        })
      })
      .setInputScript(0, (tx, output) => {
        // use reversed txid in outpoint
        const txHash = reverseEndian(splitTxid)
        const prevouts = txHash + num2bin(0, 4) + txHash + num2bin(1, 4)
        const preimage = getPreimage(tx, output.script, output.satoshis, 0)
        const sig2 = signTx(tx, privateKey2, output.script, output.satoshis, 0)
        const newAmount = tx.inputAmount - tx.getEstimateFee()
        return token.merge(
          new Sig(toHex(sig2)),
          new PubKey(toHex(publicKey1)),
          new Bytes(prevouts), 30, newAmount,
          new SigHashPreimage(toHex(preimage))
        ).toScript()
      })
      .setInputScript(1, (tx, output) => {
        // use reversed txid in outpoint
        const txHash = reverseEndian(splitTxid)
        const prevouts = txHash + num2bin(0, 4) + txHash + num2bin(1, 4)
        const preimage = getPreimage(tx, output.script, output.satoshis, 1)
        const sig3 = signTx(tx, privateKey3, output.script, output.satoshis, 1)
        const newAmount = tx.inputAmount - tx.getEstimateFee()
        return token.merge(
          new Sig(toHex(sig3)),
          new PubKey(toHex(publicKey1)),
          new Bytes(prevouts), 70, newAmount,
          new SigHashPreimage(toHex(preimage))
        ).toScript()
      })
      .seal()

    const mergeTxid = await sendTx(mergeTx);
    console.log('merge txid:       ', mergeTxid)

    console.log('Succeeded on testnet')
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
})()