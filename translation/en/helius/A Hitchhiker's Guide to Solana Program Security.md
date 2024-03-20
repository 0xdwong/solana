# A Hitchhiker's Guide to Solana Program Security

This article was co-authored by [bl0ckpain](https://twitter.com/bl0ckpain), a security researcher and smart contract developer who previously worked with [Kudelski Security](https://kudelskisecurity.com/) and [Halborn](https://www.halborn.com/)

## Introduction

Solana program security is not just about preventing hackers from stealing a project’s funds — it’s about ensuring a program behaves as intended, adhering to the project’s specifications and user expectations. 

Solana program security can affect a dApp's performance, scalability, and interoperability. Thus, developers must be aware of potential attack vectors and common vulnerabilities before building consumer-grade applications.

This article explores common vulnerabilities that developers will encounter when creating Solana programs. We start with an introduction to the attacker mindset for exploiting Solana programs, covering topics such as Solana’s programming model, how Solana’s design is inherently attacker-controlled, potential attack vectors, and common mitigation strategies. 

Then, we cover a variety of different vulnerabilities, giving an explanation of the vulnerability as well as insecure and secure code examples where applicable. 

Note this article is intended for a more intermediate or advanced audience as it assumes knowledge of Solana’s programming model and program development. *This article will not go through the process of building a program or Solana-specific concepts* — *we are focused on examining common vulnerabilities and learning how to mitigate them*. If you’re new to Solana, we recommend that you read these previous blog posts before going through this article:

- [The Solana Programming Model: An Introduction to Developing on Solana](https://www.helius.dev/blog/the-solana-programming-model-an-introduction-to-developing-on-solana)
- [An Introduction to Anchor: A Beginner’s Guide to Building Solana Programs](https://www.helius.dev/blog/an-introduction-to-anchor-a-beginners-guide-to-building-solana-programs)

## The Attacker Mindset in Exploiting Solana Programs

### Solana’s Programming Model

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/654d46c12245f98f47d174d7_program.jpg)

[Solana's programming model](https://www.helius.dev/blog/the-solana-programming-model-an-introduction-to-developing-on-solana) shapes the security landscape of applications built on its network. On Solana, accounts act as containers for data, similar to files on a computer. We can separate accounts into two general types: executable and non-executable. Executable accounts, or *programs*, are accounts capable of running code. Non-executable accounts are used for data storage without the ability to execute code (because they don't store any code). 

This decoupling of code and data means that programs are stateless — they interact with data stored in other accounts, passed by reference during transactions.

### Solana is Attacker-Controlled

![img](https://assets-global.website-files.com/641ba798c17bb180d832b666/654d4705a387b49455c060d2_transaction.jpg)

A transaction specifies the program to call, a list of accounts, and a byte array of instruction data. This model relies on the program to parse and interpret the accounts and instructions a given transaction provides.

Allowing any account to be passed into a program's function grants attackers significant control over the data a program will operate on. Understanding Solana's inherently attacker-controlled programming model is crucial to developing secure programs.

Given an attacker's ability to pass *any* account into a program's function, data validation becomes a fundamental pillar of Solana program security. Developers must ensure that their program can distinguish between legitimate and malicious inputs. 
This includes verifying account ownership, ensuring accounts are of an expected type, and whether an account is a signer.

### Potential Attack Vectors

Solana's unique programming model and execution environment give rise to specific attack vectors. Understanding these vectors is crucial for developers to safeguard their programs against potential exploits. These attack vectors include:

- **Logic Bugs**: flaws in program logic could be manipulated to cause unintended behavior, such as a loss of assets or unauthorized access. This also includes failing to implement project specifications correctly — if a program claims to do *x*, then it should do *x* and all of its idiosyncrasies
- **Data Validation Flaws**: inadequately validating input data can allow attackers to pass in malicious data and manipulate program state or execution
- **Rust-Specific Issues**: despite Rust's safety features, unsafe code blocks, concurrency issues, and panics can introduce vulnerabilities
- **Access Control Vulnerabilities**: failing to correctly implement access control checks, such as verifying an account’s owner, can lead to unauthorized actions by a malicious actor
- **Arithmetic and Precision Errors**: overflows/underflows and precision errors can be exploited for financial gain or cause a program to malfunction
- **Cross-Program Invocation (CPI) Issues**: flaws in handling CPIs can lead to unexpected state changes or errors if a called program behaves maliciously or unexpectedly
- **Program Derived Addresses (PDAs) Misuse**: incorrectly generating or handling PDAs can lead to vulnerabilities where attackers can hijack or spoof PDAs to gain unauthorized access or manipulate program-controlled accounts

Note that reentrancy is inherently limited on Solana due to its execution model. The Solana runtime restricts CPIs to a maximum depth of four and enforces strict account rules, such as only allowing an account's owner to modify its data. 
These constraints prevent reentrancy attacks by limiting direct self-recursion and ensuring a program cannot be involuntarily invoked in an intermediary state.

### Mitigation Strategies

To mitigate these potential attacks, developers should employ a combination of rigorous testing, code auditing, and adherence to best practices:

- Implement comprehensive input validation and access control checks
- Use Rust's type system and safety features to its fullest extent, avoiding unsafe code unless necessary
- Follow Solana and Rust security best practices and stay up to date with new developments
- Conduct internal code reviews and use automated tools to identify common vulnerabilities and logic errors during program development
- Have your codebase audited by reputable third parties, including security firms and independent security researchers
- Create a bug bounty platform for your program to incentivize the reporting of vulnerabilities rather than relying on [grey hats](https://en.wikipedia.org/wiki/Grey_hat)

The following sections will explore different vulnerabilities alphabetically. Each section will describe a potential vulnerability, explain how to mitigate the vulnerability and give example scenarios whenever possible.

## Account Data Matching

### The Vulnerability

Account data matching is a vulnerability that arises when developers fail to check the data stored on an account matches an expected set of values. Without proper data validation checks, a program may inadvertently operate with incorrect or maliciously substituted accounts. 

This vulnerability is particularly acute in scenarios involving permission-related checks.

### Example Scenario

Consider a program where users can deposit tokens into a liquidity pool. The program must validate that the deposited tokens belong to the depositor and that the token owner authorizes the deposit. However, the program fails to verify that the depositor owns the deposited tokens:

```Rust
pub fn deposit_tokens(ctx: Context<DepositTokens>, amount: u64) -> Result<()> {
    let depositor_token_account = &ctx.accounts.depositor_token_account;
    let liquidity_pool_account = &ctx.accounts.liquidity_pool_account;

    // Missing the check to ensure depositor is the token account owner

    // Token transfer logic

    Ok(())
}

#[derive(Accounts)]
pub struct DepositTokens<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(mut)]
    pub depositor_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub liquidity_pool_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>
}
```

### Recommended Mitigation

To mitigate this vulnerability, developers can implement explicit checks comparing the account keys and stored data against expected values. For instance, verify that the depositor's public key matches the owner field of the token account being used for the deposit:

```Rust
pub fn deposit_tokens(ctx: Context<DepositTokens>, amount: u64) -> Result<()> {
    let depositor_token_account = &ctx.accounts.depositor_token_account;
    let liquidity_pool_account = &ctx.accounts.liquidity_pool_account;

    // Ensure depositor is the token account owner
    if depositor_token_account.owner != ctx.accounts.depositor.key() {
        return Err(ProgramError::InvalidAccountData);
    }

    // Token transfer logic

    Ok(())
}
```

Developers can also use Anchor's **has_one** and **constraint** attributes to enforce data validation checks declaratively. Using our example above, we could use the **constraint** attribute to check the depositor's public key and the deposit token account's owner are equivalent:

```Rust
#[derive(Accounts)]
pub struct DepositTokens<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(
        mut,
        constraint = depositor_token_account.owner == depositor.key()
    )]
    pub depositor_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub liquidity_pool_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>
}
```

## Account Data Reallocation

### The Vulnerability

In Anchor, the **realloc** function provided by the **AccountInfo** struct introduces a nuanced vulnerability related to memory management. This function allows for reallocating an account's data size, which could be useful for dynamic data handling within programs. However, improper use of **realloc** can lead to unintended consequences, including wasting compute units or potentially exposing stale data.

The **realloc** method has two parameters:

- **new_len**: a **usize** that specifies the new length of the account's data
- **zero_init**: a **bool** that determines whether the new memory space should be zero-initialized

**realloc** is defined as follows:

```Rust
pub fn realloc(
    &self,
    new_len: usize,
    zero_init: bool
) -> Result<(), ProgramError>
```

Memory allocated for account data is already zero-initialized at the program's entry point. This means the new memory space is already zeroed out when data is reallocated to a larger size within a single transaction. 

Re-zeroing this memory is unnecessary and results in additional compute unit consumption. Conversely, reallocating to a smaller size and then back to a larger one within the same transaction could expose stale data if **zero_init** is **false**.

### Example Scenario

Consider a token staking program where the amount of stake information (e.g., staker addresses and amounts) can dynamically increase or decrease within a single transaction. 
This could occur in a batch processing scenario where multiple stakes are adjusted in response to certain conditions:

```Rust
pub fn adjust_stakes(ctx: Context<AdjustStakes>, adjustments: Vec<StakeAdjustments>) -> ProgramResult {
    // Logic to adjust stakes based on the adjustments provided
    for adjustment in adjustments {
        // Adjust stake logic
    }

    // Determine if we need to increase or decrease the data size
    let current_data_len = ctx.accounts.staking_data.data_len();
    let required_data_len = calculate_required_data_len(&adjustments);

    if required_data_len != current_data_len {
        ctx.accounts.staking_data.realloc(required_data_len, false)?;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct AdjustStakes<'info> {
    #[account(mut)]
    staking_data: AccountInfo<'info>,
    // Other relevant accounts
}
```

In this scenario, **adjust_stakes** might need to reallocate **staking_data** to accommodate the size required by the adjustments. If the data size is reduced to remove stake information and then increased again within the same transaction, setting **zero_init** to **false** could expose stale data.

### Recommended Mitigation

To mitigate this issue, using the **zero_init** parameter prudently is crucial:

- Set **zero_init** to **true** when increasing the data size after a prior decrease within the same transaction call. This ensures that any new memory space is zero-initialized, preventing stale data from being exposed
- Set **zero_init** to **false** when increasing the data size without a prior decrease in the same transaction call since the memory will already be zero-initialized

Instead of reallocating data to meet specific size requirements, developers should use[ Address Lookup Tables (ALTs)](https://docs.rs/solana-sdk/latest/solana_sdk/address_lookup_table/struct.AddressLookupTableAccount.html). ALTs allow developers to compress a transaction's data by storing up to 256 addresses in a single on-chain account. Each address within the table can then be referenced by a 1-byte index, significantly reducing the data needed for address references in a given transaction. 

ALTs are much more helpful for scenarios requiring dynamic account interactions without the need for frequent memory resizing.

## Account Reloading

### The Vulnerability

Account reloading is a vulnerability that arises when developers fail to update deserialized accounts after performing a CPI. Anchor does not automatically refresh the state of deserialized accounts after a CPI. 

This could lead to scenarios where program logic operates on stale data, leading to logical errors or incorrect calculations.

### Example Scenario

Consider a protocol where users can stake tokens to earn rewards over time. The program facilitating this includes functionality to update a user's staking rewards based on certain conditions or external triggers. 

A user's rewards are calculated and updated through a CPI to a rewards distribution program. However, the program fails to update the original staking account after the CPI to reflect the new rewards balance:

```Rust
pub fn update_rewards(ctx: Context<UpdateStakingRewards>, amount: u64) -> Result<()> {
    let staking_seeds = &[b"stake", ctx.accounts.staker.key().as_ref(), &[ctx.accounts.staking_account.bump]];

    let cpi_accounts = UpdateRewards {
        staking_account: ctx.accounts.staking_account.to_account_info(),
    };
    let cpi_program = ctx.accounts.rewards_distribution_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, staking_seeds);

    rewards_distribution::cpi::update_rewards(cpi_ctx, amount)?;

    // Attempt to log the "updated" reward balance
    msg!("Rewards: {}", ctx.accounts.staking_account.rewards);
    
    // Logic that uses the stale ctx.accounts.staking_account.rewards

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateStakingRewards<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,
    #[account(
        mut,
        seeds = [b"stake", staker.key().as_ref()],
        bump,
    )]
    pub staking_account: Account<'info, StakingAccount>,
    pub rewards_distribution_program: Program<'info, RewardsDistribution>,
}

#[account]
pub struct StakingAccount {
    pub staker: Pubkey,
    pub stake_amount: u64,
    pub rewards: u64,
    pub bump: u8,
}
```

In this example, the **update_rewards** function attempts to update the rewards for a user's staking account through a CPI call to a rewards distribution program. Initially, the program logs **ctx.accounts.staking_account.rewards** (i.e., the rewards balance) after the CPI and then continues onto logic that uses the stale **ctx.accounts.staking_account.rewards** data. The issue is that the staking account's state is not automatically updated post-CPI, which is why the data is stale.

### Recommended Mitigation

To mitigate this issue, explicitly call Anchor's[ **reload**](https://docs.rs/anchor-lang/latest/src/anchor_lang/accounts/account.rs.html#271-275) method to reload a given account from storage. Reloading an account post-CPI will accurately reflect its state:

```Rust
pub fn update_rewards(ctx: Context<UpdateStakingRewards>, amount: u64) -> Result<()> {
    let staking_seeds = &[b"stake", ctx.accounts.staker.key().as_ref(), &[ctx.accounts.staking_account.bump]];

    let cpi_accounts = UpdateRewards {
        staking_account: ctx.accounts.staking_account.to_account_info(),
    };
    let cpi_program = ctx.accounts.rewards_distribution_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, staking_seeds);

    rewards_distribution::cpi::update_rewards(cpi_ctx, amount)?;

    // Reload the staking account to reflect the updated reward balance
    ctx.accounts.staking_account.reload()?;

    // Log the updated reward balance
    msg!("Rewards: {}", ctx.accounts.staking_account.rewards);
    
    // Logic that uses ctx.accounts.staking_account.rewards

    Ok(())
}
```

## Arbitrary CPI

### The Vulnerability

Arbitrary CPIs occur when a program invokes another program without verifying the target program's identity. 

This vulnerability exists because the Solana runtime allows any program to call another program if the caller has the callee's program ID and adheres to the callee's interface. 

If a program performs CPIs based on user input without validating the callee's program ID, it could execute code in an attacker-controlled program.

### Example Scenario

Consider a program that distributes awards to participants based on their contributions to a project. After distributing the rewards, the program records the details in a separate ledger program for auditing and tracking purposes. 

The ledger program is assumed to be a trusted program, providing a public interface for keeping track of specific entries from authorized programs. The program includes a function to distribute and record rewards, which takes in the ledger program as an account. 

However, the function fails to verify the provided **ledger_program** before making a CPI to it:

```Rust
pub fn distribute_and_record_rewards(ctx: Context<DistributeAndRecord>, reward_amount: u64) -> ProgramResult {
    // Reward distribution logic

    let instruction = custom_ledger_program::instruction::record_transaction(
        &ctx.accounts.ledger_program.key(),
        &ctx.accounts.reward_account.key(),
        reward_amount,
    )?;

    invoke(
        &instruction,
        &[
            ctx.accounts.reward_account.clone(),
            ctx.accounts.ledger_program.clone(),
        ],
    )
}

#[derive(Accounts)]
pub struct DistributeAndRecord<'info> {
    reward_account: AccountInfo<'info>,
    ledger_program: AccountInfo<'info>,
}
```

An attacker could exploit this by passing a malicious program's ID as the **ledger_program**, leading to unintended consequences.

### Recommended Mitigation

To secure against this issue, developers can add a check that verifies the ledger program's identity before performing the CPI. This check would ensure that the CPI call is made to the intended program, preventing arbitrary CPIs:

```Rust
pub fn distribute_and_record_rewards(ctx: Context<DistributeAndRecord>, reward_amount: u64) -> ProgramResult {
    // Reward distribution logic

    // Verify the ledger_program is the expected custom ledger program
    if ctx.accounts.ledger_program.key() != &custom_ledger_program::ID {
        return Err(ProgramError::IncorrectProgramId.into())
    }
    
    let instruction = custom_ledger_program::instruction::record_transaction(
        &ctx.accounts.ledger_program.key(),
        &ctx.accounts.reward_account.key(),
        reward_amount,
    )?;

    invoke(
        &instruction,
        &[
            ctx.accounts.reward_account.clone(),
            ctx.accounts.ledger_program.clone(),
        ],
    )
}

#[derive(Accounts)]
pub struct DistributeAndRecord<'info> {
    reward_account: AccountInfo<'info>,
    ledger_program: AccountInfo<'info>,
}
```

A program may have a publicly available CPI module if it was written using Anchor. This makes invoking the program from another Anchor program easy and secure. 
The Anchor CPI module automatically checks that the program's address passed in matches the program's address stored in the module. Alternatively, hardcoding the address can be a possible solution instead of having the user pass it in.

## Authority Transfer Functionality

### The Vulnerability

Solana programs often designate specific public keys as authorities for critical functions, such as updating program parameters or withdrawing funds. However, the inability to transfer this authority to another address can pose significant risks. 
This limitation becomes problematic in scenarios such as team changes, protocol sales, or if the authority becomes compromised.

### Example Scenario

Consider a program where a global admin authority is responsible for setting specific protocol parameters through a **set_params** function. The program does not include a mechanism to change the global admin:

```Rust
pub fn set_params(ctx: Context<SetParams>, /* parameters to be set */) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.current_admin.key(),
        ctx.accounts.global_admin.authority,
    );

    // Logic to set parameters
}
```

Here, the authority is statically defined without the ability to update it to a new address.

### Recommended Mitigation

A secure approach to mitigating this issue is to create a two-step process for transferring authority. This process would allow the current authority to nominate a new **pending_authority**, which must explicitly accept the role. Not only would this provide authority transfer functionality, but it would also protect against accidental transfers or malicious takeovers. The flow would be as follows:

- **Nomination by the Current Authority**: the current authority would nominate a new **pending_authority** by calling **nominate_new_authority**, which sets the **pending_authority** field in the program state
- **Acceptance by New Authority**: the nominated **pending_authority** calls **accept_authority** to take on their new role, transferring authority from the current authority to **pending_authority**

This would look something like:

```Rust
pub fn nominate_new_authority(ctx: Context<NominateAuthority>, new_authority: Pubkey) -> Result<()> {
    let state = &mut ctx.accounts.state;
    require_keys_eq!(
        state.authority, 
        ctx.accounts.current_authority.key()
    );

    state.pending_authority = Some(new_authority);
    Ok(())
}

pub fn accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
    let state = &mut ctx.accounts.state;
    require_keys_eq!(
        Some(ctx.accounts.new_authority.key()), 
        state.pending_authority
    );

    state.authority = ctx.accounts.new_authority.key();
    state.pending_authority = None;
    Ok(())
}

#[derive(Accounts)]
pub struct NominateAuthority<'info> {
    #[account(
        mut,
        has_one = authority,
    )]
    pub state: Account<'info, ProgramState>,
    pub current_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptAuthority<'info> {
    #[account(
        mut,
        constraint = state.pending_authority == Some(new_authority.key())
    )]
    pub state: Account<'info, ProgramState>,
    pub new_authority: Signer<'info>,
}

#[account]
pub struct ProgramState {
    pub authority: Pubkey,
    pub pending_authority: Option<Pubkey>,
    // Other relevant program state fields
}
```

In this example, the **ProgramState** account structure holds the current **authority** and an optional **pending_authority**. The **NominateAuthority** context ensures that the current authority signs the transaction, allowing them to nominate a new authority. The **AcceptAuthority** context checks that the **pending_authority** matches the signer of the transaction, allowing them to accept and become the new authority. This setup ensures a secure and controlled transition of authority within the program.

## Bump Seed Canonicalization

### The Vulnerability

Bump seed canonicalization refers to using the highest valid bump seed (i.e., canonical bump) when deriving PDAs. Using the canonical bump is a deterministic and secure way to find an address given a set of seeds. 
Failing to use the canonical bump can lead to vulnerabilities, such as malicious actors creating or manipulating PDAs that compromise program logic or data integrity.

### Example Scenario

Consider a program designed to create unique user profiles, each with an associated PDA derived explicitly using **create_program_address**. The program allows for creating a profile by taking a user-provided bump. However, this is problematic as it introduces the risk of using the non-canonical bump:

```Rust
pub fn create_profile(ctx: Context<CreateProfile>, user_id: u64, attributes: Vec<u8>, bump: u8) -> Result<()> {
    // Explicitly derive the PDA using create_program_address and a user-provided bump
    let seeds: &[&[u8]] = &[b"profile", &user_id.to_le_bytes(),&[bump]];
    let (derived_address, _bump) = Pubkey::create_program_address(seeds, &ctx.program_id)?;

    if derived_address != ctx.accounts.profile.key() {
        return Err(ProgramError::InvalidSeeds);
    }

    let profile_pda = &mut ctx.accounts.profile;
    profile_pda.user_id = user_id;
    profile_pda.attributes = attributes;

    Ok(())
}

#[derive(Accounts)]
pub struct CreateProfile<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    /// The profile account, expected to be a PDA derived with the user_id and a user-provided bump seed
    #[account(mut)]
    pub profile: Account<'info, UserProfile>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct UserProfile {
    pub user_id: u64,
    pub attributes: Vec<u8>,
}
```

In this scenario, the program derives a **UserProfile** PDA using **create_program_address** with seeds that include a user-provided bump. Using a user-provided bump is problematic because it fails to ensure the use of the canonical bump. This would allow a malicious actor to create multiple PDAs with different bumps for the same user ID.

### Recommended Mitigation

To mitigate this issue, we can refactor our example to derive PDAs using **find_program_address** and validate the bump seed explicitly:

```Rust
pub fn create_profile(ctx: Context<CreateProfile>, user_id: u64, attributes: Vec<u8>) -> Result<()> {
    // Securely derive the PDA using find_program_address to ensure the canonical bump is used
    let seeds: &[&[u8]] = &[b"profile", user_id.to_le_bytes()];
    let (derived_address, bump) = Pubkey::find_program_address(seeds, &ctx.program_id);

    // Store the canonical bump in the profile for future validations
    let profile_pda = &mut ctx.accounts.profile;
    profile_pda.user_id = user_id;
    profile_pda.attributes = attributes;
    profile_pda.bump = bump;

    Ok(())
}

#[derive(Accounts)]
#[instruction(user_id: u64)]
pub struct CreateProfile<'info> {
    #[account(
        init, 
        payer = user, 
        space = 8 + 1024 + 1, 
        seeds = [b"profile", user_id.to_le_bytes().as_ref()], 
        bump
    )]
    pub profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct UserProfile {
    pub user_id: u64,
    pub attributes: Vec<u8>,
    pub bump: u8,
}
```

Here, **find_program_address** is used to derive the PDA with the canonical bump seed to ensure a deterministic and secure PDA creation. The canonical bump is stored in the **UserProfile** account, allowing for efficient and secure validation in subsequent operations. We prefer **find_program_address** over **create_program_address** because the latter creates a valid PDA *without searching for a bump seed*. Because it doesn't search for a bump seed, it may unpredictably return an error for any given set of seeds and is not generally suitable for creating PDAs. **find_program_address** will *always* use the canonical bump when creating a PDA. This is because it iterates through various **create_program_address** calls, starting with a bump of 255 and decrementing with each iteration. Once a valid address is found, the function returns the derived PDA and the canonical bump used to derive it.

Note Anchor enforces the canonical bump for PDA derivations through its **seeds** and **bump** constraints, streamlining this entire process to ensure secure and deterministic PDA creation and validation.

## Closing Accounts

### The Vulnerability

Improperly closing accounts in a program can lead to several vulnerabilities, including the potential for "closed" accounts to be reinitialized or misused. 
The issue arises from a failure to properly mark an account as closed or failing to prevent its reuse in subsequent transactions. This oversight can allow malicious actors to exploit a given account, leading to unauthorized action or access within the program.

### Example Scenario

Consider a program that allows users to create and close data storage accounts. The program closes an account by transferring out its lamports:

```Rust
pub fn close_account(ctx: Context<CloseAccount>) -> ProgramResult {
    let account = ctx.accounts.data_account.to_account_info();
    let destination = ctx.accounts.destination.to_account_info();

    **destination.lamports.borrow_mut() = destination
        .lamports()
        .checked_add(account.lamports())
        .unwrap();
    **account.lamports.borrow_mut() = 0;
    
    Ok(())
}

#[derive(Accounts)]
pub struct CloseAccount<'info> {
    #[account(mut)]
    pub data_account: Account<'info, Data>,
    #[account(mut)]
    pub destination: AccountInfo<'info>,
}

#[account]
pub struct Data {
    data: u64,
}
```

This is problematic as the program fails to zero out the account's data or mark it as closed. Merely transferring out its remaining lamports does not close the account.

### Recommended Mitigation

To mitigate this issue, not only should the program transfer out all lamposts, it should also zero out the account's data and mark it with a discriminator (i.e., **"CLOSED_ACCOUNT_DISCRIMINATOR"**). The program should also implement checks to prevent closed accounts from being reused in future transactions:

```Rust
use anchor_lang::__private::CLOSED_ACCOUNT_DISCRIMINATOR;
use anchor_lang::prelude::*;
use std::io::Cursor;
use std::ops::DerefMut;

// Other code

pub fn close_account(ctx: Context<CloseAccount>) -> ProgramResult {
    let account = ctx.accounts.data_account.to_account_info();
    let destination = ctx.accounts.destination.to_account_info();

    **destination.lamports.borrow_mut() = destination
        .lamports()
        .checked_add(account.lamports())
        .unwrap();
    **account.lamports.borrow_mut() = 0;

    // Zero out the account data
    let mut data = account.try_borrow_mut_data()?;
    for byte in data.deref_mut().iter_mut() {
        *byte = 0;
    }

    // Mark the account as closed
    let dst: &mut [u8] = &mut data;
    let mut cursor = Cursor::new(dst);
    cursor.write_all(&CLOSED_ACCOUNT_DISCRIMINATOR).unwrap();

    Ok(())
}

pub fn force_defund(ctx: Context<ForceDefund>) -> ProgramResult {
    let account = &ctx.accounts.account;
    let data = account.try_borrow_data()?;

    if data.len() < 8 || data[0..8] != CLOSED_ACCOUNT_DISCRIMINATOR {
        return Err(ProgramError::InvalidAccountData);
    }

    let destination = ctx.accounts.destination.to_account_info();

    **destination.lamports.borrow_mut() = destination
        .lamports()
        .checked_add(account.lamports())
        .unwrap();
    **account.lamports.borrow_mut() = 0;

    Ok(())
}

#[derive(Accounts)]
pub struct ForceDefund<'info> {
    #[account(mut)]
    pub account: AccountInfo<'info>,
    #[account(mut)]
    pub destination: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CloseAccount<'info> {
    #[account(mut)]
    pub data_account: Account<'info, Data>,
    #[account(mut)]
    pub destination: AccountInfo<'info>,
}

#[account]
pub struct Data {
    data: u64,
}
```

However, zeroing out the data and adding the closed discriminator is not enough. A user can keep an account from being garbage collected by refunding the account's lamports before the end of an instruction. 
This will put the account in a weird limbo state where it cannot be used or garbage collected. Thus, we added a **force_defund** function to address this edge case; now anyone can defund closed accounts.

Anchor simplifies this process with the **#[account(close = destination)]** constraint, automating the secure closure of accounts by transferring lamports, zeroing data, and setting the closed account discriminator, all in one operation.

## Duplicate Mutable Accounts

### The Vulnerability

Duplicate mutable accounts refers to a scenario where the same account is passed more than once as a mutable parameter to an instruction. This occurs when an instruction requires two mutable accounts of the same type. 
A malicious actor could pass in the same account twice, causing the account to be mutated in unintended ways (e.g., overwriting data). The severity of this vulnerability varies based on the specific scenario.

### Example Scenario

Consider a program designed to reward users based on their participation in a certain on-chain activity. The program has an instruction to update the balance of two accounts: a reward account and a bonus account. 
A user should receive a standard reward in one account and a potential bonus in another account based on specific predetermined criteria:

```Rust
pub fn distribute_rewards(ctx: Context<DistributeRewards>, reward_amount: u64, bonus_amount: u64) -> Result<()> {
    let reward_account = &mut ctx.accounts.reward_account;
    let bonus_reward = &mut ctx.accounts.bonus_account;

    // Intended to increment the reward and bonus accounts separately
    reward_account.balance += reward_amount;
    bonus_account.balance += bonus_amount;

    Ok(())
}

#[derive(Accounts)]
pub struct DistributeRewards<'info> {
    #[account(mut)]
    reward_account: Account<'info, RewardAccount>,
    #[account(mut)]
    bonus_account: Account<'info, RewardAccount>,
}

#[account]
pub struct RewardAccount {
    pub balance: u64,
}
```

If a malicious actor passes the same account for **reward_account** and **bonus_account**, the account's balance will be incorrectly updated twice.

### Recommended Mitigation

To mitigate this issue, add a check within the instruction logic to verify that the public keys of the two accounts are not identical:

```Rust
pub fn distribute_rewards(ctx: Context<DistributeRewards>, reward_amount: u64, bonus_amount: u64) -> Result<()> {
    if ctx.accounts.reward_account.key() == ctx.accounts.bonus_account.key() {
        return Err(ProgramError::InvalidArgument.into())
    }
    
    let reward_account = &mut ctx.accounts.reward_account;
    let bonus_reward = &mut ctx.accounts.bonus_account;

    // Intended to increment the reward and bonus accounts separately
    reward_account.balance += reward_amount;
    bonus_account.balance += bonus_amount;

    Ok(())
}
```

Developers can use Anchor's account constraints to add a more explicit check on the account. This can be done using the **#[account]** attribute and the **constraint** keyword:

```Rust
pub fn distribute_rewards(ctx: Context<DistributeRewards>, reward_amount: u64, bonus_amount: u64) -> Result<()> {
    let reward_account = &mut ctx.accounts.reward_account;
    let bonus_reward = &mut ctx.accounts.bonus_account;

    // Intended to increment the reward and bonus accounts separately
    reward_account.balance += reward_amount;
    bonus_account.balance += bonus_amount;

    Ok(())
}

#[derive(Accounts)]
pub struct DistributeRewards<'info> {
    #[account(
        mut,
        constraint = reward_account.key() != bonus_account.key()
    )]
    reward_account: Account<'info, RewardAccount>,
    #[account(mut)]
    bonus_account: Account<'info, RewardAccount>,
}

#[account]
pub struct RewardAccount {
    pub balance: u64,
}
```

## Frontrunning

### The Vulnerability

With the rising popularity of transaction bundlers, frontrunning is a concern that should be taken seriously by protocols built on Solana. [With the removal of Jito’s mempool](https://x.com/jito_labs/status/1766228889888514501?s=20), we refer to frontrunning here as a malicious actor’s ability to manipulate expected versus actual values through carefully constructed transactions. 

### Example Scenario

Imagine a protocol that handles purchasing and bidding for a product, storing the seller's pricing information in an account named **SellInfo**:

```Rust
#[derive(Accounts)]
pub struct SellProduct<'info> {
  product_listing: Account<'info, ProductListing>,
  sale_token_mint: Account<'info, Mint>,
  sale_token_destination: Account<'info, TokenAccount>,
  product_owner: Signer<'info>,
  purchaser_token_source: Account<'info, TokenAccount>,
  product: Account<info, Product>
}

#[derive(Accounts)]
pub struct PurchaseProduct<'info> {
  product_listing: Account<'info, ProductListing>,
  token_destination: Account<'info, TokenAccount>,
  token_source: Account<'info, TokenAccount>,
  buyer: Signer<'info>,
  product_account: Account<'info, Product>,
  token_mint_sale: Account<'info, Mint>,
}

#[account]
pub struct ProductListing {
  sale_price: u64,
  token_mint: Pubkey,
  destination_token_account: Pubkey,
  product_owner: Pubkey,
  product: Pubkey,
}
```

To purchase a **Product** listed, a buyer must pass in the **ProductListing** account related to the product they want. But what if the seller can change the **sale_price** of their listing?

```Rust
pub fn change_sale_price(ctx: Context<ChangeSalePrice>, new_price: u64) -> Result<()> {...}
```

This would introduce a frontrunning opportunity for the seller, especially if the buyer's purchasing transaction doesn't include **expected_price** checks to ensure they are paying no more than expected for the product they want. If the purchaser submits a transaction to buy the given **Product** is would be possible for the seller to call **change_sale_price**, and, using Jito, ensure this transaction is included before the purchaser's transaction. A malicious seller could change the price in the **ProductListing** account to an exorbitant amount, unbeknownst to the purchaser, forcing them to pay much more than expected for the **Product**!

### Recommended Mitigation

A simple solution would be including **expected_price** checks on the purchasing side of the deal, preventing the buyer from paying more than expected for the **Product** they want to buy:

```Rust
pub fn purchase_product(ctx: Context<PurchaseProduct>, expected_price: u64) -> Result<()> {
  assert!(ctx.accounts.product_listing.sale_price <= expected_price);
  ...
}
```

## Insecure Initialization

Unlike contracts deployed to the EVM, Solana programs are not deployed with a constructor to set state variables. Instead, they are initialized manually (normally by a function called **initialize** or something similar). Initialization functions typically set data such as the program’s authority or create accounts that form the base of the program being deployed (i.e., a central state account or something of the sort).

Since the initialization function is called manually, and not automatically on program deployment, this instruction must be called by a known address under the control of the program’s development team. 
Otherwise, it is possible for an attacker to frontrun initialization, possibly setting up the program using accounts under the attacker's control.

A common practice is to use the program’s **upgrade_authority** as the authorized address to call the **initialize** function, if the program has an upgrade authority.

### Insecure Example and How to Mitigate

```Rust
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
  ctx.accounts.central_state.authority = authority.key();
  ...  
}

#[derive(Accounts)]
pub struct Initialize<'info> {
  authority: Signer<'info>,
  #[account(mut,
    init,
    payer = authority,
    space = CentralState::SIZE,
    seeds = [b"central_state"],
    bump
  )]
  central_state: Account<'info, CentralState>,
  ...
}

#[account]
pub struct CentralState {
  authority: Pubkey,
  ...
}
```

The example above is a stripped-down initialize function that sets the authority of a **CentralState** account for the instruction caller. However, this could be any account that calls initialize! As previously mentioned, a common way to secure an initialization function is to use the program’s **upgrade_authority**, known at deployment.

[Below is an example from the Anchor documentation](https://docs.rs/anchor-lang/latest/anchor_lang/accounts/account/struct.Account.html#example-1), which uses constraint to ensure only the program's upgrade authority can call initialize:

```Rust
use anchor_lang::prelude::*;
use crate::program::MyProgram;

declare_id!("Cum9tTyj5HwcEiAmhgaS7Bbj4UczCwsucrCkxRECzM4e");

#[program]
pub mod my_program {
    use super::*;

    pub fn set_initial_admin(
        ctx: Context<SetInitialAdmin>,
        admin_key: Pubkey
    ) -> Result<()> {
        ctx.accounts.admin_settings.admin_key = admin_key;
        Ok(())
    }

    pub fn set_admin(...){...}

    pub fn set_settings(...){...}
}

#[account]
#[derive(Default, Debug)]
pub struct AdminSettings {
    admin_key: Pubkey
}

#[derive(Accounts)]
pub struct SetInitialAdmin<'info> {
    #[account(init, payer = authority, seeds = [b"admin"], bump)]
    pub admin_settings: Account<'info, AdminSettings>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(constraint = program.programdata_address()? == Some(program_data.key()))]
    pub program: Program<'info, MyProgram>,
    #[account(constraint = program_data.upgrade_authority_address == Some(authority.key()))]
    pub program_data: Account<'info, ProgramData>,
    pub system_program: Program<'info, System>,
}
```

## Loss of Precision

### The Vulnerability

Loss of precision, albeit minuscule in appearance, can pose a significant threat to a program. It can lead to incorrect calculations, arbitrage opportunities, and unexpected program behavior.

Precision loss in arithmetic operations is a common source of errors. With Solana programs, fixed-point arithmetic is recommended whenever possible. This is because programs only support a[ limited subset of Rust's float operations](https://solana.com/docs/programs/limitations#float-rust-types-support). If a program attempts to use an unsupported float operation, the runtime will return an unresolved symbol error. Additionally, float operations require more instructions compared to their integer equivalents. 

The use of fixed-point arithmetic and the need to handle large numbers of tokens and fractional amounts accurately can exacerbate precision loss.

### Multiplication After Division

While the[ associative property](https://en.wikipedia.org/wiki/Associative_property) holds for most mathematical operations, its application in computer arithmetic can lead to unexpected precision loss. 

A classic example of precision loss occurs when performing multiplication after division, which can yield different results from performing multiplication before division. For example, consider the following expressions: **(a / c) \* b** and **(a \* b) / c**. Mathematically, these expressions are associative - they *should* yield the same result. However, in the context of Solana and fixed-point arithmetic, the order of operations matters significantly. Performing division first **(a / c)** may result in a loss of precision if the quotient is rounded down before it's multiplied by **b**. This could result in a smaller result than expected. 

Conversely, multiplying **(a \* b)** before dividing by **c** could preserve more of the original precision. This difference can lead to incorrect calculations, creating unexpected program behavior and/or arbitrage opportunities.

### **saturating_\*** Arithmetic Functions

While **saturating_\*** arithmetic functions prevent overflow and underflow by capping values at their maximum or minimum possible values, they can lead to subtle bugs and precision loss if this cap is reached unexpectedly. 

This occurs when the program's logic assumes that saturation alone will guarantee an accurate result and ignores handling the potential loss of precision or accuracy.

For example, imagine a program designed to calculate and distribute rewards to users based on the amount of tokens they trade within a specific period:

```Rust
pub fn calculate_reward(transaction_amount: u64, reward_multiplier: u64) -> u64 {
    transaction_amount.saturating_mul(reward_multiplier)
}
```

Consider the scenario where the **transaction_amount** is 100,000 tokens, and the **reward_multiplier** is 100 tokens per transaction. Multiplying the two will exceed the maximum value a **u64** can hold. This means their product will be capped, leading to a substantial loss of precision by under-rewarding the user.

### Rounding Errors

Rounding operations are a common loss of precision in programming. The choice of rounding method can significantly impact the accuracy of calculations and the behavior of Solana programs. The **try_round_u64()** function rounds decimal values to the nearest whole number. Rounding up is problematic as it can artificially inflate values, leading to discrepancies between the actual and expected calculations.

Consider a Solana program that converts collateral into liquidity based on market conditions. The program uses **try_round_u64()** to round the result of a division operation:

```Rust
pub fn collateral_to_liquidity(&self, collateral_amount: u64) -> Result<u64, ProgramError> {
    Decimal::from(collateral_amount)
        .try_div(self.0)?
        .try_round_u64()
}
```

In this scenario, rounding up can lead to issuing more liquidity tokens than the collateral amount justifies. Malicious actors can exploit this discrepancy to perform arbitrage attacks to extract value from the protocol via favorably influenced rounding outcomes. To mitigate, use **try_floor_u64** to round down to the nearest whole number. This approach minimizes the risk of artificially inflating values and ensures that any rounding does not give the user an advantage at the expense of the system. 

Alternatively, implement logic to handle scenarios where rounding could explicitly impact the outcome. This might include setting specific thresholds for rounding decisions or applying different logic based on the size of the values involved.

## Missing Ownership Check

### The Vulnerability

Ownership checks are crucial to validate that the expected program owns an account involved in a transaction or operation. Accounts include an[ **owner**](https://docs.rs/solana-program/latest/solana_program/account_info/struct.AccountInfo.html#structfield.owner) field, which indicates the program with the authority to write to the account's data. This field ensures that only authorized programs can modify an account's state. 

Moreover, this field is useful for ensuring that accounts passed into an instruction are owned by the expected program. Missing ownership checks can lead to severe vulnerabilities, including unauthorized fund transfers and the execution of privileged operations.

### Example Scenario

Consider a program function defined to allow admin-only withdrawals from a vault. The function takes in a configuration account (i.e., **config**) and uses its **admin** field to check whether the provided admin account's public key is the same as the one stored in the **config** account. However, it fails to verify the **config** account's ownership, assuming it is trustworthy:

```Rust
pub fn admin_token_withdraw(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    // Account setup

    if config.admin != admin.pubkey() {
        return Err(ProgramError::InvalidAdminAccount)
    }

    // Transfer funds logic
}
```

A malicious actor could exploit this by supplying a **config** account they control with a matching **admin** field, effectively tricking the program into executing the withdrawal.

### Recommended Mitigation

To mitigate this, perform an ownership check that verifies the **owner** field of the account:

```Rust
pub fn admin_token_withdraw(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    // Account setup

    if config.admin != admin.pubkey() {
        return Err(ProgramError::InvalidAdminAccount)
    }

    if config.owner != program_id {
        return Err(ProgramError::InvalidConfigAccount)
    }

    // Transfer funds logic
}
```

Anchor streamlines this check with the **Account** type. **Account<'info, T>** is a wrapper around **AccountInfo**, which verifies program ownership and deserializes the underlying data into **T** (i.e., the specified account type). This allows developers to use **Account<'info, T>** to validate account ownership easily. Developers can also use the **#[account]** attribute to add the[ **Owner**](https://docs.rs/anchor-lang/latest/anchor_lang/trait.Owner.html) trait to a given account. This trait defines an address expected to own the account. In addition, developers can use the **owner** constraint to define the program that should own a given account if it's different from the currently executing one. This is useful, for example, when writing an instruction that expects an account to be a PDA derived from a different program. The **owner** constraint is defined as **#[account(owner = <expr>)]**, where **<expr>** is an arbitrary expression.

### Read-Only Accounts

It's equally important to verify the validity of accounts specified as read-only within a program's execution context. This is crucial because a malicious actor could pass accounts with arbitrary or crafted data instead of legitimate accounts. 

This could lead to unexpected or harmful program behavior. Developers should still perform checks to ensure that accounts a program needs to read from are genuine and not tampered with. 

This could involve verifying the account's address against known values or confirming the account's owner is as expected, especially for sysvars (i.e., read-only system accounts, such as **Clock** or **EpochSchedule**). Access sysvars using the **get()** method, which doesn't require any manual address or ownership checks. This is a safer approach to accessing these accounts; however, not all sysvars support the **get()** method. In this case, access them using their public address.

## Missing Signer Check

### The Vulnerability

Transactions are signed with a wallet's private key to ensure authentication, integrity, non-repudiation, and the authorization of a specific transaction by a specific wallet. 
By requiring transactions to be signed with the sender's private key, Solana's runtime can verify that the proper account initiates a transaction and has not been tampered with. This mechanism underpins the trustless nature of decentralized networks. 
Without this verification, any account that supplies the correct account as an argument can execute a transaction. This could lead to unauthorized access to privileged information, funds, or functionality. 
This vulnerability arises from failing to validate whether an operation is signed by the appropriate account's private key before executing certain privileged functionality.

### Example Scenario

Take the following function:

```Rust
pub fn update_admin(program_id: &Pubkey, accounts &[AccountInfo]) -> ProgramResult {
    let account_iter = &mut accounts.iter();
    let config = ConfigAccount::unpack(next_account_info(account_iter)?)?;
    let admin = next_account_info(account_iter)?;
    let new_admin = next_account_info (account_iter)?;

    if admin.pubkey() != config.admin {
        return Err(ProgramError::InvalidAdminAccount);
    }

    config.admin = new_admin.pubkey();

    Ok(())
}
```

This function intends to update the program's admin. It includes a check to ensure that the current admin initiates the operation, which is good access control. However, the function fails to verify that the current admin's private key signed the transaction. 
Thus, anyone calling this function can pass the proper **admin** account such that **admin.pubkey() = config.admin**, irrespective of whether the account calling this function is actually the current admin. This allows a malicious actor to execute the instruction with their account passed in as the new admin, directly bypassing the need for the current admin's authorization.

### Recommended Mitigation

Programs must include checks to verify that an account has been signed by the appropriate wallet. This can be done by checking the[ **AccountInfo::is_signer**](https://docs.rs/solana-program/latest/solana_program/account_info/struct.AccountInfo.html#structfield.is_signer) field of the accounts involved in the transaction. The program can enforce that only authorized accounts can perform certain actions by checking whether the account executing the privileged operation has the **is_signer** flag set to **true**.

The updated code example would look like this:

```Rust
pub fn update_admin(program_id: &Pubkey, accounts &[AccountInfo]) -> ProgramResult {
    let account_iter = &mut accounts.iter();
    let config = ConfigAccount::unpack(next_account_info(account_iter)?)?;
    let admin = next_account_info(account_iter)?;
    let new_admin = next_account_info (account_iter)?;

    if admin.pubkey() != config.admin {
        return Err(ProgramError::InvalidAdminAccount);
    }

    // Add in a check for the admin's signature
    if !admin.is_signer {
        return Err(ProgramError::NotSigner);
    }

    config.admin = new_admin.pubkey();

    Ok(())
}
```

Anchor streamlines this entire process with the [**Signer<’info>** account type](https://docs.rs/anchor-lang/latest/anchor_lang/accounts/signer/struct.Signer.html).

## Overflow and Underflow

### The Vulnerability

An integer is a number without a fractional component. Rust stores integers as fixed-size variables. These variables are defined by their[ signedness](https://en.wikipedia.org/wiki/Signedness) (i.e., signed or unsigned) and the amount of space they occupy in memory. For example, the **u8** type denotes an unsigned integer that occupies 8 bits of space. It's capable of holding values from 0 to 255. Storing a value outside of that range would result in an integer overflow or underflow. 
An integer overflow is when a variable exceeds its maximum capacity and wraps around to its minimum value. An integer underflow is when a variable drops below its minimum capacity and wraps around to its maximum value.

Rust includes checks for integer overflows and underflows when compiling in debug mode. These checks will cause the program to *panic* at runtime if such a condition is detected. However, Rust does not include checks that panic for integer overflows and underflows when compiling in release mode with the **--release** flag. This behavior can introduce subtle vulnerabilities as the overflow or underflow occurs silently. The[ Berkley Packet Filter (BPF)](https://en.wikipedia.org/wiki/Signedness) toolchain is integral to Solana's development environment as it compiles Solana programs. The **cargo build-bpf** command compiles Rust projects into BPF bytecode for deployment. *The issue with this is that it compiles programs in release mode by default*. Thus, Solana programs are vulnerable to integer overflows and underflows.

### Example Scenario

An attacker can exploit this vulnerability by taking advantage of the silent overflow/underflow behavior in release mode, especially functions that handle token balances. Take the following example:

```Rust
pub fn process_instruction(
    _program_id: & Pubkey,
    accounts: [&AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let account = next_account_info(account_info_iter)?;

    let mut balance: u8 = account.data.borrow()[0];
    let tokens_to_subtract: u8 = 100;

    balance = balance - tokens_to_subtract;

    account.data.borrow_mut()[0] = balance;
    msg!("Updated balance to {}", balance);
    
    Ok(())
}
```

This function assumes the balance is stored in the first byte for simplicity. It takes the account's balance and subtracts **tokens_to_subtract** from it. If the user's balance is less than **tokens_to_subtract**, it'll cause an underflow. For example, a user with 10 tokens would underflow to a total balance of 165 tokens

### Recommended Mitigation

#### **overflow-checks**

The easiest way to mitigate this vulnerability is to set the key **overflow-checks** to **true** in the project's **Cargo.toml** file. Here, Rust will add overflow and underflow checks in the compiler. However, adding overflow and underflow checks increases the[ compute cost](https://solana.com/docs/core/runtime#compute-budget) of a transaction. In cases where compute needs to be optimized for, it may be more beneficial to set **overflow-checks** to **false**.

#### **checked_\*** Arithmetic

Use Rust's **checked_\*** arithmetic functions on each integer type to strategically check for overflows and underflows throughout your program. These functions will return **None** if an overflow or underflow occurs. This allows the program to handle the error gracefully. For example, you could refactor the previous code to:

```Rust
pub fn process_instruction(
    _program_id: & Pubkey,
    accounts: [&AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let account = next_account_info(account_info_iter)?;

    let mut balance: u8 = account.data.borrow()[0];
    let tokens_to_subtract: u8 = 100;

    match balance.checked_sub(tokens_to_subtract) {
        Some(new_balance) => {
            account.data.borrow_mut()[0] = new_balance;
            msg!("Updated balance to {}", new_balance);
        },
        None => {
            return Err(ProgramErrorr::InsufficientFunds);
        }
    }

    Ok(())
}
```

In the revised example, **checked_sub** is used to subtract **tokens_to_subtract** from **balance**. Thus, if **balance** is sufficient to cover the subtraction, **checked_sub** will return **Some(new_balance)**. The program continues to update the account's balance safely and logs it. However, if the subtraction would result in an underflow, **checked_sub** returns **None**, which we can handle by returning an error.

#### Checked Math Macro

[Checked Math](https://github.com/blockworks-foundation/checked-math) is a[ procedural macro](https://doc.rust-lang.org/book/ch19-06-macros.html#procedural-macros-for-generating-code-from-attributes) for changing the properties for checking mathematical expressions without altering those expressions, for the most part. The issue with **checked_\*** arithmetic functions is the loss of mathematical notation. Instead, cumbersome methods like **a.checked_add(b).unwrap()** must be used instead of **a + b**. For example, if we want to write **(x \* y) + z** using the checked arithmetic functions, we'd write **x.checked_mul(y).unwrap().checked_add(z).unwrap()**.

Instead, the following expression would look like this using the Checked Math macro:

```Rust
use checked_math::checked_math as cm;

cm!((x * y) + z).unwrap()
```

This is more convenient to write, preserves the expression's mathematical notation, and only requires one **.unwrap()**. This is because the macro converts normal math expressions into an expression that returns **None** if any of the checked steps return **None**. **Some(_)** is returned, if successful, which is why we unwrap the expression at the end.

### Casting

Similarly, casting between integer types using the **as** keyword without proper checks can introduce an integer overflow or underflow vulnerability. This is because casting can either truncate or extend values in unintended ways. When casting from a larger integer type to a smaller one (e.g., **u64** to **u32**), Rust will truncate the higher bits of the original value that do not fit into the target type. This is problematic when the original value exceeds the maximum value that the target type can store. When casting from a smaller integer type to a larger one (e.g., **i16** to **i32**), Rust will extend the value. This is straightforward for unsigned types. However, this can lead to[ sign extension](https://en.wikipedia.org/wiki/Sign_extension) with signed integers to introduce unintended negative values.

#### Recommended Mitigation

Use Rust's safe casting methods to mitigate this vulnerability. This includes methods such as[ **try_from**](https://doc.rust-lang.org/std/convert/trait.TryFrom.html#tymethod.try_from) and[ **from**](https://doc.rust-lang.org/std/convert/trait.From.html#tymethod.from). Using **try_from** returns a **Result** type, allowing for the explicit handling of cases where the value does not fit into the target type gracefully. Using Rust's **from** method can be used for a safe, implicit conversion for conversions that are guaranteed to be lossless (e.g., **u8** to **u32**). For example, suppose a program needs to safely convert a **u64** token amount to a **u32** type for processing. In that case, it can do the following:

```Rust
pub fn convert_token_amount(amount: u64) -> Result<u32, ProgramError> {
    u32::try_from(amount).map_err(|_| ProgramError::InvalidArgument)
}
```

In this example, if **amount** exceeds the maximum value a **u32** can hold (i.e., 4 294 967 295), the conversion fails, and the program returns an error. This prevents a potential overflow/underflow from occurring.

## PDA Sharing

### The Vulnerability

PDA sharing is a common vulnerability that arises when the same PDA is used across multiple authority domains or roles. 
This could allow a malicious actor to access data or funds that do not belong to them via the misuse of PDAs as a signer without the proper access control checks in place.

### Example Scenario

Consider a program designed to facilitate token staking and distributing rewards. The program uses a single PDA to transfer tokens into a given pool and withdraw rewards. 
The PDA is derived using a static seed (e.g., the name of the staking pool), making it common across all operations:

```Rust
pub fn stake_tokens(ctx: Context<StakeTokens>, amount: u64) -> ProgramResult {
    // Logic to stake tokens
    Ok(())
}

pub fn withdraw_rewards(ctx: Context<WithdrawRewards>, amount: u64) -> ProgramResult {
    // Logic to withdraw rewards
    Ok(())
}

#[derive(Accounts)]
pub struct StakeTokens<'info> {
    #[account(
        mut, 
        seeds = [b"staking_pool_pda"], 
        bump
    )]
    staking_pool: AccountInfo<'info>,
    // Other staking-related accounts
}

#[derive(Accounts)]
pub struct WithdrawRewards<'info> {
    #[account(
        mut, 
        seeds = [b"staking_pool_pda"], 
        bump
    )]
    rewards_pool: AccountInfo<'info>,
    // Other rewards withdrawal-related accounts
}
```

This is problematic as the staking and rewards withdrawal functionalities rely on the same PDA derived from **staking_pool_pda**. This could allow users to manipulate the contract into unauthorized reward withdrawal or staking manipulation.

### Recommended Mitigation

To mitigate against this vulnerability, use distinct PDAs for different functionalities. Ensure that each PDA serves a specific context and is derived using unique, operation-specific seeds:

```Rust
pub fn stake_tokens(ctx: Context<StakeTokens>, amount: u64) -> ProgramResult {
    // Logic to stake tokens
    Ok(())
}

pub fn withdraw_rewards(ctx: Context<WithdrawRewards>, amount: u64) -> ProgramResult {
    // Logic to withdraw rewards
    Ok(())
}

#[derive(Accounts)]
pub struct StakeTokens<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool", &staking_pool.key().as_ref()],
        bump
    )]
    staking_pool: AccountInfo<'info>,
    // Other staking-related accounts
}

#[derive(Accounts)]
pub struct WithdrawRewards<'info> {
    #[account(
        mut,
        seeds = [b"rewards_pool", &rewards_pool.key().as_ref()],
        bump
    )]
    rewards_pool: AccountInfo<'info>,
    // Other rewards withdrawal-related accounts
}
```

In the example above, the PDAs for staking tokens and withdrawing rewards are derived using distinct seeds (**staking_pool** and **rewards_pool**, respectively) combined with the specific account's key. This ensures that the PDAs are uniquely tied to their intended functionalities, mitigating the risk of unauthorized actions.

## Remaining Accounts

### The Vulnerability

**ctx.remaining_accounts** provides a way to pass additional accounts into a function that weren’t specified in the **Accounts** struct initially. This gives more flexibility to the developer, allowing them to handle scenarios requiring a dynamic number of accounts (i.e., processing a variable number of users or interacting with different programs. However, this increased flexibility comes with a caveat: accounts passed through **ctx.remaining_accounts** do not undergo the same validation applied to accounts defined in the **Accounts** struct. Because **ctx.remaining_accounts** does not validate the accounts passed in, a malicious actor could exploit this by passing in accounts the program did not intend to interact with, leading to unauthorized actions or access.

### Example Scenario

Consider a rewards program that uses **ctx.remaining_accounts** to receive user PDAs and calculate rewards dynamically:

```Rust
pub fn calculate_rewards(ctx: Context<CalculateRewards>) -> Result<()> {
    let rewards_account = &ctx.accounts.rewards_account;
    let authority = &ctx.accounts.authority;

    // Iterate over accounts passed in via ctx.remaining_accounts
    for user_pda_info in ctx.remaining_accounts.iter() {
        // logic to check user activity and calculate rewards
    }

    // Logic to distribute calculated rewards

    Ok(())
}

#[derive(Accounts)]
pub struct CalculateRewards<'info> {
    #[account(mut)]
    pub rewards_account: Account<'info, RewardsAccount>,
    pub authority : Signer<'info>,
}

#[account]
pub struct RewardsAccount {
    pub total_rewards: u64,
    // Other relevant fields
}
```

The issue here is that there aren’t any explicit checks to validate the accounts passed in via **ctx.remaining_accounts**, meaning it fails to ensure that only valid and eligible users’ accounts are processed in the rewards calculation and distribution. 
A malicious actor could, therefore, pass in accounts they do not own, or ones created by themselves, to receive more rewards than they are actually owed.

### Recommended Mitigation

To mitigate this vulnerability, developers should manually verify each account’s validity within the function. This would include checking the account’s owner to ensure it matches an expected user’s and validate any relevant data within the account. 
By incorporating these manual checks, developers can leverage the flexibility of **ctx.remaining_acocunts** while mitigating the risk of unauthorized access or manipulation.

## Rust-Specific Errors

Rust is the *lingua franca* of program development on Solana. Developing in Rust brings forth a unique set of challenges and considerations, particularly around unsafe code and Rust-specific errors. Understanding Rust's caveats aids in developing secure, efficient, and reliable programs.

### Unsafe Rust

Rust is celebrated for its memory safety guarantees, achieved through a strict ownership and borrowing system. However, these guarantees can sometimes hinder, so Rust offers the[ **unsafe**](https://doc.rust-lang.org/book/ch19-01-unsafe-rust.html) keyword to bypass Safety checks. **unsafe** Rust is used in four primary contexts:

- **Unsafe Functions**: functions that perform operations that may violate Rust's safety guarantees must be marked with the **unsafe** keyword. For example, **unsafe fn dangerous_function() {}**
- **Unsafe Blocks**: blocks of code where unsafe operations are permitted. For example, **unsafe { // Unsafe operations }**
- **Unsafe Traits**: traits that imply certain invariants that the compiler can't verify. For example, **unsafe trait BadTrait {}**
- **Implementing Unsafe Traits**: implementations of **unsafe** traits must also be marked as **unsafe**. For example, **unsafe impl UnsafeTrait for UnsafeType {}**

Unsafe Rust exists because static analysis is conservative. When the compiler tries to determine if the code upholds a certain set of guarantees, it's better to reject a few instances of valid code than to accept a few instances of invalid code. 
Although the code might run perfectly fine, the Rust compiler will reject the code if it doesn’t have enough information to be confident in whether it upholds Rust's safety guarantees. Unsafe code allows developers to bypass these checks at their own risk. 
Moreover, computer hardware is inherently unsafe. Developers must be allowed to do unsafe operations to do low-level programming with Rust.

With the **unsafe** keyword, developers can:

- **Dereference Raw Pointers**: enables direct memory access to raw pointers that can point to any memory location, which might not hold valid data
- **Call Unsafe Functions**: these functions may not adhere to Rust's safety guarantees, and can lead to potentially undefined behavior
- **Access Mutable Static Variables**: global mutable state can cause data races

The best way to mitigate unsafe Rust is to minimize the use of **unsafe** blocks. If **unsafe** code is absolutely necessary, for whatever reason, ensure that it is well-documented, regularly audited, and, if possible, is encapsulated in a safe abstraction that can be provided to the rest of the program.

### Panics and Error Management

A panic occurs when a Rust program encounters an unrecoverable error and terminates execution. Panics are used for unexpected errors that are not meant to be caught. 
In the context of Solana programs, a panic can lead to unexpected behavior as the runtime expects programs to handle errors gracefully without crashing.

When a panic occurs, Rust starts unwinding the stack and cleaning it up as it goes. This returns a stack trace, which includes detailed information on the error involved. This could supply an attacker with information about the underlying file structure. 
While this doesn't apply to Solana programs directly, the dependencies a program uses could be vulnerable to such an attack. Ensure dependencies are kept up-to-date and use versions that do not contain known vulnerabilities.

Common panic scenarios include:

- **Division by Zero**: Rust will panic when attempting to divide by zero. Thus, always check for a zero divisor before performing a division
- **Array Index Out of Bounds**: accessing an array with an index that exceeds its bounds will cause a panic. To mitigate, use methods that return an **Option** type (like **get**) to safely access array elements
- **Unwrapping None Values**: calling **.unwrap()** on an **Option** that holds a **None** value will cause a panic. Always use pattern matching or methods like **unwrap_or**, **unwrap_or_else**, or the **?** operator in functions that return a **Result**

To mitigate issues associated with panics, it's essential to avoid operations that cause panics, validate all inputs and conditions that could give rise to problematic operations, and use the **Result** and **Option** types for error handling. Additionally, writing comprehensive program tests will help uncover and address potential panic scenarios before deployment.

## Seed Collisions

### The Vulnerability

Seed collisions occur when different inputs (i.e., seeds and program IDs) used to generate a PDA result in the same PDA address. 
This is problematic when PDAs are used within a program for different purposes, as it can lead to unexpected behavior, including denial of service attacks or complete compromise.

### Example Scenario

Consider a program for a decentralized voting platform for various proposals and initiatives. Each voting session for a given proposal or initiative is created with a unique identifier, and users submit votes. The program uses PDAs for both voting sessions and individual votes:

```Rust
// Creating a Voting Session PDA
#[derive(Accounts)]
#[instruction(session_id: String)]
pub struct CreateVotingSession<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    #[account(
        init,
        payer = organizer,
        space = 8 + Product::SIZE,
        seeds = [b"session", session_id.as_bytes()],
    )]
    pub voting_session: Account<'info, VotingSession>,
    pub system_program: Program<'info, System>,
}

// Submitting a Vote PDA
#[derive(Accounts)]
#[instruction(session_id: String)]
pub struct SubmitVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,
    #[account(
        init,
        payer = voter,
        space = 8 + Vote::SIZE,
        seeds = [session_id.as_bytes(), voter.key().as_ref()]
    )]
    pub vote: Account<'info, Vote>,
    pub system_program: Program<'info, System>,
}
```

In this scenario, an attacker would try to carefully craft a voting session that, when combined with the static seed **"session"**, would result in a PDA that coincidentally matches the PDA generated for a different voting session. 

Deliberately creating a PDA that clashes with another voting session's PDA could disrupt the platform's operations by, for example, preventing legitimate votes for proposals or denying new initiatives from being added to the platform since Solana's runtime cannot distinguish between the colliding PDAs.

### Recommended Mitigation

To mitigate the risk of seed collisions, developers can:

- Use unique prefixes for seeds across different PDAs in the same program. This approach will help ensure that PDAs remain distinct
- Use unique identifiers (e.g., timestamps, user IDs, nonce values) to guarantee that a unique PDA is generated every time
- Programmatically validate a generated PDA does not collide with existing PDAs

## Type Cosplay

### The Vulnerability

Type cosplay is a vulnerability where one account type is misrepresented as another due to a lack of type checks during deserialization. 

This can lead to the execution of unauthorized actions or data corruption, as the program would operate based on the incorrect assumption of the account's role or permissions. Always check the account's intended type during deserialization explicitly.

### Example Scenario

Consider a program that manages access to admin operations based on a user's role. Each user account includes a role discriminator to distinguish between regular users and administrators. The program contains a function to update admin settings intended only for administrators. 

However, the program fails to check the account's discriminator and deserializes user account data without confirming whether the account is an administrator:

```Rust
pub fn update_admin_settings(ctx: Context<UpdateSettings>) -> ProgramResult {
    // Deserialize without checking the discriminator
    let user = User::try_from_slice(&ctx.accounts.user.data.borrow()).unwrap();

    // Sensitive update logic

    msg!("Admin settings updated by: {}", user.authority)
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateSettings<'info> {
    user: AccountInfo<'info>
}

#[derive(BorshSerialize, BorshDeserialize)]
pub struct User {
    authority: Pubkey,
}
```

The issue is that **update_admin_settings** deserializes the user account passed in without checking the account's role discriminator, partly because the **User** struct is missing a discriminator field!

### Recommended Mitigation

To mitigate against this issue, developers can introduce a discriminator field in the **User** struct and verify it during the deserialization process:

```Rust
pub fn update_admin_settings(ctx: Context<UpdateSettings>) -> ProgramResult {
    let user = User::try_from_slice(&ctx.accounts.user.data.borrow()).unwrap();

    // Verify the user's discriminator
    if user.discriminant != AccountDiscriminant::Admin {
        return Err(ProgramError::InvalidAccountData.into())
    }
    
    // Sensitive update logic

    msg!("Admin settings updated by: {}", user.authority)
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateSettings<'info> {
    user: AccountInfo<'info>
}

#[derive(BorshSerialize, BorshDeserialize)]
pub struct User {
    discriminant: AccountDiscriminant,
    authority: Pubkey,
}

#[derive(BorshSerialize, BorshDeserialize, PartialEq)]
pub enum AccountDiscriminant {
    Admin,
    // Other account types
}
```

Anchor simplifies the mitigation of type cosplay vulnerabilities by automatically managing discriminators for account times. This is done via the **Account<'info, T>** wrapper, where Anchor ensures type safety by automatically checking the discriminator during deserialization. This allows developers to focus more on their program's business logic rather than manually implementing various type checks.

## Conclusion

The importance of program security cannot be overstated. This article has traversed the spectrum of common vulnerabilities, from Rust-specific errors to the complexities of Anchor’s **realloc** method. The path to mastering each of these vulnerabilities, and program security in general, is ongoing and demands continuous learning, adaptation, and collaboration. 

As developers, our commitment to security is not just about safeguarding assets; it’s about fostering trust, ensuring the integrity of our applications, and contributing to Solana’s growth and stability.

If you’ve read this far, thank you anon! Be sure to enter your email address below so you’ll never miss an update about what’s new on Solana. Ready to dive deeper? Explore the latest articles on the[ Helius blog](https://www.helius.dev/blog) and continue your Solana journey, today.

## Additional Resources

- [How to Become a Smart Contract Auditor](https://doc.rust-lang.org/book/ch19-01-unsafe-rust.html)
- [Immunefi](https://immunefi.com/explore/?filter=ecosystem%3DSolana)
- [Neodyme’s Solana Security Workshop](https://cmichel.io/how-to-become-a-smart-contract-auditor/)
- [Sealevel Attacks](https://github.com/coral-xyz/sealevel-attacks)
- [Solana: An Auditor’s Introduction](https://osec.io/blog/2022-03-14-solana-security-intro)
- [Unsafe Rust](https://doc.rust-lang.org/book/ch19-01-unsafe-rust.html)