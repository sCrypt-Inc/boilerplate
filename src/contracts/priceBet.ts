import {
    SmartContract,
    prop,
    ByteString,
    PubKeyHash,
    method,
    assert,
    Utils,
    hash256,
    SmartContractLib,
    sha256,
} from 'scrypt-ts'
import { RabinSig, RabinPubKey } from 'scrypt-ts-lib'

class RabinVerifierWOC extends SmartContractLib {
    // Rabin signature verifier for WitnessOnChain.
    // https://witnessonchain.com

    @method()
    static hash(x: ByteString): ByteString {
        // expand into 3072 bit hash
        let hx: ByteString = sha256(x)
        for (let i = 0; i < 11; i++) {
            hx += sha256(hx)
        }
        return hx
    }

    @method()
    static verifySig(
        msg: ByteString,
        sig: RabinSig,
        pubKey: RabinPubKey
    ): boolean {
        const h = Utils.fromLEUnsigned(RabinVerifierWOC.hash(msg + sig.padding))
        return (sig.s * sig.s) % pubKey == h % pubKey
    }
}

export class PriceBet extends SmartContract {
    @prop()
    targetPrice: bigint

    @prop()
    decimal: bigint

    @prop()
    symbol: ByteString

    @prop()
    timestampFrom: bigint

    @prop()
    timestampTo: bigint

    @prop()
    oraclePubKey: RabinPubKey

    @prop()
    alicePkh: PubKeyHash

    @prop()
    bobPkh: PubKeyHash

    constructor(
        targetPrice: bigint,
        decimal: bigint,
        symbol: ByteString,
        timestampFrom: bigint,
        timestampTo: bigint,
        oraclePubKey: RabinPubKey,
        alicePkh: PubKeyHash,
        bobPkh: PubKeyHash
    ) {
        super(...arguments)
        this.targetPrice = targetPrice
        this.decimal = decimal
        this.symbol = symbol
        this.timestampFrom = timestampFrom
        this.timestampTo = timestampTo
        this.oraclePubKey = oraclePubKey
        this.alicePkh = alicePkh
        this.bobPkh = bobPkh
    }

    @method()
    public unlock(msg: ByteString, sig: RabinSig) {
        // Verify oracle signature.
        assert(
            RabinVerifierWOC.verifySig(msg, sig, this.oraclePubKey),
            'Oracle sig verify failed.'
        )

        // Decode data.
        // 4 bytes timestamp (LE) + 8 bytes rate (LE) + 1 byte decimal + 16 bytes symbol
        const timestamp = Utils.fromLEUnsigned(msg.slice(0, 8))
        const price = Utils.fromLEUnsigned(msg.slice(8, 24))
        const decimal = Utils.fromLEUnsigned(msg.slice(24, 26))
        const symbol: ByteString = msg.slice(26, 58)

        // Validate data.
        assert(timestamp >= this.timestampFrom, 'Timestamp too early.')
        assert(timestamp <= this.timestampTo, 'Timestamp too late.')
        assert(decimal == this.decimal, 'Wrong decimal.')
        assert(symbol == this.symbol, 'Wrong symbol.')

        // Include output that pays the winner.
        const outAmount = this.ctx.utxo.value // Include all sats from contract instance.
        const winner = price >= this.targetPrice ? this.alicePkh : this.bobPkh
        const out = Utils.buildPublicKeyHashOutput(winner, outAmount)
        assert(this.ctx.hashOutputs == hash256(out), 'hashOutputs mismatch')
    }
}
