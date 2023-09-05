import { ByteString, 
         SmartContractLib, 
         Utils, 
         hash256, 
         int2ByteString,
         assert, 
         SmartContract,
         method, 
         prop, 
         reverseByteString, 
         toByteString 
} from "scrypt-ts";

export class Base58 extends SmartContractLib{
    @prop()
    static readonly P2PKH_verbyte_mainnet : ByteString = toByteString('00', true)

    @prop()
    static readonly P2PKH_verbyte_testnet : ByteString = toByteString('6f', true)


    @method()
    static base58EncodeCheckAddr (addr : ByteString, verbyte : ByteString) : ByteString {
        const payload : ByteString = verbyte + addr

        const bebytes : ByteString = payload + hash256(payload)

        let addrInt : bigint = Utils.fromLEUnsigned(reverseByteString(bebytes, 24n))

        let res : ByteString = toByteString('',true)

        let done : boolean = false

        for(let i = 0; i < 33; i ++){
            if (addrInt <= 0){
                done = true
            }
            if (!done){
                let tmp : bigint = addrInt / 58n

                let carry : bigint = addrInt % 58n

                res = int2ByteString(carry, 1n) + res

                addrInt = tmp
            }
        }
        return res
    }

}

export class Base58Test extends SmartContract {
    @method()
    public main(addr: ByteString) {
        const verbyte: ByteString = Base58.P2PKH_verbyte_mainnet

        const result: ByteString = Base58.base58EncodeCheckAddr(addr, verbyte)

        assert(result == addr)
    }
}
