const { Connection, clusterApiUrl, Cluster } = require('@solana/web3.js');


function getConnection(netOrRPC, status = 'finalized') {
    netOrRPC = netOrRPC || process.env.Solana_Cluster || process.env.RPC_ENDPOINT || 'devnet'; // or mainnet-beta | testnet

    if (netOrRPC.startsWith('https')) {
        const rpc = netOrRPC;
        return new Connection(rpc);
    }

    const cluster = netOrRPC;
    const connection = new Connection(clusterApiUrl(cluster), status);
    // console.log('==rpcEndpoint==', connection.rpcEndpoint);
    return connection
}

module.exports = {
    getConnection,
}