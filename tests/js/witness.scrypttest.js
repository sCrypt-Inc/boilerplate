const { expect } = require('chai');
const { buildContractClass, PubKey, PubKeyHash, Int, toHex, Sig, bsv, Bytes, signTx, getPreimage, SigHashPreimage, num2bin, buildTypeClasses } = require('scryptlib');
const { compileContract, inputIndex, inputSatoshis, newTx } = require('../../helper');

const axios = require('axios')
const witnessServer = 'https://witness.cercle.sg'

describe('Heavy: Test Witness Service Timestamp', () => {
  let result

  before(async () => {
  });

  it('should return true', async () => {
    const WitnessCLTV = buildContractClass(compileContract('witnessCLTV.scrypt'));
    const { RabinSig, RabinPubKey } = buildTypeClasses(WitnessCLTV);
    const now = {
      "timestamp": 1633427514,
      "msg": "3a205c61",
      "pubkey": "14011066835788671010845651919501459852166928646089563606498751164667153249503941836187600717531080806147516421781187271940587573671337913138330571669215866479420105174090667985948748986190631187016886981291166306292611767352113000288111367129308712708092570066328094063962538863502995567236287792435597",
      "signature": "9233059470563513150454802876763622819984034904884959771359252978306581601087752199940989814133240382856134377213584609571071634584546429070323821548469259694206052021512540251748718942523465193565691296904657171176815253914609014294228381505511110555327867831014513088522081270661310855002214271600567",
      "padding": ""
    }

    const privateKey = new bsv.PrivateKey.fromRandom('testnet')
    const publicKey = privateKey.publicKey
    const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    const tx = newTx();

    const onedayAgo = new Date("2009-01-03")
    onedayAgo.setDate(onedayAgo.getDate() - 1);
    const matureTime = Math.round(onedayAgo.valueOf() / 1000)

    const cltv = new WitnessCLTV(new PubKeyHash(toHex(pkh)), new RabinPubKey(BigInt(now.pubkey)), new Int(matureTime));

    sig = signTx(tx, privateKey, cltv.lockingScript, inputSatoshis)
    const context = { tx, inputIndex, inputSatoshis }

    result = cltv.unlock(new Sig(toHex(sig)), new PubKey(toHex(publicKey)), new Int(now.timestamp),
      new RabinSig({
        s: new Int(BigInt(now.signature)),
        padding: new Bytes(now.padding)
      })).verify(context)
    expect(result.success, result.error).to.be.true
  });

  it('should return false', async () => {
    const WitnessCLTV = buildContractClass(compileContract('witnessCLTV.scrypt'));
    const { RabinSig, RabinPubKey } = buildTypeClasses(WitnessCLTV);
    const now = {
      "symbol": "BSV_USDT",
      "price": 146.7302,
      "decimal": 4,
      "timestamp": 1633427557,
      "msg": "4253565f55534454a6631600000000000000000000000000000000000000000000000000000000000465205c61",
      "pubkey": "14011066835788671010845651919501459852166928646089563606498751164667153249503941836187600717531080806147516421781187271940587573671337913138330571669215866479420105174090667985948748986190631187016886981291166306292611767352113000288111367129308712708092570066328094063962538863502995567236287792435597",
      "signature": "1936292851763686652818430641963793470583840171965136750143494089482411779990685037943649559184877509772202184262681471982019897591626286028004248016304273390927726125511214508869409251583130902155214510312973911101375924723729115332814958907167760886281480487224655704400978440713222414698162971631997",
      "padding": ""
    }

    const privateKey = new bsv.PrivateKey.fromRandom('testnet')
    const publicKey = privateKey.publicKey
    const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
    const tx = newTx();

    const nextday = new Date("2009-01-03")
    nextday.setDate(nextday.getDate() + 1);
    const matureTime = Math.round(nextday.valueOf() / 1000)

    const cltv = new WitnessCLTV(new PubKeyHash(toHex(pkh)), new RabinPubKey(BigInt(now.pubkey)), new Int(matureTime));

    sig = signTx(tx, privateKey, cltv.lockingScript, inputSatoshis)
    const context = { tx, inputIndex, inputSatoshis }

    result = cltv.unlock(new Sig(toHex(sig)), new PubKey(toHex(publicKey)), new Int(now.timestamp),
    new RabinSig({
      s: new Int(BigInt(now.signature)),
      padding: new Bytes(now.padding)
    })).verify(context)
    expect(result.success, result.error).to.be.false
  });


});

describe('Test Witness Service BSV Price', () => {
  let witness, result

  before(async () => {
    const res = await axios.get(`${witnessServer}/v1/public`)
    witness = res.data[0]
  });

  it('should return true', async () => {
    const WitnessBinaryOption = buildContractClass(compileContract('witnessBinaryOption.scrypt'));
    const { RabinSig, RabinPubKey } = buildTypeClasses(WitnessBinaryOption);
    const priceData = {
      "symbol": "BSV_USDT",
      "price": 146.7302,
      "decimal": 4,
      "timestamp": 1633427557,
      "msg": "4253565f55534454a6631600000000000000000000000000000000000000000000000000000000000465205c61",
      "pubkey": "14011066835788671010845651919501459852166928646089563606498751164667153249503941836187600717531080806147516421781187271940587573671337913138330571669215866479420105174090667985948748986190631187016886981291166306292611767352113000288111367129308712708092570066328094063962538863502995567236287792435597",
      "signature": "1936292851763686652818430641963793470583840171965136750143494089482411779990685037943649559184877509772202184262681471982019897591626286028004248016304273390927726125511214508869409251583130902155214510312973911101375924723729115332814958907167760886281480487224655704400978440713222414698162971631997",
      "padding": ""
    }
    const symbol = 'BSV_USDT'
    const decimal = 4
    const onedayAgo = new Date("2009-01-03")
    onedayAgo.setDate(onedayAgo.getDate() - 1);
    const matureTime = Math.round(onedayAgo.valueOf() / 1000);

    const betPrice = 180 * 10 ** decimal;

    const privateKey_A = new bsv.PrivateKey.fromRandom('testnet')
    const publicKey_A = privateKey_A.publicKey
    const pkh_A = bsv.crypto.Hash.sha256ripemd160(publicKey_A.toBuffer())

    const privateKey_B = new bsv.PrivateKey.fromRandom('testnet')
    const publicKey_B = privateKey_B.publicKey
    const pkh_B = bsv.crypto.Hash.sha256ripemd160(publicKey_B.toBuffer())

    const outputAmount = 222222

    const binaryOption = new WitnessBinaryOption(
      new Bytes(toHex(Buffer.from(symbol, 'utf-8'))),
      new Int(decimal),
      new Int(betPrice),
      new Int(matureTime),
      new RabinPubKey(BigInt(witness.pubkey)),
      new PubKeyHash(toHex(pkh_A)),
      new PubKeyHash(toHex(pkh_B)));

    const tx = newTx();

    const price = Math.round(priceData.price * 10 ** decimal)
    if (price > betPrice) {

      tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(publicKey_A),
        satoshis: outputAmount
      }))

    } else {

      tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(publicKey_B),
        satoshis: outputAmount
      }))

    }


    // const msg = toHex( Buffer.from( symbol, 'utf-8' )) + num2bin(price, 32) + num2bin(decimal, 1) + num2bin(priceData.timestamp, 4);
    // console.log(msg)

    const preimage = getPreimage(tx, binaryOption.lockingScript, inputSatoshis)
    const context = { tx, inputIndex, inputSatoshis }
    result = binaryOption.unlock(
      new SigHashPreimage(toHex(preimage)),
      new Int(price),
      new Int(priceData.timestamp),
      outputAmount,
      new RabinSig({
        s: new Int(BigInt(priceData.signature)),
        padding: new Bytes(priceData.padding)
      })
    )
      .verify(context)

    expect(result.success, result.error).to.be.true
  });

});
