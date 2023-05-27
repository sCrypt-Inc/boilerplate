import {
    SmartContract,
    prop,
    ByteString,
    method,
    assert,
    Utils,
    Sig,
    PubKey,
    slice,
} from 'scrypt-ts'
import { RabinSig, RabinPubKey, RabinVerifierWOC } from 'scrypt-ts-lib'

export type ExchangeRate = {
    timestamp: bigint
    price: bigint
    symbol: ByteString
}

/*
 * A betting contract that lets Alice and Bob bet on the price of the BSV-USDC pair
 * in the future. The price is obtained from a trusted oracle.
 * Read our Medium article for more information about using oracles in Bitcoin:
 * https://medium.com/coinmonks/access-external-data-from-bitcoin-smart-contracts-2ecdc7448c43
 */
export class PriceBet extends SmartContract {
    // Price target that needs to be reached.
    @prop()
    targetPrice: bigint

    // Symbol of the pair, e.g. "BSV_USDC"
    @prop()
    symbol: ByteString

    // Timestamp window in which the price target needs to be reached.
    @prop()
    timestampFrom: bigint
    @prop()
    timestampTo: bigint

    // Oracles Rabin public key.
    @prop()
    oraclePubKey: RabinPubKey

    // Public keys of both players.
    @prop()
    alicePubKey: PubKey
    @prop()
    bobPubKey: PubKey

    constructor(
        targetPrice: bigint,
        symbol: ByteString,
        timestampFrom: bigint,
        timestampTo: bigint,
        oraclePubKey: RabinPubKey,
        alicePubKey: PubKey,
        bobPubKey: PubKey
    ) {
        super(...arguments)
        this.targetPrice = targetPrice
        this.symbol = symbol
        this.timestampFrom = timestampFrom
        this.timestampTo = timestampTo
        this.oraclePubKey = oraclePubKey
        this.alicePubKey = alicePubKey
        this.bobPubKey = bobPubKey
    }

    // Parses signed message from the oracle.
    @method()
    static parseExchangeRate(msg: ByteString): ExchangeRate {
        // 4 bytes timestamp (LE) + 8 bytes rate (LE) + 1 byte decimal + 16 bytes symbol
        return {
            timestamp: Utils.fromLEUnsigned(slice(msg, 0n, 4n)),
            price: Utils.fromLEUnsigned(slice(msg, 4n, 12n)),
            symbol: slice(msg, 13n, 29n),
        }
    }

    @method()
    public unlock(msg: ByteString, sig: RabinSig, winnerSig: Sig) {
        // Verify oracle signature.
        assert(
            RabinVerifierWOC.verifySig(msg, sig, this.oraclePubKey),
            'Oracle sig verify failed.'
        )

        // Decode data.
        const exchangeRate = PriceBet.parseExchangeRate(msg)

        // Validate data.
        assert(
            exchangeRate.timestamp >= this.timestampFrom,
            'Timestamp too early.'
        )
        assert(
            exchangeRate.timestamp <= this.timestampTo,
            'Timestamp too late.'
        )
        assert(exchangeRate.symbol == this.symbol, 'Wrong symbol.')

        // Decide winner and check their signature.
        const winner =
            exchangeRate.price >= this.targetPrice
                ? this.alicePubKey
                : this.bobPubKey
        assert(this.checkSig(winnerSig, winner), 'Winner checkSig failed.')
    }
}
