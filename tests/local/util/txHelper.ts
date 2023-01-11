import { bsv, UTXO } from 'scrypt-ts'
import { randomBytes } from 'crypto'

export const inputSatoshis = 10000

export const inputIndex = 0

export const dummyUTXO = {
    txId: randomBytes(32).toString('hex'),
    outputIndex: 0,
    script: '', // placeholder
    satoshis: inputSatoshis,
}

export function newTx(utxos?: Array<UTXO>) {
    if (utxos) {
        return new bsv.Transaction().from(utxos)
    }
    return new bsv.Transaction().from(dummyUTXO)
}
