import {
    SmartContract,
    prop,
    method,
    FixedArray,
    hash256,
    assert,
    SigHash,
} from 'scrypt-ts'

export type PerceptronStates = {
    heightWeight: bigint
    // 1st weight means weight in KGs
    weightWeight: bigint
    bias: bigint
}

export type PerceptronInput = {
    // in CMs
    height: bigint
    // in KGs
    weight: bigint
}

// Correct classification of gender: 0 means female, 1 male
type Output = bigint

/*
 * A simple perceptron classifying gender based on height & weight.
 * Read our Medium article for more details:
 * https://medium.com/@xiaohuiliu/ai-on-bitcoin-96bbc97a62b9
 */
export class Perceptron extends SmartContract {
    @prop(true)
    states: PerceptronStates

    // Sample size:
    static readonly N = 10

    // Learning rate:
    @prop()
    static readonly LR: bigint = 1n

    // Training data set:
    // inputs:
    @prop()
    inputs: FixedArray<PerceptronInput, typeof Perceptron.N>
    // outputs:
    @prop()
    outputs: FixedArray<Output, typeof Perceptron.N>

    constructor(
        states: PerceptronStates,
        inputs: FixedArray<PerceptronInput, typeof Perceptron.N>,
        outputs: FixedArray<Output, typeof Perceptron.N>
    ) {
        super(...arguments)
        this.states = states
        this.inputs = inputs
        this.outputs = outputs
    }

    // Train the perceptron.
    @method()
    train(s: PerceptronStates): PerceptronStates {
        for (let i = 0; i < Perceptron.N; i++) {
            const prediction = this.predict(s, BigInt(i))
            const delta = this.outputs[i] - prediction
            s = this.adjust(s, delta)
        }
        return s
    }

    // Prediction for the i-th input.
    @method()
    predict(s: PerceptronStates, i: bigint): bigint {
        let sum = s.bias
        const input: PerceptronInput = this.inputs[Number(i)]
        sum += input.height * s.heightWeight + input.weight * s.weightWeight
        return Perceptron.stepActivate(sum)
    }

    // Learn internal state.
    @method()
    adjust(s: PerceptronStates, delta: bigint): PerceptronStates {
        const scaledDelta = delta * Perceptron.LR
        for (let i = 0; i < Perceptron.N; i++) {
            const input: PerceptronInput = this.inputs[i]
            s.heightWeight += input.height * scaledDelta
            s.weightWeight += input.weight * scaledDelta
        }
        s.bias += scaledDelta
        return s
    }

    // Binary step function.
    @method()
    static stepActivate(sum: bigint): bigint {
        return sum >= 0n ? 1n : 0n
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public main() {
        // Train the perceptron.
        this.states = this.train(this.states)

        // Propagate smart contract state.
        const amount = this.ctx.utxo.value
        const output = this.buildStateOutput(amount)
        assert(this.ctx.hashOutputs == hash256(output), 'hashOutputs mismatch')
    }
}
