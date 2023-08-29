import { expect, use } from 'chai'
import { MethodCallOptions} from 'scrypt-ts'
import { ModExp } from '../src/contracts/modEXP'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
import { describe } from 'mocha'

use(chaiAsPromised)

describe('Test SmartContract `modEXP`', () => {
    let instance: ModExp
    before(async () => {
        await ModExp.compile()
        
        instance = new ModExp(13n)
        await instance.connect(getDefaultSigner())
    })

    it('should pass the public method unit test successfully.', async () => {
        const deployTx = await instance.deploy(1)
        console.log('modEXP contract deployed: ', deployTx.id)

        
        const callContract = async () => {
        await instance.methods.main(
            2n,3n,8n
        )
            expect(callContract()).not.throw
        }
        
    })

})
