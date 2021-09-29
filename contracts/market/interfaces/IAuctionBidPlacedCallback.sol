pragma ton-solidity >=0.39.0;
pragma AbiHeader expire;

interface IAuctionBidPlacedCallback {
    function bidPlacedCallback(uint32 callbackId) external;
    function bidNotPlacedCallback(uint32 callbackId) external;
}
