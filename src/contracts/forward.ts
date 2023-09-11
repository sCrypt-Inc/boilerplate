import {
    ByteString,
    Addr,
    SmartContract,
    Utils,
    assert,
    hash256,
    int2ByteString,
    method,
    prop,
} from 'scrypt-ts'
import { RabinSig, RabinPubKey, RabinVerifier } from 'scrypt-ts-lib'

// price info published by oracle
type OraclePrice = {
    // spot/market price
    price: bigint
    time: bigint
}

// a USD forward contract settled in bitcoin, as denominated
export class Forward extends SmartContract {
    @prop()
    alice: Addr

    @prop()
    bob: Addr

    // how much bitcoin Alice plans to sell to Bob, in dollars
    @prop()
    readonly dollars: bigint

    // predetermined delivery price, in satoshis / dollar
    @prop()
    readonly deliveryPrice: bigint

    // contract mature time
    @prop()
    readonly matureTime: bigint

    @prop()
    oraclePubKey: RabinPubKey

    constructor(
        alice: Addr,
        bob: Addr,
        dollars: bigint,
        deliveryPrice: bigint,
        matureTime: bigint,
        oraclePubKey: RabinPubKey
    ) {
        super(...arguments)
        this.alice = alice
        this.bob = bob
        this.dollars = dollars
        this.deliveryPrice = deliveryPrice
        this.matureTime = matureTime
        this.oraclePubKey = oraclePubKey
    }

    @method()
    public settle(op: OraclePrice, sig: RabinSig) {
        // oracle signs serialized price data
        const msg: ByteString = Forward.serializePrice(op)
        // verify price info
        assert(RabinVerifier.verifySig(msg, sig, this.oraclePubKey))

        // verify price is for the agreed-on matrue time
        assert(op.time == this.matureTime)

        // total collateral amount, in satoshis
        const totalSats: bigint = this.ctx.utxo.value

        // Bob pays Alice the difference; could be nagative
        const payoff: bigint = this.dollars * (op.price - this.deliveryPrice)
        let aliceAmount: bigint = totalSats / 2n + payoff
        if (aliceAmount < 0n) aliceAmount = 0n //bounded
        let bobAmount: bigint = totalSats - aliceAmount
        if (bobAmount < 0n) bobAmount = 0n //bounded

        // split according to the price when the contract is mature

        const aliceScript: ByteString = Utils.buildPublicKeyHashScript(
            this.alice
        )
        const aliceOutput: ByteString = Utils.buildOutput(
            aliceScript,
            aliceAmount
        )

        const bobScript: ByteString = Utils.buildPublicKeyHashScript(this.bob)
        const bobOutput: ByteString = Utils.buildOutput(bobScript, bobAmount)

        assert(hash256(aliceOutput + bobOutput) == this.ctx.hashOutputs)
    }

    // serialized price data. It is what oracle signs
    @method()
    static serializePrice(op: OraclePrice): ByteString {
        return int2ByteString(op.price, 4n) + int2ByteString(op.time, 4n)
    }
}
