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

    collectionAddr = 'HHh7Wz9k2psfQbH7zi5nG7fxuZRowMgT3dY1vuc6aEeV'; // change
    const nftData = {
        uri: "https://arweave.net/VpKjuFVYsBCfuej1LU2iuN_u9SN9G4bUTwXGfFjYUSk", // 集合元数据
        name: "My NFT2",
        symbol: "MYNFT2",
    }

    let receivers = [
        // "9nykjZtZcUr4N191X1Lmazpdu1N6qPCHHLRZrMe2uBdK",
        // "HUXKkKQFk5zoqHFpPgXD8KzwBbHbCnfoQmbN4dYxabP2",
        // "CSWniu2CWyVcDXmQ4TcbcjnKWdNs62vaz1pH1ENc9ksh",
        // "5aVux463qnEjaGXLVtmDeg1EMqCtBobkj9DUYzxZfhSX",
        // "HTU7hJMrjjhqEva7zzkNJbbbaGPqEXiiVKGdHgfq5j2X",
        // "33Y5GT3z279Un75WWnHewXfXuiQA22qELCkSdEzHZFSP",
    ];

    for (let receiver of receivers) {
        await mint(receiver, nftData);
    }

}

main().then(() => {
    console.log('succeed');
    process.exit(0)
}).catch(err => {
    console.error(err);
    process.exit(1)
})