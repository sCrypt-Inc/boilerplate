import {
    ByteString,
    assert,
    SigHash,
    SmartContract,
    Utils,
    hash256,
    int2ByteString,
    method,
    prop,
    MethodCallOptions,
    ContractTransaction,
    bsv
} from 'scrypt-ts'

//Read Medium article about this contract
//https://xiaohuiliu.medium.com/inter-contract-call-on-bitcoin-f51869c08be

export type Coeff = {
    a: bigint
    b: bigint
    c: bigint
}

export class Callee extends SmartContract {
    @prop()
    static readonly N: bigint = 2n

    @method(SigHash.SINGLE)
    public solve(co: Coeff, x: bigint) {
        assert(co.a * x * x + co.b * x + co.c == 0n)

        const data: ByteString =
            int2ByteString(co.a, Callee.N) +
            int2ByteString(co.b, Callee.N) +
            int2ByteString(co.c, Callee.N)

        const outputScript: ByteString = Utils.buildOpreturnScript(data)

        const output: ByteString = Utils.buildOutput(outputScript, 0n)

        assert(hash256(output) == this.ctx.hashOutputs)
    }
    static async buildTxForSolve(
        current: Callee,
        options: MethodCallOptions<Callee>,
        co : Coeff,
        x : bigint,
        
    ): Promise<ContractTransaction> {
        const defaultChangeAddress = await current.signer.getDefaultAddress()
        const data: ByteString =
        int2ByteString(co.a, Callee.N) +
        int2ByteString(co.b, Callee.N) +
        int2ByteString(co.c, Callee.N)

        const outputScript: ByteString = Utils.buildOpreturnScript(data)

        const unsignedTx: bsv.Transaction = new bsv.Transaction()
            // add contract input
            .addInput(current.buildContractInput(options.fromUTXO))

            // build output
            .addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.fromHex(
                        Utils.buildOpreturnScript(data)
                    ),
                    satoshis: current.balance,
                })
            )
        
            // build change output
            .change(options.changeAddress || defaultChangeAddress)

        return {
            tx: unsignedTx,
            atInputIndex: 0,
            nexts: [],
        }
    }

}
