import { OrdinalNFT } from 'scrypt-ord'
import {
    assert,
    hash256,
    method,
    prop,
    PubKey,
    Addr,
    Sig,
    SigHash,
    bsv,
    MethodCallOptions,
    pubKey2Addr,
    Utils,
} from 'scrypt-ts'

export class OrdinalLock extends OrdinalNFT {
    @prop()
    seller: Addr

    @prop()
    price: bigint

    constructor(seller: Addr, price: bigint) {
        super()
        this.init(...arguments)

        this.seller = seller
        this.price = price
    }

    @method(SigHash.ANYONECANPAY_ALL)
    public purchase(dest: Addr) {
        let outputs = Utils.buildPublicKeyHashOutput(dest, 1n)
        outputs += Utils.buildPublicKeyHashOutput(this.seller, this.price)
        outputs += this.buildChangeOutput()
        assert(hash256(outputs) == this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    public cancel(sig: Sig, pubkey: PubKey) {
        assert(this.seller == pubKey2Addr(pubkey), 'bad seller')
        assert(this.checkSig(sig, pubkey), 'signature check failed')
    }
}

export function purchaseTxBuilder(
    current: OrdinalLock,
    options: MethodCallOptions<OrdinalLock>,
    dest: Addr
): Promise<any> {
    const unsignedTx: bsv.Transaction = new bsv.Transaction()
        .addInput(current.buildContractInput())
        .addOutput(
            new bsv.Transaction.Output({
                script: bsv.Script.fromHex(
                    Utils.buildPublicKeyHashScript(dest)
                ),
                satoshis: 1,
            })
        )
        // build auctioneer payment output
        .addOutput(
            new bsv.Transaction.Output({
                script: bsv.Script.fromHex(
                    Utils.buildPublicKeyHashScript(current.seller)
                ),
                satoshis: Number(current.price),
            })
        )

    if (options.changeAddress) {
        unsignedTx.change(options.changeAddress)
    }

    const result = {
        tx: unsignedTx,
        atInputIndex: 0, // the contract input's index
    }

    return Promise.resolve(result)
}
