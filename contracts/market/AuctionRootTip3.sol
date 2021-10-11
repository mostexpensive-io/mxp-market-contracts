pragma ton-solidity >=0.46.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;
pragma AbiHeader time;

import './libraries/Gas.sol';
import './errors/AuctionErrors.sol';

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
        TvmCell codeData,
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
            codeData,
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
        address dataAddress,
        address dataRoot,
        uint256 dataId,
        address senderAddress,
        TvmCell payload,
        address sendGasTo
    ) external {
        tvm.rawReserve(Gas.AUCTION_ROOT_INITIAL_BALANCE, 0);
        address expectedSender = resolveData(dataRoot, dataId);
        require(msg.sender == expectedSender, AuctionErrors.wrong_data_sender);
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
                value: Gas.DEPLOY_AUCTION_VALUE,
                flag: 1,
                code: offerCode,
                varInit: {
                    price: _price,
                    addrData: dataAddress,
                    deployHash: _hash
                }
            }(
                address(this), 
                _addrRoot, 
                senderAddress, 
                deploymentFeePart * 2, 
                marketFee, 
                marketFeeDecimals, 
                _auctionDuration,
                auctionBidDelta,
                _paymentTokenRoot,
                senderAddress
            );
            MarketOffer offerInfo = MarketOffer(_addrRoot, msg.sender, dataAddress, offerAddress, _price, _auctionDuration, _hash);    
            emit auctionDeployed(offerAddress, offerInfo);
            TvmCell empty;
            IData(dataAddress).transfer{value: 0, flag: 128}(
                offerAddress,
                false,
                empty,
                sendGasTo
            );
        } else {
            TvmCell empty;
            IData(dataAddress).transfer{value: 0, flag: 128}(
                senderAddress,
                false,
                empty,
                sendGasTo
            );
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