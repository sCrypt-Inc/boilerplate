# A library to do recursive function

We introduce a special library (and a contract example) that allows any programmer to write smart contract that uses a recursive function. All that the user needs to modify is minimal and using the library is straightforward.

### How to use the library

All you need to do when you want to execute your recursive function (that you need to define in another file) is to call `Loop.recursive(...)` in your smart contract code. It will simply return the result of your computation.
Let's take greated common divisor (GCD) as an example. The GCD of two integers is the largest positive integer that divides each of the integers. It's a classical example of a simple recursive function. Let's walk through all three files to see what you need to modify to use your own recursive function, exemplified by GCD.

First we have the file `final_loop_import.scrypt`. This is where you need to define your own recursive function and utility functions. For us it's very simple: we want to compute the GCD of 2 numbers, so the recursive function will take and return 2 numbers, wrapped in a structure called `Object`. Your recursive function needs to take and return object of type `Object`.

Next you need to specify the fee (satoshi/byte) and the size your structure takes (something similar as `sizeof` in C). One integer has size 1. We have 2 integers here, so the size is 2.
And finally you need to write your recursive function, that takes a parameter of type `Object` and returns a type `DoNotTouch`, which has 1 boolean which represents if we want to enter and execute the function again and 1 `Object`, which is the result.
Please note that you cannot make multiple recursive function calls (Btw, Fibonacci can be written in a single recursive function call).
And then at the end of this file you need to write 2 functions, which convert between `bytes` and `Object`. The length of the bytes sequence taken and returned needs to be the size you defined above.

Now that we have defined our recursive function, we need to write our contract. This is in the file `final_loop_main.scrypt`. This is the file of your smart contract. It needs to include two files and define some public functions that you shall not touch. Otherwise, everything is as usual and you can write the public functions you want.
For our example, let's ask the user to provide two numbers whose gcd is 1 to spend the utxo. So we need to define a public function that takes two integers a and b, compute gcd, and end with `require (gcd == 1)`.
The sCrypt code will therefore be `Object result = Loop.computation(txPreImage, {a, b});` to get the GCD, and then `require(result.a == 1)` to make sure it's 1. In our recursive function the GCD is stored on a, that's why it's `result.a`.

And... That's it! You can use a recursive function anywhere you want!
### How it works under the hood

You don't need to understand how it works internally if you are doing basic recursion. But if you do need more complicated recursion (or if you deploy on mainnet), please take the time to read the part below as using a recursive function can lead to tricky corner case.

First let's understand how it works, and then we will see all the limitations it has and how to avoid the pitfall when you use it. Please be insanely careful if you use the library on mainnet.

The state of your contract should be in the format of `OP_RETURN object in_loop temp_object`. Both `object` and `temp_object` are of type `Object`, `in_loop` is of type `int` (1 byte).

`object` represents the arguments of your recursive call. This variable doesn't change during the computation, and is used at the end of the computation to make sure the result is expected. When computation has finished, this variable will hold the value you called your function with and `temp_object` will hold the result of the computation.

`in_loop` represents the state in which the computation is. `0` means the computation hasn't started. `1` means the computation is in progress. `2` means the computation has ended, and the result is in the  `temp_object`.

`temp_object` is the temporary object that changes during the computation and it will hold the result in the end. Therefore if `in_loop` is `2`, `temp_object` is the result of your recursive function applied to the variable object! This invariant is true everywhere in the contract. So if you add functions to the contract, you need to make sure this invariant holds. For example, you shouldn't change object without resetting `in_loop`. That's why the `Loop` library provides two functions `scriptCode` and `buildOutput` that help you to write your smart contract as usual, but will reset `in_loop` for you and hide it from `scriptCode` (and it will hide `temp_object` as well), so that you can manipulate state as usual. If you need to use some functions of the `Util` library please be very very careful that the invariant still holds.

So what happens when someone makes a recursive call?

[Picture]

First he needs to set object to the value he wants. Then call as shown in the deployment file to execute the loop, so that `Loop.recursive(..)` doesn't fail. From his point of view he clicks a single button (or execute a single function in the deployment file), but lot of transactions will be generated, hence the red rectangle: the user thinks he makes a normal transaction, whereas he creates a long transaction chain.

The transaction chain created is depicted in the picture :
+ First the value of `in_loop` needs to be set to 1 to initiate the computation. The public function needed to do that operation is `to_loop_1` in your smart contract. This function makes sure object and `temp_object` are the same, and make sure `in_loop` is 0. Then it sets `in_loop` to 1.
+ Then each transaction will make one recursive function call, the public function for that is `to_loop_2`. It checks that `in_loop` is 1, and then make sure the next value of `temp_object` is the result of your function applied to `temp_object`.
+ Then when computation ended we need to set `in_loop` to 2. This is done with `to_loop_2` again. When your recursive function answers the computation has ended (that is when the boolean you answer (with the variable of type object) is set to False). When that happens it requires that next transactions leave `temp_object` unchanged, and that `in_loop` is 2.

In all these steps of the contracts the following invariant is true (and can be proved by induction): If a child of a utxo has `in_loop` 2 before it has `in_loop` 0, then `temp_object` holds the result of the computation.

One last thing important to notice is that this recursive function call can be in a if statement, because the user can set to object to the value it desires (and the user know will branch will be taken), but it cannot be executed twice in a public functions.

### Limitations, and improvements

The first limitation is not being able to call multiple times the function `Loop.recursive(..)` in a public function. This is easy to patch: one must just need to keep a cache of all computations done (with object and `temp_object` we only keep a cache of size 1), so that if the user want to call the recursive function twice, he will need to fill the cache with 2 values.

The second limitation is not being able to stop a computation. One must just need to add a public function, that reset in_loop to 0 even if it's already 1. In your contract you should have anyway a function to change the value of object, so that function is just setting object to the value you want.

The third limitation is the tremendous amount of fees it consumes. In Ethereum you pay more if your for loop takes longer to execute, and fees can be insanely large. Same story here. If you do 500 recursive calls, this can cost significant sats, but only a small fraction of the cost on Ethereum!

A fourth limitation is being able to deal with only fixed size objects. If we instead use OP_PUSHDATA, we could use a single stack element for object, and another for `temp_object`, so that they could have variable length.

Finally, some limitations are with the current state of the Bitcoin SV development ecosystem itself. One could imagine that `Loop.recursive(..)` could take a function as argument, and execute it (aka, high order functions). One could imagine that with variable sized object, we would want a loop(N) with N the size of the object (known at 'spending time' of the utxo) (aka constant computed at spending time, not compile time). One could imagine that the contract morph itself into something else just for the loop, and morph back into the real contract once the loop is finished, so that the size of contract when you execute the loop is very small in order to pay less fees (aka, self modifying contracts). All these notions are faily advanced and not yet available on bitcoinSV, but should convince the reader that if the bsv ecosystem was as advanced as the eth one, the smart contracting capability would be truly huge.