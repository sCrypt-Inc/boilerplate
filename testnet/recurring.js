const { resolve } = require('path');
const { bsv, buildContractClass, getPreimage, toHex, num2bin, bin2num, SigHashPreimage, Ripemd160 } = require('scryptlib');
const { DataLen, loadDesc, deployContract , sleep, sendTx, showError, fetchUtxos } = require('../helper');
const { privateKey } = require('../privateKey');

const publicKey = privateKey.publicKey;
const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
const p2pkh = new Ripemd160(toHex(publicKeyHash));
const merchantAddress = privateKey.toAddress().toString();

// VALUES FOR THE CONTRACT
const userPubKeyHash = p2pkh;
const merchantPayment = 10000;
const merchantPubKeyHash = p2pkh;
const frequenceOfPayment = 0;

const what_we_deposit = 8000;

class Parser {
    matureTimestamp;
    satoshis;

    constructor(tx) {
        this._tx = tx;
    }

    async parse() {
        const contractOutput = this._tx.outputs[0];
        const asm = contractOutput.script.toASM();
        const matureTimestampLE = asm.substring(asm.length - 8);
        this.satoshis = contractOutput.satoshis;
        this.matureTimestamp = Number(bin2num(matureTimestampLE));
    }
}

//Deploy contract
async function deploy(deploySatoshis) {
    const Contract = buildContractClass(loadDesc('recurring_debug_desc.json'));
    const contract = new Contract(userPubKeyHash, merchantPayment, merchantPubKeyHash, frequenceOfPayment);
    const initMatureTimestamp = parseInt(new Date().getTime() / 1000) - 7200;
    contract.setDataPart(num2bin(initMatureTimestamp, 4));
    return await deployContract(contract, deploySatoshis);
}

class RecurringDepositUser {
    constructor(tx, depositSatoshis, p2pkh) {
        this._tx = tx;
        this._depositSatoshis = depositSatoshis;
        this._p2pkh = p2pkh;
    }

    async deposit() {
        await this._parseContract();
        const tx = await this._composeTx();
        await sendTx(tx)
        return tx
    }

    async _parseContract() {
        const parser = new Parser(this._tx);
        await parser.parse();
        this._contractMatureTimestamp = parser.matureTimestamp;
        this._oldContractSatoshis = parser.satoshis;

        this._buildContract();
    }

    _buildContract() {
        const Contract = buildContractClass(loadDesc('recurring_debug_desc.json'));
        this._contract = new Contract(userPubKeyHash, merchantPayment, merchantPubKeyHash, frequenceOfPayment);
        this._contract.setDataPart(num2bin(this._contractMatureTimestamp, 4));
    }

    async _composeTx() {
        const newContractSatoshis = this._oldContractSatoshis + this._depositSatoshis;

        const unlockingTx = new bsv.Transaction();

        unlockingTx.addInputFromPrevTx(this._tx)
            .from(await fetchUtxos(privateKey.toAddress()))
            .addOutput(new bsv.Transaction.Output({
                script: this._contract.lockingScript,
                satoshis: newContractSatoshis,
            }))
            .change(privateKey.toAddress())
            .setInputScript(0, (tx, output) => {
                const preimage = getPreimage(tx, output.script, output.satoshis);
                return this._contract.deposit_user(
                    new SigHashPreimage(toHex(preimage)),
                    this._depositSatoshis,
                    tx.getChangeAmount()
                ).toScript();
            })
            .sign(privateKey)
            .seal()

        return unlockingTx;
    }

    _prvKeyToHexPKH() {
        const publicKey = privateKey.publicKey;
        return toHex(bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer()));
    }
}

class RecurringWithdrawMerchant {
    constructor(tx) {
        this._tx = tx;
    }

    async withdraw() {
        await this._parseContract();
        const tx = await this._composeTx();
        await sendTx(tx);
        return tx;
    }

    _buildContract() {
        const Contract = buildContractClass(loadDesc('recurring_debug_desc.json'));
        this._contract = new Contract(userPubKeyHash, merchantPayment, merchantPubKeyHash, frequenceOfPayment);
        this._contract.setDataPart(num2bin(this._lastMatureTimestamp, 4));
    }

    async _parseContract() {
        const parser = new Parser(this._tx);
        await parser.parse();
        this._lastMatureTimestamp = parser.matureTimestamp;
        this._oldContractSatoshis = parser.satoshis;
        this._buildContract();
    }

    _calcNewMatureTimestamp() {
        return this._lastMatureTimestamp + frequenceOfPayment;
    }

    async _composeTx() {
        const newLockingScript = bsv.Script.fromASM(this._contract.codePart.toASM()
            + ' ' + num2bin(this._calcNewMatureTimestamp(), 4));


        const unlockingTx = new bsv.Transaction();

        unlockingTx.addInputFromPrevTx(this._tx)
            .setOutput(0, (tx) => {
                const newAmount = this._oldContractSatoshis - merchantPayment - tx.getEstimateFee();
                return new bsv.Transaction.Output({
                    script: newLockingScript,
                    satoshis: newAmount
                })
            })
            .setOutput(1, (tx) => {
                return new bsv.Transaction.Output({
                    script: bsv.Script.buildPublicKeyHashOut(merchantAddress),
                    satoshis: merchantPayment
                })
            })
            .setInputScript(0, (tx, output) => {
                const preimage = getPreimage(tx, output.script, output.satoshis);
                const newAmount = this._oldContractSatoshis - merchantPayment - tx.getEstimateFee();
                return this._contract.withdraw_merchant(new SigHashPreimage(toHex(preimage)), newAmount).toScript()
            })
            .setInputSequence(0, 0xFFFFFFFE)
            .setLockTime(this._calcNewMatureTimestamp())
            .seal()

        return unlockingTx;
    }
}


(async () => {
    try {
        //Deploy at first with 10000 sats
        const deployTx = await deploy(what_we_deposit);
        console.log(`deploy ${deployTx.id}`);
        await sleep(5);

        //Deposit 10000 more
        const deposit = new RecurringDepositUser(deployTx, what_we_deposit, p2pkh);
        const depositTx = await deposit.deposit();
        console.log(`deposit ${depositTx.id}`);
        await sleep(5);

        //Merchant withdraw some money
        const withdraw = new RecurringWithdrawMerchant(depositTx);
        const withdrawTx = await withdraw.withdraw();
        console.log(`withdraw ${withdrawTx.id}`);

        //User can also decide to leave and withdraw its money
        //Todo
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()
