pragma ton-solidity >=0.46.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;
pragma AbiHeader time;

import '../errors/BaseErrors.sol';
import '../errors/OffersBaseErrors.sol';

import '../interfaces/IOffersRoot.sol';
import '../../true-nft/contracts/interfaces/IData.sol';


abstract contract Offer {
    uint128 public static price;
    address public static addrData;

    bytes static deployHash;

    address public markerRootAddr;
    address public tokenRootAddr;
    address public addrOwner;

    uint128 public deploymentFee;
    // Market fee in TON's
    uint128 public marketFee;
    uint8 public marketFeeDecimals;

    function setDefaultProperties(
        address _markerRootAddr,
        address _tokenRootAddr,
        address _addrOwner,
        uint128 _deploymentFee,
        uint128 _marketFee,
        uint8 _marketFeeDecimals
    ) 
        internal 
    {
        markerRootAddr = _markerRootAddr;
        tokenRootAddr = _tokenRootAddr;
        addrOwner = _addrOwner;
        deploymentFee = _deploymentFee;

        uint128 decimals = uint128(uint128(10) ** uint128(_marketFeeDecimals));
        marketFee = math.divc(math.muldiv(price, uint128(_marketFee), uint128(100)), decimals);
        marketFeeDecimals = _marketFeeDecimals;
    }

    modifier onlyOwner() {
        require(msg.sender == addrOwner, BaseErrors.message_sender_is_not_my_owner);
        _;
    }

    modifier onlyMarketRoot() {
        require(msg.sender == markerRootAddr, OffersBaseErrors.message_sender_is_not_my_root);
        _;
    }
}