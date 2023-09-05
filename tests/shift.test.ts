import { FixedArray } from 'scrypt-ts'
import { ShiftTest } from '../src/contracts/shift'
import { getDefaultSigner} from './utils/helper'    
import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

async function main(){


        await ShiftTest.compile()

        let instance = new ShiftTest()

        
        await instance.connect(getDefaultSigner())
    
   
    it('pow2 should return 2^n', async () => {

        await instance.deploy(1)

    const callContract = async () => {
        await instance.methods.pow2(3n, 8n)
       return expect(callContract()).not.be.rejected
    }

    })

    it('left should binary left shift number x by n places', async () => {

        await instance.deploy(1)

    const callContract = async () => {
        await instance.methods.left(2n, 2n, 8n)
       return expect(callContract()).not.be.rejected
    }

    })

    it('right should binary right shift number x by n places', async () => {

        await instance.deploy(1)

    const callContract = async () => {
        await instance.methods.right(8n, 2n, 2n)
       return expect(callContract()).not.be.rejected
    }

    })

    it('should throw when calling pow2 method ', async () => {

        await instance.deploy(1)
    
    const callContract = async () => {
        await instance.methods.pow2(3n, 0n)
       return expect(callContract()).to.be.rejectedWith(/pow2 method failed/)
    }

    })

    it('should throw when calling left method ', async () => {

        await instance.deploy(1)
    
    const callContract = async () => {
        await instance.methods.left(3n, 0n, 0n)
       return expect(callContract()).to.be.rejectedWith(/left method failed/)
    }

    })
  
    
    it('should throw when calling right method ', async () => {

        await instance.deploy(1)
    
    const callContract = async () => {
        await instance.methods.right(3n, 0n, 0n)
       return expect(callContract()).to.be.rejectedWith(/right method failed/)
    }

    })
  
}
describe('Test SmartContract `Shift`', async () => {
        await main()
    
})
