const {
  bsv,
  buildContractClass,
  getPreimage,
  signTx,
  Bytes,
  PubKey,
  Sig,
  toHex,
  Ripemd160,
  buildTypeClasses
} = require("scryptlib");

const { loadDesc, deployContract, sendTx, showError } = require("../helper");
const { generatePrivKey, privKeyToPubKey, sign } = require("rabinsig");
const { privateKey } = require('../privateKey');
// prescription details
const drug = 1;
const prescriptionIDHex = Buffer.from("some prescription unique id").toString(
  "hex"
);
const currTime = 1427527;
const expiration = currTime + 100;
const patientReward = 5000;

// prescriber information
const prescriberPriv = generatePrivKey();
const prescriber_nRabin = privKeyToPubKey(prescriberPriv.p, prescriberPriv.q);
const prescriberSig = sign(
  prescriptionIDHex,
  prescriberPriv.p,
  prescriberPriv.q,
  prescriber_nRabin
);
const privateKeyPrescriberOffice = new bsv.PrivateKey.fromWIF(
  "cVohxVRbQ3LSSg72s5bSRZrpR5NWPEiKoHAhAbzA78DyPRkSFhn5"
);

// dispensing pharmacy 1
const privateKeyPharmacy1 = new bsv.PrivateKey.fromWIF(
  "cTDNYcMbPapUhViSpQsuUAMgYGwktsCGEiTLHrXpGvuFxhLDQSWf"
);
const publicKeyPharmacy1 = privateKeyPharmacy1.publicKey;

// dispensing pharmacy 2
const privateKeyPharmacy2 = new bsv.PrivateKey.fromWIF(
  "cNpEgwK5q7FAuVy25nyt8pStDtrqzrHWSeYcUotGLPxRXSyszsXK"
);
const publicKeyPharmacy2 = privateKeyPharmacy2.publicKey;

// patient
const privateKeyPatient = privateKey;

const publicKeyPatient = privateKeyPatient.publicKey;
const publicKeyHashPatient = bsv.crypto.Hash.sha256ripemd160(
  publicKeyPatient.toBuffer()
);

const fee = 1000;
const amount = patientReward + fee;

(async () => {
  try {
    // initialize contract
    const DummyPrescription = buildContractClass(
      loadDesc("dummy_prescription_debug_desc.json")
    );

    const { RabinSig, RabinPubKey } = buildTypeClasses(DummyPrescription);

    // init prescription locking script
    const dummyPrescription = new DummyPrescription(
      drug,
      expiration,
      new Bytes(prescriptionIDHex),
      patientReward,
      new Ripemd160(toHex(publicKeyHashPatient)),
      [
        new PubKey(toHex(publicKeyPharmacy1)),
        new PubKey(toHex(publicKeyPharmacy2)),
      ],
      new RabinSig({
        s: prescriberSig.signature,
        padding: paddingBytes(prescriberSig.paddingByteCount),
      })
    );

    // lock fund to the script
    const lockingTx = await deployContract(dummyPrescription, amount)
    console.log('funding txid:      ', lockingTx.id);

    // build tx that fills prescription
    let unlockingTx = new bsv.Transaction();
    unlockingTx.addInputFromPrevTx(lockingTx)
      .addOutput(
        new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKeyPatient.toAddress()),
          satoshis: patientReward,
        })
      )
      .setInputScript(0, (tx, output) => {
        const preimage = getPreimage(tx, output.script, output.satoshis);
        // get dispensing pharmacy signature
        const pharmacySig1 = signTx(
          tx,
          privateKeyPharmacy1,
          output.script,
          output.satoshis
        );

        return dummyPrescription
          .fill(
            new Sig(toHex(pharmacySig1)),
            prescriber_nRabin,
            currTime,
            preimage
          )
          .toScript()
      })
      .seal()



    // broadcast tx that fills prescription
    const unlockingTxid = await sendTx(unlockingTx);
    console.log("Filling prescription txid:", unlockingTxid);

    console.log("Succeeded on testnet");
  } catch (error) {
    console.log("Failed on testnet");
    showError(error);
  }
})();

function paddingBytes(paddingByteCount) {
  let paddingBytes = "";
  for (let i = 0; i < paddingByteCount; i++) {
    paddingBytes += "00";
  }
  return new Bytes(paddingBytes);
}
