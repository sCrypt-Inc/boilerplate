#!/usr/bin/env node

const deploymentFolder = './testnet/';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { exit } = require('process');
var sleep = require('sleep');

const exclude = ['superAsset10.js', 'bns.js', 'superAssetNFT.js']
fs.readdirSync(deploymentFolder).forEach( file => {

    if(exclude.indexOf(file) > -1) {
        console.log('ignore ' + file)
    }
    console.log(`run deployments ${file} ...`)
    const result = cp.spawnSync(`node ./testnet/${file}`, {
        shell: true
    });


    const output = result.stdout.toString();

    if(result.status != 0  || output.indexOf('Failed') > -1) {
        console.log(`run deployments ${file} failed, output:`)
        console.log(output);
        exit(-1);
    } else {
        console.log(`run deployments ${file} succeeded`)
        console.log(output);
    }

    sleep.sleep(10)

});
