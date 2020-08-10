# sCrypt Project Boilerplate

## Guide

[**sCrypt**](https://scryptdoc.readthedocs.io) is a high-level programming language for writing smart contracts on Bitcoin SV. This project provides examples to help developers learn and integrate sCrypt smart contracts to their Javascript-based projects. Our recommended procedure of developing smart contract based applications is as follows:

1. Contract Development and Test

[The sCrypt Visual Studio Extension](https://marketplace.visualstudio.com/items?itemName=bsv-scrypt.sCrypt) is a tool for developers to write, test, and debug sCrypt smart contracts.

2. Contract Integration and Application Launch

After developing and unit testing the smart contracts, the next step is to integrate them into your application which is written in other languages such as Javascript or Python. Integration tests should be run on Bitcoin SV [Testnet](https://test.whatsonchain.com/) or [Scaling Test Network(STN)](https://bitcoinscaling.io/) before launching the application to the public on mainnet.

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
├── deployments                         # examples to deploy contract and call its function on testnet
└── tests                           # contract test files
    ├── js                              # Javascript unit tests
    └── ts                              # Typescript unit tests
</pre>

## Prepare ##

Before trying to run an example, you should have the contract been compiled to produce a [description json file](https://github.com/scrypt-sv/scryptlib#contract-description-file), which would be used for building contract class. This could be done automatically by running a daemon process with command `npm run watch`. It will monit contract files' change and compile it when necessary. All generated description files are located at `tests/fixture/autoGen`. Make sure it's up to date with the contract before running any test.

## How to write test for a sCrypt contract

The major steps to write a sCrypt test are exemplified by `tests/demo.scrypttest.js`.

1. Install and import / require [`scryptlib` libary](https://github.com/scrypt-sv/scryptlib), which is a javascript SDK for integrating sCrypt smart contract.

```
npm install scryptlib
```


```
import { buildContractClass } from 'scryptlib';
```


2. Use the imported function `buildContractClass` to get a reflected contract, which has same properties and methods as defined in the specified sCrypt contract.

```
const Demo = buildContractClass(loadDesc('demo_desc.json'));
```

Note that `demo_desc.json` is the description file name of the compiled contract, which will be generated automatically if you run `npm run watch` and its name follows the rule `$contractName_desc.json`.

1. Initialize the contract.

```
demo = new Demo(4, 7);
```

4. Write tests for the instantiated contract as you would do in Javascript.

```
expect(demo.unlock(4 + 7).verify()).to.equal(true);
expect(() => { demo.unlock(4 + 6).verify() }).to.throws(/failed to verify/);
```

## How to run tests locally

### Run using sCrypt Extension
Run unit tests file within the editor/explorer context menu.

![Screenshot](https://raw.githubusercontent.com/wiki/scrypt-sv/boilerplate/extension_screenshots/run_test_demo.gif)

**Note:** The test files must be suffixed by `.scrypttest.js` or `.scrypttest.ts`, otherwise the "Run sCrypt Test" option would not appear in the menu.

### Run from console
Tests could also be run from the console by executing `npm test`, just like regular Javascript/TypeScript tests.

## How to run examples on testnet
When your tests succeed locally, you can run them on testnet.
1. Provide a private key with funds in `privateKey.js`
```
const key = '$YOUR_PRIVATE_KEY_HERE'
```

1. Run an example file on testnet by commands like `node deployments/demo.js`, and the output would appear in the console:

```
locking txid:      8d58ff9067f5fa893b5c695179559e108ebf850d0ce4fd1e42bc872417ffd424
unlocking txid:    c60b57e93551a6c52282801130649c6a97edcca5d2b28b8b4ae2afe0ee59bf79
Succeeded on testnet
```