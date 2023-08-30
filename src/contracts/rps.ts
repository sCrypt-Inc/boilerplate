import { ByteString, Constants, PubKey, PubKeyHash, Ripemd160, Sig, SmartContract, Utils, assert, byteString2Int, hash160, hash256, int2ByteString, len, method, slice, toByteString, prop } from "scrypt-ts";

/**
 * Two players play Rock Paper Scissors
 *
 * Game start by player A, put some bsv in the contract,
 * then player B follow, put half bsv in the contract,
 * then player A finish it.
 */
export class RockPaperScissors extends SmartContract{
    @prop()
    static readonly INIT : bigint = 0n;
    @prop()
    static readonly ROCK : bigint = 1n;
    @prop()
    static readonly PAPER : bigint = 2n;
    @prop()
    static readonly SCISSORS : bigint = 3n;
    @prop()
    static readonly DataLen : bigint = 1n;


    @method()
    public follow(action : bigint, playerBpkh : PubKeyHash, satoshiAmount : bigint) {
        
        // valid action
        assert(action > 0n && action < 4n);

        let lockingScript : ByteString = this.ctx.utxo.script;
        let scriptLen = len(lockingScript);

        // init action
        let initAction : bigint = byteString2Int(slice(lockingScript, scriptLen - RockPaperScissors.DataLen ));
        assert(initAction == RockPaperScissors.INIT);

        let satoshiInit : bigint = this.ctx.utxo.value;
        let codePart : ByteString = slice(lockingScript, scriptLen - Constants.PubKeyHashLen - RockPaperScissors.DataLen);

        let outputScript0 : ByteString = codePart + playerBpkh + int2ByteString(action, RockPaperScissors.DataLen);
        let output0 : ByteString = Utils.buildOutput(outputScript0, satoshiInit * 3n / 2n);

        let lockingScript1 : ByteString = Utils.buildPublicKeyHashScript(playerBpkh);
        let output1 : ByteString = Utils.buildOutput(lockingScript1, satoshiAmount);

        let output = output0 + output1;

        assert(hash256(output) == this.ctx.hashOutputs);
    }

    @method()
    public finish(action : bigint,  sig : Sig, playerA : PubKey, satoshiAmountA : bigint) {
       
        // valid action
        assert(action > 0n && action < 4n);

        let satoshiTotal : bigint = this.ctx.utxo.value;
        let lockingScript : ByteString = this.ctx.utxo.script;
        let scriptLen = len(lockingScript);

        let bAction : bigint = byteString2Int(slice(lockingScript, scriptLen - RockPaperScissors.DataLen));
        assert(bAction != RockPaperScissors.INIT);

        let playerAdata : Ripemd160 = Ripemd160(slice(lockingScript, scriptLen - Constants.PubKeyHashLen * 2n - RockPaperScissors.DataLen , scriptLen - Constants.PubKeyHashLen - RockPaperScissors.DataLen));
        // authorize
        assert(hash160(int2ByteString(action, RockPaperScissors.DataLen) + playerA) == playerAdata);
        assert(this.checkSig(sig, playerA));

        let satoshiAmountB : bigint = satoshiTotal * 1n / 3n;
        if (action == (bAction % 3n + 1n)) {
            // a win
            satoshiAmountB = 0n;
        }
        else if (bAction == (action % 3n + 1n)) {
            // a lose
            satoshiAmountB = satoshiTotal * 2n / 3n;
        }

        let playerApkh : PubKeyHash= hash160(playerA);
        let output0 : ByteString = Utils.buildPublicKeyHashOutput(playerApkh, satoshiAmountA)

        let output1 : ByteString = toByteString('');
        if (satoshiAmountB > 0n) {
            let playerBpkh : Ripemd160 = Ripemd160(slice(lockingScript,scriptLen - Constants.PubKeyHashLen - RockPaperScissors.DataLen , scriptLen - RockPaperScissors.DataLen));
            output1 = Utils.buildPublicKeyHashOutput(playerBpkh, satoshiAmountB)
        }

        let output : ByteString = output0 + output1
        assert(hash256(output) == this.ctx.hashOutputs);
    }
}
