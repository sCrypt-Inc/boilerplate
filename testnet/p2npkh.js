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
  return bsv.Script.fromASM(`${asset} OP_TOALTSTACK OP_DUP OP_TOALTSTACK OP_DUP OP_HASH160 ${pkh} OP_EQUALVERIFY OP_CHECKSIG`);
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

  node testnet/p2npkh.js

  About to deploy (pre-mint) nft...
  Deploy txid:      baf89060477742330b119f808710f15df36a1f89b06b722046f334378af17d5b
  assetId (outpoint):      5b7df18a3734f34620726bb0891f6af35df11087809f110b334277476090f8ba00000000

  About to mint nft...
  mintTx 01000000015b7df18a3734f34620726bb0891f6af35df11087809f110b334277476090f8ba000000006b483045022100b08709eaf86660ae790e0de48ee63955ee035a2ace72fd6a9ff828f9fe36d05e02207fe9e529766885f6cf9c3a6aaad4b0b8cef9d9aab7ef24db2cb8808d989cd578412103f7b098436ded4a04dfa8bb0069f4e4670d2202f726727f58f610d3b6292af449ffffffff02592600000000000041245b7df18a3734f34620726bb0891f6af35df11087809f110b334277476090f8ba000000006b766b76a914ada084074f9a305be43e3366455db062d6d3669788ac000000000000000049006a46496d6167653a2068747470733a2f2f69312e736e6463646e2e636f6d2f617274776f726b732d3030303239393930313536372d6f69773874712d74353030783530302e6a706700000000
  Mint txid:  8150c98ab64ba534bd61b104753f01e5449c287d6d87260e83872f713df1aca4

  About to transfer nft...
  transferTX 0100000001a4acf13d712f87830e26876d7d289c44e5013f7504b161bd34a54bb68ac95081000000006b4830450221008c739d701e9a77e95ee7b8ed2621f20930abf977719eabbea993a3f59c7d0ea5022047186e3e32922e5c871ae3e1fc17acf5357ca3089fe8a3953e9e1fde0ce6ddbb412103f7b098436ded4a04dfa8bb0069f4e4670d2202f726727f58f610d3b6292af449ffffffff02bf2500000000000041245b7df18a3734f34620726bb0891f6af35df11087809f110b334277476090f8ba000000006b766b76a914ada084074f9a305be43e3366455db062d6d3669788ac00000000000000000e006a0b68656c6c6f20776f726c6400000000
  Transfer txid:  21f5e2c2f5ad7e705c7eb856f8bb03357e0c2aab7746228b32b88b59efbdbed1

  About to melt nft...
  meltTx 0100000001d1bebdef598bb8328b224677ab2a0c7e3503bbf856b87e5c707eadf5c2e2f521000000006a47304402204c4df14e16a630a3a9a3708492bbad54fad74cc4b9be9914a85959e4bfc5228002207d113c5f5807e982ee97b8a439e8abb9ffd7ac0df8012564d112ab6782def148412103f7b098436ded4a04dfa8bb0069f4e4670d2202f726727f58f610d3b6292af449ffffffff0145250000000000001976a914ada084074f9a305be43e3366455db062d6d3669788ac00000000
  Melt txid:  991a5aece32f8b5d36fedcd02ea954d467472b949025e3e33f4ffecbe0e9e9fb
*/
async function main() {
  try {
    const publicKey = privateKey.publicKey

    // Initialize contract
    const P2NPKH = buildContractClass(loadDesc('p2npkh_debug_desc.json'))
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    const nft = new P2NPKH()
    const asmVars = {
      'DemoP2NPKH.unlock.pkh': toHex(publicKeyHash),
      'DemoP2NPKH.unlock.asset': '000000000000000000000000000000000000000000000000000000000000000000000000'
    };
    nft.replaceAsmVars(asmVars);
    const amount = 10000;
    let nftAmount = amount;
    // deploy contract on testnet
    console.log('About to deploy (pre-mint) nft...')
    const deployTx = await deployContract(nft, amount);

    console.log('Deploy txid:     ', deployTx.id)
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
    console.log('Mint txid: ', mintTxid)

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
        // .... But in practice for p2npkh this does not matter since it is not using OP_PUSH_TX
        //const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL| Signature.SIGHASH_FORKID;
        const sig = signTx(transferTX, privateKey, output.script, output.satoshis);//, 0, sighashType)
        return nft.unlock(sig, new PubKey(toHex(publicKey))).toScript()
      })
      .seal()

    console.log('transferTX', transferTX.toString());
    const transferTxid = await sendTx(transferTX)
    console.log('Transfer txid: ', transferTxid)

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
        // .... But in practice for p2npkh this does not matter since it is not using OP_PUSH_TX
        //const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL| Signature.SIGHASH_FORKID;
        const sig = signTx(meltTX, privateKey, output.script, output.satoshis);//, 0, sighashType)
        return nft.unlock(sig, new PubKey(toHex(publicKey))).toScript()
      })
      .seal()

    console.log('meltTx', meltTX.toString());
    const meltTxid = await sendTx(meltTX)
    console.log('Melt txid: ', meltTxid)
  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
}

main()