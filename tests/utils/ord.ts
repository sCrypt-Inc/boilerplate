import axios from 'axios'
import { SmartContract, UTXO, bsv } from 'scrypt-ts'
import { signTx } from 'scryptlib'

export function fetchInscriptionByOutpoint(outpoint: string): any {
    const url = `https://ordinals.gorillapool.io/api/inscriptions/outpoint/${outpoint}`

    return axios
        .get(url)
        .then(function (response) {
            // handle success
            const script = Buffer.from(response.data.script, 'base64').toString(
                'hex'
            )
            return Object.assign({}, response.data, {
                script,
            })
        })
        .catch(function (error) {
            // handle error
            console.log(error)
            return null
        })
}

export function fetchBSV20Utxo(
    address: string,
    tick: string
): Promise<Array<UTXO>> {
    const url = `https://ordinals.gorillapool.io/api/utxos/address/${address}/tick/${tick}`

    return axios
        .get(url)
        .then(function (response) {
            // handle success
            if (Array.isArray(response.data)) {
                return Promise.all(
                    response.data.map(async (utxo) => {
                        const inscription = await fetchInscriptionByOutpoint(
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

export async function sendBSV20ToContract(
    bsv20: UTXO,
    ordPk: bsv.PrivateKey,
    instance: SmartContract
) {
    instance.buildDeployTransaction = (
        utxos: UTXO[],
        amount: number,
        changeAddress?: bsv.Address | string
    ): Promise<bsv.Transaction> => {
        const deployTx = new bsv.Transaction()

        const ordinal = bsv.Script.fromHex(bsv20.script.slice(50))

        instance.setOrdinal(ordinal)
        deployTx.from(bsv20).addOutput(
            new bsv.Transaction.Output({
                script: instance.lockingScript,
                satoshis: amount,
            })
        )

        if (changeAddress) {
            deployTx.change(changeAddress)
        }
        const lockingScript = bsv.Script.fromHex(bsv20.script)

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
