// a de/serializer for basic types

import {
    SmartContract,
    prop,
    ByteString,
    method,
    len,
    toByteString,
    byteString2Int,
    slice,
    Utils,
    assert,
    SmartContractLib,
    reverseByteString,
    int2ByteString,
} from 'scrypt-ts'

export class Reader extends SmartContractLib {
    // fixed number of bytes to denote length serialized state, including varint prefix (1 byte) + length (2 bytes)
    // change this length to 4 when you need PushData4
    static readonly StateLen: bigint = 3n

    @prop()
    buf: ByteString
    @prop()
    pos: bigint

    constructor(buf: ByteString) {
        super(...arguments)
        this.buf = buf
        this.pos = 0n
    }

    @method()
    eof(): boolean {
        return this.pos >= len(this.buf)
    }

    @method()
    readBytes(): ByteString {
        let len: bigint = 0n
        const b: ByteString = this.buf
        let ret = toByteString('')
        const header: bigint = byteString2Int(slice(b, this.pos, this.pos + 1n))
        this.pos++

        if (header < 0x4c) {
            len = header
            ret = slice(b, this.pos, this.pos + len)
        } else if (header == 0x4cn) {
            len = Utils.fromLEUnsigned(slice(b, this.pos, this.pos + 1n))
            this.pos += 1n
            ret = slice(b, this.pos, this.pos + len)
        } else if (header == 0x4dn) {
            len = Utils.fromLEUnsigned(slice(b, this.pos, this.pos + 2n))
            this.pos += 2n
            ret = slice(b, this.pos, this.pos + len)
        } else if (header == 0x4en) {
            len = Utils.fromLEUnsigned(slice(b, this.pos, this.pos + 1n))
            this.pos += 4n
            ret = slice(b, this.pos, this.pos + len)
        } else {
            // shall not reach here
            assert(false)
        }

        this.pos += len
        return ret
    }

    @method()
    readBool(): boolean {
        const b: ByteString = slice(this.buf, this.pos, this.pos + 1n)
        this.pos++
        return toByteString('00') != b
    }

    @method()
    readInt(): bigint {
        return byteString2Int(this.readBytes())
    }

    @method()
    static getStateStart(scriptCode: ByteString): bigint {
        // locking script: code + opreturn + data(state + state_len)
        const scriptLen: bigint = len(scriptCode)
        // read state length: +1 to skip varint prefix
        const lb: ByteString = slice(
            scriptCode,
            scriptLen - Reader.StateLen + 1n
        )
        const stateLen: bigint = byteString2Int(lb)
        return scriptLen - stateLen - Reader.StateLen
    }
}

export class Writer extends SmartContractLib {
    // return VarInt encoding

    @method()
    static writeBytes(b: ByteString): ByteString {
        const n: bigint = len(b)

        let header: ByteString = toByteString('')

        if (n < 0x4c) {
            header = Utils.toLEUnsigned(n, 1n)
        } else if (n < 0x100) {
            header = toByteString('4c') + Utils.toLEUnsigned(n, 1n)
        } else if (n < 0x10000) {
            header = toByteString('4d') + Utils.toLEUnsigned(n, 2n)
        } else if (n < 0x100000000) {
            header = toByteString('4e') + Utils.toLEUnsigned(n, 4n)
        } else {
            // shall not reach here
            assert(false)
        }

        return header + b
    }

    // uses fixed 1 byte to represent a boolean, plus length
    @method()
    static writeBool(x: boolean): ByteString {
        return x ? toByteString('01') : toByteString('00')
    }

    // int is little endian
    @method()
    static writeInt(x: bigint): ByteString {
        return Writer.writeBytes(
            x == 0n ? toByteString('00') : int2ByteString(x)
        )
    }

    @method()
    static serializeState(stateBuf: ByteString): ByteString {
        // serialize state size
        const lenBuf: ByteString = Writer.writeBytes(
            int2ByteString(
                len(stateBuf),
                Reader.StateLen - 1n /* varint prefix byte */
            )
        )
        return stateBuf + lenBuf
    }
}

// test serializer
export class STest extends SmartContract {
    @method()
    public testBool(f: boolean) {
        const buf: ByteString = Writer.writeBool(f)

        const r: Reader = new Reader(buf)
        const f_: boolean = r.readBool()
        assert(f_ == f)
        assert(r.eof())
    }

    @method()
    public testBytes(b: ByteString) {
        const buf: ByteString = Writer.writeBytes(b)

        const r: Reader = new Reader(buf)
        const b_: ByteString = r.readBytes()
        assert(b_ == b)
        assert(r.eof())
    }

    @method()
    public testInt(i: bigint) {
        const buf: ByteString = Writer.writeInt(i)

        const r: Reader = new Reader(buf)
        const i_: bigint = r.readInt()
        assert(i_ == i)
        assert(r.eof())
    }

    @method()
    public main(f: boolean, b: ByteString, i: bigint) {
        {
            const buf: ByteString = Writer.writeBool(f)

            const r: Reader = new Reader(buf)
            const f_: boolean = r.readBool()
            assert(f_ == f)
            assert(r.eof())
        }
        {
            const buf: ByteString = Writer.writeBytes(b)

            const r: Reader = new Reader(buf)
            const b_: ByteString = r.readBytes()
            assert(b_ == b)
            assert(r.eof())
        }
        {
            const buf: ByteString = Writer.writeInt(i)

            const r: Reader = new Reader(buf)
            const i_: bigint = r.readInt()
            assert(i_ == i)
            assert(r.eof())
        }

        const buf: ByteString =
            Writer.writeInt(i) +
            Writer.writeBytes(b) +
            Writer.writeBytes(b) +
            Writer.writeBool(f) +
            Writer.writeInt(i) +
            Writer.writeBytes(b)

        const r: Reader = new Reader(buf)

        let i_: bigint = r.readInt()
        assert(i_ == i)
        assert(!r.eof())
        let b_: ByteString = r.readBytes()
        assert(b_ == b)
        b_ = r.readBytes()
        assert(b_ == b)
        const f_: boolean = r.readBool()
        assert(f_ == f)
        i_ = r.readInt()
        assert(i_ == i)
        b_ = r.readBytes()
        assert(b_ == b)
        assert(r.eof())
    }
}
