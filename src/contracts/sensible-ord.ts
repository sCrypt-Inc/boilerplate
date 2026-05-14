import {
Sig,
PubKey,
MethodCall,
SmartContract,
assert,
prop,
Utils,
hash256,
Ripemd160,
Sha256,
int2ByteString,
len,
byteString2Int,
slice,
toByteString,
fillLeadingNBits,
hash160,
method,
PubKeyHash,
} from 'scrypt-ts'
import { BSV20V2 } from '../bsv20V2'
import { BSV20V2P2PKH } from '../bsv20V2p2pkh'
import { HftLock } from './hftLock'
import { TransferOutput, OP_NET, putUtxo, getUtxo, txInputs, ScriptContext } from 'scrypt-ts-lib'

export class SensibleOrd extends SmartContract {
@prop()
oraclePubKey: PubKey

@prop()
feeRate: bigint

@prop()
minP2PKH_Sats: bigint

@prop()
purse: PubKeyHash

constructor(oraclePubKey: PubKey, feeRate: bigint, minP2PKH_Sats: bigint, purse: PubKeyHash) {
super(...arguments)
this.oraclePubKey = oraclePubKey
this.feeRate = feeRate
this.minP2PKH_Sats = minP2PKH_Sats
this.purse = purse
}

@method()
redeem(
tx: ByteString,
vin: bigint,
sig: Sig,
pubKey: PubKey,
outputs: ByteString
): void {
assert(
hash160(pubKey) == this.purse,
'not the purse pubKey'
)
assert(this.checkSig(sig, pubKey), 'signature check failed')

const amount = Utils.value(tx, vin)
const change = amount - this.feeRate

const script = Utils.buildPublicKeyHashScript(pubKey)

const changeOutput = Utils.buildOutput(script, change)
assert(
hash256(outputs) == this.ctx.hashOutputs,
'hashOutputs mismatch'
)
}

@method()
redeemDoge(
tx: ByteString,
vin: bigint,
sig: Sig,
pubKey: PubKey,
outputs: ByteString
): void {
assert(
hash160(pubKey) == this.purse,
'not the purse pubKey'
)
assert(this.checkSig(sig, pubKey), 'signature check failed')

const amount = Utils.value(tx, vin)
const change = amount - this.feeRate

const script = Utils.buildPublicKeyHashScript(pubKey)

const changeOutput = Utils.buildOutput(script, change)
assert(
hash256(outputs) == this.ctx.hashOutputs,
'hashOutputs mismatch'
)
}

@method()
redeemSingle(
tx: ByteString,
vin: bigint,
sig: Sig,
pubKey: PubKey,
outputs: ByteString
): void {
assert(
hash160(pubKey) == this.purse,
'not the purse pubKey'
)
assert(this.checkSig(sig, pubKey), 'signature check failed')

const amount = Utils.value(tx, vin)
const change = amount - this.feeRate

const script = Utils.buildPublicKeyHashScript(pubKey)

const changeOutput = Utils.buildOutput(script, change)
assert(
hash256(outputs) == this.ctx.hashOutputs,
'hashOutputs mismatch'
)
}

@method()
redeemMulti(
tx: ByteString,
vin: bigint,
sig: Sig,
pubKey: PubKey,
outputs: ByteString
): void {
assert(
hash160(pubKey) == this.purse,
'not the purse pubKey'
)
assert(this.checkSig(sig, pubKey), 'signature check failed')

const amount = Utils.value(tx, vin)
const amountPerOutput: bigint = amount / 2n

const script1 = Utils.buildPublicKeyHashScript(pubKey)
const output1 = Utils.buildOutput(script1, amountPerOutput)

const script2 = Utils.buildPublicKeyHashScript(pubKey)
const output2 = Utils.buildOutput(script2, amountPerOutput)

const dummyOutput = Utils.buildOutput(script1, 0n)
assert(
hash256(dummyOutput) == this.ctx.hashOutputs,
'hashOutputs mismatch'
)
}

}
