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
FQ6 = type_classes['FQ6']
FQ12 = type_classes['FQ12']
Proof = type_classes['Proof']
VerifyingKey = type_classes['VerifyingKey']

ZKSNARKTest = build_contract_class(desc)
zksnark_test = ZKSNARKTest()


def test_verify_0():
    proof = Proof({
        'a': G1Point({
            'x': 0x11421cbecbed165d0e4ce5efe39df80203ac655625d25edfd74628381e4ac8cf,
            'y': 0x1dfac3ecc3e619af99984ddf836d444bf8bd0fcf49f05065587cf5e72be61c94
            }),
        'b': G2Point({
                'x': FQ2({
                    'x': 0x2411ea2a3a6df04fb16a69a8fa63abb84cf0dc180a38e9251981a766fe255859,
                    'y': 0x11792272e45f6f84d2fb6f5c49cf87895fd22f22131b3d67e0930f6246f34141,
                    }),
                'y': FQ2({
                    'x': 0x1742c7762a4b1c2d34e0e78078e57537093f2a19959b1adaa6788d488ed919cf,
                    'y': 0x26b44df40b909932ba8a12df0bc36f778cbd71b1cf96c5eed317c6ea10ea67b6,
                    })
             }),
        'c': G1Point({
            'x': 0x2599b516fe83a2e3e7a48a6a19556865dd231d028dfdc804bf45ebe659440b00,
            'y': 0x2378c4b624fd1a290488683c8d592648ad3e23686f73667e40e9e697a4263927
            })
    })

    millerb1a1 = FQ12({
        'x': FQ6({
            'x': FQ2({
                'x': 2127356783905559593272756835978861745876488732674186717002137844997639056324,
                'y': -25399583956667205141837684477276819181966124473649400873238383836865208168593
                }),
            'y': FQ2({
                'x': -16711428091461918511096809274034428548482845969609499954997089082175334525717,
                'y': -12211292625401886850243523359594870225579183334795450974496925675022465811288
                }),
            'z': FQ2({
                'x': -64589125938171024488928895725585582843215161613769324288899182089035139680481,
                'y': 100585451108012376489520314045669715950877884161284756461348374288652621138550
                })
            }),
        'y': FQ6({
            'x': FQ2({
                'x': 17128697032009708071441534394297333564991166476249799533395840138644743465049,
                'y': 2016396721973396327764393052769706730962680626481266267397819585211285681784
                }),
            'y': FQ2({
                'x': -15543929344890631450579637055954481150167653191503975534944704416060157555582,
                'y': -86216297469984927837207428415834555765584774641150438316220469703187627590807
                }),
            'z': FQ2({
                'x': 174445358656777515364411221148061800312292041223077934483774996724048396434783,
                'y': 225468647982510873424836217733874917878784354743069798294557806978737945535998
                })
            })
        })

    vk = VerifyingKey({
        'millerb1a1': millerb1a1,
        'gamma': G2Point({
                'x': FQ2({
                    'x': 0x1d7b5c4e68679bde000cbb8aaab84470937e154551c3d1e983b3c8811d2a3aa9,
                    'y': 0x0b8c2adad07f1d83427c80e5bab2a69dc128a18db78f386d822c0b2a33e153e7,
                    }),
                'y': FQ2({
                    'x': 0x2d88aac9fb2fc1e681b164c8554ad46f2a7cd2716dbd4c447992065c2623cb46,
                    'y': 0x2d05db174803826dc866151d766a36f4ba885fb9ce5b6352d739efac39ce3215,
                    })
             }),
        'delta': G2Point({
                'x': FQ2({
                    'x': 0x157ea19da719966603e5aa6a1964e8616889bee845e7c421650236725ea59770,
                    'y': 0x237ea049a5a7e95e92303b7066e5e09c2213e20665f30613202d7cb4bba35657,
                    }),
                'y': FQ2({
                    'x': 0x0cc85f10483a01b9a134027551eb8fb6041eb7a3d4872eca39ebdb606d2295a6,
                    'y': 0x2385eecc94831cbd97a7683a8d53fb8639b9ac7d192da7b3e402afc34ca2ae16,
                    })
             }),
        'gamma_abc': [
            G1Point({
                'x': 0x032c138a2e2219febe77fe29ce8c928fcefcf0ef3d0bd0c3b928ac9cfeed5cde,
                'y': 0x1a223d92d6fa5296b6ab769c0f4bcba03bbe4915e5296b241e16f5e970e05016
            }),
            G1Point({
                'x': 0x077dcfe522a9a7b6ff52a7ab4c989d99ba4cb13ab997f3b036a92a806098ac14,
                'y': 0x046dacd8734031da8abf6aa2c1fc977442ed6023ad138a08265e8f28fd66b972
            })
        ]
    })

    inputs = [0x000000000000000000000000000000000000000000000000000000000001bba1]


    assert zksnark_test.testVerify(
        inputs,
        proof,
        vk
    ).verify()


def test_verify_1():
    proof = Proof({
        'a': G1Point({
            'x': 0x1b5ef4998470b057bc825a706d9b1d9ce93d964e433b0d08966023be5cb8e237,
            'y': 0x12c78966ffac8a569f0b7b33d1c4c9de4d30fc9ef1a1b6dfb61634ea11b14279
            }),
        'b': G2Point({
                'x': FQ2({
                    'x': 0x0ee1fc599132352453a86f3daed39210157555c6d3e86114eb5ba081b2722a12,
                    'y': 0x12815305ec3b532b68823a0bc8a99fd5c79b41a9695dea18a1ae7b2d4a11f1c4,
                    }),
                'y': FQ2({
                    'x': 0x065bd011c740759f86143b178c7a857a9f71bca43017c74eecb45e5aa58492ba,
                    'y': 0x0341b1cad7b0ace0c03a675c6e07826c3a366ff38a435c89e3e87fabe55b5307,
                    })
             }),
        'c': G1Point({
            'x': 0x128a07e630b9cc8c98d1c850b01c7b0af9f9c0c1ae523a50b709d7e2d6e5ce74,
            'y': 0x1e1d206a3d94a78a553ec0400cc45d012f618f1862af41e2e6bcaa349bcab055
            })
    })

    millerb1a1 = FQ12({
        'x': FQ6({
            'x': FQ2({
                'x': -19939430203072691752067527983077271130900100900903882801874608553011424603616,
                'y': -22345172972958269116223642747575424107530490717461111278541911704234717991886
                }),
            'y': FQ2({
                'x': -26681376399338853964270091108950395564242050369764978926370667534946488705481,
                'y': -15296632019226622281733929222441673536269704146338084906704606316178679957501
                }),
            'z': FQ2({
                'x': 107365915621194471881988692905756363951539657824572787248058198315241013307930,
                'y': -183903249319272267112607234606815792431414072518717790264686844971905899412741
                })
            }),
        'y': FQ6({
            'x': FQ2({
                'x': 7430233467520597885301814190901281088460816262702343699314171309629602211509,
                'y': -8355418490288338801673651096659545237930604474068626471899084184181133150818
                }),
            'y': FQ2({
                'x': 46840010100558776023532541740568331165891076069908926965410516960175939766011,
                'y': 68870096942329924236587513458081877008946198733512563463712722567480001953821
                }),
            'z': FQ2({
                'x': 144027384954324850695007606412868323122729934340977922575127449978526357572738,
                'y': 269899684445439763273172991592009640570177358386348818278452985476083307213887
                })
            })
        })


    vk = VerifyingKey({
        'millerb1a1': millerb1a1,
        'gamma': G2Point({
                'x': FQ2({
                    'x': 0x2b58d1bc5f69d5ca217ccb0df5eebfaa80c579312cf1b8062821fbe56a7afe14,
                    'y': 0x0cbe0622cedef29089722274a715b2548ce8733eb6033656769a5c524f711766,
                    }),
                'y': FQ2({
                    'x': 0x15eb7a0b6a8c4cd08876cf8445503be7730eba7d934306c0c982c192a76b14be,
                    'y': 0x254cb46aa68e49dcadeab26de9ee468049efed748361db9b556ed7f01fc83482,
                    })
             }),
        'delta': G2Point({
                'x': FQ2({
                    'x': 0x0382c79bbc61939e1977ac3278ecd69c4f2fd07197d23b6264ec6bb9bbec9ae5,
                    'y': 0x1ff5430b5b8ee1358dc4921b37331690013d6dc9556ee2fd0f6ab04f4edb0000,
                    }),
                'y': FQ2({
                    'x': 0x2bc6cec176689b0cbbe1808610f4e2ee43af77ed8ae53db376356018c1d139f3,
                    'y': 0x29440cc4f4cd7eb28d258d88b89beb773e5728c4a0246eab257d2996b8083b28,
                    })
             }),
        'gamma_abc': [
            G1Point({
                'x': 0x2523be8f469c0e584e586ab96d44ea913cb21913f3252028b11290c100984433,
                'y': 0x284bf6dcfbc2a144c62ecd148edacf1c7612fe7c9445cd498811d88243600fac
            }),
            G1Point({
                'x': 0x1313fd06af4f264973c664f0c25b6ed2aa790886893dfdf589320ba3c2910672,
                'y': 0x2187973a80d3c9953bf85d180643a4ea2103510e5c67b3962a8438c4e9a5a86d
            })
        ]
    })

    inputs = [0x000000000000000000000000000000000000000000000000000000000001bba1]

    assert zksnark_test.testVerify(
        inputs,
        proof,
        vk
    ).verify()

