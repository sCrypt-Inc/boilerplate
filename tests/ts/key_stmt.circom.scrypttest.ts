const path = require("path");

import { expect } from 'chai';
import { Point } from '@noble/secp256k1';
import { bsv } from 'scryptlib';
import { toBigIntBE, toBufferBE } from 'bigint-buffer';

const TUPLE_SIZE = 4;
const circom_tester = require('circom_tester');
const wasm_tester = circom_tester.wasm;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");

// little-endian tuples
function bigint_to_tuple(x: bigint) {
    const mod: bigint = 2n ** 64n;
    let ret: [bigint, bigint, bigint, bigint] = [0n, 0n, 0n, 0n];

    var x_temp: bigint = x;
    for (var idx = 0; idx < ret.length; idx++) {
        ret[idx] = x_temp % mod;
        x_temp = x_temp / mod;
    }
    return ret;
}

describe("Key statement circom", async function () {
    // runs circom compilation
    let circuit: any;
    before(async function () {
        circuit = await wasm_tester(path.join(__dirname, "../../circuits", "key_stmt.circom"));
    });


    it('should pass given the correct sha256 hash result of the private key', async () => {
        let privkey: bigint = toBigIntBE((new bsv.PrivateKey.fromRandom('testnet')).toBuffer());
        let priv_tuple: [bigint, bigint, bigint, bigint] = bigint_to_tuple(privkey);

        let pubkey: Point = Point.fromPrivateKey(privkey);
        let pub0_tuple: [bigint, bigint, bigint, bigint] = bigint_to_tuple(pubkey.x);
        let pub1_tuple: [bigint, bigint, bigint, bigint] = bigint_to_tuple(pubkey.y);

        let key_hash = bsv.crypto.Hash.sha256(toBufferBE(privkey, 32));
        // treat the hash result as a bigint
        let hash_tuple = bigint_to_tuple(toBigIntBE(key_hash));

        let input = { "privkey": priv_tuple, "pubkey": pub0_tuple.concat(pub1_tuple) }

        let witness = await circuit.calculateWitness(input);

        // the output in `witness` should equal to `key_hash`
        for (let i = 0; i < TUPLE_SIZE; i++) {
            // Note output in `witness` is big-endian while `hash_tuple` is little-endian
            expect(witness[i + 1]).to.equal(hash_tuple[TUPLE_SIZE - 1 - i]);
        }
        await circuit.checkConstraints(witness);
    })

    it('should fail given an incorret pubkey as input', async () => {
        let privkey: bigint = toBigIntBE((new bsv.PrivateKey.fromRandom('testnet')).toBuffer());
        let priv_tuple: [bigint, bigint, bigint, bigint] = bigint_to_tuple(privkey);

        // random pubkey
        let pubkey: Point = Point.fromPrivateKey(BigInt(Math.ceil(Math.random() * 1000)));
        let pub0_tuple: [bigint, bigint, bigint, bigint] = bigint_to_tuple(pubkey.x);
        let pub1_tuple: [bigint, bigint, bigint, bigint] = bigint_to_tuple(pubkey.y);

        let input = { "privkey": priv_tuple, "pubkey": pub0_tuple.concat(pub1_tuple) }

        let witnessCalcSucceeded = true;
        try {
            let witness = await circuit.calculateWitness(input);
            await circuit.checkConstraints(witness);
        } catch (e) {
            witnessCalcSucceeded = false;
        }

        expect(witnessCalcSucceeded).to.equal(false);
    })

});