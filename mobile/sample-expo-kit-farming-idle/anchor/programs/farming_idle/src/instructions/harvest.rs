use anchor_lang::prelude::*;

use crate::{constants::*, state::*};

#[derive(Accounts)]
pub struct Harvest<'info> {
    // Re-deriving the PDA proves this farm was created for this exact
    // player/owner pair and not passed in from another game.
    #[account(
        mut,
        has_one = player,
        seeds = [FARM_SEED, farm.player.as_ref(), farm.owner.as_ref()],
        bump = farm.bump
    )]
    pub farm: Account<'info, Farm>,
    pub player: Signer<'info>,
}

pub fn handle_harvest(ctx: Context<Harvest>) -> Result<()> {
    let farm = &mut ctx.accounts.farm;
    let now = Clock::get()?.unix_timestamp;

    let points = farm.harvest_yield(now);
    farm.last_harvested = now;
    farm.harvest_points = farm.harvest_points.saturating_add(points);

    Ok(())
}
