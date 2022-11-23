import { expect } from 'chai';
import { Demo } from '../contracts/demo';
import { buildCallTxAndNextInstance, buildDeployTx, signAndSend } from '../txHelper';

describe('Test SmartContract `Demo`', () => {

  before(async () => {
    await Demo.compile(); // asm 
  })

  it('should pass the public method unit test successfully.', async () => {
    let demo = new Demo(1n, 2n);

    let result = demo.verify(() => demo.add(3n));
    expect(result.success, result.error).to.eq(true);

    result = demo.verify(() => demo.sub(-1n));
    expect(result.success, result.error).to.eq(true);

  })

  it('should be deployed and called successfully.', async () => {
    const demo = new Demo(1n, 2n);
    const balance = 1000;

    // deploy
    const unsignedDeployTx = await buildDeployTx(demo, balance, false);
    const deployTx = await signAndSend(unsignedDeployTx);
    console.log('contract deployed: ', deployTx.id)

    //call
    const { tx: unsignedCallTx } = buildCallTxAndNextInstance(
      deployTx, demo, 
      (demoInst: Demo) => {
        demoInst.add(3n);
      }
    );

    const callTx = await signAndSend(unsignedCallTx);
    console.log('contract called: ', callTx.id)

  })
})