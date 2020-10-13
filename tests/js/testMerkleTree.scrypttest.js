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
    let oldMerkleRoot, oldLeaf, merklePath, newLeaf, newMerkleRoot

    oldMerkleRoot = new Bytes("cd53a2ce68e6476c29512ea53c395c7f5d8fbcb4614d89298db14e2a5bdb5456")
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

    // Test single leaf
    oldMerkleRoot = new Bytes("dd0cb00641618c5f4184542383510d1d36cb2d94ac7086680cce4b7134021ff3")
    oldLeaf = new Bytes("df76677628c05bc234aefe31dfc20820e546354db1a096e6b3cef9730fcb4475")
    merklePath = new Bytes(["df76677628c05bc234aefe31dfc20820e546354db1a096e6b3cef9730fcb4475", "01"].join(""))
    newLeaf = new Bytes("07cf2a3098945e378f269c572556e8963dfb02e87a923f243922e68126d75484")
    newMerkleRoot = new Bytes("7a5e911a33379d003d436db3eee3699381416aadfc30367f81ab71877263647d")

    result = testMerkleTree.testUpdateLeaf(oldLeaf, newLeaf, merklePath, oldMerkleRoot, newMerkleRoot).verify()
    expect(result.success, result.error).to.be.true

    // Test single branch
    oldMerkleRoot = new Bytes("4d0de4a362a753cdad6370827fb46c2887d86ca990a74da009ad3b1922daff66")
    oldLeaf = new Bytes("4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce")
    merklePath = new Bytes(
      [
        "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
        "01",
        "ad88f6375d55f0d5839f873f632bef974c9b20d5e764069042b1deefc9fe3b30",
        "01",
        "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b",
        "00"
      ].join("")
    )
    newLeaf = new Bytes("4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a")
    newMerkleRoot = new Bytes("6cce63479bef0c755231553faad0928b6de6c2a701a02ef47bc53b098b718244")

    result = testMerkleTree.testUpdateLeaf(oldLeaf, newLeaf, merklePath, oldMerkleRoot, newMerkleRoot).verify()
    expect(result.success, result.error).to.be.true
  })

  it("should add leafs", () => {
    let oldMerkleRoot, lastLeaf, lastMerklePath, newLeaf, newMerkleRoot

    oldMerkleRoot = new Bytes("f981662b1dcd91b2569a56fce8c590b04bc062ee22d459e49bc507638c8099a2")
    lastLeaf = new Bytes("4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce")
    lastMerklePath = new Bytes(
      [
        "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
        "01",
        "4295f72eeb1e3507b8461e240e3b8d18c1e7bd2f1122b11fc9ec40a65894031a",
        "00"
      ].join("")
    )
    newLeaf = new Bytes("4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a")
    newMerkleRoot = new Bytes("cd53a2ce68e6476c29512ea53c395c7f5d8fbcb4614d89298db14e2a5bdb5456")

    result = testMerkleTree.testAddLeaf(lastLeaf, lastMerklePath, oldMerkleRoot, newLeaf, newMerkleRoot).verify()
    expect(result.success, result.error).to.be.true

    oldMerkleRoot = new Bytes("cd53a2ce68e6476c29512ea53c395c7f5d8fbcb4614d89298db14e2a5bdb5456")
    lastLeaf = new Bytes("4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a")
    lastMerklePath = new Bytes(
      [
        "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
        "00",
        "4295f72eeb1e3507b8461e240e3b8d18c1e7bd2f1122b11fc9ec40a65894031a",
        "00"
      ].join("")
    )
    newLeaf = new Bytes("ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d")
    newMerkleRoot = new Bytes("0abb51d233d9b6172ff6fcb56b4ef172f550da4cb15aa328ebf43751288b8011")

    result = testMerkleTree.testAddLeaf(lastLeaf, lastMerklePath, oldMerkleRoot, newLeaf, newMerkleRoot).verify()
    expect(result.success, result.error).to.be.true
  })
})
