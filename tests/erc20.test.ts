import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {
    Allowance,
    AllowanceMap,
    BalanceMap,
    ERC20,
    ERC20Pair,
} from '../src/contracts/erc20'
import {
    Addr,
    bsv,
    findSig,
    HashedMap,
    MethodCallOptions,
    PubKey,
    pubKey2Addr,
    toByteString,
} from 'scrypt-ts'
import { getDefaultSigner } from './utils/helper'

use(chaiAsPromised)
import Transaction = bsv.Transaction

const signer = getDefaultSigner()

const initialSupply = 1000000n

describe('Test SmartContract `ERC20`', () => {
    let map: BalanceMap, allowances: AllowanceMap, erc20: ERC20
    before(async () => {
        ERC20.loadArtifact()

        map = new HashedMap<Addr, bigint>()
        allowances = new HashedMap<Allowance, bigint>()
        const issuer = PubKey((await signer.getDefaultPubKey()).toByteString())

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

        newInstance.balances.set(pubKey2Addr(issuer), issuerBalance + amount)
        newInstance.totalSupply += amount
        const publicKey = bsv.PublicKey.fromString(issuer)
        const { nexts, tx } = await instance.methods.mint(
            (sigResps) => findSig(sigResps, publicKey),
            issuerBalance,
            amount,
            {
                pubKeyOrAddrToSign: publicKey,
                next: {
                    instance: newInstance,
                    balance: instance.balance,
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
            (sigResps) => findSig(sigResps, publicKey),
            to,
            amount,
            {
                pubKeyOrAddrToSign: publicKey,
                next: {
                    instance: newInstance,
                    balance: instance.balance,
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
        spender: Addr,
        amount: bigint
    ): Promise<{
        tx: Transaction
        newInstance: ERC20
    }> {
        const newInstance = instance.next()

        newInstance.allowances.set(
            {
                owner: pubKey2Addr(owner),
                spender: spender,
            },
            amount
        )

        const publicKey = bsv.PublicKey.fromString(owner)
        const { nexts, tx } = await instance.methods.approve(
            owner,
            (sigResps) => findSig(sigResps, publicKey),
            spender,
            amount,
            {
                pubKeyOrAddrToSign: publicKey,
                next: {
                    instance: newInstance,
                    balance: instance.balance,
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
                spender: pubKey2Addr(spender),
            },
            currentAllowance - amount
        )

        const publicKey = bsv.PublicKey.fromString(spender)
        const { nexts, tx } = await instance.methods.transferFrom(
            spender,
            (sigResps) => findSig(sigResps, publicKey),
            currentAllowance,
            from,
            to,
            amount,
            {
                pubKeyOrAddrToSign: publicKey,
                next: {
                    instance: newInstance,
                    balance: instance.balance,
                },
            } as MethodCallOptions<ERC20>
        )
        return {
            tx: tx,
            newInstance: nexts[0].instance,
        }
    }

    it('mint,transfer,approve,transferFrom', async () => {
        await erc20.deploy(1)

        const issuer = PubKey((await signer.getDefaultPubKey()).toByteString())
        const address = await signer.getDefaultAddress()
        const issuerAddress = Addr(address.toObject().hash)

        const aliceKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        signer.addPrivateKey(aliceKey)

        const alicePubkey = PubKey(aliceKey.publicKey.toByteString())

        const aliceAddress = Addr(aliceKey.toAddress().toByteString())

        const issuerBalance = initialSupply

        const { newInstance: erc20_1 } = await mint(
            erc20,
            issuer,
            0n,
            initialSupply
        )

        const { newInstance: erc20_2 } = await transfer(
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

        console.log(
            `transfer ${1000n} Gold to alice: ${aliceKey
                .toAddress()
                .toString()}`
        )

        const bobKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        signer.addPrivateKey(bobKey)
        const bobPubkey = PubKey(bobKey.publicKey.toByteString())

        const bobAddress = Addr(bobKey.toAddress().toByteString())

        const aliceBalance = 1000n

        const { newInstance: erc20_3 } = await transfer(
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

        console.log(
            `transfer ${100n} Gold to bob: ${bobKey.toAddress().toString()}`
        )

        const { newInstance: erc20_4 } = await transfer(
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

        console.log(
            `transfer ${10n} Gold to back to alice: ${aliceKey
                .toAddress()
                .toString()}`
        )

        const { newInstance: erc20_5 } = await approve(
            erc20_4,
            alicePubkey,
            bobAddress,
            111n
        )
        console.log(`alice approve ${111n} Gold to be spend by bob`)

        const lilyKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
        signer.addPrivateKey(lilyKey)
        const lilyAddress = Addr(lilyKey.toAddress().toByteString())

        const callTransferFrom = async () =>
            await transferFrom(
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

        expect(callTransferFrom()).not.throw

        console.log(`bob transfer ${50n} Gold from alice balance`)
        const callContract = async () =>
            await transferFrom(
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

        return expect(callContract()).to.be.rejectedWith(
            /Execution failed, ERC20: insufficient allowance/
        )
    })
})
