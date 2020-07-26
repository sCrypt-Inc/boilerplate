# sCrypt Project Boilerplate

## Quickstart
```
npm install
npm test
```

## Directory layout
<pre>
.
├── contracts                       # sCrypt contract files
│   ├── ackermann.scrypt                # <a href="https://scryptdoc.readthedocs.io/en/latest/ackermann.html">Ackermann function</a>
│   ├── advancedCounter.scrypt          # Use external UTXOs to pay <a href="https://medium.com/@xiaohuiliu/advanced-op-push-tx-78ce84f69a66">counter</a> contract tx fees using sighash <i>ANYONECANPAY</i>
│   ├── advancedTokenSale.scrypt        # Sambe as above, but for token sale contract
│   ├── counter.scrypt                  # Count the number of times a function has been called to showcase <a href="https://medium.com/coinmonks/stateful-smart-contracts-on-bitcoin-sv-c24f83a0f783">stateful contract</a>
│   ├── demo.scrypt                     # "hello world" contract
│   ├── hashpuzzlep2pkh.scrypt          # combining <a href="https://scryptdoc.readthedocs.io/en/latest/multipartyhashpuzzles.html">hash puzzle</a> and p2pkh contracts
│   ├── nonFungibleToken.scrypt         # <a href="https://medium.com/@xiaohuiliu/non-fungible-tokens-on-bitcoin-sv-4575368f46a">non-fungible token</a>
│   ├── p2pkh.scrypt                    # <a href="https://scryptdoc.readthedocs.io/en/latest/p2pkh.html">p2pkh</a> contract written in sCrypt
│   ├── rabin.scrypt                    # <a href="https://medium.com/coinmonks/access-external-data-from-bitcoin-smart-contracts-2ecdc7448c43">Rabin signature</a> to import off-chain data into a contract via oracle
│   ├── token.scrypt                    # <a href="https://medium.com/coinmonks/layer-1-tokens-on-bitcoin-sv-e78c8abf270d">Layer-1 tokens</a> by storing token map as contract state in a single UTXO
│   ├── tokenSale.scrypt                # Selling tokens for bitcoins using <a href="https://medium.com/@xiaohuiliu/atomic-swap-on-bitcoin-sv-abc28e836cd5">atomic swap</a>
│   ├── tokenUtxo.scrypt                # <a href="https://medium.com/@xiaohuiliu/utxo-based-layer-1-tokens-on-bitcoin-sv-f5e86a74c1e1">fungible token</a>
│   └── util.scrypt                     # utility functions and constants
└── tests                           # contract test files
    ├── js                              # Javascript unit tests
    ├── testnet                         # e2e tests to deploy contract and call its function on testnet
    └── ts                              # Typescript unit tests
</pre>

## How to write test for a sCrypt contract

The major steps to write a sCrypt test are exemplified by `tests/demo.scrypttest.js`.

1. import / require `scrypttest` libary. 

```
import { buildContractClass } from 'scrypttest';
```


2. Use the imported function `buildContractClass` to get a reflected contract, which has same properties and methods as defined in the specified sCrypt contract.

```
const Demo = buildContractClass(path.join(__dirname, '../contracts/demo.scrypt'));
```

3. Initialize the contract.

```
demo = new Demo(4, 7);
```

4. Write tests for the instantiated contract as you would do in Javascript.

```
expect(demo.unlock(4 + 7)).to.equal(true);
```

## How to run tests locally

### Run using sCrypt Extension
Run unit tests file within the editor/explorer context menu.

![Screenshot](https://raw.githubusercontent.com/wiki/scrypt-sv/boilerplate/extension_screenshots/run_test_demo.gif)

**Note:** The test files must be suffixed by `.scrypttest.js` or `.scrypttest.ts`, otherwise the "Run sCrypt Test" option would not appear in the menu.

### Run from console
Tests could also be run from the console by executing `npm test`, just like regular Javascript/TypeScript tests.

## How to run tests remotely on testnet
When your tests succeed locally, you can run them on testnet.
1. Provide a private key with funds in `tests/runontestnet.js`
```
const key = ''
```
2. `npm run testnet`
```
> scrypt_boilerplate@0.1.0 testnet ~/scrypt_boilerplate
> node tests/runontestnet.js

locking txid:      8d58ff9067f5fa893b5c695179559e108ebf850d0ce4fd1e42bc872417ffd424
unlocking txid:    c60b57e93551a6c52282801130649c6a97edcca5d2b28b8b4ae2afe0ee59bf79
Succeeded on testnet
```