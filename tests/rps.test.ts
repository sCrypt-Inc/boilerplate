import { RockPaperScissors } from '../src/contracts/rps'
import { myAddress } from './utils/privateKey'
import { getDefaultSigner} from './utils/helper'    
import { expect } from 'chai'

async function main() {
    await RockPaperScissors.compile()

    const instance = new RockPaperScissors()

    await instance.connect(getDefaultSigner())
    const deployTx = await instance.deploy(1)
    console.log(`RockPaperScirssors contract deployed:  ${deployTx.id}`)

    const callContract = async () => {
        await instance.methods.main(3n, myAddress, 12n)
        expect(callContract()).not.Throw
    }
}
describe('Test SmartContract `RockPaperScirssors`', () => {
    it('should succeed', async () => {
        await main()
    })
})
