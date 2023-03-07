import { CheckLockTimeVerify } from '../../src/contracts/cltv'
import { getDefaultSigner, inputSatoshis } from '../utils/helper'
import { MethodCallOptions } from 'scrypt-ts'

async function main() {
    await CheckLockTimeVerify.compile()

    const lockTimeMin = 1673510000n
    const checkLockTimeVerify = new CheckLockTimeVerify(lockTimeMin)

    // connect to a signer
    await checkLockTimeVerify.connect(getDefaultSigner())

    // contract deployment
    const deployTx = await checkLockTimeVerify.deploy(inputSatoshis)
    console.log('CLTV contract deployed: ', deployTx.id)

    // contract call
    const { tx: callTx } = await checkLockTimeVerify.methods.unlock({
        lockTime: 1673523720,
    } as MethodCallOptions<CheckLockTimeVerify>)
    console.log('CLTV contract called: ', callTx.id)
}

describe('Test SmartContract `CheckLockTimeVerify` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
