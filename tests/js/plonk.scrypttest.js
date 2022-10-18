const { expect } = require('chai');
const { buildContractClass, buildTypeClasses, Int } = require('scryptlib');
const { compileContract, loadDesc } = require('../../helper');


const proof = {
  "A": [
    "14477934024380909544050255955729470614347507033722628005082747957295855633325",
    "8914373934152798538958133142088062869176967809698833383887601446683413767967",
    "1"
  ],
  "B": [
    "952672569230519252645171485548650930377603476518443488424180088398442530826",
    "11529166475832562259368351573217516780522420930631455138969105576004864506277",
    "1"
  ],
  "C": [
    "16461882241012214105869217428641045695342645199661245844117137826228113022812",
    "14877211122147938767244321317980660899430961617630639082563094627884732232577",
    "1"
  ],
  "Z": [
    "13698399489391388306781017134793950930147633465088199114335732783282436145592",
    "16706965336247564452940037684001680566878022761747416937205166222118331896059",
    "1"
  ],
  "T1": [
    "6138128581861553321403947401304331090254390320771988806925609347001278397219",
    "2685689780027422898616227552404133719432844218145243353191059668591906642892",
    "1"
  ],
  "T2": [
    "17919571879679450780295428160656702080191304456249870964540447960040450235749",
    "1322955510087798256545146875914966360248765076317793759807568181177408551961",
    "1"
  ],
  "T3": [
    "5409089456923903443981219452386144852790198530720161559043266543202825778021",
    "1316058013596152391654405320575459250400704089980597262511119878382493849948",
    "1"
  ],
  "eval_a": "2428862755384090060336473619682345593847802178341021273320605237064146016723",
  "eval_b": "9381088347277321285811736372158191124596726947711520959235879748554449469051",
  "eval_c": "9313686884571688902639904974757632980958984028644365623485968336978035722096",
  "eval_s1": "225798137611283317329908838581075434391455649459329833931874805638611252034",
  "eval_s2": "5568486456959064680928950683653636883589018221074416140188409659867079198428",
  "eval_zw": "16175881536461112311877846494640906375725803699870176366807928756663913071995",
  "eval_r": "18226811198573627178699104048854956926262481629123333161751107938288965178153",
  "Wxi": [
    "14601498717155821659006727510461793372345469496888267323174848389933236296183",
    "2664469653515868512612386498983702488196328032578332506437889232197158248506",
    "1"
  ],
  "Wxiw": [
    "11380601126401085910480875817690763571564504801297539784957115099629397174241",
    "17406142480482683763080206301439759036663709314590373867482057256872842577315",
    "1"
  ],
  "protocol": "plonk",
  "curve": "bn128"
};

const pubSignals = [
  "7713112592372404476342535432037683616424591277138491596200192981572885523208"
];


describe('Heavy: Test sCrypt contract PlonkVerifier In Javascript', () => {
  let plonkVerifier, result, Proof,G1Point
  /* timeout on ci now
  before(() => {
    const PlonkVerifier = buildContractClass(compileContract('plonkTest.scrypt'));
    const Types = buildTypeClasses(PlonkVerifier);
    G1Point = Types.G1Point;
    Proof = Types.Proof;
    plonkVerifier = new PlonkVerifier();
  });


  it('should return true', () => {


    console.log("Simulate a verification call ...");

    result = plonkVerifier.unlock(
      new Proof({
        a: new G1Point({
          x: new Int(proof.A[0]),
          y: new Int(proof.A[1])
        }),
        b: new G1Point({
          x: new Int(proof.B[0]),
          y: new Int(proof.B[1])
        }),
        c: new G1Point({
          x: new Int(proof.C[0]),
          y: new Int(proof.C[1])
        }),
        z: new G1Point({
          x: new Int(proof.Z[0]),
          y: new Int(proof.Z[1])
        }),
        t1: new G1Point({
          x: new Int(proof.T1[0]),
          y: new Int(proof.T1[1])
        }),
        t2: new G1Point({
          x: new Int(proof.T2[0]),
          y: new Int(proof.T2[1])
        }),
        t3: new G1Point({
          x: new Int(proof.T3[0]),
          y: new Int(proof.T3[1])
        }),
        eval_a: new Int(proof.eval_a),
        eval_b: new Int(proof.eval_b),
        eval_c: new Int(proof.eval_c),
        eval_s1: new Int(proof.eval_s1),
        eval_s2: new Int(proof.eval_s2),
        eval_zw: new Int(proof.eval_zw),
        eval_r: new Int(proof.eval_r),
        wxi: new G1Point({
          x: new Int(proof.Wxi[0]),
          y: new Int(proof.Wxi[1])
        }),
        wxiw: new G1Point({
          x: new Int(proof.Wxiw[0]),
          y: new Int(proof.Wxiw[1])
        })
      }),
      pubSignals.map(p => new Int(p))
    ).verify();

    expect(result.success, result.error).to.be.true

  });

  it('should throw error', () => {

    const pubSignals = [
      "7713112592372404476342535432037683616424591277138491596200192981572885523201"
    ];

    result = plonkVerifier.unlock(
      new Proof({
        a: new G1Point({
          x: new Int(proof.A[0]),
          y: new Int(proof.A[1])
        }),
        b: new G1Point({
          x: new Int(proof.B[0]),
          y: new Int(proof.B[1])
        }),
        c: new G1Point({
          x: new Int(proof.C[0]),
          y: new Int(proof.C[1])
        }),
        z: new G1Point({
          x: new Int(proof.Z[0]),
          y: new Int(proof.Z[1])
        }),
        t1: new G1Point({
          x: new Int(proof.T1[0]),
          y: new Int(proof.T1[1])
        }),
        t2: new G1Point({
          x: new Int(proof.T2[0]),
          y: new Int(proof.T2[1])
        }),
        t3: new G1Point({
          x: new Int(proof.T3[0]),
          y: new Int(proof.T3[1])
        }),
        eval_a: new Int(proof.eval_a),
        eval_b: new Int(proof.eval_b),
        eval_c: new Int(proof.eval_c),
        eval_s1: new Int(proof.eval_s1),
        eval_s2: new Int(proof.eval_s2),
        eval_zw: new Int(proof.eval_zw),
        eval_r: new Int(proof.eval_r),
        wxi: new G1Point({
          x: new Int(proof.Wxi[0]),
          y: new Int(proof.Wxi[1])
        }),
        wxiw: new G1Point({
          x: new Int(proof.Wxiw[0]),
          y: new Int(proof.Wxiw[1])
        })
      }),
      pubSignals.map(p => new Int(p))
    ).verify();

    expect(result.success, result.error).to.be.false

  });
  */
});
