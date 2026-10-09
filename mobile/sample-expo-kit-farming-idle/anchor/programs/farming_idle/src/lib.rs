pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("Hyfitmh1dAkw852R3DrXtWmLcmVoVkiR4H6D9DAMytH7");

#[program]
pub mod farming_idle {
    use super::*;

    pub fn harvest(ctx: Context<Harvest>) -> Result<()> {
        crate::instructions::harvest::handle_harvest(ctx)
    }

    pub fn initialize_farm(ctx: Context<InitializeFarm>) -> Result<()> {
        crate::instructions::initialize_farm::handle_initialize_farm(ctx)
    }

    pub fn initialize_leaderboard(ctx: Context<InitializeLeaderboard>) -> Result<()> {
        crate::instructions::initialize_leaderboard::handle_initialize_leaderboard(ctx)
    }

    pub fn submit_farm(ctx: Context<SubmitFarm>) -> Result<()> {
        crate::instructions::submit_farm::handle_submit_farm(ctx)
    }

    pub fn upgrade_farm(ctx: Context<UpgradeFarm>, crop_index: u8, amount: u8) -> Result<()> {
        crate::instructions::upgrade_farm::handle_upgrade_farm(ctx, crop_index, amount)
    }
}
