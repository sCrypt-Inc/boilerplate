import {
    and,
    assert,
    ByteString,
    byteString2Int,
    FixedArray,
    hash256,
    lshift,
    method,
    prop,
    slice,
    SmartContract,
} from 'scrypt-ts'

// 512 * 256 bit random byte strings
export type LamportPubKey = ByteString

// For msg of 256 bits.
export type LamportSig = ByteString

export class LamportP2PK extends SmartContract {
    @prop()
    pubKey: LamportPubKey

    constructor(pubKey: LamportPubKey) {
        super(...arguments)
        this.pubKey = pubKey
    }

    @method()
    public unlock(sig: LamportSig) {
        const m = byteString2Int(hash256(this.ctx.serialize()))

        // Loop over each bit of the message.
        for (let i = 0; i < 256; i++) {
            let offset = 0n
            if (and(lshift(m, BigInt(i)), 1n) == 0n) {
                offset = 256n * 32n
            }

            const start = BigInt(i) * 32n
            const sigChunk = slice(sig, start, start + 32n)

            const pkChunkStart = offset + start
            const pkChunk = slice(this.pubKey, pkChunkStart, pkChunkStart + 32n)
            assert(hash256(sigChunk) == pkChunk, `sig chunk ${i} hash mismatch`)
        }
    }
}
