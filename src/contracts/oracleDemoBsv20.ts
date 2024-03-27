import {
    ByteString,
    SmartContract,
    Utils,
    assert,
    method,
    prop,
    slice,
} from 'scrypt-ts'
import { RabinPubKey, RabinSig, WitnessOnChainVerifier } from 'scrypt-ts-lib'

type Msg = {
    marker: bigint // 1 byte, api marker
    timestamp: bigint // 4 bytes LE
    network: bigint // 1 byte, 1 for mainnet, 0 for testnet
    outpoint: ByteString // 36 bytes, txid 32 bytes LE + vout 4 bytes LE
    fungible: bigint // 1 byte, token type, 1 for BSV20, 0 for NFT
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
            outpoint: slice(msg, 6n, 42n),
            fungible: Utils.fromLEUnsigned(slice(msg, 42n, 43n)),
            amt: Utils.fromLEUnsigned(slice(msg, 43n, 51n)),
            id: slice(msg, 51n),
        }
    }

    @method()
    public unlock(msg: ByteString, sig: RabinSig, tokenInputIndex: bigint) {
        // retrieve token outpoint from prevouts
        const outpoint = slice(
            this.prevouts,
            tokenInputIndex * 36n,
            (tokenInputIndex + 1n) * 36n
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
        assert(message.outpoint == outpoint, 'incorrect token outpoint')
        assert(message.fungible == 1n, 'incorrect token type')
        assert(message.amt >= this.amt, 'incorrect token amount')
        assert(message.id == this.inscriptionId, 'incorrect inscription id')
        // do other validations ...
    }
}
