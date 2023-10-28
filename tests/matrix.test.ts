import { Matrix } from '../src/contracts/matrix'
import { getDefaultSigner } from './utils/helper'
import { expect } from 'chai'

describe('Test SmartContract `Matrix`', () => {
  let instance: Matrix;

  before(async () => {
    await Matrix.loadArtifact();
    instance = new Matrix();
    await instance.connect(getDefaultSigner());
  });

  it('should pass the public method successfully', async () => {
    await instance.deploy(1);

    const callContract = async () => {
      await instance.methods.main([
        [1n, 1n, 1n, 1n],
        [2n, 2n, 2n, 2n],
        [3n, 3n, 3n, 3n],
        [4n, 4n, 4n, 4n],
      ]);
      expect(callContract).to.not.throw();
    }
  });
});
