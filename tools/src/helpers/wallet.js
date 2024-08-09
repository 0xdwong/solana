const { Keypair } = require("@solana/web3.js");
const ed25519 = require("ed25519-hd-key");
const bip39 = require("bip39");
const {default: bs58} = require("bs58");


function generate() {
    const keypair = Keypair.generate();
    console.log(`The public key is: `, keypair.publicKey.toBase58());

    let privateKeyBytes = Buffer.from(keypair.secretKey);
    let privateKeyStr = privateKeyBytes.toString('hex');
    console.log(`The secret key is: `, privateKeyStr);
}

function fromPrivateKey(privateKey) {
    if (!privateKey) return null;
    // const wallet = Keypair.fromSecretKey(new Uint8Array(Buffer.from(privateKey, 'hex')));
    const wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
    return wallet;
}

function fromMnemonic(mnemonic, pwd = '') {
    const seed = bip39.mnemonicToSeedSync(mnemonic, pwd); // (mnemonic, password)
    const derivePath = "m/44'/501'/0'/0'"
    const derivedSeed = ed25519.derivePath(derivePath, seed.toString('hex')).key
    const wallet = Keypair.fromSeed(derivedSeed);
    return wallet;
}


module.exports = {
    generate,
    fromPrivateKey,
    fromMnemonic,
}