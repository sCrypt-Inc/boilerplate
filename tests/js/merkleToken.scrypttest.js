const { expect } = require("chai")
const {
  bsv,
  buildContractClass,
  signTx,
  toHex,
  getPreimage,
  num2bin,
  PubKey,
  SigHashPreimage,
  Sig,
  Ripemd160,
  Bytes
} = require("scryptlib")
const { inputIndex, inputSatoshis, tx, compileContract, DataLen, dummyTxId } = require("../../helper")
const crypto = require("crypto")

function sha256(x) {
  return crypto.createHash("sha256").update(x).digest("hex")
}

// make a copy since it will be mutated
var tx_ = bsv.Transaction.shallowCopy(tx)

describe("Test sCrypt contract merkleToken In Javascript", () => {
  let token, lockingScriptCodePart

  const Signature = bsv.crypto.Signature
  const privateKey = new bsv.PrivateKey.fromRandom("testnet")
  const publicKey = bsv.PublicKey.fromPrivateKey(privateKey)
  const satPrice = 100
  const oldEntry = toHex("01" + publicKey.toAddress().toHex())
  const sighashType = Signature.SIGHASH_ANYONECANPAY | Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID

  before(() => {
    const Token = buildContractClass(compileContract("merkleToken.scrypt"))
    token = new Token(satPrice)

    lockingScriptCodePart = token.codePart.toASM()
  })

  it("should buy token", () => {
    function testBuyMore(amount, changeAddress, payoutAddress, changeSats, prevBalance, merklePath) {
      let contractBalance = 100

      token.dataLoad = sha256(sha256(oldEntry).repeat(2))

      // tx_ = new bsv.Transaction()

      const oldScript = lockingScriptCodePart + " OP_RETURN " + sha256(sha256(oldEntry).repeat(2))

      tx_.addInput(
        new bsv.Transaction.Input({
          prevTxId: dummyTxId,
          outputIndex: 0,
          script: ""
          // script: oldScript,
          // satoshis: contractBalance
        }),
        bsv.Script.fromASM(oldScript),
        contractBalance
      )

      // tx_.addInput(
      //   new bsv.Transaction.Input({
      //     prevTxId: dummyTxId,
      //     outputIndex: 1,
      //     script: ""
      //   }),
      //   bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
      //   // bsv.Script.fromASM(token.lockingScript.toASM()),
      //   200
      // )

      tokenBalance = num2bin(amount, 1)

      const newEntry = toHex(tokenBalance + publicKey.toAddress().toHex())

      const newLockingScript = lockingScriptCodePart + " OP_RETURN " + sha256(sha256(newEntry).repeat(2))

      // token output
      tx_.addOutput(
        new bsv.Transaction.Output({
          script: bsv.Script.fromASM(newLockingScript),
          satoshis: 100
        })
      )

      // change output
      tx_.addOutput(
        new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(privateKey.toAddress()),
          satoshis: changeSats
        })
      )

      const preimage = getPreimage(tx_, token.lockingScript.toASM(), contractBalance, 0, sighashType)

      token.txContext = { tx: tx_, inputIndex: 0, inputSatoshis: contractBalance }
      // const sig = signTx(tx_, privKey, token.lockingScript.toASM(), inputSats)

      // console.log(new SigHashPreimage(toHex(preimage)))

      console.log(token.lockingScript.toASM())
      console.log(sha256(sha256(oldEntry).repeat(2)))
      // console.log(toHex(preimage))
      // console.log(tx_.toBuffer().toString("hex"))

      return token.buyMore(
        new SigHashPreimage(toHex(preimage)),
        amount,
        new Ripemd160(changeAddress),
        new Ripemd160(payoutAddress),
        changeSats,
        prevBalance,
        merklePath
      )
    }

    let amount, changeAddress, payoutAddress, changeSats, prevBalance, merklePath

    amount = 1
    changeAddress = publicKey.toAddress().toHex()
    payoutAddress = changeAddress
    changeSats = 100
    prevBalance = 1
    merklePath = new Bytes([sha256(sha256(oldEntry) + sha256(oldEntry)), "01"].join(""))

    result = testBuyMore(amount, changeAddress, payoutAddress, changeSats, prevBalance, merklePath).verify()
    expect(result.success, result.error).to.be.true
  })
})
