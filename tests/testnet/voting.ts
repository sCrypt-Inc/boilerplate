import { expect } from 'chai'
import { CandidateName, Voting } from '../../src/contracts/voting'
import { getDefaultSigner, getRandomInt, stringify } from '../utils/helper'
import { FixedArray, MethodCallOptions, toByteString } from 'scrypt-ts'

async function main() {
    await Voting.compile()

    const candidateNames: FixedArray<CandidateName, 10> = [
        toByteString('candidate1', true),
        toByteString('candidate2', true),
        toByteString('candidate3', true),
        toByteString('candidate4', true),
        toByteString('candidate5', true),
        toByteString('candidate6', true),
        toByteString('candidate7', true),
        toByteString('candidate8', true),
        toByteString('candidate9', true),
        toByteString('candidate10', true),
    ]

    const balance = 1

    const voting = new Voting(candidateNames)
    await voting.connect(getDefaultSigner())

    await voting.deploy(1)

    // set current instance to be the deployed one
    let currentInstance = voting

    // call the method of current instance to apply the updates on chain
    for (let i = 0; i < 10; ++i) {
        // create the next instance from the current
        const nextInstance = currentInstance.next()

        const candidate = candidateNames[getRandomInt(0, 10)]
        // update state
        nextInstance.updateVotesReceived(candidate)

        // call the method of current instance to apply the updates on chain
        const { tx: tx_i, atInputIndex } = await currentInstance.methods.vote(
            candidate,
            {
                next: {
                    instance: nextInstance,
                    balance,
                },
            } as MethodCallOptions<Voting>
        )

        console.log(`Voting call tx: ${tx_i.id}`)

        // update the current instance reference
        currentInstance = nextInstance
    }
}
describe('Test SmartContract `Voting`  on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
