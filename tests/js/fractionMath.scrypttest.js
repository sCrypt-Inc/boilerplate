const {
  expect
} = require('chai');
const {
  buildContractClass,
  buildTypeClasses
} = require('scryptlib');
const {
  compileContract
} = require('../../helper');

let contract = compileContract('fractionMathTest.scrypt');
const FRM = buildContractClass(contract);
let {
  Fraction
} = buildTypeClasses(contract);
const nan =  new Fraction({
  n: 0,
  d: 0
}); // not a number
const [ADD, SUB, MUL, DIV, ABS] = [0, 1, 2, 3, 4]

describe('Test FRMath Library In Javascript', () => {
  let frm, x, y, result

  before(() => {
    frm = new FRM();
  });

  describe("in normal mode", () => {
    it('should add 1/3 with 1/4 correctly', () => {
      x = new Fraction({n: 1, d: 3});
      y = new Fraction({n: 1, d: 4});

      // correct result
      result = frm.unlock(x, y, new Fraction({n: 7, d: 12}), ADD, false).verify()
      expect(result.success, result.error).to.be.true

      // same result with different d is also correct
      result = frm.unlock(x, y, new Fraction({n: 70, d: 120}), ADD, false).verify()
      expect(result.success, result.error).to.be.true

      // wrong result
      result = frm.unlock(x, y, new Fraction({n: 5, d: 12}), ADD, false).verify()
      expect(result.success, result.error).to.be.false

      // scaled-up result
      result = frm.unlockScaled(100, x, y, ADD, false, 58).verify()
      expect(result.success, result.error).to.be.true

      // scaled-up result
      result = frm.unlockScaled(1000, x, y, ADD, false, 583).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should sub 5/10 with 1/10 correctly', () => {
      x = new Fraction({n: 5, d: 10});
      y = new Fraction({n: 1, d: 10});

      // correct result
      result = frm.unlock(x, y, new Fraction({n: 40, d: 100}), SUB, false).verify()
      expect(result.success, result.error).to.be.true

      // reduction result is also correct
      result = frm.unlock(x, y, new Fraction({n: 2, d: 5}), SUB, false).verify()
      expect(result.success, result.error).to.be.true
  
      // wrong result
      result = frm.unlock(x, y, new Fraction({n: 3, d: 10}), SUB, false).verify()
      expect(result.success, result.error).to.be.false

      // scaled-up result
      result = frm.unlockScaled(100, x, y, SUB, false, 40).verify()
      expect(result.success, result.error).to.be.true

      // scaled-up result
      result = frm.unlockScaled(1000, x, y, SUB, false, 400).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should mul 1/100 with 200 correctly', () => {
      x = new Fraction({n: 1, d: 100});
      y = new Fraction({n: 200, d: 1});

      // correct result
      result = frm.unlock(x, y, new Fraction({n: 200, d: 100}), MUL, false).verify()
      expect(result.success, result.error).to.be.true

      // reduction result is also correct
      result = frm.unlock(x, y, new Fraction({n: 2, d: 1}), MUL, false).verify()
      expect(result.success, result.error).to.be.true
  
      // wrong result
      result = frm.unlock(x, y, new Fraction({n: 100, d: 200}), MUL, false).verify()
      expect(result.success, result.error).to.be.false

      // scaled-up result
      result = frm.unlockScaled(100, x, y, MUL, false, 200).verify()
      expect(result.success, result.error).to.be.true

      // scaled-up result
      result = frm.unlockScaled(1000, x, y, MUL, false, 2000).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should div 5/6 with 9/10 correctly', () => {
      x = new Fraction({n: 5, d: 6});
      y = new Fraction({n: 9, d: 10});

      // correct result
      result = frm.unlock(x, y, new Fraction({n: 50, d: 54}), DIV, false).verify()
      expect(result.success, result.error).to.be.true

      // same result with different d is also correct
      result = frm.unlock(x, y, new Fraction({n: 25, d: 27}), DIV, false).verify()
      expect(result.success, result.error).to.be.true
  
      // wrong result
      result = frm.unlock(x, y, new Fraction({n: 3, d: 4}), DIV, false).verify()
      expect(result.success, result.error).to.be.false

      // scaled-up result
      result = frm.unlockScaled(100, x, y, DIV, false, 92).verify()
      expect(result.success, result.error).to.be.true

      // scaled-up result
      result = frm.unlockScaled(1000, x, y, DIV, false, 925).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should not throw when div 1 with 0', () => {
      x = new Fraction({n: 1, d: 1});
      y = new Fraction({n: 0, d: 10});

      result = frm.unlock(x, y, nan, DIV, false).verify()
      expect(result.success, result.error).to.be.true
    })

    it('should abs -1/3 correctly', () => {
      x = new Fraction({n: -1, d: 3});

      // correct result
      result = frm.unlock(x, nan, new Fraction({n: 1, d: 3}), ABS, false).verify()
      expect(result.success, result.error).to.be.true

      // same result with different d is also correct
      result = frm.unlock(x, nan, new Fraction({n: 10, d: 30}), ABS, false).verify()
      expect(result.success, result.error).to.be.true
  
      // wrong result
      result = frm.unlock(x, y, new Fraction({n: -1, d: 3}), ABS, false).verify()
      expect(result.success, result.error).to.be.false
    });

    it("should not throw even if denominator is not positive", () => {
      x = new Fraction({n: 3, d: -4});
      y = new Fraction({n: 1, d: -4});

      result = frm.unlock(x, y, new Fraction({n: -4, d: 4}), ADD, false).verify()
      expect(result.success, result.error).to.be.true
      
      result = frm.unlock(x, y, new Fraction({n: -2, d: 4}), SUB, false).verify()
      expect(result.success, result.error).to.be.true

      result = frm.unlock(x, y, new Fraction({n: 3, d: 16}), MUL, false).verify()
      expect(result.success, result.error).to.be.true

      result = frm.unlock(x, y, new Fraction({n: 12, d: 4}), DIV, false).verify()
      expect(result.success, result.error).to.be.true

      result = frm.unlock(x, y, new Fraction({n: 3, d: 4}), ABS, false).verify()
      expect(result.success, result.error).to.be.true
    })
  })

  describe("in safe mode", () => {

    it('should add 1/3 with 1/4 correctly', () => {
      x = new Fraction({n: 1, d: 3});
      y = new Fraction({n: 1, d: 4});

      // correct result
      result = frm.unlock(x, y, new Fraction({n: 7, d: 12}), ADD, true).verify()
      expect(result.success, result.error).to.be.true

      // same result with different d is also correct
      result = frm.unlock(x, y, new Fraction({n: 70, d: 120}), ADD, true).verify()
      expect(result.success, result.error).to.be.true

      // wrong result
      result = frm.unlock(x, y, new Fraction({n: 5, d: 12}), ADD, true).verify()
      expect(result.success, result.error).to.be.false

      // scaled-up result
      result = frm.unlockScaled(100, x, y, ADD, true, 58).verify()
      expect(result.success, result.error).to.be.true

      // scaled-up result
      result = frm.unlockScaled(1000, x, y, ADD, true, 583).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should sub 5/10 with 1/10 correctly', () => {
      x = new Fraction({n: 5, d: 10});
      y = new Fraction({n: 1, d: 10});

      // correct result
      result = frm.unlock(x, y, new Fraction({n: 40, d: 100}), SUB, true).verify()
      expect(result.success, result.error).to.be.true

      // reduction result is also correct
      result = frm.unlock(x, y, new Fraction({n: 2, d: 5}), SUB, true).verify()
      expect(result.success, result.error).to.be.true
  
      // wrong result
      result = frm.unlock(x, y, new Fraction({n: 3, d: 10}), SUB, true).verify()
      expect(result.success, result.error).to.be.false

      // scaled-up result
      result = frm.unlockScaled(100, x, y, SUB, true, 40).verify()
      expect(result.success, result.error).to.be.true

      // scaled-up result
      result = frm.unlockScaled(1000, x, y, SUB, true, 400).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should mul 1/100 with 200 correctly', () => {
      x = new Fraction({n: 1, d: 100});
      y = new Fraction({n: 200, d: 1});

      // correct result
      result = frm.unlock(x, y, new Fraction({n: 200, d: 100}), MUL, true).verify()
      expect(result.success, result.error).to.be.true

      // reduction result is also correct
      result = frm.unlock(x, y, new Fraction({n: 2, d: 1}), MUL, true).verify()
      expect(result.success, result.error).to.be.true
  
      // wrong result
      result = frm.unlock(x, y, new Fraction({n: 100, d: 200}), MUL, true).verify()
      expect(result.success, result.error).to.be.false

      // scaled-up result
      result = frm.unlockScaled(100, x, y, MUL, true, 200).verify()
      expect(result.success, result.error).to.be.true

      // scaled-up result
      result = frm.unlockScaled(1000, x, y, MUL, true, 2000).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should div 5/6 with 9/10 correctly', () => {
      x = new Fraction({n: 5, d: 6});
      y = new Fraction({n: 9, d: 10});

      // correct result
      result = frm.unlock(x, y, new Fraction({n: 50, d: 54}), DIV, true).verify()
      expect(result.success, result.error).to.be.true

      // same result with different d is also correct
      result = frm.unlock(x, y, new Fraction({n: 25, d: 27}), DIV, true).verify()
      expect(result.success, result.error).to.be.true
  
      // wrong result
      result = frm.unlock(x, y, new Fraction({n: 3, d: 4}), DIV, true).verify()
      expect(result.success, result.error).to.be.false

      // scaled-up result
      result = frm.unlockScaled(100, x, y, DIV, true, 92).verify()
      expect(result.success, result.error).to.be.true

      // scaled-up result
      result = frm.unlockScaled(1000, x, y, DIV, true, 925).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should throw when div 1 with 0', () => {
      x = new Fraction({n: 1, d: 1});
      y = new Fraction({n: 0, d: 10});

      result = frm.unlock(x, y, nan, DIV, true).verify()
      expect(result.success, result.error).to.be.false
    })

    it('should abs -1/3 correctly', () => {
      x = new Fraction({n: -1, d: 3});

      // correct result
      result = frm.unlock(x, nan, new Fraction({n: 1, d: 3}), ABS, true).verify()
      expect(result.success, result.error).to.be.true

      // same result with different d is also correct
      result = frm.unlock(x, nan, new Fraction({n: 10, d: 30}), ABS, true).verify()
      expect(result.success, result.error).to.be.true
  
      // wrong result
      result = frm.unlock(x, y, new Fraction({n: -1, d: 3}), ABS, true).verify()
      expect(result.success, result.error).to.be.false
    });
  
    it("should throw if denominator is not positive", () => {
      x = new Fraction({n: 3, d: -4});
      y = new Fraction({n: 1, d: -4});

      result = frm.unlock(x, y, new Fraction({n: -4, d: 4}), ADD, true).verify()
      expect(result.success, result.error).to.be.false
      
      result = frm.unlock(x, y, new Fraction({n: -2, d: 4}), SUB, true).verify()
      expect(result.success, result.error).to.be.false

      result = frm.unlock(x, y, new Fraction({n: 3, d: 16}), MUL, true).verify()
      expect(result.success, result.error).to.be.false

      result = frm.unlock(x, y, new Fraction({n: 12, d: 4}), DIV, true).verify()
      expect(result.success, result.error).to.be.false

      result = frm.unlock(x, y, new Fraction({n: 3, d: 4}), ABS, true).verify()
      expect(result.success, result.error).to.be.false
    })
  })

});