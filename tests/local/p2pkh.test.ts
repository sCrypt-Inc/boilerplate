import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {
    findSig,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    toHex,
} from 'scrypt-ts'
import { P2PKH } from '../../src/contracts/p2pkh'
import { getDummySigner, getDummyUTXO, randomPrivateKey } from '../utils/helper'
import { myPublicKey, myPublicKeyHash } from '../utils/privateKey'

use(chaiAsPromised)

describe('Test SmartContract `P2PKH`', () => {
    before(async () => {
        await P2PKH.compile()
    })

    it('should pass if using right private key', async () => {
        // create a new P2PKH contract instance
        // this instance was paid to `myPublicKeyHash`
        const p2pkh = new P2PKH(PubKeyHash(toHex(myPublicKeyHash)))
        // connect contract instance to a signer
        // dummySigner() has one private key in it by default, it's `myPrivateKey`
        await p2pkh.connect(getDummySigner())
        // call public function `unlock` of this contract
        const { tx: callTx, atInputIndex } = await p2pkh.methods.unlock(
            // pass signature, the first parameter, to `unlock`
            // after the signer signs the transaction, the signatures are returned in `SignatureResponse[]`
            // you need to find the signature or signatures you want in the return through the public key or address
            // here we use `myPublicKey` to find the signature because we signed the transaction with `myPrivateKey` before
            (sigResps) => findSig(sigResps, myPublicKey),
            // pass public key, the second parameter, to `unlock`
            PubKey(toHex(myPublicKey)),
            // method call options
            {
                fromUTXO: getDummyUTXO(),
                // tell the signer to use the private key corresponding to `myPublicKey` to sign this transaction
                // that is using `myPrivateKey` to sign the transaction
                pubKeyOrAddrToSign: myPublicKey,
            } as MethodCallOptions<P2PKH>
        )
        // check if the unlock transaction built above is correct
        const result = callTx.verifyScript(atInputIndex)
        expect(result.success, result.error).to.eq(true)
    })

    it('should fail if using wrong private key', async () => {
        const [wrongPrivateKey, wrongPublicKey] = randomPrivateKey()
        // contract instance was paid to `myPublicKeyHash`
        const p2pkh = new P2PKH(PubKeyHash(toHex(myPublicKeyHash)))
        // add a new private key, `wrongPrivateKey`, into the signer
        // now the signer has two private keys in it
        await p2pkh.connect(getDummySigner(wrongPrivateKey))
        return expect(
            p2pkh.methods.unlock(
                // pass the signature signed by `wrongPrivateKey`
                (sigResps) => findSig(sigResps, wrongPublicKey),
                // pass the correct public key
                PubKey(toHex(myPublicKey)),
                {
                    fromUTXO: getDummyUTXO(),
                    pubKeyOrAddrToSign: wrongPublicKey, // use `wrongPrivateKey` to sign
                } as MethodCallOptions<P2PKH>
            )
        ).to.be.rejectedWith(/signature check failed/)
    })

    it('should fail if passing wrong public key', async () => {
        const [, wrongPublicKey, ,] = randomPrivateKey()
        // contract instance was paid to `myPublicKeyHash`
        const p2pkh = new P2PKH(PubKeyHash(toHex(myPublicKeyHash)))
        await p2pkh.connect(getDummySigner())
        return expect(
            p2pkh.methods.unlock(
                // pass the correct signature signed by `myPrivateKey`
                (sigResps) => findSig(sigResps, myPublicKey),
                // but pass the wrong public key
                PubKey(toHex(wrongPublicKey)),
                {
                    fromUTXO: getDummyUTXO(),
                    pubKeyOrAddrToSign: myPublicKey, // use the correct private key, `myPrivateKey`, to sign
                } as MethodCallOptions<P2PKH>
            )
        ).to.be.rejectedWith(/public key hashes are not equal/)
    })
})
