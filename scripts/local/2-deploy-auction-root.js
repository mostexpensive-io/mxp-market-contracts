const {Migration} = require(process.cwd()+'/scripts/utils');
const migration = new Migration();

async function main() {
  if (locklift.network === 'local') {
    const account = migration.load(await locklift.factory.getAccount('Wallet', 'scripts/local/account_build'), 'Account', locklift.network);
    const AuctionRootTip3 = await locklift.factory.getContract('AuctionRootTip3');
    const keyPairs = await locklift.keys.getKeyPairs();

    const Index = await locklift.factory.getContract('Index');
    const AuctionTip3 = await locklift.factory.getContract('AuctionTip3');

    const auctionRootTip3 = await locklift.giver.deployContract({
      contract: AuctionRootTip3,
      constructorParams: {
        codeIndex: Index.code,
        _owner: account.address,
        _offerCode: AuctionTip3.code,
        _deploymentFee: 0,
        _marketFee: 0,
        _marketFeeDecimals: 0,
        _auctionBidDelta: 10,
        _auctionBidDeltaDecimals: 0,
      },
      keyPair: keyPairs[0],
    });
    migration.store(auctionRootTip3, 'AuctionRootTip3', locklift.network);
    console.log(`AuctionRootTip3: ${auctionRootTip3.address}`)
  } else {
    console.log('only local scripts for now')
  }
}


main()
.then(() => process.exit(0))
.catch(e => {
  console.log(e);
  process.exit(1);
});
