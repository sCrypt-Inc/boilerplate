const { expect } = require('chai');
const { compileContract, newTx } = require('../../helper');

const { buildContractClass, bsv, getPreimage } = require('scryptlib');
const { SortedItem, getSortedItem } = require('scryptlib/dist/scryptTypes');

const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

describe('test.stateMap', () => {
    describe('stateMap', () => {
        let mapTest, StateMap;

        let map = new Map();

        before(() => {
            StateMap = buildContractClass(compileContract('stateMap.scrypt'))
            mapTest = new StateMap(map) // empty initial map
        })

        function preHook(map) {
            let newLockingScript = mapTest.getNewStateScript({
                map: map,
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
                const result = mapTest.insert({
                    key: getSortedItem(map, key),
                    val: val
                }, preimage).verify()                
                expect(result.success, result.error).to.be.true;

                mapTest.map = map
            }

            testInsert(3n, 1n);

            testInsert(5n, 6n);

            testInsert(0n, 11n);

            testInsert(1n, 5n);

        })


        it('test update', () => {


            function testUpdate(key, val) {

                map.set(key, val);

                const preimage = preHook(map);

                const result = mapTest.update({
                    key: getSortedItem(map, key),
                    val: val
                }, preimage).verify()
                expect(result.success, result.error).to.be.true;

                mapTest.map = map
            }


            testUpdate(1n, 6n)

            testUpdate(1n, 8n)
            testUpdate(0n, 1n)

        })


        it('test delete', () => {


            function testDelete(key) {

                const sortedItem = getSortedItem(map, key);
                map.delete(key);

                const preimage = preHook(map);

                const result = mapTest.delete(sortedItem, preimage).verify()
                expect(result.success, result.error).to.be.true;

                mapTest.map = map
            }


            testDelete(1n)

            testDelete(5n)

            testDelete(3n)

            testDelete(0n)

        })

    })
})
