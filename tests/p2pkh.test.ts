import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Addr, findSig, MethodCallOptions, PubKey } from 'scrypt-ts'
import { P2PKH } from '../src/contracts/p2pkh'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'
import { myAddress, myPublicKey } from './utils/privateKey'

use(chaiAsPromised)

describe('Test SmartContract `P2PKH`', () => {
    before(() => {
        P2PKH.loadArtifact()
    })

    it('should pass if using right private key', async () => {
        // create a new P2PKH contract instance
        // this instance was paid to `myAddress`
        const p2pkh = new P2PKH(Addr(myAddress.toByteString()))
        // connect contract instance to a signer
        // dummySigner() has one private key in it by default, it's `myPrivateKey`
        await p2pkh.connect(getDefaultSigner())
        await p2pkh.deploy(1)

        // call public function `unlock` of this contract

        const callContract = async () => {
            p2pkh.methods.unlock(
                // pass signature, the first parameter, to `unlock`
                // after the signer signs the transaction, the signatures are returned in `SignatureResponse[]`
                // you need to find the signature or signatures you want in the return through the public key or address
                // here we use `myPublicKey` to find the signature because we signed the transaction with `myPrivateKey` before
                (sigResps) => findSig(sigResps, myPublicKey),
                // pass public key, the second parameter, to `unlock`
                PubKey(myPublicKey.toByteString()),
                // method call options
                {
                    // tell the signer to use the private key corresponding to `myPublicKey` to sign this transaction
                    // that is using `myPrivateKey` to sign the transaction
                    pubKeyOrAddrToSign: myPublicKey,
                } as MethodCallOptions<P2PKH>
            )
        }
        return expect(callContract()).not.rejected
    })

    it('should fail if using wrong private key', async () => {
        const [wrongPrivateKey, wrongPublicKey] = randomPrivateKey()
        // contract instance was paid to `myAddress`
        const p2pkh = new P2PKH(Addr(myAddress.toByteString()))
        // add a new private key, `wrongPrivateKey`, into the signer
        // now the signer has two private keys in it
        await p2pkh.connect(getDefaultSigner(wrongPrivateKey))

        await p2pkh.deploy(1)
        const callContract = async () =>
            p2pkh.methods.unlock(
                // pass the signature signed by `wrongPrivateKey`
                (sigResps) => findSig(sigResps, wrongPublicKey),
                // pass the correct public key
                PubKey(myPublicKey.toByteString()),
                {
                    pubKeyOrAddrToSign: wrongPublicKey, // use `wrongPrivateKey` to sign
                } as MethodCallOptions<P2PKH>
            )

        return expect(callContract()).to.be.rejectedWith(
            /signature check failed/
        )
    })

    it('should fail if passing wrong public key', async () => {
        const [, wrongPublicKey] = randomPrivateKey()
        // contract instance was paid to `myAddress`
        const p2pkh = new P2PKH(Addr(myAddress.toByteString()))
        await p2pkh.connect(getDefaultSigner())

        await p2pkh.deploy(1)

        const callContract = async () =>
            p2pkh.methods.unlock(
                // pass the correct signature signed by `myPrivateKey`
                (sigResps) => findSig(sigResps, myPublicKey),
                // but pass the wrong public key
                PubKey(wrongPublicKey.toByteString()),
                {
                    pubKeyOrAddrToSign: myPublicKey, // use the correct private key, `myPrivateKey`, to sign
                } as MethodCallOptions<P2PKH>
            )
        return expect(callContract()).to.be.rejectedWith(
            /pubKey does not belong to address/
        )
    })
})
