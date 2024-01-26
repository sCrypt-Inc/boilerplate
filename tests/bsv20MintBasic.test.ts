import { use } from 'chai'
import { Addr, MethodCallOptions, toByteString } from 'scrypt-ts'
import { BSV20Mint } from '../src/contracts/bsv20MintBasic'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
import { myAddress } from './utils/privateKey'
use(chaiAsPromised)

describe('Test SmartContract `BSV20Mint`', () => {
    const max = 10000n // Whole token amount.
    const dec = 0n // Decimal precision.
    const sym = toByteString('TEST', true)
    const lim = 1000n

    let instance: BSV20Mint

    before(async () => {
        await BSV20Mint.loadArtifact()

        instance = new BSV20Mint(toByteString(''), sym, max, dec, lim)
        await instance.connect(getDefaultSigner())
    })

    it('should pass the public method unit test successfully.', async () => {
        const tokenId = await instance.deployToken({
            name: 'TEST COIN',
        })
        console.log(`tokenId: ${tokenId}`)

        instance.bindTxBuilder('mint', BSV20Mint.mintTxBuilder)
        for (let i = 0; i < 10; i++) {
            const contractTx = await instance.methods.mint(
                Addr(myAddress.toByteString()),
                lim,
                {} as MethodCallOptions<BSV20Mint>
            )

            console.log('Mint Tx:', contractTx.tx.id)
            if (contractTx.nexts[0]) {
                instance = contractTx.nexts[0].instance as unknown as BSV20Mint
            }
        }
    })
})
