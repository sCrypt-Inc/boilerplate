import { expect } from 'chai';
import { Demo } from '../../src/contracts/demo';

describe('Test SmartContract `Demo`', () => {

  before(async () => {
    await Demo.compile();
  })

  it('should pass the public method unit test successfully.', async () => {
    let demo = new Demo(1n, 2n);

    let result = demo.verify(() => demo.add(3n));
    expect(result.success, result.error).to.eq(true);

    result = demo.verify(() => demo.sub(-1n));
    expect(result.success, result.error).to.eq(true);
  })

  it('should throw', async () => {
    let demo = new Demo(1n, 2n);

    expect(() => {
      demo.add(4n);
    }).to.throw(/Execution failed/)
  })
})