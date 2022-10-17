#!/bin/sh
set -e

RED='\033[0;31m'

if which snarkjs >/dev/null; then
    echo "snarkjs installed!"
else
    echo "${RED}snarkjs not installed!"
    echo "you can install snarkjs by following:"
    echo "npm install -g snarkjs-scrypt"
    exit 1
fi



cd circuits

CIRCUITS="simple"

for circuit in $CIRCUITS; do
  echo "compiling circuit: circuits/${circuit}.circom"
  circom ${circuit}.circom --r1cs --wasm
  snarkjs powersoftau new bn128 12 pot12_0000.ptau
  snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -e="$(openssl rand -base64 20)"
  snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau
  snarkjs powersoftau verify pot12_final.ptau
  node ./${circuit}_js/generate_witness.js ./${circuit}_js/${circuit}.wasm ${circuit}.input.json witness.wtns
  
  snarkjs plonk setup ${circuit}.r1cs pot12_final.ptau ${circuit}_final.zkey


  #snarkjs zkey contribute ${circuit}_0000.zkey ${circuit}_0001.zkey --name="Second contribution" -e="$(openssl rand -base64 20)"
  #snarkjs zkey contribute ${circuit}_0001.zkey circuit_final.zkey --name="Third contribution" -e="$(openssl rand -base64 20)"
  
  snarkjs zkey export verificationkey ${circuit}_final.zkey verification_key.json


  echo "proving circuit: circuits/${circuit}.circom"

  snarkjs plonk prove ${circuit}_final.zkey witness.wtns proof.json public.json


  echo "verifying circuit: circuits/${circuit}.circom"

  snarkjs plonk verify verification_key.json public.json proof.json

  snarkjs zkey export scryptverifier ${circuit}_final.zkey verifier.scrypt
done