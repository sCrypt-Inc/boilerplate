import { expect, use } from "chai";
import { toByteString } from "scrypt-ts";
import { Sudoku } from "../src/contracts/sudoku";
import { getDefaultSigner } from "./utils/helper";
import chaiAsPromised from "chai-as-promised";
use(chaiAsPromised);

describe("Test SmartContract `Sudoku`", () => {
  let instance: Sudoku;

  before(async () => {
    await Sudoku.compile();
    instance = new Sudoku(toByteString(""));
    await instance.connect(getDefaultSigner());
  });

  it("it should pass the public method solve successfully ", async () => {
    await instance.deploy(1);

    const call = async () => {
      await instance.methods.solve(toByteString("123456789"));
      return expect(call()).not.be.rejected;
    };
  });

  it("should throw when calling solve method ", async () => {
    await instance.deploy(1);

    const call = async () => {
      await instance.methods.solve(0n);
      return expect(call()).to.be.rejectedWith(/solve method failed/);
    };
  });
});
