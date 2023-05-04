import { expect } from 'chai'
import { CandidateName, Voting, N } from '../../src/contracts/voting'
import {
    getDummySigner,
    getDummyUTXO,
    getRandomInt,
    stringify,
} from '../utils/helper'
import { FixedArray, MethodCallOptions, toByteString } from 'scrypt-ts'

describe('Test SmartContract `Voting`', () => {
    before(async () => {
        await Voting.compile()
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
        await voting.connect(getDummySigner())

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
            const { tx: tx_i, atInputIndex } =
                await currentInstance.methods.vote(candidate, {
                    fromUTXO: getDummyUTXO(balance),
                    next: {
                        instance: nextInstance,
                        balance,
                    },
                } as MethodCallOptions<Voting>)

            const result = tx_i.verifyScript(atInputIndex)
            expect(result.success, result.error).to.eq(true)

            // update the current instance reference
            currentInstance = nextInstance
        }

        console.log('candidates: ', stringify(currentInstance.candidates))
    })
})
