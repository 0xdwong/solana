import dotenv from "dotenv"
dotenv.config();
import * as helpers from "./helpers"


async function main() {
    let result;

    // ata balance
    result = await helpers.getTokenAccountBalance('');

    // someone's token balance
    result = await helpers.getTokenBalance('', '');

    console.log('==result==', result);
}

main().then(() => {
    console.log('done');
    process.exit(0)
}).catch(err => {
    console.error(err);
    process.exit(1)
})