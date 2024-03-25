import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { getSignerFromPrivateKey } from './helpers.js'
import dotenv from "dotenv"
dotenv.config();

let signer, metaplex, collectionAddr;

async function init() {
    const cluster = process.env.Solana_Cluster || 'devnet'; // or mainnet-beta | testnet
    const connection = new Connection(clusterApiUrl(cluster));

    let metaplex = new Metaplex(connection);
    return metaplex;
}

async function mint(receiver, nftData) {
    console.log('====mint====', new Date(), receiver)
    const { nft } = await metaplex.nfts().create({
        uri: nftData.uri, //NFT元数据
        name: nftData.name,
        symbol: nftData.symbol,
        tokenOwner: new PublicKey(receiver),
        sellerFeeBasisPoints: 0, // 二次销售版税，默认为250(5%)
        collection: new PublicKey(collectionAddr),
        collectionAuthority: signer, // 验证者，用于验证是否属于该合集，也可在创建 NFT 后再验证
    },
        { commitment: "finalized" }
    );

    console.log('====nft====', receiver, nft.mint.address.toBase58());
    return nft.mint.address.toBase58();
}

async function main() {
    metaplex = await init();

    signer = getSignerFromPrivateKey(process.env.privateKey);
    // 连接 Signer
    metaplex.use(keypairIdentity(signer));

    collectionAddr = ''; // NFT collection address
    const nftData = {
        "uri": "", // NFT collection metadata
        "name": "",
        "symbol": "",
    }
    // add receivers
    const receivers = [

    ];


    let succeeds = [];
    let faileds = []

    for (let receiver of receivers) {
        try {
            await mint(receiver, nftData);
            succeeds.push(receiver);
        } catch (err) {
            faileds.push(receiver);
            console.error(`airdrop to ${receiver} failed`, err.message);
        }
    }

    if (succeeds.length > 0) {
        console.log('airdrop succeed receivers:', succeeds);
    }

    if (faileds.length > 0) {
        console.log('airdrop failed receivers:', faileds);
    }
}

main().then(() => {
    console.log('airdrop finished');
    process.exit(0)
}).catch(err => {
    console.error(err);
    process.exit(1)
})