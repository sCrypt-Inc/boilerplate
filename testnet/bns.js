const { buildContractClass, toHex, signTx, Ripemd160, Sig, PubKey, bsv, Bool, Bytes, compile, num2bin, getPreimage } = require('scryptlib');

const {
  deployContract,
  createInputFromPrevTx,
  sendTx,
  showError,
  loadDesc,
  sighashType2Hex,
  fetchUtxos
} = require('../helper')

const axios = require('axios')
const API_PREFIX = process.env.NETWORK === 'mainnet' ? 'https://api.whatsonchain.com/v1/bsv/main' : 'https://api.whatsonchain.com/v1/bsv/test';

const MSB_THRESHOLD = 0x7e;
const Signature = bsv.crypto.Signature;
const sighashTypeBns = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID;
const sighashTypeNft = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_SINGLE | Signature.SIGHASH_FORKID;
const { privateKey } = require('../privateKey');
const woc = 'https://test.whatsonchain.com/tx/';

const claimSatoshisInt = 300;
const claimSatoshis = new Bytes(num2bin(claimSatoshisInt, 8));


function unlockP2PKHInput(privateKey, tx, inputIndex, sigtype) {
  const sig = new bsv.Transaction.Signature({
    publicKey: privateKey.publicKey,
    prevTxId: tx.inputs[inputIndex].prevTxId,
    outputIndex: tx.inputs[inputIndex].outputIndex,
    inputIndex,
    signature: bsv.Transaction.Sighash.sign(tx, privateKey, sigtype,
      inputIndex,
      tx.inputs[inputIndex].output.script,
      tx.inputs[inputIndex].output.satoshisBN),
    sigtype,
  });

  tx.inputs[inputIndex].setScript(bsv.Script.buildPublicKeyHashIn(
    sig.publicKey,
    sig.signature.toDER(),
    sig.sigtype,
  ))
}

function generatePreimage(isOpt, tx, lockingScriptASM, satValue, sighashType, idx = 0) {
  let preimage = null;
  if (isOpt) {
    for (i = 0; ; i++) {
      console.log('i', i);
      // malleate tx and thus sighash to satisfy constraint
      tx.nLockTime = i;
      const preimage_ = getPreimage(tx, lockingScriptASM, satValue, idx, sighashType);
      preimageHex = toHex(preimage_);
      preimage = preimage_;
      const h = bsv.crypto.Hash.sha256sha256(Buffer.from(preimageHex, 'hex'));
      const msb = h.readUInt8();
      if (msb < MSB_THRESHOLD) {
        // the resulting MSB of sighash must be less than the threshold
        break;
      }
    }
  } else {
    preimage = getPreimage(tx, lockingScriptASM, satValue, idx, sighashType);
  }
  return preimage;
}

function buildNFTMintMetadataOpReturn() {
  return bsv.Script.fromASM(`OP_FALSE OP_RETURN ${Buffer.from("Image: https://i1.sndcdn.com/artworks-000299901567-oiw8tq-t500x500.jpg", 'utf8').toString('hex')}`);
}

function buildMetadataOpReturn(someData = 'hello world') {
  return bsv.Script.fromASM(`OP_FALSE OP_RETURN ${Buffer.from(someData, 'utf8').toString('hex')}`);
}

async function fetchUtxoLargeThan(address, amount) {
  let {
    data: utxos
  } = await axios.get(`${API_PREFIX}/address/${address}/unspent`)

  utxos = utxos.filter((utxo) => { return utxo.value > amount }).map((utxo) => ({
    txId: utxo.tx_hash,
    outputIndex: utxo.tx_pos,
    satoshis: utxo.value,
    script: bsv.Script.buildPublicKeyHashOut(address).toHex(),
  }))
  return utxos[0];
}

const sleeper = async (seconds) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, seconds * 1000);
  })
}

function buildNFTPublicKeyHashOut(asset, pkh) {
  return bsv.Script.fromASM(`${asset} ${pkh} OP_NIP OP_OVER OP_HASH160 OP_EQUALVERIFY OP_CHECKSIG`);
}

async function main() {
  try {
    const publicKey = privateKey.publicKey
    const step2ExtendLockingScripts = [];

    // -----------------------------------------------------
    // Step 1: Deploy with initial owner and satoshis value of 2650 (Lower than this may hit dust limit)
    // Add the output letters 
    const letters = [
      '2d',
      '5f',
      // '2e',
      '30',
      '31',
      '32',
      '33',
      '34',
      '35',
      '36',
      '37',
      '38',
      '39',
      '61',
      '62',
      '63',
      '64',
      '65',
      '66',
      '67',
      '68',
      '69',
      '6a',
      '6b',
      '6c',
      '6d',
      '6e',
      '6f',
      '70',
      '71',
      '72',
      '73',
      '74',
      '75',
      '76',
      '77',
      '78',
      '79',
      '7a'
    ];
    const dividedSats = 800 * letters.length;
    const totalExtendOutputs = letters.length;
    const claimNFTSatoshis = 100;

    const FEE = 2000 + letters.length * 250;
    const INITIAL_FEE = 350;
    console.log('FEE', FEE);

    const dividedSatsResult = dividedSats / totalExtendOutputs;
    const dividedSatsResultnum2bin = num2bin(dividedSatsResult, 8);

    // If changing to 'release' then update the outputSize to 'f2' (to reflect smaller output size). Use 'fc' for debug.
    //const outputSize = 'fc'; // Change to fc for debug or f2 for release
    const BNS = buildContractClass(loadDesc('bns_debug_desc.json'));
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    /*
    // Do NOT provide a constructor as that will add unnecessary OP_0 OP_0 to the beginning of the contract
    bytes bnsConstant;      // Assetid is the first push data
    Ripemd160 issuerPkh;    // Issuer can transform or destroy the nodes
    Ripemd160 claimPkh;     // Claim NFT pkh
    int currentDimension;   // Current dimension
    Ripemd160 dupHash;      // Dedup hash
    bytes char;             // current char
    */
    const bnsConstant = Buffer.from('bns1', 'utf8').toString('hex');
    const issuerPkh = toHex(publicKeyHash);
    const claimPkh = toHex(publicKeyHash);
    let prevDupHash = '0000000000000000000000000000000000000000';
    let currentDimension = 20;
    const tree = new BNS(
      new Bytes(bnsConstant),
      new Ripemd160(issuerPkh),
      new Ripemd160(claimPkh),
      new Ripemd160(prevDupHash),
      currentDimension,
      new Bytes('ff')
    );

    // console.log('BNS tree', tree);
    const asmVars = {
      'Tx.checkPreimageOpt_.sigHashType':
        sighashType2Hex(sighashTypeBns)
    };
    tree.replaceAsmVars(asmVars);
    const lockingScriptSize = tree.lockingScript.toHex().length / 2;
    console.log('lockingScriptOriginal size', lockingScriptSize, tree.lockingScript.toASM(), tree.lockingScript.toHex());
    const dividedSatoshisBytesWithSize = new Bytes(dividedSatsResultnum2bin + 'fd' + num2bin(tree.lockingScript.toHex().length / 2, 2)); // Change to length of script

    console.log('bnsConstant', bnsConstant);
    console.log('issuerPkh', issuerPkh);
    console.log('claimPkh', claimPkh);
    console.log('prevDupHash', prevDupHash);
    console.log('currentDimension', currentDimension);
    console.log('char', 'ff');

    function getLockingScriptForCharacter(letter, dimensionCount, dupHash) {
       
      const slicedPrefix = tree.lockingScript.toASM().substring(0, 90);
      //console.log('tree sliced prefix', slicedPrefix);

      const slicedSuffix = tree.lockingScript.toASM().substring(138);
      // console.log('tree sliced suffix', slicedSuffix);

      const replaced = slicedPrefix + ' ' + dupHash + ' ' + num2bin(dimensionCount, 1) + ' ' + letter + ' ' + slicedSuffix;
      //console.log('replaced', replaced);

      return bsv.Script.fromASM(replaced);
    }
    console.log('BNS Template', tree);
    // Step 1.
    // deploy contract on testnet

    let satAmount = 10000;
    let prevLockingScript = tree.lockingScript;
    console.log('About to deploy root tree...', prevLockingScript.toASM())
    const deployTx = await deployContract(tree, satAmount);

    console.log('Deploy txid:     ', woc + deployTx.id)

    // call contract method on testnet
    const extendRootTx = new bsv.Transaction();

    // Step 2.
    // Spend the root 
    console.log('About to extend root...', extendRootTx.toString())

    await sleeper(5);
    // Add funding input
    const utxo = await fetchUtxoLargeThan(privateKey.toAddress(), 300000);

    extendRootTx.addInput(createInputFromPrevTx(deployTx))
    .from(await fetchUtxos(privateKey.toAddress()))

    extendRootTx.setInputScript(0, (tx, output) => {
      // console.log('prevlockingScript', prevLockingScript, output.satoshis);
      const preimage = generatePreimage(true, tx, prevLockingScript, output.satoshis, sighashTypeBns);
      const changeAddress = new Bytes(privateKey.toAddress().toHex().substring(2));
      //const changeSatoshis = num2bin(utxo.satoshis - FEE - (dividedSats), 8);
      const changeSatoshis = num2bin(tx.getChangeAmount(), 8);
      const issuerPubKey = new Bytes('0000');
      // Signature is only needed for release
      // const sig = signTx(tx, privateKey, output.script, output.satoshis, 0, sighashTypeBns);
      const issuerSig = new Bytes('0000');

      console.log('bnsConstant', bnsConstant);
      console.log('issuerPkh', issuerPkh);
      console.log('claimPkh', claimPkh);
      console.log('currentDimension', currentDimension);
      console.log('prevDupHash', prevDupHash);
      console.log('char', 'ff');

      console.log('preimage', preimage);
      console.log('dividedSatoshisBytesWithSize', dividedSatoshisBytesWithSize);
      console.log('claimSatoshis', claimSatoshis);
      console.log('changeAddress', changeAddress);
      console.log('changeSatoshis', changeSatoshis);
      console.log('isTransform', new Bool(false));
      console.log('issuerSig', issuerSig);
      console.log('issuerPubKey', issuerPubKey);
      return tree.extend(
        preimage,
        dividedSatoshisBytesWithSize,
        claimSatoshis,
        changeAddress,
        new Bytes(changeSatoshis),
        new Bool(false),
        issuerSig,
        issuerPubKey).toScript()
    })

   /* extendRootTx.addInput(new bsv.Transaction.Input({
      prevTxId: utxo.txId,
      outputIndex: utxo.outputIndex,
      script: ''
    }), utxo.script, utxo.satoshis); */

    // NFT claim output
    extendRootTx.setOutput(0, (tx) => {
      const deployData = buildNFTPublicKeyHashOut(num2bin(0, 36), privateKey.toAddress().toHex().substring(2))
      return new bsv.Transaction.Output({
        script: deployData,
        satoshis: claimSatoshisInt,
      })
    })
    currentDimension++;
    for (let i = 0; i < letters.length; i++) {
      let letter = letters[i];
      const combinedDupHash = prevDupHash + 'ff'; // The parent root node is '00' 
      const dupHash = bsv.crypto.Hash.ripemd160(Buffer.from(combinedDupHash, 'hex')).toString('hex');
      const newLockingScript = getLockingScriptForCharacter(letter, currentDimension, dupHash);
      const lockingScriptSizeNew = newLockingScript.toHex().length / 2;

      if (i  == 0) {
        //console.log('combinedDupHash', prevDupHash, combinedDupHash, dupHash);
        console.log('tree before', tree.lockingScript.toASM());
        console.log('lockingScriptSizeNew size', lockingScriptSizeNew, newLockingScript.toASM(), newLockingScript.toHex(), num2bin(lockingScriptSizeNew, 2));
      }
     
      step2ExtendLockingScripts.push({
        newLockingScript,
        dupHash
      });

      extendRootTx.setOutput(i + 1, (tx) => {
        return new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: dividedSatsResult,
        })
      })
    }

    // Add Change
   /* changeSatoshis = (utxo.satoshis - FEE - (dividedSats));
    console.log('changeSatoshis', changeSatoshis);
    const changeOutputScript = bsv.Script.buildPublicKeyHashOut(privateKey.toAddress())
    // const changea4187bd7b8a126716eeb9586eeb1261d5861d24c = bsv.Script.buildPublicKeyHashOut('a4187bd7b8a126716eeb9586eeb1261d5861d24c');
    extendRootTx.addOutput(new bsv.Transaction.Output({
      script: changeOutputScript,
      satoshis: changeSatoshis
    })); */
    
    //unlockP2PKHInput(privateKey, extendRootTx, 1, Signature.SIGHASH_ALL | Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_FORKID);


  //  extendRootTx.from(await fetchUtxos(privateKey.toAddress()))
   extendRootTx.change(privateKey.toAddress())
   .sign(privateKey)
   .seal()
    //extendRootTx.seal()

    console.log('extendRootTx', extendRootTx, extendRootTx.toString());
    const extendRootTxid = await sendTx(extendRootTx)
    console.log('Root Extend txid: ', woc + extendRootTxid)
    prevLockingScript = newLockingScript;

  } catch (error) {
    console.log('Failed on testnet')
    showError(error)
  }
}

main()