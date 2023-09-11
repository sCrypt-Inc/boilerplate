import {
    ByteString,
    toByteString,
    bsv,
    UTXO,
    toHex,
    SmartContract,
} from 'scrypt-ts'
import { signTx } from 'scryptlib'
import superagent from 'superagent'

/** Ordinal Inscription */
export type Inscription = {
    /** content in raw hex */
    content: string
    /** contentType in raw hex */
    contentType: string
}

export class Ordinal {
    inscription: Inscription

    constructor(inscription: Inscription) {
        this.inscription = inscription
    }

    toScript(): bsv.Script {
        const contentTypeBytes = toByteString(
            this.inscription.contentType,
            true
        )
        const contentBytes = toByteString(this.inscription.content, true)
        return bsv.Script.fromASM(
            `OP_FALSE OP_IF 6f7264 OP_1 ${contentTypeBytes} OP_0 ${contentBytes} OP_ENDIF`
        )
    }

    toP2PKH(address: string | bsv.Address | bsv.PublicKey): bsv.Script {
        return bsv.Script.buildPublicKeyHashOut(address).add(this.toScript())
    }

    getInscription(): Inscription {
        return this.inscription
    }

    async trackLatest(origin: string): Promise<UTXO | null> {
        try {
            const res = await superagent.get(
                Ordinal._getApi(`utxos/origin/${origin}`)
            )

            if (res.ok) {
                const { txid, vout, satoshis, script } = res.body
                const utxo = {
                    txId: txid,
                    outputIndex: vout,
                    script: Buffer.from(script, 'base64').toString('hex'),
                    satoshis: satoshis,
                }
                return utxo
            }
        } catch (e) {
            console.log('trackLatest error:', e)
        }

        return null
    }

    static isOrdinalP2PKH(script: bsv.Script): boolean {
        return (
            script.chunks.length === 13 &&
            script.chunks[0].opcodenum === bsv.Opcode.OP_DUP &&
            script.chunks[1].opcodenum === bsv.Opcode.OP_HASH160 &&
            script.chunks[2].buf &&
            script.chunks[2].buf.length === 20 &&
            script.chunks[3].opcodenum === bsv.Opcode.OP_EQUALVERIFY &&
            script.chunks[4].opcodenum === bsv.Opcode.OP_CHECKSIG &&
            script.chunks[5].opcodenum === bsv.Opcode.OP_0 &&
            script.chunks[6].opcodenum === bsv.Opcode.OP_IF &&
            script.chunks[7].buf &&
            script.chunks[7].buf.length === 3 &&
            script.chunks[7].buf.toString('hex') === '6f7264' &&
            script.chunks[8].opcodenum === bsv.Opcode.OP_1 &&
            script.chunks[9].buf &&
            script.chunks[10].opcodenum === bsv.Opcode.OP_0 &&
            script.chunks[11].buf &&
            script.chunks[12].opcodenum === bsv.Opcode.OP_ENDIF
        )
    }

    static isOrdinalContract(script: bsv.Script): boolean {
        return (
            script.chunks.length > 8 &&
            script.chunks[0].opcodenum === bsv.Opcode.OP_0 &&
            script.chunks[1].opcodenum === bsv.Opcode.OP_IF &&
            script.chunks[2].buf &&
            script.chunks[2].buf.length === 3 &&
            script.chunks[2].buf.toString('hex') === '6f7264' &&
            script.chunks[3].opcodenum === bsv.Opcode.OP_1 &&
            script.chunks[4].buf &&
            script.chunks[5].opcodenum === bsv.Opcode.OP_0 &&
            script.chunks[6].buf &&
            script.chunks[7].opcodenum === bsv.Opcode.OP_ENDIF
        )
    }

    static byteString2Str(str: ByteString): string {
        const decoder = new TextDecoder()
        return decoder.decode(Buffer.from(str, 'hex'))
    }

    static fromScript(script: bsv.Script): Ordinal | null {
        if (Ordinal.isOrdinalP2PKH(script)) {
            const content = Ordinal.byteString2Str(toHex(script.chunks[11].buf))
            const contentType = Ordinal.byteString2Str(
                toHex(script.chunks[9].buf)
            )
            return Ordinal.create({
                content,
                contentType,
            })
        }

        if (Ordinal.isOrdinalContract(script)) {
            const content = Ordinal.byteString2Str(toHex(script.chunks[6].buf))
            const contentType = Ordinal.byteString2Str(
                toHex(script.chunks[4].buf)
            )
            return Ordinal.create({
                content,
                contentType,
            })
        }

        return null
    }

    static create(inscription: Inscription): Ordinal {
        return new Ordinal(inscription)
    }

    static createText(text: string): Ordinal {
        return Ordinal.create({
            content: text,
            contentType: 'text/plain',
        })
    }

    /**
     * To deploy the ordi token, you would create an inscription with the following json (with ContentType: application/bsv-20):
     * @example { 
        "p": "bsv-20",
        "op": "deploy",
        "tick": "ordi",
        "max": "21000000",
        "lim": "1000"
    }
    * @param tick 
    * @param max 
    * @param lim 
    * @returns 
    */
    static createDeployBsv20(tick: string, max: string, lim: string): Ordinal {
        return Ordinal.create({
            content: JSON.stringify({
                p: 'bsv-20',
                op: 'deploy',
                tick,
                max,
                lim,
            }),
            contentType: 'application/bsv-20',
        })
    }

    static createMintBsv20(tick: string, amt: string): Ordinal {
        return Ordinal.create({
            content: JSON.stringify({
                p: 'bsv-20',
                op: 'mint',
                tick,
                amt,
            }),
            contentType: 'application/bsv-20',
        })
    }

    static createTransferBsv20(tick: string, amt: string): Ordinal {
        return Ordinal.create({
            content: JSON.stringify({
                p: 'bsv-20',
                op: 'transfer',
                tick,
                amt,
            }),
            contentType: 'application/bsv-20',
        })
    }

    private static _getApi(api: string) {
        const n = process.env.NETWORK || 'mainnet'

        const network = bsv.Networks.get(n)

        return network === bsv.Networks.mainnet
            ? `https://ordinals.gorillapool.io/api/${api}`
            : `https://ordinals.gorillapool.io/api/${api}`
    }
    static async createFromInscriptionId(id: bigint): Promise<Ordinal | null> {
        try {
            let res = await superagent.get(
                Ordinal._getApi(`inscriptions/${id}`)
            )

            if (res.ok) {
                const { outpoint } = res.body

                res = await superagent.get(
                    Ordinal._getApi(`inscriptions/outpoint/${outpoint}`)
                )

                if (res.ok) {
                    const { script } = res.body
                    return Ordinal.fromScript(
                        bsv.Script.fromBuffer(Buffer.from(script, 'base64'))
                    )
                }
            }
        } catch (e) {
            console.log('createFromInscriptionId error:', e)
        }

        return null
    }

    static fetchInscriptionByOutpoint(outpoint: string): any {
        const url = `https://ordinals.gorillapool.io/api/inscriptions/outpoint/${outpoint}`

        return superagent
            .get(url)
            .then(function (response) {
                // handle success
                const script = Buffer.from(
                    response.body.script,
                    'base64'
                ).toString('hex')
                return Object.assign({}, response.body, {
                    script,
                })
            })
            .catch(function (error) {
                // handle error
                console.log(error)
                return null
            })
    }

    static fetchBSV20Utxo(address: string, tick: string): Promise<Array<UTXO>> {
        const url = `https://ordinals.gorillapool.io/api/utxos/address/${address}/tick/${tick}`

        return superagent
            .get(url)
            .then(function (response) {
                // handle success
                if (Array.isArray(response.body)) {
                    return Promise.all(
                        response.body.map(async (utxo) => {
                            const inscription =
                                await Ordinal.fetchInscriptionByOutpoint(
                                    utxo.outpoint
                                )
                            return {
                                txId: utxo.txid,
                                outputIndex: utxo.vout,
                                script: inscription.script,
                                satoshis: 1,
                            }
                        })
                    )
                }
                return []
            })
            .catch(function (error) {
                // handle error
                console.log(error)
                return []
            })
    }

    static send2Contract(
        utxo: UTXO,
        ordPk: bsv.PrivateKey,
        instance: SmartContract,
        bsv20: boolean = false
    ) {
        instance.buildDeployTransaction = (
            utxos: UTXO[],
            amount: number,
            changeAddress?: bsv.Address | string
        ): Promise<bsv.Transaction> => {
            const deployTx = new bsv.Transaction()

            if (bsv20) {
                const ordinal = Ordinal.fromScript(
                    bsv.Script.fromHex(utxo.script)
                ) as Ordinal

                const inscription = ordinal.getInscription()

                const bsv20JSON = JSON.parse(inscription?.content as string)

                instance.setNOPScript(
                    Ordinal.createTransferBsv20(
                        bsv20JSON.tick,
                        bsv20JSON.amt
                    ).toScript()
                )
            }

            deployTx.from(utxo).addOutput(
                new bsv.Transaction.Output({
                    script: instance.lockingScript,
                    satoshis: amount,
                })
            )

            if (changeAddress) {
                deployTx.change(changeAddress)
            }
            const lockingScript = bsv.Script.fromHex(utxo.script)

            const sig = signTx(
                deployTx,
                ordPk,
                lockingScript,
                amount,
                0,
                bsv.crypto.Signature.ANYONECANPAY_SINGLE
            )

            deployTx.inputs[0].setScript(
                bsv.Script.buildPublicKeyHashIn(
                    ordPk.publicKey,
                    bsv.crypto.Signature.fromTxFormat(Buffer.from(sig, 'hex')),
                    bsv.crypto.Signature.ANYONECANPAY_SINGLE
                )
            )

            return Promise.resolve(deployTx)
        }
        return instance.deploy(1)
    }
}
