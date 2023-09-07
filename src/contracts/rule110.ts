import { ByteString, SmartContract, assert, slice, hash256, method, prop, toByteString } from 'scrypt-ts'


export class rule110 extends SmartContract{
    static readonly  N : bigint= 5n; //size of board
    static readonly N2 : bigint = 3n; //size of board
    @prop()
    static LIVE :  ByteString = toByteString('01');
    @prop()
    static  DEAD : ByteString = toByteString('00');

    @prop(true)
    board : ByteString;
    
    constructor(board : ByteString){
        super(...arguments)
        this.board = board
    }

    @method()
    public play(amount : bigint) {
        this.board = this.computeNewBoard(this.board);
        assert(amount > 0n)
        let output : ByteString = this.buildStateOutput(this.ctx.utxo.value) + this.buildChangeOutput()

        assert(hash256(output) == this.ctx.hashOutputs)
    }

    @method()
    computeNewBoard(board : ByteString) : ByteString {
        let res : ByteString = toByteString('');
        res += rule110.DEAD;
        for (let i = 0n; i < rule110.N2; i ++) {
            res += this.newState(slice(board, i , i + 3n))
       
        }
        res += rule110.DEAD;
        return res;
    }
    
    @method()
    newState(arg : ByteString) : ByteString {
        /*
          Current pattern	        111	110	101	100	011	010	001	000
          New state for center cell	 0	 1	 1	0	 1	 1	 1	 0
        */
        let a : ByteString = slice(arg, 0n, 1n);
        let b : ByteString = slice(arg, 1n , 2n);
        let c : ByteString = slice(arg, 2n , 3n);
        let res : ByteString = rule110.LIVE;
        if (a == rule110.LIVE && b == rule110.LIVE && c == rule110.LIVE) {
            res = rule110.DEAD;
        }
        if (a == rule110.LIVE && b == rule110.DEAD && c == rule110.DEAD) {
            res = rule110.DEAD;
        }
        if (a == rule110.DEAD && b == rule110.DEAD && c == rule110.DEAD) {
            res = rule110.DEAD;
        }
        return res;
    }
}
