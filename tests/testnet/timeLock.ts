import { TimeLock } from '../../src/contracts/timeLock'
import { getDefaultSigner, inputSatoshis } from '../utils/helper'
import { MethodCallOptions } from 'scrypt-ts'

async function main() {
    await TimeLock.compile()

    const lockTimeMin = 1673510000n
    const timeLock = new TimeLock(lockTimeMin)

    // connect to a signer
    await timeLock.connect(getDefaultSigner())

    // contract deployment
    const deployTx = await timeLock.deploy(inputSatoshis)
    console.log('timeLock contract deployed: ', deployTx.id)

    // contract call
    const { tx: callTx } = await timeLock.methods.unlock({
        lockTime: 1673523720,
    } as MethodCallOptions<TimeLock>)
    console.log('timeLock contract called: ', callTx.id)
}

describe('Test SmartContract `TimeLock` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
