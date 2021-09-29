pragma ton-solidity >=0.46.0;

library SellErrors {
    uint8 constant wrong_pubkey = 200;
    uint8 constant wrong_price = 201;
    uint8 constant wrong_seller_address = 202;
    uint8 constant wrong_token_id = 203;
    uint8 constant message_sender_is_not_good_wallet = 204;
    uint8 constant not_enough_value_to_buy = 205;
    uint8 constant message_sender_is_not_my_owner = 206;
    uint8 constant buyer_is_my_owner = 207;
    uint8 constant wrong_dest_wallet = 208;
    uint8 constant message_sender_is_not_my_deployer = 209;
}