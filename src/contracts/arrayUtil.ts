import { method, SmartContractLib, ByteString } from 'scrypt-ts'

// A library that emulates an array interface on top of a ByteString.
export class ArrayUtils extends SmartContractLib {
    // Get the byte at the given index.
    @method()
    static getElemAt(b: ByteString, idx: bigint): ByteString {
        return b.slice(Number(idx) * 2, Number(idx) * 2 + 2)
    }

    // Set the byte at the given index.
    @method()
    static setElemAt(b: ByteString, idx: bigint, val: ByteString): ByteString {
        return b.slice(0, Number(idx) * 2) + val + b.slice(Number(idx) * 2 + 2)
    }
}
