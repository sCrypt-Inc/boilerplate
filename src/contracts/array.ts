import {
    toByteString,
    len,
    assert,
    ByteString,
    SmartContract,
    slice,
    SmartContractLib,
    prop,
    method,
    int2ByteString,
    byteString2Int,
} from 'scrypt-ts'

export class Arrays extends SmartContractLib {
    @prop()
    data: ByteString

    static readonly DATALEN: bigint = 1n
    @prop()
    static readonly EMPTY: ByteString = toByteString('')
    static readonly MAX_SIZE = 9
    static readonly INVALID: bigint = -9999999999n

    constructor(data: ByteString) {
        super(...arguments)
        this.data = Arrays.EMPTY
    }

    @method()
    push(x: bigint): boolean {
        this.data += int2ByteString(x, Arrays.DATALEN)
        return true
    }

    @method()
    pop(): bigint {
        let result: bigint = Arrays.INVALID
        const maxIndex = this.length() - 1n
        if (maxIndex > -1) {
            const valueRaw: ByteString = slice(
                this.data,
                maxIndex * Arrays.DATALEN,
                (maxIndex + 1n) * Arrays.DATALEN
            )
            result = byteString2Int(valueRaw)
            this.data = slice(this.data, 0n, maxIndex)
        }
        return result
    }

    @method()
    indexOf(x: bigint): bigint {
        let result: bigint = -1n
        let done: boolean = false
        const length = this.length()
        for (let i = 0n; i < Arrays.MAX_SIZE; i++) {
            if (i < length) {
                if (!done) {
                    const valueRaw: ByteString = slice(
                        this.data,
                        i * Arrays.DATALEN,
                        (i + 1n) * Arrays.DATALEN
                    )
                    const value: bigint = byteString2Int(valueRaw)
                    if (value == x) {
                        result = i
                        done = true
                    }
                }
            }
        }
        return result
    }

    @method()
    at(index: bigint): bigint {
        let result: bigint = Arrays.INVALID
        const done: boolean = false
        const length: bigint = this.length()
        if (index >= 0n && index < length) {
            const valueRaw: ByteString = slice(
                this.data,
                index * Arrays.DATALEN,
                (index + 1n) * Arrays.DATALEN
            )
            result = byteString2Int(valueRaw)
        }
        return result
    }

    @method()
    length(): bigint {
        return BigInt(len(this.data)) / Arrays.DATALEN
    }

    @method()
    clear(): boolean {
        let done: boolean = false
        const length: bigint = this.length()
        if (length > 0n) {
            this.data = toByteString('')
            done = true
        }
        return done
    }
}

export class ArraysTest extends SmartContract {
    @method()
    public test(x: bigint) {
        const a: Arrays = new Arrays(toByteString('009876'))
        a.push(33n)
        a.push(99n)
        a.push(88n)
        a.push(-1n)
        a.push(-9n)

        let index: bigint = a.indexOf(2n)
        assert(index == -1n)
        index = a.indexOf(99n)
        assert(index == 1n)
        index = a.indexOf(-1n)
        assert(index == 3n)
        index = a.indexOf(-9n)
        assert(index == 4n)

        let value: bigint = a.at(0n)
        assert(value == 33n)
        value = a.at(1n)
        assert(value == 99n)
        value = a.at(2n)
        assert(value == 88n)
        value = a.at(3n)
        assert(value == -1n)
        value = a.at(4n)
        assert(value == -9n)
        value = a.at(5n)
        assert(value == Arrays.INVALID)

        let top: bigint = a.pop()
        assert(top == -9n)
        top = a.pop()
        assert(top == -1n)
        top = a.pop()
        assert(top == 88n)
        top = a.pop()
        assert(top == 99n)
        top = a.pop()
        assert(top == 33n)
        top = a.pop()
        assert(top == Arrays.INVALID)
        a.push(-9n)
        a.clear()
        assert(a.length() == 0n)
    }
}
