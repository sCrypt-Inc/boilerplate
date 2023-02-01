import {
    assert,
    ByteString,
    method,
    SmartContract,
    utf8ToByteString,
} from 'scrypt-ts'

export class HelloWorld extends SmartContract {
    // Public method which can be unlocked by providing the solution
    @method()
    public unlock(message: ByteString) {
        assert(
            message === utf8ToByteString('hello world'),
            'Not expected message!'
        )
    }
}
