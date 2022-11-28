pragma circom 2.0.2;

// library circuits from https://github.com/0xPARC/circom-ecdsa
include "lib-circom-ecdsa/ecdsa.circom";
include "lib-circom-ecdsa/bigint.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template InGroupChecker(m) {
  signal input in[m];
  signal output out;

  var s = 0;
  for(var i=0; i<m; i++) {
    assert(in[i] < 2);
    assert(in[i] >= 0);
    s += in[i];
  }

  component gt = GreaterThan(252);
  gt.in[0] <== s;
  gt.in[1] <== 0;

  out <== gt.out;
}

// `n`: chunk length in bits for a private key
// `k`: chunk count for a private key
// `m`: group member count
template Main(n, k, m) {
  // n * k == 256
  assert(n * k >= 256);
  assert(n * (k-1) < 256);

  signal input privkey[k];
  
  signal input pubKeyGroup[m][2][k];
  signal output existInGroup;

  // get pubkey from privkey
  component privToPub = ECDSAPrivToPub(n, k);
  for (var i = 0; i < k; i++) {
    privToPub.privkey[i] <== privkey[i];
  }

  signal pubkey[2][k];

  // assign pubkey to intermediate var
  for (var i = 0; i < k; i++) {
    pubkey[0][i] <== privToPub.pubkey[0][i];
    pubkey[1][i] <== privToPub.pubkey[1][i];
  }

  // check whether pubkey exists in group
  var exist = 0;
  component eq[2*m];
  var compareResult[m];

  for (var i = 0; i < m; i++) {
    // pubkey `x` comparer
    eq[i] = BigIsEqual(k);

    // pubkey `y` comparer
    eq[i+m] = BigIsEqual(k);

    for(var j = 0; j < k; j++) {
      // compare `x`
      eq[i].in[0][j] <== pubkey[0][j];
      eq[i].in[1][j] <== pubKeyGroup[i][0][j];

      // compare `y`
      eq[i+m].in[0][j] <== pubkey[1][j];
      eq[i+m].in[1][j] <== pubKeyGroup[i][1][j];
    }
    
    compareResult[i] = eq[i].out * eq[i+m].out;
  }

  component checker = InGroupChecker(m);
  for(var i = 0; i < m; i++) {
    checker.in[i] <== compareResult[i];
  }

  existInGroup <== checker.out;
}

// in a group of three pubkeys 
component main {public [pubKeyGroup]} = Main(64, 4, 3);
