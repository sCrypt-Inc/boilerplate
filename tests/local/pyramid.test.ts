import { MethodCallOptions, PubKey, PubKeyHash, toHex } from 'scrypt-ts'
import { Pyramid } from '../../src/contracts/pyramid'
import {
    getDummySigner,
    getDummyUTXO,
    randomPrivateKey,
} from '../utils/helper'

import { myPublicKeyHash, myAddress } from '../utils/privateKey'
import { expect } from 'chai'

async function main() {
    await Pyramid.compile()

    const pyramid = new Pyramid(PubKeyHash(toHex(myPublicKeyHash)), 1000n)
    pyramid.bindTxBuilder('recruit', Pyramid.recruitTxBuilder)

    await pyramid.connect(getDummySigner())

    const  recruit0PubKey = randomPrivateKey()
    const  recruit1PubKey = randomPrivateKey()

    const recruit0Instance = pyramid.next()
    recruit0Instance.schemer = PubKeyHash(toHex(recruit0PubKey))

    const recruit1Instance = pyramid.next()
    recruit1Instance.schemer = PubKeyHash(toHex(recruit1PubKey))

    const { tx: callTx, atInputIndex } = await pyramid.methods.recruit(
        PubKey(toHex(recruit0PubKey)),
        PubKey(toHex(recruit1PubKey)),
        {
            fromUTXO: getDummyUTXO(),
            changeAddress: myAddress,
        } as MethodCallOptions<Pyramid>
    )

    const result = callTx.verifyScript(atInputIndex)
    expect(result.success, result.error).to.eq(true)
}

describe('Test SmartContract Pyramid unit test', () => {
    it('should succeed', async () => {
        await main()
    })
})