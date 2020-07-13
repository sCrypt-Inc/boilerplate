const path = require('path')

const {
  buildContractClass,
  showError,
  bsv
} = require('scrypttest')

const {
  toHex,
  createLockingTx,
  createUnlockingTx,
  signTx,
  genPrivKey,
  sendTx
} = require('../testHelper')

// private key on testnet in WIF
const key = ''
if (!key) {
  genPrivKey()
}

function getUnlockingScript(method, sig, publicKey) {
  if (method === 'unlock') {
    return toHex(sig) + ' ' + toHex(publicKey)
  }
}

async function main() {
  try {
    const privateKey = new bsv.PrivateKey.fromWIF(key)
    const publicKey = privateKey.publicKey

    // Initialize contract
    const P2PKH = buildContractClass(path.join(__dirname, '../../contracts/p2pkh.scrypt'))
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    const p2pkh = new P2PKH(toHex(publicKeyHash))

    // deploy contract on testnet
    const amountInContract = 10000
    const deployTx = await createLockingTx(privateKey.toAddress(), amountInContract)
    const lockingScript = p2pkh.getLockingScript()
    deployTx.outputs[0].setScript(bsv.Script.fromASM(lockingScript))
    deployTx.sign(privateKey)
    const deployTxId = await sendTx(deployTx)
    console.log('Contract Deployed Successfully! TxId: ', deployTxId)

    // call contract method on testnet
    const spendAmount = amountInContract / 10
    const methodCallTx = createUnlockingTx(deployTxId, amountInContract, lockingScript, spendAmount, privateKey.toAddress())
    const sig = signTx(methodCallTx, privateKey, lockingScript, amountInContract)
    const unlockingScript = getUnlockingScript('unlock', sig, publicKey)
    methodCallTx.inputs[0].setScript(bsv.Script.fromASM(unlockingScript))
    const methodCallTxId = await sendTx(methodCallTx)
    console.log('Contract Method Called Successfully! TxId: ', methodCallTxId)

  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
}

main()