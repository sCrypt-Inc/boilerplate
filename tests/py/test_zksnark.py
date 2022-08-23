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

    vk = VerifyingKey({
        'alpha': G1Point({
            'x': 0x1431ad41f72571346c81f248fb86519f434e9d1c775654dd1375c0084137349c,
            'y': 0x04b49904e75d7cb0573d0965258f07498f2235e43e4565b7799837128d6c2471
            }),
        'beta': G2Point({
                'x': FQ2({
                    'x': 0x2a181ee7fcc6cf49dcbd6fe79bda0b5878d06faeeb0c1294ad767b58ab6dfcc3,
                    'y': 0x230a251c98347bc4b02d22b27fba724483157ab7dfa1059b43adcecaf986a468,
                    }),
                'y': FQ2({
                    'x': 0x06c763425dee53dc5b663e763517c75fc7f872f6f9ea0196e80ca56e0cf93c3f,
                    'y': 0x117c1209e00335e68ef48dd8c8e8c2cbef4d55371d5fe3f04b10776482ea03ca,
                    })
             }),
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

    # Also test optimized version with precalculated vk.alpha * vk.beta.
    millera1b1 = FQ12({
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

    assert zksnark_test.testVerifyOptimized(
        inputs,
        proof,
        vk,
        millera1b1
    ).verify()        
            

## Test with 5 public inputs. Requires change of N constant.
#def test_verify_1():
#    proof = Proof({
#        'a': G1Point({
#            'x': 0x13f1c1f190244c3e793b73de546986db5c1a539db2c01393185f529e143d55df,
#            'y': 0x26ac67b3c9f219dea45a889d4953d51f8c4da62bc4eca10642fe1de18c579fed
#            }),
#        'b': G2Point({
#                'x': FQ2({
#                    'x': 0x305b7ba549a66e6981ef0ba13db70972be6a684daafb981df474a635ccb973eb,
#                    'y': 0x049fbaa822c160db11e85fc7152c6d0d92e83148e4d10806c5d0bc1122e0bc50,
#                    }),
#                'y': FQ2({
#                    'x': 0x2d88f47c0a9ea7e617c9c3bd72455b2656441f6a939774b63bc88880b3751296,
#                    'y': 0x15c7ebc85ea0d243dff26484187950f3147b742049dd88902b7a13a6d1dc6695,
#                    })
#             }),
#        'c': G1Point({
#            'x': 0x1bc5b5fae7427c05815cf73e810973be9e0582c2dc1d3d620af2c9896429b9bc,
#            'y': 0x0a0981de2c4bf779ee6e5e2af6e1583b2171ec04b0513009a88272a6d6ccc843
#            })
#    })
#
#    vk = VerifyingKey({
#        'alpha': G1Point({
#            'x': 0x024f2cd7031962a62be2a9aca769ddfd32831f9357d0d2ce546f27d81803ad5b,
#            'y': 0x224e2c11cdfc5f517342ef4c19ae42983abe1bdb363c54c5f00530f96528b197
#            }),
#        'beta': G2Point({
#                'x': FQ2({
#                    'x': 0x1d546ac9c456c5d85a376bf474503666f566bac49bff2b5a5eaef7ca0867db88,
#                    'y': 0x0778478fb4d2b7823b88e5e51b6678a14091a0717fe29ba3af24f6a940335dcb,
#                    }),
#                'y': FQ2({
#                    'x': 0x21e45266443647602fb1e3c9e44290a4cb038a874918cbfcf79ac717873bcda2,
#                    'y': 0x1fdaee2b44ddd1398281fb909dc3520da6e4c9672c89e471141d511d632155bd,
#                    })
#             }),
#        'gamma': G2Point({
#                'x': FQ2({
#                    'x': 0x108085958fc91caa5a2a15ea3787defcb526509a2b7bc286ff7de81035ab94cb,
#                    'y': 0x12637282f71026cae75feb06da6750fb79e5ab97acab668d0ad17dc8c8496412,
#                    }),
#                'y': FQ2({
#                    'x': 0x0676ebaf768e1cd5a19fa6cd90825ef5362125bab76969dfd432674655bd9129,
#                    'y': 0x243cb58befa0ee6eee7df7bb0fe6d3492301b00b71d59c9b3e63481fd397c4fb,
#                    })
#             }),
#        'delta': G2Point({
#                'x': FQ2({
#                    'x': 0x1f48311e2f79fa10740b12524eb42b94b48fe6f06079eda61df90c2812639ab0,
#                    'y': 0x00966b7a65b67acc01ae2be9e629040933bde186fe073c40a8a8c6312eb18154,
#                    }),
#                'y': FQ2({
#                    'x': 0x07f629196101bcda15fc2667724b648a00d352003f1f9a6e70b575a0fa756b17,
#                    'y': 0x2b059a914c81a262f7d41dd2af5d727c6f1670acb808e43a46d4cfef5bd3328d,
#                    })
#             }),
#        'gamma_abc': [
#            G1Point({
#                'x': 0x23ff064a9dc9d1b8831a02e1b4e9c44d892241ee4ae5b0d0a91a90183de3b62b,
#                'y': 0x15d26829943a14d70f95df6712e712371c48ba80ab6afa9223cdc3c88d47ea10
#            }),
#            G1Point({
#                'x': 0x2b2959c6f6cca1afa7bbab5e5ec54359ae9aa18d36124e3b7abbe8c8b564d228,
#                'y': 0x2f97e423a3da83f44d7508e0b45b22ce45932ba4767efb299db2e670cd0bfd69
#            }),
#            G1Point({
#                'x': 0x273f49df2cc99cd8c79d9364d5ccece55f70ae36088eb4d328848846589609fb,
#                'y': 0x0d7bf43b3489670e86a38befa8b6470bbfa24ea65bd33dece9543d1243385a07
#            }),
#            G1Point({
#                'x': 0x2df73536f8660b275d844c46f9a87121eb9bd61235a57d8ab21a848f1d5534d9,
#                'y': 0x1675a1c7c7dcb858a989a6bba52717cf3b0c917efc5221067fa73c6f375e5dfb
#            }),
#            G1Point({
#                'x': 0x20685070ae9b183a0f4f4f84a1ac7f0ad0afd84e3ab2f6beb3bbea88b16fa283,
#                'y': 0x2a8464859f7544e6eb9a66ea79aa720625d8eba2b26b40f12b87c7fb77d4f213
#            }),
#            G1Point({
#                'x': 0x0ac04264dddb512bd598271a50c7b766b36f749bcfdf2043456789ec6053eb61,
#                'y': 0x2a940013402430d1ba36f1814b522403361cb8c84ba8a328036c6838ecb02c98
#            })
#        ]
#    })
#
#    inputs = [
#        0x00000000000000000000000000000000c31b30bf30a687cf96edaf12d74129ca,
#        0x0000000000000000000000000000000021bd667bf2cf7723131c9fe26b9310c9,
#        0x0000000000000000000000000000000000000000000000000000000000000000,
#        0x0000000000000000000000000000000000000000000000000000000000000000,
#        0x0000000000000000000000000000000000000000000000000000000000000000
#    ]
#
#    assert zksnark_test.testVerify(
#        inputs,
#        proof,
#        vk
#    ).verify()        
