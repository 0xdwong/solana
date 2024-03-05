import { Keypair, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import * as fs from 'fs';
import dotenv from "dotenv"
dotenv.config();

function genAddress(){
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString()
    console.log(`Generated new KeyPair. Wallet PublicKey: `, publicKey);
    
    fs.writeFile('addresses', `${publicKey}\n`,  { encoding: 'utf8', flag: 'a' },function(err) {
        if (err) throw err;
    });
}


for(let i = 0; i < 10000;i++){
    genAddress();
}