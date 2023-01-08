const { expect } = require('chai');
const { buildContractClass, Int } = require('scryptlib');
const { compileContract, loadDesc } = require('../../helper');


const proof = {
  "A": [
   "2776501881992877360967010350932333422417355289077097904891306050781470940086",
   "21122437672050867125909806884536848602404270167785259691244374768278708333949",
   "1"
  ],
  "B": [
   "21431778725034322899946022956819823380189604585160641608922946017543927024319",
   "6712835151015153532112580708171123860417072671581245813344265995656184857828",
   "1"
  ],
  "C": [
   "12338097979372465218805854082302054588848408321042282576302511911707223151472",
   "14869304936304500444292055199548594331628771617759227441472855529984608939694",
   "1"
  ],
  "Z": [
   "8799323532593353042485231520570299755317012579757336280546195370223968846403",
   "15116500064134544595148851743607343372501793677825325793768354604571987673735",
   "1"
  ],
  "T1": [
   "3966318971425936762802072510015962204082021893300463447102455266440931312077",
   "10530728626210085341591373506479029083927540454714811665667112050486217293535",
   "1"
  ],
  "T2": [
   "1914032636005463161082254977457843519013186671193014639073722606778181000414",
   "19336951108425951889943738161947854726524284565586752152831424221123272006751",
   "1"
  ],
  "T3": [
   "19201121924099272170659513819222697921395163429699822152009688170852769281228",
   "14377444553193614200309893818444201824025417720398525098927543575099358376469",
   "1"
  ],
  "eval_a": "467845890907209659875263782401236540396106369072409782799309064239394885887",
  "eval_b": "4274655143530334413881957046256517106214162749463199381245376532147128336723",
  "eval_c": "14554526748527096282949987943282386871042241678711115364391170394526326633355",
  "eval_s1": "17900308439185647741315572860543434609935372781135665002487328363989903351252",
  "eval_s2": "15067103478687883354407903242543507135599095645763144071325286990102704407752",
  "eval_zw": "3764822407520586758671636987577901684193978982916346451326877478136179736859",
  "eval_r": "13912614326995322775271701438003912295612504494337265638615450122688853960198",
  "Wxi": [
   "19737255487336694558044752523651019935610734518572720943471697080516134012858",
   "8793082483426626946855479327837534881336525466064166167312770334424131234754",
   "1"
  ],
  "Wxiw": [
   "4803962060167311769281409653837556863186819432346149053570437483899004825928",
   "3633730437941881292479520245502710085060955587275441525120883121005658803433",
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
    const PlonkVerifier = buildContractClass(loadDesc('plonk'));
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
