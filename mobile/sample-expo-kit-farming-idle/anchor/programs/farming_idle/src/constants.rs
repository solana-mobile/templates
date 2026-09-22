use anchor_lang::prelude::*;

#[constant]
pub const FARM_SEED: &[u8] = b"farm";

#[constant]
pub const LEADERBOARD_SEED: &[u8] = b"leaderboard";

/// Harvest points each plot of a crop yields per second.
pub const CROP_POINTS: [u64; CROP_COUNT] = [1, 3, 8, 47, 260, 1_400, 7_800, 44_000];

/// Cost in harvest points of the first plot of each crop.
pub const CROP_COSTS: [u64; CROP_COUNT] = [15, 100, 1_100, 12_000, 130_000, 1_400_000, 20_000_000, 330_000_000];

/// Each additional plot of the same crop costs 15% more than the previous one.
/// Integer math so the TypeScript client can reproduce costs exactly.
pub const COST_GROWTH_NUMERATOR: u128 = 115;
pub const COST_GROWTH_DENOMINATOR: u128 = 100;

pub const CROP_COUNT: usize = 8;

pub const LEADERBOARD_ENTRIES: usize = 5;

/// Lamports moved from the owner to the player wallet when a farm is created,
/// so the player wallet can pay gameplay transaction fees on its own.
pub const PLAYER_TOP_UP_LAMPORTS: u64 = 10_000_000;
