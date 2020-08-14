const { expect } = require('chai');
const { buildContractClass } = require('scryptlib');
const { compileContract } = require('../../helper');
const { DEFAULT_FLAGS } = require('scryptlib/dist/utils');

describe('Test sCrypt contract Demo In Javascript', () => {
  let demo;

  before(() => {
    const Demo = buildContractClass(compileContract('demo.scrypt'));
    demo = new Demo(7, 4);
  });

  it('should return true', () => {
    expect(demo.add(7 + 4).verify()).to.equal(true);
    expect(demo.sub(7 - 4).verify()).to.equal(true);
  });

  it('should throw error', () => {
    expect(() => { demo.add(0).verify() }).to.throws(/failed to verify/);

    try {
      demo.sub(1).verify();
    } catch (error) {
      expect(error.message).to.includes('failed to verify');
      expect(error.context).to.deep.equal({
        lockingScriptASM: 'OP_1 40 00 51 b1 b2 OP_NOP OP_7 OP_4 0 0 OP_3 OP_PICK OP_2 OP_ROLL OP_DROP OP_1 OP_ROLL OP_2 OP_PICK OP_1 OP_ROLL OP_DROP OP_NOP OP_10 OP_PICK OP_1 OP_EQUAL OP_IF OP_11 OP_PICK OP_NOP OP_2 OP_PICK OP_2 OP_PICK OP_1 OP_PICK OP_1 OP_PICK OP_ADD OP_NIP OP_NIP OP_NOP OP_NUMEQUAL OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_ELSE OP_10 OP_PICK OP_2 OP_EQUAL OP_IF OP_11 OP_PICK OP_2 OP_PICK OP_2 OP_PICK OP_SUB OP_NUMEQUAL OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_ELSE 0 OP_ENDIF OP_ENDIF',
        unlockingScriptASM: 'OP_1 OP_2',
        inputSatoshis: 0,
        inputIndex: 0,
        txHex: undefined,
        flags: DEFAULT_FLAGS
      });
    }
  });
});
