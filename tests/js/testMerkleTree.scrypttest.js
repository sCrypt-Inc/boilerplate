const { expect } = require("chai")
const { buildContractClass, Bytes } = require("scryptlib")

const { compileContract } = require("../../helper")

describe("Test sCrypt contract MerkleTree In Javascript", () => {
  let result, testMerkleTree

  before(() => {
    const TestMerkleTree = buildContractClass(compileContract("testMerkleTree.scrypt"))
    testMerkleTree = new TestMerkleTree()
  })

  it("should calculate the merkle root", () => {
    let merkleRoot = new Bytes("cd53a2ce68e6476c29512ea53c395c7f5d8fbcb4614d89298db14e2a5bdb5456")
    let leaf, merklePath

    leaf = new Bytes("6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b")
    merklePath = new Bytes(
      [
        "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
        "01",
        "20ab747d45a77938a5b84c2944b8f5355c49f21db0c549451c6281c91ba48d0d",
        "01"
      ].join("")
    )

    result = testMerkleTree.testCalculateMerkleRoot(leaf, merklePath, merkleRoot).verify()
    expect(result.success, result.error).to.be.true

    leaf = new Bytes("4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a")
    merklePath = new Bytes(
      [
        "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
        "00",
        "4295f72eeb1e3507b8461e240e3b8d18c1e7bd2f1122b11fc9ec40a65894031a",
        "00"
      ].join("")
    )

    result = testMerkleTree.testCalculateMerkleRoot(leaf, merklePath, merkleRoot).verify()
    expect(result.success, result.error).to.be.true
  })

  it("should calculate the merkle root for merkletrees of uneven length", () => {
    let merkleRoot = new Bytes("f58e5706462d76bde8db3498c15883aabe4585180e3cba0e7b15bb6f45ac3994")
    leaf = new Bytes("ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d")
    merklePath = new Bytes(
      [
        "0000000000000000000000000000000000000000000000000000000000000000",
        "01",
        "0000000000000000000000000000000000000000000000000000000000000000",
        "01",
        "cd53a2ce68e6476c29512ea53c395c7f5d8fbcb4614d89298db14e2a5bdb5456",
        "00"
      ].join("")
    )

    result = testMerkleTree.testCalculateMerkleRoot(leaf, merklePath, merkleRoot).verify()
    expect(result.success, result.error).to.be.true
  })

  it("should verify leafs", () => {
    let merkleRoot = new Bytes("cd53a2ce68e6476c29512ea53c395c7f5d8fbcb4614d89298db14e2a5bdb5456")
    let leaf, merklePath

    leaf = new Bytes("6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b")
    merklePath = new Bytes(
      [
        "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
        "01",
        "20ab747d45a77938a5b84c2944b8f5355c49f21db0c549451c6281c91ba48d0d",
        "01"
      ].join("")
    )

    result = testMerkleTree.testVerifyLeaf(leaf, merklePath, merkleRoot).verify()
    expect(result.success, result.error).to.be.true
  })

  it("should update leafs", () => {
    const oldMerkleRoot = new Bytes("cd53a2ce68e6476c29512ea53c395c7f5d8fbcb4614d89298db14e2a5bdb5456")
    let oldLeaf, merklePath, newLeaf, newMerkleRoot

    oldLeaf = new Bytes("6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b")
    merklePath = new Bytes(
      [
        "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
        "01",
        "20ab747d45a77938a5b84c2944b8f5355c49f21db0c549451c6281c91ba48d0d",
        "01"
      ].join("")
    )
    newLeaf = new Bytes("ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d")
    newMerkleRoot = new Bytes("b0e44f9adb044dffb32aa1e455456f9cc6ed27d11fb7d6196b4065a1a54ea1bd")

    result = testMerkleTree.testUpdateLeaf(oldLeaf, newLeaf, merklePath, oldMerkleRoot, newMerkleRoot).verify()
    expect(result.success, result.error).to.be.true
  })
})
