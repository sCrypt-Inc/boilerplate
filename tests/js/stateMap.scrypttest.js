const { expect } = require('chai');
const { compileContract, newTx } = require('../../helper');

const { buildContractClass, toData, Bytes, bsv, findKeyIndex, getPreimage, buildTypeClasses } = require('scryptlib');
const { toHashedMap } = require('scryptlib/dist/utils');

const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

describe('test.stateMap', () => {
    describe('stateMap', () => {
        let mapTest, StateMap, MapEntry;

        let map = new Map();

        before(() => {
            StateMap = buildContractClass(compileContract('stateMap.scrypt'))
            MapEntry = buildTypeClasses(StateMap).MapEntry
            mapTest = new StateMap(toHashedMap(map)) // empty initial map
        })

        function preHook(map) {
            let newLockingScript = mapTest.getNewStateScript({
                map: toHashedMap(map),
            });

            const tx = newTx(inputSatoshis);
            tx.addOutput(new bsv.Transaction.Output({
                script: newLockingScript,
                satoshis: outputAmount
            }))

            const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)

            mapTest.txContext = {
                tx: tx,
                inputIndex,
                inputSatoshis
            }

            return preimage;
        }


        it('test insert', () => {


            function testInsert(key, val) {

                map.set(key, val);

                const preimage = preHook(map);
                const result = mapTest.insert(new MapEntry({
                    key: key,
                    val: val,
                    keyIndex: findKeyIndex(map, key)
                }), preimage).verify()                
                expect(result.success, result.error).to.be.true;

                mapTest.map = toHashedMap(map)
            }

            testInsert(3, 1);

            testInsert(5, 6);

            testInsert(0, 11);

            testInsert(1, 5);

        })


        it('test update', () => {


            function testUpdate(key, val) {

                map.set(key, val);

                const preimage = preHook(map);

                const result = mapTest.update(new MapEntry({
                    key: key,
                    val: val,
                    keyIndex: findKeyIndex(map, key)
                }), preimage).verify()
                expect(result.success, result.error).to.be.true;

                mapTest.map = toHashedMap(map)
            }


            testUpdate(1, 6)

            testUpdate(1, 8)
            testUpdate(0, 1)

        })


        it('test delete', () => {


            function testDelete(key) {

                const keyIndex = findKeyIndex(map, key);
                map.delete(key);

                const preimage = preHook(map);

                const result = mapTest.delete(key, keyIndex, preimage).verify()
                expect(result.success, result.error).to.be.true;

                mapTest.map = toHashedMap(map)
            }


            testDelete(1)

            testDelete(5)

            testDelete(3)

            testDelete(0)

        })

    })
})
