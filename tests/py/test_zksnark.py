import os
import json
import random

from scryptlib import (
        compile_contract, build_contract_class, build_type_classes
        )


contract = 'res/testZKSNARK.scrypt' 

compiler_result = compile_contract(contract, debug=True)
desc = compiler_result.to_desc()

# Load desc instead:
#with open('./out/testZKSNARK_desc.json', 'r') as f:
#    desc = json.load(f)

type_classes = build_type_classes(desc)
G2Point = type_classes['G2Point']
G1Point = type_classes['G1Point']
FQ2 = type_classes['FQ2']
FQ12 = type_classes['FQ12']
Proof = type_classes['Proof']
VerifyingKey = type_classes['VerifyingKey']

ZKSNARKTest = build_contract_class(desc)
zksnark_test = ZKSNARKTest()


def test_verify_0():
    proof = Proof({
        'a': G1Point({
            'x': 0x11eb593a16b58213284c3897da7f4322389edc9558e1ba860553ac27fae9d491,
            'y': 0x2eef3c807ea9993ae0fef04e9753287b5e4fa2f29fa5ffc1be82cde255c28ee7
            }),
        'b': G2Point({
                'x': FQ2({
                    'x': 0x2edcfd2963a9ffe420b220b81a25ef5c5335666ca8ebac6ff463229695ad177d,
                    'y': 0x170f10bcf9027f85e49eddd8c05d031d26b4113c81cf0520a2f8a2e09f1db366,
                    }),
                'y': FQ2({
                    'x': 0x08c709a8ceeffdd2d37e10972fa7ed8996d2379dd8d6a2f535baa44a722e738f,
                    'y': 0x0d2bb553fd9d6f8a10e88b44f2d112ec54c5d826a1f0bf503cc4281f87b9c296,
                    })
             }),
        'c': G1Point({
            'x': 0x259f8ab7c74f3dd733f0d5e4c913c2409b1c5fbb559c2fbf6ad1edba14f2559c,
            'y': 0x288fe3718f86572ce28b06efb898dcdbd5dc55c37e3c9ea99ee03d50524b9a39
            })
    })

    vk = VerifyingKey({
        'alpha': G1Point({
            'x': 0x2dc9dc3b5a2bb29af51862104110dd264871f65072203799d35b0c4e3a2d427a,
            'y': 0x061f7be0fcfbc43ff235adec9b3a3e6552ce4c1545e19a8be4a927fbc87074a7
            }),
        'beta': G2Point({
                'x': FQ2({
                    'x': 0x053ec4111e7e517f74dc5390924f7dea7aa9fdaac58bbbd7da760e910c818e1b,
                    'y': 0x19cff9b2a05f8021a886f823568bfc7d7e922ecee84c58ef01a137b9db02bbc2,
                    }),
                'y': FQ2({
                    'x': 0x2058b656478123da378f96f53f24c9f5fb1575b9dc5293755cb40714195a0041,
                    'y': 0x1084da893bc292a042ec1a3157b821fde2afeef3e3c00b5c0db451b69de30ba0,
                    })
             }),
        'gamma': G2Point({
                'x': FQ2({
                    'x': 0x2884c87723d2ecd87481d41d499f8fa619582e412e4df8db01b9e9a3c5a86adc,
                    'y': 0x0d10ef6ab4a85a76bbfb2a6533d6578410b9b2a7838e9c90a62e736a7a0088de,
                    }),
                'y': FQ2({
                    'x': 0x1fc49ca89d4d7cef807b236df011edafa53359a883f30e90c166259be326a92e,
                    'y': 0x253945a6ba0ab7cea8d9ae5bdb62acb9d0f63bb425d3f455edd374a244ff0e53,
                    })
             }),
        'delta': G2Point({
                'x': FQ2({
                    'x': 0x0d2ee5f27576f780626213279802429523653b4c6acea74c52c607e0908bd706,
                    'y': 0x0b595fd69cabe8e9bf40c2e51062c42b02324f3c455f5a47243d8b8cad9d65c3,
                    }),
                'y': FQ2({
                    'x': 0x00001b3a51239eefd1e552fff8d854edd9afbc322657964b328168ffcaf7aa8e,
                    'y': 0x1f96a653e4c54c62e38e4382a5b854d8ed2fa8e4ad7b2f2d0fcccb631f131403,
                    })
             }),
        'gamma_abc': [
            G1Point({
                'x': 0x2314f0efe815d1b849797a713d866ee54943dbf04bdfef7edfc6932ba22b525e,
                'y': 0x14677ba82759585b096f552a07dbc59effff9f4f5dcf437fcdc19e076199c497
            }),
            G1Point({
                'x': 0x2720083a242951dbdfec1cb57b60cb81e186cb46ada954798513d85382723e42,
                'y': 0x185f236eaa1fdf5244fcf104b152416402fcc91666ebb32b6156fb84bc1a9874
            })
        ]
    })

    inputs = [0x000000000000000000000000000000000000000000000000000000000001bba1]

    assert zksnark_test.testVerify(
        inputs,
        proof,
        vk
    ).verify()        
            
