const { exit } = require('process')
const { bsv } = require('scryptlib');

// fill in private key on testnet in WIF here
const key = 'cRYVTxXkkHDLkd4Va2ZF2UvxTdWnJ9qZBpDmmr2ASTJcBsVCDbDZ'
const key2 = 'cRYVTxXkkHDLkd4Va2ZF2UvxTdWnJ9qZBpDmmr2ASTJcBsVCDbDZ'
if (!key) {
  genPrivKey()
}

function genPrivKey() {
  const newPrivKey = new bsv.PrivateKey.fromRandom('testnet')
  console.log(`Missing private key, generating a new one ...
Private key generated: '${newPrivKey.toWIF()}'
You can fund its address '${newPrivKey.toAddress()}' from some faucet and use it to complete the test
Example faucets are https://faucet.bitcoincloud.net and https://testnet.satoshisvision.network`)
  exit(0)
}

const privateKey = new bsv.PrivateKey.fromWIF(key)

const privateKey2 = new bsv.PrivateKey.fromWIF(key2)

module.exports = {
  privateKey,
  privateKey2,
  genPrivKey
}