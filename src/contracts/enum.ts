import {
    method,
    prop,
    SmartContract,
    assert,
    hash256,
    SigHash,
} from 'scrypt-ts'

// Enum representing status
// Pending  - 0
// Shipped  - 1
// Accepted - 2
// Rejected - 3
// Canceled - 4
export enum Status {
    Pending,
    Shipped,
    Accepted,
    Rejected,
    Canceled,
}

export class Enum extends SmartContract {
    @prop(true)
    status: Status

    constructor() {
        super(...arguments)
        this.status = Status.Pending
    }

    @method()
    get(): Status {
        return this.status
    }

    // Update status by passing Int into input
    @method()
    set(status: Status): void {
        this.status = status
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public unlock() {
        let s = this.get()
        assert(s == Status.Pending, 'invalid stauts')

        this.set(Status.Accepted)

        s = this.get()

        assert(s == Status.Accepted, 'invalid stauts')

        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value)),
            'hashOutputs check failed'
        )
    }
}
