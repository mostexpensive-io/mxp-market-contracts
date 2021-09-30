const {Migration} = require(process.cwd()+'/scripts/utils');
const migration = new Migration();

async function main() {
  if (locklift.network === 'local') {
    const Account = await locklift.factory.getAccount('Wallet', 'scripts/local/account_build');
    const keyPairs = await locklift.keys.getKeyPairs();
    const account = await locklift.giver.deployContract({
      contract: Account,
      constructorParams: {},
      initParams: {
        _randomNonce: Math.random() * 64000 | 0,
      },
      keyPair: keyPairs[0],
    });
    migration.store(account, 'Account', locklift.network);
    console.log(`Wallet (Account): ${account.address}`)
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
