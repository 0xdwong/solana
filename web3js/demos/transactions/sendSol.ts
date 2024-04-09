import { Transaction, SystemProgram, sendAndConfirmTransaction, PublicKey, } from "@solana/web3.js";
import "dotenv/config"
import { fromPrivateKey } from '../../helpers/wallet'
import { getConnection } from '../../helpers/connection'


async function main() {
    const senderKeypair = fromPrivateKey(process.env.privateKey);
    if (!senderKeypair) {
        console.log('please provide privateKey');
        return;
    }
    console.log('====sender====', senderKeypair.publicKey.toBase58());

    const receiver = new PublicKey('2a5zsjj4Kh7btSacxVKPPyyLYVktte3BBbmPzrwFAE5p');
    const LAMPORTS_TO_SEND = 100000000; //0.1 sol

    const connection = getConnection('devnet');
    const balance = await connection.getBalance(senderKeypair.publicKey);
    console.log('====sender balance====', balance);

    const transaction = new Transaction();
    const sendSolInstruction = SystemProgram.transfer({
        'fromPubkey': senderKeypair.publicKey,
        'toPubkey': receiver,
        'lamports': LAMPORTS_TO_SEND,
    });

    transaction.add(sendSolInstruction);

    const signature = await sendAndConfirmTransaction(connection, transaction, [
        senderKeypair,
    ]);

    console.log(`Finished! Sent ${LAMPORTS_TO_SEND} to the address ${receiver}. \n Transaction signature is ${signature}!`);
}

main();