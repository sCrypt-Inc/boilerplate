import {
SmartContractLib,
method,
ByteString} from 'scrypt-ts'

export class ArrayUtil extends SmartContractLib{
// get the byte at the given index
@method()
static getElemAt(b : ByteString, idx : bigint) : bigint{
idx = idx + 1n
return idx 
}

// set the byte at the given index

@method()
static setElemAt(b : ByteString, idx : bigint,bytevalue : ByteString) : ByteString{

return idx + bytevalue + idx + 1
}
}