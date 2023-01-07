const { expect } = require('chai');
const { buildContractClass, bsv, Bytes, toHex, Int, compileContractAsync } = require('scryptlib');
const { join } = require('path');
const G = bsv.crypto.Point.getG();
const N = bsv.crypto.Point.getN();

/* js out of memory on ci now.
describe('Heavy: Test sCrypt contract RingSig In Javascript', () => {
  let rsig, m, st, result, Point, RSig;
    
  before(async () => {
    let k1, k2, K1, K2, r1, r2, ptK1, ptK2;

    //step 1
    r1 = bsv.crypto.BN.fromBuffer(bsv.crypto.Random.getRandomBuffer(32)).umod(N);
    r2 = bsv.crypto.BN.fromBuffer(bsv.crypto.Random.getRandomBuffer(32)).umod(N);

    //select r2  to be the signer
    //step 2
    let R = '';
    k1 = bsv.PrivateKey.fromRandom('testnet');
    K1 = bsv.PublicKey(Object.assign(k1.publicKey.toJSON(), {compressed: false, network: 'testnet'}));
    ptK1 = G.mul(k1.toBigNumber());
    R += toHex(K1);

    k2 = bsv.PrivateKey.fromRandom('testnet');
    K2 = bsv.PublicKey(Object.assign(k2.publicKey.toJSON(), {compressed: false, network: 'testnet'}));
    ptK2 = G.mul(k2.toBigNumber());
    R += toHex(K2);

    m = Buffer.from("test schnorr BitcoinSV");

    //c1 = hash(R + m + r2 ⋅ G)
    let rG = G.mul(r2);
    let rGBuf = '04' + rG.getX().umod(N).toString(16) + rG.getY().umod(N).toString(16);
    let c1Buf = bsv.crypto.Hash.sha256(Buffer.concat([Buffer.from(R, 'hex'), m, Buffer.from(rGBuf, 'hex')]));
    let c1 = bsv.crypto.BN.fromBuffer(c1Buf.reverse()).umod(N);
  
    //step 3
    // c2 = hash(R + m + [r1 ⋅ G + c1 ⋅ ptK1)
    rG = G.mul(r1);
    let cK = ptK1.mul(c1);
    let rGcK = rG.add(cK);
    let rgckBuf = '04' + rGcK.getX().umod(N).toString(16) + rGcK.getY().umod(N).toString(16);
    let c2Buf = bsv.crypto.Hash.sha256(Buffer.concat([Buffer.from(R, 'hex'), m, Buffer.from(rgckBuf, 'hex')]));
    c2 = bsv.crypto.BN.fromBuffer(c2Buf.reverse()).umod(N);

    //step 4
    r2 = r2.sub(c2.mul(k2.toBigNumber())).umod(N);

    const filePath = join(__dirname, '..', '..','contracts', 'ringsig.scrypt')
    const out = join(__dirname, 'out')
    const contra = await compileContractAsync(filePath, { out: out });

    RingsigTest = buildContractClass(contra);

    rsig = {
      c: Int(c1.toString()),
      rs: [Int(r1.toString()), Int(r2.toString())]
    }
  
    const ptArray = [
      {x: Int(ptK1.getX().umod(N).toString()), y: Int(ptK1.getY().umod(N).toString())},
      {x: Int(ptK2.getX().umod(N).toString()), y: Int(ptK2.getY().umod(N).toString())}
    ]
    st = new RingsigTest(ptArray);
  });

  it('should return true', () => {
    result = st.verify(Bytes(toHex(m)), rsig).verify();

    expect(result.success, result.error).to.be.true
  })

  it('should fail with invalid rsig.c', () => {
    rsig.c = Int(bsv.crypto.BN.fromBuffer(bsv.crypto.Random.getRandomBuffer(32)).toString());
    result = st.verify(Bytes(toHex(m)), rsig).verify();

    expect(result.success, result.error).to.be.false
  })

  it('should fail with invalid rsig.rs', () => {
    rsig.rs[0] = Int(bsv.crypto.BN.fromBuffer(bsv.crypto.Random.getRandomBuffer(32)).toString());
    result = st.verify(Bytes(toHex(m)), rsig).verify();

    expect(result.success, result.error).to.be.false
  })

});*/