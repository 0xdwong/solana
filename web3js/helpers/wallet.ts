import { Keypair } from "@solana/web3.js";
import * as ed25519 from "ed25519-hd-key";
import * as bip39 from "bip39";

export function generate() {
    const keypair = Keypair.generate();
    console.log(`The public key is: `, keypair.publicKey.toBase58());

    let privateKeyBytes: Buffer = Buffer.from(keypair.secretKey);
    let privateKeyStr: string = privateKeyBytes.toString('hex');
    console.log(`The secret key is: `, privateKeyStr);
}

export function fromPrivateKey(privateKey: string | undefined) {
    if (!privateKey) return null;
    const wallet = Keypair.fromSecretKey(new Uint8Array(Buffer.from(privateKey, 'hex')));
    return wallet;
}

export function fromMnemonic(mnemonic: string, pwd = '') {
    const seed = bip39.mnemonicToSeedSync(mnemonic, pwd); // (mnemonic, password)
    const derivePath = "m/44'/501'/0'/0'"
    const derivedSeed = ed25519.derivePath(derivePath, seed.toString('hex')).key
    const wallet = Keypair.fromSeed(derivedSeed);
    return wallet;
}
