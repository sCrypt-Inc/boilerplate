import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {
    findSig,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    Sig,
    toHex,
    bsv,
    FixedArray,
    getDummySig,
    slice,
} from 'scrypt-ts'
import { MultiSigPayment } from '../../src/contracts/multiSig'
import { getDummySigner, getDummyUTXO } from '../utils/helper'

use(chaiAsPromised)

const privateKeys: bsv.PrivateKey[] = []
const publicKeys: bsv.PublicKey[] = []
const addresses: bsv.Address[] = []

for (let i = 0; i < 3; i++) {
    privateKeys.push(bsv.PrivateKey.fromRandom(bsv.Networks.testnet))
    publicKeys.push(privateKeys[i].publicKey)
    addresses.push(privateKeys[i].publicKey.toAddress())
}

describe('Test SmartContract `P2MS`', () => {
    before(async () => {
        await MultiSigPayment.compile()
    })

    it('should pass if using right private keys', async () => {
        const multiSigPayment = new MultiSigPayment(
            addresses.map((addr) => {
                return PubKeyHash(slice(addr.toHex(), 1n)) // Ignore address prefix.
            }) as FixedArray<PubKeyHash, 3>
        )

        // Dummy signer can take an array of signing private keys.
        await multiSigPayment.connect(getDummySigner(privateKeys))

        const { tx: callTx, atInputIndex } =
            await multiSigPayment.methods.unlock(
                (sigResps) => {
                    // Filter out relevant signatures.
                    // Be vary of the order (https://scrypt.io/docs/how-to-write-a-contract/built-ins#checkmultisig).
                    const res: Sig[] = []
                    publicKeys.map((publicKey) => {
                        res.push(findSig(sigResps, publicKey))
                    })
                    return res
                },
                publicKeys.map((publicKey) => PubKey(toHex(publicKey))),
                // Method call options:
                {
                    fromUTXO: getDummyUTXO(),
                    pubKeyOrAddrToSign: publicKeys,
                } as MethodCallOptions<MultiSigPayment>
            )

        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should not pass if using wrong sig', async () => {
        const multiSigPayment = new MultiSigPayment(
            addresses.map((addr) => {
                return PubKeyHash(toHex(addr.toHex()))
            }) as FixedArray<PubKeyHash, 3>
        )

        await multiSigPayment.connect(getDummySigner(privateKeys))

        return expect(
            multiSigPayment.methods.unlock(
                (sigResps) => {
                    const res: Sig[] = []
                    publicKeys.map((publicKey) => {
                        res.push(findSig(sigResps, publicKey))
                    })
                    res[0] = getDummySig()
                    return res
                },
                publicKeys.map((publicKey) => PubKey(toHex(publicKey))),
                {
                    fromUTXO: getDummyUTXO(),
                    pubKeyOrAddrToSign: publicKeys,
                } as MethodCallOptions<MultiSigPayment>
            )
        ).to.be.rejectedWith(/Execution failed/)
    })
})
