# Solana MEV: An Introduction

*Note: The MEV landscape on Solana is rapidly changing. This page will be updated periodically with new developments.*

## Takeaways

This post aims to provide a baseline understanding of how MEV on Solana works. In short:

- MEV on Solana is not dead.
- Not all MEV is bad.
- Profitable frontrunning is possible across DEX liquidity venues structures, not just AMMs.
- Solana’s continuous block production and lack of an in-protocol mempool changes the default behavior and social dynamics of the chain.
- Someone else may fork or try to otherwise replicate Jito’s out-of-protocol mempool to extract more MEV, but it is hard both technically and socially.
- Many validators support the decision to remove the Jito mempool, foregoing sandwiching revenue, in favor of the long-term growth and health of Solana.

## Introduction

In a [Proof-of-Stake network](https://www.helius.dev/blog/proof-of-history-proof-of-stake-proof-of-work-explained#what’s-proof-of-stake), when you are assigned leader of a given block, you have the authority to determine the contents of your assigned block. Maximal Extractable Value (MEV) refers to any value derived from adding, removing, or reordering the transactions within a given block.

As activity and general interest have been increasing on Solana, MEV is becoming an [increasingly discussed topic](https://x.com/aajxbt/status/1765512478316793865?s=20). On January 10, 2024, a searcher tipped a validator 890 SOL, one of the largest tips in Jito’s history:

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/65f0d50566f7d49d07b48169_JvrhKTtMLmgWAQeclWGkSzfLON1uJP-6ywj4BUEivVgkoM1ng7YVZXOyfL4IC1FjgTDmH6zw7sIc2cpkFzS-icitI3Y2NAD4aMNBFP_Zqwuu4gsYl_cqEBR1xUuod63d9En7j-1kIDh5WBeN0hwQDhg.png)

[Source](https://explorer.jito.wtf/bundle/7d2f02a0542fd3950d90c9bd8ca84d233e28f0298d9f002c7e3cc0959b72b24f)

The week up to March 12, 2024, saw Solana validators earn in excess of $7 million in Jito tips for blockspace inclusion on Solana. Today, over 50% of Solana transactions are on failed arbitrages (spam), which are positive expected value as transaction costs are so low. 
Traders profit by making these types of trades over the long run.

## Solana’s MEV Structure

### Overview

[MEV on Solana](https://www.umbraresearch.xyz/writings/mev-on-solana) looks different from other chains, with a strong incentive for searchers to run their own nodes and/or integrate and co-locate with high-staked nodes for the most up-to-date view of the chain (as Solana is latency-sensitive). 
This is due to Solana’s continuous state updates and stake-weighted mechanisms such as [Turbine](https://www.helius.dev/blog/turbine-block-propagation-on-solana) (for reading updated state) and stake-weighted QoS (for writing new state).

One of the most notable differences is the absence of a conventional mempool as commonly found on other chains such as Ethereum.

Solana’s continuous block production, without any add-on or out-of-protocol auctions/mechanisms, reduces the surface area for certain types of MEV (particularly front-running).

### MEV transactions

MEV opportunities arise across different categories. The following are some common types of MEV transactions that exist on Solana today:

- **NFT Minting**: MEV from NFT minting occurs when participants attempt to secure rare or valuable non-fungible tokens (NFTs) during public minting events (both for “blue-chip” and long-tail NFTs).
  The nature of NFT minting events is characterized by sudden increases, with block x-1 having no NFT MEV opportunity and block x having a large MEV opportunity. Block x here refers to the block when the mint went live.
  These NFT mint/IDO mechanics were one of the first sources of large-scale congestion spikes that caused Solana to temporarily halt block production in 2021/2022.
- **Liquidations**: When borrowers fail to maintain the required [collateralization](https://www.investopedia.com/terms/c/collateralization.asp) ratio for their loans, their positions become eligible for liquidation. Searchers scan the blockchain for such undercollateralized positions and execute liquidations to repay part or all of the debt, receiving a portion of the collateral as a reward.
  Liquidations occur in protocols that utilize both tokens and NFTs as collateral. Liquidations are necessary for protocols to stay solvent and are beneficial for the broader ecosystem.
- **Arbitrage**: Arbitrage involves taking advantage of price discrepancies of the same asset across different markets or platforms. These arbitrage opportunities exist intra-chain, inter-chain, and between CEXes and DEXes.
  Intra-chain arbitrage is currently the only form of arbitrage that guarantees atomicity as both legs execute on the same chain, as intra-chain arbitrage requires additional trust assumptions.
  Arbitrage keeps prices in line, as long as it does not result in the increase in toxic order flow.

### Jito

[Jito](https://www.jito.wtf/) is an out-of-protocol blockspace auction for partial blocks, unlike MEV-boost where full blocks are built (Jito and mev-geth are similar in spirit but greatly differ in implementation). Jito offers off-chain inclusion guarantees of a specific set of transactions called [bundles](https://jito-labs.gitbook.io/mev/searcher-resources/bundles). Bundles are executed sequentially and atomically – all-or-nothing. Searchers submit bundles with guaranteed on-chain execution should they win the auction and pay the minimum tip of 10,000 lamports. Jito tips exist out-of-protocol and are separate from in-protocol [priority fees](https://www.helius.dev/blog/priority-fees-understanding-solanas-transaction-fee-mechanics).

This approach aims to reduce spam and enhance the efficiency of Solana’s compute resources by running the auctions off-chain, only posting the single winner of the auction into the block via a guaranteed bundle. 
A searcher may use a bundle for one or both of the following properties: fast, guaranteed inclusion and bidding for frontrun/backrun opportunities. 
This is particularly important considering that a significant portion of the network’s compute resources are currently consumed by unsuccessful transactions.

### Mempool

Unlike Ethereum, Solana does not have a native in-protocol mempool. Jito’s [now-deprecated ](https://x.com/jito_labs/status/1766228889888514501?s=20)mempool service effectively created a [canonical out-of-protocol mempool](https://twitter.com/dubbel06/status/1766337915448099294), as ~65% of validators run the Jito-Solana client (over the native Solana-Labs client).

When live, transactions would reside in Jito’s pseudo-mempool for 200 ms. During this window, searchers could bid on opportunities to front-run/sandwich/backrun pending transactions, with the highest-paying bundles being forwarded to the validator for execution. 
Sandwiching represented a significant portion of MEV income, as measured in tips paid to validators.

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/65f0d5052a31fa3e35251431_QdM1mGPFSwjXclj-ZrTgwGGNHnpRM5Ehf2uloPH58Em0WF1ikmB5quIL7ph6HaRnMAxhPVRujuh0tZrvYLQTlVMB8aG2EKus9Xf8B-eVxc72d2wgmjPz1XHX5oBtugMERr-kJErKtqIudbjXafOK7nc.png)

[Jito’s mempool service (which enables sandwiching) closed down on March 8](https://explorer.jito.wtf/)

Nobody likes talking about sandwiching (especially on Ethereum) because it imposes a strict negative externality on the end-trader – this user gets filled at the worst possible price. For reference, [~$24 million in profits](https://eigenphi.io/mev/ethereum/sandwich) (according to EigenPhi) have been made from sandwiching alone on Ethereum over the past 30 days. 
When users set a maximum slippage (the amount of variation around a certain value that the user agrees to before sending the transaction), they were almost always getting filled at that price. 
In other words, a user’s expected slippage was almost always equal to their max slippage, should the order become filled.

Jito searchers can still submit bundles for other types of MEV transactions that do not rely on MempoolStream such as arbitrage and liquidation transactions (which require observing the transaction in a block and capturing the opportunity in the next Jito auction).

### Supply Chain

For reference, the current Ethereum block building supply chain looks like the following:

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/65f0d50587476cabe4b677e1_mF-TT9l_Rr4xSv5qH-BIzOOfpyj4keqKIBiRsIc6bpeORexuhwCwcnvEcUjUrNWVAXOAyGopJkT-mvxUKVlvzb5RyKmTZeJNf6KbXdxmkXiXXX8_EFKTceg9Q5vFEQ0ExXD8NFlstQLGekzXMBe_948.png)

[Flashbots](https://docs.flashbots.net/flashbots-mev-boost/introduction)

On Solana – for validators running the Jito-Solana client – the block-building supply chain looks like the following:

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/65f1e1edd65d38a35f325fad_MEV-Diagram.jpg)

- **Incoming Transactions**: The current pre-scheduled state of transactions pending execution. This can originate from RPCs, other validators, private orderflow, or other sources.
- **Relayers**: Relayers on Solana are different from Ethereum. On Ethereum, relayers are trusted entities for connecting block builders and proposers (builders trust the relay not to modify their blocks).
  On Solana, relayers are responsible for relaying incoming transactions, performing limited TPU operations such as packet deduplication and signature verification. Relayers forward packets to both the Block Engine and the validator.
  The equivalent is not necessary on Ethereum because Ethereum has a mempool, while Solana does not.

The relayer logic is [open source](https://github.com/jito-foundation/jito-relayer/tree/master) allowing anyone to run their own relayer (Jito runs instances of relayers as a public good). Other known Solana network participants also run their own relayers.

- **Block Engine**: The Block Engine simulates transaction combinations and runs the off-chain blockspace auction. MEV-maximizing bundles are then forwarded to the leader running the Jito-Solana client.
- **Searchers**: Searchers seek to exploit price discrepancies and other opportunities by inserting their own transactions into a given block. They can utilize sources such as Jito’s [ShredStream](https://jito-labs.gitbook.io/mev/searcher-services/shredstream) (as well as MempoolStream previously) or source their own up-to-date information.
- **Validators**: Validators build and produce blocks. Jito-Solana blocks are built with the scheduler reserving 3M CUs for transactions routed via Jito for the first 80% of the block.

These parties may not necessarily be separate entities, as entities can be vertically integrated. As noted previously, validators have full authority over their blocks. 
Validators themselves can search for economic opportunities by inserting, reordering, and censoring transactions of a given block when they are the leader.

Searchers can also submit transactions via RPC methods (standard in-protocol routing), regardless of whether or not the leader is running Jito-Solana. Because of Solana’s relatively [low fees](https://www.helius.dev/blog/solana-fees-in-theory-and-practice) and scheduler indeterminism, spamming transactions is still a common method of capturing MEV opportunities. Certain MEV opportunities can exist longer than expected, on the order of one to tens of blocks.

### MEV Distribution Among Participants

While Solana enables faster transaction execution and reduces the surface for certain types of MEV, it can exacerbate the potential for latency-driven centralization, where validators and searchers seek to co-locate their infrastructure to gain a competitive edge. 
We are far from any competitive, stable equilibrium with infrastructure and relevant mechanisms changing rapidly.

‍

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/65f0d5056836860546726d7a_pJf7vAimzfxMQ3hB9Mfnj8FO1ewHaCbocO_C_LiP9kLo0typD4rFGvZHNL8_XqdH9eTDGtHgCQA9CkDqjDH2-WEKatd8qwtDh1sc4wGDug_A7W94sM1RlLpOwZlSnMYdc_twzdK_LDX8RR5-gH70s7s.png)

https://x.com/aeyakovenko/status/1741298436035776681?s=20

In a world with sub-200ms block times, this provides a comparative advantage to sophisticated actors with the infrastructure and expertise to optimize systems (where many learnings can be drawn from high-frequency trading). 
Thus far, Ethereum has strayed away from this equilibrium, creating out-of-protocol solutions to democratize the opportunities for searchers to be competitive (at least in Ethereum’s current state of UX, prices, oligopolistic block building regime, and additional out-of-protocol trust assumptions).

## Reducing the MEV Surface Area

General-purpose out-of-protocol mechanisms are finding their way to protocols to reduce the MEV surface area on-chain. Such mechanisms include:

1. **RFQ systems**: [RFQ (Request-for-Quote) systems](https://messari.io/report/hashflow-certainty-in-execution) such as [Hashflow](https://www.hashflow.com/) have been finding their way onto Solana and are increasing in popularity (with cumulative volume over $10 billion across ecosystems).
   Orders are fulfilled by professional market makers (Wintermute, Jump Crypto, GSR, LedgerPrime) rather than via an on-chain AMM or orderbook, with signature-based pricing allowing for off-chain computation.
   This effectively moves all price discovery off-chain, with only the filled transfer transaction landing on-chain.
2. **MEV-protected RPC endpoints**: These endpoints allow users to receive a portion of the proceeds derived from their order flow as rebates. Searchers bid for the right to backrun your transaction and bid an associated rebate, which gets paid back to the user (less any fees).
   Such endpoints are typically governed by trusting the counterparty running the endpoint to ensure that no front-running or sandwiching is occurring.

MEV mitigation/redistribution mechanisms exist as some combination of the user capturing some value from their order flow to shifting the price discovery auction and relevant mechanisms off-chain. 
These mechanisms involve trade-offs among crypto properties such as censorship resistance, auditability, and trustlessness.

## Conclusion

This piece has covered the primary participants of the MEV supply chain on Solana and its most recent developments. Additionally, this piece has covered the common forms of MEV on Solana and the anatomy of an MEV transaction.

Significant resources have been allocated to studying and researching the effects of different MEV mitigation/reallocation mechanisms. Ethereum has spent a lot of resources on infrastructure leading to [Flashbots](https://www.flashbots.net/), which aims to provide democratized access to MEV opportunities but also imposes other design and arguably negative externalities on the chain. 

Solana has the opportunity to explore new models on the MEV and block production supply chain frontier.

‍

Thanks to [Dubbel06](https://twitter.com/dubbel06) (Overclock), [Lucas](https://twitter.com/buffalu__) (Jito), and [Eugene](https://twitter.com/0xShitTrader) (Ellipsis) for feedback and review.