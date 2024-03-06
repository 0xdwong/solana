import { getOrCreateAssociatedTokenAccount, createTransferInstruction } from "@solana/spl-token";
import { Connection, Keypair, ParsedAccountData, PublicKey, sendAndConfirmTransaction, Transaction, BlockhashWithExpiryBlockHeight } from "@solana/web3.js";
import * as fs from 'fs';
import dotenv from "dotenv"
dotenv.config();

const SOLANA_CONNECTION = new Connection(process.env.RPC_ENDPOINT || '');

const MINT_ADDRESS = 'Lg2rBEfVDS8K56gc3bWrUibQoGwTiCQ9mpmSJ75v75m'; //You must change this value!
const numberDecimals = 8;
const TRANSFER_AMOUNT = 1 * Math.pow(10, numberDecimals);

import secret from './guideSecret.json';
const signer = Keypair.fromSecretKey(new Uint8Array(secret));
const fromAccount = new PublicKey('6nBDRReNqnGcs9VeppxaYLXEuKSmoNc9TexvcqkkGWea');

async function sendTokenToMulti(receivers: String[], latestBlockHash: BlockhashWithExpiryBlockHeight) {

    console.log(`Creating and Sending Transaction`);
    const tx = new Transaction();

    for (let receiver of receivers) {
        tx.add(createTransferInstruction(
            fromAccount,
            new PublicKey(receiver),
            signer.publicKey,
            TRANSFER_AMOUNT
        ))
    }

    // const latestBlockHash = await SOLANA_CONNECTION.getLatestBlockhash('confirmed');
    tx.recentBlockhash = latestBlockHash.blockhash;
    const signature = await sendAndConfirmTransaction(SOLANA_CONNECTION, tx, [signer]); // no awwait
    console.log(signature);
}

function loadReceivers(): String[] {
    let receivers = [];
    try {
        const data = fs.readFileSync('atas', 'utf8');
        const lines = data.split('\n');
        for (let line of lines) {
            if (line) receivers.push(line);
        }
    } catch (err) {
        console.error(err);
    }

    return receivers;
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function chunkArray(myArray: String[], chunk_size: number): String[][] {
    let index = 0;
    const arrayLength = myArray.length;
    let tempArray: String[][] = [];

    for (index = 0; index < arrayLength; index += chunk_size) {
        let myChunk = myArray.slice(index, index + chunk_size);
        tempArray.push(myChunk);
    }

    return tempArray;
}

async function main() {
    // load address
    let addresses = loadReceivers();

    // get latestBlockHash
    const latestBlockHash = await SOLANA_CONNECTION.getLatestBlockhash('confirmed');

    // addresses = addresses.slice(0, 22)
    let chunks = chunkArray(addresses, 22);

    let start = new Date().getTime();
    for (let chunk of chunks) {
        let now = new Date().getTime();
        console.log('ssss', now - start);
        if (now - start >= 10 * 1000) {
            break;
        }
        await sleep(100);
        console.log(chunk);
        sendTokenToMulti(chunk, latestBlockHash);
    }
}

main();