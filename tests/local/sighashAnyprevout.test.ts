import { expect, use } from 'chai'
import { SigHashAnyprevout } from '../../src/contracts/sighashAnyprevout'
import {
    ByteString,
    MethodCallOptions,
    PubKey,
    UTXO,
    Utils,
    bsv,
    hash160,
    hash256,
    slice,
    toByteString,
} from 'scrypt-ts'
import { getDummySigner, getDummyUTXO } from '../utils/helper'
import chaiAsPromised from 'chai-as-promised'
import { Point, SECP256K1, Signature } from 'scrypt-ts-lib'
import { myAddress } from '../utils/privateKey'

use(chaiAsPromised)

function getUnsignedTx(
    current: SigHashAnyprevout,
    fromUTXO: UTXO,
    changeAddress: bsv.Address
): bsv.Transaction {
    const destAddr = hash160(SECP256K1.point2PubKey(current.pubKey)) // Note that the provided pub key will need to be in uncompressed form again.
    return new bsv.Transaction()
        .addInput(current.buildContractInput(fromUTXO))
        .addOutput(
            new bsv.Transaction.Output({
                script: bsv.Script.fromHex(
                    Utils.buildPublicKeyHashScript(destAddr)
                ),
                satoshis: fromUTXO.satoshis,
            })
        )
        .change(changeAddress)
}

function getSig(
    signingKey: bsv.PrivateKey,
    current: SigHashAnyprevout,
    fromUTXO: UTXO,
    changeAddress: bsv.Address
): Signature {
    const unsignedTx = getUnsignedTx(current, fromUTXO, changeAddress)

    // Get preimage and modify it by blanking out excluded parts (w zero bytes).
    const preimage = toByteString(
        unsignedTx.getPreimage(0, bsv.crypto.Signature.ANYONECANPAY_SINGLE)
    )
    const preimage1 = slice(preimage, 0n, 4n)
    // Mask hashPrevouts, hashSequence, outpoint.
    const blankedPreimage2to3 = toByteString(
        '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
    )
    const preimage5to10 = slice(preimage, 104n)
    const preimageNew = ((preimage1 as ByteString) +
        blankedPreimage2to3 +
        preimage5to10) as ByteString

    // Produce Signature
    const hashBuff = Buffer.from(hash256(preimageNew), 'hex')
    const sigObj = bsv.crypto.ECDSA.sign(hashBuff, signingKey)
    return {
        r: BigInt(sigObj['r'].toString()),
        s: BigInt(sigObj['s'].toString()),
    }
}

describe('Heavy: Test SmartContract `SigHashAnyprevout`', () => {
    let key: bsv.PrivateKey
    let pubKey: bsv.PublicKey
    let pubKeyP: Point
    let sighashAnyprevout: SigHashAnyprevout

    before(async () => {
        key = bsv.PrivateKey.fromRandom()
        pubKey = new bsv.PublicKey(key.publicKey.point, {
            compressed: false, // Make sure the public key is in uncompressed form.
        })
        pubKeyP = SECP256K1.pubKey2Point(PubKey(pubKey.toHex()))

        await SigHashAnyprevout.compile()

        sighashAnyprevout = new SigHashAnyprevout(pubKeyP)
        await sighashAnyprevout.connect(getDummySigner())
    })

    it('should pass `unlock`', async () => {
        const sig = getSig(key, sighashAnyprevout, getDummyUTXO(), myAddress)

        sighashAnyprevout.bindTxBuilder(
            'unlock',
            (
                current: SigHashAnyprevout,
                options: MethodCallOptions<SigHashAnyprevout>,
                ...args: any
            ) => {
                // This ensures the SIGHASH_ANYPREVOUT signature used the same tx template.
                const unsignedTx: bsv.Transaction = getUnsignedTx(
                    current,
                    options.fromUTXO,
                    options.changeAddress
                )

                return Promise.resolve({
                    tx: unsignedTx,
                    atInputIndex: 0,
                    nexts: [],
                })
            }
        )

        const { tx: callTx, atInputIndex } =
            await sighashAnyprevout.methods.unlock(sig, {
                changeAddress: myAddress,
                fromUTXO: getDummyUTXO(),
            } as MethodCallOptions<SigHashAnyprevout>)
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })
})
