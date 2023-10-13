import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {
    Addr,
    bsv,
    FixedArray,
    MethodCallOptions,
    toByteString,
    Utils,
} from 'scrypt-ts'
import { RabinPubKey, RabinSig } from 'scrypt-ts-lib'
import { CatBond, Investment } from '../src/contracts/catastropheBond'
import { getDefaultSigner } from './utils/helper'

use(chaiAsPromised)

describe('Test SmartContract `CatBond`', () => {
    // Define params.
    const minInvestment = 1000n
    const premium = 800n // 8.00%
    const startTime = 1653051600n
    const matureTime = 1684587702n
    const minMagnitude = 50n // 5.0

    // Init private keys.
    const issuer = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
    const investors: bsv.PrivateKey[] = []
    for (let i = 0; i < CatBond.MAX_INVESTORS; i++) {
        investors[i] = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
    }

    // Define oracle Rabin public key.
    const oracle: RabinPubKey =
        254793531524149913629837733216543054009502074704208702860372877047624767567944352075626148397577323473568971634456552122953360389441248591928129817948873n

    // Address of the issuer.
    const issuerAddr = Addr(issuer.publicKey.toAddress().toByteString())

    // Init array with placeholder investments
    const _investments: Investment[] = []
    for (let i = 0; i < CatBond.MAX_INVESTORS; i++) {
        _investments.push({
            investor: toByteString(
                '0000000000000000000000000000000000000000'
            ) as Addr,
            amount: 0n,
        })
    }
    const investments = _investments as FixedArray<
        Investment,
        typeof CatBond.MAX_INVESTORS
    >

    before(() => {
        CatBond.loadArtifact()
    })

    it('should pass invest and payout', async () => {
        // Create contract instance.
        const catBond = new CatBond(
            minInvestment,
            premium,
            startTime,
            matureTime,
            issuerAddr,
            oracle,
            minMagnitude,
            investments
        )
        await catBond.connect(getDefaultSigner())

        await catBond.deploy(1)

        let currentInstance = catBond
        let alreadyInvested = 1

        // Add investments:
        for (let i = 0; i < CatBond.MAX_INVESTORS; i++) {
            const investor = investors[i]
            const investorAddr = Addr(
                investor.publicKey.toAddress().toByteString()
            )
            const amount = 1500

            // Construct next contract instance, with update investments array.
            const nextInstance = currentInstance.next()
            nextInstance.investments[i] = {
                investor: investorAddr,
                amount: BigInt(amount),
            }
            nextInstance.investmentsEndIdx += 1n

            const callContract = async () =>
                currentInstance.methods.invest(investorAddr, BigInt(amount), {
                    next: {
                        instance: nextInstance,
                        balance: alreadyInvested + amount,
                    },
                } as MethodCallOptions<CatBond>)
            await expect(callContract()).not.rejected

            currentInstance = nextInstance
            alreadyInvested += amount
        }

        // Payout:
        const oracleMsg = toByteString('32d0908762')
        const oracleSig: RabinSig = {
            s: 104866814352168329495190615561645819580148721098601461471835645620632452809701027179983167549962645883371765269833133493588540586222254443681708444183323n,
            padding: toByteString('00000000000000'),
        }

        currentInstance.bindTxBuilder(
            'payout',
            (
                current: CatBond,
                options: MethodCallOptions<CatBond>,
                ...args: any
            ) => {
                const unsignedTx: bsv.Transaction = new bsv.Transaction()
                    // add contract input
                    .addInput(current.buildContractInput())
                    // add a p2pkh output
                    .addOutput(
                        new bsv.Transaction.Output({
                            script: bsv.Script.fromHex(
                                Utils.buildPublicKeyHashScript(
                                    currentInstance.issuer
                                )
                            ),
                            satoshis: current.balance,
                        })
                    )
                // add change output
                if (options.changeAddress) {
                    unsignedTx.change(options.changeAddress)
                }

                return Promise.resolve({
                    tx: unsignedTx,
                    atInputIndex: 0, // the contract input's index
                    nexts: [],
                })
            }
        )

        const callContract = async () =>
            currentInstance.methods.payout(oracleMsg, oracleSig, {
                changeAddress: issuer.publicKey.toAddress(),
            } as MethodCallOptions<CatBond>)
        expect(callContract).not.throw
    })
})
