import { expect } from 'chai';
import { Demo } from '../contracts/demo';

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


  it('should deploy and call successfully.', async () => {
    let demo = new Demo(1n, 2n);

    const deployTx = await demo.deploy(1000);

    console.log('contract deployed: ', deployTx.id)

    const calledTx = await demo.callAdd(3n, deployTx);

    console.log('contract called: ', calledTx.id)

  })
})