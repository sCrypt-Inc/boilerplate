[![CI-Test](https://github.com/sCrypt-Inc/scryptTS-examples/actions/workflows/ci.yml/badge.svg)](https://github.com/sCrypt-Inc/scryptTS-examples/actions/workflows/ci.yml)
[![Build Status](https://app.travis-ci.com/sCrypt-Inc/scryptTS-examples.svg?branch=master)](https://app.travis-ci.com/sCrypt-Inc/scryptTS-examples)

A collection of smart contract examples along with tests, implemented in [scryptTS](https://scrypt.io/scryptTS), a Typescript framework to write smart contracts on Bitcoin.

## Local Tests

In order to run smart contract tests locally, just simply run:

```sh
npm t
```

This will run every test defined under `tests/local/`.

To run tests for a specific smart contract, i.e. the `Counter` smart contract, run the following:

```sh
npm run build && npx mocha 'dist/tests/local/counter.test.js'
```

To understand how these tests work, please read the [scryptTS docs](https://scrypt.io/scrypt-ts/getting-started/how-to-test-a-contract).

## Test on the Bitcoin Testnet

This repository also contains tests for the Bitcoin testnet. They will deploy and call contract instances on-chain, so you first need to have some testnet coins.

First, generate a private key along with a testnet address:

```
npm run genprivkey
```

This will store a private key in a file named `.env`. Additionally, it will write its address to the console, which you can then fund with some coins from the [sCrypt faucet](https://scrypt.io/#faucet).

Once the address is funded, you can either run

```sh
npm run testnet
```

to run all defined testnet tests, or:

```sh
npm run build && npx mocha 'dist/tests/testnet/<contract_name>.js'
```

to run a specific contracts tests.

## Debug Smart Contract Code

In order to debug smart contract code in VS Code, you can simply add a debug config to your `launch.json` (located in `.vscode/`):

```json
{
  "type": "node",
  "request": "launch",
  "name": "Launch <contract_name>",
  "skipFiles": ["<node_internals>/**", "**/node_modules/**"],
  "resolveSourceMapLocations": ["!**/node_modules/**"],
  "program": "${workspaceRoot}/node_modules/.bin/_mocha",
  "args": [
    "${workspaceRoot}/dist/tests/**/<contract_name>.test.js",
    "--colors",
    "-t",
    "100000"
  ],
  "preLaunchTask": "tsc: build - tsconfig.json",
  "outFiles": []
}
```

Make sure to substitute `<contract_name>` with the actual contract name.

Once saved, you will have a new option under the debug menu.
