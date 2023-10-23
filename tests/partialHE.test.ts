import { expect, use } from 'chai'
import { CT, PartialHE } from '../src/contracts/partialHE'
import { getDefaultSigner } from './utils/helper'
import { MethodCallOptions, PubKey, bsv } from 'scrypt-ts'
import { Point, SECP256K1 } from 'scrypt-ts-lib'

import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

function encryptNumber(m: bigint, Q: Point): [CT, bigint] {
    const r = BigInt(bsv.PrivateKey.fromRandom().toBigNumber().toString())

    const c1 = SECP256K1.mulByScalar(SECP256K1.G, r)
    const c2_0 = SECP256K1.mulByScalar(Q, r)
    const c2_1 = SECP256K1.mulByScalar(SECP256K1.G, m)
    const c2 = SECP256K1.addPoints(c2_0, c2_1)

    return [{ c1, c2 }, r]
}

function decrypt(ct: CT, k: bigint): Point {
    const negc1 = SECP256K1.negatePoint(ct.c1)
    const kNegc1 = SECP256K1.mulByScalar(negc1, k)
    return SECP256K1.addPoints(ct.c2, kNegc1)
}

describe('Test SmartContract `PartialHE`', () => {
    // For mG maps mG.x to m
    let lookupTable: Map<bigint, bigint>

    before(() => {
        PartialHE.loadArtifact()

        // Construct lookup table mG for m: [0, 1000]
        lookupTable = new Map<bigint, bigint>()
        for (let i = 0; i <= 1000; i++) {
            const mG = SECP256K1.mulByScalar(SECP256K1.G, BigInt(i))
            lookupTable.set(mG.x, BigInt(i))
        }
    })

    it('should pass the public method unit test successfully.', async () => {
        const priv = bsv.PrivateKey.fromRandom()
        const pub = new bsv.PublicKey(priv.publicKey.point, {
            compressed: false, // Make sure the public key is in uncompressed form.
        })

        const k = BigInt(priv.toBigNumber().toString())
        const Q = SECP256K1.pubKey2Point(PubKey(pub.toByteString()))

        const _Q = SECP256K1.mulByScalar(SECP256K1.G, k)

        const [salarySum] = encryptNumber(0n, Q)

        const instance = new PartialHE(salarySum)
        await instance.connect(getDefaultSigner())

        await instance.deploy(1)

        // set current instance to be the deployed one
        let currentInstance = instance

        // call the method of current instance to apply the updates on chain
        for (let i = 0; i < 5; ++i) {
            // create the next instance from the current
            const nextInstance = currentInstance.next()

            // apply updates on the next instance off chain
            const [toAdd] = encryptNumber(100n, Q)
            nextInstance.salarySum = PartialHE.addCT(
                currentInstance.salarySum,
                toAdd
            )

            // call the method of current instance to apply the updates on chain
            const callContract = async () =>
                currentInstance.methods.add(toAdd, {
                    next: {
                        instance: nextInstance,
                        balance: 1,
                    },
                } as MethodCallOptions<PartialHE>)
            await expect(callContract()).not.rejected

            // update the current instance reference
            currentInstance = nextInstance
        }

        // Decrypt and check end result.
        const mG = decrypt(currentInstance.salarySum, k)
        const _mG = SECP256K1.mulByScalar(SECP256K1.G, 500n)
        expect(mG.x === _mG.x && mG.y === _mG.y).to.be.true

        // Since decryption only gives us mG, we need to solve ECDLP to get the actual m.
        // For small values of m we can utilize a lookup table.
        const m = lookupTable.get(mG.x)
        expect(m == 500n).to.be.true
    })
})
