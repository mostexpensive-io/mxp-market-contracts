pragma ton-solidity >=0.46.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;
pragma AbiHeader time;

import './libraries/Gas.sol';

import './abstract/Offer.sol';

import './interfaces/IRootTokenContract.sol';
import './interfaces/ITONTokenWallet.sol';
import './interfaces/ITokensReceivedCallback.sol';
import './interfaces/IAuctionBidPlacedCallback.sol';

import './errors/AuctionErrors.sol';
import './errors/BaseErrors.sol';

contract AuctionTip3 is Offer, ITokensReceivedCallback {
    address public paymentTokenRoot;
    address public tokenWallet;
    uint public auctionDuration;
    uint public auctionEndTime;
    uint8 public bidDelta;

    struct AuctionDetails {
        address auctionSubject;
        address subjectOwner;
        address paymentTokenRoot;
        address walletForBids;
        uint duration;
        uint finishTime;
    }

    struct Bid {
        address addr;
        uint128 value;
    }

    Bid public currentBid;
    uint128 public maxBidValue;
    uint128 public nextBidValue;

    enum AuctionStatus {
        Created,
        Active,    
        Complete,
        Cancelled
    }
    AuctionStatus state;

    event BidPlaced(address buyerAddress, uint128 value);
    event BidDeclined(address buyerAddress, uint128 value);

    // TODO: pass bidDelta decimals?
    constructor(
        address _markerRootAddr,
        address _tokenRootAddr,
        address _addrOwner,
        uint128 _deploymentFee,
        uint128 _marketFee,
        uint8 _marketFeeDecimals,
        uint128 _auctionDuration, 
        uint8 _bidDelta,
        address _paymentTokenRoot,
        address sendGasTo
    ) public {
        tvm.accept();
        setDefaultProperties(
            _markerRootAddr, 
            _tokenRootAddr, 
            _addrOwner, 
            _deploymentFee, 
            _marketFee, 
            _marketFeeDecimals
        );

        auctionDuration = _auctionDuration;
        auctionEndTime = now + _auctionDuration;
        maxBidValue = price;
        bidDelta = _bidDelta;
        nextBidValue = price;
        paymentTokenRoot = _paymentTokenRoot;
        state = AuctionStatus.Created;

        IRootTokenContract(paymentTokenRoot).deployEmptyWallet {
            value: Gas.DEPLOY_EMPTY_WALLET_VALUE,
            flag: 1
        }(
            Gas.DEPLOY_EMPTY_WALLET_GRAMS,  // deploy_grams
            0,                              // wallet_public_key
            address(this),                  // owner_address
            address(this)                   // gas_back_address
        );

        IRootTokenContract(paymentTokenRoot).getWalletAddress{
            value: Gas.GET_WALLET_ADDRESS_VALUE,
            flag: 1,
            callback: AuctionTip3.onTokenWallet
        }(
            0,                              // wallet_public_key_
            address(this)                   // owner_address_
        );

        sendGasTo.transfer({ value: 0, flag: 128, bounce: false });
    }

    function tokensReceivedCallback(
        address token_wallet,			// адрес TONTokenWallet на который поступили средства, должен совпадать с msg.sender
        address token_root,				// адрес RootTokenContract соответствующий типу полученных токенов
        uint128 amount,					// количество токенов
        uint256 sender_public_key,		// аккаунт отправителя, кодируется двумя полями
        address sender_address,			 
        address sender_wallet,			// адрес TONTokenWallet отправителя
        address original_gas_to,		// адрес для возврата газа, указанный отправитеем в параметре send_gas_to
        uint128 updated_balance,		// баланс TONTokenWallet после получения токенов
        TvmCell payload					// сообщение приложенное к транзакции токенов, указанное отправитеем в одноименном параметре
    ) override external {
        tvm.rawReserve(Gas.AUCTION_INITIAL_BALANCE, 0);
        if (
            msg.value >= Gas.TOKENS_RECEIVED_CALLBACK_VALUE &&
            amount > nextBidValue && // require(msg.value > nextBidValue, AuctionErrors.bid_is_too_low);
            msg.sender == tokenWallet && // значение переменной контракта из п.2
            msg.sender == token_wallet && // параметр из tokensReceiveCallback
            tokenWallet.value != 0 &&
            paymentTokenRoot == token_root && // переменная соответствует параметру переданному в tokensReceiveCallback
            now < auctionEndTime &&
            state == AuctionStatus.Active
        ) {
            processBid(sender_address, amount, payload);
        } else {
            emit BidDeclined(sender_address, amount);
            sendBidResultCallback(sender_address, payload, false);
            TvmCell empty;
            ITONTokenWallet(msg.sender).transferToRecipient{ value: 0, flag: 128 }(
                0,
                sender_address,
                amount,
                0,
                0,
                original_gas_to,
                false,
                empty
            );   
        }
    }

    function processBid(address _newBidSender, uint128 _bid, TvmCell _callbackPayload) private {
        Bid _currentBid = currentBid;
        Bid newBid = Bid(_newBidSender, _bid);
        maxBidValue = _bid;
        currentBid = newBid;
        calculateAndSetNextBid();
        emit BidPlaced(_newBidSender, _bid);
        sendBidResultCallback(_newBidSender, _callbackPayload, true);
        // Return lowest bid value to the bidder's address
        // TODO Who pays? Now _newBidSender is send_gas_to for transferToRecipient
        if (_currentBid.value > 0) {
            TvmCell empty;
            ITONTokenWallet(msg.sender).transferToRecipient{ value: 0, flag: 128 }(
                0,
                _currentBid.addr,
                _currentBid.value,
                0,
                0,
                _newBidSender,
                false,
                empty
            );
        }
    }

    function finishAuction(
        address send_gas_to
    ) public {
        require(now >= auctionEndTime, AuctionErrors.auction_still_in_progress);
        require(msg.value >= Gas.FINISH_AUCTION_VALUE, BaseErrors.not_enough_value);
        if (maxBidValue > price) {
            TvmCell empty;
            IData(addrData).transfer{value: Gas.TRANSFER_OWNERSHIP_VALUE, flag: 1}(
                currentBid.addr,
                false,
                empty,
                send_gas_to
            );
            ITONTokenWallet(tokenWallet).transferToRecipient{ value: 0, flag: 128 }(
                0,
                addrOwner,
                maxBidValue,
                0,
                0,
                send_gas_to,
                false,
                empty
            );
            state = AuctionStatus.Complete;
        } else {
            state = AuctionStatus.Cancelled;
            TvmCell empty;
            IData(addrData).transfer{value: Gas.TRANSFER_OWNERSHIP_VALUE, flag: 1}(
                addrOwner,
                false,
                empty,
                addrOwner
            );
        }
    }

    //TODO: recalc with decimals
    function calculateAndSetNextBid() private {
        nextBidValue = maxBidValue + math.muldivc(maxBidValue, uint128(bidDelta), uint128(10000));
    }

    function onTokenWallet(address value) external {
        require(msg.sender.value != 0 && msg.sender == paymentTokenRoot, BaseErrors.operation_not_permited);
        tvm.accept();
        tokenWallet = value;
        ITONTokenWallet(value).setReceiveCallback{
            value: Gas.SET_RECEIVE_CALLBACK_VALUE,
            flag: 1
        }(address(this), true);
        ITONTokenWallet(value).getDetails{
            value: Gas.GET_TOKEN_WALLET_DETAILS,
            flag: 1,
            callback: AuctionTip3.onTokenWalletDetails
        }();
    }

    function onTokenWalletDetails(ITONTokenWallet.ITONTokenWalletDetails details) external {
        require(msg.sender.value != 0 && msg.sender == tokenWallet, BaseErrors.operation_not_permited);
        tvm.accept();

        if (
            details.root_address == paymentTokenRoot &&
            details.owner_address == address(this) &&
            details.receive_callback == address(this) && 
            details.allow_non_notifiable
        ) {
            state = AuctionStatus.Active;
        }
    }

    function sendBidResultCallback(
        address _callbackTarget,
        TvmCell _payload,
        bool _isBidPlaced
    ) private {
        if(_callbackTarget.value != 0) {
            uint32 callbackId = 404;
            if (_payload.toSlice().bits() >= 32) {
                callbackId = _payload.toSlice().decode(uint32);
            }
            if (_isBidPlaced) {
                IAuctionBidPlacedCallback(_callbackTarget).bidPlacedCallback{value: 1, flag: 1, bounce: false}(callbackId);
            } else {
                IAuctionBidPlacedCallback(_callbackTarget).bidNotPlacedCallback{value: 2, flag: 1, bounce: false}(callbackId);
            }
        }
    }

    function buildPlaceBidPayload(uint32 callbackId) external pure responsible returns (TvmCell) {
        TvmBuilder builder;
        builder.store(callbackId);
        return builder.toCell();
    }

    function getInfo() external view responsible returns (AuctionDetails) {
        return AuctionDetails(addrData, addrOwner, paymentTokenRoot, tokenWallet, auctionDuration, auctionEndTime);
    }
}