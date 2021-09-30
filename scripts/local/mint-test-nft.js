const {Migration} = require(process.cwd()+'/scripts/utils');
const migration = new Migration();

async function main() {
  if (locklift.network === 'local') {
    const account = migration.load(await locklift.factory.getAccount('Wallet', 'scripts/local/account_build'), 'Account', locklift.network);
    const nftRoot = migration.load(await locklift.factory.getContract('NftRoot'), 'NftRoot', locklift.network);
    const keyPairs = await locklift.keys.getKeyPairs();

    const data = await locklift.factory.getContract('Data');

    const nftId = await account.runTarget({
      contract: nftRoot,
      method: 'mintNft',
      keyPair: keyPairs[0]
    })

    const tree = await locklift.ton.client.net.query_transaction_tree({
      in_msg: nftId.transaction.in_msg,
      abi: await locklift.factory.getContract('Data').abi
    })
    /*
     * 1 is external for calling internal account owner
     * 2 is internal from account to nft root
     * 3-4-5 messages according on true nft standard (data and two indexes deploy)
    */
    if (tree.messages.length === 5) {
      console.log(`Minted NFT: ${tree.messages[2].dst}`) // 2 is a Data deploy message
      data.setAddress(tree.messages[2].dst)
      console.log('Details:', await data.call({
        method: 'getInfo',
        params: {}
      }))
    } else {
      console.log('something goes wrong')
    }
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
