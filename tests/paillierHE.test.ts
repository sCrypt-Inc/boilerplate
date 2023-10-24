import { expect, use } from 'chai'
import * as paillierBigint from 'paillier-bigint'
import { PaillierHE } from '../src/contracts/paillierHE'

import chaiAsPromised from 'chai-as-promised'
import { getDefaultSigner } from './utils/helper'
import { MethodCallOptions } from 'scrypt-ts'
use(chaiAsPromised)

describe('Heavy: Test SmartContract `PaillierHE`', () => {
    before(() => {
        PaillierHE.loadArtifact()
    })

    it('should pass the public method unit test successfully.', async () => {
        // (asynchronous) creation of a random private, public key pair for the Paillier cryptosystem
        const { publicKey, privateKey } =
            await paillierBigint.generateRandomKeys(2048)

        const x = publicKey.encrypt(0n)
        const instance = new PaillierHE(publicKey._n2, x)
        await instance.connect(getDefaultSigner())

        await instance.deploy(1)

        // Set current instance to be the deployed one.
        let currentInstance = instance

        for (let i = 0; i < 5; ++i) {
            let nextInstance = currentInstance.next()

            // Add encrypted amount (100) to the contract commulative value.
            const toAdd = publicKey.encrypt(100n)
            nextInstance.x = PaillierHE.addCT(
                currentInstance.x,
                toAdd,
                publicKey._n2
            )

            // Call add method.
            const callContractAdd = async () =>
                currentInstance.methods.add(toAdd, {
                    next: {
                        instance: nextInstance,
                        balance: 1,
                    },
                } as MethodCallOptions<PaillierHE>)
            await expect(callContractAdd()).not.rejected

            currentInstance = nextInstance

            nextInstance = currentInstance.next()

            // Multiply encrypted amount.
            const k = 5n
            nextInstance.x = PaillierHE.mulCT(
                currentInstance.x,
                k,
                publicKey._n2
            )

            // Call mul method.
            const callContractMul = async () =>
                currentInstance.methods.mul(k, {
                    next: {
                        instance: nextInstance,
                        balance: 1,
                    },
                } as MethodCallOptions<PaillierHE>)
            await expect(callContractMul()).not.rejected

            currentInstance = nextInstance
        }

        // Decrypt and check end result.
        const m = privateKey.decrypt(currentInstance.x)
        await expect(m == 390500n).to.be.true
    })
})
