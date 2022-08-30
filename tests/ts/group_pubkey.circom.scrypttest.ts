const path = require("path");

import { expect } from 'chai';
import { Point } from '@noble/secp256k1';
const circom_tester = require('circom_tester');
const wasm_tester = circom_tester.wasm;

const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");

type key_pair = {privkey: bigint, pubkey: Array<bigint>};

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

// converts x = sum of a[i] * 2 ** (small_stride * i) for 0 <= 2 ** small_stride - 1
//      to:     sum of a[i] * 2 ** (stride * i)
function get_strided_bigint(stride: bigint, small_stride: bigint, x: bigint) {
    var ret: bigint = 0n;
    var exp: bigint = 0n;
    while (x > 0) {
        var mod: bigint = x % (2n ** small_stride);
        ret = ret + mod * (2n ** (stride * exp));
        x = x / (2n ** small_stride);
        exp = exp + 1n;
    }
    return ret;
}

describe("Heavy: Pubkey In Group", async function () {
    this.timeout(1000 * 1000);

    const GROUP_SIZE = 3;

    // runs circom compilation
    let circuit: any;
    before(async function () {
        circuit = await wasm_tester(path.join(__dirname, "../../circuits", "group_pubkey.circom"));
    });

    // (privkey, pubkey)
    var key_pairs: Array<key_pair> = [];

    for (let cnt = 0; cnt < 5; cnt++) {
        let privkey: bigint = get_strided_bigint(10n, 1n, BigInt(Math.ceil(Math.random() * 1000)));
        let pubkey: Point = Point.fromPrivateKey(privkey);
        let pub0_tuple: [bigint, bigint, bigint, bigint] = bigint_to_tuple(pubkey.x);
        let pub1_tuple: [bigint, bigint, bigint, bigint] = bigint_to_tuple(pubkey.y);
        key_pairs.push({privkey, pubkey: pub0_tuple.concat(pub1_tuple)});
    }

    var test_instance = function (pair : key_pair, index: number) {

        let priv_tuple = bigint_to_tuple(pair.privkey);

        it('Testing group contains the corresponding pubkey of the privkey: ' + pair.privkey, async function () {
            let pubkey_group_tuples = new Array<bigint>();

            // push the corresponding pubkey into the group
            pair.pubkey.forEach((bits) => {
                pubkey_group_tuples.push(bits);
            })

            // push other pubkeys into the group
            for (let i = 0; i < (GROUP_SIZE - 1); i++) {
                let j = (index + i + 1) % key_pairs.length;
                if (j == index) {
                    // push zeros if no other pubkey available
                    for(let k = 0; k < 8; k++) {
                        pubkey_group_tuples.push(0n);
                    }
                } else {
                    key_pairs[j].pubkey.forEach((bits) => {
                        pubkey_group_tuples.push(bits);
                    });
                }
            }

            let input = { "privkey": priv_tuple, "pubKeyGroup": pubkey_group_tuples};
            let witness = await circuit.calculateWitness(input);
            // output `1` means pubkey exists in group, output starts from witness[1]    
            expect(witness[1]).to.equal(1n);
            await circuit.checkConstraints(witness);
        });

        it('Testing group does not contain the corresponding pubkey of the privkey: ' + pair.privkey, async function () {
            let pubkey_group_tuples = new Array<bigint>();
            
            // push other pubkeys into the group
            for (let i = 0; i < GROUP_SIZE; i++) {
                let j = (index + i + 1) % key_pairs.length;
                if (j == index) {
                    // push zeros if no other pubkey available
                    for(let k = 0; k < 8; k++) {
                        pubkey_group_tuples.push(0n);
                    }
                } else {
                    key_pairs[j].pubkey.forEach((bits) => {
                        pubkey_group_tuples.push(bits);
                    });
                }
            }

            let input = { "privkey": priv_tuple, "pubKeyGroup": pubkey_group_tuples};
            let witness = await circuit.calculateWitness(input);
            // output `0` means pubkey does not exist in group    
            expect(witness[1]).to.equal(0n);
            await circuit.checkConstraints(witness);
        });
    }

    key_pairs.forEach(test_instance);
});