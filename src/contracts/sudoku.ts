import {
  ByteString,
  SmartContract,
  assert,
  len,
  method,
  prop,
  toByteString,
  Utils,
} from "scrypt-ts";
import { Arrays } from "./Array";
import { ArrayUtils } from "scrypt-ts-lib";

export class Sudoku extends SmartContract {
  @prop()
  board: ByteString;

  static readonly N: bigint = 9n;
  static readonly EMPTY: ByteString = toByteString("00");

  constructor(board: ByteString) {
    super(...arguments);
    this.board = board;
  }

  @method()
  merge(solution: ByteString): ByteString {
    let newBoard: ByteString = this.board;

    for (let i = 0n; i < Sudoku.N; i++) {
      for (let j = 0n; j < Sudoku.N; j++) {
        let value: bigint = Sudoku.readValue(newBoard, i, j);
        let inputValue: bigint = Sudoku.readValue(solution, i, j);
        if (value == 0n) {
          assert(inputValue <= 9n);
          newBoard = Sudoku.setValue(newBoard, i, j, inputValue);
        } else {
          assert(value == inputValue);
        }
      }
    }
    return newBoard;
  }

  @method()
  public solve(solution: ByteString) {
    assert(len(solution) == Sudoku.N * Sudoku.N);

    let newBord: ByteString = this.merge(solution);

    let rowArray: Arrays = new Arrays(toByteString(""));
    let colArray: Arrays = new Arrays(toByteString(""));
    let squareArray: Arrays = new Arrays(toByteString(""));

    for (let i = 0n; i < Sudoku.N; i++) {
      for (let j = 0n; j < Sudoku.N; j++) {
        // check for duplicate

        // in a row
        let rowElem: bigint = Sudoku.readValue(newBord, i, j);
        assert(rowArray.indexOf(rowElem) == -1n);
        rowArray.push(rowElem);

        // in a column
        let colElem: bigint = Sudoku.readValue(newBord, j, i);
        assert(colArray.indexOf(colElem) == -1n);
        colArray.push(colElem);

        // in a subgrid
        let squareElem: bigint = Sudoku.readSquareValue(newBord, i, j);
        assert(squareArray.indexOf(squareElem) == -1n);
        squareArray.push(squareElem);
      }

      rowArray.clear();
      colArray.clear();
      squareArray.clear();
    }

    assert(true);
  }

  @method()
  static readValue(board: ByteString, i: bigint, j: bigint): bigint {
    return Utils.fromLEUnsigned(
      ArrayUtils.getElemAt(board, Sudoku.index(i, j))
    );
  }

  @method()
  static setValue(
    board: ByteString,
    i: bigint,
    j: bigint,
    value: bigint
  ): ByteString {
    return ArrayUtils.setElemAt(
      board,
      Sudoku.index(i, j),
      Utils.toLEUnsigned(value, 1n)
    );
  }

  @method()
  static readSquareValue(board: ByteString, i: bigint, j: bigint): bigint {
    return Utils.fromLEUnsigned(
      ArrayUtils.getElemAt(board, Sudoku.indexSquare(i, j))
    );
  }

  @method()
  static index(row: bigint, col: bigint): bigint {
    return row * Sudoku.N + col;
  }

  @method()
  static indexSquare(i: bigint, j: bigint): bigint {
    let row: bigint = (i / 3n) * 3n + j / 3n;
    let col: bigint = (i % 3n) * 3n + (j % 3n);
    return Sudoku.index(row, col);
  }
}
