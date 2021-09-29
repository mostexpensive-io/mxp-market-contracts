pragma ton-solidity >= 0.39.0;
pragma AbiHeader expire;
pragma AbiHeader pubkey;


import "./../errors/BaseErrors.sol";


contract InternalOwner {
    address public owner;

    event OwnershipTransferred(address previousOwner, address newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, BaseErrors.message_sender_is_not_my_owner);
        _;
    }

    /*
        @dev Internal function for setting owner
        Can be used in child contracts
    */
    function setOwnership(address newOwner) internal {
        address oldOwner = owner;

        owner = newOwner;

        emit OwnershipTransferred(oldOwner, newOwner);
    }

    /*
        @dev Transfer ownership to the new owner
    */
    function transferOwnership(
        address newOwner
    ) external onlyOwner {
        require(newOwner != address.makeAddrStd(0, 0), BaseErrors.zero_owner_for_ownership_transfer);

        setOwnership(newOwner);
    }

    /*
        @dev Renounce ownership. Can't be aborted!
    */
    function renounceOwnership() external onlyOwner {
        address newOwner = address.makeAddrStd(0, 0);

        setOwnership(newOwner);
    }
}