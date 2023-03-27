import { expect } from 'chai'
import { TuringMachine, StateStruct } from '../../src/contracts/turingMachine'
import { getDummySigner, getDummyUTXO } from '../utils/helper'
import {
    bsv,
    FixedArray,
    MethodCallOptions,
    PubKey,
    findSig,
    Sig,
    ByteString,
} from 'scrypt-ts'

const allStates: StateStruct[] = [
    {
        headPos: 0n,
        tape: '01010202',
        curState: '00',
    },

    {
        headPos: 1n,
        tape: '01010202',
        curState: '00',
    },

    {
        headPos: 2n,
        tape: '01010202',
        curState: '00',
    },

    {
        headPos: 1n,
        tape: '01010302',
        curState: '01',
    },

    {
        headPos: 2n,
        tape: '01030302',
        curState: '00',
    },

    {
        headPos: 3n,
        tape: '01030302',
        curState: '00',
    },

    {
        headPos: 2n,
        tape: '01030303',
        curState: '01',
    },

    {
        headPos: 1n,
        tape: '01030303',
        curState: '01',
    },

    {
        headPos: 0n,
        tape: '01030303',
        curState: '01',
    },

    {
        headPos: 1n,
        tape: '03030303',
        curState: '00',
    },

    {
        headPos: 2n,
        tape: '03030303',
        curState: '00',
    },

    {
        headPos: 3n,
        tape: '03030303',
        curState: '00',
    },

    {
        headPos: 4n,
        tape: '0303030300',
        curState: '00',
    },

    {
        headPos: 3n,
        tape: '0303030300',
        curState: '02',
    },

    {
        headPos: 2n,
        tape: '0303030300',
        curState: '02',
    },

    {
        headPos: 1n,
        tape: '0303030300',
        curState: '02',
    },

    {
        headPos: 0n,
        tape: '0303030300',
        curState: '02',
    },

    {
        headPos: 0n,
        tape: '000303030300',
        curState: '02',
    },

    {
        headPos: 1n,
        tape: '000303030300',
        curState: '03',
    },
]

describe('Test SmartContract `TuringMachine`', () => {
    const balance = 10000
    let turingMachine: TuringMachine

    before(async () => {
        await TuringMachine.compile()
        turingMachine = new TuringMachine(allStates[0])
        await turingMachine.connect(getDummySigner())
    })

    it('should pass whole run', async () => {
        for (let step = 1; step < 19; step++) {
            const newState = allStates[step]

            const currInstance = turingMachine
            const nextInstance = currInstance.next()
            nextInstance.states = newState

            const { tx: callTx, atInputIndex } =
                await turingMachine.methods.transit(
                    // Method call options:
                    {
                        fromUTXO: getDummyUTXO(),
                        next: {
                            instance: nextInstance,
                            balance,
                        },
                    } as MethodCallOptions<TuringMachine>
                )

            const result = callTx.verifyScript(atInputIndex)
            expect(result.success, result.error).to.eq(true)

            turingMachine = nextInstance
        }
    })
})
