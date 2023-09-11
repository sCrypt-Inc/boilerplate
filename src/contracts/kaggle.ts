import {
    SmartContract,
    prop,
    method,
    FixedArray,
    hash256,
    assert,
    Addr,
    Sha256,
    SigHash,
    ByteString,
    Utils,
    int2ByteString,
    toByteString,
} from 'scrypt-ts'

export type Submission = {
    heightWeight: bigint
    // 1st "weight" prefix means weight in KGs
    weightWeight: bigint
    bias: bigint

    // Payout address:
    addr: Addr
}

export type Gender = bigint

export type DataPoint = {
    // Inputs:
    // in CMs
    height: bigint
    // in KGs
    weight: bigint

    // Outputs:
    // correct classification of gender: 0 means female, 1 male
    gender: Gender
}

export type Submissions = FixedArray<Submission, typeof Kaggle.S>

export type States = {
    // Submissions
    submissions: Submissions
    count: bigint
}

/*
 * An on-chain Kaggle competition.
 * Read our Medium article about the contract:
 * https://medium.com/@xiaohuiliu/machine-learning-marketplace-on-bitcoin-d8eb577be812
 */
export class Kaggle extends SmartContract {
    @prop(true)
    states: States

    // Size of training dataset.
    static readonly N = 5

    // Size of testing dataset.
    static readonly T = 10

    // Max number of submissions.
    static readonly S = 6

    // Training dataset.
    @prop()
    trainingDataset: FixedArray<DataPoint, typeof Kaggle.N>

    // Hash of testing dataset.
    @prop()
    testingDatasetHash: Sha256

    constructor(
        states: States,
        trainingDataset: FixedArray<DataPoint, typeof Kaggle.N>,
        testingDatasetHash: Sha256
    ) {
        super(...arguments)
        this.states = states
        this.trainingDataset = trainingDataset
        this.testingDatasetHash = testingDatasetHash
    }

    // Submit a solution.
    @method(SigHash.ANYONECANPAY_SINGLE)
    public submit(subm: Submission) {
        // Append the submission to the candidates.
        if (++this.states.count < BigInt(Kaggle.N)) {
            for (let i = 0; i < Kaggle.S; i++) {
                if (BigInt(i) == this.states.count) {
                    this.states.submissions[i] = subm
                }
            }
        }

        // Propagate smart contract state.
        const amount = this.ctx.utxo.value
        const output = this.buildStateOutput(amount)
        assert(this.ctx.hashOutputs == hash256(output), 'hashOutputs mismatch')
    }

    // Reveal the testing dataset and pay the winner with smallest error.
    @method(SigHash.ANYONECANPAY_SINGLE)
    public evaluate(testingDataset: FixedArray<DataPoint, typeof Kaggle.T>) {
        // Validate testing dataset is what was committed.
        assert(
            this.validateTestData(testingDataset),
            'Testing dataset evaluation failed.'
        )

        // Find the winner with the minimal predicted error.
        let winner = Addr(toByteString(''))
        let minError = 99999999999999n
        for (let i = 0; i < Kaggle.S; i++) {
            if (BigInt(i) < this.states.count) {
                const subm = this.states.submissions[i]
                const error = Kaggle.calcError(subm, testingDataset)
                if (error < minError) {
                    minError = error
                    winner = subm.addr
                }
            }
        }

        // Ensure next output pays winner.
        const amount = this.ctx.utxo.value
        const output = Utils.buildPublicKeyHashOutput(winner, amount)
        assert(this.ctx.hashOutputs == hash256(output), 'hashOutputs mismatch')
    }

    // Calculate error.
    @method()
    static calcError(
        subm: Submission,
        trainingDataset: FixedArray<DataPoint, typeof Kaggle.T>
    ): bigint {
        let sum = 0n

        for (let i = 0; i < Kaggle.T; i++) {
            const prediction = Kaggle.predict(subm, trainingDataset[i])
            const delta = trainingDataset[i].gender - prediction

            // Use square error.
            sum += delta * delta
        }

        return sum
    }

    // Predict output.
    @method()
    static predict(subm: Submission, dataPoint: DataPoint): bigint {
        let sum = subm.bias
        sum +=
            dataPoint.height * subm.heightWeight +
            dataPoint.weight * subm.weightWeight
        return Kaggle.stepActivate(sum)
    }

    // Binary step function.
    @method()
    static stepActivate(sum: bigint): Gender {
        return sum >= 0n ? 1n : 0n
    }

    @method()
    validateTestData(
        testingDataset: FixedArray<DataPoint, typeof Kaggle.T>
    ): boolean {
        return (
            this.testingDatasetHash ==
            hash256(Kaggle.serializeDataPoints(testingDataset))
        )
    }

    @method()
    static serializeDataPoints(
        dataset: FixedArray<DataPoint, typeof Kaggle.T>
    ): ByteString {
        let sBuf: ByteString = toByteString('')
        for (let i = 0; i < Kaggle.T; i++) {
            const dp = dataset[i]
            sBuf +=
                int2ByteString(dp.height) +
                int2ByteString(dp.weight) +
                int2ByteString(dp.gender)
        }
        return sBuf
    }
}
