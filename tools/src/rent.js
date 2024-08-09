require('dotenv').config();
const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const helpers = require('./helpers');


async function retrieve(tokenAccount) {
  const connection = helpers.connection.getConnection(process.env.Solana_Cluster, 'confirmed');

  // 创建钱包实例 (这里使用示例私钥,实际使用时请替换为您自己的私钥)
  const fromWallet = helpers.wallet.fromPrivateKey(process.env.PRIVATE_KEY);

  // 创建关闭账户的交易指令
  const closeAccountIx = splToken.createCloseAccountInstruction(
    tokenAccount,
    fromWallet.publicKey,
    fromWallet.publicKey,
    [],
    splToken.TOKEN_PROGRAM_ID
  );

  // 创建交易并添加指令
  const transaction = new web3.Transaction().add(closeAccountIx);

  // 发送并确认交易
  try {
    const signature = await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [fromWallet]
    );
    console.log('交易成功,签名:', signature);
  } catch (error) {
    console.error('交易失败:', error);
  }
}

module.exports = {
  retrieve,
}