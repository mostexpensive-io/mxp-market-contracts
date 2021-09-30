const {Migration} = require(process.cwd()+'/scripts/utils');
const migration = new Migration();

async function main() {
  if (locklift.network === 'local') {
    const account = migration.load(await locklift.factory.getAccount('Wallet', 'scripts/local/account_build'), 'Account', locklift.network);
    const NftRoot = await locklift.factory.getContract('NftRoot');
    const keyPairs = await locklift.keys.getKeyPairs();

    const Index = await locklift.factory.getContract('Index');
    const Data = await locklift.factory.getContract('Data');

    const nftRoot = await locklift.giver.deployContract({
      contract: NftRoot,
      constructorParams: {
        codeIndex: Index.code,
        codeData: Data.code,
        internalOwner: account.address
      },
      keyPair: keyPairs[0],
    });
    migration.store(nftRoot, 'NftRoot', locklift.network);
    console.log(`NftRoot: ${nftRoot.address}`)
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
