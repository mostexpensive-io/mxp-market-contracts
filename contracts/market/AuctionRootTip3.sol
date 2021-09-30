pragma ton-solidity >=0.46.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;
pragma AbiHeader time;

import './libraries/Gas.sol';

import './abstract/OffersRoot.sol';

import './AuctionTip3.sol';

contract AuctionRootTip3 is OffersRoot {
    struct MarketOffer {
        address addrRoot;
        address addrOwner;
        address addrData;
        address addrOffer;
        uint128 price;
        uint128 auctionDuration;
        bytes deployHash;
    }

    uint8 public auctionBidDelta;
    uint8 public auctionBidDeltaDecimals;

    event auctionDeployed(address offerAddress, MarketOffer offerInfo);
    event auctionDeclined(address offerAddress, MarketOffer offerInfo);

    constructor(
        TvmCell codeIndex,
        address _owner,
        TvmCell _offerCode,
        uint128 _deploymentFee,
        uint8 _marketFee, 
        uint8 _marketFeeDecimals,
        uint8 _auctionBidDelta, 
        uint8 _auctionBidDeltaDecimals
    ) 
        public 
    {
        tvm.accept();
        // Method and properties are declared in OffersRoot
        setDefaultProperties(
            codeIndex,
            _owner,
            _offerCode,
            _deploymentFee,
            _marketFee, 
            _marketFeeDecimals
        );

        auctionBidDelta = _auctionBidDelta;
        auctionBidDeltaDecimals = _auctionBidDeltaDecimals;
    }

    function onReceiveNft(
        address data_address,
        address sender_address,
        TvmCell payload
    ) external {
        tvm.rawReserve(Gas.AUCTION_ROOT_INITIAL_BALANCE, 0);
        (
            address _paymentTokenRoot,
            address _addrRoot,
            uint128 _price,
            bytes _hash,
            uint128 _auctionDuration
        ) = payload.toSlice().decode(address, address, uint128, bytes, uint128);
        if (
            _paymentTokenRoot.value > 0 &&
            _addrRoot.value > 0 &&
            _price >= 0 &&
            !_hash.empty() &&
            _auctionDuration > 0
        ) {
            address offerAddress = new AuctionTip3 {
                wid: address(this).wid,
                // TODO: calculate value
                value: math.max(0.3 ton, deploymentFeePart * 3),
                flag: 128,
                code: offerCode,
                varInit: {
                    price: _price,
                    addrData: data_address,
                    deployHash: _hash
                }
            }(
                address(this), 
                _addrRoot, 
                sender_address, 
                deploymentFeePart * 2, 
                marketFee, 
                marketFeeDecimals, 
                _auctionDuration,
                auctionBidDelta,
                _paymentTokenRoot,
                msg.sender
            );
            IData(data_address).transferOwnership{value: 0, flag: 128}(offerAddress);
            MarketOffer offerInfo = MarketOffer(_addrRoot, msg.sender, data_address, offerAddress, _price, _auctionDuration, _hash);    
            emit auctionDeployed(offerAddress, offerInfo);
        } else {
            IData(data_address).transferOwnership{value: 0, flag: 128}(sender_address);
        }
    }

    function getOfferAddres(
        address _addrData,
        uint128 _price,
        bytes _hash
    ) 
        public 
        view 
        returns (address offerAddress)
    {
        TvmCell data = tvm.buildStateInit({
            contr: AuctionTip3,
            code: offerCode,
            varInit: {
                price: _price,
                addrData: _addrData,
                deployHash: _hash
            }
        });

        offerAddress = address(tvm.hash(data));
    }

    function buildAuctionCreationPayload (
        address _paymentTokenRoot,
        address _addrRoot,
        uint128 _price,
        bytes _hash,
        uint128 _auctionDuration
    ) external pure responsible returns(TvmCell) {
        TvmBuilder builder;
        builder.store(_paymentTokenRoot, _addrRoot, _price, _hash, _auctionDuration);
        return builder.toCell();
    }
}