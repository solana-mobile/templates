/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/farming_idle.json`.
 */
export type FarmingIdle = {
  "address": "Hyfitmh1dAkw852R3DrXtWmLcmVoVkiR4H6D9DAMytH7",
  "metadata": {
    "name": "farmingIdle",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "harvest",
      "discriminator": [
        228,
        241,
        31,
        182,
        53,
        169,
        59,
        199
      ],
      "accounts": [
        {
          "name": "farm",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  114,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "farm.player",
                "account": "farm"
              },
              {
                "kind": "account",
                "path": "farm.owner",
                "account": "farm"
              }
            ]
          }
        },
        {
          "name": "player",
          "signer": true,
          "relations": [
            "farm"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "initializeFarm",
      "discriminator": [
        252,
        28,
        185,
        172,
        244,
        74,
        117,
        165
      ],
      "accounts": [
        {
          "name": "farm",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  114,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "player"
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeLeaderboard",
      "discriminator": [
        47,
        23,
        34,
        39,
        46,
        108,
        91,
        176
      ],
      "accounts": [
        {
          "name": "leaderboard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  101,
                  97,
                  100,
                  101,
                  114,
                  98,
                  111,
                  97,
                  114,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "submitFarm",
      "discriminator": [
        8,
        195,
        198,
        253,
        255,
        190,
        96,
        102
      ],
      "accounts": [
        {
          "name": "farm",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  114,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "farm.player",
                "account": "farm"
              },
              {
                "kind": "account",
                "path": "farm.owner",
                "account": "farm"
              }
            ]
          }
        },
        {
          "name": "leaderboard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  101,
                  97,
                  100,
                  101,
                  114,
                  98,
                  111,
                  97,
                  114,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "farm"
          ]
        },
        {
          "name": "player",
          "signer": true,
          "relations": [
            "farm"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "upgradeFarm",
      "discriminator": [
        110,
        239,
        193,
        1,
        165,
        101,
        54,
        200
      ],
      "accounts": [
        {
          "name": "farm",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  114,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "farm.player",
                "account": "farm"
              },
              {
                "kind": "account",
                "path": "farm.owner",
                "account": "farm"
              }
            ]
          }
        },
        {
          "name": "player",
          "signer": true,
          "relations": [
            "farm"
          ]
        }
      ],
      "args": [
        {
          "name": "cropIndex",
          "type": "u8"
        },
        {
          "name": "amount",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "farm",
      "discriminator": [
        161,
        156,
        211,
        253,
        250,
        64,
        53,
        250
      ]
    },
    {
      "name": "leaderboard",
      "discriminator": [
        247,
        186,
        238,
        243,
        194,
        30,
        9,
        36
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "insufficientHarvestPoints",
      "msg": "Not enough harvest points to fund the upgrade"
    },
    {
      "code": 6001,
      "name": "invalidAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6002,
      "name": "invalidCrop",
      "msg": "Not a valid crop index"
    },
    {
      "code": 6003,
      "name": "overflow",
      "msg": "Overflow"
    }
  ],
  "types": [
    {
      "name": "farm",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "The wallet that created the farm and holds the funds (signs via MWA)."
            ],
            "type": "pubkey"
          },
          {
            "name": "player",
            "docs": [
              "The local burner wallet that signs gameplay transactions without approval prompts."
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "lastHarvested",
            "type": "i64"
          },
          {
            "name": "harvestPoints",
            "type": "u64"
          },
          {
            "name": "crops",
            "docs": [
              "Plots owned per crop, indexed like CROP_POINTS and CROP_COSTS."
            ],
            "type": {
              "array": [
                "u16",
                8
              ]
            }
          },
          {
            "name": "highScore",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "leaderboard",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "entries",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "leaderboardEntry"
                  }
                },
                5
              ]
            }
          }
        ]
      }
    },
    {
      "name": "leaderboardEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "The owner wallet behind the farm, not the burner player wallet."
            ],
            "type": "pubkey"
          },
          {
            "name": "points",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "farmSeed",
      "type": "bytes",
      "value": "[102, 97, 114, 109]"
    },
    {
      "name": "leaderboardSeed",
      "type": "bytes",
      "value": "[108, 101, 97, 100, 101, 114, 98, 111, 97, 114, 100]"
    }
  ]
};
