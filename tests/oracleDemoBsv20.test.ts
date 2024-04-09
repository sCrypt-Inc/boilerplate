import { expect, use } from 'chai'
import {
    Addr,
    ByteString,
    MethodCallOptions,
    PubKey,
    SmartContract,
    bsv,
    findSig,
    toByteString,
} from 'scrypt-ts'
import { OracleDemoBsv20 } from '../src/contracts/oracleDemoBsv20'
import { getDefaultSigner } from './utils/helper'
import { RabinPubKey, RabinSig, WitnessOnChainVerifier } from 'scrypt-ts-lib'
import chaiAsPromised from 'chai-as-promised'
import { BSV20V2P2PKH } from 'scrypt-ord'
use(chaiAsPromised)

// All data was pre-fetched from https://api.witnessonchain.com/
// https://api.witnessonchain.com/#/info/AppController_getInfo
const PUBKEY = {
    publicKey:
        'ad7e1e8d6d2960129c9fe6b636ef4041037f599c807ecd5adf491ce45835344b18fd4e7c92fd63bb822b221344fe21c0522ab81e9f8e848206875370cae4d908ac2656192ad6910ebb685036573b442ec1cff490c1638b7f5a181ae6d6bc9a04a305720559c893611f836321c2beb69dbf3694b9305a988c77e0a451c38674e84ce95a912833d2cf4ca9d48cc76d8250d0130740145ca19e20b1513bb93ca7665c1f110493d1b5aa344702109df5feca790f988eaa02f92e019721ae0e8bfaa9fdcd3401ffb4433fbe6e575ed9f704a6dc60872f0d23b2f43bfe5e64ce0fbc71283e6dedee79e20ad878917fa4a8257f879527c58f89a8670be591fc2815f7e7a8d74a9830788404f66170058dd7a08f47c4954324088dbed2f330015ccc36d29efd392a3cd5bf9835871f6b4b203c228af16f5b461676ce8e51003afd3137978117cf41147f2bb615a7c338bebdca5f81a43fe9b51480ae52ce04cf2f2b1714599fe09ae8401e0e155b4caa89fb37b00c604517fc36961f84901a73a343bb40',
}
// https://api.witnessonchain.com/#/v1/V1Controller_getInscription
const RESP = {
    timestamp: 1711554084,
    outpoint:
        '503021e05b44fc43f992b13a0e0d48ed68fc2a79e470937f6ffff5a910a15a5e_0',
    fungible: 1,
    amt: 100,
    id: 'd5cf3e729e7f68f160dbad7cb3cec008127e5484484d68ba2dcebd3bbf9fa776_0',
    data: '04243e0466005e5aa110a9f5ff6f7f9370e4792afc68ed480d0e3ab192f943fc445be021305000000000016400000000000000643563663365373239653766363866313630646261643763623363656330303831323765353438343438346436386261326463656264336262663966613737365f30',
    signature: {
        s: 'f59720bb97826df3fe58e5bac09d1c0924d0b1c9fe93044276cae97da0450af31ddaed1cb805ac934172072514bbd2e2a85cf811a5c1971509617dcf4171484530c7e491d1a13b8b0b9ba013785a6f51ed0204afa6aefb98dcd616194a4bc95289ea7d3a7b7a8348f3205b8f0f95a00c4f17877a81c26a6ae48df7d064004accb530671dfcd9d5a0e0cc5ec26127de15477c66d963e90715961d01e73d3435a2d4c853065089f0fc899a2dd0826790d311696cb8ebc2901b6b4361b2275dcd351c85c1444a8f1f4254be3fdd5b4e63c617641e269dcd5eb00a0e5dc7a7c435118fb2cff5102a9d081545b387f5708e202f2943381741de045d27b87377f4bec9e99f64351ec478643d56638bd6fe8740aece764e1bd19ed37829dfc1fe2e607af2e5c394d2d3d10b9fedc916ed64ea715ac054a05769d7f55fa4576406fe2ce58ed2d9fc38bb87425edc101ead6fbadcfad06825992f2cb198dc0f8f9f20189a1cec0489a0ee7a9c7869b53f2f688e30514258c93ba702515ef61ef42d67af40',
        padding: '00',
    },
}

if (process.env.NETWORK === 'local') {
    describe('Test SmartContract `OracleDemoBsv20`', () => {
        // token utxo
        const txid =
            '503021e05b44fc43f992b13a0e0d48ed68fc2a79e470937f6ffff5a910a15a5e'
        const vout = 0
        const script =
            '0063036f726451126170706c69636174696f6e2f6273762d3230004c747b2270223a226273762d3230222c226f70223a227472616e73666572222c226964223a22643563663365373239653766363866313630646261643763623363656330303831323765353438343438346436386261326463656264336262663966613737365f30222c22616d74223a22313030227d6876a914700cc86d386b5c4707c06c96985f57ca875266e988ac'
        // keys to unlock token utxo
        const tokenPrivKey = bsv.PrivateKey.fromWIF(
            'cRmsBM2joHToN2fEWWh5eXuSGCinmyG7rSv1d9ZECKcngBXJnWQw'
        )
        const tokenPubKey = tokenPrivKey.publicKey

        let demoInstance: OracleDemoBsv20
        let tokenInstance: BSV20V2P2PKH
        const signer = getDefaultSigner(tokenPrivKey)

        before(async () => {
            // setup demo instance
            OracleDemoBsv20.loadArtifact()
            const rabinPubKey: RabinPubKey =
                WitnessOnChainVerifier.parsePubKey(PUBKEY)
            const inscriptionId = toByteString(
                'd5cf3e729e7f68f160dbad7cb3cec008127e5484484d68ba2dcebd3bbf9fa776_0',
                true
            )
            const amt = 10n
            demoInstance = new OracleDemoBsv20(rabinPubKey, inscriptionId, amt)
            await demoInstance.connect(signer)
            await demoInstance.deploy()
            // setup token instance
            tokenInstance = BSV20V2P2PKH.fromUTXO({
                txId: txid,
                outputIndex: vout,
                script,
                satoshis: 1,
            })
            await tokenInstance.connect(signer)
        })

        it('should pass the public method unit test successfully.', async () => {
            // customise call tx for demoInstance
            demoInstance.bindTxBuilder('unlock', (current: OracleDemoBsv20) => {
                const unsignedTx = new bsv.Transaction().addInput(
                    current.buildContractInput()
                )
                return Promise.resolve({
                    tx: unsignedTx,
                    atInputIndex: 0,
                    nexts: [],
                })
            })
            // parse the response from the oracle
            const oracleMsg: ByteString = WitnessOnChainVerifier.parseMsg(RESP)
            const oracleSig: RabinSig = WitnessOnChainVerifier.parseSig(RESP)
            // call demoInstance.unlock to get a partial tx
            const partialTx = await demoInstance.methods.unlock(
                oracleMsg,
                oracleSig,
                1n,
                {
                    multiContractCall: true,
                } as MethodCallOptions<OracleDemoBsv20>
            )
            // customise call tx for tokenInstance
            tokenInstance.bindTxBuilder(
                'unlock',
                async (
                    current: BSV20V2P2PKH,
                    options: MethodCallOptions<BSV20V2P2PKH>
                ) => {
                    const tokenChange = new BSV20V2P2PKH(
                        toByteString(current.id, true),
                        current.sym,
                        current.max,
                        current.dec,
                        Addr(options.changeAddress!.toByteString())
                    ).setAmt(current.getAmt())
                    const unsignedTx = options
                        .partialContractTx!.tx.addInput(
                            current.buildContractInput()
                        )
                        .addOutput(
                            new bsv.Transaction.Output({
                                script: tokenChange.lockingScript,
                                satoshis: 1,
                            })
                        )
                        .change(await current.signer.getDefaultAddress())
                    return Promise.resolve({
                        tx: unsignedTx,
                        atInputIndex: 1,
                        nexts: [],
                    })
                }
            )
            // call tokenInstance.unlock to get the final tx
            const finalTx = await tokenInstance.methods.unlock(
                (sigResps) => findSig(sigResps, tokenPubKey),
                PubKey(tokenPubKey.toHex()),
                {
                    multiContractCall: true,
                    partialContractTx: partialTx,
                    pubKeyOrAddrToSign: tokenPubKey,
                    changeAddress: tokenPubKey.toAddress(),
                } as MethodCallOptions<BSV20V2P2PKH>
            )
            // final call
            const callContract = async () =>
                SmartContract.multiContractCall(finalTx, signer)
            return expect(callContract()).not.rejected
        })
    })
}
