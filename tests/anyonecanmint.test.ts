import { expect } from 'chai'
import { Anyonecanmint } from '../src/contracts/anyonecanmint'
import { getDefaultSigner } from './utils/helper'
import { Addr, toByteString } from 'scrypt-ts'

describe('Test SmartContract `Anyonecanmint`', () => {
    before(() => {
        Anyonecanmint.loadArtifact()
    })

    it('should pass the public method unit test successfully.', async () => {
        const instance = new Anyonecanmint(
            toByteString(''),
            toByteString('BSV', true),
            21000000n,
            0n,
            1000n
        )
        await instance.connect(getDefaultSigner())

        await instance.deployToken()

        // set current instance to be the deployed one
        let currentInstance = instance

        const address = await instance.signer.getDefaultAddress()

        // call the method of current instance to apply the updates on chain
        for (let i = 0; i < 3; ++i) {
            // bind tx builder
            currentInstance.bindTxBuilder('mint', Anyonecanmint.mintTxBuilder)

            // call the method of current instance to apply the updates on chain
            const callContract = async () =>
                await instance.methods.mint(
                    Addr(address.toByteString()),
                    instance.lim
                )

            expect(callContract()).to.be.not.throw

            // update the current instance reference
            currentInstance = currentInstance.next()
        }
    })
})
