import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { PubKey, Sig, Utils, hash160, PubKeyHash } from 'scrypt-ts'
import { SensibleOrd } from '../src/contracts/sensible-ord'
import { getDefaultSigner } from './utils/helper'
import { myPublicKey } from './utils/privateKey'

use(chaiAsPromised)

describe('Test SmartContract SensibleOrd', () => {
    before(() => {
        SensibleOrd.loadArtifact()
    })

    describe('SensibleOrd - RedeemSingle', () => {
        it('should redeem single successfully', async () => {
            const oraclePubKey = PubKey(myPublicKey.toByteString())
            const feeRate = 100n
            const minP2PKH_Sats = 1000n
            const purse = hash160(myPublicKey.toByteString()) as PubKeyHash

            const sensibleOrd = new SensibleOrd(oraclePubKey, feeRate, minP2PKH_Sats, purse)
            await sensibleOrd.connect(getDefaultSigner())
            await sensibleOrd.deploy(1)

            const callContract = async () => {
                sensibleOrd.methods.redeemSingle(
                    (sigResps) => findSig(sigResps, myPublicKey),
                    PubKey(myPublicKey.toByteString()),
                    {
                        pubKeyOrAddrToSign: myPublicKey,
                    }
                )
            }
            return expect(callContract()).not.rejected
        })
    })

    describe('SensibleOrd - RedeemMulti', () => {
        it('should redeem multiple successfully', async () => {
            const oraclePubKey = PubKey(myPublicKey.toByteString())
            const feeRate = 100n
            const minP2PKH_Sats = 1000n
            const purse = hash160(myPublicKey.toByteString()) as PubKeyHash

            const sensibleOrd = new SensibleOrd(oraclePubKey, feeRate, minP2PKH_Sats, purse)
            await sensibleOrd.connect(getDefaultSigner())
            await sensibleOrd.deploy(1)

            const callContract = async () => {
                sensibleOrd.methods.redeemMulti(
                    (sigResps) => findSig(sigResps, myPublicKey),
                    PubKey(myPublicKey.toByteString()),
                    {
                        pubKeyOrAddrToSign: myPublicKey,
                    }
                )
            }
            return expect(callContract()).not.rejected
        })
    })
})
