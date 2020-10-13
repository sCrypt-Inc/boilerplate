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
  createUnlockingTx,
  createLockingTx,
  sendTx,
  showError
} = require('../helper');
const {
  privateKey
} = require('../privateKey');

(async () => {
  const privateKey1 = new bsv.PrivateKey.fromRandom('testnet')
  const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)
  const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')
  const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)

  try {
    const Token = buildContractClass(loadDesc('token_desc.json'))
    const token = new Token()

    // append state as passive data part
    // initial token supply 100: publicKey1 has 100, publicKey2 0
    token.setDataPart(toHex(publicKey1) + num2bin(100, DataLen) + toHex(publicKey2) + num2bin(0, DataLen))

    let amount = 10000
    const FEE = amount / 10

    // lock fund to the script
    const lockingTx = await createLockingTx(privateKey.toAddress(), amount)
    lockingTx.outputs[0].setScript(token.lockingScript)
    lockingTx.sign(privateKey)
    let lockingTxid = await sendTx(lockingTx)
    console.log('funding txid:      ', lockingTxid)

    // transfer 40 tokens from publicKey1 to publicKey2
    {
      const prevLockingScript = token.lockingScript

      // update data state
      token.setDataPart(toHex(publicKey1) + num2bin(60, DataLen) + toHex(publicKey2) + num2bin(40, DataLen))

      const newLockingScriptASM = token.lockingScript.toASM()
      const newAmount = amount - FEE

      const unlockScriptTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript.toASM(), newAmount, newLockingScriptASM)

      // call contract method to get unlocking script
      const preimage = getPreimage(unlockScriptTx, prevLockingScript.toASM(), amount)
      const sig1 = signTx(unlockScriptTx, privateKey1, prevLockingScript.toASM(), amount)
      const unlockingScript = token.transfer(
        new PubKey(toHex(publicKey1)),
        new Sig(toHex(sig1)),
        new PubKey(toHex(publicKey2)),
        40,
        new SigHashPreimage(toHex(preimage)),
        newAmount
      ).toScript()

      // set unlocking script
      unlockScriptTx.inputs[0].setScript(unlockingScript)

      lockingTxid = await sendTx(unlockScriptTx)
      console.log('transfer txid1:    ', lockingTxid)

      amount = newAmount
    }

    // transfer 10 tokens from publicKey2 to publicKey1
    {
      const prevLockingScript = token.lockingScript

      // update data state
      token.setDataPart(toHex(publicKey1) + num2bin(70, DataLen) + toHex(publicKey2) + num2bin(30, DataLen))

      const newLockingScriptASM = token.lockingScript.toASM()
      const newAmount = amount - FEE

      const unlockScriptTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript.toASM(), newAmount, newLockingScriptASM)

      // call contract method to get unlocking script
      const preimage = getPreimage(unlockScriptTx, prevLockingScript.toASM(), amount)
      const sig2 = signTx(unlockScriptTx, privateKey2, prevLockingScript.toASM(), amount)
      const unlockingScript = token.transfer(
        new PubKey(toHex(publicKey2)),
        new Sig(toHex(sig2)),
        new PubKey(toHex(publicKey1)),
        10,
        new SigHashPreimage(toHex(preimage)),
        newAmount
      ).toScript()

      // set unlocking script
      unlockScriptTx.inputs[0].setScript(unlockingScript)

      lockingTxid = await sendTx(unlockScriptTx)
      console.log('transfer txid2:    ', lockingTxid)
    }

    console.log('Succeeded on testnet')
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
})()