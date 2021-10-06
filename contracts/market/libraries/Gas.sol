pragma ton-solidity >= 0.43.0;

library Gas {
    uint128 constant DEPLOY_AUCTION_VALUE           = 2.1 ton;
    uint128 constant AUCTION_INITIAL_BALANCE        = 1 ton;
    uint128 constant AUCTION_ROOT_INITIAL_BALANCE   = 1 ton;

    // tip3
    uint128 constant DEPLOY_EMPTY_WALLET_VALUE      = 0.2 ton;
    uint128 constant DEPLOY_EMPTY_WALLET_GRAMS      = 0.1 ton;
    uint128 constant GET_WALLET_ADDRESS_VALUE       = 1.2 ton;
    uint128 constant SET_RECEIVE_CALLBACK_VALUE     = 0.5 ton;
    uint128 constant GET_TOKEN_WALLET_DETAILS       = 0.5 ton;
    uint128 constant TRANSFER_TO_RECIPIENT_VALUE    = 0.2 ton;

    // true nft
    uint128 constant TRANSFER_OWNERSHIP_VALUE       = 1 ton;
}