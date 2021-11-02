const { bsv, buildContractClass, getPreimage, toHex, Ripemd160, num2bin, Bytes, SigHashPreimage } = require('scryptlib');
const { DataLen, loadDesc, deployContract , createInputFromPrevTx, sendTx, showError } = require('../helper');
const {
    privateKey,
    privateKey2
} = require('../privateKey');



(async () => {
    try {

        let betPrice = 100
        let rabinPubKey = 0x1541942cc552a95c4832350ce99c2970f5b3ce9237a09c70c0e867d28039c05209b601105d3b3634cdaee4931809bc0c41d6165a0df16829a3a31202f56003239dd2c6e12297e94ef03e6aa61a147ea2b51c476dc45f5a2406b66d1ece2755c1f3d4144c0a42acc99b599d0643654a4cac392efbcf3db84d4233834afd1n
        // 2021.1.1 00:00:00
        let timestamp = 1609430400
        const publicKeyA = privateKey.publicKey
        const publicKeyB = privateKey2.publicKey

        let pubKeyHashA = new Ripemd160(toHex(bsv.crypto.Hash.sha256ripemd160(publicKeyA.toBuffer())))
        let pubKeyHashB = new Ripemd160(toHex(bsv.crypto.Hash.sha256ripemd160(publicKeyB.toBuffer())))

        const BinaryOption = buildContractClass(loadDesc('binaryOption_debug_desc.json'))
        const binaryOption = new BinaryOption(betPrice, rabinPubKey, timestamp, pubKeyHashA, pubKeyHashB)

        let amount = 10000
        // lock fund to the script
        const lockingTx = await deployContract(binaryOption, amount)
        console.log('funding txid:      ', lockingTx.id);

        const newLockingScript = bsv.Script.buildPublicKeyHashOut(privateKey2.toAddress())

        const unlockingTx = new bsv.Transaction();

        unlockingTx.addInput(createInputFromPrevTx(lockingTx))
            .setOutput(0, (tx) => {
                return new bsv.Transaction.Output({
                    script: newLockingScript,
                    satoshis: amount - tx.getEstimateFee(),
                  })
            })
            .setInputScript(0, (tx, output) => {
                const preimage = getPreimage(tx, output.script, output.satoshis)
                const sig = 0x64b087945b9b49fb1dce3994bb9da714401edd75d6887c4bbf2864cd052e296755580e91ee539f5c24bb32b8fb7266e0effd0c5194b3c4af967b4341784bc3ecf377d46c56f433bd802d73739fe18f11322ee8f84c17bee4eb6d65514e30bbebdc19f428605bcae93f0558995aa3ac5dd09363a7dbaeecd0d3a052feb8n
                const msg = new Bytes('500000000000000080f5ed5f00000000')
                const padding = new Bytes('00')
                const newAmount = tx.outputs[0].satoshis
                return binaryOption.unlock(new SigHashPreimage(toHex(preimage)), sig, msg, padding, newAmount).toScript()
            })
            .seal()


        unlockingTxid = await sendTx(unlockingTx)
        console.log('unlocking tx:', unlockingTxid)
        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()