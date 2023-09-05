import { FixedArray } from 'scrypt-ts'
import { SVD } from '../src/contracts/svd'
import { getDefaultSigner} from './utils/helper'    
import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

type Matrix = FixedArray<FixedArray<bigint, 4>, 4>
async function main(){


        await SVD.compile()

        let svd: SVD;
        let U: Matrix, Sigma: Matrix, V: Matrix, k: bigint;
    
            // Initialize your matrices and k value here
            U = [[1n,0n, 0n, 0n], [0n, 1n, 0n, 0n], [0n, 0n, 1n, 0n], [0n, 0n, 0n, 1n]];
            Sigma = [[1n,0n, 0n, 0n], [0n, 1n, 0n, 0n], [0n, 0n, 1n, 0n], [0n, 0n, 0n, 1n]];
            V = [[1n,0n, 0n, 0n], [0n, 1n, 0n, 0n], [0n, 0n, 1n, 0n], [0n, 0n, 0n, 1n]];
            k = 2n;
            svd = new SVD(U);
        
        await svd.connect(getDefaultSigner())
    
   
    it('should pass the main method successfully ', async () => {

        await svd.deploy(1)

    const callContract = async () => {
        await svd.methods.main(U, Sigma, V, k)
       return expect(callContract()).not.be.rejected
    }

    })
    it('should throw when calling main method ', async () => {

        await svd.deploy(1)
    
    const callContract = async () => {
        await svd.methods.main(U, Sigma, V, 3n)
       return expect(callContract()).to.be.rejectedWith(/ main method failed/)
    }

    })

    it('should validate Sigma', () => {
      return expect(SVD.validate(Sigma, k)).to.be.true
    });
  
}
describe('Test SmartContract `SVD`', async () => {
        await main()
    
})