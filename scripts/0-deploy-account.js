const { Migration, deployContract } = require(process.cwd()+'/scripts/utils');
const migration = new Migration();

async function main() {
  const Account = await locklift.factory.getAccount('Wallet', 'scripts/account_build');
  const keyPairs = await locklift.keys.getKeyPairs();
  let account;
  if (locklift.network === 'local') {
    account = await locklift.giver.deployContract({
      contract: Account,
      constructorParams: {},
      initParams: {
        _randomNonce: Math.random() * 64000 | 0,
      },
      keyPair: keyPairs[0],
    });
  } else {
    account = await deployContract({
      contract: Account,
      constructorParams: {},
      initParams: {
        _randomNonce: Math.random() * 64000 | 0,
      },
      keyPair: keyPairs[0],
    });
  }
  migration.store(account, 'Account', locklift.network);
  console.log(`Wallet (Account): ${account.address} for ${locklift.network} network`)
}


main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
