import { expect, use } from 'chai'
import { MethodCallOptions, bsv, findSig, PubKey, Addr } from 'scrypt-ts'
import { OrdinalLock, purchaseTxBuilder } from '../src/contracts/ordinalLock'
import { OrdiMethodCallOptions, OrdiNFTP2PKH } from 'scrypt-ord'
import chaiAsPromised from 'chai-as-promised'
import { getDefaultSigner } from './utils/helper'
use(chaiAsPromised)

// Listing price.
const price = 10000n

// Seller key.
const seller = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)

describe('Test SmartContract `OrdinalLock`', () => {
    let instance: OrdinalLock

    before(async () => {
        OrdinalLock.loadArtifact()
        instance = new OrdinalLock(
            Addr(seller.toAddress().toByteString()),
            price
        )
        await instance.connect(getDefaultSigner(seller))

        // Bind tx builder for public method "purchase"
        instance.bindTxBuilder('purchase', purchaseTxBuilder)
    })

    it('should pass purchase method call successfully.', async () => {
        await instance.inscribeText('Hello, sCrypt!')

        const buyerSigner = getDefaultSigner()
        const buyerPublicKey = await buyerSigner.getDefaultPubKey()

        const callContract = async () =>
            instance.methods.purchase(PubKey(buyerPublicKey.toByteString()), {
                changeAddress: await buyerSigner.getDefaultAddress(),
            } as MethodCallOptions<OrdinalLock>)
        return expect(callContract()).not.rejected
    })

    it('should pass cancel method call successfully.', async () => {
        await instance.deploy(1)

        const callContract = async () =>
            instance.methods.cancel(
                (sigResp) => findSig(sigResp, seller.publicKey),
                PubKey(seller.publicKey.toByteString()),
                {
                    transfer: new OrdiNFTP2PKH(
                        Addr(seller.toAddress().toByteString())
                    ),
                    pubKeyOrAddrToSign: seller.publicKey,
                    changeAddress: seller.toAddress(),
                } as OrdiMethodCallOptions<OrdinalLock>
            )
        return expect(callContract()).not.rejected
    })
})
