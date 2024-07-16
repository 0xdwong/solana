const Web3 = require('@solana/web3.js');
import { getConnection } from '../helpers/connection'


async function main() {
    let pubkey = new Web3.PublicKey('4ArpC7zEgL4WDPNJYYAjZanA8TJodG7VkmiE5DHEyiJT');
    const connection = getConnection('mainnet-beta');
    const balance = await connection.getBalance(pubkey);
    console.log('====balance====', balance);
}

main();