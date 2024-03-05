import { getOrCreateAssociatedTokenAccount, createTransferInstruction } from "@solana/spl-token";
import { Connection, Keypair, ParsedAccountData, PublicKey, sendAndConfirmTransaction, Transaction, BlockhashWithExpiryBlockHeight } from "@solana/web3.js";
import dotenv from "dotenv"
dotenv.config();

const SOLANA_CONNECTION = new Connection(process.env.RPC_ENDPOINT || '');

const MINT_ADDRESS = 'Lg2rBEfVDS8K56gc3bWrUibQoGwTiCQ9mpmSJ75v75m'; //You must change this value!
const numberDecimals = 8;
const TRANSFER_AMOUNT = 1 * Math.pow(10, numberDecimals);


import secret from './guideSecret.json';
const signer = Keypair.fromSecretKey(new Uint8Array(secret));


async function sendToken(fromAccount: PublicKey, toWallet: PublicKey, latestBlockHash: BlockhashWithExpiryBlockHeight) {
    console.log(`sendToken: ${toWallet.toString()}`);

    let destinationAccount = await getOrCreateAssociatedTokenAccount(
        SOLANA_CONNECTION,
        signer,
        new PublicKey(MINT_ADDRESS),
        new PublicKey(toWallet)
    );

    console.log(`Creating and Sending Transaction`);
    const tx = new Transaction();
    tx.add(createTransferInstruction(
        fromAccount,
        destinationAccount.address,
        signer.publicKey,
        TRANSFER_AMOUNT
    ))

    // const latestBlockHash = await SOLANA_CONNECTION.getLatestBlockhash('confirmed');
    tx.recentBlockhash = latestBlockHash.blockhash;
    const signature = sendAndConfirmTransaction(SOLANA_CONNECTION, tx, [signer]); // no awwait
}

function loadAddresses(): PublicKey[] {
    let addresses = [
        'GSSZb19uq1UKDuWBxsUF5VEbWGEo7NMuBqfeHtyFCp93',
        'GSSZb19uq1UKDuWBxsUF5VEbWGEo7NMuBqfeHtyFCp93'
    ]
    return addresses.map(ele => new PublicKey(ele));
}


async function main() {
    // 1. Getting Source Token Account
    let sourceAccount = await getOrCreateAssociatedTokenAccount(
        SOLANA_CONNECTION,
        signer,
        new PublicKey(MINT_ADDRESS),
        signer.publicKey
    );
    console.log(`Source Account: ${sourceAccount.address.toString()}`);

    // 2. load address
    const addresses = loadAddresses();

    // get latestBlockHash
    const latestBlockHash = await SOLANA_CONNECTION.getLatestBlockhash('confirmed');
    
    for (let address of addresses) {
        sendToken(sourceAccount.address, address, latestBlockHash);
    }
}

main();