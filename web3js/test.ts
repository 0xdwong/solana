import dotenv from "dotenv"
dotenv.config();
import * as helpers from "./helpers"


async function main() {
    let result = await helpers.getTokenAccountBalance('D9cSbavNnVA6VhuswpbcTDMgsvqPwg1xHLaSeAJz4YAU');
    
    console.log('==result==', result);
}

main().then(() => {
    console.log('done');
    process.exit(0)
}).catch(err => {
    console.error(err);
    process.exit(1)
})