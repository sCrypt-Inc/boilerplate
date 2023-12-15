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
    SmartContract,
} from 'scrypt-ts'

// 512 * 256 bit random byte strings
export type LamportPubKey = FixedArray<ByteString, 512>

// For msg of 256 bits.
export type LamportSig = FixedArray<ByteString, 256>

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
                offset = 256n
            }

            const sigChunk = sig[i]
            const pkChunk = this.pubKey[Number(offset) + i]
            assert(hash256(sigChunk) == pkChunk, `sig chunk ${i} hash mismatch`)
        }
    }
}
