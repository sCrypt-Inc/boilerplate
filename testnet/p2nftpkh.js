const { buildContractClass, toHex, signTx, Ripemd160, Sig, PubKey, bsv } = require('scryptlib');

const {
  deployContract,
  createInputFromPrevTx,
  sendTx,
  showError,
  loadDesc
} = require('../helper')

const Signature = bsv.crypto.Signature;

const { privateKey } = require('../privateKey');

function buildNFTPublicKeyHashOut(asset, pkh) {
  return bsv.Script.fromASM(`${asset} ${pkh} OP_NIP OP_OVER OP_HASH160 OP_EQUALVERIFY OP_CHECKSIG`);
}

function buildNFTMintMetadataOpReturn() {
  return bsv.Script.fromASM(`OP_FALSE OP_RETURN ${Buffer.from("Image: https://i1.sndcdn.com/artworks-000299901567-oiw8tq-t500x500.jpg", 'utf8').toString('hex')}`);
}
function buildMetadataOpReturn(someData = 'hello world') {
  return bsv.Script.fromASM(`OP_FALSE OP_RETURN ${Buffer.from(someData, 'utf8').toString('hex')}`);
}

const sleeper = async(seconds) => {
  return new Promise((resolve) => {
     setTimeout(() => {
        resolve();
     }, seconds * 1000);
  })
}

/*
  Example output and transactions....

  node testnet/p2nftpkh.js

  About to deploy (pre-mint) nft...
  Deploy txid:      https://test.whatsonchain.com/tx/856141fbaf887f8fbd3ea0eae41b54d1e043f11ffd91c6cea25c07ad6d16919d
  assetId (outpoint):      9d91166dad075ca2cec691fd1ff143e0d1541be4eaa03ebd8f7f88affb41618500000000
  About to mint nft...
  mintTx 01000000019d91166dad075ca2cec691fd1ff143e0d1541be4eaa03ebd8f7f88affb416185000000006a47304402204f209a2cbbd528bfa30cb4e0d5a4dec8aa95c7c0583e5675212d233724c1e9aa0220068f4dd211addefeb41952d6ba0d60d8738c503ea1d419b9d67d6e1dd5b8c7f5412103f7b098436ded4a04dfa8bb0069f4e4670d2202f726727f58f610d3b6292af449ffffffff02592600000000000041249d91166dad075ca2cec691fd1ff143e0d1541be4eaa03ebd8f7f88affb416185000000006b766b76a914ada084074f9a305be43e3366455db062d6d3669788ac000000000000000049006a46496d6167653a2068747470733a2f2f69312e736e6463646e2e636f6d2f617274776f726b732d3030303239393930313536372d6f69773874712d74353030783530302e6a706700000000
  Mint txid:  https://test.whatsonchain.com/tx/93f93528084e141e47a462b6de8b68d7a422d541f66dd5afbf96537dedd5b21f
  About to transfer nft...
  transferTX 01000000011fb2d5ed7d5396bfafd56df641d522a4d7688bdeb662a4471e144e082835f993000000006a47304402201befd4b0d6d5b284290ff831d55706fe86e9d1a06e7de99f4857b0e0865b441a022036e52a22e306b7e1ce809a49a5c5d48dc2c130a07177f6d2bc6290fc4634e37f412103f7b098436ded4a04dfa8bb0069f4e4670d2202f726727f58f610d3b6292af449ffffffff02c02500000000000041249d91166dad075ca2cec691fd1ff143e0d1541be4eaa03ebd8f7f88affb416185000000006b766b76a914ada084074f9a305be43e3366455db062d6d3669788ac00000000000000000e006a0b68656c6c6f20776f726c6400000000
  Transfer txid:  https://test.whatsonchain.com/tx/46996a6fc3da0b18bf690f4e713d3ec2e1cc0b53f68c467dcc55d7c526272daf
  About to melt nft...
  meltTx 0100000001af2d2726c5d755cc7d468cf6530bcce1c23e3d714e0f69bf180bdac36f6a9946000000006a473044022031d8f276de8ea5efc5ff41bd8a59593c49bdde03e119a2295871a3490558e04a02203cfe3294e1b92aa9fcedfbe982c562ab750d8c25cb3c1842cfdf25b5a8b1930b412103f7b098436ded4a04dfa8bb0069f4e4670d2202f726727f58f610d3b6292af449ffffffff0146250000000000001976a914ada084074f9a305be43e3366455db062d6d3669788ac00000000
  Melt txid:  https://test.whatsonchain.com/tx/3517ed212e4c95f45928c5a4c1bebd75248e443df3a9fe2e926ece198e1b600c
*/
async function main() {
  try {
    const publicKey = privateKey.publicKey

    const woc = 'https://test.whatsonchain.com/tx/';
    // Initialize contract
    const P2NFTPKH = buildContractClass(loadDesc('p2nftpkh_debug_desc.json'))
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    const nft = new P2NFTPKH()
    const asmVars = {
      'P2NFTPKH.unlock.pkh': toHex(publicKeyHash),
      'P2NFTPKH.unlock.asset': '000000000000000000000000000000000000000000000000000000000000000000000000'
    };
    nft.replaceAsmVars(asmVars);
    const amount = 10000;
    let nftAmount = amount;
    // deploy contract on testnet
    console.log('About to deploy (pre-mint) nft...')
    const deployTx = await deployContract(nft, amount);

    console.log('Deploy txid:     ', woc + deployTx.id)
    // We must reverse the endianness of the printed txid to match the outpoint format in the raw tx
    const mintAssetId = Buffer.from(deployTx.id, 'hex').reverse().toString('hex') + '00000000';
    console.log('assetId (outpoint):     ', mintAssetId)

    // call contract method on testnet
    const mintTx = new bsv.Transaction();

    // mint the asset
    console.log('About to mint nft...')
    await sleeper(1);
    mintTx.addInput(createInputFromPrevTx(deployTx))
    .setOutput(0, (tx) => {
      // Set the ASM vars manually
      const asmVars = {
        'pkh': toHex(privateKey.toAddress()),
        'asset': mintAssetId
      };
      nft.replaceAsmVars(asmVars);
      const newLockingScript = buildNFTPublicKeyHashOut(mintAssetId, privateKey.toAddress().toHex().substring(2))
      nftAmount = nftAmount - tx.getEstimateFee();
      return new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: nftAmount,
      })
    })
    .setOutput(1, (tx) => {
      const deployData = buildNFTMintMetadataOpReturn()
      return new bsv.Transaction.Output({
        script: deployData,
        satoshis: 0,
      })
    })
    .setInputScript(0, (tx, output) => {
      const sig = signTx(mintTx, privateKey, output.script, output.satoshis)
      return nft.unlock(sig, new PubKey(toHex(publicKey))).toScript()
    })
    .seal()

    console.log('mintTx', mintTx.toString());
    const mintTxid = await sendTx(mintTx)
    console.log('Mint txid: ', woc + mintTxid)

    // Transfer ownership
    console.log('About to transfer nft...')
    await sleeper(1);
    // call contract method on testnet
    const transferTX = new bsv.Transaction();
    transferTX.addInput(createInputFromPrevTx(mintTx, 0))
      .setOutput(0, (tx) => {
        // Set the ASM vars manually
        const asmVars = {
          'pkh': toHex(privateKey.toAddress()),
          'asset': mintAssetId
        };
        nft.replaceAsmVars(asmVars);
        const newLockingScript = buildNFTPublicKeyHashOut(mintAssetId, privateKey.toAddress().toHex().substring(2))
        nftAmount = nftAmount - tx.getEstimateFee();
        return new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: nftAmount, // Set a fee to handle it all
        })
      })
      .setOutput(1, (tx) => {
        const deployData = buildMetadataOpReturn()
        return new bsv.Transaction.Output({
          script: deployData,
          satoshis: 0,
        })
      })
      .setInputScript(0, (tx, output) => {
        // Set SIGHASH_SINGLE to ensure identity is traced correctly and no mistakes can be made 
        // Note: This gives the signing visibility to the i'th output for the i'th input
        // .... But in practice for p2nftpkh this does not matter since it is not using OP_PUSH_TX
        //const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL| Signature.SIGHASH_FORKID;
        const sig = signTx(transferTX, privateKey, output.script, output.satoshis); 
        return nft.unlock(sig, new PubKey(toHex(publicKey))).toScript()
      })
      .seal()

    console.log('transferTX', transferTX.toString());
    const transferTxid = await sendTx(transferTX)
    console.log('Transfer txid: ', woc + transferTxid)

    // Transfer ownership
    console.log('About to melt nft...')
    await sleeper(1);
    // call contract method on testnet
    const meltTX = new bsv.Transaction();
    meltTX.addInput(createInputFromPrevTx(transferTX, 0))
      .setOutput(0, (tx) => {
        // Set the ASM vars manually
        const asmVars = {
          'pkh': toHex(privateKey.toAddress()),
          'asset': mintAssetId
        };
        nft.replaceAsmVars(asmVars);
        const newLockingScript = bsv.Script.buildPublicKeyHashOut(privateKey.toAddress());
        nftAmount = nftAmount - tx.getEstimateFee();
        return new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: nftAmount, // Set a fee to handle it all
        })
      })
      .setInputScript(0, (tx, output) => {
        // Set SIGHASH_SINGLE to ensure identity is traced correctly and no mistakes can be made 
        // Note: This gives the signing visibility to the i'th output for the i'th input
        // .... But in practice for p2nftpkh this does not matter since it is not using OP_PUSH_TX
        //const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL| Signature.SIGHASH_FORKID;
        const sig = signTx(meltTX, privateKey, output.script, output.satoshis); 
        return nft.unlock(sig, new PubKey(toHex(publicKey))).toScript()
      })
      .seal()

    console.log('meltTx', meltTX.toString());
    const meltTxid = await sendTx(meltTX)
    console.log('Melt txid: ', woc + meltTxid)
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
}

main()