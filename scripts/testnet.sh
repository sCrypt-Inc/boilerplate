#!/bin/sh
set -e

day_mod=`expr $(date +%d) % 9`

echo "day_mod: $day_mod"

if [ $day_mod == 0 ]; then 
    echo "run on linux, nodejs=16";
    if [ "$TRAVIS_OS_NAME" == "linux" ] && [ "$TRAVIS_NODE_VERSION" == "16" ] ; then npm run testnet; fi
elif [ $day_mod == 1 ]; then
    echo "run on linux, nodejs=18";
    if [ "$TRAVIS_OS_NAME" == "linux" ] && [ "$TRAVIS_NODE_VERSION" == "18" ] ; then npm run testnet; fi
elif [ $day_mod == 2 ]; then
    echo "run on linux, nodejs=19";
    if [ "$TRAVIS_OS_NAME" == "linux" ] && [ "$TRAVIS_NODE_VERSION" == "19" ] ; then npm run testnet; fi
elif [ $day_mod == 3 ]; then
    echo "run on osx, nodejs=16";
    if [ "$TRAVIS_OS_NAME" == "osx" ] && [ "$TRAVIS_NODE_VERSION" == "16" ] ; then npm run testnet; fi
elif [ $day_mod == 4 ]; then
    echo "run on osx, nodejs=18";
    if [ "$TRAVIS_OS_NAME" == "osx" ] && [ "$TRAVIS_NODE_VERSION" == "18" ] ; then npm run testnet; fi
elif [ $day_mod == 5 ]; then
    echo "run on osx, nodejs=19";
    if [ "$TRAVIS_OS_NAME" == "osx" ] && [ "$TRAVIS_NODE_VERSION" == "19" ] ; then npm run testnet; fi
elif [ $day_mod == 6 ]; then
    echo "run on windows, nodejs=16";
    if [ "$TRAVIS_OS_NAME" == "windows" ] && [ "$TRAVIS_NODE_VERSION" == "16" ] ; then npm run testnet; fi
elif [ $day_mod == 7 ]; then
    echo "run on windows, nodejs=18";
    if [ "$TRAVIS_OS_NAME" == "windows" ] && [ "$TRAVIS_NODE_VERSION" == "18" ] ; then npm run testnet; fi
elif [ $day_mod == 8 ]; then
    echo "run on windows, nodejs=19";
    if [ "$TRAVIS_OS_NAME" == "windows" ] && [ "$TRAVIS_NODE_VERSION" == "19" ] ; then npm run testnet; fi
else 
    echo "day_mod: error"
    exit -1;
fi