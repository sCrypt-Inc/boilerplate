#!/bin/sh
set -e

day_mod=$(expr $(date +%d) % 9) || day_mod=0

echo "day_mod: $day_mod"

if [ "$day_mod" -eq 0 ]; then 
    if [ "$TRAVIS_OS_NAME" = "linux" ] && [ "$TRAVIS_NODE_VERSION" = "16" ]; then 
        echo "run on linux, nodejs=16"
        npm run test:testnet
    fi
elif [ "$day_mod" -eq 1 ]; then
    if [ "$TRAVIS_OS_NAME" = "linux" ] && [ "$TRAVIS_NODE_VERSION" = "18" ]; then
        echo "run on linux, nodejs=18"
        npm run test:testnet
    fi
elif [ "$day_mod" -eq 2 ]; then
    if [ "$TRAVIS_OS_NAME" = "linux" ] && [ "$TRAVIS_NODE_VERSION" = "19" ]; then
        echo "run on linux, nodejs=19"
        npm run test:testnet
    fi
elif [ "$day_mod" -eq 3 ]; then
    if [ "$TRAVIS_OS_NAME" = "osx" ] && [ "$TRAVIS_NODE_VERSION" = "16" ]; then
        echo "run on osx, nodejs=16"
        npm run test:testnet
    fi
elif [ "$day_mod" -eq 4 ]; then
    if [ "$TRAVIS_OS_NAME" = "osx" ] && [ "$TRAVIS_NODE_VERSION" = "18" ]; then
        echo "run on osx, nodejs=18"
        npm run test:testnet
    fi
elif [ "$day_mod" -eq 5 ]; then
    if [ "$TRAVIS_OS_NAME" = "osx" ] && [ "$TRAVIS_NODE_VERSION" = "19" ]; then
        echo "run on osx, nodejs=19"
        npm run test:testnet
    fi
elif [ "$day_mod" -eq 6 ]; then
    if [ "$TRAVIS_OS_NAME" = "windows" ] && [ "$TRAVIS_NODE_VERSION" = "16" ]; then
        echo "run on windows, nodejs=16"
        npm run test:testnet
    fi
elif [ "$day_mod" -eq 7 ]; then
    if [ "$TRAVIS_OS_NAME" = "windows" ] && [ "$TRAVIS_NODE_VERSION" = "18" ]; then
        echo "run on windows, nodejs=18"
        npm run test:testnet
    fi
elif [ "$day_mod" -eq 8 ]; then
    if [ "$TRAVIS_OS_NAME" = "windows" ] && [ "$TRAVIS_NODE_VERSION" = "19" ]; then
        echo "run on windows, nodejs=19"
        npm run test:testnet
    fi
else 
    echo "day_mod: error"
    exit 1
fi