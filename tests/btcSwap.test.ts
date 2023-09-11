import { expect } from 'chai'
import { BTCSwap } from '../src/contracts/btcSwap'
import {
    FixedArray,
    MethodCallOptions,
    PubKey,
    Addr,
    Sha256,
    bsv,
    findSig,
    reverseByteString,
    toByteString,
} from 'scrypt-ts'
import { getDefaultSigner } from './utils/helper'
import { BlockHeader, MerklePath, MerkleProof, Node } from 'scrypt-ts-lib'

describe('Test SmartContract `BTCSwap`', () => {
    let btcSwap: BTCSwap

    // TODO: Make this actual btc testnet key and adjust values
    const alicePrivKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
    const alicePubKey = alicePrivKey.publicKey
    const aliceAddr = alicePubKey.toAddress().toByteString()

    const bobPrivKey = bsv.PrivateKey.fromWIF(
        'cNgrjdLrsKLpArLadM1gzg4kzFdejma3riLcpeDgTEPaJbPcWip3'
    )
    const bobPubKey = bobPrivKey.publicKey
    const bobAddr = bobPubKey.toAddress().toByteString()
    const bobP2WPKHAddr = toByteString(
        'dfa6b3ba7c262e3c68cfe9ee5dd47dbf25aac528'
    ) // TODO: Derive P2WPKH addr dynamically

    const timeout = 1689158532n

    const targetDifficulty = 100000000.0

    const amountBTC = 1740859n
    const amountBSV = 53000000n

    //const btcTx = toByteString('02000000000101d81378531e4a1184003b9f327bb40cdde3dfebccc79cd77278fdd8dca54e85bc0100000000feffffff023b901a0000000000160014dfa6b3ba7c262e3c68cfe9ee5dd47dbf25aac528401f0000000000001600141507ce91a9b7d495d8c4a46f7d8738b303217507024730440220293248afa7c023f44d55a7283ee0d481689039e2036f735991cf37d1ee68e3ac02200197e5814abcf14502c43b16e652e5f3c385fac92a455092cc39f15cdea7988e012103d2a40712d08dc20f5468285026191792dcbc2816e81158fb3a99bcd8948753240b412500')
    const btcTx = toByteString(
        '0200000001d81378531e4a1184003b9f327bb40cdde3dfebccc79cd77278fdd8dca54e85bc0100000000feffffff023b901a0000000000160014dfa6b3ba7c262e3c68cfe9ee5dd47dbf25aac528401f0000000000001600141507ce91a9b7d495d8c4a46f7d8738b3032175070b412500'
    )
    const merkleProof: MerkleProof = prepProofFromElectrum({
        block_height: 2441484,
        merkle: [
            '7b58dcb6ae11214b3dab7d9d22f9fae2627fde2101d2433fa50a29de197578f3',
            '756c2daaccf966e4cdb794e8cbc2f90c37a0da8156fad9077ae9b47ab148659b',
            'f65ba1696c754a8b4eca0eae6b831b227e08c69ef214d2d90333dcb05973b810',
            '0a587bcf18b46b3a02fe2b9faa8819bd66b707a0719b0000036696a71acad282',
            'ea83e9b01303f9e94e2037c32935d41b8d53c722b4d774aa0de60dac7b967db0',
            '46b7f57bd5f7ce5f14a300d17f8f03f92364a8a090c376d01b3fdfde384ac94e',
        ],
        pos: 45,
    })
    const headers: FixedArray<BlockHeader, 3> = [
        {
            version: reverseByteString(toByteString('20200000'), 4n),
            prevBlockHash: Sha256(
                reverseByteString(
                    toByteString(
                        '00000000000000079b6888a5c2c880d4666ed7f959bda6ec6e64c7ccbab1226b'
                    ),
                    32n
                )
            ),
            merkleRoot: Sha256(
                reverseByteString(
                    toByteString(
                        '8fcc3233471ab246bf8ff895540ebdecceeddaf8dfca1015801262fa517249bc'
                    ),
                    32n
                )
            ),
            time: 1689160620n,
            bits: reverseByteString(toByteString('192495f8'), 4n),
            nonce: 0x0fbe5502n,
        },
        {
            version: reverseByteString(toByteString('20002000'), 4n),
            prevBlockHash: Sha256(
                reverseByteString(
                    toByteString(
                        '0000000000000011f9ac5d86d48b0a7f8413e3de01d8957d44b5a619b0dd9d50'
                    ),
                    32n
                )
            ),
            merkleRoot: Sha256(
                reverseByteString(
                    toByteString(
                        '2925c803168e5dc8b47fa7365a4301376d4154572b5e37f4fdf23588271af78f'
                    ),
                    32n
                )
            ),
            time: 1689161016n,
            bits: reverseByteString(toByteString('192495f8'), 4n),
            nonce: 0x8b6267d4n,
        },
        {
            version: reverseByteString(toByteString('2830e000'), 4n),
            prevBlockHash: Sha256(
                reverseByteString(
                    toByteString(
                        '000000000000000f74216f921b5141a21265f3ae19cbd95640d0570bc2a881d1'
                    ),
                    32n
                )
            ),
            merkleRoot: Sha256(
                reverseByteString(
                    toByteString(
                        'a94272c07a39d4af4d81864613016bb944059244d9b63ec183d5db492023d218'
                    ),
                    32n
                )
            ),
            time: 1689161372n,
            bits: reverseByteString(toByteString('192495f8'), 4n),
            nonce: 0xbfc81555n,
        },
    ]

    before(() => {
        BTCSwap.loadArtifact()

        btcSwap = new BTCSwap(
            Addr(aliceAddr),
            Addr(bobAddr),
            Addr(bobP2WPKHAddr),
            timeout,
            pdiff2Target(targetDifficulty),
            amountBTC,
            amountBSV
        )
    })

    it('should pass swap', async () => {
        await btcSwap.connect(getDefaultSigner(alicePrivKey))

        await btcSwap.deploy(1)
        const callContract = async () =>
            btcSwap.methods.swap(
                btcTx,
                merkleProof,
                headers,
                PubKey(alicePubKey.toByteString()),
                (sigResps) => findSig(sigResps, alicePubKey),
                {
                    pubKeyOrAddrToSign: alicePubKey,
                } as MethodCallOptions<BTCSwap>
            )
        return expect(callContract()).not.rejected
    })

    it('should pass cancel', async () => {
        await btcSwap.connect(getDefaultSigner(bobPrivKey))

        await btcSwap.deploy(1)
        const callContract = async () =>
            btcSwap.methods.cancel(
                PubKey(bobPubKey.toByteString()),
                (sigResps) => findSig(sigResps, bobPubKey),
                {
                    lockTime: Number(timeout) + 1000,
                    pubKeyOrAddrToSign: bobPubKey,
                } as MethodCallOptions<BTCSwap>
            )
        return expect(callContract()).not.rejected
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
        })
    })

    // Pad remainder with invalid nodes.
    const invalidNode = {
        hash: Sha256(
            '0000000000000000000000000000000000000000000000000000000000000000'
        ),
        pos: MerklePath.INVALID_NODE,
    }
    return [
        ...res,
        ...Array(Number(MerklePath.DEPTH) - res.length).fill(invalidNode),
    ] as MerkleProof
}

function numToBoolList(num) {
    const binaryStr = num.toString(2)
    const boolArray: boolean[] = []

    for (let i = binaryStr.length - 1; i >= 0; i--) {
        boolArray.push(binaryStr[i] === '1')
    }

    return boolArray
}
