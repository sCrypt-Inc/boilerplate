const { buildContractClass, getPreimage, toHex, bsv, SigHashPreimage, PubKey, PubKeyHash, signTx } = require('scryptlib')
const { loadDesc, showError, fetchUtxos, sendTx, deployContract, sleep, inputSatoshis } = require('../helper')
const { privateKey } = require('../privateKey')

const publicKey = privateKey.publicKey
const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const address = privateKey.toAddress()

const Signature = bsv.crypto.Signature
const Faucet = buildContractClass(loadDesc('faucetV2_debug_desc.json'))
// miner fee in satoshi per each withdraw
const withdrawMinerFee = 6000
// withdraw interval limit in seconds
const withdrawIntervals = 5
// how many satoshis can be withdrawn each time
const withdrawAmount = 20000

const initialTimestamp = 1646992089
const faucet = new Faucet(withdrawIntervals, withdrawAmount, new PubKeyHash(toHex(publicKeyHash)), initialTimestamp)

const sleepSeconds = 6
const iterations = 3

async function deploy() {
    const deployTx = await deployContract(faucet, inputSatoshis)
    // avoid mempool conflicts, sleep to allow previous tx to "sink-into" the network
    await sleep(sleepSeconds)
    console.log('deploy:', deployTx.id)
    return [deployTx, inputSatoshis, initialTimestamp]
}

async function withdraw(prevTx, prevSatoshi, prevTimestamp) {
    for (i = 0; i < iterations; i++) {
        const newLocktime = prevTimestamp + withdrawIntervals
        const newLockingScript = faucet.getNewStateScript({ lastWithdrawTimestamp: newLocktime })
        const newOutputAmount = prevSatoshi - withdrawAmount - withdrawMinerFee
        const withdrawTx = new bsv.Transaction()
        withdrawTx
            .addInputFromPrevTx(prevTx)
            .setInputScript(0, (tx, utxo) => {
                const preimage = getPreimage(tx, utxo.script, utxo.satoshis)
                return faucet.withdraw(new SigHashPreimage(toHex(preimage)), new PubKeyHash(toHex(publicKeyHash))).toScript()
            })
            .setInputSequence(0, 0xfffffffe)
            .addOutput(new bsv.Transaction.Output({ script: newLockingScript, satoshis: newOutputAmount }))
            .addOutput(new bsv.Transaction.Output({ script: bsv.Script.buildPublicKeyHashOut(address), satoshis: withdrawAmount }))
            .setLockTime(newLocktime)
            .seal()
        const withdrawTxid = await sendTx(withdrawTx)
        await sleep(sleepSeconds)
        console.log('withdraw:', withdrawTxid)
        prevTx = withdrawTx
        prevSatoshi = newOutputAmount
        prevTimestamp = newLocktime
    }
    return [prevTx, prevSatoshi, prevTimestamp]
}

async function deposit(prevTx, prevSatoshi, prevTimestamp) {
    const depositAmount = 100000
    // !!! state in new locking script must be the same as before !!!
    const depositLockingScript = faucet.getNewStateScript({ lastWithdrawTimestamp: prevTimestamp })
    const depositTx = new bsv.Transaction()
    depositTx
        .addInputFromPrevTx(prevTx)
        .setInputScript(0, (tx, utxo) => {
            const sighashType = Signature.SIGHASH_SINGLE | Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_FORKID
            const preimage = getPreimage(tx, utxo.script, utxo.satoshis, 0, sighashType)
            return faucet.deposit(new SigHashPreimage(toHex(preimage)), depositAmount).toScript()
        })
        .from(await fetchUtxos(address))
        .addOutput(new bsv.Transaction.Output({ script: depositLockingScript, satoshis: prevSatoshi + depositAmount }))
        .change(address)
        .sign(privateKey)
        .seal()

    const depositTxid = await sendTx(depositTx)
    await sleep(sleepSeconds)
    console.log('deposit:', depositTxid)
    return [depositTx, prevSatoshi + depositAmount, prevTimestamp]
}

async function destroy(prevTx, prevSatoshi) {
    const destroyTx = new bsv.Transaction()
    destroyTx
        .addInputFromPrevTx(prevTx)
        .setInputScript(0, (tx, utxo) => {
            const sig = signTx(tx, privateKey, utxo.script, utxo.satoshis)
            return faucet.destroy(sig, new PubKey(toHex(publicKey))).toScript()
        })
        .addOutput(new bsv.Transaction.Output({ script: bsv.Script.buildPublicKeyHashOut(address), satoshis: prevSatoshi - 150 }))
        .seal()
    const destroyTxid = await sendTx(destroyTx)
    console.log('destroy:', destroyTxid)
}

async function main() {
    console.log()
    try {
        // deploy contract
        let prev = await deploy()
        // withdraw
        prev = await withdraw(prev[0], prev[1], prev[2])
        // deposit
        prev = await deposit(prev[0], prev[1], prev[2])
        // withdraw again
        prev = await withdraw(prev[0], prev[1], prev[2])
        // destroy
        await destroy(prev[0], prev[1])
        // all good here
        console.log()
        console.log('succeed on testnet')
    } catch (error) {
        console.log()
        console.log('fail on testnet')
        showError(error)
    }
}

main()
