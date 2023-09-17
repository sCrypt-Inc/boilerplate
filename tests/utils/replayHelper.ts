import { bsv, DefaultProvider, SmartContract } from 'scrypt-ts'
import axios from 'axios'

export interface Outpoint {
    txId: string
    outputIndex: number
}

export interface SpentIn {
    tx: bsv.Transaction
    atInputIndex: number
}

export interface SpentChainItem {
    spentIn: SpentIn
    nextOutputIndex?: number
}

const provider = new DefaultProvider({ network: bsv.Networks.testnet })

export async function getTransaction(txId: string): Promise<bsv.Transaction> {
    if (!provider.isConnected()) {
        await provider.connect()
    }
    return provider.getTransaction(txId)
}

export function scriptCodeHash(script: bsv.Script): string {
    const asm = script.toASM()
    const index = asm.lastIndexOf('OP_RETURN')
    const codePart =
        index === -1
            ? script
            : bsv.Script.fromASM(asm.substring(0, index).trim())
    return bsv.crypto.Hash.sha256(codePart.toBuffer()).toString('hex')
}

export async function getCodeHash(outpoint: Outpoint): Promise<string> {
    const tx = await getTransaction(outpoint.txId)
    return scriptCodeHash(tx.outputs[outpoint.outputIndex].script)
}

export async function getSpentIn(
    outpoint: Outpoint
): Promise<SpentIn | undefined> {
    const url = `https://test-api.bitails.io/tx/${outpoint.txId}/output/${outpoint.outputIndex}`
    const data = await axios.get(url).then((r) => r.data)
    return data.spent
        ? {
              tx: await getTransaction(data.spentIn.txid),
              atInputIndex: data.spentIn.inputIndex,
          }
        : undefined
}

export async function getSpentChainItem(
    outpoint: Outpoint,
    codeHash: string
): Promise<SpentChainItem | undefined> {
    const spentIn = await getSpentIn(outpoint)
    if (!spentIn) {
        return undefined
    }
    const { tx } = spentIn
    const nextsIndex = tx.outputs
        .filter((output) => scriptCodeHash(output.script) === codeHash)
        .map((_, i) => i)
    if (nextsIndex.length > 1) {
        throw Error('only support linear spent chain')
    }
    return {
        spentIn,
        nextOutputIndex: nextsIndex.length === 1 ? nextsIndex[0] : undefined,
    }
}

export async function traceSpent(
    outpoint: Outpoint
): Promise<SpentChainItem[]> {
    const codeHash = await getCodeHash(outpoint)
    const chain: SpentChainItem[] = []
    let item = await getSpentChainItem(outpoint, codeHash)
    while (item && item.nextOutputIndex !== undefined) {
        chain.push(item)
        item = await getSpentChainItem(
            {
                txId: item.spentIn.tx.id,
                outputIndex: item.nextOutputIndex,
            },
            codeHash
        )
    }
    return chain
}

export async function replay<T extends SmartContract>(
    instance: T | undefined,
    item: SpentChainItem
): Promise<T | undefined> {
    if (!instance || item.nextOutputIndex === undefined) {
        return undefined
    }
    const next = instance.next()
    const { tx, atInputIndex } = item.spentIn
    const clazz = next.constructor as unknown as typeof SmartContract
    const callData = clazz.parseCallData(tx, atInputIndex)
    const { methodName, args } = callData
    const fn =
        next[
            `applyOffchainUpdatesFor${methodName.replace(/^\S/, (s) =>
                s.toUpperCase()
            )}`
        ]
    fn?.call(next, ...args.map((arg) => arg.value))
    next.from = {
        tx,
        outputIndex: item.nextOutputIndex,
    }
    return next
}

export async function replayToLatest<T extends SmartContract>(
    instance: T,
    outpoint: Outpoint
): Promise<T | undefined> {
    const chain = await traceSpent(outpoint)
    let next: T | undefined = instance
    for (const item of chain) {
        next = await replay(next, item)
    }
    return next
}
