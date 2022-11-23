import { exit } from 'process';
import { bsv } from 'scryptlib';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

const dotenvConfigPath = ".env";
dotenv.config({path: dotenvConfigPath});

// fill in private key on testnet in WIF here
const privKey : string = process.env.PRIVATE_KEY || '';
if (!privKey) {
  genPrivKey();
}

export function genPrivKey() {
  const newPrivKey = bsv.PrivateKey.fromRandom('testnet')
  console.log(`Missing private key, generating a new one ...
Private key generated: '${newPrivKey.toWIF()}'
You can fund its address '${newPrivKey.toAddress()}' from sCrypt faucet https://scrypt.io/#faucet`);
  // auto generate .env file with new generated key
  fs.writeFileSync(dotenvConfigPath, `PRIVATE_KEY="${newPrivKey}"`);
  exit(-1)
}

export const privateKey = bsv.PrivateKey.fromWIF(privKey);