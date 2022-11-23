
import { bsv, getPreimage, SigHashPreimage, SigHashType } from 'scryptlib';
import { randomBytes } from 'crypto';
import { SmartContract } from 'scrypt-ts'
import { privateKey } from './privateKey'
import axios from 'axios';

const API_PREFIX = 'https://api.whatsonchain.com/v1/bsv/test'

export const inputSatoshis = 10000;

export const inputIndex = 0;

export const dummyUTXO = {
  txId: randomBytes(32).toString('hex'),
  outputIndex: 0,
  script: '',   // placeholder
  satoshis: 100000
};

export type UTXO = {
  txId: string,
  outputIndex: number,
  satoshis: number,
  script: string
}

export async function fetchUtxos(address: string = privateKey.toAddress().toString()): Promise<UTXO[]> {
  // step 1: fetch utxos

  const url = `${API_PREFIX}/address/${address}/unspent`;

  let {
    data: utxos
  } = await axios.get(url)
  return utxos.map((utxo: any) => ({
    txId: utxo.tx_hash,
    outputIndex: utxo.tx_pos,
    satoshis: utxo.value,
    script: bsv.Script.buildPublicKeyHashOut(address).toHex(),
  }))
}

export function newTx(utxos?: Array<UTXO>) {
  if (utxos) {
    return new bsv.Transaction().from(utxos);
  }
  return new bsv.Transaction().from(dummyUTXO);
}

export async function sendTx(tx: bsv.Transaction): Promise<string> {
  try {
    const {
      data: txid
    } = await axios.post(`${API_PREFIX}/tx/raw`, {
      txhex: tx.toString()
    });
    return txid
  } catch (error) {
    if(axios.isAxiosError(error)) {
      if (error.response && error.response.data === '66: insufficient priority') {
        throw new Error(`Rejected by miner. Transaction with fee is too low`)
      }
    }

    throw error
  }
}

//create an input spending from prevTx's output, with empty script
export function createInputFromPrevTx(tx: bsv.Transaction, outputIndex: number = 0): bsv.Transaction.Input {
  const outputIdx = outputIndex || 0
  return new bsv.Transaction.Input({
    prevTxId: tx.id,
    outputIndex: outputIdx,
    script: new bsv.Script(''), // placeholder
    output: tx.outputs[outputIdx]
  })
}

export const sleep = async (seconds: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({});
    }, seconds * 1000);
  })
}

export async function signAndSend(tx: bsv.Transaction, privKey: bsv.PrivateKey = privateKey): Promise<bsv.Transaction> {
  tx.change(privKey.toAddress())
    .sign(privKey)
    .seal();

    try {
      await sendTx(tx);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log('\x1B[31sendTx error: ', error.response?.data)
      }
      throw error
    }

  return tx;
}

export async function buildDeployTx(contract: SmartContract, initBalance: number, fromDummyUTXO = true) {
  let utxos = fromDummyUTXO ? [dummyUTXO] : await fetchUtxos();

  const tx = newTx(utxos)
    .addOutput(new bsv.Transaction.Output({
      script: contract.lockingScript,
      satoshis: initBalance,
    }));

  contract.markAsGenesis();
  contract.lockingTo = {
    tx,
    outputIndex: 0
  };

  return tx;
}

// build a typical one-input-one-output tx for contract calling
export function buildCallTxAndNextInstance(
  prevTx: bsv.Transaction,
  prevInstance: SmartContract,
  // call public method for the previous instance to get the unlocking script.
  contractMethodInvoking: (prevInstance: SmartContract, preimage: SigHashPreimage, newBalance: number) => void,
  // apply states updateing logic for the next instance to get the new locking script.
  updateStates?: (nextInstance: SmartContract) => void
) {
  const inputIndex = 0;
  const outputIndex = 0;
  const prevContractBalance = prevTx.outputs[0].satoshis;

  // get a copy of previous instance as a start
  let newInstance = prevInstance.clone();

  // update contract instance logic
  if (updateStates !== undefined) {
    updateStates(newInstance);
  }

  // build tx that includes the contract's method call
  let callTx: bsv.Transaction = new bsv.Transaction()
    .addInput(createInputFromPrevTx(prevTx))
    .setOutput(outputIndex, (tx: bsv.Transaction) => {
      // bind contract & tx locking relation
      newInstance.lockingTo = { tx, outputIndex };
      const newAmount = prevContractBalance - tx.getEstimateFee();
      return new bsv.Transaction.Output({
        // use newInstance's lockingscript as the new UTXO's lockingscript
        script: newInstance.lockingScript,
        satoshis: newAmount,
      })
    })
    .setInputScript(inputIndex, (tx: bsv.Transaction, prevOutput: bsv.Transaction.Output) => {
      // bind contract & tx unlocking relation
      prevInstance.unlockingFrom = { tx, inputIndex };
      // use the cloned version bcoz this callback may be executed multiple times during tx building process,
      // and calling contract method may have side effects on its properties.  
      const prevInstance_ = prevInstance.clone();
      const preimage = getPreimage(tx, prevOutput.script, prevOutput.satoshis)
      const newBalance = prevContractBalance - tx.getEstimateFee();
      return prevInstance_.getUnlockingScript(() => {
        // call previous counter's public method to get the unlocking script.
        contractMethodInvoking(prevInstance_, preimage, newBalance);
      })
    });

  return {
    tx: callTx,
    nextInstance: newInstance
  }
}
