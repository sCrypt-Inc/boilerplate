const { expect } = require( 'chai' );
const { buildContractClass, PubKey, Ripemd160, Int, toHex, Sig, bsv, Bytes, signTx, getPreimage, SigHashPreimage, num2bin } = require( 'scryptlib' );
const { compileContract, inputIndex, inputSatoshis, newTx } = require( '../../helper' );

const axios = require( 'axios' )
const witnessServer = 'https://witness.cercle.sg'

describe( 'Test Witness Service Timestamp', () => {
  let witness, result

  before( async () => {
    const res = await axios.get( `${witnessServer}/v1/public` )
    witness = res.data[ 0 ]
  } );

  it( 'should return true', async () => {
    const WitnessCLTV = buildContractClass( compileContract( 'witnessCLTV.scrypt' ) );
    const res = await axios.get( `${witnessServer}/v1/timestamp` )
    const now = res.data

    const privateKey = new bsv.PrivateKey.fromRandom( 'testnet' )
    const publicKey = privateKey.publicKey
    const pkh = bsv.crypto.Hash.sha256ripemd160( publicKey.toBuffer() )
    const tx = newTx();

    const onedayAgo = new Date()
    onedayAgo.setDate( onedayAgo.getDate() - 1 );
    const matureTime = Math.round( onedayAgo.valueOf() / 1000 )

    const cltv = new WitnessCLTV( new Ripemd160( toHex( pkh ) ), new Int( BigInt( witness.pubkey ) ), new Int( matureTime ) );

    sig = signTx( tx, privateKey, cltv.lockingScript.toASM(), inputSatoshis )
    const context = { tx, inputIndex, inputSatoshis }

    result = cltv.unlock( new Sig( toHex( sig ) ), new PubKey( toHex( publicKey ) ), new Int( now.timestamp ), new Int( BigInt( now.signature ) ), new Bytes( now.padding ) ).verify( context )
    expect( result.success, result.error ).to.be.true
  } );

  it( 'should return false', async () => {
    const WitnessCLTV = buildContractClass( compileContract( 'witnessCLTV.scrypt' ) );
    const res = await axios.get( `${witnessServer}/v1/timestamp` )
    const now = res.data

    const privateKey = new bsv.PrivateKey.fromRandom( 'testnet' )
    const publicKey = privateKey.publicKey
    const pkh = bsv.crypto.Hash.sha256ripemd160( publicKey.toBuffer() )
    const tx = newTx();

    const nextday = new Date()
    nextday.setDate( nextday.getDate() + 1 );
    const matureTime = Math.round( nextday.valueOf() / 1000 )

    const cltv = new WitnessCLTV( new Ripemd160( toHex( pkh ) ), new Int( BigInt( witness.pubkey ) ), new Int( matureTime ) );

    sig = signTx( tx, privateKey, cltv.lockingScript.toASM(), inputSatoshis )
    const context = { tx, inputIndex, inputSatoshis }

    result = cltv.unlock( new Sig( toHex( sig ) ), new PubKey( toHex( publicKey ) ), new Int( now.timestamp ), new Int( BigInt( now.signature ) ), new Bytes( now.padding ) ).verify( context )
    expect( result.success, result.error ).to.be.false
  } );


} );

describe( 'Test Witness Service BSV Price', () => {
  let witness, result

  before( async () => {
    const res = await axios.get( `${witnessServer}/v1/public` )
    witness = res.data[ 0 ]
  } );

  it( 'should return true', async () => {
    const WitnessBinaryOption = buildContractClass( compileContract( 'WitnessBinaryOption.scrypt' ) );
    const res = await axios.get( `${witnessServer}/v1/price` )
    const priceData = res.data

    const symbol = 'BSV_USDT'
    const decimal = 4
    const onedayAgo = new Date()
    onedayAgo.setDate( onedayAgo.getDate() - 1 );
    const matureTime = Math.round( onedayAgo.valueOf() / 1000 );

    const betPrice = 180 * 10 ** decimal;

    const privateKey_A = new bsv.PrivateKey.fromRandom( 'testnet' )
    const publicKey_A = privateKey_A.publicKey
    const pkh_A = bsv.crypto.Hash.sha256ripemd160( publicKey_A.toBuffer() )

    const privateKey_B = new bsv.PrivateKey.fromRandom( 'testnet' )
    const publicKey_B = privateKey_B.publicKey
    const pkh_B = bsv.crypto.Hash.sha256ripemd160( publicKey_B.toBuffer() )

    const outputAmount = 222222

    const binaryOption = new WitnessBinaryOption(
      new Bytes( toHex( Buffer.from( symbol, 'utf-8' ) ) ),
      new Int( decimal ),
      new Int( betPrice ),
      new Int( matureTime ),
      new Int( BigInt( witness.pubkey ) ),
      new Ripemd160( toHex( pkh_A ) ),
      new Ripemd160( toHex( pkh_B ) ) );

    const tx = newTx();

    const price = Math.round( priceData.price * 10 ** decimal )
    if ( price > betPrice ) {

      tx.addOutput( new bsv.Transaction.Output( {
        script: bsv.Script.buildPublicKeyHashOut( publicKey_A ),
        satoshis: outputAmount
      } ) )

    } else {

      tx.addOutput( new bsv.Transaction.Output( {
        script: bsv.Script.buildPublicKeyHashOut( publicKey_B ),
        satoshis: outputAmount
      } ) )

    }


    // const msg = toHex( Buffer.from( symbol, 'utf-8' )) + num2bin(price, 32) + num2bin(decimal, 1) + num2bin(priceData.timestamp, 4);
    // console.log(msg)

    const preimage = getPreimage( tx, binaryOption.lockingScript.toASM(), inputSatoshis )
    const context = { tx, inputIndex, inputSatoshis }
    result = binaryOption.unlock(
      new SigHashPreimage( toHex( preimage ) ),
      new Int( price ),
      new Int( priceData.timestamp ),
      new Int( BigInt( priceData.signature ) ),
      new Bytes( priceData.padding ),
      outputAmount,
    )
      .verify( context )

    expect( result.success, result.error ).to.be.true
  } );

} );