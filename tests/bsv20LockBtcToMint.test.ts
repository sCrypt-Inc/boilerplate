import { use } from 'chai'
import {
    Addr,
    FixedArray,
    HashedSet,
    MethodCallOptions,
    PubKey,
    Sha256,
    bsv,
    reverseByteString,
    toByteString,
} from 'scrypt-ts'
import { Bsv20LockBtcToMint } from '../src/contracts/bsv20LockBtcToMint'
import { getDefaultSigner } from './utils/helper'
import chaiAsPromised from 'chai-as-promised'
import { BlockHeader, MerklePath, MerkleProof, Node } from 'scrypt-ts-lib'
use(chaiAsPromised)

describe('Test SmartContract `Bsv20LockToMintBtc`', () => {
    const max = 10000n // Whole token amount.
    const dec = 0n // Decimal precision.
    const sym = toByteString('TEST', true)
    const hodlRate = 5n // Lock 5 sats to mint 1 token.
    const hodlDeadline = 1706749200n
    const targetDifficulty = 1.0 // Mainnet would have much higher difficulty...

    let instance: Bsv20LockBtcToMint

    before(async () => {
        await Bsv20LockBtcToMint.loadArtifact()

        instance = new Bsv20LockBtcToMint(
            toByteString(''),
            sym,
            max,
            dec,
            max,
            hodlRate,
            hodlDeadline,
            pdiff2Target(targetDifficulty),
            new HashedSet<PubKey>()
        )
        await instance.connect(getDefaultSigner())
    })

    it('should pass the public method unit test successfully.', async () => {
        const tokenId = await instance.deployToken({
            name: 'LOCK BTC TO MINT TOKEN',
        })
        console.log(`tokenId: ${tokenId}`)

        const ordinalAddress = bsv.Address.fromString(
            'mxeZYsZZU2Lf146Yv4k8emiakJzkjnhH9b'
        )
        const lockPubKey = PubKey(
            '02d30a3390c002ed75a367d19f950c699a9a3f99e73163b4e58bc5bb4e432c795a'
        )
        const amtLocked = 1875n
        const amtMinted = amtLocked / hodlRate

        const btcTx = toByteString(
            '0200000001739de8c5676c1f48a576d41422d83343d692668c4ce055f7335fc5ad4e505d490100000000ffffffff015307000000000000220020636c68b6d9107c2b4adf16b56013eb20fa0a9af4f7fdf746892cf90c14a705c700000000'
        )

        // Proof produced by Electrum wallet's CLI interface.
        const merkleProof: MerkleProof = prepProofFromElectrum({
            block_height: 2542798,
            merkle: [
                '47e3d0b2e2532aeabf610f12e1fa7027fdeb55624aec700a972be20195275b1d',
                '9176d43ec7760c5940e4a353e9e9baac21389ea4aee39761df874aea434e1769',
                'b3e0e4dec77724b7d7430a28cbab9a78ebf3c7d55facdcc62c74c7c56b38ff7c',
                '9f01334cdc7ca53e6d169781935d967b16206766b311d81b31ddd55a14a3c6c7',
                'd9cd4ae6db732a503e4d09a182cc4408f1cdc47d60e9cd27856b34e70c21bfab',
                '66819fc60381c00fa7e8f7220bf89ca0dc467408d58802970a534f742c25f2d2',
                'bab5b1d98f948c6eecb2e6178fdfeafaac2b82f446cc7a7aecd90b69a75ad8fe',
                '9b1ff2cd6eb1340854b37edece8d668f6248d2866f5683e7222321398727ae6d',
            ],
            pos: 56,
        })

        const headers: FixedArray<BlockHeader, 3> = [
            {
                version: reverseByteString(toByteString('27eee000'), 4n),
                prevBlockHash: Sha256(
                    reverseByteString(
                        toByteString(
                            '0000000000000b27043fc0b30a5f50c2517cb4dbd6cc0d015373c65a56cd61ef'
                        ),
                        32n
                    )
                ),
                merkleRoot: Sha256(
                    reverseByteString(
                        toByteString(
                            '6ae820ac1cf24be0538c75c026b95ee4fb4debc744012a4c1f9eea138380256c'
                        ),
                        32n
                    )
                ),
                time: 1702540120n,
                bits: reverseByteString(toByteString('1d00ffff'), 4n),
                nonce: 0x6934b7b7n,
            },
            {
                version: reverseByteString(toByteString('201a0000'), 4n),
                prevBlockHash: Sha256(
                    reverseByteString(
                        toByteString(
                            '0000000000000eeebf60f895f42d4a66e941c2216cd9dce286a685b8bb988c6f'
                        ),
                        32n
                    )
                ),
                merkleRoot: Sha256(
                    reverseByteString(
                        toByteString(
                            '2eb2b67d9e5469eac85e54f8ad35ae8add341761f46bd2123fa5bad5462f69cb'
                        ),
                        32n
                    )
                ),
                time: 1702541324n,
                bits: reverseByteString(toByteString('1d00ffff'), 4n),
                nonce: 0xeabfc6acn,
            },
            {
                version: reverseByteString(toByteString('20e00000'), 4n),
                prevBlockHash: Sha256(
                    reverseByteString(
                        toByteString(
                            '0000000000001a1b86f75c60288ba2819e7ccbffc60a075f258bdef675b2ab22'
                        ),
                        32n
                    )
                ),
                merkleRoot: Sha256(
                    reverseByteString(
                        toByteString(
                            '5c70c43789139748237afeff04eb5de545594eb4167d7467cfe92dfba21078dd'
                        ),
                        32n
                    )
                ),
                time: 1702542531n,
                bits: reverseByteString(toByteString('1d00ffff'), 4n),
                nonce: 0xf309b065n,
            },
        ]

        // Bind custom tx builder for call to "mint".
        instance.bindTxBuilder('mint', Bsv20LockBtcToMint.mintTxBuilder)

        const contractTx = await instance.methods.mint(
            Addr(ordinalAddress.toByteString()),
            lockPubKey,
            amtMinted,
            btcTx,
            merkleProof,
            headers,
            {} as MethodCallOptions<Bsv20LockBtcToMint>
        )

        console.log('Bid Tx:', contractTx.tx.id)
    })
})

/**
 * convert pool difficulty to a target number
 * @param {*}  difficulty which can fetch by api https://api.whatsonchain.com/v1/bsv/<network>/chain/info
 * @returns target
 */
function pdiff2Target(difficulty) {
    if (typeof difficulty === 'number') {
        difficulty = BigInt(Math.floor(difficulty))
    }

    return BigInt(toTarget('1d00ffff') / difficulty)
}

/**
 * inspired by : https://bigishdata.com/2017/11/13/how-to-build-a-blockchain-part-4-1-bitcoin-proof-of-work-difficulty-explained/
 * @param {*} bitsHex bits of block header, in big endian
 * @returns a target number
 */
function toTarget(bitsHex) {
    const shift = bitsHex.substr(0, 2)
    const exponent = parseInt(shift, 16)
    const value = bitsHex.substr(2, bitsHex.length)
    const coefficient = parseInt(value, 16)
    const target = coefficient * 2 ** (8 * (exponent - 3))
    return BigInt(target)
}

function prepProofFromElectrum(proof: any): MerkleProof {
    const res: Array<Node> = []
    const directions = numToBoolList(proof.pos)

    proof.merkle.forEach((hash, i) => {
        let pos = MerklePath.RIGHT_NODE
        if (i < directions.length && directions[i] == true) {
            pos = MerklePath.LEFT_NODE
        }

        res.push({
            hash: Sha256(reverseByteString(toByteString(hash), 32n)),
            pos,
        } as Node)
    })

    // Pad remainder with invalid nodes.
    const invalidNode = {
        hash: Sha256(
            '0000000000000000000000000000000000000000000000000000000000000000'
        ),
        pos: MerklePath.INVALID_NODE,
    }
    return [...res, ...Array(32 - res.length).fill(invalidNode)] as MerkleProof
}

function numToBoolList(num) {
    const binaryStr = num.toString(2)
    const boolArray: boolean[] = []

    for (let i = binaryStr.length - 1; i >= 0; i--) {
        boolArray.push(binaryStr[i] === '1')
    }

    return boolArray
}
