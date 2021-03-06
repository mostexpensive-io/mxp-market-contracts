const { Migration, deployContract } = require(process.cwd()+'/scripts/utils');
const migration = new Migration();

async function main() {

  const account = migration.load(await locklift.factory.getAccount('SafeMultisigWallet', 'scripts/account_build'), 'Account', locklift.network);
  const AuctionRootTip3 = await locklift.factory.getContract('AuctionRootTip3');
  const keyPairs = await locklift.keys.getKeyPairs();

  const Index = await locklift.factory.getContract('Index');
  const Data = await locklift.factory.getContract('Data');
  const AuctionTip3 = await locklift.factory.getContract('AuctionTip3');
  let auctionRootTip3;
  if (locklift.network === 'local') {
    auctionRootTip3 = await locklift.giver.deployContract({
      contract: AuctionRootTip3,
      constructorParams: {
        codeIndex: Index.code,
        codeData: Data.code,
        _owner: account.address,
        _offerCode: AuctionTip3.code,
        _deploymentFee: 0,
        _marketFee: 0,
        _marketFeeDecimals: 0,
        _auctionBidDelta: 100, // ???
        _auctionBidDeltaDecimals: 1, // ???
        _sendGasTo: account.address
      },
      keyPair: keyPairs[0],
    }, locklift.utils.convertCrystal(2, 'nano'));
  } else {
    auctionRootTip3 = await deployContract({
      contract: AuctionRootTip3,
      constructorParams: {
        codeIndex: Index.code,
        codeData: Data.code,
        _owner: account.address,
        _offerCode: AuctionTip3.code,
        _deploymentFee: 0,
        _marketFee: 0,
        _marketFeeDecimals: 0,
        _auctionBidDelta: 100, // ???
        _auctionBidDeltaDecimals: 1, // ???
        _sendGasTo: account.address
      },
      keyPair: keyPairs[0],
    });
  }
  migration.store(auctionRootTip3, 'AuctionRootTip3', locklift.network);
  console.log(`AuctionRootTip3: ${auctionRootTip3.address}`)

}


main()
.then(() => process.exit(0))
.catch(e => {
  console.log(e);
  process.exit(1);
});
