# How to Fetch Newly Minted Tokens with Helius

## **Introduction**

Solana memecoins have been making headlines lately, with [$WIF breaking $3.5 billion](https://x.com/DegenerateNews/status/1773433976746565802?s=20) and [Boden reaching $300 million](https://x.com/DegenerateNews/status/1773439634313208311?s=20). [Popcat](https://x.com/DegenerateNews/status/1773302167983583279?s=20) and [Wen](https://x.com/DegenerateNews/status/1772800622149943721?s=20) recently surpassed the $350 million mark. [Slerf](https://www.coindesk.com/markets/2024/03/19/solana-meme-coin-slerf-clocks-higher-trading-volume-than-all-of-ethereum/) has also surpassed all Ethereum-based exchanges in trading volume within its first day. After [BONK's boom](https://decrypt.co/206788/bonk-goes-boom-solana-meme-token-soars-1700-30-days-hit-all-time-high) last November, Solana sees more new tokens being created than ever. There has been a double increase in the number of new tokens minted on-chain over the past three months using the Solana Program Library (SPL) Standard, as seen from [Solscan data](https://analytics.solscan.io/overview). 

![Source: Real-time newly minted SPL Tokens data by Solcan](https://assets-global.website-files.com/641ba798c17bb180d832b666/660c30ba320730a0fe173e70_l-ntMgJhclCxcADpdg6plKCQK2yQP79ZCU4ET7ZOY2A43ZTqEo4bJOWGSKbfJLdfIkhQ0meyxUfxZNKbzHHrkk_ryb9hB9cBvoP6nkNlMmMDgt03zZA2tDsDJ7hDYRUhCIm8RUQyxegU1Ti9VBQLsu4.png)

Source:[ ](https://www.umbraresearch.xyz/writings/mev-on-solana#value-capture)Real-time newly minted SPL Tokens data by [Solscan](https://analytics.solscan.io/overview)

This article explores how tokens are created on Solana, what SPL tokens are, and how to monitor new tokens and retrieve their metadata using Helius.

## **How are Tokens Created on Solana?**

Solana supports both native SOL and other tokens. The [Solana Program Library (SPL)](https://spl.solana.com/) defines common standards for fungible and non-fungible tokens (NFTs) on Solana. Unlike Ethereum, where different standards are set for different types of non-fungible ([ERC-721](https://ethereum.org/en/developers/docs/standards/tokens/erc-721/)) and fungible tokens ([ERC-20](https://ethereum.org/en/developers/docs/standards/tokens/erc-20/)), the Solana Program Library doesn’t have a specially computed standard for the different token types. 

### **Token Program**

The standard implementation for fungible and non-fungible tokens (NFTs) on Solana is [Token Program](https://spl.solana.com/token). It provides functionality such as creating new token types and accounts, transferring and burning tokens, and [more](https://spl.solana.com/token#operational-overview). The Token program is [complete](https://spl.solana.com/token#status), and no plans exist to add new functionality. There may be changes to fix important/breaking bugs.

However, the Token Program is limited— developers must fork it to add new functionality, making transactions more complicated and risky. To address this, Solana introduced [Token-2022](https://spl.solana.com/token-2022), a suite of additional features and enhancements like:

1.  **Mint Extensions**: confidential transfers, transfer fees, closing mint, interest-bearing tokens, non-transferable tokens, permanent delegate, transfer hook, metadata pointer, metadata.
2. **Account Extensions**: memo required on incoming transfers, immutable ownership, default account state, CPI guard. 

To learn more about Token-2022, refer to this [article](https://www.helius.dev/blog/plug-and-play-token-extensions).

Solana's Token Program allows us to create mint accounts and token accounts. Mint accounts contain global information about a token, while token accounts store the relationship between a wallet and a mint account. You can create tokens using the following [code or the spl-token-cli](https://spl.solana.com/token#reference-guide). For example, run this command in the command line to create a fungible token, provided [spl-token-cli](https://spl.solana.com/token#setup) is installed:

```bash
spl-token create-tokenCopy
```

### **Token Metadata Program**

The mint accounts contain certain data attributes such as the current token supply. However, they lack standardized data such as name and symbol. To solve this, [Metaplex](https://developers.metaplex.com/) introduced the [Token Metadata Program](https://developers.metaplex.com/token-metadata). This program allows additional data to be attached to fungible and non-fungible tokens using [PDAs (Program Derived Addresses)](https://solanacookbook.com/core-concepts/pdas.html#facts) derived from the mint address.

![Source: Account Structure created by Token Metadata Program by Metaplex](https://assets-global.website-files.com/641ba798c17bb180d832b666/660c30bb4423689c8dc5986e_wk-Cfl-GU9X5qCvHIgwrj9qBeIyDWbPbds9GlRAu3nHIo_92foOoBkQxylt8CtJXu9OOyug9wWJTB9uzm2nvZCI7uhBNDPoxC9sF3OTI6YTeuuXeWEJqJVC-ElXCR1XfAX8yMZM5bwMlI-4hpH_rbro.png)

Source: Account Structure created by Token Metadata Program by [Metaplex](https://developers.metaplex.com/token-metadata)

The Token Metadata program was initially created to simplify creating NFTs on Solana. However, it also works with [SFTs](https://developers.metaplex.com/token-metadata#semi-fungible-tokens), which are semi-fungible tokens. SFTs combine the characteristics of both fungible and non-fungible tokens. They behave like fungible tokens initially, meaning they can be exchanged with identical tokens without losing value for either party.  

After being used, they lose their exchange value and gain the attributes of collectible non-fungible tokens. SFTs operate as a unique type of account to which metadata is attached to represent characteristics in a game or metaverse environment. 
SFTs are preferred over NFTs in certain contexts due to their efficiency, cost-effectiveness, flexibility, and improved transaction security.

The Token Metadata program also supports [Programmable NFTs (pNFTs)](https://developers.metaplex.com/token-metadata/pnfts). This new asset standard allows creators to define custom rules on specific operations and delegate more granularly to third-party authorities. The pNFT's token account is always frozen on the SPL token program, regardless of whether the pNFT is delegated. 

This ensures that no one can bypass the Token Metadata program by interacting with the SPL Token program directly.

## **Monitor New Tokens** 

To monitor newly minted Tokens, we’ll set up a [webhook](https://docs.helius.dev/webhooks-and-websockets/what-are-webhooks). Webhooks allow you to listen to on-chain events and trigger specific actions when these events occur. We’ll configure our webhook to listen to the **TOKEN_MINT** transaction type from the [Token Metadata Program](https://developers.metaplex.com/token-metadata). The sources currently supported for this transaction type are (other sources will be tagged as **“UNKNOWN”**): 

```javascript
 "TOKEN_MINT": [   "CANDY_MACHINE_V1",   "ATADIA",   "SOLANA_PROGRAM_LIBRARY" ]Copy
```

Webhooks can be created using the [Helius Dashboard](https://dev.helius.xyz/dashboard/app), or be coded using [the API reference](https://dev.helius.xyz/dashboard/app). To create one via the [Dashboard](https://dev.helius.xyz/), go to the **Webhooks** section in the left panel and click **New Webhook**. Then, configure the webhook by providing details such as:

1. **Network:** Mainnet/Devnet
2. **Webhook Type**: You can select either Enhanced/Raw/Discord. If you choose Discord, you must submit the Webhook URL, and your notification will be formatted and sent directly by the bot. You can refer to the steps to get the Webhook URL for a Discord bot [here](https://dev.helius.xyz/). If you select Raw, you won’t be able to specify the transaction type. 
3. **Transaction Type:** Select **TOKEN_MINT** to listen to newly minted tokens*.* You can find other transaction types supported by a Program [here](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks). 
4. **Webhook URL:** Add the endpoint that will listen to the notifications (e.g., Discord Bot, Website, etc.) 
5. **Authentication Header:** Enter an authentication header to pass the POST requests to your webhook. Note that this is optional.
6. **Account Address:** Add Token Metadata Program Address here: **metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s**. For other cases, you can add more than one account address if required. You can include their address if you wish to hear from a particular user in the transaction.

![Webhook setup to listen to new token mints](https://assets-global.website-files.com/641ba798c17bb180d832b666/660c30bbaa537601b89a3f03_StmUeJxPj66mcc4IvIW7GMvvyjgooCQ61M_kWSYEth8CLDUyTcbN8HLWsPV-0nDmLQpk2wIMCk-0RsySRtkeyKO21zMhcA-cFkUE-GtQ0ZAKc0CK8-gxy7ycfSOjrrgrBzFnIro-WdPHyCYcdJHMxAI.png)

Webhook setup to listen to new token mints

Once confirmed, your webhook is ready to use, and you can build the appropriate frontend based on your **Webhook URL**. Here, we selected **Discord** as the **Webhook Type** and provided the **Webhook URL** of a Discord bot, so we don’t need to code the Discord Bot. We will receive notifications like this: 

![Notification sent by Discord Bot on new token mint](https://assets-global.website-files.com/641ba798c17bb180d832b666/660c30baaa33dda7f308c073_RqC6nilAG53cWMkx65Ia_vleqtgVlT1P6CfNKppCP52n7jY8CBNydxCAbLqkQ2flMY3Q1r_xHf3j1ErHOBTBhQMNOPtvu2oI3H-Sk-S4b1Xa1QbnMoDuOpzx8R9prNjCX692PcSaF8PUHYyQ0JlvV5c.png)

Notification sent by Discord Bot on new token mint

## **Retrieve Token Metadata**

You can use the token ID (mint address of the token) to obtain metadata of a particular token. Parse the JSON notification sent via **Enhanced webhook** (when the webhook type is set to Enhanced). The Mint Address can be found in the "mint" field within the first object of the transferTokens array. Once you have the token ID, you can use the [getAsset](https://docs.helius.dev/compression-and-das-api/digital-asset-standard-das-api/get-asset) method provided by the [DAS API](https://docs.helius.dev/compression-and-das-api/digital-asset-standard-das-api) to retrieve additional information about the token. 

For instance, you can use the [getAsset](https://docs.helius.dev/compression-and-das-api/digital-asset-standard-das-api/get-asset) method to obtain information about Jito Staked SOL (JitoSOL):

```javascript
解释

const url = `https://mainnet.helius-rpc.com/?api-key=<api_key>`

const getAsset = async () => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'my-id',
      method: 'getAsset',
      params: {
        id: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
        displayOptions: {
	    showFungible: true //return details about a fungible token
	}
      },
    }),
  });
  const { result } = await response.json();
  console.log("Asset: ", result);
};
getAsset();Copy
```

You can find more examples and a complete schema for the request and response of this method in our [documentation](https://docs.helius.dev/compression-and-das-api/digital-asset-standard-das-api/get-asset).

## **Conclusion**

In this article, we learned how tokens are created on Solana, what SPL tokens are, and how to monitor new tokens by setting up a webhook and fetching their metadata via Helius. If you need any help or support, don't hesitate to contact us on [Discord](https://discord.gg/raeYgMjtDB)!

Be sure to enter your email address below so you’ll never miss an update about what’s new on Solana. Ready to dive deeper? Explore the latest articles on the[ Helius blog](https://www.helius.dev/blog) and continue your Solana journey, today.

## **Resources**

- [Token-2022 Program](https://spl.solana.com/token-2022)
- [Token Metadata Program](https://developers.metaplex.com/token-metadata)
- [Creating a Webhook](https://docs.helius.dev/webhooks-and-websockets/api-reference/create-webhook)
- [DAS API](https://docs.helius.dev/compression-and-das-api/digital-asset-standard-das-api)