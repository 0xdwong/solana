import { Connection, clusterApiUrl, Cluster } from '@solana/web3.js';


export function getConnection(netOrRPC: string = ''): Connection {
    netOrRPC = netOrRPC || process.env.Solana_Cluster || process.env.RPC_ENDPOINT || 'devnet'; // or mainnet-beta | testnet

    if (netOrRPC.startsWith('https')) {
        const rpc = netOrRPC;
        return new Connection(rpc);
    }

    const cluster = netOrRPC;
    return new Connection(clusterApiUrl(cluster as Cluster));
}