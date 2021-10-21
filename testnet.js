#!/usr/bin/env node

const deploymentFolder = './deployments/';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { exit } = require('process');

fs.readdirSync(deploymentFolder).forEach(file => {

    const result = cp.spawnSync(`node ./deployments/${file}`, {
        shell: true
    });

    const output = result.stdout.toString();

    if(output.indexOf('Failed') > -1) {
        console.log(`run deployments ${file} Failed, output:`)
        console.log(output);
        exit(-1);
    } else {
        console.log(`run deployments ${file} Succeeded`)
    }

});