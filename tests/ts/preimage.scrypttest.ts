import { expect } from 'chai'
import { compileContract, newTx } from "../../helper"
import { AbstractContract, buildContractClass, getLowSPreimage, SigHashPreimage, Ripemd160, bsv, toHex, getPreimage, buildOpreturnScript, num2bin } from 'scryptlib'


const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const inputSatoshis = 100000
const tx = newTx(inputSatoshis)


const inputIndex = 0;

const outputAmount = 222222



describe('check OCSPreimage', () => {
  let ocsPreimage: AbstractContract;

  before(() => {
    const OCSPreimage = buildContractClass(compileContract("OCSPreimage.scrypt"))
    ocsPreimage = new OCSPreimage(1)
  })

  it('Tx.checkPreimageOCS should success when using cropped preimage', () => {


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: buildOpreturnScript("0001"),
      satoshis: outputAmount
    }))

    tx.setLockTime(333)

    ocsPreimage.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }
    const preimage = getPreimage(tx, ocsPreimage.lockingScript.subScript(0), inputSatoshis)

    const result = ocsPreimage.unlock(new SigHashPreimage(toHex(preimage))).verify()
    expect(result.success, result.error).to.be.true


  })


  it('Tx.checkPreimageOCS should FAIL when not using cropped preimage', () => {

    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: buildOpreturnScript("0001"),
      satoshis: outputAmount
    }))

    ocsPreimage.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }
    const preimage = getPreimage(tx, ocsPreimage.lockingScript, inputSatoshis)

    const result = ocsPreimage.unlock(new SigHashPreimage(toHex(preimage))).verify()
    expect(result.success, result.error).to.be.false

  })



  it('checkPreimageOptOCS should success when using right cropped preimage', () => {


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: buildOpreturnScript("0001"),
      satoshis: outputAmount
    }))

    tx.setLockTime(11)

    ocsPreimage.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }


    const preimage = getLowSPreimage(tx, ocsPreimage.lockingScript.subScript(1), inputSatoshis)

    const result = ocsPreimage.unlock0(new SigHashPreimage(toHex(preimage))).verify()
    expect(result.success, result.error).to.be.true
  })



  it('checkPreimageOptOCS should fail when using wrong cropped preimage', () => {


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: buildOpreturnScript("0001"),
      satoshis: outputAmount
    }))

    tx.setLockTime(11)

    ocsPreimage.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }


    const preimage = getLowSPreimage(tx, ocsPreimage.lockingScript.subScript(0), inputSatoshis)

    const result = ocsPreimage.unlock0(new SigHashPreimage(toHex(preimage))).verify()
    expect(result.success, result.error).to.be.false
  })

  it('checkPreimageOptOCS should fail when using uncropped preimage', () => {

    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: buildOpreturnScript("0001"),
      satoshis: outputAmount
    }))

    tx.setLockTime(11)

    ocsPreimage.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }


    const preimage = getLowSPreimage(tx, ocsPreimage.lockingScript, inputSatoshis)

    const result = ocsPreimage.unlock0(new SigHashPreimage(toHex(preimage))).verify()
    expect(result.success, result.error).to.be.false
  })



  it('checkPreimageOCS should success when using right cropped preimage', () => {
    // number of bytes to denote some numeric value
    const DataLen = 1
    
    const tx = newTx(inputSatoshis);
    // set initial counter value
    ocsPreimage.setDataPart(num2bin(0, DataLen))

    const newLockingScript = [ocsPreimage.codePart.toASM(), num2bin(1, DataLen)].join(' ')

    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript).subScript(2),
      satoshis: outputAmount
    }))

    let preimage = getPreimage(tx, ocsPreimage.lockingScript.subScript(2), inputSatoshis)

    // set txContext for verification
    ocsPreimage.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    const result = ocsPreimage.increment(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
    expect(result.success, result.error).to.be.true
  })

})

