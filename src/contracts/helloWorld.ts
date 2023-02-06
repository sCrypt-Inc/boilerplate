import {
    assert,
    ByteString,
    method,
    SmartContract,
    toByteString,
} from 'scrypt-ts'

export class HelloWorld extends SmartContract {
    // Public method which can be unlocked by providing the solution
    @method()
    public unlock(message: ByteString) {
        assert(
            message === toByteString('hello world', true),
            'Not expected message!'
        )
    }
}
