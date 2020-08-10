const { buildContractClass, toHex, signTx, Ripemd160, Sig, PubKey, bsv } = require('scryptlib');

const {
  createLockingTx,
  createUnlockingTx,
  sendTx,
  showError,
  loadDesc
} = require('../helper')

const { privateKey } = require('../privateKey');

async function main() {
  try {
    const publicKey = privateKey.publicKey

    // Initialize contract
    const P2PKH = buildContractClass(loadDesc('p2pkh_desc.json'))
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    const p2pkh = new P2PKH(new Ripemd160(toHex(publicKeyHash)))

    // deploy contract on testnet
    const amountInContract = 10000
    const deployTx = await createLockingTx(privateKey.toAddress(), amountInContract)
    deployTx.outputs[0].setScript(p2pkh.lockingScript)
    deployTx.sign(privateKey)
    const deployTxId = await sendTx(deployTx)
    console.log('Contract Deployed Successfully! TxId: ', deployTxId)

    // call contract method on testnet
    const spendAmount = amountInContract / 10
    const methodCallTx = createUnlockingTx(deployTxId, amountInContract, p2pkh.lockingScript.toASM(), spendAmount)
    const sig = signTx(methodCallTx, privateKey, p2pkh.lockingScript.toASM(), amountInContract)
    const unlockingScript = p2pkh.unlock(new Sig(toHex(sig)), new PubKey(toHex(publicKey))).toScript()
    methodCallTx.inputs[0].setScript(unlockingScript)
    const methodCallTxId = await sendTx(methodCallTx)
    console.log('Contract Method Called Successfully! TxId: ', methodCallTxId)

  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
}

main()