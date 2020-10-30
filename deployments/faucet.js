const { resolve } = require('path');
const { bsv, buildContractClass, getPreimage, toHex, num2bin, bin2num, SigHashPreimage, Ripemd160 } = require('scryptlib');
const { isConstructorDeclaration } = require('typescript');
const { DataLen, loadDesc, createUnlockingTx, createLockingTx, sendTx, showError, unlockP2PKHInput} = require('../helper');
const { privateKey } = require('../privateKey');
const axios = require('axios')

async function wait(seconds){
    return new Promise(resolve=>{
        setTimeout(() => {
            return resolve();
        }, seconds * 1000);
    });
}

class FaucetTxParser{
    matureTimestamp;
    satoshis;

    constructor(txid){
        this._txid = txid;
    }

    async parse(){
        const {data:outputHex} = await axios.get(`https://api.whatsonchain.com/v1/bsv/test/tx/${this._txid}/hex`);
        const tx = new bsv.Transaction();
        tx.fromString(outputHex);
        const contractOutput = tx.outputs[0];
        const asm = contractOutput.script.toASM();
        const matureTimestampLE = asm.substring(asm.length-8);
        this.satoshis = contractOutput.satoshis;
        this.matureTimestamp = Number(bin2num(matureTimestampLE));
    }
}

class FaucetDeploy{
    constructor(initSatoshis, deployFee){
        this._deploySatoshis = initSatoshis;
        this._deployFee = deployFee;
    }

    async deploy(){
        const Contract = buildContractClass(loadDesc('faucet_desc.json'));
        const contract = new Contract();
        const initMatureTimestamp = parseInt(new Date().getTime() / 1000) - 7200;
        contract.setDataPart(num2bin(initMatureTimestamp, 4));
        const lockingTx =  await createLockingTx(privateKey.toAddress(), this._deploySatoshis, this._deployFee);
        lockingTx.outputs[0].setScript(contract.lockingScript);
        lockingTx.sign(privateKey);
        const lockingTxid = await sendTx(lockingTx);
        return lockingTxid;
    }
}

class FaucetDeposit{
    constructor(contractUtxoTxid, depositSatoshis, fee){
        this._fee = fee;
        this._txid = contractUtxoTxid;
        this._depositSatoshis = depositSatoshis;
    }

    async deposit(){
        await this._parseContract();
        const tx = await this._composeTx();
        this._unlockContractInput(tx);
        this._unlockInputsExceptContract(tx);
        return await sendTx(tx)
    }

    async _parseContract(){
        const parser = new FaucetTxParser(this._txid);
        await parser.parse();
        this._contractMatureTimestamp = parser.matureTimestamp;
        this._oldContractSatoshis = parser.satoshis;

        this._buildContract();
    }

    _buildContract(){
        const Contract = buildContractClass(loadDesc('faucet_desc.json'));
        this._contract = new Contract();
        this._contract.setDataPart(num2bin(this._contractMatureTimestamp, 4));
    }

    async _composeTx(){
        const newContractSatoshis = this._oldContractSatoshis + this._depositSatoshis;
        const tx =  await createLockingTx(privateKey.toAddress(), newContractSatoshis, this._fee);
        tx.outputs[0].setScript(this._contract.lockingScript);
        tx.addInput(new bsv.Transaction.Input({
            prevTxId: this._txid,
            outputIndex: 0,
            script: new bsv.Script(), // placeholder
        }), this._contract.lockingScript, this._oldContractSatoshis);
        return tx;
    }

    _unlockContractInput(tx){
        const preimage = getPreimage(tx, this._contract.lockingScript.toASM(), this._oldContractSatoshis, tx.inputs.length - 1);
        const pkh = this._prvKeyToHexPKH();
        const unlockingScript = this._contract.deposit(
            new SigHashPreimage(toHex(preimage)),
            this._depositSatoshis,
            new Ripemd160(pkh),
            tx.outputs[1].satoshis
        ).toScript();
        tx.inputs[tx.inputs.length - 1].setScript(unlockingScript);
    }

    _unlockInputsExceptContract(tx){
        const Signature = bsv.crypto.Signature
        const sighashType = Signature.SIGHASH_ALL | Signature.SIGHASH_FORKID
        for(let i = 0; i < tx.inputs.length - 1; i++){
            unlockP2PKHInput(privateKey, tx, i, sighashType);
        }
    }

    _prvKeyToHexPKH(){
        const publicKey = privateKey.publicKey;
        return toHex(bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer()));
    }
}

class FaucetWithdraw{
    constructor(contractUtxoTxid, receiverAddress){
        this._txid = contractUtxoTxid;
        this._receiverAddress = bsv.Address.fromString(receiverAddress);
        this._withdrawSatothis = 2000000;
        this._fee = 3000;
    }

    async withdraw(){
        await this._parseContract();
        const tx = await this._composeTx();
        this._unlockContractInput(tx);
        return await sendTx(tx);
    }

    _buildContract(){
        const Contract = buildContractClass(loadDesc('faucet_desc.json'));
        this._contract = new Contract();
        this._contract.setDataPart(num2bin(this._lastMatureTimestamp, 4));
    }

    async _parseContract(){
        const parser = new FaucetTxParser(this._txid);
        await parser.parse();
        this._lastMatureTimestamp = parser.matureTimestamp;
        this._oldContractSatoshis = parser.satoshis;
        this._buildContract();
    }

    _calcNewMatureTimestamp(){
        return this._lastMatureTimestamp + 300;
    }

    async _composeTx(){
        const newLockingScript = this._contract.codePart.toASM() + ' ' + num2bin(this._calcNewMatureTimestamp(), 4);
        const newContractSatoshis = this._oldContractSatoshis - this._fee - this._withdrawSatothis;
        const tx = await createUnlockingTx(this._txid, this._oldContractSatoshis, this._contract.lockingScript.toASM(), newContractSatoshis, newLockingScript);
        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(this._receiverAddress),
            satoshis: this._withdrawSatothis
        }));
        tx.inputs[0].sequenceNumber = 0xFFFFFFFE;
        tx.nLockTime = this._calcNewMatureTimestamp();
        tx.fee(this._fee);
        return tx;
    }

    async _unlockContractInput(tx){
        const preimage = getPreimage(tx, this._contract.lockingScript.toASM(), this._oldContractSatoshis);
        const unlockingScript = this._contract.withdraw(new SigHashPreimage(toHex(preimage)), new Ripemd160(this._receiverAddress.toHex().substring(2))).toScript();
        tx.inputs[0].setScript(unlockingScript);
    }
}


(async() => {
    try {
        const deploy = new FaucetDeploy(546, 6000);
        const deployTxid = await deploy.deploy();
        console.log(`deploy ${deployTxid}`);
        await wait(3);

        const deposit = new FaucetDeposit(deployTxid, 2003000, 3000);
        const depositTxid = await deposit.deposit();
        console.log(`deposit ${depositTxid}`);
        await wait(3);

        const withdraw = new FaucetWithdraw(depositTxid, privateKey.toAddress().toString());
        const withdrawTxid = await withdraw.withdraw();
        console.log(`withdraw ${withdrawTxid}`);
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()