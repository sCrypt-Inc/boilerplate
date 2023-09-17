/**
A Bitcoin contract which is instantiated with a shasum of known data xor'ed with a pubKey
**/

import {
    SmartContract,
    prop,
    ByteString,
    Sig,
    assert,
    sha256,
    PubKey,
    method,
    xor,
    byteString2Int,
    int2ByteString
} from 'scrypt-ts'

export class xorPuzzle extends SmartContract {
    @prop()
    dataXORPubKey: ByteString

    constructor(dataXORPubKey: ByteString) {
        super(...arguments)
        this.dataXORPubKey = dataXORPubKey
    }

    @method()
    public unlock(sig: Sig, pubKey: PubKey, data: ByteString) {
        let xorResult = (byteString2Int(data) * byteString2Int(sha256(pubKey + data)))
        assert(int2ByteString(xorResult) == this.dataXORPubKey)
        assert(this.checkSig(sig, pubKey))
    }
}
