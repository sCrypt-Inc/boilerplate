import {
    ByteString,
    SmartContract,
    Utils,
    assert,
    method,
    prop,
    reverseByteString,
    slice,
} from 'scrypt-ts'
import { RabinPubKey, RabinSig, WitnessOnChainVerifier } from 'scrypt-ts-lib'

type Msg = {
    marker: bigint // 1 byte, api marker
    timestamp: bigint // 4 bytes LE
    network: bigint // 1 byte, 1 for mainnet, 0 for testnet
    txid: ByteString // 32 bytes, txid
    vout: bigint // 4 bytes LE, output index
    bsv20: bigint // 1 byte, token type, 0 for NFT, 1 for BSV20
    amt: bigint // 8 bytes LE
    id: ByteString
}

export class OracleDemoBsv20 extends SmartContract {
    @prop()
    oraclePubKey: RabinPubKey

    @prop()
    inscriptionId: ByteString
    @prop()
    amt: bigint

    constructor(
        oraclePubKey: RabinPubKey,
        inscriptionId: ByteString,
        amt: bigint
    ) {
        super(...arguments)
        this.oraclePubKey = oraclePubKey
        this.inscriptionId = inscriptionId
        this.amt = amt
    }

    @method()
    static parseMsg(msg: ByteString): Msg {
        return {
            marker: Utils.fromLEUnsigned(slice(msg, 0n, 1n)),
            timestamp: Utils.fromLEUnsigned(slice(msg, 1n, 5n)),
            network: Utils.fromLEUnsigned(slice(msg, 5n, 6n)),
            txid: slice(msg, 6n, 38n),
            vout: Utils.fromLEUnsigned(slice(msg, 38n, 42n)),
            bsv20: Utils.fromLEUnsigned(slice(msg, 42n, 43n)),
            amt: Utils.fromLEUnsigned(slice(msg, 43n, 51n)),
            id: slice(msg, 51n),
        }
    }

    @method()
    public unlock(msg: ByteString, sig: RabinSig, tokenInputIndex: bigint) {
        // retrieve token outpoint from prevouts
        const txid = reverseByteString(
            slice(
                this.prevouts,
                tokenInputIndex * 36n,
                tokenInputIndex * 36n + 32n
            ),
            32n
        )
        const vout = Utils.fromLEUnsigned(
            slice(
                this.prevouts,
                tokenInputIndex * 36n + 32n,
                tokenInputIndex * 36n + 36n
            )
        )
        // verify oracle signature
        assert(
            WitnessOnChainVerifier.verifySig(msg, sig, this.oraclePubKey),
            'Oracle sig verify failed.'
        )
        // decode oracle data
        const message = OracleDemoBsv20.parseMsg(msg)
        // validate data
        assert(message.marker == 4n, 'incorrect oracle message type')
        assert(message.network == 0n, 'incorrect network')
        assert(message.txid == txid, 'incorrect token txid')
        assert(message.vout == vout, 'incorrect token vout')
        assert(message.bsv20 == 1n, 'incorrect token type')
        assert(message.amt >= this.amt, 'incorrect token amount')
        assert(message.id == this.inscriptionId, 'incorrect inscription id')
        // do other validations ...
    }
}
