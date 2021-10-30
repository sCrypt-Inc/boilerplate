#!/usr/bin/env node

const deploymentFolder = './testnet/';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { exit } = require('process');

fs.readdirSync(deploymentFolder).forEach(file => {

    const result = cp.spawnSync(`node ./testnet/${file}`, {
        shell: true
    });

    const output = result.stdout.toString();

    if(output.indexOf('Failed') > -1) {
        console.log(`run deployments ${file} failed, output:`)
        console.log(output);
        exit(-1);
    } else {
        console.log(`run deployments ${file} succeeded`)
    }

});