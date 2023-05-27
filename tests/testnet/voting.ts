import { CandidateName, Voting, N } from '../../src/contracts/voting'
import { getRandomInt } from '../utils/helper'
import {
    FixedArray,
    MethodCallOptions,
    toByteString,
    Scrypt,
    ScryptProvider,
    TestWallet,
    bsv,
} from 'scrypt-ts'
import { myPrivateKey } from '../utils/privateKey'

async function main() {
    await Voting.compile()

    Scrypt.init({
        apiKey: 'alpha_test_api_key',
        network: bsv.Networks.testnet,
    })

    const signer = new TestWallet(myPrivateKey)

    await signer.connect(new ScryptProvider())

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

    const voting = new Voting(candidateNames)
    await voting.connect(signer)

    const balance = 1

    const deployTx = await voting.deploy(balance)
    console.log('contract Voting deployed: ', deployTx.id)

    const contract_id = {
        /** The deployment transaction id */
        txId: deployTx.id,
        /** The output index */
        outputIndex: 0,
    }

    // call the method of current instance to apply the updates on chain
    for (let i = 0; i < 100; ++i) {
        const currentInstance = await Scrypt.contractApi.getLatestInstance(
            Voting,
            contract_id
        )

        await currentInstance.connect(signer)
        // create the next instance from the current
        const nextInstance = currentInstance.next()

        const candidateName = candidateNames[getRandomInt(0, N)]

        // read votes Received
        const count = currentInstance.candidates.find(
            (candidate) => candidate.name === candidateName
        )?.votesReceived
        console.log(`${candidateName}'s vote count: ${count}`)

        // update state
        nextInstance.increaseVotesReceived(candidateName)

        // call the method of current instance to apply the updates on chain
        const { tx: tx_i } = await currentInstance.methods.vote(candidateName, {
            next: {
                instance: nextInstance,
                balance,
            },
        } as MethodCallOptions<Voting>)

        console.log(`Voting call tx: ${tx_i.id}`)
    }
}

describe('Test SmartContract `Voting`  on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
