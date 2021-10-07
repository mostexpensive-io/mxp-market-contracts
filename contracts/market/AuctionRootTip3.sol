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
        address data_address,
        address data_root,
        uint256 data_id,
        address sender_address,
        TvmCell payload,
        address send_gas_to
    ) external {
        tvm.rawReserve(Gas.AUCTION_ROOT_INITIAL_BALANCE, 0);
        address expectedSender = resolveData(data_root, data_id);
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
                sender_address
            );
            MarketOffer offerInfo = MarketOffer(_addrRoot, msg.sender, data_address, offerAddress, _price, _auctionDuration, _hash);    
            emit auctionDeployed(offerAddress, offerInfo);
            TvmCell empty;
            IData(data_address).transfer{value: 0, flag: 128}(
                offerAddress,
                false,
                empty,
                send_gas_to
            );
        } else {
            TvmCell empty;
            IData(data_address).transfer{value: 0, flag: 128}(
                sender_address,
                false,
                empty,
                send_gas_to
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