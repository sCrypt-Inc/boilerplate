import {
SmartContractLib,
method,
ByteString} from 'scrypt-ts'

export class ArrayUtil extends SmartContractLib{
// get the byte at the given index
    @method()
    static getElemAt(b: ByteString, idx: bigint): ByteString {
        return b.slice(Number(idx) * 2, Number(idx) * 2 + 2)
    }

// set the byte at the given index

@method()
    static setElemAt(b: ByteString, idx: bigint, val: ByteString): ByteString {
        return b.slice(0, Number(idx) * 2) + val + b.slice(Number(idx) * 2 + 2)
    }
}
