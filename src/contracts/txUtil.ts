// forked from https://sensiblecontract.org

import {
    Addr,
    ByteString,
    Constants,
    SmartContractLib,
    Utils,
    assert,
    hash160,
    hash256,
    method,
    slice,
    toByteString,
} from 'scrypt-ts'

type Output = {
    satoshis: bigint
    script: ByteString
}

export class TxUtil extends SmartContractLib {
    @method()
    static readOutput(tx: ByteString, outputIndex: bigint): Output {
        // first 4 bytes version
        // 1 byte input num, only support max 3
        let pos: bigint = 4n
        let ninputs: bigint = Utils.fromLEUnsigned(slice(tx, pos, pos + 1n))
        pos = pos + 1n
        let script: ByteString = toByteString('')
        let satoshis: bigint = 0n
        // max support 3 input
        // input
        assert(ninputs <= 3n)
        for (let i = 0; i < 3; i++) {
            if (i < ninputs) {
                // output point 36 bytes
                pos = pos + 36n
                // 1 byte var
                // script code + 4 bytes sequence
                let varLen: bigint = Utils.fromLEUnsigned(
                    slice(tx, pos, pos + 1n)
                )
                if (varLen < 253) {
                    let scriptLen: bigint = varLen
                    pos = pos + 1n + scriptLen + 4n
                } else if (varLen == 253n) {
                    let scriptLen: bigint = Utils.fromLEUnsigned(
                        slice(tx, pos + 1n, pos + 3n)
                    )
                    pos = pos + 3n + scriptLen + 4n
                } else if (varLen == 254n) {
                    let scriptLen: bigint = Utils.fromLEUnsigned(
                        slice(tx, pos + 1n, pos + 5n)
                    )
                    pos = pos + 5n + scriptLen + 4n
                } else {
                    let scriptLen: bigint = Utils.fromLEUnsigned(
                        slice(tx, pos + 1n, pos + 9n)
                    )
                    pos = pos + 9n + scriptLen + 4n
                }
            }
        }

        let noutputs: bigint = Utils.fromLEUnsigned(slice(tx, pos, pos + 1n))
        pos = pos + 1n
        assert(noutputs <= 3n)
        for (let i = 0n; i < 3n; i++) {
            if (i < noutputs) {
                // 8 bytes value
                let sats: bigint = Utils.fromLEUnsigned(
                    slice(tx, pos, pos + 8n)
                )
                pos = pos + 8n
                // script code
                let varLen: bigint = Utils.fromLEUnsigned(
                    slice(tx, pos, pos + 1n)
                )
                let scriptLen: bigint = 0n
                if (varLen < 253n) {
                    scriptLen = varLen
                    pos = pos + 1n + scriptLen
                } else if (varLen == 253n) {
                    scriptLen = Utils.fromLEUnsigned(
                        slice(tx, pos + 1n, pos + 3n)
                    )
                    pos = pos + 3n + scriptLen
                } else if (varLen == 254n) {
                    scriptLen = Utils.fromLEUnsigned(
                        slice(tx, pos + 1n, pos + 5n)
                    )
                    pos = pos + 5n + scriptLen
                } else {
                    scriptLen = Utils.fromLEUnsigned(
                        slice(tx, pos + 1n, pos + 9n)
                    )
                    pos = pos + 9n + scriptLen
                }
                if (i == outputIndex) {
                    script = slice(tx, pos - scriptLen, pos)
                    satoshis = sats
                }
            }
        }

        // 4 bytes locktime
        return { satoshis, script }
    }

    @method()
    static getScriptCodeFromOutput(output: ByteString): ByteString {
        return Utils.readVarint(slice(output, 8n))
    }

    @method()
    static getVarOpLen(length: bigint): bigint {
        let res: bigint = 0n
        if (length <= 75n) {
            res = 1n
        } else if (length <= 255n) {
            res = 2n
        } else if (length <= 65535n) {
            res = 3n
        } else {
            res = 5n
        }
        return res
    }

    @method()
    static getVarOpLenOpt(length: bigint): bigint {
        let res: bigint = 0n
        if (length <= 75n) {
            res = 1n
        } else {
            res = 2n
        }
        return res
    }

    @method()
    static genBsvOutput(satoshis: bigint, address: Addr): ByteString {
        let output = toByteString('')
        if (satoshis > 0n) {
            let outputScript = Utils.buildPublicKeyHashScript(address)
            output = Utils.buildOutput(outputScript, satoshis)
        }
        return output
    }

    // get i-th outpoint's txid
    @method()
    static getPrevoutTxid(prevouts: ByteString, i: bigint): ByteString {
        let offset: bigint = i * Constants.OutpointLen
        return slice(prevouts, offset, offset + Constants.TxIdLen)
    }

    // get i-th outpoint's output index
    @method()
    static getPrevoutOutputIdx(prevouts: ByteString, i: bigint): bigint {
        let offset = i * Constants.OutpointLen
        return Utils.fromLEUnsigned(
            slice(
                prevouts,
                offset + Constants.TxIdLen,
                offset + Constants.OutpointLen
            )
        )
    }

    // verify a contract, called in another input, by its hash
    @method()
    static verifyContractByHash(
        prevouts: ByteString,
        inputIdx: bigint,
        prevTx: ByteString,
        contractScriptHash: Addr
    ): boolean {
        // validate the tx containing the called contract
        const prevTxId = TxUtil.getPrevoutTxid(prevouts, inputIdx)
        assert(hash256(prevTx) == prevTxId)

        // validate the called contract, i.e., its locking script
        const outputIndex = TxUtil.getPrevoutOutputIdx(prevouts, inputIdx)
        const contractScript = TxUtil.readOutput(prevTx, outputIndex).script
        assert(Addr(contractScript) == contractScriptHash)

        return true
    }
}
