import {
SmartContractLib,
method,
ByteString} from 'scrypt-ts'

export class ArrayUtil extends SmartContractLib{
// get the byte at the given index
@method()
static getElemAt(b : ByteString, idx : bigint) : ByteString{

return b[idx : idx + 1 ]
}

// set the byte at the given index

@method()
static setElemAt(b : ByteString, idx : bigint,bytevalue : ByteString) : ByteString{

return b[: idx] + bytevalue + b[idx + 1:]
}
}