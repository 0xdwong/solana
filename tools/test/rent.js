require('dotenv').config();
const helpers = require('../src/helpers');
const splToken = require('@solana/spl-token');
const { retrieve } = require('../src/rent');


async function createTokenAccount() {
    // 连接到Solana网络 (这里使用devnet)
    const connection = helpers.connection.getConnection(process.env.Solana_Cluster, 'confirmed');

    // 创建钱包实例 (这里使用示例私钥,实际使用时请替换为您自己的私钥)
    const payer = helpers.wallet.fromPrivateKey(process.env.PRIVATE_KEY);

    // const payer = web3.Keypair.fromSecretKey(Uint8Array.from(process.env.PRIVATE_KEY));

    // 创建一个新的代币铸造账户 (这里仅作为示例,您也可以使用现有的代币铸造账户)
    const mint = await splToken.createMint(
        connection,
        payer,
        payer.publicKey,
        null,
        9 // 代币精度
    );

    console.log('创建的代币铸造账户地址:', mint.toBase58());

    // 为支付者创建代币账户
    const tokenAccount = await splToken.createAccount(
        connection,
        payer,
        mint,
        payer.publicKey
    );

    console.log('创建的代币账户地址:', tokenAccount.toBase58());

    return { mint, tokenAccount };
}

async function main() {
    // create token account
    // const { mint, tokenAccount } = await createTokenAccount();
    let mint = '2ogUytcgwMqbETY1Rn1dhVE5oyvy9VB4WaiSzFQyJ3e2';
    let tokenAccount = 'Bmng3YV9iphnCmKRoUce7TrzmN8cNyKnSqU24AwyVyin';
    tokenAccount = 'HRtTs1LcZjNqTqSFMmozgpowLbU7aQncBdfjs9vX3WV5'
    tokenAccount = 'G9Sooi7YEpXnPQwRpmyokLxdjsJSvjCv9Rz5fW816FQF'
    tokenAccount = 'A9Vg6m1J6oJNBoceLJY3814aKS554qd8a7Xicf2VBQa6'

    // retrieve rent
    await retrieve(tokenAccount);

    // check
}

main();