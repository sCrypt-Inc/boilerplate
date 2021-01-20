const { expect } = require("chai")
const {
  bsv,
  buildContractClass,
  toHex,
  getPreimage,
  num2bin,
  SigHashPreimage,
  Ripemd160,
  Sig,
  Bytes,
  PubKey,
  signTx
} = require("scryptlib")
const { inputIndex, inputSatoshis, newTx, compileContract, dummyTxId } = require("../../helper")
const crypto = require("crypto")

function sha256(x) {
  return crypto.createHash("sha256").update(Buffer.from(x, "hex")).digest("hex")
}

describe("Test sCrypt contract merkleToken In Javascript", () => {
  const Signature = bsv.crypto.Signature
  const privateKey = new bsv.PrivateKey.fromRandom("testnet")
  const publicKey = bsv.PublicKey.fromPrivateKey(privateKey)
  const satPrice = 100
  const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID

  const pkh = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
  const changeAddress = toHex(pkh) // Needs to be unprefixed address
  const payoutAddress = changeAddress
  const changeSats = 100

  const Token = buildContractClass(compileContract("merkleToken.scrypt"))

  let token, lockingScriptCodePart, tx

  beforeEach(() => {
    tx = new bsv.Transaction();
    token = new Token(satPrice)

    lockingScriptCodePart = token.codePart.toASM()
  })

  it("should buy token", () => {
    const amount = 1
    const newEntry = toHex(payoutAddress + num2bin(amount, 1))
    const lastEntry = toHex("00".repeat(20) + "01")
    const newLockingScript = [lockingScriptCodePart, sha256(sha256(lastEntry) + sha256(newEntry))].join(' ')
    const lastMerklePath = new Bytes(sha256(lastEntry) + "01")

    token.setDataPart(sha256(sha256(lastEntry).repeat(2)))

    tx.addInput(
      new bsv.Transaction.Input({
        prevTxId: dummyTxId,
        outputIndex: 0,
        script: ""
      }),
      bsv.Script.fromASM(token.lockingScript.toASM()),
      inputSatoshis
    )

    // token output
    tx.addOutput(
      new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript),
        satoshis: inputSatoshis + satPrice * amount
      })
    )

    // change output
    tx.addOutput(
      new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(publicKey.toAddress()),
        satoshis: changeSats
      })
    )

    const preimage = getPreimage(tx, token.lockingScript.toASM(), inputSatoshis, inputIndex, sighashType)

    token.txContext = { tx, inputIndex, inputSatoshis }
    const result = token
      .buy(
        new SigHashPreimage(toHex(preimage)),
        amount,
        new Ripemd160(changeAddress),
        new Ripemd160(payoutAddress),
        changeSats,
        new Bytes(lastEntry),
        lastMerklePath
      )
      .verify()

    expect(result.success, result.error).to.be.true
  })

  it("should buy more tokens", () => {
    const amount = 1
    const prevBalance = 1
    const oldEntry = toHex(payoutAddress + "01")
    const tokenBalance = num2bin(amount + 1, 1)
    const newEntry = toHex(payoutAddress + tokenBalance)
    const newLockingScript = [lockingScriptCodePart, sha256(sha256(newEntry).repeat(2))].join(' ')
    const merklePath = new Bytes(sha256(oldEntry) + "01")

    token.setDataPart(sha256(sha256(oldEntry).repeat(2)))

    tx.addInput(
      new bsv.Transaction.Input({
        prevTxId: dummyTxId,
        outputIndex: 0,
        script: ""
      }),
      bsv.Script.fromASM(token.lockingScript.toASM()),
      inputSatoshis
    )

    // token output
    tx.addOutput(
      new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript),
        satoshis: inputSatoshis + satPrice * amount
      })
    )

    // change output
    tx.addOutput(
      new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(publicKey.toAddress()),
        satoshis: changeSats
      })
    )

    const preimage = getPreimage(tx, token.lockingScript.toASM(), inputSatoshis, inputIndex, sighashType)

    token.txContext = { tx, inputIndex, inputSatoshis }
    const result = token
      .buyMore(
        new SigHashPreimage(toHex(preimage)),
        amount,
        new Ripemd160(changeAddress),
        new Ripemd160(payoutAddress),
        changeSats,
        prevBalance,
        merklePath
      )
      .verify()

    expect(result.success, result.error).to.be.true
  })

  it("should sell tokens", () => {
    const amount = 1
    const prevBalance = 1
    const oldEntry = toHex(payoutAddress + "01")
    const newEntry = toHex(payoutAddress + "00")
    const newLockingScript = [lockingScriptCodePart, sha256(sha256(newEntry).repeat(2))].join(' ')
    const merklePath = new Bytes(sha256(oldEntry) + "01")

    token.setDataPart(sha256(sha256(oldEntry).repeat(2)))

    tx.addInput(
      new bsv.Transaction.Input({
        prevTxId: dummyTxId,
        outputIndex: 0,
        script: ""
      }),
      bsv.Script.fromASM(token.lockingScript.toASM()),
      inputSatoshis
    )

    // token output
    tx.addOutput(
      new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript),
        satoshis: inputSatoshis - satPrice * amount
      })
    )

    // payout output
    tx.addOutput(
      new bsv.Transaction.Output({
        script: bsv.Script.buildPublicKeyHashOut(publicKey.toAddress()),
        satoshis: satPrice * amount
      })
    )

    const preimage = getPreimage(tx, token.lockingScript.toASM(), inputSatoshis)

    token.txContext = { tx, inputIndex, inputSatoshis }

    const sig = signTx(tx, privateKey, token.lockingScript.toASM(), inputSatoshis)

    const result = token
      .sell(
        new SigHashPreimage(toHex(preimage)),
        amount,
        new PubKey(toHex(publicKey)),
        new Sig(toHex(sig)),
        merklePath,
        prevBalance,
        100
      )
      .verify()

    expect(result.success, result.error).to.be.true
  })
})
