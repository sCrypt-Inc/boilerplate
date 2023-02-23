import {
    method,
    SigHash,
    prop,
    SmartContract,
    assert,
    HashedMap,
    ByteString,
    PubKeyHash,
    toByteString,
    hash256,
    PubKey,
    Sig,
    hash160,
} from 'scrypt-ts'

export type BalanceMap = HashedMap<PubKeyHash, bigint>

export type Allowance = {
    owner: PubKeyHash
    spender: PubKeyHash
}

export type AllowanceMap = HashedMap<Allowance, bigint>

export type ERC20Pair = {
    address: PubKeyHash
    balance: bigint
}

export class ERC20 extends SmartContract {
    @prop(true)
    balances: BalanceMap

    @prop(true)
    allowances: AllowanceMap

    @prop()
    name: ByteString

    @prop()
    symbol: ByteString

    @prop()
    decimals: bigint

    @prop(true)
    totalSupply: bigint

    @prop()
    issuer: PubKey

    @prop()
    static readonly EMPTY_ADDR: PubKeyHash = PubKeyHash(
        toByteString('0000000000000000000000000000000000000000')
    )

    constructor(
        name: ByteString,
        symbol: ByteString,
        issuer: PubKey,
        balances: BalanceMap,
        allowances: AllowanceMap
    ) {
        super(...arguments)
        this.name = name
        this.symbol = symbol
        this.decimals = 18n
        this.totalSupply = 0n
        this.issuer = issuer
        this.balances = balances
        this.allowances = allowances
    }

    /**
     * Creates `amount` tokens and assigns them to `issuer`, increasing
     * the total supply.
     * @param sig
     * @param issuerBalance
     * @param amount
     */
    @method(SigHash.SINGLE)
    public mint(sig: Sig, issuerBalance: bigint, amount: bigint) {
        const address = hash160(this.issuer)
        assert(
            this.checkSig(sig, this.issuer),
            'ERC20: check issuer signature failed'
        )
        if (this.totalSupply === 0n) {
            this.balances.set(address, amount)
            this.totalSupply = amount
        } else {
            assert(
                this.balances.canGet(address, issuerBalance),
                'ERC20: can not get balance from issuer address'
            )
            this.balances.set(address, issuerBalance + amount)
            this.totalSupply += amount
        }
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value))
        )
    }

    /**
     * check the owner's balance
     * @param owner
     * @param balance
     */
    @method(SigHash.SINGLE)
    public balanceOf(owner: PubKeyHash, balance: bigint) {
        assert(
            this.balances.canGet(owner, balance),
            'ERC20: can not get balance from owner address'
        )
        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value))
        )
    }

    /**
     * transfer token from owner to receiver
     * @param from owner's address and balance
     * @param pubkey owner's public key
     * @param sig owner's signature
     * @param to receiver's address and balance
     * @param amount amount of token, the owner must have a balance of at least `amount`.
     */
    @method(SigHash.SINGLE)
    public transfer(
        from: ERC20Pair,
        pubkey: PubKey,
        sig: Sig,
        to: ERC20Pair,
        amount: bigint
    ) {
        assert(
            from.address != ERC20.EMPTY_ADDR,
            'ERC20: transfer from the zero address'
        )
        assert(
            to.address != ERC20.EMPTY_ADDR,
            'ERC20: transfer to the zero address'
        )
        assert(
            this.balances.canGet(from.address, from.balance),
            'ERC20: can not get balance from sender address'
        )
        assert(from.balance >= amount, 'ERC20: transfer amount exceeds balance')

        assert(hash160(pubkey) == from.address, 'ERC20: check signature failed')

        assert(this.checkSig(sig, pubkey), 'ERC20: check signature failed')

        this.balances.set(from.address, from.balance - amount)

        if (this.balances.canGet(to.address, to.balance)) {
            this.balances.set(to.address, to.balance + amount)
        } else {
            this.balances.set(to.address, amount)
        }

        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value)),
            'check hashOutputs failed'
        )
    }

    /**
     * moves `amount` of tokens from `from` to `to` by spender.
     * @param spender spender's public key
     * @param sig spender's signature
     * @param currentAllowance  the allowance granted to `spender` by the owner.
     * @param from owner's address and balance
     * @param to receiver's address and balance
     * @param amount amount of token, the owner must have a balance of at least `amount`.
     */
    @method(SigHash.SINGLE)
    public transferFrom(
        spender: PubKey,
        sig: Sig,
        currentAllowance: bigint,
        from: ERC20Pair,
        to: ERC20Pair,
        amount: bigint
    ) {
        assert(
            to.address != ERC20.EMPTY_ADDR,
            'ERC20: approve to the zero address'
        )
        assert(this.checkSig(sig, spender))
        assert(
            this.allowances.canGet(
                {
                    owner: from.address,
                    spender: hash160(spender),
                },
                currentAllowance
            )
        )

        assert(
            currentAllowance > 0n && currentAllowance >= amount,
            'ERC20: insufficient allowance'
        )

        // update allowances
        this.allowances.set(
            {
                owner: from.address,
                spender: hash160(spender),
            },
            currentAllowance - amount
        )

        assert(
            from.address != ERC20.EMPTY_ADDR,
            'ERC20: transfer from the zero address'
        )
        assert(
            to.address != ERC20.EMPTY_ADDR,
            'ERC20: transfer to the zero address'
        )
        assert(
            this.balances.canGet(from.address, from.balance),
            'ERC20: can not get balance from sender address'
        )
        assert(from.balance >= amount, 'ERC20: transfer amount exceeds balance')

        this.balances.set(from.address, from.balance - amount)

        if (this.balances.canGet(to.address, to.balance)) {
            this.balances.set(to.address, to.balance + amount)
        } else {
            this.balances.set(to.address, amount)
        }

        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value)),
            'check hashOutputs failed'
        )
    }

    /**
     * allows `spender` to withdraw from your account multiple times, up to the `amount`.
     * If this function is called again it overwrites the current allowance with `amount`.
     * @param owner owner's public key
     * @param sig owner's signature
     * @param spender spender's address
     * @param amount amount of token
     */
    @method(SigHash.SINGLE)
    public approve(
        owner: PubKey,
        sig: Sig,
        spender: PubKeyHash,
        amount: bigint
    ) {
        assert(
            spender != ERC20.EMPTY_ADDR,
            'ERC20: approve to the zero address'
        )

        assert(this.checkSig(sig, owner))

        this.allowances.set(
            {
                owner: hash160(owner),
                spender: spender,
            },
            amount
        )

        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value)),
            'check hashOutputs failed'
        )
    }

    /**
     * check the amount which `spender` is still allowed to withdraw from `owner`.
     * @param owner owner's address
     * @param spender spender's address
     * @param amount amount of token allowed to withdraw
     */
    @method(SigHash.SINGLE)
    public allowance(owner: PubKeyHash, spender: PubKeyHash, amount: bigint) {
        assert(
            this.allowances.canGet(
                {
                    owner: owner,
                    spender: spender,
                },
                amount
            )
        )

        assert(
            this.ctx.hashOutputs ==
                hash256(this.buildStateOutput(this.ctx.utxo.value)),
            'check hashOutputs failed'
        )
    }
}
