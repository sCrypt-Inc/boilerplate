import { SmartContractLib, byteString2Int, int2ByteString, method} from "scrypt-ts";

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
