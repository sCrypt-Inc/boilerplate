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
  deployContract,
  sendTx,
  createInputFromPrevTx,
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
    const desc = loadDesc('token');
    const Token = buildContractClass(desc);
    const { Account } = buildTypeClasses(desc)


    const token = new Token([new Account({
      pubKey: new PubKey(toHex(publicKey1)),
      balance: 100
    }), new Account({
      pubKey: new PubKey(toHex(publicKey2)),
      balance: 0
    })])


    let amount = 13000

    // deploy contract on testnet
    const lockingTx = await deployContract(token, amount);
    console.log('locking txid:     ', lockingTx.id)

    // transfer 40 tokens from publicKey1 to publicKey2

    const transferTx1 = new bsv.Transaction();

    transferTx1.addInput(createInputFromPrevTx(lockingTx))
      .setOutput(0, (tx) => {
        const newLockingScript = token.getNewStateScript({
          accounts: [new Account({
            pubKey: new PubKey(toHex(publicKey1)),
            balance: 60
          }), new Account({
            pubKey: new PubKey(toHex(publicKey2)),
            balance: 40
          })]
        })

        return new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: amount - tx.getEstimateFee(),
        })
      })
      .setInputScript(0, (tx, output) => {
        // call contract method to get unlocking script
        const newAmount = amount - tx.getEstimateFee();
        const preimage = getPreimage(tx, output.script, output.satoshis)
        const sig1 = signTx(tx, privateKey1, output.script, output.satoshis)
        return token.transfer(
          new PubKey(toHex(publicKey1)),
          new Sig(toHex(sig1)),
          new PubKey(toHex(publicKey2)),
          40,
          new SigHashPreimage(toHex(preimage)),
          newAmount
        ).toScript()
      })
      .seal()

    await sendTx(transferTx1)
    console.log('transfer txid1:    ', transferTx1.id)


    amount = transferTx1.outputs[0].satoshis;

    // update state
    token.accounts = [new Account({
      pubKey: new PubKey(toHex(publicKey1)),
      balance: 60
    }), new Account({
      pubKey: new PubKey(toHex(publicKey2)),
      balance: 40
    })]

    // transfer 10 tokens from publicKey2 to publicKey1
    const transferTx2 = new bsv.Transaction();

    transferTx2.addInput(createInputFromPrevTx(transferTx1))
      .setOutput(0, (tx) => {
        const newLockingScript = token.getNewStateScript({
          accounts: [new Account({
            pubKey: new PubKey(toHex(publicKey1)),
            balance: 70
          }), new Account({
            pubKey: new PubKey(toHex(publicKey2)),
            balance: 30
          })]
        })

        return new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: amount - tx.getEstimateFee(),
        })
      })
      .setInputScript(0, (tx, output) => {
        // call contract method to get unlocking script
        const newAmount = amount - tx.getEstimateFee();
        const preimage = getPreimage(tx, output.script, output.satoshis)
        const sig = signTx(tx, privateKey2, output.script, output.satoshis)
        // call contract method to get unlocking script
        return token.transfer(
          new PubKey(toHex(publicKey2)),
          new Sig(toHex(sig)),
          new PubKey(toHex(publicKey1)),
          10,
          new SigHashPreimage(toHex(preimage)),
          newAmount
        ).toScript()
      })
      .seal()



    await sendTx(transferTx2)
    console.log('transfer txid2:    ', transferTx2.id)

    console.log('Succeeded on testnet')
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
})()