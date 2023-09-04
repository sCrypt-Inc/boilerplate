import { expect } from 'chai'
import { CandidateName, Voting, N } from '../src/contracts/voting'
import { getDefaultSigner, getRandomInt } from './utils/helper'
import { FixedArray, MethodCallOptions, toByteString } from 'scrypt-ts'

describe('Test SmartContract `Voting`', () => {
    before(() => {
        Voting.loadArtifact()
    })

    const candidateNames: FixedArray<CandidateName, typeof N> = [
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

    it('should pass the public method unit test successfully.', async () => {
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

            const candidate = candidateNames[getRandomInt(0, N)]
            // update state
            nextInstance.increaseVotesReceived(candidate)

            // call the method of current instance to apply the updates on chain
            const callContract = async () =>
                currentInstance.methods.vote(candidate, {
                    next: {
                        instance: nextInstance,
                        balance,
                    },
                } as MethodCallOptions<Voting>)
            await expect(callContract()).not.rejected

            // update the current instance reference
            currentInstance = nextInstance
        }
    })
})
