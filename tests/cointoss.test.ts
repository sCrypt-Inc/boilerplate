import { expect, use } from 'chai'
import {
    MethodCallOptions,
    PubKey,
    Sha256,
    findSig,
    hash256,
    sha256,
    toByteString,
    toHex,
} from 'scrypt-ts'
import { CoinToss } from '../src/contracts/cointoss'
import { getDefaultSigner, randomPrivateKey } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

describe('Test SmartContract `Cointoss`', () => {
    let instance: CoinToss
    const [aliceprivatekey, alicepublickey] = randomPrivateKey()
    const [bobprivatekey, bobpublickey] = randomPrivateKey()
    before(async () => {
        CoinToss.loadArtifact()
        instance = new CoinToss(
            PubKey(alicepublickey.toByteString()),
            PubKey(bobpublickey.toByteString()),
            hash256(toByteString('alice', true)),
            hash256(toByteString('bob', true)),
            toByteString('n', true)
        )
        await instance.connect(
            getDefaultSigner([aliceprivatekey, bobprivatekey])
        )
    })

    it('should pass the public method unit test successfully.', async () => {
        await instance.deploy(1)
        const callContract = async () =>
            instance.methods.toss(
                toByteString('alice', true),
                toByteString('bob', true),
                (SigReps) => findSig(SigReps, alicepublickey),
                {
                    pubKeyOrAddrToSign: alicepublickey,
                } as MethodCallOptions<CoinToss>
            )
        return expect(callContract()).not.rejected
    })
})
