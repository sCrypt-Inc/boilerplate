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
    timestamp: 1711511226,
    outpoint:
        '7972d872ae5cbd4fe1dd5912a7cef79745950bce38ba6f1df912ee1fe5952557_0',
    fungible: 1,
    amt: 10000,
    id: '7972d872ae5cbd4fe1dd5912a7cef79745950bce38ba6f1df912ee1fe5952557_0',
    data: '04ba96036600572595e51fee12f91d6fba38ce0b954597f7cea71259dde14fbd5cae72d8727900000000011027000000000000373937326438373261653563626434666531646435393132613763656637393734353935306263653338626136663164663931326565316665353935323535375f30',
    signature: {
        s: '80385ea550a64558f7d0146c7b7485b36044b20e2e291cb089864c80d344476657c291688c6459ce7037cb2ee8941c1b6176a2b9e46da429ba91564daadd72f2d5b2b9550cd0a9a78df8eda96905848fec8bfbf600dd2af2cd336b7b6d0615fe1e3ce41b7de3498fe0e0cd6e86d79c62199eea2eb514663ba8fabc3eaf6a603487c10465650b20c48b87fb5d0a1f913073f90eb2b0e9f56eb41b5518f76b8bb2cd7906c5bb0855d6f0a6fe5e6456c8a27e5868f36374733043e4cc0c6dd28e5e4cd0bdb3b7b76dbcfee5a7cfe4fc87404aa431058ef58dcf528ad0a37fc5f8ede5da557bdd0e4fc5007e4e2b502199fd794785e67e534c213ca73b0bb02bebc822cfe97b5fcbaebb45ebd875499e923b10af2d05db8ec5220afad9dd45eef04569ddb8f6bbf0e6cf53407387c87358b9ebdce084930239de1efdc130df4b05814ee22a8848436ce94b2b4d87643e0d24dd9d155dcd750f726f893763d56c530d57480a207c50ea7f165c9e33909354f340ceab752eac60d52dcc653a5ca0e23f',
        padding: '0000000000000000',
    },
}

describe('Test SmartContract `OracleDemoBsv20`', () => {
    // token utxo
    const txid =
        '7972d872ae5cbd4fe1dd5912a7cef79745950bce38ba6f1df912ee1fe5952557'
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
        const inscriptionId = toByteString(`${txid}_${vout}`, true)
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
