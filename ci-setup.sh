#!/usr/bin/env bash
set -e

if [[ $TRAVIS_OS_NAME == 'osx' ]]; then
    echo "osx"
    sed -i '' 's/process.env.PRIVATE_KEY/scrypt_ts_1.bsv.PrivateKey.fromRandom("testnet").toWIF()/' dist/tests/privateKey.js
fi

if [[ $TRAVIS_OS_NAME == 'linux' ]]; then
    echo "linux"
    sed -i 's/process.env.PRIVATE_KEY/scrypt_ts_1.bsv.PrivateKey.fromRandom("testnet").toWIF()/' dist/tests/privateKey.js
fi


