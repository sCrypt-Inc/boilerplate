const { exit } = require('process')
const { bsv } = require('scryptlib');

// fill in private key on testnet in WIF here
const key = ''
const key2 = ''
const key3 = ''

if (!key) {
  genPrivKey()
}

function genPrivKey() {
  const newPrivKey = new bsv.PrivateKey.fromRandom('testnet')
  console.log(`Missing private key, generating a new one ...
Private key generated: '${newPrivKey.toWIF()}'
You can fund its address '${newPrivKey.toAddress()}' from sCrypt faucet https://scrypt.io/#faucet`)
  exit(-1)
}

const privateKey = new bsv.PrivateKey.fromWIF(key)

const privateKey2 = new bsv.PrivateKey.fromWIF(key2)

const privateKey3 = new bsv.PrivateKey.fromWIF(key3)

//console.log('' + privateKey.toAddress())

module.exports = {
  privateKey,
  privateKey2,
  privateKey3,
  genPrivKey
}
