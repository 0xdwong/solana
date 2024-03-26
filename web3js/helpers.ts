import { Connection, PublicKey, clusterApiUrl, Cluster } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";


export function getConnection(netOrRPC: string = ''):Connection {
    netOrRPC = netOrRPC || process.env.Solana_Cluster || process.env.RPC_ENDPOINT || 'devnet'; // or mainnet-beta | testnet

    if(netOrRPC.startsWith('https')){
        const rpc = netOrRPC;
        return  new Connection(rpc);
    }

    const cluster = netOrRPC;
    return new Connection(clusterApiUrl(cluster as Cluster));
}

export async function getTokenBalance(address: string | PublicKey, token: string | PublicKey,): Promise<Number> {
    const connection = getConnection();
    try {

        const ata = await getAssociatedTokenAddress(
            new PublicKey(token),
            new PublicKey(address),
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const info = await connection.getTokenAccountBalance(new PublicKey(ata));
        if (info.value.uiAmount == null) return 0;
        return info.value.uiAmount;
    } catch (err) {
        return NaN;
    }
}

export async function getTokenAccountBalance(ata: string | PublicKey): Promise<Number> {
    const connection = getConnection();
    try {
        const info = await connection.getTokenAccountBalance(new PublicKey(ata));
        if (info.value.uiAmount == null) return 0;
        return info.value.uiAmount;
    } catch (err) {
        console.error('getTokenAccountBalance failed', err);
        return NaN;
    }
}

