// You can read about this contract at :
// https://en.wikipedia.org/wiki/Rabin_signature_algorithm
import {
    ByteString,
    SmartContractLib,
    Utils,
    method,
    sha256,
    slice,
} from 'scrypt-ts'

import { RabinSig, RabinPubKey } from 'scrypt-ts-lib'

export class RabinSignature extends SmartContractLib {
    @method()
    static checkSig(
        msg: ByteString,
        sig: RabinSig,
        pubkey: RabinPubKey
    ): boolean {
        const h: bigint = Utils.fromLEUnsigned(
            RabinSignature.hash(msg + sig.padding)
        )
        return (sig.s * sig.s) % pubkey == h % pubkey
    }

    @method()
    static hash(x: ByteString): ByteString {
        // expand in to 512 bit hash

        const hx = sha256(x)
        return sha256(slice(hx, 0n, 16n)) + sha256(slice(hx, 16n, 32n))
    }
}
