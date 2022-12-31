import { method, prop, SmartContract, assert, SigHashPreimage, SigHash, bsv, hash256 } from "scrypt-ts";
import { UTXO } from "../types";

export class Counter extends SmartContract {
  @prop(true)
  count: bigint;

  constructor(count: bigint) {
    super(count);
    this.count = count;
  }

  @method()
  public increment() {
    this.count++;
    assert(this.ctx.hashOutputs == hash256(this.buildStateOutput(this.ctx.utxo.value)));
  }

  private balance: number;

  getDeployTx(utxos: UTXO[], initBalance: number): bsv.Transaction {
    this.balance = initBalance;
    const tx = new bsv.Transaction().from(utxos)
      .addOutput(new bsv.Transaction.Output({
        script: this.lockingScript,
        satoshis: initBalance,
      }));
    this.lockTo = { tx, outputIndex: 0 };
    return tx;
  }

  getCallTx(utxos: UTXO[], prevTx: bsv.Transaction, nextInst: Counter): bsv.Transaction {
    const inputIndex = 1;
    return new bsv.Transaction().from(utxos)
      .addInputFromPrevTx(prevTx)
      .setOutput(0, (tx: bsv.Transaction) => {
        nextInst.lockTo = { tx, outputIndex: 0 };
        return new bsv.Transaction.Output({
          script: nextInst.lockingScript,
          satoshis: this.balance,
        })
      })
      .setInputScript(inputIndex, (tx: bsv.Transaction) => {
        this.unlockFrom = { tx, inputIndex };
        return this.getUnlockingScript(self => {
          self.increment();
        })
      });
  }

}
