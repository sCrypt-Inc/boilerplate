import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { FixedArray, PubKey, Sig, bsv, SignatureResponse } from 'scrypt-ts'
import { PrivateKeyPuzzle } from '../src/contracts/privateKeyPuzzle'
import { getDefaultSigner } from './utils/helper'
import { myPrivateKey, myPublicKey } from './utils/privateKey'
import { DEFAULT_SIGHASH_TYPE, DEFAULT_FLAGS } from 'scryptlib'

use(chaiAsPromised)

describe('Test SmartContract `PrivateKeyPuzzle`', () => {
    before(() => {
        PrivateKeyPuzzle.loadArtifact()
    })

    it('should pass using codeseparator', async () => {
        const p2pkh = new PrivateKeyPuzzle(PubKey(myPublicKey.toByteString()))

        await p2pkh.connect(getDefaultSigner())

        await p2pkh.deploy(1)

        const k = new bsv.crypto.BN(123) // Sigs must use same k value.

        // call public function `unlockCodeSep` of this contract
        const callContract = async () =>
            p2pkh.methods.unlockCodeSep((sigResponses: SignatureResponse[]) => {
                const sig0 = signTxCustomK(
                    k,
                    p2pkh.to?.tx as bsv.Transaction,
                    myPrivateKey,
                    p2pkh.lockingScript,
                    p2pkh.balance
                )
                const sig1 = signTxCustomK(
                    k,
                    p2pkh.to?.tx as bsv.Transaction,
                    myPrivateKey,
                    p2pkh.lockingScript.subScript(0),
                    p2pkh.balance
                )

                return [sig0, sig1] as FixedArray<Sig, 2>
            })
        return expect(callContract()).not.rejected
    })

    it('should pass using different sighash flag', async () => {
        const p2pkh = new PrivateKeyPuzzle(PubKey(myPublicKey.toByteString()))

        await p2pkh.connect(getDefaultSigner())

        await p2pkh.deploy(1)

        const k = new bsv.crypto.BN(123) // Sigs must use same k value.

        // call public function `unlockCodeSep` of this contract
        const callContract = async () =>
            p2pkh.methods.unlockSigHash((sigResponses: SignatureResponse[]) => {
                const sig0 = signTxCustomK(
                    k,
                    p2pkh.to?.tx as bsv.Transaction,
                    myPrivateKey,
                    p2pkh.lockingScript,
                    p2pkh.balance,
                    bsv.crypto.Signature.ANYONECANPAY_SINGLE
                )
                const sig1 = signTxCustomK(
                    k,
                    p2pkh.to?.tx as bsv.Transaction,
                    myPrivateKey,
                    p2pkh.lockingScript,
                    p2pkh.balance,
                    bsv.crypto.Signature.NONE
                )

                return [sig0, sig1] as FixedArray<Sig, 2>
            })
        return expect(callContract()).not.rejected
    })
})

function signTxCustomK(
    k: bsv.crypto.BN,
    tx: bsv.Transaction,
    privateKey: bsv.PrivateKey,
    subscript: bsv.Script,
    inputSatoshis: number,
    sighashType: number = DEFAULT_SIGHASH_TYPE,
    inputIndex = 0,
    flags: number = DEFAULT_FLAGS
): Sig {
    const satoshisBN = new bsv.crypto.BN(inputSatoshis)

    const hashbuf = bsv.Transaction.Sighash.sighash(
        tx,
        sighashType,
        inputIndex,
        subscript,
        satoshisBN,
        flags
    )

    const d = privateKey.bn

    const e = bsv.crypto.BN.fromBuffer(hashbuf, { endian: 'little' })

    const N = bsv.crypto.Point.getN()
    const G = bsv.crypto.Point.getG()
    // try different values of k until r, s are valid
    const _k = k
    const Q = G.mul(_k)
    const r = new bsv.crypto.BN(1).mul(Q.x.umod(N))
    let s = (_k.invm(N).mul(e.add(d.mul(r))) as any).umod(N)

    if (r.cmp(bsv.crypto.BN.Zero) <= 0 || s.cmp(bsv.crypto.BN.Zero) <= 0) {
        throw new Error('Wrong r or s. Retry with new k')
    }

    // enforce low s
    // see BIP 62, "low S values in signatures"
    if (
        s.gt(
            bsv.crypto.BN.fromBuffer(
                Buffer.from(
                    '7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0',
                    'hex'
                )
            )
        )
    ) {
        s = bsv.crypto.Point.getN().sub(s)
    }

    const rnbuf = r.toBuffer()
    const snbuf = s.toBuffer()

    const rneg = !!(rnbuf[0] & 0x80)
    const sneg = !!(snbuf[0] & 0x80)

    const rbuf = rneg ? Buffer.concat([Buffer.from([0x00]), rnbuf]) : rnbuf
    const sbuf = sneg ? Buffer.concat([Buffer.from([0x00]), snbuf]) : snbuf

    const rlength = rbuf.length
    const slength = sbuf.length
    const length = 2 + rlength + 2 + slength
    const rheader = 0x02
    const sheader = 0x02
    const header = 0x30

    const sh = Buffer.from([sighashType])

    const der = Buffer.concat([
        Buffer.from([header, length, rheader, rlength]),
        rbuf,
        Buffer.from([sheader, slength]),
        sbuf,
        sh,
    ])
    return Sig(der.toString('hex'))
}
