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
} = require("scryptlib");

const { loadDesc, createLockingTx, sendTx, showError } = require("../helper");
const { generatePrivKey, privKeyToPubKey, sign } = require("rabinsig");

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
const privateKeyPatient = new bsv.PrivateKey.fromWIF(
  "cRKzzKwrYX7HNAfSkWA3PyrqoYdFpi8wmcHRPDmfPtmTJ8MJPmKm"
);
const publicKeyPatient = privateKeyPatient.publicKey;
const publicKeyHashPatient = bsv.crypto.Hash.sha256ripemd160(
  publicKeyPatient.toBuffer()
);

const fee = 500;
const inputSatoshis = patientReward + fee;

(async () => {
  try {
    // initialize contract
    const DummyPrescription = buildContractClass(
      loadDesc("dummy_prescription_desc.json")
    );

    // init prescription locking script
    const dummyPrescription = new DummyPrescription(
      prescriberSig.signature,
      paddingBytes(prescriberSig.paddingByteCount),
      drug,
      expiration,
      new Bytes(prescriptionIDHex),
      patientReward,
      new Ripemd160(toHex(publicKeyHashPatient)),
      [
        new PubKey(toHex(publicKeyPharmacy1)),
        new PubKey(toHex(publicKeyPharmacy2)),
      ]
    );

    // build tx that writes prescription
    const lockingTx = await createLockingTx(
      privateKeyPrescriberOffice.toAddress(),
      inputSatoshis,
      fee
    );
    lockingTx.outputs[0].setScript(dummyPrescription.lockingScript);
    lockingTx.sign(privateKeyPrescriberOffice);

    // broadcast prescription tx
    let lockingTxid = await sendTx(lockingTx);
    console.log("Prescription txid:", lockingTxid);

    // build tx that fills prescription
    let unlockingTx = new bsv.Transaction();
    unlockingTx.addInput(
      new bsv.Transaction.Input({
        prevTxId: lockingTxid,
        outputIndex: 0,
        script: new bsv.Script(), // placeholder
      }),
      dummyPrescription.lockingScript,
      inputSatoshis
    );

    // build output to dispense to patient & pay reward
    unlockingTx.addOutput(
      new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(privateKeyPatient.toAddress()),
        satoshis: patientReward,
      })
    );
    unlockingTx.fee(fee);

    // get dispensing pharmacy signature
    pharmacySig1 = signTx(
      unlockingTx,
      privateKeyPharmacy1,
      dummyPrescription.lockingScript.toASM(),
      inputSatoshis
    );

    const preimage = getPreimage(
      unlockingTx,
      dummyPrescription.lockingScript.toASM(),
      inputSatoshis
    );

    // build tx to input that fills prescription
    let unlockingScript = dummyPrescription
      .fill(
        new Sig(toHex(pharmacySig1)),
        prescriber_nRabin,
        currTime,
        preimage
      )
      .toScript();
    unlockingTx.inputs[0].setScript(unlockingScript);

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
