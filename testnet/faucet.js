const { bsv, buildContractClass, getPreimage, toHex, num2bin, bin2num, SigHashPreimage, Ripemd160 } = require('scryptlib');
const { compileContract,  sendTx, showError, sleep, deployContract, createInputFromPrevTx, fetchUtxos } = require('../helper');
const { privateKey } = require('../privateKey');

const result = compileContract('faucet.scrypt');
class FaucetTxParser {
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

class FaucetDeploy {
    constructor(initSatoshis) {
        this._deploySatoshis = initSatoshis;
    }

    async deploy() {
        const Contract = buildContractClass(result);
        const contract = new Contract();
        const initMatureTimestamp = parseInt(new Date().getTime() / 1000) - 7200;
        contract.setDataPart(num2bin(initMatureTimestamp, 4));
        return await deployContract(contract, this._deploySatoshis);
    }
}

class FaucetDeposit {
    constructor(deployTx, depositSatoshis) {
        this._tx = deployTx;
        this._depositSatoshis = depositSatoshis;
    }

    async deposit() {
        await this._parseContract();
        const tx = await this._composeTx();
        await sendTx(tx);
        return tx
    }

    async _parseContract() {
        const parser = new FaucetTxParser(this._tx);
        await parser.parse();
        this._contractMatureTimestamp = parser.matureTimestamp;
        this._oldContractSatoshis = parser.satoshis;

        this._buildContract();
    }

    _buildContract() {
        const Contract = buildContractClass(result);
        this._contract = new Contract();
        this._contract.setDataPart(num2bin(this._contractMatureTimestamp, 4));
    }

    async _composeTx() {
        const newContractSatoshis = this._oldContractSatoshis + this._depositSatoshis;

        const unlockingTx = new bsv.Transaction();

        unlockingTx.addInput(createInputFromPrevTx(this._tx))
            .from(await fetchUtxos(privateKey.toAddress()))
            .addOutput(new bsv.Transaction.Output({
                script: this._contract.lockingScript,
                satoshis: newContractSatoshis,
            }))
            .change(privateKey.toAddress())
            .setInputScript(0, (tx, output) => {
                const preimage = getPreimage(tx, output.script, output.satoshis);
                const pkh = this._prvKeyToHexPKH();

                return this._contract.deposit(
                    new SigHashPreimage(toHex(preimage)),
                    this._depositSatoshis,
                    new Ripemd160(pkh),
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

class FaucetWithdraw {
    constructor(tx, receiverAddress) {
        this._tx = tx;
        this._receiverAddress = bsv.Address.fromString(receiverAddress);
        this._withdrawSatothis = 10000;
    }

    async withdraw() {
        await this._parseContract();
        const tx = await this._composeTx();
        await sendTx(tx);
        return tx
    }

    _buildContract() {
        const Contract = buildContractClass(result);
        this._contract = new Contract();
        this._contract.setDataPart(num2bin(this._lastMatureTimestamp, 4));
    }

    async _parseContract() {
        const parser = new FaucetTxParser(this._tx);
        await parser.parse();
        this._lastMatureTimestamp = parser.matureTimestamp;
        this._oldContractSatoshis = parser.satoshis;
        this._buildContract();
    }

    _calcNewMatureTimestamp() {
        return this._lastMatureTimestamp + 300;
    }

    async _composeTx() {

        const unlockingTx = new bsv.Transaction();

        unlockingTx.addInput(createInputFromPrevTx(this._tx))
            .setOutput(0, (tx) => {
                const newLockingScript = bsv.Script.fromASM(this._contract.codePart.toASM() + ' ' + num2bin(this._calcNewMatureTimestamp(), 4));

                const changeAmount = this._oldContractSatoshis - this._withdrawSatothis - tx.getEstimateFee();
                return new bsv.Transaction.Output({
                    script: newLockingScript,
                    satoshis: changeAmount,
                })
            })
            .addOutput(new bsv.Transaction.Output({
                script: bsv.Script.buildPublicKeyHashOut(this._receiverAddress),
                satoshis: this._withdrawSatothis
            }))
            .setInputScript(0, (tx, output) => {
                const preimage = getPreimage(tx, output.script, output.satoshis);
                const changeAmount = this._oldContractSatoshis - this._withdrawSatothis - tx.getEstimateFee();
                return this._contract.withdraw(new SigHashPreimage(toHex(preimage)),
                    new Ripemd160(this._receiverAddress.toHex().substring(2)), changeAmount).toScript()
            })
            .setInputSequence(0, 0xFFFFFFFE)
            .setLockTime(this._calcNewMatureTimestamp())
            .seal()

        return unlockingTx;
    }


}


(async () => {
    try {
        const deploy = new FaucetDeploy(5000);
        const deployTx = await deploy.deploy();
        console.log(`deploy ${deployTx.id}`);
        await sleep(6);

        const deposit = new FaucetDeposit(deployTx, 10000);
        const depositTx = await deposit.deposit();
        console.log(`deposit ${depositTx.id}`);
        await sleep(6);

        const withdraw = new FaucetWithdraw(depositTx, privateKey.toAddress().toString());
        const withdrawTx = await withdraw.withdraw();
        console.log(`withdraw ${withdrawTx.id}`);
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()