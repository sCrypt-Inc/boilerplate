const { expect } = require( 'chai' );
const { buildContractClass, Bytes } = require( 'scryptlib' );
const { compileContract } = require( '../../helper' );
const { RabinSignature } = require( 'rabinsig' );

describe( 'Test sCrypt contract RabinSignature In Javascript', () => {
  let rabin, rabinsig, signedResult, nRabin

  before( () => {
    rabinsig = new RabinSignature( 6 )//expand security to 3072bits
    const RabinContract = buildContractClass( compileContract( 'rabin.scrypt' ) );
    rabin = new RabinContract();

    // append "n" for big int
    let key = rabinsig.generatePrivKey();

    nRabin = rabinsig.privKeyToPubKey( key.p, key.q );

    signedResult = rabinsig.sign( "00112233445566778899aabbccddeeff", key.p, key.q, nRabin );
  } );

  it( 'should return true', () => {
    let paddingBytes = '';
    for ( let i = 0; i < signedResult.paddingByteCount; i++ ) {
      paddingBytes += '00';
    }

    const result = rabin.verifySig3072(
      signedResult.signature,
      new Bytes( '00112233445566778899aabbccddeeff' ),
      new Bytes( paddingBytes ),
      nRabin
    ).verify()
    expect( result.success, result.error ).to.be.true
  } );



  it( 'should throw error with wrong padding', () => {
    let paddingBytes = '';
    for ( let i = 0; i < signedResult.paddingByteCount + 1; i++ ) {
      paddingBytes += '00';
    }

    const result = rabin.verifySig3072(
      signedResult.signature,
      new Bytes( '00112233445566778899aabbccddeeff' ),
      new Bytes( paddingBytes ),
      nRabin
    ).verify()
    expect( result.success, result.error ).to.be.false
  } );

  it( 'should throw error with wrong signature', () => {
    let paddingBytes = '';
    for ( let i = 0; i < signedResult.paddingByteCount; i++ ) {
      paddingBytes += '00';
    }

    const result = rabin.verifySig3072(
      signedResult.signature + 1n,
      new Bytes( '00112233445566778899aabbccddeeff' ),
      new Bytes( paddingBytes ),
      nRabin
    ).verify()
    expect( result.success, result.error ).to.be.false
  } );

} );