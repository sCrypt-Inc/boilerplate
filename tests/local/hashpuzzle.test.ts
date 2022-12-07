import { expect } from 'chai';
import { Sha256, sha256, toHex, bsv } from 'scrypt-ts';
import { HashPuzzle } from '../../src/contracts/hashpuzzle';


const data = toHex(Buffer.from("abc"))
const sha256Data = sha256(data);


describe('Test SmartContract `HashPuzzle`', () => {

  before(async () => {
    await HashPuzzle.compile(); // asm 
  })

  it('should pass the public method unit test successfully.', async () => {
    let hashPuzzle = new HashPuzzle(new Sha256(sha256Data));

    let result = hashPuzzle.verify(() => hashPuzzle.unlock(data));
    expect(result.success, result.error).to.eq(true);
  })
})