const { expect } = require('chai');
const { buildContractClass, getPreimage, toHex, num2bin, Bytes } = require('scryptlib');

const {
  newTx,
  compileContract
} = require('../../helper');



const solution = [

  [2,1,9,4,8,6,7,5,3],
  [7,4,5,9,1,3,2,8,6],
  [8,3,6,7,5,2,1,4,9],
  [5,6,3,2,7,4,9,1,8],
  [4,8,7,1,3,9,6,2,5],
  [9,2,1,5,6,8,3,7,4],
  [6,7,2,3,4,5,8,9,1],
  [3,9,4,8,2,1,5,6,7],
  [1,5,8,6,9,7,4,3,2]
];


// board, 0 is empty value
const board = [

  [2,1,9,0,8,6,0,5,3],
  [7,4,5,9,1,0,2,8,6],
  [8,3,6,7,5,2,1,4,9],
  [0,6,3,2,7,4,9,1,8],
  [4,8,7,0,3,9,6,2,5],
  [9,2,1,5,6,8,0,7,4],
  [6,0,2,3,4,5,8,0,1],
  [3,9,0,8,2,1,5,6,7],
  [1,0,8,6,9,7,4,0,2]
];

const validSolution2 = [

  [5,5,5,5,5,5,5,5,5],
  [5,5,5,5,5,5,5,5,5],
  [5,5,5,5,5,5,5,5,5],
  [5,5,5,5,5,5,5,5,5],
  [5,5,5,5,5,5,5,5,5],
  [5,5,5,5,5,5,5,5,5],
  [5,5,5,5,5,5,5,5,5],
  [5,5,5,5,5,5,5,5,5],
  [5,5,5,5,5,5,5,5,5]
];






const validSolution0 = [

  [2,1,9,7,8,6,4,5,3],
  [7,4,5,9,1,3,2,8,6],
  [8,3,6,7,5,2,1,4,9],
  [5,6,3,2,7,4,9,1,8],
  [4,8,7,1,3,9,6,2,5],
  [9,2,1,5,6,8,3,7,4],
  [6,7,2,3,4,5,8,9,1],
  [3,9,4,8,2,1,5,6,7],
  [1,5,8,6,9,7,4,3,2]
];


const validSolution1 = [

  [2,1,9,4,8,6,7,5,3],
  [7,4,5,9,1,3,2,8,6],
  [8,3,6,7,5,2,1,4,9],
  [5,6,3,2,7,4,9,1,8],
  [4,8,7,1,3,9,6,2,5],
  [9,2,1,5,6,8,3,7,4],
  [6,5,2,3,4,5,8,9,1],
  [3,9,4,8,2,1,5,6,7],
  [1,7,8,6,9,7,4,3,2]
];


const row = 9;
const col = 9;
function boardToHex(arr) {
  let hex = '';
  for (let i = 0; i < row; i++) {
    for (let j = 0; j < col; j++) {
      hex = hex +  (arr[i][j] === 0 ? '00' : num2bin(arr[i][j]));
    }
    
  }
  return hex;
}


describe('Test sCrypt contract sudoku In Javascript', () => {
  let sudoku, result

  before(() => {
    const Sudoku = buildContractClass(compileContract('sudoku.scrypt'))
    sudoku = new Sudoku(new Bytes(boardToHex(board)))

  })

  it('should succeed', () => {
    result = sudoku.solve(new Bytes(boardToHex(solution))).verify()
    expect(result.success, result.error).to.be.true
  });


  it('should fail', () => {
    result = sudoku.solve(new Bytes(boardToHex(validSolution0))).verify()
    expect(result.success, result.error).to.be.false
  });


  it('should fail', () => {
    result = sudoku.solve(new Bytes(boardToHex(validSolution1))).verify()
    expect(result.success, result.error).to.be.false
  });

  it('should fail', () => {
    result = sudoku.solve(new Bytes(boardToHex(validSolution2))).verify()
    expect(result.success, result.error).to.be.false
  });


});
