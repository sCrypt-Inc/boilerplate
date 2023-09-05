import { toByteString } from 'scrypt-ts'
import { Base58Test } from '../src/contracts/base58'
import { getDefaultSigner } from './utils/helper'
import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

async function main() {
    await Base58Test.compile()

    let instance = new Base58Test()

    await instance.connect(getDefaultSigner())

    it('should encode address correctly', async () => {
       const deployTx =  await instance.deploy(1)
        console.log('deployed ', deployTx.id)

        const callContract = async () => {
            await instance.methods.main(toByteString('1234567890abcdef', true))
            return expect(callContract()).not.be.rejected
        }
    })
}
describe('Test SmartContract `Base58`', async () => {
    await main()
})
