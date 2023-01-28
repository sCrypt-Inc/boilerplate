import { bsv, UTXO } from 'scrypt-ts'
import { myPrivateKey } from './myPrivateKey'
import { fetchUtxos, sendTx, sleep } from './txHelper'

enum UtxoMgrInitState {
    UNINITIALIZED,
    INITIALIZING,
    INITIALIZED,
}

export class UtxoManager {
    privKey: bsv.PrivateKey
    address: string
    private availableUtxos: UTXO[] = []
    private initStates: UtxoMgrInitState = UtxoMgrInitState.UNINITIALIZED
    private initUtxoCnt = 0

    constructor(privKey = myPrivateKey) {
        this.privKey = privKey
        this.address = privKey.toAddress().toString()
    }

    async init() {
        if (this.initStates === UtxoMgrInitState.INITIALIZED) {
            return this
        }
        if (this.initStates === UtxoMgrInitState.UNINITIALIZED) {
            this.initStates = UtxoMgrInitState.INITIALIZING
            this.availableUtxos = await fetchUtxos(
                this.privKey.toAddress().toString()
            )
            this.initStates = UtxoMgrInitState.INITIALIZED
            this.initUtxoCnt = this.availableUtxos.length
            console.log(
                `current balance of address ${
                    this.address
                } is ${this.availableUtxos.reduce(
                    (r, utxo) => r + utxo.satoshis,
                    0
                )} satoshis`
            )
        }
        while (this.initStates === UtxoMgrInitState.INITIALIZING) {
            await sleep(1)
        }
        return this
    }

    collectUtxoFrom(tx: bsv.Transaction) {
        tx.outputs.forEach((output, outputIndex) => {
            if (output.script.toHex() === this.utxoScriptHex) {
                this.availableUtxos.push({
                    txId: tx.id,
                    outputIndex,
                    satoshis: output.satoshis,
                    script: output.script.toHex(),
                })
            }
        })
    }

    async getUtxos(targetSatoshis?: number) {
        if (
            this.initStates === UtxoMgrInitState.INITIALIZED &&
            this.initUtxoCnt > 0 &&
            this.availableUtxos.length === 0
        ) {
            const timeoutSec = 30
            for (let i = 0; i < timeoutSec; i++) {
                console.log('waiting for available utxos')
                await sleep(1)
                if (this.availableUtxos.length > 0) {
                    break
                }
            }
        }

        if (targetSatoshis === undefined) {
            const allUtxos = this.availableUtxos
            this.availableUtxos = []
            return allUtxos
        }

        const sortedUtxos = this.availableUtxos.sort(
            (a, b) => a.satoshis - b.satoshis
        )

        if (
            targetSatoshis >
            sortedUtxos.reduce((r, utxo) => r + utxo.satoshis, 0)
        ) {
            throw new Error(
                'no sufficient utxos to pay the fee of ' + targetSatoshis
            )
        }

        let idx = 0
        let accAmt = 0
        for (let i = 0; i < sortedUtxos.length; i++) {
            accAmt += sortedUtxos[i].satoshis
            if (accAmt >= targetSatoshis) {
                idx = i
                break
            }
        }

        const usedUtxos = sortedUtxos.slice(0, idx + 1)

        // update the available utxos, remove used ones
        this.availableUtxos = sortedUtxos.slice(idx + 1)

        const dustLimit = 1
        if (accAmt > targetSatoshis + dustLimit) {
            // split `accAmt` to `targetSatoshis` + `change`
            const splitTx = new bsv.Transaction()
                .from(usedUtxos)
                .addOutput(
                    new bsv.Transaction.Output({
                        script: bsv.Script.buildPublicKeyHashOut(this.address),
                        satoshis: targetSatoshis,
                    })
                )
                .change(this.address) // here generates a new available utxo for address
                .sign(this.privKey)

            splitTx.seal()

            const txId = await sendTx(splitTx)

            // update the available utxos, add the new created on as the change
            if (splitTx.outputs.length === 2) {
                this.availableUtxos = this.availableUtxos.concat({
                    txId,
                    outputIndex: 1,
                    script: splitTx.outputs[1].script.toHex(),
                    satoshis: splitTx.outputs[1].satoshis,
                })
            }

            // return the new created utxo which has value of `targetSatoshis`
            return [
                {
                    txId,
                    outputIndex: 0,
                    script: splitTx.outputs[0].script.toHex(),
                    satoshis: splitTx.outputs[0].satoshis,
                },
            ]
        } else {
            return usedUtxos
        }
    }

    get utxoScriptHex(): string {
        // all managed utxos should have the same P2PKH script for `this.address`
        return bsv.Script.buildPublicKeyHashOut(this.address).toHex()
    }
}

export async function getUtxoManager(): Promise<UtxoManager> {
    if (global.utxoManager === undefined) {
        global.utxoManager = new UtxoManager()
    }
    await global.utxoManager.init()
    return global.utxoManager
}
