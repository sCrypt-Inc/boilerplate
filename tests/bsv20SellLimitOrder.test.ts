import { getDefaultSigner, sleep } from './utils/helper'
import { Addr, bsv, findSig, PubKey, toByteString, UTXO } from 'scrypt-ts'
import { myAddress, myPrivateKey, myPublicKey } from './utils/privateKey'
import { BSV20SellLimitOrder } from '../src/contracts/bsv20SellLimitOrder'
import { BSV20V2P2PKH, OrdiMethodCallOptions } from 'scrypt-ord'

async function main() {
    BSV20SellLimitOrder.loadArtifact()

    const privateKeySeller = myPrivateKey
    const publicKeySeller = myPublicKey

    ///// Mint some tokens to a P2PKH first. /////
    const max = 1000000000000000n // Whole token amount.
    const dec = 8n // Decimal precision.
    const sym = toByteString('TEST', true)
    const pricePerUnit = 10n

    const bsv20p2pkh = new BSV20V2P2PKH(
        toByteString(''),
        sym,
        max,
        dec,
        Addr(publicKeySeller.toAddress().toByteString())
    )
    await bsv20p2pkh.connect(getDefaultSigner(privateKeySeller))
    const tokenId = await bsv20p2pkh.deployToken()
    const ordinalUTXO = bsv20p2pkh.utxo

    console.log('Mock BSV-20 tokens deployed:', ordinalUTXO.txId)

    /////  Transfer tokens to a sell order instance. /////
    const transferAmt = 100000n
    const instance = new BSV20SellLimitOrder(
        toByteString(tokenId, true),
        sym,
        max,
        dec,
        transferAmt,
        PubKey(publicKeySeller.toByteString()),
        pricePerUnit
    )
    await instance.connect(getDefaultSigner(privateKeySeller))

    const { tx: transferTx } = await bsv20p2pkh.methods.unlock(
        (sigResps) => findSig(sigResps, publicKeySeller),
        PubKey(publicKeySeller.toByteString()),
        {
            transfer: {
                instance,
                amt: transferAmt,
            },
            pubKeyOrAddrToSign: publicKeySeller,
        } as OrdiMethodCallOptions<BSV20V2P2PKH>
    )

    console.log('BSV-20 sell order deployed: ', transferTx.id)

    ///// Perform buying. /////
    let currentInstance = instance
    for (let i = 0; i < 3; i++) {
        const amount = 100n
        const buyer = myAddress

        currentInstance.bindTxBuilder('buy', BSV20SellLimitOrder.buyTxBuilder)
        const callRes = await currentInstance.methods.buy(
            amount,
            Addr(buyer.toByteString())
        )

        console.log('Buy Tx:', callRes.tx.id)

        currentInstance = callRes.nexts[0].instance
    }

    ////// Cancel sell limit order and transfer remaining tokens back to seller. /////
    const recipient = new BSV20V2P2PKH(
        toByteString(tokenId, true),
        sym,
        max,
        dec,
        Addr(publicKeySeller.toAddress().toByteString())
    )
    const contractTx = await currentInstance.methods.cancel(
        (sigResps) => findSig(sigResps, publicKeySeller),
        {
            transfer: {
                instance: recipient,
                amt: currentInstance.tokenAmt - currentInstance.tokenAmtSold,
            },
            pubKeyOrAddrToSign: publicKeySeller,
        } as OrdiMethodCallOptions<BSV20SellLimitOrder>
    )

    console.log('Cancel Tx: ', contractTx.tx.id)
}

describe('Test SmartContract `BSV20SellLimitOrder`', () => {
    it('should succeed', async () => {
        await main()
    })
})
