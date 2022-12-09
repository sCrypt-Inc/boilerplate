const { buildContractClass, toHex, signTx, Ripemd160, Sig, PubKey, bsv } = require('scryptlib');

const {
  deployContract,
  sendTx,
  showError,
  loadDesc
} = require('../helper')

const { privateKey } = require('../privateKey');

async function main() {
  try {
    const publicKey = privateKey.publicKey

    // Initialize contract
    const P2PKH = buildContractClass(loadDesc('p2pkh_debug_desc.json'))
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    const p2pkh = new P2PKH(new Ripemd160(toHex(publicKeyHash)))

    const amount = 10000
    // deploy contract on testnet
    const lockingTx = await deployContract(p2pkh, amount);
    console.log('locking txid:     ', lockingTx.id)


    // call contract method on testnet
    const unlockingTx = new bsv.Transaction();

    unlockingTx.addInputFromPrevTx(lockingTx)
      .change(privateKey.toAddress())
      .setInputScript({
        inputIndex: 0,
        privateKey
      }, (tx) => {
        return p2pkh.unlock(new Sig(tx.getSignature(0)), new PubKey(toHex(publicKey))).toScript()
      })
      .seal()


    const unlockingTxid = await sendTx(unlockingTx)
    console.log('Contract Method Called Successfully! TxId: ', unlockingTxid)

  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
}

main()