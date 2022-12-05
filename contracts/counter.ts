import { method, prop, SmartContract, assert, SigHashPreimage, SigHash } from "scrypt-ts";

export class Counter extends SmartContract {
  @prop(true)
  count: bigint;

  constructor(count: bigint) {
    super(count);
    this.count = count;
  }

  @method
  public increment(txPreimage: SigHashPreimage) {
    this.count++;
    assert(this.updateState(txPreimage, SigHash.value(txPreimage)));
  }
}
