Solana 最近经历了前所未有的交易量，导致高比例的交易失败或丢弃。该网络的每秒交易量（TPS）约为 [2000-3000](https://solscan.io/analytics#networks)，其中大约有 800-900 笔是非投票交易。[Quinn](https://quinn-rs.github.io/quinn/networking-introduction.html)（[QUIC 网络层的 rust 实现](https://www.helius.dev/blog/all-you-need-to-know-about-solana-and-quic)）在高需求场景下有效处理垃圾邮件方面存在限制，可能导致区块领导者需要有选择性地断开连接。在所有失败的交易中，[大约有 8%是由实际用户发起的，其余是机器人发起的任意交易](https://x.com/_nishil_/status/1777048361729994777) 。

了解 Solana 上交易是如何提交和处理的对于处理失败交易至关重要。本文深入探讨了交易失败的可能原因，并推荐了增加交易吞吐量的最佳实践。本文假定你对 [Solana 的编程模型](https://www.helius.dev/blog/the-solana-programming-model-an-introduction-to-developing-on-solana)和创建以及[发送交易](https://solanacookbook.com/references/basic-transactions.html#how-to-send-sol)有基本了解。

## 交易

程序执行始于提交给[集群](https://www.helius.dev/blog/the-solana-programming-model-an-introduction-to-developing-on-solana#what-are-solana-clusters)的[交易](https://www.helius.dev/blog/the-solana-programming-model-an-introduction-to-developing-on-solana#what-are-transactions)。一个交易包含：

*   所有它打算从中读取或写入的账户数组
*   一个或多个指令（即，最小执行单元）
*   一个最近的区块哈希
*   一个或多个签名

运行时将按顺序原子地处理交易中包含的每个指令。如果指令的任何部分失败，整个交易将失败。

‍

_什么是区块哈希？_

_"区块哈希"是一个_ [_slot_](https://solana.com/docs/terminology#slot) _的最新历史证明（PoH）哈希。由于 Solana 依赖于_ [_PoH_](https://solana.com/news/proof-of-history) _作为可信时钟，一个交易的_ **_recent blockhash_** _可以被视为时间戳。区块哈希可以防止重复并为交易提供生命周期。如果一个交易的区块哈希太旧，它将被拒绝。最大的区块哈希年龄为 150 个块或约 1 分钟 19 秒。_

### 交易如何提交？

Solana 由一组[验证者](https://solana.com/docs/terminology#validator)维护，他们验证添加到[账本](https://solana.com/docs/terminology#ledger)的交易。从这组中选择一个领导验证者来将条目附加到账本。账本上的条目可以是一个 [tick](https://solana.com/docs/terminology#tick) 或一个[交易条目](https://solana.com/docs/terminology#transactions-entry) 。账本保存了一个包含客户端签名的交易条目列表。 [创世块](https://solana.com/docs/terminology#genesis-block)在概念上追溯到账本。但实际验证者的账本可能只有更新的块，以减少存储，因为在设计上旧块不需要用来验证未来的块。

领导验证者每个 [slot](https://solana.com/docs/terminology#slot) 只能生成一个 [block](https://solana.com/docs/terminology#block)，区块哈希是用于标识每个块的唯一标识符。它是一个块的所有条目的哈希，包括上一个块的哈希。 [领导计划](https://solana.com/docs/terminology#leader-schedule)在每个纪元之前确定，通常在大约两天之前，以决定哪个验证者将在任何给定时间充当当前领导者。当发起交易时，它将被转发给当前和下一个领导验证者。

‍

交易可以通过以下方式提交给领导者：

1.  **RPC 服务器**：交易可以通过 RPC 提供者通过 [sendTransaction](https://solana.com/docs/rpc/http/sendtransaction) JSON-RPC 方法提交。接收的 RPC 节点将尝试将其作为 [UDP 数据包](https://www.helius.dev/blog/all-you-need-to-know-about-solana-and-quic#what%E2%80%99s-udp)每两秒发送给当前和下一个领导者，直到交易完成或交易的区块哈希过期（在 150 个块或约 1 分钟 19 秒后）。在此之前，只有客户端和中继 RPC 节点知道该交易记录。
2.  **TPU 客户端**：[TPU 客户端](https://crates.io/crates/solana-tpu-client/1.17.28)只需提交交易。客户端软件需要处理重新广播和领导者转发。

‍

要使用 [sendTransaction](https://solana.com/docs/rpc/http/sendtransaction) 方法，你需要将交易对象编码为字符串进行传递。其他可选参数包括：

1.  **encoding:** 用于交易数据的编码为 base58 或 base64。
2.  **skipPreflight:** Preflight 检查包括验证交易签名并根据预先提交的 bank slot 模拟交易。如果 Preflight 检查失败，将返回错误。此功能的默认设置为**false**，表示不跳过 Preflight 检查。
3.  **preflightCommitment:** 它指定在执行 Preflight 检查时使用的[承诺级别](https://docs.solanalabs.com/consensus/commitments) 。承诺级别默认设置为 **finalized**，但可以通过指定字符串进行更改。建议指定相同的承诺和 Preflight 承诺以避免混乱的行为。
4.  **maxRetries:** maxRetries 参数确定 RPC 节点需要重试将交易发送给领导者的最大次数。如果未提供此参数，RPC 节点将重试交易直到交易完成或直到区块哈希过期。
5.  **minContextSlot:** **minContextSlot** 参数指定执行 Preflight 交易检查的最小槽。 

### 交易如何处理？

验证者的[交易处理单元（TPU）](https://docs.solanalabs.com/validator/tpu) 接收交易，验证签名，执行交易，并与网络中的其他验证者共享。

TPU 在五个不同的阶段处理交易：

![来源：JitoLabs 的交易处理单元概述](https://assets-global.website-files.com/641ba798c17bb180d832b666/661bc8ea90f30da22add5e5f_1FS3vXw3U0B5HnUG5UnjYIWDMTFa6q0HyYzKop8UnzOcO1ZX25RiIgodwrO1z7t-lI5Frqj0obDByH_-4aMQBqCXpNRDAg_frGtbhLVZZ9QqB0hOtLtlCNOwHXcYm-lSwVDKJNULRej4hlO2Bdn7h1s.png)

来源：[JitoLabs](https://www.jito.wtf/blog/solana-validator-101-transaction-processing/) 的交易处理单元概述

1.  **获取阶段**

[获取阶段](https://github.com/solana-labs/solana/blob/cd6f931223181d5a1d47cba64e857785a175a760/core/src/tpu.rs#L79)负责接收交易。它将根据三个端口对传入的交易进行分类：

*   **tpu**：处理常规交易，如代币转账、NFT 铸造和程序指令
*   **tpu\_vote**：专门处理投票交易
*   **tpu\_forwards**：如果当前领导者无法处理所有交易，则**将未处理的数据包转发给下一个领导者**
   
数据包被分批成 128 个一组，并转发到 SigVerify 阶段。

2.  **SigVerify 阶段**

[SigVerify 阶段](https://github.com/solana-labs/solana/blob/cd6f931223181d5a1d47cba64e857785a175a760/core/src/tpu.rs#L91)验证数据包上的签名，并在验证失败时修剪它们。投票和常规数据包在两个单独的流水线上运行。从软件的角度来看，它接收到的数据包包含一些元数据，但目前还不清楚这些数据包是否是交易。

如果你安装了 GPU，则将用于签名验证。此外，在高流量情况下，有一种处理过多数据包的逻辑，利用 IP 地址丢弃数据包。

3.  **Banking 阶段**

[此阶段](https://github.com/solana-labs/solana/blob/cd6f931223181d5a1d47cba64e857785a175a760/core/src/tpu.rs#L125)负责过滤和处理交易。目前，它由 6 个独立的工作线程组成，其中 2 个是投票线程，4 个是非投票线程。常规交易被添加到非投票线程。每个线程都有一个本地缓冲区，可以容纳最多 64 个不冲突的交易，存储在优先级队列中。这些交易然后并行处理，由 [Sealevel](https://medium.com/solana-labs/sealevel-parallel-processing-thousands-of-smart-contracts-d814b378192) 实现。你可以参考[此视频](https://youtu.be/R7hq8ampBio?si=GXjwTy-vz9GPYX0S)了解更多关于 Banking 阶段的信息。

4.  **历史证明服务**

[PoH 服务](https://github.com/solana-labs/solana/blob/cd6f931223181d5a1d47cba64e857785a175a760/poh/src/poh_service.rs)模块记录 ticks 的传递。每个 tick 代表一个时间单位，一个 slot 中有 64 个 tick。哈希重复生成，直到从 Banking 阶段收到记录：

**next\_hash = hash(prev\_hash, hash(transaction\_ids))**

然后将这些记录转换为 [entries](https://solana.com/docs/terminology#entry)，通过广播阶段广播到网络。

5.  **广播阶段**

来自 PoH 服务的 entries 被转换为 shreds，代表一个块的最小单位，然后使用名为 [Turbine](https://docs.solanalabs.com/consensus/turbine-block-propagation) 的块传播技术发送到网络的其余部分。在高层次上，Turbine 将一个块分成更小的部分，并通过节点的分层结构进行分发。节点不必与每个其他节点联系。它们只需要与少数节点通信。你可以参考[此文章](https://www.helius.dev/blog/turbine-block-propagation-on-solana)了解更多关于 Turbine 及其工作原理的信息。

## 交易失败的原因是什么？

除了由于不正确的指令或自定义程序错误导致的失败外，交易失败的可能原因有：

### 网络丢包

网络层可能在领导者处理之前丢弃交易。[**UDP 数据包丢失**](https://www.baeldung.com/cs/udp-packet-loss)是可能发生这种情况的最简单原因。另一个原因与 TPU 的 **fetch 阶段**有关。当网络负载较重时，验证者可能会被需要处理的交易数量压垮。验证者可以将额外的交易转发到下一个验证者的 **tpu\_forward** 端口。然而，可以转发的数据量是有限的，每次转发在验证者之间限制为一跳。这意味着在 **tpu\_forwards** 端口接收的交易不会被转发到其他验证者。如果未处理的重播队列大小超过**10,000 笔交易**，新提交的交易将被丢弃。

### 过时/不正确的区块哈希

每个交易都有一个作为[历史证明](https://www.helius.dev/blog/proof-of-history-proof-of-stake-proof-of-work-explained#what%E2%80%99s-proof-of-history)（PoH）时钟时间戳的“最近区块哈希”。这个区块哈希帮助验证者避免处理相同的交易两次，并跟踪交易何时以及以何种顺序被处理。验证者将由于无效的区块哈希在处理过程中拒绝交易。

*   **区块哈希过期**

交易的区块哈希一旦不再被认为是足够“最近”，就会过期。为了处理交易，Solana 验证者会在一个块中搜索相应区块哈希的 slot 号。如果验证者找不到区块哈希的 slot 号，或者查找到的 slot 号比正在处理的块的 slot 号低**151 个 slot** 以上，交易将被拒绝。默认情况下，如果 Solana 交易在一定时间内（~_1 分钟 19 秒_）未提交到一个块中，则会过期。

*   **滞后的 RPC 节点**

![来源：Solana 通过 RPC 池丢弃交易](https://assets-global.website-files.com/641ba798c17bb180d832b666/661bc8ea692ba43565e6b1c0_X9LVO9RTlXX61mOHW8Tfu71DO5zbg5HRH99w1fowzC2tQbgRGZkWEBcTesFb52-Uw06qoMPSogyZ7U3seb3CIPo_CvMWnN7sDe6e8yN8tYzklC1zmL1Q3-R06NNWADwjwXKep-KS4uX7JOAdhFJRlWc.png)

来源：[Solana 通过 RPC 池丢弃交易](https://solana.com/docs/core/transactions/retry#before-a-transaction-is-processed)

通过 RPC 提交交易时，RPC 池可能领先于其他部分。当池内的节点需要共同工作时，可能会出现问题。例如，如果从池的高级部分查询交易的 **recentBlockhash** 并将其提交到池的滞后部分，则节点将无法识别高级区块哈希并拒绝交易。你可以通过在 sendTransaction 上**启用预检查**来在提交交易时检测到这一点。

*   **临时网络分叉**

![来源：Solana 通过少数分叉（处理后）丢弃交易](https://assets-global.website-files.com/641ba798c17bb180d832b666/661bc8eae82e221ac7a6f00d_QDEU7BqpDSGAg91L7z877RKcG_cRjaUIJcdftqmaJgD_4FjmYu8X7zsVQkoZ639lMc9ycCP0VC_LNec5HGmejdGS2faqbGovc-jmgcAOyteqkQ2M-rG65xzlBAUjnOYmW08uLi-L-kg__3ZiyTj1RPc.png)

[来源：Solana 通过少数分叉（处理后）丢弃交易](https://solana.com/docs/core/transactions/retry#before-a-transaction-is-processed)

临时网络分叉也可能导致交易丢失。如果验证者在 Banking 阶段缓慢重播其块，可能会创建一个**少数分叉**。当客户端构建交易时，交易可能引用仅存在于少数分叉上的 **recentBlockhash**。在提交交易后，集群可能会在交易处理之前切换到其少数分叉。在这种情况下，由于未找到区块哈希，交易将被丢弃。

## 如何确保交易成功？

为了诊断确认问题，了解交易过期很重要。按照以下步骤增加成功交易的机会：

### TLDR;

*   使用承诺“**confirmed**”或“**finalized**”获取最新的区块哈希
*   将 **skipPreflight** 设置为 **true**
*   优化请求的计算单元数量
*   动态添加和计算优先手续费
*   将 **maxRetries** 设置为**0**，并为发送交易添加自定义重试逻辑。
*   使用专用节点发送大量交易
*   探索质押连接
*   如果交易不受时间限制，请使用[持久性 nonce](https://www.helius.dev/blog/solana-transactions)

###区块哈希

交易有限的时间被验证者处理。如果与交易相关的区块哈希在验证者处理之前过期，交易将被取消。为确保你的交易成功，重要的是使用最新的区块哈希发送交易。如果区块哈希在验证者处理你的交易之前过期，你可以使用新的区块哈希重新尝试交易，以确保成功处理。这可以通过两种方式完成：

1. **设置新的承诺级别：**

获取最新区块哈希的推荐 RPC API 方法是 [**getLatestBlockhash**](https://solana.com/docs/rpc/http/getlatestblockhash)。默认情况下，此方法使用**已最终化**的[承诺级别](https://docs.solanalabs.com/consensus/commitments)返回最近已最终化区块的区块哈希。此承诺级别表示该区块至少有 31 个已确认的区块添加到其上方。这消除了使用属于已删除分叉的区块哈希的风险。然而，最近已确认和已最终化的区块之间通常至少有 32 个槽的差异。这种权衡减少了交易过期约 13 秒，这在不稳定的集群条件下可能会更多。

你可以通过将承诺参数设置为不同级别来覆盖区块哈希的承诺。对于 RPC 请求，**已确认**的承诺级别是推荐的，因为它通常只落后于**已处理**的承诺级别几个槽，并且很少有可能属于已删除分叉。尽管**已处理**的承诺级别相对于其他承诺级别获取了最新的区块哈希，但不建议使用，因为由于 Solana 协议中的分叉，集群中[大约有 5%的区块](https://solana.com/docs/core/transactions/confirmation#fetch-blockhashes-with-the-appropriate-commitment-level)未最终化。如果你的交易使用属于已删除分叉的区块哈希，它将不被最终化区块链中的任何区块视为最新。

2. **频繁轮询新的最新区块哈希：**

添加一个脚本，使用**getLatestBlockhash**方法频繁（每 60 秒）获取并存储最新的区块哈希。因此，每当用户触发交易时，应用程序都有一个新鲜的区块哈希准备就绪。钱包也应频繁轮询新的区块哈希，并在签署交易之前替换交易的最新区块哈希，以确保其尽可能最新。

### 跳过预检

在提交交易之前，执行以下预检查：

* 验证交易的签名。
* 根据预检承诺指定的银行槽模拟交易。如果失败，将返回错误。

如果用于模拟的区块比你的交易区块哈希使用的区块旧，则模拟将失败，并显示可怕的“未找到区块哈希”错误。

如果你确信你的交易签名已验证且没有其他错误，你可以_跳过预检查_。即使使用**skipPreflight**参数，也始终将**preflightCommitment**参数设置为用于获取你的交易区块哈希的相同承诺级别，用于**sendTransaction**和 [**simulateTransaction**](https://solana.com/docs/rpc/http/simulatetransaction) 请求。

### 计算单位

当交易在网络上确认时，它会消耗一些区块中可用的总计算单位（CU）。目前，区块上的总计算限制为 [48M CU](https://github.com/solana-labs/solana/blob/master/cost-model/src/block_cost_limits.rs#L64-L68)。开发人员可以为其交易指定计算单位预算。如果他们没有设置预算，则使用[默认值为 1,400,000](https://github.com/solana-labs/solana/blob/27eff8408b7223bb3c4ab70523f8a8dca3ca6645/program-runtime/src/compute_budget_processor.rs#L19)，这比大多数交易所需的要高。许多交易不使用整个 CU 预算，因为请求比必要的更高的预算没有惩罚。然而，一开始请求太多的计算单位会使调度交易变得更加困难，因为调度程序在交易执行之前不知道区块中剩余多少计算。为避免这种情况，开发人员应设置更好范围的 CU 请求，以匹配交易需求。你可以参考这篇[指南](https://solana.com/developers/guides/advanced/how-to-optimize-compute)来优化计算单位预算。在即将推出的 Solana 客户端 v1.18 更新中， [需要更少计算单位的交易将获得更高优先级](https://github.com/solana-labs/solana/pull/34888) 。

优化你的计算单位（CU）使用具有以下好处：

* 较小的交易更有可能被包含在一个区块中。
* 更便宜的指令使你的程序更具可组合性。
* 降低整体区块使用率，使更多交易能够包含在一个区块中。

### 实施优先费用

[优先费用](https://www.helius.dev/blog/priority-fees-understanding-solanas-transaction-fee-mechanics)可以添加到基本交易费用之上，以使验证者优先处理交易。这些费用以每计算单位的微拉姆波（例如，少量的 SOL）定价。它们被添加到交易中，使其在网络中的区块中更具经济吸引力，以便验证者节点将其包含在区块中。

然而，重要的是要注意，支付优先费用的金额应该有限。支付超过典型费用的金额不会增加你的交易成功的概率。因此，建议动态计算优先费用，以确保你支付适当的金额以保持竞争力，同时避免过度支付。这种集成很简单，你可以参考[官方文档](https://solana.com/developers/guides/advanced/how-to-use-priority-fees)关于优先费用，或使用现成的 [Helius API](https://docs.helius.dev/solana-rpc-nodes/alpha-priority-fee-api)。

### 实施强大的重试逻辑

在网络拥塞的情况下，在你的代码中实现自定义逻辑来处理交易失败并手动重试它们。为此，当使用 [sendTransaction](https://solana.com/docs/rpc/http/sendtransaction) 提交交易时，将**maxRetries**参数设置为**0**。你可以使用不同的方法重试交易：

* 使用不同承诺级别轮询**交易状态**，并持续使用相同的已签名交易，直到使用指数退避机制确认。或者，你可以以恒定间隔提交交易，直到超时发生。
* 存储来自**getLatestBlockhash 方法**的**lastValidBlockHeight**。然后，轮询集群的区块高度，并在当前区块高度超过**lastValidBlockHeight**后手动重试交易。在通过**getLatestBlockhash**轮询时，建议你指定你的预期承诺级别。通过将承诺设置为已确认（已投票）或已最终化（已确认后约 30 个区块），你可以避免从少数分叉中轮询区块哈希。

### 专用节点

共享的 RPC 有限制，限制每秒可以发送多少交易。可以使用专用节点来避免此限制。它们允许更强大的重试机制，因为你可以每秒发送更多的交易，无论是尝试在链上执行其他操作还是同时确保特定交易通过。它们提供以下好处：

*   **更快的 RPC 速度**：如果你想要最小化将交易提交给验证者所需的时间，可以在服务器附近设置一个专用节点。要进行测试，请运行节点的 **ping <ip-address>**。

*   **无速率限制**：[Helius 的专用节点](https://docs.helius.dev/solana-rpc-nodes/private-dedicated-nodes)可以处理高数量的请求每秒，增加成功交易的可能性。它们的性能在很大程度上取决于它们可以处理多少流量而不会崩溃。重要的是要注意每秒请求（RPS）和每秒交易（TPS）是不同的度量标准。专用节点允许你发送交易；它不会协助确认过程。

如果你有一个带有 [Yellowstone gRPC 插件](https://github.com/helius-labs/yellowstone-grpc)的专用节点，你可以利用 [Atlas Transaction Sender](https://github.com/helius-labs/atlas-txn-sender)。即使没有抵押连接，它也可以提供更好的交易落地成功率。该软件包旨在仅使用最少的依赖项向 Solana 领导者发送交易。它监听区块更新并跟踪它们，同时维护一个连接缓存以重试交易。默认情况下，它会缓存到四个领导者的连接并向它们发送交易。请注意，此服务在将交易发送到领导者之前不处理预检查或验证区块哈希。

### 抵押连接

领导者的网络带宽容量有限。为了有效使用它，需要进行抵押加权，以避免盲目接受交易，而不考虑其来源。Solana 作为权益证明网络运作，这使得将抵押加权扩展到改善交易服务质量变得自然。这意味着具有 0.5%抵押的节点可以向领导者发送至少 0.5%的数据包。而网络的其余部分 - 以及任何其他抵押的组合 - 将无法完全淘汰它们。

Helius 提供 Atlas，我们的抵押加权服务，可以帮助你完成交易。要了解更多信息，请在 [Discord](https://discord.gg/raeYgMjtDB) 上联系我们。

### 持久性 Nonce

[持久性 nonce](https://docs.solanalabs.com/implemented-proposals/durable-tx-nonces) 允许创建和签署可以在将来的任何时间点提交的交易。它们用于[情况](https://solana.com/developers/guides/advanced/introduction-to-durable-nonces#durable-nonce-applications)如需要更多时间生成交易签名的托管服务。如果你的交易不是时间敏感的，可以使用此方法规避交易的 **recentBlockhash** 的短生命周期。

要开始使用持久性交易，你需要提交一个调用指令以在链上创建特殊的“nonce”账户并在其中存储“持久性区块哈希”的交易。Nonce 账户存储 nonce 的值。只要 nonce 账户尚未被使用，你可以按照以下两个规则创建持久性交易：

*   指令列表必须以一个 ["advance nonce"系统指令](https://docs.rs/solana-program/latest/solana_program/system_instruction/fn.advance_nonce_account.html)开始，该指令加载你的链上 nonce 账户。
*   交易的区块哈希必须等于存储在链上 nonce 账户中的持久性区块哈希。

通过参考这篇[文章](https://solana.com/developers/guides/advanced/introduction-to-durable-nonces) ，了解如何通过 CLI 和 Web3.js 实现持久性 nonce。

## 结论

总之，在 Solana 网络上成功完成交易，尤其是在高流量时期，需要对网络架构和交易处理机制有细致的理解。通过掌握诸如区块哈希在交易唯一性和及时性中的作用、通过 RPC 服务器或 TPU 客户端提交交易的过程以及设置正确参数（如**skipPreflight**、**preflightCommitment**和**maxRetries**）等核心概念，用户可以显著提升交易性能。实施自定义重试机制并利用专用节点或抵押连接可以帮助提高成功率。

此外，了解网络当前的限制以及 Solana 基金会正在努力解决这些问题的努力至关重要，正如即将推出的 v1.18 客户端版本所示。随着网络的发展和扩展，保持信息灵通和适应性将是有效与其互动的关键。

如果你需要任何帮助或支持，请随时在 [Discord](https://discord.gg/raeYgMjtDB) 上联系我们。请务必在下方输入你的电子邮件地址，以便你不会错过 Solana 的最新动态。准备深入了解吗？探索 [Helius 博客](https://www.helius.dev/blog)上的最新文章，继续你的 Solana 之旅。

### 资源

*   [交易 - Solana Cookbook](https://solanacookbook.com/core-concepts/transactions.html#facts)
*   **RPC 方法：** [sendTransaction](https://solana.com/docs/rpc/http/sendtransaction), [simulateTransaction](https://solana.com/docs/rpc/http/simulatetransaction), [getLatestBlockhash](https://solana.com/docs/rpc/http/getlatestblockhash)
*   [Solana 上的区块优化](https://solana.com/news/block-optimization-on-the-solana-network)
*   [Jito Labs 撰写的 Solana 验证器 101：交易处理](https://www.jito.wtf/blog/solana-validator-101-transaction-processing/)
*   [Solana 验证器中的事务处理单元](https://docs.solanalabs.com/validator/tpu)
*   [Solana 的调度程序](https://www.youtube.com/watch?v=R7hq8ampBio)
*   [Solana 的交易确认](https://solana.com/docs/core/transactions/confirmation)
*   [Solana 的事务重试](https://solana.com/docs/core/transactions/retry)
*   [如何使用优先费用](https://solana.com/developers/guides/advanced/how-to-use-priority-fees)
*   [如何优化计算](https://solana.com/developers/guides/advanced/how-to-optimize-compute)
*   [优先费用和计算单位](https://solana.com/docs/more/exchange#prioritization-fees-and-compute-units)
*   [持久性事务 Nonce](https://docs.solanalabs.com/implemented-proposals/durable-tx-nonces)
*   [使用 Nonce 进行持久性和离线事务签名](https://solana.com/developers/guides/advanced/introduction-to-durable-nonces#durable-nonces-with-solana-object-object)
*   [Helius 撰写的 Solana 交易：持久性 Nonce](https://www.helius.dev/blog/solana-transactions)