use anchor_lang::prelude::*;

use crate::{constants::*, state::*};

#[derive(Accounts)]
pub struct InitializeFarm<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Farm::INIT_SPACE,
        seeds = [FARM_SEED, player.key().as_ref(), owner.key().as_ref()],
        bump
    )]
    pub farm: Account<'info, Farm>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_farm(ctx: Context<InitializeFarm>) -> Result<()> {
    // Top up the player wallet so it can pay gameplay transaction fees without
    // the owner wallet having to approve every harvest and upgrade.
    if ctx.accounts.player.lamports() < PLAYER_TOP_UP_LAMPORTS {
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.owner.key(),
            &ctx.accounts.player.key(),
            PLAYER_TOP_UP_LAMPORTS,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.player.to_account_info(),
            ],
        )?;
    }

    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.farm.set_inner(Farm {
        owner: ctx.accounts.owner.key(),
        player: ctx.accounts.player.key(),
        bump: ctx.bumps.farm,
        created_at: now,
        last_harvested: now,
        harvest_points: 0,
        crops: [0; CROP_COUNT],
        high_score: 0,
    });

    Ok(())
}
