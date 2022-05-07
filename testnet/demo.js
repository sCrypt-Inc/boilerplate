const { buildContractClass, bsv } = require('scryptlib');
const { compileContract, showError, deployContract, sendTx, createInputFromPrevTx } = require('../helper');
const { privateKey } = require('../privateKey');

(async() => {
    try {
        const amount = 1000

        // get locking script
        const Demo = buildContractClass(compileContract('demo.scrypt'));
        demo = new Demo(4, 7);
        
        // lock fund to the script
        const tx = await deployContract(demo, amount);
        console.log('locking txid:     ', tx.id)

        const unlockingTx = new bsv.Transaction();
        unlockingTx.addInput(createInputFromPrevTx(tx))
        .change(privateKey.toAddress())
        .setInputScript(0, (_) => {
            return demo.add(11).toScript();
        })
        .seal()
        
        // unlock
        await sendTx(unlockingTx)

        console.log('unlocking txid:   ', unlockingTx.id)

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()