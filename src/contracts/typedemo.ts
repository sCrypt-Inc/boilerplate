import { ByteString, SmartContract, assert, method, prop, toByteString } from "scrypt-ts";

type Integer = bigint;
type Name = ByteString;
type Age = Integer;
type Address = ByteString;

type Person  = {
    name : Name;
    addr : Address ;
leftHanded: boolean;
    age  : Age;
}

type FeMale = Person;
type Male = Person;

type Block = {
    hash : ByteString;
    time : bigint;
coinbase : ByteString;
}

export class StructDemo extends SmartContract{

    @prop()
     person : Person;

    constructor(male : Person) {
        super(...arguments)
        this.person = male;
    }

    @method()
    public main(person1 : FeMale) {

        assert(person1.leftHanded == this.person.leftHanded,'not left handed');
        assert(person1.addr == this.person.addr, 'address not the same');
        assert(person1.age == this.person.age, 'not thesame age');

        this.person = this.incAge(person1);
        assert(this.person.age == 34n,'the age is not equal to 34');

        let block : Block = this.genisBlock(person1);
        assert(block.coinbase == toByteString('7361746f736869206e616b616d6f746f'));
        assert(block.hash == toByteString('000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f'));
    }

    @method()
    incAge(p1 : FeMale) : Person {
        p1.age++;
        return p1;
    }

    @method()
    genisBlock(p1 : Male) : Block {
        let hash : ByteString = toByteString('000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f')
        let time : bigint = 1231006505n
        let coinbase : ByteString = p1.name
        let blk : Block = { hash,
         time, coinbase };

        return blk;
    }
}
