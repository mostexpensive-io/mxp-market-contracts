const { Migration, stringToBytesArray } = require(process.cwd()+'/scripts/utils');
const { Command } = require('commander');
const program = new Command();

const migration = new Migration();

program
  .allowUnknownOption()
  .option('-aU, --auctionAddress <address>', 'Blockchain address of auction contract')
program.parse(process.argv);
const options = program.opts();

async function main() {
    const keyPairs = await locklift.keys.getKeyPairs();
    const account = migration.load(await locklift.factory.getAccount('SafeMultisigWallet', 'scripts/account_build'), 'Account', locklift.network);
    if (!options.auctionAddress) {
        console.log();
        console.log('Your forgot about auctionAddress parameter! Pass it as a last parameter of launching this script!');
        console.log('EX: locklift run --config locklift.config.js --network local --script scripts/finish-auction.js -aU 0:5fcaf4ed07b23da3c5d9de23bc15980eef8b7d660bc043ade3cf15be1545e110');
        return;
    }
    auction = await locklift.factory.getContract('AuctionTip3')
    auction.setAddress(options.auctionAddress)
    const auctionInfo = await auction.call({
        method: 'getInfo'
    })
    console.log('Auction')
    console.log(auctionInfo)
    await account.runTarget({
        contract: auction,
        method: 'finishAuction',
        params: {
          send_gas_to: account.address,
        },
        keyPair: keyPairs[0],
    }, locklift.utils.convertCrystal(1.5, 'nano'))
    await new Promise((resolve) => { setTimeout(resolve, 30000)})
    const nft = await locklift.factory.getContract('Data')
    nft.setAddress(auctionInfo.auctionSubject)
    const nftInfo = await nft.call({
        method: 'getInfo'
    })
    console.log(nftInfo);
}

main()
.then(() => process.exit(0))
.catch(e => {
  console.log(e);
  process.exit(1);
});
