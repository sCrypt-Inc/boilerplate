#!/usr/bin/env node

const deploymentFolder = './testnet/';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { exit } = require('process');
const { join } = require('path');
const axios = require('axios')

const content =
    `
const { bsv } = require('scryptlib');

const privateKey = new bsv.PrivateKey.fromWIF('cPbphqe7KrN2rk5rbKMqmeHC3GL3DiFuwtdq62qQdCVjkoT538Lg')
module.exports = {
  privateKey,
  privateKey2 : privateKey,
  privateKey3 : privateKey
}
`

try {
    fs.writeFileSync(join(__dirname, 'privateKey.js'), content);
    // file written successfully
} catch (err) {
    console.error(err);
}


async function getBsvfromFaucet(address) {

    try {
        let {
            data: data
        } = await axios.post('https://witnessonchain.com/v1/faucet/tbsv', {
            address: address
        }, {
            timeout: 5000
        });

        if (typeof data.code === 'number' && data.code === 0) {
            return 'success';
        } else if (typeof data.code === 'number' && data.code === 20) {
            return 'incooldown';
        }

    } catch (error) {
        console.error('post witnessonchain error', error)
    }

    return 'fail';

}


const { privateKey } = require('./privateKey');
const exclude = ['superAsset10.js', 'superAssetNFT.js', 'tokenSwap.js', 'bns.js', 'rps.js', 'tokenUtxo.js']

const execute = async (tasks = []) => {

    const res = []
    await new Promise((resolve, reject) => {
        tasks.reduce((pre, cur) => {
            return pre.then(cur).then(data => res.push(data))
        }, Promise.resolve()).then(() => resolve(res))
    })

    return res
}


getBsvfromFaucet(privateKey.toAddress().toString()).then(async result => {

    if (result === 'success' || result === 'incooldown') {

        const { sleep } = require('./helper');

        const tasks = fs.readdirSync(deploymentFolder).filter(file => {
            return exclude.indexOf(file) == -1
        }).map(file => {
            return () => {
                return new Promise(async (resolve, reject) => {

                    try {
                        await sleep(5)
                        console.log('spawnSync', file)
                        const result = cp.spawnSync(`node ./testnet/${file}`, {
                            shell: true
                        });

                        const output = result.stdout.toString();
                        console.log(output);
                        if (output.indexOf('Failed') > -1) {
                            resolve(`run deployments ${file} failed`)
                        } else {
                            resolve(`run deployments ${file} succeeded`)
                        }
                    } catch (error) {
                        resolve(`run deployments ${file} failed: ${error}`)
                    }
                })
            }
        });

        execute(tasks)
    } else {
        console.log('getBsvfromFaucet failed', result);
        exit(-1);
    }
})
