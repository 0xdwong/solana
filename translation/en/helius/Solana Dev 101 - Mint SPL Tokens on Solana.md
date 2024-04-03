# Solana Dev 101 - Mint SPL Tokens on Solana

## **Overview of Project**

Tokens are the building blocks of a digital economy. It is crucial to understand what they are and how to work with them to fully appreciate the power of blockchains. In this post, we show you how.

In this tutorial, we will guide you through the process of minting custom Solana tokens using the Solana Command-Line Interface (CLI). You will learn the three main steps to mint a custom token on Solana: creating the token, creating the token account, and minting a supply for the token. By the end of this tutorial, you will have the knowledge and skills to create your own Solana tokens and start experimenting with the Solana blockchain.

In addition to the CLI experience, we will also provide you with three alternative methods for minting custom Solana tokens quickly and easily. This will give you a variety of options to choose from, depending on your preferences and requirements.

*For more on custom minting through a JavaScript or TS setup, please refer to the Solana docs here:* [*https://spl.solana.com/token*](https://spl.solana.com/token) 

## **Prerequisites**

First we need a few programs installed on our workstation to begin minting the tokens. You can open your terminal app on your workstation to run these commands. If you already have these, you can skip this step.

1. Install Rust:

```shell
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. Install Solana CLI:

```shell
cargo install solana-cli
```

After this is installed you can verify that you have Solana CLI installed by running the following:

```shell
solana --version
```

Which should return a similar result to below:

```shell
solana-cli 1.15.2 (src:dea65f48; feat:1211687720, client:SolanaLabs)
```

*Note: This may return differently depending on when installed. If you are getting an error during install, please re-attempt the download and it should resolve.* 

Once this is set up we are ready to continue!

## **Setting up the Environment**

First, we want to set up our environment with 3 things.

1. Default **network** we are using (Mainnet or Devnet).
2. Default **wallet** we are using to mint the tokens.
3. Devnet **Solana** to fund this test.

### 1. Network

In this step we can use the standard Solana RPCs. You can get a free one from Helius' developer portal [here](https://dev.helius.xyz/dashboard/app). 

The 2 available are:

1. **Mainnet** - https://rpc.helius.xyz/?api-key=<api_key>
2. **Devnet** - https://rpc-devnet.helius.xyz/?api-key=<api_key> 

*Please make sure you are testing in the* ***Devnet\*** *environment, as using* ***Mainnet\*** *will be using real funds to mint the tokens.* 

Once we have our RPC, we can set it to our environment by using the following command:

```shell
solana config set --url https://api.devnet.solana.com
```

This will set our default network to **Devnet** on the CLI for our test. You should see the following in your console:

```shell
解释
Config File: /Users/user/.config/solana/cli/config.yml
RPC URL: https://api.devnet.solana.com 
WebSocket URL: wss://api.devnet.solana.com/ (computed)
Keypair Path: ./RwUUVWjmSycerjAFep7v9d1R1sioF45cYAUpeJtcQbZ.json 
Commitment: confirmed
```

Once you see this confirmation, we can move onto the next step.

### 2. Wallet

In this step we can set up our default wallet used for the test. We can do this by creating a new wallet for the test and setting it as our default for the **Solana CLI.**

To create a new wallet run the following:

```shell
solana-keygen new -o ${HOME}/token-wallet.json

```

*Note: You can replace “*token-wallet” *with the preferred name of your file here.* 

Which will create a new wallet-name.json file outside of your home directory.

You will now see the following in your console:

```shell
解释
Wrote new keypair to /Users/user/token-wallet.json
====================================================================================
pubkey: EbcgsUzSEgiZm61Ch66hKUWhoUg3DGvDaqwQBMLaBgTg
====================================================================================
Save this seed phrase and your BIP39 passphrase to recover your new keypair:
switch anchor code opera purpose easy squeeze enough steal pelican enroll switch
====================================================================================
```

*Please save the seed phrase set here so you could import to a trusted wallet app if needed.* 

Now we can set this wallet as our default address by running the following: 

```shell
solana config set --keypair ${HOME}/token-wallet.json

```

You can now run the following to make sure the public key is set correctly.

```shell
solana address

```

Which in our case provides:

```shell
EbcgsUzSEgiZm61Ch66hKUWhoUg3DGvDaqwQBMLaBgTg

```

Now that we have our default wallet set, we can move on to requesting funds for our test.

### 3. Funds for Test

Here we will be airdropping the devnet Solana required for the mint through the Solana CLI.

We can run the following command in our terminal to get the required amount:

```shell
solana airdrop 2

```

Now we can check the balance of our wallet by running the following:

```shell
solana balance

```

This should return **2 SOL** in the console.

*If this was unsuccessful, attempt a few more times, as the request could have just failed initially. If still not working, please try re-attempting again.*

‍

Once you have SOL in your Devnet wallet, we can continue to creating our tokens.

## **Steps for Minting from CLI**

Now that we have our environment set up, we can actually start minting some tokens! Once these are set, this is a fairly quick set up.

Here are the steps we need to accomplish this:

1. Create the token.
2. Create the token account.
3. Mint the token.

Below is a visual of the set up:

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/645990661fe2f350db92a20b_Concept%20map%20(5).png)

Visual showing relationship between Token Program, Token, and Token Account.

Let’s break this down a bit:

1. The Token Program is used to create, transfer, and mint additional tokens.
2. The user is interacting with the Token Program to create a token. This token program is also used to mint additional supply and transfer tokens.
3. Once the token is created, an account to store them can be created as well.

‍*‍*Now dive into the first step, which is creating the token.

### 1. Create Token

Run the following command to create the token:

```shell
spl-token create-token

```

*Note: Decimals are the smallest denomination for a token. For instance, Solana’s token is set to 9 decimals. Where it’s smallest denomination is called a* ***lamport\****. You can run spl-token create-token --decimals 0 to create a non-fungible token. Example: WL Token.* 

Which in our case provides the following:

```shell
解释
Creating token Ax3nE7fAEuZsbN9HHEpuBpoYeYy7NZ3dgjRG8GXdFqto under program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA

Address:  Ax3nE7fAEuZsbN9HHEpuBpoYeYy7NZ3dgjRG8GXdFqto
Decimals:  9

Signature: 56pRzvMBxJQqti4Fh5wPsa5Hb7KzJaWzEFNcAFYPaH7vN7a2CBmM1wbYxTvNVZr9Cvupy25X2oHtrGhhEhww9ug5
```

### 2. Create Token Account

Now we can create the account to hold our token supply in.

We can set up the account for our **Ax3nE7fAEuZsbN9HHEpuBpoYeYy7NZ3dgjRG8GXdFqto** token by running the following command in our terminal, with our token address being passed in:

```shell
spl-token create-account Ax3nE7fAEuZsbN9HHEpuBpoYeYy7NZ3dgjRG8GXdFqto

```

This is creating an account to house the **Ax3nE7fAEuZsbN9HHEpuBpoYeYy7NZ3dgjRG8GXdFqto** token and should produce the following result: 

```shell
Creating account 7jZDrZqRkVzu5ADtKvNGsTyPcCpcMVkxorMRJvCaUAD

Signature: EkR353vt9ST3ktyRsCRtYFqVvARaUBmUpWLfgFtsojBRbW66dK1yaCpW1NtphCQTkcGqzVQZg4Ld2abZ3bhsjA3
```

We now have a token account to start minting!

### 3. Minting Tokens

Now, we are set to mint and set a supply for our token. Since we are doing this on Devnet, why don’t we show the true power of Solana by minting 1 million tokens.

We can do this by running the following command, with our token address following the **spl-token mint** command:

```shell
spl-token mint Ax3nE7fAEuZsbN9HHEpuBpoYeYy7NZ3dgjRG8GXdFqto 1000000

```

This will produce the following in our terminal:

```shell
解释
Minting 1000000 tokens
  Token: Ax3nE7fAEuZsbN9HHEpuBpoYeYy7NZ3dgjRG8GXdFqto
  Recipient: 7jZDrZqRkVzu5ADtKvNGsTyPcCpcMVkxorMRJvCaUAD

Signature: 4EjB9bDC18Cut66frGWVHAxVQ3YrddaUCQcFZZsXbKXLziCAUtdh5r41tVhvP7yH1dZ5TBUaFXHpm2upaNCw3sMe
```

We can now run the following command to verify that these were minted:

```shell
spl-token supply Ax3nE7fAEuZsbN9HHEpuBpoYeYy7NZ3dgjRG8GXdFqto

```

Which will return:

```shell
1000000
```

Now, we have minted 1 million tokens on Solana using Solana CLI.

*Note: There are additional ways to register your Solana token* [*here*](https://spl.solana.com/token#registry-for-token-details)*, as well as additional information on token vesting* [*here*](https://spl.solana.com/token#token-vesting)*.*

### **Results**

To recap, we just minted 1 Million tokens through the Solana CLI **spl-token** tool. This was accomplished in **3 commands** on the Solana CLI.

1. Creating the token.
2. Creating the token account.
3. Minting the token.

If you care to check the balance of your Solana wallet after minting 1,000,000 tokens, run:

```shell
solana balance
```

Which will return this if you started with the initial 2 SOL drop:

```shell
1.99647912 SOL

```

And that’s it! Solana makes it possible to scale the token supply and have it at a fractional cost. If you followed these steps you can now effectively make a token using the Solana CLI **spl-token** tool.

## **Available Tools for Minting Tokens**

As promised, here are a few tools that you can use RIGHT NOW to create a token with metadata attached at a fraction of the cost. In each example, I will use Monopoly Money to create the token, and show the subsequent drop options available.

### 1. [Famous Fox Federation](https://famousfoxes.com/foxymint)

This tool has been around for about 6 months and costs .03 SOL to use. Which is very low cost when you compare to the cost of a few million tokens on another blockchain.

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/645991ddbc93ec8827b078b0_f1.png)

**Here is a breakdown of FFF:**

1. Make sure you have the SPL token checked here.
2. Setting a decimal with a value of 0 will create a WL token standard.
3. You can disable future minting of supply here, otherwise, it will be kept open.
4. You can then use a tool such as [Foxy Share](https://famousfoxes.com/foxyshare) to distribute your tokens at a low cost, in this example, I made a test token and will use the token section to send to :

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/64599282398377de6ec79a8a_f2.png)

### 2. [Squads](https://v3.squads.so/)

Squads is another easily available front end that comes at a fractional cost, here are the steps to create a token once you are signed into a squad account:

1. Go to the **Developers tab** —> then navigate to **Token Manager.**

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/645993012ba547584964078f_s1.png)

2. Once there you can select **Add Token** then select **Create Token** and enter the token details (supply will be added later).

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/645993b5dfd059ca74908f7f_s2.png)

3. Now we can enter the **Token decimals**, in this test we are using 9:

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/645993be979bdfe243f95479_s3.png)

4. After approving and executing the transaction in Squads, you will now see a set up similar to this:

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/645993d6dfd0595b7090ab07_s4.png)

‍

5. After selecting **Mint,** enter the amount you would like the create for this supply. As demonstrated below:

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/645993dd979bdfe66ff96e8c_s5%27.png)

6. Now you should see another transaction to approve in Squads. After being approved, you will see the token supply we set, as shown below:

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/645993eb979bdf7abcf979bf_s6.png)

Now you have created a token with a supply of 1 million using Squads!

You can then set up a custom transaction in the **“TX Builder”** section to transfer tokens, but I will not touch on that here, as that can be a bit extensive to explain in detail.

‍

*This option cost about - 0.00561672 SOL to mint, the same as our* ***Solana CLI\*** *option.* 

### 3. [Strata Protocol](https://app.strataprotocol.com/launchpad)

Here is another alternative to minting tokens on Solana.

1. You can start by selecting the **“Create New Token”** option and hitting **Next**:

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/6459964022b430dc1c1e543c_st.1.png)

​    2. Select **“Self Managed”** for the manage option:

‍

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/6459964022b430dc1c1e543c_st.1.png)

3. Now you can Connect your Solana wallet to fund the transaction, and enter the token details below:

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/6459969689bd1350c4a8540d_st3.png)

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/645996a622b430fd231e929d_st4.png)

*This transaction only costs .00458 SOL to complete for 1 million tokens, which is still at a fractional value of Solana, and up to par with the competitors. This will attempt a swap for SHDW Storage token if you do not have any existing.* 

**Strata Extras:**

Strata has a few other tools available on that main page that are really cool to use as well, such as:

1. **Token Manager** - You can increase supply/ update mint and freeze authority of each token.
2. **Sell Existing Token** - You can set a price or discovery for the token you want to sell.
3. **Fundraise** - Collect funds for a cause, and use the token to represent their contributions.

## **Conclusion**

Now you have a few options to mint a token on Solana that are both scalable in cost, and number of tokens needed. You can truly scale these examples and the cost would not be too different in getting these assets on-chain and ready to distribute.

All examples provided point to the true power of using Solana, and can be used by creators not as technologically savvy as they think they need to be.

An everyday user can mint tokens on Solana through a simple CLI that takes 3 steps, or different competitors at a similar low cost that have additional features to make interacting easier.

*If you have any questions or are running into any issues feel free to jump into the* [*Helius Discord*](https://discord.gg/VbxaGJwmEr) *and tag hosty | helius.xyz!*

‍