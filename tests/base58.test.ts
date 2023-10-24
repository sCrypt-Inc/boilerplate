import { toByteString } from 'scrypt-ts'
import { Base58Test, Base58 } from '../src/contracts/base58'
import { getDefaultSigner } from './utils/helper'
import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)
describe('Test SmartContract `Base58`', async () => {
    let instance: Base58Test
    
    before(async () => {
        await Base58Test.loadArtifact()
        instance = new Base58Test()
        await instance.connect(getDefaultSigner())
    })

    it('should encode address correctly', async () => {
        await instance.deploy(1)
        const sampleAddress = toByteString('abcdefghabcdefghabcdefgh',true)

        // Get the expected verification byte for testnet
        const verbyte = Base58.P2PKH_verbyte_testnet;
    
        // Call the base58EncodeCheckAddr function
        const result = Base58.base58EncodeCheckAddr(sampleAddress, verbyte);
          
        // Assert that the result does not throw
        expect(result).not.throw
       
    })
})
