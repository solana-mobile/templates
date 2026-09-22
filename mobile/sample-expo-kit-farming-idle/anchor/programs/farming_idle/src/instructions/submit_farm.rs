use anchor_lang::prelude::*;

use crate::{constants::*, state::*};

#[derive(Accounts)]
pub struct SubmitFarm<'info> {
    #[account(
        mut,
        has_one = owner,
        has_one = player,
        seeds = [FARM_SEED, farm.player.as_ref(), farm.owner.as_ref()],
        bump = farm.bump
    )]
    pub farm: Account<'info, Farm>,
    #[account(mut, seeds = [LEADERBOARD_SEED], bump)]
    pub leaderboard: Account<'info, Leaderboard>,
    // The owner signs too: the leaderboard records the owner wallet, so a
    // burner player key alone must not be able to submit in the owner's name.
    pub owner: Signer<'info>,
    pub player: Signer<'info>,
}

pub fn handle_submit_farm(ctx: Context<SubmitFarm>) -> Result<()> {
    let farm = &mut ctx.accounts.farm;
    let score = farm.harvest_points;

    if score > farm.high_score {
        farm.high_score = score;
    }

    // Claim the seat of the lowest-scoring entry if this run beats it.
    let leaderboard = &mut ctx.accounts.leaderboard;
    if let Some(lowest) = leaderboard.entries.iter_mut().min_by_key(|entry| entry.points) {
        if score > lowest.points {
            *lowest = LeaderboardEntry {
                owner: ctx.accounts.owner.key(),
                points: score,
            };
        }
    }

    // Submitting ends the run: the farm starts over.
    farm.last_harvested = Clock::get()?.unix_timestamp;
    farm.harvest_points = 0;
    farm.crops = [0; CROP_COUNT];

    Ok(())
}
