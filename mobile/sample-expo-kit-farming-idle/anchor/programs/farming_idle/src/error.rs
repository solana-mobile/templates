use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Not enough harvest points to fund the upgrade")]
    InsufficientHarvestPoints,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Not a valid crop index")]
    InvalidCrop,
    #[msg("Overflow")]
    Overflow,
}
