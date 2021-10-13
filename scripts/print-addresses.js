const ZERO_ADDRESS = '0:0000000000000000000000000000000000000000000000000000000000000000';

async function main() {
  console.log()
  const keyPairs = await locklift.keys.getKeyPairs();

  const NftRoot = await locklift.factory.getContract('NftRoot');
  const Index = await locklift.factory.getContract('Index');
  const Data = await locklift.factory.getContract('Data');
  const nftRootDeployMessage = await locklift.ton.createDeployMessage({
    contract: NftRoot,
    constructorParams: {
      codeIndex: Index.code,
      codeData: Data.code,
      internalOwner: ZERO_ADDRESS, // not necessary,
      sendGasTo:  ZERO_ADDRESS // not necessary
    },
    keyPair: keyPairs[0],
  });
  console.log(`NftRoot: ${nftRootDeployMessage.address}`)

  const AuctionRootTip3 = await locklift.factory.getContract('AuctionRootTip3');
  const AuctionTip3 = await locklift.factory.getContract('AuctionTip3');
  const auctionRootDeployMessage = await locklift.ton.createDeployMessage({
    contract: AuctionRootTip3,
    constructorParams: {
      codeIndex: Index.code,
      codeData: Data.code,
      _owner: ZERO_ADDRESS,
      _offerCode: AuctionTip3.code,
      _deploymentFee: 0,
      _marketFee: 0,
      _marketFeeDecimals: 0,
      _auctionBidDelta: 10,
      _auctionBidDeltaDecimals: 0,
      _sendGasTo:  ZERO_ADDRESS
    },
    keyPair: keyPairs[0],
  });
  console.log(`AuctionRootTip3: ${auctionRootDeployMessage.address}`)

}

main()
.then(() => process.exit(0))
.catch(e => {
  console.log(e);
  process.exit(1);
});
