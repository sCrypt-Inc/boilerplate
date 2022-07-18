pragma circom 2.0.2;

// library circuits from https://github.com/0xPARC/circom-ecdsa
include "lib-circom-ecdsa/ecdsa.circom";
include "../node_modules/circomlib/circuits/sha256/sha256.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

// `n`: chunk length in bits for a private key
// `k`: chunk count for a private key
template Main(n, k) {
  // n * k == 256
  assert(n * k >= 256);
  assert(n * (k-1) < 256);

  // little-endian
  signal input privkey[k];
  signal input pubkey[2][k];

  signal output privkeyHash[k];

  // get pubkey from privkey
  component privToPub = ECDSAPrivToPub(n, k);
  for (var i = 0; i < k; i++) {
    privToPub.privkey[i] <== privkey[i];
  }

  // verify input pubkey
  signal pub_x_diff[k];
  signal pub_y_diff[k];
  for (var i = 0; i < k; i++) {
    pub_x_diff[i] <-- privToPub.pubkey[0][i] - pubkey[0][i];
    pub_x_diff[i] === 0;
    pub_y_diff[i] <-- privToPub.pubkey[1][i] - pubkey[1][i];
    pub_y_diff[i] === 0;
  }

  // calculate sha256 of privkey
  component sha256 = Sha256(256);
  for (var i = 0; i < k; i++) {
    for (var j =0; j < n; j++) {
      // change privkey to big-endian as sha256 input
      sha256.in[i * n + j] <-- (privkey[k-1-i] >> (n-1-j)) & 1;
    }
  }

  // set output
  component b2n[k];
  for (var i = 0; i < k; i++) {
    b2n[i] = Bits2Num(n);
    for(var j = 0; j < n; j++) {
      // `b2n` input is little-endian in bits, `sha256` out is big-endian in bits
      b2n[i].in[n-1-j] <== sha256.out[i * n + j];
    }
    privkeyHash[i] <== b2n[i].out;
  }

}

component main {public [pubkey]} = Main(64, 4);