import {
    SmartContract,
    prop,
    method,
    FixedArray,
    hash256,
    assert,
    SigHash,
} from 'scrypt-ts'

export type Perceptron2Input = {
    // in CMs
    height: bigint
    // in KGs
    weight: bigint
}

// Correct classification of gender: 0 means female, 1 male
type Perceptron2Output = bigint

/*
 * Outsource training of a perceptron.
 * https://medium.com/@xiaohuiliu/how-to-train-ai-using-bitcoin-3a20ef620143
 */
export class Perceptron2 extends SmartContract {
    // Sample size.
    static readonly N = 100000

    // Training data set:
    // inputs:
    @prop()
    inputs: FixedArray<Perceptron2Input, typeof Perceptron2.N>
    // outputs:
    @prop()
    outputs: FixedArray<Perceptron2Output, typeof Perceptron2.N>

    constructor(
        inputs: FixedArray<Perceptron2Input, typeof Perceptron2.N>,
        outputs: FixedArray<Perceptron2Output, typeof Perceptron2.N>
    ) {
        super(...arguments)
        this.inputs = inputs
        this.outputs = outputs
    }

    // Prediction for the i-th input.
    @method()
    predict(
        heightWeight: bigint,
        weightWeight: bigint,
        bias: bigint,
        i: bigint
    ): bigint {
        let sum = bias
        const input: Perceptron2Input = this.inputs[Number(i)]
        sum += input.height * heightWeight + input.weight * weightWeight
        return Perceptron2.stepActivate(sum)
    }

    // Whoever can find the correct weights and bias for the training dataset can take the bounty.
    @method()
    public main(heightWeight: bigint, weightWeight: bigint, bias: bigint) {
        // Every datapoint must match.
        for (let i = 0; i < Perceptron2.N; i++) {
            const prediction = this.predict(
                heightWeight,
                weightWeight,
                bias,
                BigInt(i)
            )

            // Prediction must match actual label.
            assert(this.outputs[i] == prediction, 'Wrong prediction.')
        }
    }

    // Binary step function.
    @method()
    static stepActivate(sum: bigint): bigint {
        return sum >= 0n ? 1n : 0n
    }
}
