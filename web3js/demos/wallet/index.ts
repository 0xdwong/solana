import * as wallet from '../../helpers/wallet'

async function main() {
    let r: any;

    r = wallet.generate();
    console.log('publicKey', r.publicKey.toBase58());

    r = wallet.fromPrivateKey('f5c8f8af14b62fdd97001673efd569855ed9c20373ca178bacfe1c3a316affb5989dae83ff954eeecc3b14983bd02483f7bfc0d7bafe5e750b855ae625ab2a57')
    console.log('publicKey', r.publicKey.toBase58());

    r = wallet.fromMnemonic('number stereo three scatter gate normal couple box sheriff mom wing brass')
    console.log('publicKey', r.publicKey.toBase58());
}

main();
