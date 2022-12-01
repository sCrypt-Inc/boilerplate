import { Demo } from '../contracts/demo';

async function main() {

    await Demo.compile();

    let demo = new Demo(1n, 2n);

    const deployTx = await demo.deploy(1000);

    console.log('contract deployed: ', deployTx.id)

    const calledTx = await demo.callAdd(3n, deployTx);

    console.log('contract called: ', calledTx.id)
}

main();