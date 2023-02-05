import { CheckLockTimeVerify } from '../../src/contracts/cltv'
import {
    inputIndex,
    inputSatoshis,
    testnetDefaultSigner,
} from './util/txHelper'
import { bsv } from 'scrypt-ts'

async function main() {
    await CheckLockTimeVerify.compile()

    // JS timestamps are in milliseconds so we divide by 1000 to get an UNIX timestamp
    const timeNow = Math.floor(Date.now() / 1000)
    const lockTimeMin = BigInt(timeNow - 10000)
    const cltv = new CheckLockTimeVerify(lockTimeMin)

    // connect to a signer
    cltv.connect(testnetDefaultSigner)

    // contract deployment
    const deployTx = await cltv.deploy(inputSatoshis)
    console.log('CLTV contract deployed: ', deployTx.id)

    // contract call
    const changeAddress = await testnetDefaultSigner.getDefaultAddress()
    const unsignedCallTx: bsv.Transaction = await new bsv.Transaction()
        .addInputFromPrevTx(deployTx)
        .change(changeAddress)
        .setLockTime(timeNow)
        .setInputSequence(inputIndex, 0)
        .setInputScriptAsync({ inputIndex }, (tx: bsv.Transaction) => {
            // bind contract & tx unlocking relation
            cltv.unlockFrom = { tx, inputIndex }

            // use the cloned version because this callback may be executed multiple times during tx building process,
            // and calling contract method may have side effects on its properties.
            return cltv.getUnlockingScript(async (cloned) => {
                cloned.unlock()
            })
        })
    const callTx = await testnetDefaultSigner.signAndsendTransaction(
        unsignedCallTx
    )
    console.log('CLTV contract called: ', callTx.id)
}

describe('Test SmartContract `CheckLockTimeVerify` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
