/**
 * a contract calling quadratic equation contract
 
 * https://xiaohuiliu.medium.com/inter-contract-call-on-bitcoin-f51869c08be
 */

import {
    Addr,
    ByteString,
    SmartContract,
    Utils,
    assert,
    byteString2Int,
    hash256,
    len,
    method,
    prop,
    slice,
} from 'scrypt-ts'
import { Coeff } from './callee'
import { TxUtil } from './txUtil'


export class Caller extends SmartContract {
    @prop()
    static readonly N: bigint = 2n
    @prop()
    static readonly calleeContractInputIndex: bigint = 1n
    // hash of the callee contract, i.e., its locking script
    @prop()
    calleeContractHash: Addr

    constructor(calleeContractHash: Addr) {
        super(...arguments)
        this.calleeContractHash = calleeContractHash
    }

    @method()
    public calls(
        co: Coeff,
        prevouts: ByteString,
        calleeContractTx: ByteString,
        outputScript: ByteString,
        amount: bigint
    ) {
        assert(
            TxUtil.verifyContractByHash(
                prevouts,
                Caller.calleeContractInputIndex,
                calleeContractTx,
                this.calleeContractHash
            )
        )

        let l = len(outputScript)
        const a: bigint = byteString2Int(
            slice(outputScript, l - 4n * Caller.N, l - 3n * Caller.N)
        )
        const b: bigint = byteString2Int(
            slice(outputScript, l - 3n * Caller.N, l - 2n * Caller.N)
        )
        const c: bigint = byteString2Int(
            slice(outputScript, l - 2n * Caller.N, l - Caller.N)
        )
        assert(co.a === a && co.b === b && co.c === c)
        const x: bigint = byteString2Int(slice(outputScript, l - Caller.N))
        // ------>> x must be a root for the following quadatic equition: no need to double check
        // require(a * x * x + b * x + c == 0);

        const output: ByteString = Utils.buildOutput(outputScript, amount)
        assert(hash256(output) == this.ctx.hashOutputs)
    }
}
