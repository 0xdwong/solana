import { Keypair, LAMPORTS_PER_SOL, Connection, PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, createTransferInstruction } from "@solana/spl-token";
import * as fs from 'fs';
import dotenv from "dotenv"
dotenv.config();


import secret from './guideSecret.json';
const signer = Keypair.fromSecretKey(new Uint8Array(secret));
const SOLANA_CONNECTION = new Connection(process.env.RPC_ENDPOINT || '', {
    commitment: "confirmed",
});
const MINT_ADDRESS = 'Lg2rBEfVDS8K56gc3bWrUibQoGwTiCQ9mpmSJ75v75m'; //You must change this value!
console.log('address', signer.publicKey.toString());

async function genAddress() {
    //accunt
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    console.log(`Generated new KeyPair. Wallet PublicKey: `, publicKey);

    let ata = new PublicKey(publicKey);

    try {
        let destinationAccount = await getOrCreateAssociatedTokenAccount(
            SOLANA_CONNECTION,
            signer,
            new PublicKey(MINT_ADDRESS),
            keypair.publicKey
        );
        ata = destinationAccount.address;
    } catch (err) {
        console.log('getOrCreateAssociatedTokenAccount failed:', err)
        return -1;
    }

    fs.writeFile('addresses', `${publicKey}\n`, { encoding: 'utf8', flag: 'a' }, function (err) {
        if (err) throw err;
    });

    fs.writeFile('atas', `${ata.toString()}\n`, { encoding: 'utf8', flag: 'a' }, function (err) {
        if (err) throw err;
    });
}

async function main() {
    for (let i = 0; i < 1518; i++) {
        await genAddress();
    }
}

main();
