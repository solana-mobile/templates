use anchor_lang::prelude::*;

use crate::{constants::*, state::*};

#[derive(Accounts)]
pub struct InitializeLeaderboard<'info> {
    // One global leaderboard per program deployment; anyone can pay to create it.
    #[account(
        init,
        payer = payer,
        space = 8 + Leaderboard::INIT_SPACE,
        seeds = [LEADERBOARD_SEED],
        bump
    )]
    pub leaderboard: Account<'info, Leaderboard>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_leaderboard(ctx: Context<InitializeLeaderboard>) -> Result<()> {
    ctx.accounts.leaderboard.entries = [LeaderboardEntry {
        owner: Pubkey::default(),
        points: 0,
    }; LEADERBOARD_ENTRIES];

    Ok(())
}
