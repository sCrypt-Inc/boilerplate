import { P2PKH } from '../../src/contracts/p2pkh'
import { getDefaultSigner, inputSatoshis } from '../utils/helper'
import { myPublicKey, myPublicKeyHash } from '../utils/privateKey'

import {
    findSig,
    MethodCallOptions,
    PubKey,
    PubKeyHash,
    toHex,
} from 'scrypt-ts'

async function main() {
    await P2PKH.compile()
    const p2pkh = new P2PKH(PubKeyHash(toHex(myPublicKeyHash)))

    // connect to a signer
    await p2pkh.connect(getDefaultSigner())

    // deploy
    const deployTx = await p2pkh.deploy(inputSatoshis)
    console.log('P2PKH contract deployed: ', deployTx.id)

    // call
    const { tx: callTx } = await p2pkh.methods.unlock(
        // pass signature, the first parameter, to `unlock`
        // after the signer signs the transaction, the signatures are returned in `SignatureResponse[]`
        // you need to find the signature or signatures you want in the return through the public key or address
        // here we use `myPublicKey` to find the signature because we signed the transaction with `myPrivateKey` before
        (sigResps) => findSig(sigResps, myPublicKey),
        // pass public key, the second parameter, to `unlock`
        PubKey(toHex(myPublicKey)),
        // method call options
        {
            // tell the signer to use the private key corresponding to `myPublicKey` to sign this transaction
            // that is using `myPrivateKey` to sign the transaction
            pubKeyOrAddrToSign: myPublicKey,
        } as MethodCallOptions<P2PKH>
    )
    console.log('P2PKH contract called: ', callTx.id)
}

describe('Test SmartContract `P2PKH` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})
