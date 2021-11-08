#!/usr/bin/env node

const deploymentFolder = './testnet/';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { exit } = require('process');
const { sleep } = require('./helper');


const exclude = ['superAsset10.js']
fs.readdirSync(deploymentFolder).forEach(async file => {

    if(exclude.indexOf(file) > -1) {
        console.log('ignore ' + file)
        return;
    }

    const result = cp.spawnSync(`node ./testnet/${file}`, {
        shell: true
    });

    await sleep(6)
    
    const output = result.stdout.toString();

    if(output.indexOf('Failed') > -1) {
        console.log(`run deployments ${file} failed, output:`)
        console.log(output);
        exit(-1);
    } else {
        console.log(`run deployments ${file} succeeded`)
    }

});