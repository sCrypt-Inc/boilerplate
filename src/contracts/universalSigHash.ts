import "ec.scrypt";
import {
    assert
} from 'console'
import {
    prop,
    method,
    Sig,
    PubKey,
    ByteString,
    SmartContract
} from 'scrypt-ts'

// a template to implement any new SIGHASH flags
export class UniversalSigHash extend SmartContract {
    @prop()
    pubKey: PubKey

    constructor(pubKey: PubKey) {
        super(...arguments)
        this.pubKey = pubKey
    }

    // sig is with SIGHASH flag SIGHASH_NOINPUT
    @method()
    public checkSigHashNoInput(Sig: sig) {

        /* reconstruct the new sighash being signed */
        const sighash1: ByteString = sighash[: 4];
        // set item 2, 3, and 4 to 0
        const blankedSighash2to3: ByteString = b'00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
        const sighash5to10: ByteString = sighash[104:];
        const sighashNew: ByteString = sighash1 + blankedSighash2to3 + sighash5to10;

        // check signature against the new sighash using elliptic curve library
        assert(EC.verifySig(sighashNew, sig, this.pubKey));
    }
}