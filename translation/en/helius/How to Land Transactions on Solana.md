Solana has been experiencing unprecedented volume lately, causing a high rate of failed or dropped transactions. The network's transactions per second (TPS) is around [2000-3000](https://solscan.io/analytics#networks), of which roughly 800-900 are non-vote transactions. [Quinn](https://quinn-rs.github.io/quinn/networking-introduction.html) (rust implementation of [networking layer - QUIC](https://www.helius.dev/blog/all-you-need-to-know-about-solana-and-quic)) has limitations in effectively handling spam during high-demand scenarios, which can result in block leaders having to drop connections selectively. Out of all the failed transactions, [approximately 8% were initiated by actual users, while the rest were arbitrary transactions by bots](https://x.com/_nishil_/status/1777048361729994777).

Understanding how transactions are submitted and processed on Solana is essential for handling failed transactions. This article delves into possible causes of transaction failure and recommends best practices for increasing transaction throughput. This article assumes a basic understanding of [Solana's programming model](https://www.helius.dev/blog/the-solana-programming-model-an-introduction-to-developing-on-solana) and creating and [sending transactions](https://solanacookbook.com/references/basic-transactions.html#how-to-send-sol).

## **Transactions**

Program execution begins with a [transaction](https://www.helius.dev/blog/the-solana-programming-model-an-introduction-to-developing-on-solana#what-are-transactions) submitted to the [cluster](https://www.helius.dev/blog/the-solana-programming-model-an-introduction-to-developing-on-solana#what-are-solana-clusters). A transaction contains:

*   An array of all accounts it intends to read from or write to
*   One or more instructions (i.e., smallest execution unit)
*   A recent blockhash
*   One or more signatures

The runtime will process each of the instructions contained within the transaction in order and atomically. If any part of an instruction fails, the entire transaction will fail.

‍

_What is Blockhash?_

_A "blockhash" is the latest Proof of History (PoH) hash for a_ [_slot_](https://solana.com/docs/terminology#slot)_. Since Solana relies on_ [_PoH_](https://solana.com/news/proof-of-history) _as a trusted clock, a transaction's_ **_recent blockhash_** _can be considered a timestamp. Blockhash prevents duplication and provides transactions with lifetimes. If a transaction has a blockhash that is too old, it will be rejected. The maximum blockhash age is 150 blocks or ~1 minute and 19 seconds._

### **How are Transactions Submitted?**

Solana is maintained by a group of [validators](https://solana.com/docs/terminology#validator) who validate the transactions added to the [ledger](https://solana.com/docs/terminology#ledger). A leader validator is chosen from this group to append the entries to the ledger. An entry on the ledger can be either a [tick](https://solana.com/docs/terminology#tick) or a [transaction's entry](https://solana.com/docs/terminology#transactions-entry). The ledger holds a list of entries containing transactions signed by clients. The [genesis block](https://solana.com/docs/terminology#genesis-block) conceptually traces back to the ledger. Still, an actual validator's ledger may only have newer blocks to reduce storage, as older ones are not needed to validate future blocks by design.

The leader validator can produce only one [block](https://solana.com/docs/terminology#block) per [slot](https://solana.com/docs/terminology#slot) and blockhash is a unique identifier used to identify each block. It is a hash of all the entries of a block, including the hash of the last block. The [leader schedule](https://solana.com/docs/terminology#leader-schedule) is determined before every epoch, typically around two days before, to decide which validator will act as the current leader at any given time. When a transaction is initiated, it is forwarded to the current and next leader validator.

‍

Transactions can be submitted to the leader via: 

1.  **RPC server**: Transactions can be submitted by an RPC provider via the [sendTransaction](https://solana.com/docs/rpc/http/sendtransaction) JSON-RPC method. The receiving RPC node will attempt to send it as a [UDP packet](https://www.helius.dev/blog/all-you-need-to-know-about-solana-and-quic#what%E2%80%99s-udp) to the current and next leader every two seconds until the transaction is finalized or the transaction's blockhash expires (after 150 blocks or ~1 minute 19 seconds). Until then, there is no transaction record outside of what the client and the relaying RPC nodes know. 
2.  **TPU Client**: The [TPU Client](https://crates.io/crates/solana-tpu-client/1.17.28) simply submits the transaction. The client software needs to handle rebroadcast and leader forwarding.

‍

To use the [sendTransaction](https://solana.com/docs/rpc/http/sendtransaction) method, you need to pass the transaction object encoded as a string. Other optional parameters include:

1.  **encoding:** The encoding used for the transaction data is base58 or base64. 
2.  **skipPreflight**: Preflight checks include verifying transaction signatures and simulating the transaction against the bank slot specified by the preflight commitment. If the preflight check fails, an error will be returned. The default setting for this feature is **false**, meaning that preflight checks are not skipped.
3.  **preflightCommitment**: It specifies the [commitment level](https://docs.solanalabs.com/consensus/commitments) used while performing preflight checks. The commitment level is set to **finalized** by default, but can be changed by specifying a string. It is recommended to specify the same commitment and preflight commitment to avoid confusing behavior.
4.  **maxRetries**: The **maxRetries** parameter determines the maximum number of times the RPC node needs to retry sending the transaction to the leader. If this parameter is not provided, the RPC node will retry the transaction until it is finalized or until the blockhash expires. 
5.  **minContextSlot**: The **minContextSlot** parameter specifies the minimum slot to perform preflight transaction checks.

### **How are Transactions Processed?**

The validator’s [Transaction Processing Unit (TPU)](https://docs.solanalabs.com/validator/tpu) receives the transaction, verifies the signature, executes it, and shares it with other validators in the network.

The TPU processes transactions in five distinct phases:

![Source: Overview of Transaction Processing Unit by JitoLabs](https://assets-global.website-files.com/641ba798c17bb180d832b666/661bc8ea90f30da22add5e5f_1FS3vXw3U0B5HnUG5UnjYIWDMTFa6q0HyYzKop8UnzOcO1ZX25RiIgodwrO1z7t-lI5Frqj0obDByH_-4aMQBqCXpNRDAg_frGtbhLVZZ9QqB0hOtLtlCNOwHXcYm-lSwVDKJNULRej4hlO2Bdn7h1s.png)

Source: Overview of Transaction Processing Unit by [JitoLabs](https://www.jito.wtf/blog/solana-validator-101-transaction-processing/)

1.  **Fetch Stage**

The [Fetch Stage](https://github.com/solana-labs/solana/blob/cd6f931223181d5a1d47cba64e857785a175a760/core/src/tpu.rs#L79) is responsible for receiving transactions. It will categorize incoming transactions according to three ports:

*   **tpu**: handles regular transactions such as token transfers, NFT mints, and program instructions
*   **tpu\_vote**: focuses exclusively on voting transactions
*   **tpu\_forwards**: if the current leader is unable to process all transactions, it **forwards unprocessed packets to the next leader**

Packets are batched into groups of 128 and forwarded to the SigVerify Stage.

2.  **SigVerify Stage**

The [SigVerify Stage](https://github.com/solana-labs/solana/blob/cd6f931223181d5a1d47cba64e857785a175a760/core/src/tpu.rs#L91) verifies signatures on packets and prunes them if verification fails. Votes and regular packets run in two separate pipelines. From the software's perspective, the packets it receives contain some metadata, but it's still unclear whether these packets are transactions.

If you have a GPU installed, it will be utilized for signature verification. Additionally, there is a logic to handle excessive packets in the case of higher traffic which utilizes IP addresses to drop packets.

3.  **Banking Stage**

[This stage](https://github.com/solana-labs/solana/blob/cd6f931223181d5a1d47cba64e857785a175a760/core/src/tpu.rs#L125) is responsible for filtering and processing transactions. Currently, it consists of 6 independent worker threads, 2 of which are voting threads and 4 of which are non-voting threads. Regular transactions are added to non-voting threads. Each thread has a local buffer that can hold up to 64 non-conflicting transactions in a priority queue. These transactions are then processed in parallel, enabled by [Sealevel](https://medium.com/solana-labs/sealevel-parallel-processing-thousands-of-smart-contracts-d814b378192). You can refer to [this video](https://youtu.be/R7hq8ampBio?si=GXjwTy-vz9GPYX0S) to learn more about the banking stage.

4.  **Proof of History Service**

The [PoH Service](https://github.com/solana-labs/solana/blob/cd6f931223181d5a1d47cba64e857785a175a760/poh/src/poh_service.rs) module records the passing of ticks. Each tick represents a unit of time, and there are 64 ticks in a slot. The hash is generated repeatedly until a record is received from the Banking Stage:

**next\_hash = hash(prev\_hash, hash(transaction\_ids))**

These records are then converted to [entries](https://solana.com/docs/terminology#entry) and broadcast to the network via the Broadcast Stage.

5.  **Broadcast Stage**

The entries from the PoH service are converted to shreds, representing the smallest unit of a block, and then sent to the rest of the network using a block propagation technique called [Turbine](https://docs.solanalabs.com/consensus/turbine-block-propagation). At a high level, Turbine divides a block into smaller pieces and distributes them through a hierarchical structure of nodes. Nodes do not have to be in contact with every other node. They only need to communicate with a select few. You can refer to this article to learn more about [Turbine](https://www.helius.dev/blog/turbine-block-propagation-on-solana) and how it works. 

## **How Do Transactions Fail?**

Excluding failures resulting from incorrect instructions or custom program errors, the possible reasons for transaction failures are:

### **Network Drops**

The networking layer can drop a transaction before a leader even processes it. [**UDP packet loss**](https://www.baeldung.com/cs/udp-packet-loss) is the simplest reason why this might occur. Another reason is connected to the **fetch stage** of the TPU. When the network is under high load, validators may get overwhelmed with the number of transactions they need to process. Validators can forward extra transactions to the **tpu\_forward** port of the next validator. However, there is a limit to the amount of data that can be forwarded, and each forward is limited to one hop between validators. This means that transactions received on the **tpu\_forwards** port are not forwarded to other validators. If the outstanding rebroadcast queue size exceeds **10,000 transactions**, newly submitted transactions will be dropped.

### **Stale/Incorrect Blockhash** 

Every transaction has a "recent blockhash" that serves as a timestamp for the [Proof of History](https://www.helius.dev/blog/proof-of-history-proof-of-stake-proof-of-work-explained#what%E2%80%99s-proof-of-history) (PoH) clock. This blockhash helps validators avoid processing the same transaction twice and keeps track of when and in what order transactions were processed. The validator will reject a transaction due to an invalid blockhash during processing.

*   **Blockhash Expires**

A transaction’s blockhash expires once it is no longer considered "recent" enough. To process a transaction, Solana validators search for the slot number of the corresponding blockhash in a block. If the validator cannot find a slot number for the blockhash, or if the looked-up slot number is more than **151 slots** lower than the slot number of the block being processed, the transaction will be rejected. By default, Solana transactions expire if they are not committed to a block within a certain amount of time (~_1 minute 19 seconds)_.

*   **Lagging RPC nodes**

![Source: Transaction dropped via an RPC Pool by Solana](https://assets-global.website-files.com/641ba798c17bb180d832b666/661bc8ea692ba43565e6b1c0_X9LVO9RTlXX61mOHW8Tfu71DO5zbg5HRH99w1fowzC2tQbgRGZkWEBcTesFb52-Uw06qoMPSogyZ7U3seb3CIPo_CvMWnN7sDe6e8yN8tYzklC1zmL1Q3-R06NNWADwjwXKep-KS4uX7JOAdhFJRlWc.png)

Source: [Transaction dropped via an RPC Pool by Solana](https://solana.com/docs/core/transactions/retry#before-a-transaction-is-processed)

When you submit a transaction through an RPC, it's possible that the RPC Pool is ahead of the rest. This may cause issues when nodes within the pool need to work together. For instance, if a transaction's **recentBlockhash** is queried from the advanced part of the pool and submitted to the lagging part of the pool, the nodes won't recognize the advanced blockhash and will reject the transaction. You can detect this upon transaction submission by **enabling preflight checks** on sendTransaction.

*   **Temporary Network Forks**

![Source: Transaction dropped due to minority fork (after processed) by Solana](https://assets-global.website-files.com/641ba798c17bb180d832b666/661bc8eae82e221ac7a6f00d_QDEU7BqpDSGAg91L7z877RKcG_cRjaUIJcdftqmaJgD_4FjmYu8X7zsVQkoZ639lMc9ycCP0VC_LNec5HGmejdGS2faqbGovc-jmgcAOyteqkQ2M-rG65xzlBAUjnOYmW08uLi-L-kg__3ZiyTj1RPc.png)

[Source: Transaction dropped due to minority fork (after processed) by Solana](https://solana.com/docs/core/transactions/retry#before-a-transaction-is-processed)

Temporary network forks can also result in dropped transactions. If a validator is slow to replay its blocks within the Banking Stage, it may create a **minority fork**. When a client builds a transaction, it’s possible for the transaction to reference a **recentBlockhash** that only exists on the minority fork. After the transaction is submitted, the cluster can then switch away from its minority fork before the transaction is processed. The transaction is dropped in this scenario because the blockhash is not found.

## **How Do I Land Transactions?**

To diagnose confirmation issues, it's important to understand transaction expiration. Follow these steps to increase the chances of successful transactions:

### **TLDR**;

*   Fetch the latest blockhash with commitment “**confirmed**” or “**finalized**”
*   Set **skipPreflight** to **true**
*   Optimize the amount of Compute Units requested
*   Add and calculate priority fees dynamically
*   Set **maxRetries** to **0**, and add custom retry logic for sending transactions.
*   Use a dedicated node to send a high amount of transactions
*   Explore staked connections
*   If the transaction is not time-sensitive, use [durable nonces](https://www.helius.dev/blog/solana-transactions)

### **Blockhash**

Transactions have a limited time to be processed by the validator. If the blockhash associated with the transaction expires before the validator processes it, the transaction will be canceled. To ensure that your transaction goes through, it is important that you send it with a recent blockhash. If the blockhash expires before the validator processes your transaction, you can reattempt the transaction with a new blockhash to ensure that it is processed successfully. This can be done in two ways: 

1.  **Set a new commitment level:**

The recommended RPC API method for fetching the latest blockhash is [**getLatestBlockhash**](https://solana.com/docs/rpc/http/getlatestblockhash). By default, this method uses the **finalized** [commitment level](https://docs.solanalabs.com/consensus/commitments) to return the most recently finalized block's blockhash. This commitment level indicates that the block has at least 31 confirmed blocks added above it. This eliminates the risk of using a blockhash that belongs to a dropped fork. However, there is typically at least a 32-slot difference between the most recent confirmed and finalized blocks. This tradeoff reduces the expiration of transactions by about 13 seconds, which could be even more during unstable cluster conditions. 

You can override the commitment of the blockhash by setting the commitment parameter to a different level. The **confirmed** commitment level is recommended for RPC requests as it is usually only a few slots behind the **processed** commitment level and has a low chance of belonging to a dropped fork. Although the **processed** commitment level fetches the most recent blockhash compared to other commitment levels, it is not recommended as [roughly 5% of blocks](https://solana.com/docs/core/transactions/confirmation#fetch-blockhashes-with-the-appropriate-commitment-level) aren't finalized by the cluster due to forking in the Solana protocol. If your transaction uses a blockhash that belongs to a dropped fork, it won't be considered recent by any blocks in the finalized blockchain.

2.  **Poll for new recent blockhashes frequently:**

Add a script to fetch and store the most recent blockhash using the **getLatestBlockhash** method frequently (every 60 seconds). So, whenever a user triggers a transaction, the application has a fresh blockhash ready. Wallets should also poll for new blockhashes frequently and replace a transaction's recent blockhash right before signing the transaction to ensure it is as recent as possible.

### **Skip Preflight**

Before submitting a transaction, the following preflight checks are performed:

*   The transaction’s signatures are verified.
*   The transaction is simulated against the bank slot specified by the preflight commitment. If it fails, an error is returned. 

If the block chosen for the simulation is older than the block used for your transaction’s blockhash, the simulation will fail with the dreaded “blockhash not found” error. 

If you are confident that your transaction signature is verified and there are no other errors, you can _skip the preflight check_. Even if you use the **skipPreflight** parameter, always set the **preflightCommitment** parameter to the same commitment level used to fetch your transaction’s blockhash for both **sendTransaction** and [**simulateTransaction**](https://solana.com/docs/rpc/http/simulatetransaction) requests.

### **Compute Units**

When a transaction is confirmed on the network, it uses up some of the total compute units (CU) available in a block. Currently, the total compute limit on a block is [48M CU](https://github.com/solana-labs/solana/blob/master/cost-model/src/block_cost_limits.rs#L64-L68). Developers can specify a compute unit budget for their transactions. If they don't set a budget, a [default value of 1,400,000](https://github.com/solana-labs/solana/blob/27eff8408b7223bb3c4ab70523f8a8dca3ca6645/program-runtime/src/compute_budget_processor.rs#L19) is used, which is higher than most transactions need. Many transactions don't use the entire CU budget because there's no penalty for requesting a higher budget than necessary. However, requesting too many compute units upfront can make it harder to schedule transactions efficiently because the scheduler doesn't know how much compute is left in a block until the transaction is executed. To avoid this, developers should set better-scoped CU requests that match the transaction requirements. You can refer to this [guide](https://solana.com/developers/guides/advanced/how-to-optimize-compute) to optimize the compute unit budget. In the upcoming Solana client v1.18 update, [transactions requiring fewer Compute Units will be given higher priority](https://github.com/solana-labs/solana/pull/34888).

Optimizing your Compute Unit (CU) usage has the following benefits:

*   A smaller transaction is more likely to be included in a block.
*   Cheaper instructions make your program more composable.
*   Lowers the overall block usage, enabling more transactions to be included in a block.

### **Implement Priority Fees**

[Priority fees](https://www.helius.dev/blog/priority-fees-understanding-solanas-transaction-fee-mechanics) can be added on top of the base transaction fee to get transactions prioritized by validators. These fees are priced in micro-lamports per Compute Unit (e.g., small amounts of SOL). They are added to transactions to make them economically attractive for validator nodes to include within blocks on the network.

However, it's important to note that there is a limit to how much one should pay in priority fees. Paying more than the typical fee won't increase your transaction's probability of success. Therefore, it's recommended to calculate priority fees dynamically to ensure that you pay the appropriate amount to remain competitive while avoiding overpaying. This integration is straightforward, and you can refer to [official documentation](https://solana.com/developers/guides/advanced/how-to-use-priority-fees) about priority fees or use the readily available [Helius API](https://docs.helius.dev/solana-rpc-nodes/alpha-priority-fee-api).

### **Implement a Robust Retry Logic**

In case of network congestion, implement custom logic within your code to handle transaction failures and retry them manually. To do this, set the **maxRetries** parameter to **0** when using [sendTransaction](https://solana.com/docs/rpc/http/sendtransaction) to submit a transaction. There are different methods that you can use to retry transactions:

*   Poll the **transaction status** with different commitment levels and continuously use the same signed transaction until it gets confirmed using an exponential backoff mechanism to avoid spam. Alternatively, you can submit transactions at a constant interval until a timeout occurs.
*   Store the **lastValidBlockHeight** that comes from the **getLatestBlockhash method**. Then, poll the cluster's block height and retry the transaction manually after the current block height goes above the **lastValidBlockHeight**. When polling via **getLatestBlockhash**, it is recommended that you specify your intended commitment level. By setting the commitment to confirmed (voted on) or finalized (~30 blocks after confirmed), you can avoid polling a blockhash from a minority fork.

### **Dedicated Node**

Shared RPCs have limits on how many transactions can be sent per second.  A dedicated node can be used to avoid this restriction. They allow for a more robust retry mechanism as you can send many more transactions per second, whether trying to do something else on-chain or ensuring a specific transaction goes through simultaneously. They offer the following benefits:

*   **Faster RPC Speeds**: If you want to minimize the time it takes to submit a transaction to validators, you can set up a dedicated node near your server. To test, run **ping <ip-address>** of the node. 

*   **No Rate Limits**: [Helius’ dedicated nodes](https://docs.helius.dev/solana-rpc-nodes/private-dedicated-nodes) can handle a high number of requests per second, increasing the likelihood of successful transactions. Their performance largely depends on how much traffic they can handle without crashing. It is important to note that requests per second (RPS) and transactions per second (TPS) are different metrics. A dedicated node allows you to send transactions; it does not assist in the confirmation process.

If you have a dedicated node with the [Yellowstone gRPC plugin](https://github.com/helius-labs/yellowstone-grpc), you can take advantage of [Atlas Transaction Sender](https://github.com/helius-labs/atlas-txn-sender). Even without a staked connection, it can provide a better transaction landing success. This package is designed to send transactions to Solana leaders using only the minimum required dependencies. It listens to block updates and tracks them while maintaining a connection cache to retry transactions. By default, it caches connections to four leaders and sends transactions to them. Please note that this service does not handle preflight checks or validate blockhashes before sending them to leaders.

### **Staked Connection**

The capacity of a leader's network bandwidth is limited. To use it effectively, stake-weighting is necessary to avoid accepting transactions blindly on a first-come-first-served basis without considering their source. Solana operates as a proof-of-stake network, which makes it natural to expand the use of stake-weighting to improve the quality of service in transactions. This means that a node with a 0.5% stake can send at least 0.5% of the packets to the leader. While the rest of the network – and no combination of the remaining stake – will be able to wash them out fully.

Helius offers Atlas, our stake-weighted service, which can help you land transactions. To learn more, reach out to us on [Discord](https://discord.gg/raeYgMjtDB).

### **Durable Nonces**

[Durable nonces](https://docs.solanalabs.com/implemented-proposals/durable-tx-nonces) allow for the creation and signing of a transaction that can be submitted at any point in the future. They are used in [cases](https://solana.com/developers/guides/advanced/introduction-to-durable-nonces#durable-nonce-applications) such as custodial services, which require more time to produce a transaction signature. If your transaction is not time-sensitive, you can use this method to circumvent the short lifetime of a transaction’s **recentBlockhash**.

To start using durable transactions, you need to submit a transaction that calls instructions to create a special "nonce" account on-chain and store a "durable blockhash" inside it. The Nonce account stores the value of the nonce. As long as the nonce account has not been used, you can create a durable transaction by following these two rules:

*   The instruction list must begin with an ["advance nonce" system instruction](https://docs.rs/solana-program/latest/solana_program/system_instruction/fn.advance_nonce_account.html), which loads your on-chain nonce account.
*   The transaction's blockhash must equal the durable blockhash stored in the on-chain nonce account.

Learn how to implement durable nonces via CLI and Web3.js by referring to this [article](https://solana.com/developers/guides/advanced/introduction-to-durable-nonces).

## **Conclusion**

In conclusion, successfully landing transactions on the Solana network, especially during times of high traffic, requires a nuanced understanding of the network's architecture and transaction processing mechanisms. By grasping the core concepts such as the role of the blockhash in transaction uniqueness and timeliness, the process of submitting transactions through RPC servers or TPU clients, and the importance of setting the right parameters (like **skipPreflight**, **preflightCommitment**, and **maxRetries**), users can significantly enhance transaction performance. Implementing a custom retry mechanism and leveraging dedicated nodes or staked connections can help increase the success rate.

Moreover, it is crucial to be cognizant of the network's current limitations and the Solana Foundation's ongoing efforts to address them, as seen in the upcoming v1.18 client release. As the network evolves and scales, staying informed and adaptable will be key to effectively interacting with it. 

If you need any help or support, don't hesitate to contact us on [Discord](https://discord.gg/raeYgMjtDB). Be sure to enter your email address below so you’ll never miss an update about what’s new on Solana. Ready to dive deeper? Explore the latest articles on the [Helius blog](https://www.helius.dev/blog) and continue your Solana journey, today.

### **Resources**

*   [Transactions – Solana Cookbook](https://solanacookbook.com/core-concepts/transactions.html#facts)
*   **RPC Methods:** [sendTransaction](https://solana.com/docs/rpc/http/sendtransaction), [simulateTransaction](https://solana.com/docs/rpc/http/simulatetransaction), [getLatestBlockhash](https://solana.com/docs/rpc/http/getlatestblockhash)
*   [Block Optimization on Solana](https://solana.com/news/block-optimization-on-the-solana-network)
*   [Solana Validator 101: Transaction Processing by Jito Labs](https://www.jito.wtf/blog/solana-validator-101-transaction-processing/)
*   [Transaction Processing Unit in a Solana Validator](https://docs.solanalabs.com/validator/tpu)
*   [Solana’s Schedular](https://www.youtube.com/watch?v=R7hq8ampBio)
*   [Transaction Confirmation by Solana](https://solana.com/docs/core/transactions/confirmation)
*   [Retrying Transactions by Solana](https://solana.com/docs/core/transactions/retry)
*   [How to use Priority Fees](https://solana.com/developers/guides/advanced/how-to-use-priority-fees)
*   [How to optimize compute](https://solana.com/developers/guides/advanced/how-to-optimize-compute)
*   [Prioritization Fees and Compute Units](https://solana.com/docs/more/exchange#prioritization-fees-and-compute-units)
*   [Durable Transaction Nonces](https://docs.solanalabs.com/implemented-proposals/durable-tx-nonces)
*   [Durable & Offline Transaction Signing using Nonces](https://solana.com/developers/guides/advanced/introduction-to-durable-nonces#durable-nonces-with-solana-object-object)
*   [Solana Transactions: Durable Nonces by Helius](https://www.helius.dev/blog/solana-transactions)