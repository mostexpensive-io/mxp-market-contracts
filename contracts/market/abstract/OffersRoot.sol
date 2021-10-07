pragma ton-solidity >=0.46.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;
pragma AbiHeader time;

import '../errors/BaseErrors.sol';
import '../errors/OffersBaseErrors.sol';

import '../access/InternalOwner.sol';
import '../interfaces/IOffersRoot.sol';
import '../../true-nft/contracts/resolvers/IndexResolver.sol';
import '../../true-nft/contracts/resolvers/DataResolver.sol';
import '../../true-nft/contracts/interfaces/IData.sol';



abstract contract OffersRoot is IOffersRoot, IndexResolver, DataResolver, InternalOwner {
    uint8 public marketFee;
    uint8 public marketFeeDecimals;
    uint128 public deploymentFee;
    uint128 deploymentFeePart;
    
    TvmCell offerCode;

    function setDefaultProperties(
        TvmCell codeIndex,
        TvmCell codeData,
        address _owner,
        TvmCell _offerCode,
        uint128 _deploymentFee,
        uint8 _marketFee, 
        uint8 _marketFeeDecimals
    )  
        internal
    {
        // Declared in IndexResolver
        _codeIndex = codeIndex;
        // Declared in DataResolver
        _codeData = codeData;

        offerCode = _offerCode;

        owner = _owner;
        deploymentFee = _deploymentFee;
        marketFee = _marketFee;
        marketFeeDecimals = _marketFeeDecimals;

        (deploymentFeePart, ) = math.divmod(deploymentFee, 4);
    }

    function changeDeploymentFee(uint128 _value) override external onlyOwner {
        tvm.accept();
        deploymentFee = _value;
        (deploymentFeePart, ) = math.divmod(deploymentFee, 4);
    }

    function changeMarketFee(uint8 _value, uint8 _decimals) override external onlyOwner {
        tvm.accept();
        marketFee = _value;
        marketFeeDecimals = _decimals;
    }

}