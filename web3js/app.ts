import { getOrCreateAssociatedTokenAccount, createTransferInstruction } from "@solana/spl-token";
import { Connection, Keypair, ParsedAccountData, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import bs58 from 'bs58';
import dotenv from "dotenv"
dotenv.config();

const SOLANA_CONNECTION = new Connection(process.env.RPC_ENDPOINT || '');

const DESTINATION_WALLET = 'GSSZb19uq1UKDuWBxsUF5VEbWGEo7NMuBqfeHtyFCp93';
const MINT_ADDRESS = 'Lg2rBEfVDS8K56gc3bWrUibQoGwTiCQ9mpmSJ75v75m'; //You must change this value!
const TRANSFER_AMOUNT = 1;
const numberDecimals = 8;

import secret from './guideSecret.json';
// const userWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secret));
const signer = Keypair.fromSecretKey(new Uint8Array(secret));


async function sendTokens() {
    console.log(`Sending ${TRANSFER_AMOUNT} ${(MINT_ADDRESS)} from ${(signer.publicKey.toString())} to ${(DESTINATION_WALLET)}.`)
    //Step 1
    console.log(`1 - Getting Source Token Account`);
    let sourceAccount = await getOrCreateAssociatedTokenAccount(
        SOLANA_CONNECTION,
        signer,
        new PublicKey(MINT_ADDRESS),
        signer.publicKey
    );
    console.log(`Source Account: ${sourceAccount.address.toString()}`);

    //Step 2
    console.log(`2 - Getting Destination Token Account`);
    let destinationAccount = await getOrCreateAssociatedTokenAccount(
        SOLANA_CONNECTION,
        signer,
        new PublicKey(MINT_ADDRESS),
        new PublicKey(DESTINATION_WALLET)
    );
    console.log(`Destination Account: ${destinationAccount.address.toString()}`);


    //Step 3
    console.log(`3 - Creating and Sending Transaction`);
    const tx = new Transaction();
    tx.add(createTransferInstruction(
        sourceAccount.address,
        destinationAccount.address,
        signer.publicKey,
        TRANSFER_AMOUNT * Math.pow(10, numberDecimals)
    ))

    const latestBlockHash = await SOLANA_CONNECTION.getLatestBlockhash('confirmed');
    tx.recentBlockhash = latestBlockHash.blockhash;
    const signature = await sendAndConfirmTransaction(SOLANA_CONNECTION, tx, [signer]);
    console.log(
        '\x1b[32m', //Green Text
        `   Transaction Success!🎉`,
        `\n    https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );
}

sendTokens();