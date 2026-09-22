use anchor_lang::prelude::*;

use crate::constants::*;

#[account]
#[derive(InitSpace)]
pub struct Farm {
    /// The wallet that created the farm and holds the funds (signs via MWA).
    pub owner: Pubkey,
    /// The local burner wallet that signs gameplay transactions without approval prompts.
    pub player: Pubkey,
    pub bump: u8,
    pub created_at: i64,
    pub last_harvested: i64,
    pub harvest_points: u64,
    /// Plots owned per crop, indexed like CROP_POINTS and CROP_COSTS.
    pub crops: [u16; CROP_COUNT],
    pub high_score: u64,
}

impl Farm {
    /// Points a harvest yields: 1 for the tap itself, plus what every plot
    /// produced per second since the last harvest.
    pub fn harvest_yield(&self, now: i64) -> u64 {
        let elapsed = now.saturating_sub(self.last_harvested).max(0) as u64;
        let mut points: u64 = 1;
        for (index, plots) in self.crops.iter().enumerate() {
            points = points.saturating_add((*plots as u64).saturating_mul(CROP_POINTS[index]).saturating_mul(elapsed));
        }
        points
    }

    /// Total cost of the next `amount` plots of a crop, starting from `owned` plots.
    pub fn upgrade_cost(base_cost: u64, owned: u16, amount: u8) -> u64 {
        let mut total: u64 = 0;
        for n in 0..amount as u16 {
            total = total.saturating_add(Self::nth_plot_cost(base_cost, owned.saturating_add(n)));
        }
        total
    }

    /// Cost of a crop's `n`th plot: the base cost compounded by 15% per plot
    /// already owned, in integer math (each step floors).
    pub fn nth_plot_cost(base_cost: u64, n: u16) -> u64 {
        let mut cost = base_cost as u128;
        for _ in 0..n {
            cost = cost.saturating_mul(COST_GROWTH_NUMERATOR) / COST_GROWTH_DENOMINATOR;
        }
        cost.min(u64::MAX as u128) as u64
    }
}

#[account]
#[derive(InitSpace)]
pub struct Leaderboard {
    pub entries: [LeaderboardEntry; LEADERBOARD_ENTRIES],
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone, Copy, Debug, Eq, InitSpace, PartialEq)]
pub struct LeaderboardEntry {
    /// The owner wallet behind the farm, not the burner player wallet.
    pub owner: Pubkey,
    pub points: u64,
}
