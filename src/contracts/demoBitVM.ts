import {
    ByteString,
    Ripemd160,
    SmartContract,
    assert,
    hash160,
    method,
    prop,
} from 'scrypt-ts'

/**
 * Demo of a gate commitment for BitVM.
 * https://gist.github.com/msinkec/5827d5285a18de8930324f67b880841e
 */

type HashPair = {
    hash0: Ripemd160
    hash1: Ripemd160
}

export class DemoBitVM extends SmartContract {
    @prop()
    hashPairA: HashPair

    @prop()
    hashPairB: HashPair

    @prop()
    hashPairE: HashPair

    constructor(hashPairA: HashPair, hashPairB: HashPair, hashPairE: HashPair) {
        super(...arguments)
        this.hashPairA = hashPairA
        this.hashPairB = hashPairB
        this.hashPairE = hashPairE
    }

    @method()
    public openGateCommit(
        preimageA: ByteString,
        preimageB: ByteString,
        preimageE: ByteString
    ) {
        const bitA = this.bitValueCommit(this.hashPairA, preimageA)
        const bitB = this.bitValueCommit(this.hashPairB, preimageB)
        const bitE = this.bitValueCommit(this.hashPairE, preimageE)
        assert(this.nand(bitA, bitB) == bitE)
    }

    @method()
    bitValueCommit(hashPair: HashPair, preimage: ByteString): boolean {
        const h = hash160(preimage)
        assert(h == hashPair.hash0 || h == hashPair.hash1)
        return h == hashPair.hash1
    }

    @method()
    nand(A: boolean, B: boolean): boolean {
        return !(A && B)
    }
}
