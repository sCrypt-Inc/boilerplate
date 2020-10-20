const { expect } = require( 'chai' );
const { buildContractClass, Bytes } = require( 'scryptlib' );
const { compileContract } = require( '../../helper' );

// (min, max]
const getRandomInt = ( min, max ) => Math.floor( Math.random() * ( max - min ) + min + 1 )
// 1 byte is 2 hex char
const getRandomBytesHex = bytes => [ ...Array( bytes * 2 ) ].map( () => Math.floor( Math.random() * 16 ).toString( 16 ) ).join( '' )

describe( 'Test sCrypt contract Serializer In Javascript', () => {
  let demo, result

  before( () => {
    const Demo = buildContractClass( compileContract( 'serializer.scrypt' ) );
    demo = new Demo();
  } );

  it( 'bool', () => {
    result = demo.testBool( true ).verify()
    expect( result.success, result.error ).to.be.true
    result = demo.testBool( false ).verify()
    expect( result.success, result.error ).to.be.true
  } );

  it( 'special number', () => {
    result = demo.testInt( 0 ).verify()
    expect( result.success, result.error ).to.be.true
    result = demo.testInt( -1 ).verify()
    expect( result.success, result.error ).to.be.true
  } );

  it( 'normal number', () => {
    const vars = [ 1, 0x0a, 100, -1000 ]
    for ( const h in vars ) {
      result = demo.testInt( Number(h) ).verify()
      expect( result.success, result.error ).to.be.true
    }
  } );

  it( 'bigint', () => {
    const vars = [ 0n, 0x0an, 0x123n, 0x123456789abcden, -1000n ]
    for ( const h in vars ) {
      result = demo.testInt( BigInt(h) ).verify()
      expect( result.success, result.error ).to.be.true
    }

  } );

  it( 'bytes', () => {
    result = demo.testBytes( new Bytes( '1100' ) ).verify()
    expect( result.success, result.error ).to.be.true
    result = demo.testBytes( new Bytes( '1100ffff' ) ).verify()
    expect( result.success, result.error ).to.be.true
  } );

  it( 'pushdata 1', () => {
    result = demo.testBytes( new Bytes( '11'.repeat( 76 ) ) ).verify()
    expect( result.success, result.error ).to.be.true
    result = demo.testBytes( new Bytes( 'ff'.repeat( 0x100 - 1 ) ) ).verify()
    expect( result.success, result.error ).to.be.true
  } );

  it( 'pushdata 2', () => {
    result = demo.testBytes( new Bytes( '11'.repeat( 2 ** 8 ) ) ).verify()
    expect( result.success, result.error ).to.be.true
  } );

  // it( 'pushdata 4', () => {
  //   result = demo.testBytes( new Bytes( '11'.repeat( 2 ** 16 ) ) ).verify()
  //   expect( result.success, result.error ).to.be.true
  // } );

  it( 'should return true', () => {
    // skip largest two bounds since they cause out of memory error
    const varIntBounds = [ 0x0, 0xFC, 0xFFFF ] // , 0xFFFFFFFF, 0xFFFFFFFFFFFFFFFF
    for ( let i = 0; i < varIntBounds.length - 1; i++ ) {
      for ( let j = 0; j < 10; j++ ) {
        const n = getRandomInt( 0, 2 ** 32 )

        const m = getRandomInt( varIntBounds[ i ], varIntBounds[ i + 1 ] )
        const h = getRandomBytesHex( m )

        result = demo.main( n % 2 === 0, new Bytes( h ), n ).verify()
        expect( result.success, result.error ).to.be.true
      }
    }
  } );
} );
