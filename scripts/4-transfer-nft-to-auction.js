const { Migration, stringToBytesArray } = require(process.cwd()+'/scripts/utils');
const { Command } = require('commander');
const program = new Command();

const migration = new Migration();

program
  .allowUnknownOption()
  .option('-aD, --dataAddress <address>', 'Blockchain address of transferable Data contract (True NFT)')
program.parse(process.argv);
const options = program.opts();

async function main() {
  const keyPairs = await locklift.keys.getKeyPairs();
  const account = migration.load(await locklift.factory.getAccount('Wallet', 'scripts/account_build'), 'Account', locklift.network);
  if (!options.dataAddress) {
    console.log();
    console.log('Your forgot about dataAddress parameter of your NFT! Pass it as a last parameter of launching this script!');
    console.log('EX: locklift run --config locklift.config.js --network local --script scripts/mint-test-nft.js -aD 0:5fcaf4ed07b23da3c5d9de23bc15980eef8b7d660bc043ade3cf15be1545e110');
    return;
  }
  const auctionRootTip3 = migration.load(await locklift.factory.getContract('AuctionRootTip3'), 'AuctionRootTip3', locklift.network);

  const nftRoot = migration.load(await locklift.factory.getContract('NftRoot'), 'NftRoot', locklift.network);
  const nft = await locklift.factory.getContract('Data')
  nft.setAddress(options.dataAddress)

  // TODO: maybe read from some config? hardcoded for now
  const auctionParams = {
    _paymentTokenRoot: '0:53aa54d465a6680eab3895e61714aa2fdf86250a433b4005191dd0392820fc91',
    //_paymentTokenRoot: '0:0ee39330eddb680ce731cd6a443c71d9069db06d149a9bec9569d1eb8d04eb37', // WTON
    _addrRoot: nftRoot.address,
    _price: 1,
    _hash: stringToBytesArray((Math.random() + 1).toString(36).substring(2)),
    _auctionDuration: 604800 // SECONDS! (604800 is 7 days)
  }
  console.log()
  console.log('Auction Params:')
  console.log(auctionParams)

  const auctionPlacePayload = await auctionRootTip3.call({
    method: 'buildAuctionCreationPayload',
    params: auctionParams
  })
  console.log()
  console.log('Generated payload: ', auctionPlacePayload)
  console.log()

  const tx = await account.runTarget({
    contract: nft,
    method: 'transfer',
    params: {
      addrTo: auctionRootTip3.address,
      notify: true,
      payload: auctionPlacePayload,
      sendGasTo: account.address
    },
    keyPair: keyPairs[0],
    value: locklift.utils.convertCrystal(5.3, 'nano'),
  })
  console.log('TX in_msg')
  console.log(tx.transaction.in_msg)
  console.log()

  const auctionAddress = await auctionRootTip3.call({
    method: 'getOfferAddres',
    params: {
      _addrData: nft.address,
      _price: auctionParams._price,
      _hash: auctionParams._hash
    }
  })
  console.log(auctionAddress)
  console.log('Waiting some time...')
  await new Promise((resolve) => { setTimeout(resolve, 30000)})
  auction = await locklift.factory.getContract('AuctionTip3')
  auction.setAddress(auctionAddress)
  const auctionInfo = await auction.call({
    method: 'getInfo'
  })
  console.log('Auction Info:')
  console.log(auctionInfo)
}

main()
.then(() => process.exit(0))
.catch(e => {
  console.log(e);
  process.exit(1);
});
