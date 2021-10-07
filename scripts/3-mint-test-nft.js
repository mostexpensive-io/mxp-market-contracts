const {Migration} = require(process.cwd()+'/scripts/utils');
const { Command } = require('commander');
const program = new Command();

const migration = new Migration();

program
  .allowUnknownOption()
  .option('-dU, --dataUrl <url>', 'URL with some data, representing new NFT token')
program.parse(process.argv);
const options = program.opts();

async function main() {
  if (!options.dataUrl) {
    console.log();
    console.log('Your forgot about dataUrl parameter for your NFT! Pass it as a last parameter of launching this script!');
    console.log('EX: locklift run --config locklift.config.js --network local --script scripts/mint-test-nft.js -dU https://someurl.com/nft-1.json');
    return;
  }
  const account = migration.load(await locklift.factory.getAccount('Wallet', 'scripts/account_build'), 'Account', locklift.network);
  const nftRoot = migration.load(await locklift.factory.getContract('NftRoot'), 'NftRoot', locklift.network);
  const keyPairs = await locklift.keys.getKeyPairs();

  const data = await locklift.factory.getContract('Data');

  const nftId = await account.runTarget({
    contract: nftRoot,
    method: 'mintNft',
    params: {
      dataUrl: Buffer.from(options.dataUrl).toString('hex'),
      sendGasTo: account.address
    },
    keyPair: keyPairs[0],
    value: locklift.utils.convertCrystal(3, 'nano'),
  })

  const tree = await locklift.ton.client.net.query_transaction_tree({
    in_msg: nftId.transaction.in_msg,
    abi: await locklift.factory.getContract('Data').abi
  })
  /*
    * 1 is external for calling internal account owner
    * 2 is internal from account to nft root
    * 3-4 is an event and gas returning
    * 5-6-7 messages according on true nft standard (data and two indexes deploy)
  */
  if (tree.messages.length === 7) {
    console.log(`Minted NFT: ${tree.messages[6].src}`) // 7 src is data
    data.setAddress(tree.messages[6].src)
    console.log('Details:', await data.call({
      method: 'getInfo',
      params: {}
    }))
  } else {
    console.log('something goes wrong')
  }
}


main()
.then(() => process.exit(0))
.catch(e => {
  console.log(e);
  process.exit(1);
});
