const {
  bsv,
  buildContractClass,
  getPreimage,
  toHex,
  num2bin,
  SigHashPreimage,
  signTx,
  PubKey,
  Sig,
  buildTypeClasses
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
    const desc = loadDesc('token_debug_desc.json');
    const Token = buildContractClass(desc);
    const {Account} = buildTypeClasses(desc)


    const token = new Token([new Account({
      pubKey: new PubKey(toHex(publicKey1)),
      balance: 100
    }), new Account({
      pubKey: new PubKey(toHex(publicKey2)),
      balance: 0
    })])


    let amount = 11000
    const FEE = 5000;

    // lock fund to the script
    const lockingTx = await createLockingTx(privateKey.toAddress(), amount, token.lockingScript)
    lockingTx.sign(privateKey)
    let lockingTxid = await sendTx(lockingTx)
    console.log('funding txid:      ', lockingTxid)

    // transfer 40 tokens from publicKey1 to publicKey2
    {
      const prevLockingScript = token.lockingScript

      // update data state
  

      const newLockingScript = token.getNewStateScript({
        accounts: [new Account({
          pubKey: new PubKey(toHex(publicKey1)),
          balance: 60
        }), new Account({
          pubKey: new PubKey(toHex(publicKey2)),
          balance: 40
        })]
      })


      const newAmount = amount - FEE

      const unlockScriptTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript, newAmount, newLockingScript)

      // call contract method to get unlocking script
      const preimage = getPreimage(unlockScriptTx, prevLockingScript, amount)
      const sig1 = signTx(unlockScriptTx, privateKey1, prevLockingScript, amount)
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

      token.accounts =  [new Account({
        pubKey: new PubKey(toHex(publicKey1)),
        balance: 60
      }), new Account({
        pubKey: new PubKey(toHex(publicKey2)),
        balance: 40
      })]
    }

    // transfer 10 tokens from publicKey2 to publicKey1
    {
      const prevLockingScript = token.lockingScript

      // update data state
      
      const newLockingScript = token.getNewStateScript({
        accounts: [new Account({
          pubKey: new PubKey(toHex(publicKey1)),
          balance: 70
        }), new Account({
          pubKey: new PubKey(toHex(publicKey2)),
          balance: 30
        })]
      })

      const newAmount = amount - FEE

      const unlockScriptTx = await createUnlockingTx(lockingTxid, amount, prevLockingScript, newAmount, newLockingScript)

      // call contract method to get unlocking script
      const preimage = getPreimage(unlockScriptTx, prevLockingScript, amount)
      const sig2 = signTx(unlockScriptTx, privateKey2, prevLockingScript, amount)
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