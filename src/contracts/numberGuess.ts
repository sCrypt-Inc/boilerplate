// this is a contract of number Guessing game where alice will  choose a number between 0-3
//and then bob will guess the number if the number matches then bob wins other wise alice wins

import {
    assert,
    method,
    prop,
    PubKey,
    pubKey2Addr,
    Sig,
    SmartContract,
    Utils,
} from 'scrypt-ts'

export class NumberGuess extends SmartContract {
    @prop()
    alice: PubKey // alice public key

    @prop()
    bob: PubKey // bob public key

    @prop()
    readonly alice_number: bigint // Number alice choose randomly from 0 - 3

    @prop()
    readonly bob_number: bigint // Number that bob guess againts alice number

    constructor(
        alice: PubKey,
        bob: PubKey,
        alice_number: bigint,
        bob_number: bigint
    ) {
        super(...arguments)
        this.alice = alice
        this.bob = bob
        this.alice_number = alice_number
        this.bob_number = bob_number
    }

    // publi method Guess

    @method()
    public guess(sig: Sig) {
        // the amount of money locked in the contract
        const amount = this.ctx.utxo.value

        // if bob guess the number that alice choose randomly will get the money else alice will get the money.
        if (this.alice_number == this.bob_number) {
            const bobwin = Utils.buildPublicKeyHashOutput(
                pubKey2Addr(this.bob),
                amount
            )
            assert(this.checkSig(sig, this.bob, 'bob sig failed'))
        } else {
            const alicewin = Utils.buildPublicKeyHashOutput(
                pubKey2Addr(this.alice),
                amount
            )
            assert(this.checkSig(sig, this.alice, 'alice sig failed'))
        }
        // making sure that alice do not choose a number bigger than 3.
        assert(
            this.alice_number >= 0n && this.alice_number <= 3n,
            'number out of range'
        )
    }
}
