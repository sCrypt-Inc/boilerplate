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
    DataLen,
    loadDesc,
    createUnlockingTx,
    createLockingTx,
    sendTx,
    showError
} = require('../helper');
const {
    privateKey,
    privateKey2,
    privateKey3,
} = require('../privateKey');

const poolPubkey = privateKey3.publicKey
const inputTxid = 'b145b31e2b1b24103b0fc8f4b9e54953f5b90f9059559dd7612c629897b95820'
const firstSaveBsvAmount = 100000
const firstSaveTokenAmount = 1000000
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

function buildTokenMerkleRoot(createPath, isPool=false) {
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

function createContractTx(tokenSwap) {
    let dataA = Buffer.concat([Buffer.from(toHex(privateKey.publicKey), 'hex'), Buffer.from(num2bin(tokenBalance1, 8), 'hex')])
    let leafA = bsv.crypto.Hash.sha256(dataA)

    let dataB = Buffer.concat([Buffer.from(toHex(poolPubkey), 'hex'), Buffer.from(num2bin(0, 8), 'hex')])
    let leafB = bsv.crypto.Hash.sha256(dataB)

    let node = Buffer.concat([Buffer.from(toHex(leafA), 'hex'), Buffer.from(toHex(leafB), 'hex')])
    tokenMerkleRoot = toHex(bsv.crypto.Hash.sha256(node))

    //// build lp token tree
    lpMerkleRoot = toHex(bsv.crypto.Hash.sha256(Buffer.concat([Buffer.from(toHex(privateKey.publicKey), 'hex'), Buffer.from(num2bin(lpBalance1, 8), 'hex')])))

    let opReturnData = tokenMerkleRoot + lpMerkleRoot + num2bin(lpPoolBalance, 8)
    tokenSwap.setDataPart(tokenMerkleRoot + lpMerkleRoot + num2bin(lpPoolBalance, 8))
    console.log('setDataPart:', tokenMerkleRoot, lpMerkleRoot, num2bin(lpPoolBalance, 8))

    const fee = 100000
    const inputAmount = 800000

    const tx = new bsv.Transaction()
    tx.addInput(new bsv.Transaction.Input.PublicKeyHash({
        output: new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
          satoshis: inputAmount
        }),
        prevTxId: inputTxid,
        outputIndex: 0,
        script: bsv.Script.empty()
    }))

    tx.addOutput(new bsv.Transaction.Output({
        script: tokenSwap.lockingScript,
        satoshis: bsvBalance,
    }))

    tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
        satoshis: inputAmount - fee - bsvBalance,
    }))

    tx.sign(privateKey)
    let rawTx = tx.serialize()
    console.log('lockingTx raw:', rawTx.length)
    //let txid = await sendTx(lockingTx)
    let txid = tx.id
    console.log('tokenSwap init contract txid:', txid, tx.verify())
    return tx
}

function createAddTokenUserTx(prevTx, tokenSwap) {
    const prevLockingScript = prevTx.outputs[0].script

    let dataC = Buffer.concat([Buffer.from(toHex(privateKey2.publicKey), 'hex'), Buffer.from(num2bin(0, 8), 'hex')])
    let leafC = bsv.crypto.Hash.sha256(dataC)
    let node1 = bsv.crypto.Hash.sha256(Buffer.from(toHex(leafC), 'hex'))
    let insertMerklePath = new Bytes(Buffer.concat([Buffer.alloc(32, 0), Buffer.from('02', 'hex'), Buffer.from(tokenMerkleRoot, 'hex'), Buffer.from('00', 'hex')]).toString('hex'))
    tokenMerkleRoot = toHex(bsv.crypto.Hash.sha256(Buffer.concat([Buffer.from(tokenMerkleRoot, 'hex'), Buffer.from(toHex(node1), 'hex')])))

    tokenSwap.setDataPart(tokenMerkleRoot + lpMerkleRoot + num2bin(lpPoolBalance, 8))
    const newLockingScript = tokenSwap.lockingScript
    console.log('addUserToken.setDataPart:', tokenMerkleRoot, lpMerkleRoot, num2bin(lpPoolBalance, 8))

    const tx = new bsv.Transaction()
    // contract input
    tx.addInput(new bsv.Transaction.Input({
        output: new bsv.Transaction.Output({
          script: prevLockingScript,
          satoshis: bsvBalance
        }),
        prevTxId: prevTx.id,
        outputIndex: 0,
        script: bsv.Script.empty(), // placeholder
    }))

    const inputAmount = 810000
    const fee = 100000
    tx.addInput(new bsv.Transaction.Input.PublicKeyHash({
        output: new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
          satoshis: inputAmount
        }),
        prevTxId: inputTxid,
        outputIndex: 1,
        script: bsv.Script.empty()
    }))

    tx.addOutput(new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: bsvBalance,
    }))

    tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
        satoshis: inputAmount - fee,
    }))

    // input 0 unlocking script
    let sigtype = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
    const preimage = getPreimage(tx, prevLockingScript.toASM(), bsvBalance, inputIndex=0, sighashType=sigtype)
    const userPubkey = new PubKey(toHex(privateKey2.publicKey))
    // get the sender sig 
    let adminSig = signTx(tx, privateKey, prevLockingScript.toASM(), bsvBalance, inputIndex=0, sighashType=sigtype)
    const unlockingScript = tokenSwap.addTokenUser(
        new SigHashPreimage(toHex(preimage)), 
        userPubkey, 
        insertMerklePath,
        new Sig(toHex(adminSig)), 
        ).toScript()
    tx.inputs[0].setScript(unlockingScript)

    // sign the input 1
    sigtype = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
    let hashData = bsv.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer())
    let sig = tx.inputs[1].getSignatures(tx, privateKey, 1, sigtype, hashData)
    tx.inputs[1].addSignature(tx, sig[0])

    //let txid = await sendTx(lockingTx)
    //console.log('addTokenUser args:', toHex(preimage), userPubkey, insertMerklePath, toHex(adminSig))
    //console.log('tokenSwap addTokenUser txid:', tx.id, tx.serialize())
    return tx
}

function createTransferTx(prevTx, tokenSwap) {
    const prevLockingScript = prevTx.outputs[0].script
    const transferAmount = 100000

    buildTokenMerkleRoot(true)
    tokenBalance1 = tokenBalance1 - transferAmount
    tokenBalance2 = tokenBalance2 + transferAmount
    buildTokenMerkleRoot(false)

    tokenSwap.setDataPart(tokenMerkleRoot + lpMerkleRoot + num2bin(lpPoolBalance, 8))
    const newLockingScript = tokenSwap.lockingScript
    console.log('setDataPart:', tokenMerkleRoot, lpMerkleRoot, num2bin(lpPoolBalance, 8))

    const tx = new bsv.Transaction()

    // contract input
    tx.addInput(new bsv.Transaction.Input({
        output: new bsv.Transaction.Output({
          script: prevLockingScript,
          satoshis: bsvBalance
        }),
        prevTxId: prevTx.id,
        outputIndex: 0,
        script: bsv.Script.empty(), // placeholder
    }))
    
    const inputAmount = 820000
    const fee = 100000
    tx.addInput(new bsv.Transaction.Input.PublicKeyHash({
        output: new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
          satoshis: inputAmount
        }),
        prevTxId: inputTxid,
        outputIndex: 2,
        script: bsv.Script.empty()
    }))

    tx.addOutput(new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: bsvBalance,
    }))
    tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
        satoshis: inputAmount - fee,
    }))

    // input 0 unlocking script
    let sigtype = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
    const preimage = getPreimage(tx, prevLockingScript.toASM(), bsvBalance, inputIndex=0, sighashType=sigtype)
    const senderPubKey = new PubKey(toHex(privateKey.publicKey))
    // get the sender sig 
    let senderSig = signTx(tx, privateKey, prevLockingScript.toASM(), bsvBalance, inputIndex=0, sighashType=sigtype)
    const receiverPubKey = new PubKey(toHex(privateKey2.publicKey))

    const unlockingScript = tokenSwap.transfer(
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
    tx.inputs[0].setScript(unlockingScript)
    
    // sign the input 1
    sigtype = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
    let hashData = bsv.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer())
    let sig = tx.inputs[1].getSignatures(tx, privateKey, 1, sigtype, hashData)
    tx.inputs[1].addSignature(tx, sig[0])

    //console.log('transfer tx args:', toHex(preimage), senderPubKey, toHex(senderSig), receiverPubKey, transferAmount, tokenBalance1 + transferAmount, senderMerklePath, tokenBalance2 - transferAmount, receiverMerklePath, mergeMerklePath, true)
    //console.log('\n\ntransferTx id:', tx.id, tx.serialize())
    return tx
}

function createAddLiqTx(prevTx, tokenSwap) {
    const prevLockingScript = prevTx.outputs[0].script

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

    const tx = new bsv.Transaction()

    tx.addInput(new bsv.Transaction.Input({
        output: new bsv.Transaction.Output({
          script: prevLockingScript,
          satoshis: bsvBalance
        }),
        prevTxId: prevTx.id,
        outputIndex: 0,
        script: bsv.Script.empty(), // placeholder
    }))
    
    const inputAmount = 830000
    const fee = 100000
    tx.addInput(new bsv.Transaction.Input.PublicKeyHash({
        output: new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
          satoshis: inputAmount
        }),
        prevTxId: inputTxid,
        outputIndex: 3,
        script: bsv.Script.empty()
    }))

    bsvBalance = bsvBalance + addBsvAmount
    tx.addOutput(new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: bsvBalance,
    }))
    tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
        satoshis: inputAmount - fee - addBsvAmount,
    }))

    // input 0 unlocking script
    let sigtype = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
    const preimage = getPreimage(tx, prevLockingScript.toASM(), bsvBalance - addBsvAmount, inputIndex=0, sighashType=sigtype)
    const senderPubKey = new PubKey(toHex(privateKey.publicKey))
    // get the sender sig 
    let senderSig = signTx(tx, privateKey, prevLockingScript.toASM(), bsvBalance - addBsvAmount, inputIndex=0, sighashType=sigtype)

    const unlockingScript = tokenSwap.addLiquidity(
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
    tx.inputs[0].setScript(unlockingScript)

    // sign the input 1
    sigtype = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
    let hashData = bsv.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer())
    let sig = tx.inputs[1].getSignatures(tx, privateKey, 1, sigtype, hashData)
    tx.inputs[1].addSignature(tx, sig[0])

    //console.log('addLiquidity tx args:', toHex(preimage), senderPubKey, toHex(senderSig), tokenBalance1 + addTokenAmount, addTokenAmount, addBsvAmount, senderMerklePath, poolBalance - addTokenAmount, poolMerklePath, true, mergeMerklePath, lpBalance1 - lpAddAmount, lpMerklePath)
    //console.log('\n\ntransferTx id:', tx.id, tx.serialize())
    return tx
}

function createSwapBsvToTokenTx(prevTx, tokenSwap) {
    const prevLockingScript = prevTx.outputs[0].script

    const swapBsvAmount = 100000
    const swapBsvFeeAmount = swapBsvAmount * (1000 - feeRate)
    const swapTokenAmount = Math.floor(swapBsvFeeAmount * poolBalance / ((bsvBalance - initBsv) * 1000 + swapBsvFeeAmount))
    console.log('swapBsvToToken:', swapBsvAmount, swapBsvFeeAmount, swapTokenAmount, tokenBalance1, poolBalance, bsvBalance)
    buildTokenMerkleRoot(true, true)
    tokenBalance1 = tokenBalance1 + swapTokenAmount
    poolBalance = poolBalance - swapTokenAmount
    buildTokenMerkleRoot(false, true)

    tokenSwap.setDataPart(tokenMerkleRoot + lpMerkleRoot + num2bin(lpPoolBalance, 8))
    const newLockingScript = tokenSwap.lockingScript
    console.log('swapBsvToToken.setDataPart:', tokenMerkleRoot, lpMerkleRoot, num2bin(lpPoolBalance, 8))
    //console.log('swaBsvToToken. newLockingScript:', newLockingScript.toHex())

    const tx = new bsv.Transaction()
    tx.addInput(new bsv.Transaction.Input({
        output: new bsv.Transaction.Output({
          script: prevLockingScript,
          satoshis: bsvBalance
        }),
        prevTxId: prevTx.id,
        outputIndex: 0,
        script: bsv.Script.empty(), // placeholder
    }))
    
    const inputAmount = 1200000
    const fee = 100000
    tx.addInput(new bsv.Transaction.Input.PublicKeyHash({
        output: new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
          satoshis: inputAmount
        }),
        prevTxId: inputTxid,
        outputIndex: 4,
        script: bsv.Script.empty()
    }))

    bsvBalance = bsvBalance + swapBsvAmount
    tx.addOutput(new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: bsvBalance,
    }))
    console.log('bsvBalance: ', bsvBalance, swapBsvAmount)
    tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
        satoshis: inputAmount - fee - swapBsvAmount,
    }))

    // input 0 unlocking script
    let sigtype = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
    const preimage = getPreimage(tx, prevLockingScript.toASM(), bsvBalance - swapBsvAmount, inputIndex=0, sighashType=sigtype)
    //console.log('preimage:', preimage)
    const senderPubKey = new PubKey(toHex(privateKey.publicKey))
    // get the sender sig 
    let senderSig = signTx(tx, privateKey, prevLockingScript.toASM(), bsvBalance - swapBsvAmount, inputIndex=0, sighashType=sigtype)

    const unlockingScript = tokenSwap.swapBsvToToken(
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
    ).toScript()
    tx.inputs[0].setScript(unlockingScript)

    // sign the input 1
    sigtype = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
    let hashData = bsv.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer())
    let sig = tx.inputs[1].getSignatures(tx, privateKey, 1, sigtype, hashData)
    tx.inputs[1].addSignature(tx, sig[0])

    //console.log('swapBsvToToken args:', toHex(preimage), senderPubKey, toHex(senderSig), tokenBalance1 - swapTokenAmount, senderMerklePath, poolBalance + swapTokenAmount, poolMerklePath, mergeMerklePath, false, swapBsvAmount)
    //console.log('\n\nswapBsvToToken tx:', tx.id, tx.serialize())

    return tx
}

function createSwapTokenToBsvTx(prevTx, tokenSwap) {
    const prevLockingScript = prevTx.outputs[0].script

    const swapTokenAmount = 1500000
    const swapTokenFeeAmount = swapTokenAmount * (1000 - feeRate)
    const poolBsvBalance = bsvBalance - initBsv
    const swapBsvAmount = Math.floor(swapTokenFeeAmount * poolBsvBalance / (poolBalance * 1000 + swapTokenFeeAmount))
    console.log('swapTokenToBsv:', swapTokenAmount, swapTokenFeeAmount, swapBsvAmount, poolBalance, bsvBalance)
    buildTokenMerkleRoot(true, true)
    tokenBalance1 = tokenBalance1 - swapTokenAmount
    poolBalance = poolBalance + swapTokenAmount
    buildTokenMerkleRoot(false, true)

    tokenSwap.setDataPart(tokenMerkleRoot + lpMerkleRoot + num2bin(lpPoolBalance, 8))
    const newLockingScript = tokenSwap.lockingScript
    console.log('swapTokenToBsv.setDataPart:', tokenMerkleRoot, lpMerkleRoot, num2bin(lpPoolBalance, 8))

    const tx = new bsv.Transaction()
    tx.addInput(new bsv.Transaction.Input({
        output: new bsv.Transaction.Output({
          script: prevLockingScript,
          satoshis: bsvBalance
        }),
        prevTxId: prevTx.id,
        outputIndex: 0,
        script: bsv.Script.empty(), // placeholder
    }))
    
    const fee = 100000

    bsvBalance = bsvBalance - swapBsvAmount
    tx.addOutput(new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: bsvBalance,
    }))
    console.log('bsvBalance: ', bsvBalance, swapBsvAmount)
    tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
        satoshis: swapBsvAmount - fee,
    }))

    // input 0 unlocking script
    let sigtype = bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_FORKID
    const preimage = getPreimage(tx, prevLockingScript.toASM(), bsvBalance + swapBsvAmount, inputIndex=0, sighashType=sigtype)
    //console.log('preimage:', preimage)
    const senderPubKey = new PubKey(toHex(privateKey.publicKey))
    // get the sender sig 
    let senderSig = signTx(tx, privateKey, prevLockingScript.toASM(), bsvBalance + swapBsvAmount, inputIndex=0, sighashType=sigtype)

    const unlockingScript = tokenSwap.swapTokenToBsv(
        new SigHashPreimage(toHex(preimage)), 
        senderPubKey, 
        new Sig(toHex(senderSig)), 
        tokenBalance1 + swapTokenAmount,
        swapTokenAmount,
        senderMerklePath,
        poolBalance - swapTokenAmount,
        poolMerklePath,
        mergeMerklePath,
        true,
        fee
    ).toScript()
    tx.inputs[0].setScript(unlockingScript)

    //console.log('swapTokenToBsv args:', toHex(preimage), senderPubKey, toHex(senderSig), tokenBalance1 + swapTokenAmount, swapTokenAmount, senderMerklePath, poolBalance - swapTokenAmount, poolMerklePath, mergeMerklePath, false, fee)
    //console.log('\n\nswapTokenToBsv tx:', tx.id, tx.serialize())

    return tx
}

function createRemoveLiquidityTx(prevTx, tokenSwap) {
    const prevLockingScript = prevTx.outputs[0].script

    const lpAmount = 50000
    const poolBsvBalance = bsvBalance - initBsv
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

    const tx = new bsv.Transaction()

    tx.addInput(new bsv.Transaction.Input({
        output: new bsv.Transaction.Output({
          script: prevLockingScript,
          satoshis: bsvBalance
        }),
        prevTxId: prevTx.id,
        outputIndex: 0,
        script: bsv.Script.empty(), // placeholder
    }))
    
    const inputAmount = 1300000
    const fee = 100000
    tx.addInput(new bsv.Transaction.Input.PublicKeyHash({
        output: new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
          satoshis: inputAmount
        }),
        prevTxId: inputTxid,
        outputIndex: 5,
        script: bsv.Script.empty()
    }))

    const oldBsvBalance = bsvBalance
    bsvBalance = bsvBalance - addBsvAmount
    console.log('bsvBalance:', bsvBalance, addBsvAmount, oldBsvBalance)
    tx.addOutput(new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: bsvBalance,
    }))
    tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
        satoshis: inputAmount - fee + addBsvAmount,
    }))

    // input 0 unlocking script
    let sigtype = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
    const preimage = getPreimage(tx, prevLockingScript.toASM(), oldBsvBalance, inputIndex=0, sighashType=sigtype)
    const senderPubKey = new PubKey(toHex(privateKey.publicKey))
    // get the sender sig 
    let senderSig = signTx(tx, privateKey, prevLockingScript.toASM(), oldBsvBalance, inputIndex=0, sighashType=sigtype)

    const unlockingScript = tokenSwap.removeLiquidity(
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
    tx.inputs[0].setScript(unlockingScript)

    // sign the input 1
    sigtype = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_FORKID
    let hashData = bsv.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer())
    let sig = tx.inputs[1].getSignatures(tx, privateKey, 1, sigtype, hashData)
    tx.inputs[1].addSignature(tx, sig[0])

    //console.log('removeLiquidity tx args:', toHex(preimage), senderPubKey, toHex(senderSig), tokenBalance1 - addTokenAmount, lpAmount, senderMerklePath, true, poolBalance + addTokenAmount, poolMerklePath, mergeMerklePath, lpBalance1 + lpAmount, lpMerklePath)
    //console.log('\n\ntransferTx id:', tx.id, tx.serialize())
    return tx
}

(async () => {
    try {
        const TokenSwap = buildContractClass(loadDesc('tokenSwap_desc.json'))
        const tokenSwap = new TokenSwap(bsvBalance, firstSaveBsvAmount, firstSaveTokenAmount, feeRate, new PubKey(toHex(poolPubkey)), new PubKey(toHex(privateKey.publicKey)))
        console.log('poolPubKey:', toHex(poolPubkey))

        // create contract Tx
        const contractTx = createContractTx(tokenSwap)
        let txid = await sendTx(contractTx)
        console.log('contractTx: txid:', txid)

        // add user account
        const addTokenUserTx = createAddTokenUserTx(contractTx, tokenSwap)
        txid = await sendTx(addTokenUserTx)
        console.log('addTokenUserTx: txid:', txid)

        // transfer 10000 token to pubkey2
        const transferTx = createTransferTx(addTokenUserTx, tokenSwap)
        txid = await sendTx(transferTx)
        console.log('transferTx: txid:', txid)

        // add liquidity
        const addLiquidityTx = createAddLiqTx(transferTx, tokenSwap)
        txid = await sendTx(addLiquidityTx)
        console.log('addLiquidityTx: txid:', txid)

        // swap bsv to token
        const swapBsvToTokenTx = createSwapBsvToTokenTx(addLiquidityTx, tokenSwap)
        txid = await sendTx(swapBsvToTokenTx)
        console.log('swapBsvToTokenTx: txid:', txid)

        // exchange token to bsv
        const swapTokenToBsvTx = createSwapTokenToBsvTx(swapBsvToTokenTx, tokenSwap)
        txid = await sendTx(swapTokenToBsvTx)
        console.log('swapTokenToBsvTx: txid:', txid)

        // remove liquidity
        const removeLiquidityTx = createRemoveLiquidityTx(swapTokenToBsvTx, tokenSwap)
        txid = await sendTx(removeLiquidityTx)
        console.log('removeLiquidity: txid:', txid)
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()