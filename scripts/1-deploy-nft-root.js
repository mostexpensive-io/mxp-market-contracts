const { Migration, deployContract } = require(process.cwd()+'/scripts/utils');
const migration = new Migration();

async function main() {
  const account = migration.load(await locklift.factory.getAccount('SafeMultisigWallet', 'scripts/account_build'), 'Account', locklift.network);
  const NftRoot = await locklift.factory.getContract('NftRoot');
  const keyPairs = await locklift.keys.getKeyPairs();

  const Index = await locklift.factory.getContract('Index');
  const Data = await locklift.factory.getContract('Data');
  let nftRoot;
  if (locklift.network === 'local') {
    nftRoot = await locklift.giver.deployContract({
      contract: NftRoot,
      constructorParams: {
        codeIndex: Index.code,
        codeData: Data.code,
        internalOwner: account.address,
        sendGasTo: account.address
      },
      keyPair: keyPairs[0],
    }, locklift.utils.convertCrystal(6, 'nano'));
  } else {
    nftRoot = await deployContract({
      contract: NftRoot,
      constructorParams: {
        codeIndex: Index.code,
        codeData: Data.code,
        internalOwner: account.address,
        sendGasTo: account.address
      },
      keyPair: keyPairs[0],
    });
  }
  migration.store(nftRoot, 'NftRoot', locklift.network);
  console.log(`NftRoot: ${nftRoot.address}`)

}


main()
.then(() => process.exit(0))
.catch(e => {
  console.log(e);
  process.exit(1);
});
