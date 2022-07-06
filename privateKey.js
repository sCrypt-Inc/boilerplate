const { exit } = require('process')
const { bsv } = require('scryptlib');

// fill in private key on testnet in WIF here
const privKey = ''
const privKey2 = ''
const privKey3 = ''

if (!privKey) {
  genPrivKey()
}

function genPrivKey() {
  const newPrivKey = new bsv.PrivateKey.fromRandom('testnet')
  console.log(`Missing private key, generating a new one ...
Private key generated: '${newPrivKey.toWIF()}'
You can fund its address '${newPrivKey.toAddress()}' from sCrypt faucet https://scrypt.io/#faucet`)
  exit(-1)
}

const privateKey = new bsv.PrivateKey.fromWIF(privKey)

const privateKey2 = privKey2 ? new bsv.PrivateKey.fromWIF(privKey2) : privateKey

const privateKey3 = privKey3 ? new bsv.PrivateKey.fromWIF(privKey3) : privateKey

//console.log('' + privateKey.toAddress())

module.exports = {
  privateKey,
  privateKey2,
  privateKey3,
  genPrivKey
}
