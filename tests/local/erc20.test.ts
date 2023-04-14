import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {
    Allowance,
    AllowanceMap,
    BalanceMap,
    ERC20,
    ERC20Pair,
} from '../../src/contracts/erc20'
import {
    bsv,
    findSig,
    hash160,
    HashedMap,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    toByteString,
    toHex,
} from 'scrypt-ts'
import { dummyUTXO, getDummySigner, inputSatoshis } from '../utils/helper'

use(chaiAsPromised)
import Transaction = bsv.Transaction

const signer = getDummySigner()

const initialSupply = 1000000n

describe('Test SmartContract `ERC20`', () => {
    let map: BalanceMap, allowances: AllowanceMap, erc20: ERC20
    before(async () => {
        await ERC20.compile()

        map = new HashedMap<PubKeyHash, bigint>()
        allowances = new HashedMap<Allowance, bigint>()
        const issuer = PubKey(toHex(await signer.getDefaultPubKey()))

        erc20 = new ERC20(
            toByteString('Gold', true),
            toByteString('GLD', true),
            issuer,
            map,
            allowances
        )
        await erc20.connect(signer)
    })

    async function mint(
        instance: ERC20,
        issuer: PubKey,
        issuerBalance: bigint,
        amount: bigint
    ): Promise<{
        tx: Transaction
        newInstance: ERC20
    }> {
        const newInstance = instance.next()

        newInstance.balances.set(hash160(issuer), issuerBalance + amount)
        newInstance.totalSupply += amount
        const publicKey = bsv.PublicKey.fromString(issuer)
        const { nexts, tx } = await instance.methods.mint(
            (sigResps) => {
                return findSig(sigResps, publicKey)
            },
            issuerBalance,
            amount,
            {
                fromUTXO: dummyUTXO,
                pubKeyOrAddrToSign: publicKey,
                next: {
                    instance: newInstance,
                    balance: inputSatoshis,
                },
            } as MethodCallOptions<ERC20>
        )

        return {
            tx: tx,
            newInstance: nexts[0].instance,
        }
    }

    async function transfer(
        instance: ERC20,
        from: ERC20Pair,
        pubkey: PubKey,
        to: ERC20Pair,
        amount: bigint
    ): Promise<{
        tx: Transaction
        newInstance: ERC20
    }> {
        const newInstance = instance.next()

        newInstance.balances.set(from.address, from.balance - amount)
        newInstance.balances.set(to.address, to.balance + amount)

        const publicKey = bsv.PublicKey.fromString(pubkey)
        const { nexts, tx } = await instance.methods.transfer(
            from,
            pubkey,
            (sigResps) => {
                return findSig(sigResps, publicKey)
            },
            to,
            amount,
            {
                fromUTXO: dummyUTXO,
                pubKeyOrAddrToSign: publicKey,
                next: {
                    instance: newInstance,
                    balance: inputSatoshis,
                },
            } as MethodCallOptions<ERC20>
        )

        return {
            tx: tx,
            newInstance: nexts[0].instance,
        }
    }

    async function approve(
        instance: ERC20,
        owner: PubKey,
        spender: PubKeyHash,
        amount: bigint
    ): Promise<{
        tx: Transaction
        newInstance: ERC20
    }> {
        const newInstance = instance.next()

        newInstance.allowances.set(
            {
                owner: hash160(owner),
                spender: spender,
            },
            amount
        )

        const publicKey = bsv.PublicKey.fromString(owner)
        const { nexts, tx } = await instance.methods.approve(
            owner,
            (sigResps) => {
                return findSig(sigResps, publicKey)
            },
            spender,
            amount,
            {
                fromUTXO: dummyUTXO,
                pubKeyOrAddrToSign: publicKey,
                next: {
                    instance: newInstance,
                    balance: inputSatoshis,
                },
            } as MethodCallOptions<ERC20>
        )

        return {
            tx: tx,
            newInstance: nexts[0].instance,
        }
    }

    async function transferFrom(
        instance: ERC20,
        spender: PubKey,
        currentAllowance: bigint,
        from: ERC20Pair,
        to: ERC20Pair,
        amount: bigint
    ): Promise<{
        tx: Transaction
        newInstance: ERC20
    }> {
        const newInstance = instance.next()

        newInstance.balances.set(from.address, from.balance - amount)
        newInstance.balances.set(to.address, to.balance + amount)

        newInstance.allowances.set(
            {
                owner: from.address,
                spender: hash160(spender),
            },
            currentAllowance - amount
        )

        const publicKey = bsv.PublicKey.fromString(spender)
        const { nexts, tx } = await instance.methods.transferFrom(
            spender,
            (sigResps) => {
                return findSig(sigResps, publicKey)
            },
            currentAllowance,
            from,
            to,
            amount,
            {
                fromUTXO: dummyUTXO,
                pubKeyOrAddrToSign: publicKey,
                next: {
                    instance: newInstance,
                    balance: inputSatoshis,
                },
            } as MethodCallOptions<ERC20>
        )
        return {
            tx: tx,
            newInstance: nexts[0].instance,
        }
    }

    it('mint,transfer,approve,transferFrom', async () => {
        const issuer = PubKey(toHex(await signer.getDefaultPubKey()))
        const address = await signer.getDefaultAddress()
        const issuerAddress = PubKeyHash(address.toObject().hash)

        const aliceKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        signer.addPrivateKey(aliceKey)

        const alicePubkey = PubKey(toHex(aliceKey.publicKey))

        const aliceAddress = PubKeyHash(aliceKey.toAddress().toObject().hash)

        const issuerBalance = initialSupply

        const { tx: tx1, newInstance: erc20_1 } = await mint(
            erc20,
            issuer,
            0n,
            initialSupply
        )
        console.log(
            `mint ${initialSupply} Gold to issuer: ${address.toString()}`
        )
        let result = tx1.verifyScript(0)
        expect(result.success, result.error).to.eq(true)

        const { tx: tx2, newInstance: erc20_2 } = await transfer(
            erc20_1,
            {
                address: issuerAddress,
                balance: issuerBalance,
            },
            issuer,
            {
                address: aliceAddress,
                balance: 0n,
            },
            1000n
        )
        result = tx2.verifyScript(0)
        expect(result.success, result.error).to.eq(true)

        console.log(
            `transfer ${1000n} Gold to alice: ${aliceKey
                .toAddress()
                .toString()}`
        )

        const bobKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        signer.addPrivateKey(bobKey)
        const bobPubkey = PubKey(toHex(bobKey.publicKey))

        const bobAddress = PubKeyHash(bobKey.toAddress().toObject().hash)

        const aliceBalance = 1000n

        const { tx: tx3, newInstance: erc20_3 } = await transfer(
            erc20_2,
            {
                address: aliceAddress,
                balance: aliceBalance,
            },
            alicePubkey,
            {
                address: bobAddress,
                balance: 0n,
            },
            100n
        )
        result = tx3.verifyScript(0)
        expect(result.success, result.error).to.eq(true)
        console.log(
            `transfer ${100n} Gold to bob: ${bobKey.toAddress().toString()}`
        )

        const { tx: tx4, newInstance: erc20_4 } = await transfer(
            erc20_3,
            {
                address: bobAddress,
                balance: 100n,
            },
            bobPubkey,
            {
                address: aliceAddress,
                balance: aliceBalance - 100n,
            },
            10n
        )
        result = tx4.verifyScript(0)
        expect(result.success, result.error).to.eq(true)
        console.log(
            `transfer ${10n} Gold to back to alice: ${aliceKey
                .toAddress()
                .toString()}`
        )

        const { tx: tx5, newInstance: erc20_5 } = await approve(
            erc20_4,
            alicePubkey,
            bobAddress,
            111n
        )
        console.log(`alice approve ${111n} Gold to be spend by bob`)
        result = tx5.verifyScript(0)
        expect(result.success, result.error).to.eq(true)
        const lilyKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        signer.addPrivateKey(lilyKey)
        const lilyAddress = PubKeyHash(lilyKey.toAddress().toObject().hash)

        const { tx: tx6 } = await transferFrom(
            erc20_5,
            bobPubkey,
            111n,
            {
                address: aliceAddress,
                balance: aliceBalance - 100n + 10n,
            },
            {
                address: lilyAddress,
                balance: 0n,
            },
            50n
        )
        result = tx6.verifyScript(0)
        expect(result.success, result.error).to.eq(true)
        console.log(`bob transfer ${50n} Gold from alice balance`)

        return expect(
            transferFrom(
                erc20_5,
                bobPubkey,
                111n,
                {
                    address: aliceAddress,
                    balance: aliceBalance - 100n + 10n,
                },
                {
                    address: lilyAddress,
                    balance: 0n,
                },
                150n
            )
        ).to.be.rejectedWith(/Execution failed, ERC20: insufficient allowance/)
    })
})
