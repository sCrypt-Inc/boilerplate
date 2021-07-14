const { expect } = require("chai");
const {
  bsv,
  buildContractClass,
  getPreimage,
  Bytes,
  signTx,
  PubKey,
  toHex,
  Sig,
  Ripemd160,
} = require("scryptlib");
const { compileContract, inputIndex, newTx } = require("../../helper");
const { RabinSignature } = require("rabinsig");

const rabinsig = new RabinSignature()

// prescription details
const drug = 1;
const prescriptionIDHex = Buffer.from("some prescription unique id").toString(
  "hex"
);
const currTime = 1427527;
const expiration = currTime + 100;
const patientReward = 5000;

// prescriber information
const prescriberPriv = rabinsig.generatePrivKey();
const prescriber_nRabin = rabinsig.privKeyToPubKey(prescriberPriv.p, prescriberPriv.q);
const prescriberSig = rabinsig.sign(
  prescriptionIDHex,
  prescriberPriv.p,
  prescriberPriv.q,
  prescriber_nRabin
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

// init transaction
let tx = newTx();
const fee = 1500;
const inputSatoshis = patientReward + fee;

describe("Dummy Prescription", () => {
  let dummyPrescription, preimage, pharmacySig1;

  before(() => {
    const DummyPrescription = buildContractClass(
      compileContract("dummy_prescription.scrypt")
    );

    // init prescription aka locking script
    dummyPrescription = new DummyPrescription(
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

    // add reward payout to user
    tx.addOutput(
      new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(privateKeyPatient.toAddress()),
        satoshis: patientReward,
      })
    );
    tx.fee(fee);

    // dispensing pharmacy sig
    pharmacySig1 = signTx(
      tx,
      privateKeyPharmacy1,
      dummyPrescription.lockingScript.toASM(),
      inputSatoshis
    );

    // generate tx preImage
    preimage = getPreimage(
      tx,
      dummyPrescription.lockingScript.toASM(),
      inputSatoshis
    );

    // set txContext for verification
    dummyPrescription.txContext = {
      tx,
      inputIndex,
      inputSatoshis,
    };
  });
  it("fills for correct patient", () => {
    result = dummyPrescription
      .fill(new Sig(toHex(pharmacySig1)), prescriber_nRabin, currTime, preimage)
      .verify();
    expect(result.success, result.error).to.be.true;
  });
  it("does not fill if not dispensed by pharmacy", () => {
    const pharmacyImposterPrivKey = new bsv.PrivateKey.fromRandom("testnet");
    const pharmacyImposterSig = signTx(
      tx,
      pharmacyImposterPrivKey,
      dummyPrescription.lockingScript.toASM(),
      inputSatoshis
    );
    result = dummyPrescription
      .fill(
        new Sig(toHex(pharmacyImposterSig)),
        prescriber_nRabin,
        currTime,
        preimage
      )
      .verify();
    expect(result.success, result.error).to.be.false;
  });
  it("does not filled expired", () => {
    const expiredDate = expiration + 1;
    result = dummyPrescription
      .fill(
        new Sig(toHex(pharmacySig1)),
        prescriber_nRabin,
        expiredDate,
        preimage
      )
      .verify();
    expect(result.success, result.error).to.be.false;
  });
  it("does not fill for wrong patient", () => {
    tx = newTx();
    const wrongPrivKeyPatient = new bsv.PrivateKey.fromRandom("testnet");
    // add reward payout to user
    tx.addOutput(
      new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(
          wrongPrivKeyPatient.toAddress()
        ),
        satoshis: patientReward,
      })
    );
    tx.fee(fee);
    // dispensing pharmacy sig
    pharmacySig1 = signTx(
      tx,
      privateKeyPharmacy1,
      dummyPrescription.lockingScript.toASM(),
      inputSatoshis
    );
    // generate tx preImage
    preimage = getPreimage(
      tx,
      dummyPrescription.lockingScript.toASM(),
      inputSatoshis
    );
    result = dummyPrescription
      .fill(new Sig(toHex(pharmacySig1)), prescriber_nRabin, currTime, preimage)
      .verify();
    expect(result.success, result.error).to.be.false;
  });
});

function paddingBytes(paddingByteCount) {
  let paddingBytes = "";
  for (let i = 0; i < paddingByteCount; i++) {
    paddingBytes += "00";
  }
  return new Bytes(paddingBytes);
}
