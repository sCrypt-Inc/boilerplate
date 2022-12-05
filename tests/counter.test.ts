import { expect } from 'chai';
import { Counter } from '../contracts/counter';
import { bsv, dummyUTXO, createInputFromPrevTx } from '../txHelper';
import { getPreimage } from 'scryptlib'

describe('Test SmartContract `Counter`', () => {

  before(async () => {
    await Counter.compile();
  })

  it('should pass the public method unit test successfully.', async () => {
    const balance = 1000;
    const counter = new Counter(0n).markAsGenesis();

    const deployTx = new bsv.Transaction().from(dummyUTXO)
      .addOutput(new bsv.Transaction.Output({
        script: counter.lockingScript,
        satoshis: balance,
      }));
    counter.lockTo = { tx: deployTx, outputIndex: 0 };

    let prevTx = deployTx;
    let prevInstance = counter;
    for (let i = 0; i < 3; i++) {
      const newCounter = prevInstance.next();
      newCounter.count++;

      const inputIndex = 1;
      const callTx: bsv.Transaction = new bsv.Transaction().from(dummyUTXO)
        .addInput(createInputFromPrevTx(prevTx))
        .setOutput(0, (tx: bsv.Transaction) => {
          newCounter.lockTo = { tx, outputIndex: 0 };
          return new bsv.Transaction.Output({
            script: newCounter.lockingScript,
            satoshis: balance,
          })
        })
        .setInputScript(inputIndex, (tx: bsv.Transaction, prevOutput: bsv.Transaction.Output) => {
          prevInstance.unlockFrom = { tx, inputIndex };
          const prevInstance_ = prevInstance.clone();
          const preimage = getPreimage(tx, prevOutput.script, prevOutput.satoshis, inputIndex)
          return prevInstance_.getUnlockingScript(() => {
            prevInstance_.increment(preimage);
          })
        });

      const result = prevInstance.verify(() => {
        const preimage = getPreimage(callTx, prevInstance.lockingScript, balance, inputIndex);
        prevInstance.increment(preimage);
      })
      expect(result.success, result.error).to.be.true;
      // console.log('callTx fee', callTx.getEstimateFee())

      prevTx = callTx;
      prevInstance = newCounter;
    }

  })
})