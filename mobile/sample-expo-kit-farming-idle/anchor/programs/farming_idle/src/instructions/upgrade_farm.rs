use anchor_lang::prelude::*;

use crate::{constants::*, error::ErrorCode, state::*};

#[derive(Accounts)]
pub struct UpgradeFarm<'info> {
    #[account(
        mut,
        has_one = player,
        seeds = [FARM_SEED, farm.player.as_ref(), farm.owner.as_ref()],
        bump = farm.bump
    )]
    pub farm: Account<'info, Farm>,
    pub player: Signer<'info>,
}

pub fn handle_upgrade_farm(ctx: Context<UpgradeFarm>, crop_index: u8, amount: u8) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);
    let index = crop_index as usize;
    require!(index < CROP_COUNT, ErrorCode::InvalidCrop);

    let farm = &mut ctx.accounts.farm;
    let owned = farm.crops[index];
    let cost = Farm::upgrade_cost(CROP_COSTS[index], owned, amount);
    require!(farm.harvest_points >= cost, ErrorCode::InsufficientHarvestPoints);

    farm.harvest_points -= cost;
    farm.crops[index] = owned.checked_add(amount as u16).ok_or(ErrorCode::Overflow)?;

    Ok(())
}
