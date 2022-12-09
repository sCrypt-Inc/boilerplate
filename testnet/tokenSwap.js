const {
    bsv,
    buildContractClass,
    getPreimage,
    toHex,
    num2bin,
    SigHashPreimage,
    signTx,
    PubKey,
    Sig,
    Bytes,
    Sha256,
} = require('scryptlib');
const {
    loadDesc,
    fetchUtxos,
    sendTx,
    showError,
    sleep,
    deployContract,    
} = require('../helper');
const {
    privateKey,
    privateKey2,
    privateKey3,
} = require('../privateKey');

const FEE = 40000;
const poolPubkey = privateKey3.publicKey
const firstSaveBsvAmount = 1000
const firstSaveTokenAmount = 10000
const feeRate = 2 // 0.2%

const initBsv = 1000
let bsvBalance = 1000

// token balance
let tokenBalance1 = 1000000000
let tokenBalance2 = 0
let poolBalance = 0

// lp balance
let lpPoolBalance = 0
let lpBalance1 = 0

// merkle root
let tokenMerkleRoot = ''
let lpMerkleRoot = ''
let senderMerklePath = ''
let receiverMerklePath = ''
let poolMerklePath = ''
let mergeMerklePath = ''

function buildTokenMerkleRoot(createPath, isPool = false) {
    let dataA = Buffer.concat([Buffer.from(toHex(privateKey.publicKey), 'hex'), Buffer.from(num2bin(tokenBalance1, 8), 'hex')])
    let leafA = bsv.crypto.Hash.sha256(dataA)

    let dataB = Buffer.concat([Buffer.from(toHex(poolPubkey), 'hex'), Buffer.from(num2bin(poolBalance, 8), 'hex')])
    let leafB = bsv.crypto.Hash.sha256(dataB)

    let node1 = bsv.crypto.Hash.sha256(Buffer.concat([Buffer.from(toHex(leafA), 'hex'), Buffer.from(toHex(leafB), 'hex')]))
    let dataC = Buffer.concat([Buffer.from(toHex(privateKey2.publicKey), 'hex'), Buffer.from(num2bin(tokenBalance2, 8), 'hex')])
    let leafC = bsv.crypto.Hash.sha256(dataC)
    let node2 = bsv.crypto.Hash.sha256(Buffer.from(toHex(leafC), 'hex'))
    tokenMerkleRoot = toHex(bsv.crypto.Hash.sha256(Buffer.concat([Buffer.from(toHex(node1), 'hex'), Buffer.from(toHex(node2), 'hex')])))
    //console.log('userA: (balance %s, leaf %s), pool: (balance %s, leaf %s), userB: (balance %s, leaf %s), node1: %s, node2: %s, root %s', tokenBalance1, toHex(leafA), poolBalance, toHex(leafB), tokenBalance2, toHex(leafC), toHex(node1), toHex(node2), tokenMerkleRoot)

    if (createPath) {
        receiverMerklePath = new Bytes(Buffer.concat([Buffer.alloc(32, 0), Buffer.from('02', 'hex')]).toString('hex'))
        poolMerklePath = new Bytes(Buffer.from('00', 'hex').toString('hex'))
        if (isPool) {
            senderMerklePath = new Bytes(Buffer.from('00', 'hex').toString('hex'))
            mergeMerklePath = new Bytes(Buffer.concat([node2, Buffer.from('01', 'hex')]).toString('hex'))
        }
        else {
            senderMerklePath = new Bytes(Buffer.concat([leafB, Buffer.from('01', 'hex')]).toString('hex'))
            mergeMerklePath = new Bytes(Buffer.from('00', 'hex').toString('hex'))
        }
    }

    return tokenMerkleRoot
}

async function createContractTx(tokenSwap) {
    let dataA = Buffer.concat([Buffer.from(toHex(privateKey.publicKey), 'hex'), Buffer.from(num2bin(tokenBalance1, 8), 'hex')])
    let leafA = bsv.crypto.Hash.sha256(dataA)

    let dataB = Buffer.concat([Buffer.from(toHex(poolPubkey), 'hex'), Buffer.from(num2bin(0, 8), 'hex')])
    let leafB = bsv.crypto.Hash.sha256(dataB)

    let node = Buffer.concat([Buffer.from(toHex(leafA), 'hex'), Buffer.from(toHex(leafB), 'hex')])
    tokenMerkleRoot = toHex(bsv.crypto.Hash.sha256(node))

    //// build lp token tree
    lpMerkleRoot = toHex(bsv.crypto.Hash.sha256(Buffer.concat([Buffer.from(toHex(privateKey.publicKey), 'hex'), Buffer.from(num2bin(lpBalance1, 8), 'hex')])))

    tokenSwap.setDataPart(tokenMerkleRoot + lpMerkleRoot + num2bin(lpPoolBalance, 8))

    const inputAmount = 1000;

    const tx = await deployContract(tokenSwap, inputAmount);
    return tx
}

async function createAddTokenUserTx(prevTx, tokenSwap) {

    let dataC = Buffer.concat([Buffer.from(toHex(privateKey2.publicKey), 'hex'), Buffer.from(num2bin(0, 8), 'hex')])
    let leafC = bsv.crypto.Hash.sha256(dataC)
    let node1 = bsv.crypto.Hash.sha256(Buffer.from(toHex(leafC), 'hex'))
    let insertMerklePath = new Bytes(Buffer.concat([Buffer.alloc(32, 0), Buffer.from('02', 'hex'), Buffer.from(tokenMerkleRoot, 'hex'), Buffer.from('00', 'hex')]).toString('hex'))
    tokenMerkleRoot = toHex(bsv.crypto.Hash.sha256(Buffer.concat([Buffer.from(tokenMerkleRoot, 'hex'), Buffer.from(toHex(node1), 'hex')])))

    tokenSwap.setDataPart(tokenMerkleRoot + lpMerkleRoot + num2bin(lpPoolBalance, 8))
    const newLockingScript = tokenSwap.lockingScript
    await sleep(6);

    const unlockingTx = new bsv.Transaction();

    unlockingTx.addInputFromPrevTx(prevTx)
        .from(await fetchUtxos(privateKey.toAddress()))
        .addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: prevTx.outputs[0].satoshis,
        }))
        .change(privateKey.toAddress())
        .setInputScript(0, (tx, output) => {
            // input 0 unlocking script
            let sigtype = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
            const preimage = getPreimage(tx, output.script, output.satoshis, inputIndex = 0, sighashType = sigtype)
            const userPubkey = new PubKey(toHex(privateKey2.publicKey))
            // get the sender sig 
            let adminSig = signTx(tx, privateKey, output.script, output.satoshis, inputIndex = 0, sighashType = sigtype)
            return tokenSwap.addTokenUser(
                new SigHashPreimage(toHex(preimage)),
                userPubkey,
                insertMerklePath,
                new Sig(toHex(adminSig)),
            ).toScript()
        })
        .sign(privateKey)
        .seal()

    return unlockingTx
}

async function createTransferTx(prevTx, tokenSwap) {
    const transferAmount = 100000

    buildTokenMerkleRoot(true)
    tokenBalance1 = tokenBalance1 - transferAmount
    tokenBalance2 = tokenBalance2 + transferAmount
    buildTokenMerkleRoot(false)

    tokenSwap.setDataPart(tokenMerkleRoot + lpMerkleRoot + num2bin(lpPoolBalance, 8))
    const newLockingScript = tokenSwap.lockingScript
    console.log('setDataPart:', tokenMerkleRoot, lpMerkleRoot, num2bin(lpPoolBalance, 8))

    await sleep(6);

    const unlockingTx = new bsv.Transaction();

    unlockingTx.addInputFromPrevTx(prevTx)
        .from(await fetchUtxos(privateKey.toAddress()))
        .addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: prevTx.outputs[0].satoshis,
        }))
        .change(privateKey.toAddress())
        .setInputScript(0, (tx, output) => {
            // input 0 unlocking script
            let sigtype = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
            const preimage = getPreimage(tx, output.script, output.satoshis, inputIndex = 0, sighashType = sigtype)
            const senderPubKey = new PubKey(toHex(privateKey.publicKey))
            // get the sender sig 
            let senderSig = signTx(tx, privateKey, output.script, output.satoshis, inputIndex = 0, sighashType = sigtype)
            const receiverPubKey = new PubKey(toHex(privateKey2.publicKey))

            return tokenSwap.transfer(
                new SigHashPreimage(toHex(preimage)),
                senderPubKey,
                new Sig(toHex(senderSig)),
                receiverPubKey,
                transferAmount,
                tokenBalance1 + transferAmount,
                senderMerklePath,
                tokenBalance2 - transferAmount,
                receiverMerklePath,
                mergeMerklePath,
                true
            ).toScript()
        })
        .sign(privateKey)
        .seal()


    return unlockingTx
}

async function createAddLiqTx(prevTx, tokenSwap) {

    const addTokenAmount = firstSaveTokenAmount
    const addBsvAmount = firstSaveBsvAmount

    buildTokenMerkleRoot(true, true)
    tokenBalance1 = tokenBalance1 - addTokenAmount
    poolBalance = poolBalance + addTokenAmount
    buildTokenMerkleRoot(false, true)

    // build lp token tree
    // first add
    let lpAddAmount = addBsvAmount
    lpBalance1 = lpBalance1 + lpAddAmount
    lpPoolBalance = lpPoolBalance + lpAddAmount
    lpMerklePath = new Bytes(Buffer.from('00', 'hex').toString('hex'))
    lpMerkleRoot = toHex(bsv.crypto.Hash.sha256(Buffer.concat([Buffer.from(toHex(privateKey.publicKey), 'hex'), Buffer.from(num2bin(lpBalance1, 8), 'hex')])))

    tokenSwap.setDataPart(tokenMerkleRoot + lpMerkleRoot + num2bin(lpPoolBalance, 8))
    const newLockingScript = tokenSwap.lockingScript
    console.log('addLiquidity.setDataPart:', tokenMerkleRoot, lpMerkleRoot, num2bin(lpPoolBalance, 8))

    await sleep(6);


    const unlockingTx = new bsv.Transaction();

    const newAmount = prevTx.outputs[0].satoshis + addBsvAmount;
    unlockingTx.addInputFromPrevTx(prevTx)
        .from(await fetchUtxos(privateKey.toAddress()))
        .addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: newAmount,
        }))
        .change(privateKey.toAddress())
        .setInputScript(0, (tx, output) => {
            // input 0 unlocking script
            let sigtype = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
            const preimage = getPreimage(tx, output.script, output.satoshis, inputIndex = 0, sighashType = sigtype)
            const senderPubKey = new PubKey(toHex(privateKey.publicKey))
            // get the sender sig 
            let senderSig = signTx(tx, privateKey, output.script, output.satoshis, inputIndex = 0, sighashType = sigtype)

            return tokenSwap.addLiquidity(
                new SigHashPreimage(toHex(preimage)),
                senderPubKey,
                new Sig(toHex(senderSig)),
                tokenBalance1 + addTokenAmount,
                addTokenAmount,
                addBsvAmount,
                senderMerklePath,
                poolBalance - addTokenAmount,
                poolMerklePath,
                true,
                mergeMerklePath,
                lpBalance1 - lpAddAmount,
                lpMerklePath
            ).toScript()
        })
        .sign(privateKey)
        .seal()



    return unlockingTx
}

async function createSwapBsvToTokenTx(prevTx, tokenSwap) {
    const swapBsvAmount = 10000
    const swapBsvFeeAmount = swapBsvAmount * (1000 - feeRate)
    const swapTokenAmount = Math.floor(swapBsvFeeAmount * poolBalance / (bsvBalance * 1000 + swapBsvFeeAmount))
    console.log('swapBsvToToken:', swapBsvAmount, swapBsvFeeAmount, swapTokenAmount, tokenBalance1, poolBalance, bsvBalance)
    buildTokenMerkleRoot(true, true)
    console.log('tokenMerkleRoot', tokenMerkleRoot)
    tokenBalance1 = tokenBalance1 + swapTokenAmount
    poolBalance = poolBalance - swapTokenAmount
    buildTokenMerkleRoot(false, true)
    console.log('tokenMerkleRoot', tokenMerkleRoot)


    tokenSwap.setDataPart(tokenMerkleRoot + lpMerkleRoot + num2bin(lpPoolBalance, 8));
    const newLockingScript = tokenSwap.lockingScript;

    await sleep(6);

    const unlockingTx = new bsv.Transaction();

    const newAmount = prevTx.outputs[0].satoshis + swapBsvAmount;
    unlockingTx.addInputFromPrevTx(prevTx)
        .from(await fetchUtxos(privateKey.toAddress()))
        .addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: newAmount,
        }))
        .change(privateKey.toAddress())
        .setInputScript(0, (tx, output) => {
            // input 0 unlocking script
            let sigtype = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
            const preimage = getPreimage(tx, output.script, output.satoshis, inputIndex = 0, sighashType = sigtype)
            //console.log('preimage:', preimage)
            const senderPubKey = new PubKey(toHex(privateKey.publicKey))
            // get the sender sig 
            let senderSig = signTx(tx, privateKey, output.script, output.satoshis, inputIndex = 0, sighashType = sigtype)

            return tokenSwap.swapBsvToToken(
                new SigHashPreimage(toHex(preimage)),
                senderPubKey,
                new Sig(toHex(senderSig)),
                tokenBalance1 - swapTokenAmount,
                senderMerklePath,
                poolBalance + swapTokenAmount,
                poolMerklePath,
                mergeMerklePath,
                false,
                swapBsvAmount
            ).toScript();
        })
        .sign(privateKey)
        .seal()


    bsvBalance = bsvBalance + swapBsvAmount
    //console.log('swapBsvToToken args:', toHex(preimage), senderPubKey, toHex(senderSig), tokenBalance1 - swapTokenAmount, senderMerklePath, poolBalance + swapTokenAmount, poolMerklePath, mergeMerklePath, false, swapBsvAmount)
    //console.log('\n\nswapBsvToToken tx:', tx.id, tx.serialize())

    return unlockingTx
}

async function createSwapTokenToBsvTx(prevTx, tokenSwap) {

    const swapTokenAmount = 1500000
    const swapTokenFeeAmount = swapTokenAmount * (1000 - feeRate)
    const poolBsvBalance = bsvBalance;
    const swapBsvAmount = Math.floor(swapTokenFeeAmount * poolBsvBalance / (poolBalance * 1000 + swapTokenFeeAmount))
    console.log('swapTokenToBsv:', swapTokenAmount, swapTokenFeeAmount, swapBsvAmount, poolBalance, bsvBalance)
    buildTokenMerkleRoot(true, true)
    tokenBalance1 = tokenBalance1 - swapTokenAmount
    poolBalance = poolBalance + swapTokenAmount
    buildTokenMerkleRoot(false, true)

    tokenSwap.setDataPart(tokenMerkleRoot + lpMerkleRoot + num2bin(lpPoolBalance, 8))
    const newLockingScript = tokenSwap.lockingScript
    console.log('swapTokenToBsv.setDataPart:', tokenMerkleRoot, lpMerkleRoot, num2bin(lpPoolBalance, 8))

    await sleep(6);

    const unlockingTx = new bsv.Transaction();

    const newAmount = prevTx.outputs[0].satoshis - swapBsvAmount;
    unlockingTx.addInputFromPrevTx(prevTx)
        .from(await fetchUtxos(privateKey.toAddress()))
        .addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: newAmount,
        }))
        .change(privateKey.toAddress())
        .setInputScript(0, (tx, output) => {
            // input 0 unlocking script
            let sigtype = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
            const preimage = getPreimage(tx, output.script, output.satoshis, inputIndex = 0, sighashType = sigtype)
            //console.log('preimage:', preimage)
            const senderPubKey = new PubKey(toHex(privateKey.publicKey))
            // get the sender sig 
            let senderSig = signTx(tx, privateKey, output.script, output.satoshis, inputIndex = 0, sighashType = sigtype)

            return tokenSwap.swapTokenToBsv(
                new SigHashPreimage(toHex(preimage)),
                senderPubKey,
                new Sig(toHex(senderSig)),
                tokenBalance1 + swapTokenAmount,
                swapTokenAmount,
                senderMerklePath,
                poolBalance - swapTokenAmount,
                poolMerklePath,
                mergeMerklePath,
                true
            ).toScript()
        })
        .sign(privateKey)
        .seal()


    bsvBalance = bsvBalance - swapBsvAmount
    return unlockingTx
}

async function createRemoveLiquidityTx(prevTx, tokenSwap) {

    const lpAmount = 1000
    const poolBsvBalance = bsvBalance
    addTokenAmount = Math.floor(lpAmount * poolBalance / lpPoolBalance)
    addBsvAmount = Math.floor(lpAmount * poolBsvBalance / lpPoolBalance)

    buildTokenMerkleRoot(true, true)
    tokenBalance1 = tokenBalance1 + addTokenAmount
    poolBalance = poolBalance - addTokenAmount
    console.log('removeLiquidity: tokenbalance ', tokenBalance1, poolBalance, addTokenAmount, addBsvAmount)
    buildTokenMerkleRoot(false, true)

    // build lp token tree
    // first add
    lpBalance1 = lpBalance1 - lpAmount
    lpPoolBalance = lpPoolBalance - lpAmount
    lpMerklePath = new Bytes(Buffer.from('00', 'hex').toString('hex'))
    lpMerkleRoot = toHex(bsv.crypto.Hash.sha256(Buffer.concat([Buffer.from(toHex(privateKey.publicKey), 'hex'), Buffer.from(num2bin(lpBalance1, 8), 'hex')])))

    tokenSwap.setDataPart(tokenMerkleRoot + lpMerkleRoot + num2bin(lpPoolBalance, 8))
    const newLockingScript = tokenSwap.lockingScript
    console.log('removeLiquidity.setDataPart:', tokenMerkleRoot, lpMerkleRoot, num2bin(lpPoolBalance, 8))

    await sleep(6);

    const unlockingTx = new bsv.Transaction();

    const newAmount = prevTx.outputs[0].satoshis - addBsvAmount;
    unlockingTx.addInputFromPrevTx(prevTx)
        .from(await fetchUtxos(privateKey.toAddress()))
        .addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: newAmount,
        }))
        .change(privateKey.toAddress())
        .setInputScript(0, (tx, output) => {
            // input 0 unlocking script
            let sigtype = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
            const preimage = getPreimage(tx, output.script, output.satoshis, inputIndex = 0, sighashType = sigtype)
            const senderPubKey = new PubKey(toHex(privateKey.publicKey))
            // get the sender sig 
            let senderSig = signTx(tx, privateKey, output.script, output.satoshis, inputIndex = 0, sighashType = sigtype)

            return tokenSwap.removeLiquidity(
                new SigHashPreimage(toHex(preimage)),
                senderPubKey,
                new Sig(toHex(senderSig)),
                tokenBalance1 - addTokenAmount,
                lpAmount,
                senderMerklePath,
                true,
                poolBalance + addTokenAmount,
                poolMerklePath,
                mergeMerklePath,
                lpBalance1 + lpAmount,
                lpMerklePath
            ).toScript()
        })
        .sign(privateKey)
        .seal()

    return unlockingTx
}

(async () => {
    try {
        const TokenSwap = buildContractClass(loadDesc('tokenSwap_debug_desc.json'))
        const tokenSwap = new TokenSwap(bsvBalance, firstSaveBsvAmount, firstSaveTokenAmount, feeRate, new PubKey(toHex(poolPubkey)), new PubKey(toHex(privateKey.publicKey)))
        console.log('poolPubKey:', toHex(poolPubkey))

        // create contract Tx
        const contractTx = await createContractTx(tokenSwap)
        let txid = await sendTx(contractTx)
        console.log('contractTx: txid:', txid)

        // add user account
        const addTokenUserTx = await createAddTokenUserTx(contractTx, tokenSwap)
        txid = await sendTx(addTokenUserTx)
        console.log('addTokenUserTx: txid:', txid)

        // transfer 10000 token to pubkey2
        const transferTx = await createTransferTx(addTokenUserTx, tokenSwap)
        txid = await sendTx(transferTx)
        console.log('transferTx: txid:', txid)

        // add liquidity
        const addLiquidityTx = await createAddLiqTx(transferTx, tokenSwap)
        txid = await sendTx(addLiquidityTx)
        console.log('addLiquidityTx: txid:', txid)

        // swap bsv to token
        const swapBsvToTokenTx = await createSwapBsvToTokenTx(addLiquidityTx, tokenSwap)
        txid = await sendTx(swapBsvToTokenTx)
        console.log('swapBsvToTokenTx: txid:', txid)

        // exchange token to bsv
        const swapTokenToBsvTx = await createSwapTokenToBsvTx(swapBsvToTokenTx, tokenSwap)
        txid = await sendTx(swapTokenToBsvTx)
        console.log('swapTokenToBsvTx: txid:', txid)

        // remove liquidity
        const removeLiquidityTx = await createRemoveLiquidityTx(swapTokenToBsvTx, tokenSwap)
        txid = await sendTx(removeLiquidityTx)
        console.log('removeLiquidity: txid:', txid)
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()