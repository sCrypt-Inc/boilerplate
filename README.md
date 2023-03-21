[![CI-Test](https://github.com/sCrypt-Inc/boilerplate/actions/workflows/ci.yml/badge.svg)](https://github.com/sCrypt-Inc/boilerplate/actions/workflows/ci.yml)
[![Build Status](https://app.travis-ci.com/sCrypt-Inc/boilerplate.svg?branch=master)](https://app.travis-ci.com/sCrypt-Inc/boilerplate)

A collection of smart contract examples along with tests, implemented using [sCrypt](https://scrypt.io), a Typescript framework to write smart contracts on Bitcoin.

Install all dependencies first.

```sh
npm install
```

## Local Tests

In order to run smart contract tests locally, just simply run:

```sh
npm test
```

This will run every test defined under `tests/local/`.

To run tests for a specific smart contract, i.e. the `Counter` smart contract, run the following:

```sh
npm run build && npx mocha 'dist/tests/local/counter.test.js'
```

To understand how these tests work, please read the [sCrypt docs](https://scrypt.io/docs/how-to-test-a-contract).

## Test on the Bitcoin Testnet

This repository also contains tests for the testnet. They will deploy and call contracts on chain, so you first need to have some testnet coins.

First, generate a private key along with an address:

```
npm run genprivkey
```

This will store a private key in a file named `.env`. Additionally, it will output its address to the console, which you can then fund from a [faucet](https://scrypt.io/faucet).

Once the address is funded, you can either run

```sh
npm run testnet
```

to run all defined testnet tests, or:

```sh
npm run build && npx mocha 'dist/tests/testnet/<contract_name>.js'
```

to run a specific contract test.

## Debug Smart Contract Code

In order to debug smart contract code in [Visual Studio Code](https://code.visualstudio.com), you need to configure `launch.json` (located under `.vscode/`). This repository already has an example configuration for the `Demo` smart contract.

See the [docs](https://scrypt.io/docs/how-to-debug-a-contract/#use-visual-studio-code-debugger) for more information on how to use the debugger.

## Project Structure

- `src/contracts` - This is where all the smart contract code is. Each file is for a separate smart contract example, e.g. the `P2PKH` smart contract is defined inside `src/contracts/p2pkh.ts`.
- `tests/local` - This is the directory which contains smart contract tests that get executed locally. Each smart contract has its separate test file.
- `tests/testnet` - This is the directory which contains smart contract tests that get broadcast to the Bitcoin testnet.


## Legacy boilerplate

The old boilerplate code which was using the now deprecated legacy sCrypt was deprecated in favour of our new Typescript-based implementation.

You can still find the old code under the [`legacy` branch](https://github.com/sCrypt-Inc/boilerplate/tree/legacy).
