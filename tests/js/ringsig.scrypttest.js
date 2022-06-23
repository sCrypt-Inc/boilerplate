const { expect } = require('chai');
const { buildContractClass, buildTypeClasses, bsv, PubKey, Bytes, Sig, toHex, Int } = require('scryptlib');
const { compileContract } = require('../../helper');

const G = bsv.crypto.Point.getG();
const N = bsv.crypto.Point.getN();
const nRing = 2;


describe('Test sCrypt contract RingSig In Javascript', () => {
    const k = [], K = [], ptK = [], r = [];
    let rsig, m, st, result;
    
  before(async () => {
    //step 1
    for (let i = 0; i < nRing; i++) {
      const tempBuf = bsv.crypto.Random.getRandomBuffer(32).toString('hex');
      const tempBn = bsv.crypto.BN.fromBuffer(Buffer.from(tempBuf, 'hex'));
      r[i] = tempBn.mod(N);
    }
    //select iPi = 1  to be the signer
    const iPi = 1;

    //step 2
    //  cPi+1 = hash(R + m + r[iPi] ⋅ G)
    let R = '';
    for (let i = 0; i < nRing; i++) {
      k[i] = new bsv.PrivateKey.fromRandom('testnet');
      K[i] = new bsv.PublicKey(Object.assign(k[i].publicKey.toJSON(), {compressed: false, network: 'testnet'}));
      ptK[i] = G.mul(k[i].toBigNumber());
      R += toHex(K[i]);
    }

    //cPi+1 = hash(R + m + r[iPi] ⋅ G)
    m = Buffer.from("test schnorr BitcoinSV");
    const alphaG = G.mul(r[iPi]);
    const alphaGBuf = '04' + alphaG.getX().toString(16) + alphaG.getY().toString(16);
    let cPi1 = bsv.crypto.Hash.sha256(Buffer.concat([
      Buffer.from(R, 'hex'), 
      m, 
      Buffer.from(alphaGBuf, 'hex')]));

    //step 3
    // c(i+1) = hash(R + m + [r(i) ⋅ G + c(i) ⋅ ptK(i))
    //select iPi = 1
    //[iPi+1, iPi+2, ..., nRing, 1，2，iPi-1]
    const loop = [0];
    let c1 = new bsv.crypto.BN.fromBuffer(cPi1);
    for (let i = 0; i < nRing - 1; i++) {
      const rG = G.mul(r[loop[i]]);
      const cK = ptK[loop[i]].mul(c1);
      
      const rGcK = rG.add(cK);
      const rgckBuf = '04' + rGcK.getX().toString(16) + rGcK.getY().toString(16);
      cPi1 = bsv.crypto.Hash.sha256(Buffer.concat([
        Buffer.from(R, 'hex'), 
        m,
        Buffer.from(rgckBuf, 'hex')]));
      c1 = new bsv.crypto.BN.fromBuffer(cPi1);
    }

    //step 4
    r[iPi] = r[iPi].sub(c1.mul(k[iPi].toBigNumber())).mod(N);

    const contra = await compileContractAsync('ringsig.scrypt');
    RingsigTest = buildContractClass(contra);
    typeClasses = buildTypeClasses(contra);
    let RSig = typeClasses.RSig;

    rsig = new RSig({
      c: new Int(c1.toString()),
      rs: [new Int(r[0].toString()), new Int(r[1].toString())]
    })
  
    st = new RingsigTest(ptK);
  });

  it('should return true', () => {
    result = st.verify(new Bytes(toHex(m)), rsig).verify();

    expect(result.success, result.error).to.be.true
  });

});
