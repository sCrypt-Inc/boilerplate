import { HashPuzzle } from '../../src/contracts/hashPuzzle'
import {
    inputIndex,
    inputSatoshis,
    testnetDefaultSigner,
} from './util/txHelper'
import { bsv, Sha256, sha256, toHex } from 'scrypt-ts'

async function main() {
    await HashPuzzle.compile()

    const data = toHex(Buffer.from('abc'))
    const sha256Data = sha256(data)
    const hashPuzzle = new HashPuzzle(Sha256(sha256Data))

    await hashPuzzle.connect(await testnetDefaultSigner)

    // contract deployment
    const deployTx = await hashPuzzle.deploy(inputSatoshis)
    console.log('HashPuzzle contract deployed: ', deployTx.id)

    // contract call
    const changeAddress = await (await testnetDefaultSigner).getDefaultAddress()
    const unsignedCallTx: bsv.Transaction = await new bsv.Transaction()
        .addInputFromPrevTx(deployTx)
        .change(changeAddress)
        .setInputScriptAsync({ inputIndex }, (tx: bsv.Transaction) => {
            // bind contract & tx unlocking relation
            hashPuzzle.unlockFrom = { tx, inputIndex }
            // use the cloned version because this callback may be executed multiple times during tx building process,
            // and calling contract method may have side effects on its properties.
            return hashPuzzle.getUnlockingScript(async (cloned) => {
                cloned.unlock(data)
            })
        })
    const callTx = await (
        await testnetDefaultSigner
    ).signAndsendTransaction(unsignedCallTx)
    console.log('HashPuzzle contract called: ', callTx.id)
}

describe('Test SmartContract `HashPuzzle` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
