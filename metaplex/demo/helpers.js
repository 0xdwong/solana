import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import ed25519 from "ed25519-hd-key";
import bip39 from "bip39";


export function getSignerFromPrivateKey(privateKey) {
    const signer = Keypair.fromSecretKey(bs58.decode(privateKey));
    return signer;
}

export function getSignerFromMnemonic(mnemonic, pwd = '') {
    const seed = bip39.mnemonicToSeedSync(mnemonic, pwd); // (mnemonic, password)
    const derivePath = "m/44'/501'/0'/0'"
    const derivedSeed = ed25519.derivePath(derivePath, seed.toString('hex')).key
    const signer = Keypair.fromSeed(derivedSeed);
    return signer;
}
