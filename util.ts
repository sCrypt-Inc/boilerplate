type ScriptCode {

version : bigint
dataPartLen : bigint
dataPart : ByteString
codePart : ByteString
}

class util extends SmartContractLib{

@method()
static pubKeyToP2PKH(pubKey : PubKey) : ByteString{
return Utils.buildPubliKeyHashScript(hash160(pubKey))
}

@method()
static readVarintLen(b : ByteString) : bigint{
let len: bigint = 0n
let header : ByteString = b[0 : 1]
 if (header == b'fd'){
 len = 3n + Utils.fromLEUnsigned(b[1 : 3])
 
 }else if (header == b'fe'){
 
 len = 5 + Utils.fromLEUnsigned(b[1 : 5])
 
 }else if (header == b'ff'){
 
 len = 9 + Utils.fromLEUnsigned(b[1 : 9])
 
 }else{
 len = 1 + Utils.fromLEUnsigned([0 : 1])
 }
 return len

}
 
 @method()
 static writeVarMinimalPushdata(b : ByteString) : ByteString{
 let n : bigint = len(b)
 let header : ByteString = b''
 
 if (n == 0n){
 
 }else if (n == 1){
 
 let rawInt : bigint = Utils.fromLEUnsigned(b)
       if (n >= 1 && rawInt <= 16){
       
       header = Utils.toLEUnsigned(80 + rawInt + 1)
       }else if (n == 1 && rawInt == 0x81){
       //use OP_1NEGATE
       header = Utils.toLEUnsigned(79, 1)
       
       }
 }else if (n < 79){
 // use direct push
 header = Utils.toLEUnsigned(n, 1)
 
 }else if (n <= 255){
 header = b'4c' + Utils.toLEUnsigned(n, 1) + b
else if (n <= 65535){
 header = b'4d' + Utils.toLEUnsigned(n, 2) + b
else{
 header = b'4e' + Utils.toLEUnsigned(n, 4) + b
 }
 return header
 }
 
@method()
static parseScriptCode(scriptCode : ByteString) : scriptCode{
let len : bigint = len(scriptCode)
let metaScript : ByteString = scriptCode[len - 5:]

const version : bigint = Utils.fromLEUnsigned(metaScript[4:5])

const dataPartLen : bigint = Utils.fromLEUnsigned(metaScript[0:4])

const start : bigint = len - dataPartLen - 5

const dataPart : ByteString = scriptCode[start : start + dataPartLen]
const codePart : ByteString = scriptCode[: start]
return { version, dataPartLen, dataPart, codePart}

}

// get hash of the stateful contract

@method()
static codeHash() : ByteString{

let sc : ScriptCode = this.parseScriptCode
return hash160(sc.codePart)
}