import { SmartContractLib, byteString2Int, int2ByteString, method, assert, SmartContract} from "scrypt-ts";

//
export class Shift extends SmartContractLib{

    // return 2^n
    @method()
    static pow2 (n : bigint) : bigint {

        return byteString2Int(
            int2ByteString(0n, n/8n)
        );
    }

    // binary left shift number x by n places
    @method()
    static left (x : bigint, n : bigint) : bigint {

        return x * Shift.pow2(n);
    }

    // binary right shift number x by n places
    @method()
    static right (x : bigint, n : bigint) : bigint {

        return x / Shift.pow2(n);
    }

}

export class ShiftTest extends SmartContract{

    @method()
    public pow2(n : bigint, x : bigint){
        assert(Shift.pow2(n) == x)
    }

    @method()
    public left(x : bigint, y : bigint, z : bigint){
        assert(Shift.left(x,y) == z)
    }

    @method()
    public right(x : bigint, y : bigint, z : bigint){
        assert(Shift.right(x, y) == z)
    }
}
