const { resolve } = require('path');
const { bsv, buildContractClass, getPreimage, toHex, num2bin, bin2num, SigHashPreimage, Ripemd160 } = require('scryptlib');
const { isConstructorDeclaration } = require('typescript');
const { DataLen, loadDesc, createUnlockingTx, createLockingTx, sendTx, showError, unlockP2PKHInput} = require('../helper');
const { privateKey } = require('../privateKey');
const axios = require('axios');

const publicKey = privateKey.publicKey;
const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
const p2pkh = new Ripemd160(toHex(publicKeyHash));
const merchantAddress = privateKey.toAddress().toString();

// VALUES FOR THE CONTRACT
const userPubKeyHash = p2pkh;
const merchantPayment = 10000;
const merchantPubKeyHash = p2pkh;
const frequenceOfPayment = 0;

const what_we_deposit = 10000;
const fee = 5000;

// Wait for tx propagatin
async function wait(seconds){
    return new Promise(resolve=>{
        setTimeout(() => {
            return resolve();
        }, seconds * 1000);
    });
}

class Parser{
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

//Deploy contract
async function deploy(deploySatoshis){
    const Contract = buildContractClass(loadDesc('recurring_desc.json'));
    const contract = new Contract(userPubKeyHash, merchantPayment, merchantPubKeyHash, frequenceOfPayment);
    const initMatureTimestamp = parseInt(new Date().getTime() / 1000) - 7200;
    contract.setDataPart(num2bin(initMatureTimestamp, 4));
    const lockingTx = await createLockingTx(privateKey.toAddress(), deploySatoshis, fee);
    lockingTx.outputs[0].setScript(contract.lockingScript);
    lockingTx.sign(privateKey);
    const lockingTxid = await sendTx(lockingTx);
    return lockingTxid;
}

class RecurringDepositUser{
    constructor(contractUtxoTxid, depositSatoshis, p2pkh){
        this._txid = contractUtxoTxid;
        this._depositSatoshis = depositSatoshis;
        this._p2pkh = p2pkh;
    }

    async deposit(){
        await this._parseContract();
        const tx = await this._composeTx();
        this._unlockContractInput(tx);
        this._unlockInputsExceptContract(tx);
        return await sendTx(tx)
    }

    async _parseContract(){
        const parser = new Parser(this._txid);
        await parser.parse();
        this._contractMatureTimestamp = parser.matureTimestamp;
        this._oldContractSatoshis = parser.satoshis;

        this._buildContract();
    }

    _buildContract(){
        const Contract = buildContractClass(loadDesc('recurring_desc.json'));
        this._contract = new Contract(userPubKeyHash, merchantPayment, merchantPubKeyHash, frequenceOfPayment);
        this._contract.setDataPart(num2bin(this._contractMatureTimestamp, 4));
    }

    async _composeTx(){
        const newContractSatoshis = this._oldContractSatoshis + this._depositSatoshis;
        const tx =  await createLockingTx(privateKey.toAddress(), newContractSatoshis, fee);
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
        const unlockingScript = this._contract.deposit_user(
            new SigHashPreimage(toHex(preimage)),
            this._depositSatoshis,
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

class RecurringWithdrawMerchant{
    constructor(contractUtxoTxid){
        this._txid = contractUtxoTxid;
    }

    async withdraw(){
        await this._parseContract();
        const tx = await this._composeTx();
        this._unlockContractInput(tx);
        return await sendTx(tx);
    }

    _buildContract(){
        const Contract = buildContractClass(loadDesc('recurring_desc.json'));
        this._contract = new Contract(userPubKeyHash, merchantPayment, merchantPubKeyHash, frequenceOfPayment);
        this._contract.setDataPart(num2bin(this._lastMatureTimestamp, 4));
    }

    async _parseContract(){
        const parser = new Parser(this._txid);
        await parser.parse();
        this._lastMatureTimestamp = parser.matureTimestamp;
        this._oldContractSatoshis = parser.satoshis;
        this._buildContract();
    }

    _calcNewMatureTimestamp(){
        return this._lastMatureTimestamp + frequenceOfPayment;
    }

    async _composeTx(){
        const newLockingScript = this._contract.codePart.toASM() + ' ' + num2bin(this._calcNewMatureTimestamp(), 4);
        const newContractSatoshis = this._oldContractSatoshis - fee - merchantPayment;
        const tx = await createUnlockingTx(this._txid, this._oldContractSatoshis, this._contract.lockingScript.toASM(), newContractSatoshis, newLockingScript);
        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.buildPublicKeyHashOut(merchantAddress),
            satoshis: merchantPayment
        }));
        tx.inputs[0].sequenceNumber = 0xFFFFFFFE;
        tx.nLockTime = this._calcNewMatureTimestamp();
        tx.fee(fee);
        return tx;
    }

    async _unlockContractInput(tx){
        const preimage = getPreimage(tx, this._contract.lockingScript.toASM(), this._oldContractSatoshis);
        const unlockingScript = this._contract.withdraw_merchant(new SigHashPreimage(toHex(preimage))).toScript();
        tx.inputs[0].setScript(unlockingScript);
    }
}


(async() => {
    try {
        //Deploy at first with 10000 sats
        const deployTxid = await deploy(what_we_deposit);
        console.log(`deploy ${deployTxid}`);
        await wait(5);

        //Deposit 10000 more
        const deposit = new RecurringDepositUser(deployTxid, what_we_deposit, p2pkh);
        const depositTxid = await deposit.deposit();
        console.log(`deposit ${depositTxid}`);
        await wait(5);

        //Merchant withdraw some money
        const withdraw = new RecurringWithdrawMerchant(depositTxid);
        const withdrawTxid = await withdraw.withdraw();
        console.log(`withdraw ${withdrawTxid}`);

        //User can also decide to leave and withdraw its money
        //Todo
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()
