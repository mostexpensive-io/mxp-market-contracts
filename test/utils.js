const stringToBytesArray = (dataString) => {
  return Buffer.from(dataString).toString('hex')
};

async function deployAccount() {
  const Account = await locklift.factory.getAccount('Wallet', 'scripts/account_build');
  const keyPairs = await locklift.keys.getKeyPairs();
  const account = await locklift.giver.deployContract({
    contract: Account,
    constructorParams: {},
    initParams: {
      _randomNonce: Math.random() * 64000 | 0,
    },
    keyPair: keyPairs[0],
  }, locklift.utils.convertCrystal(100, 'nano'));
  return account
}

async function deployTokenRoot(owner) {
  const RootTokenContract = await locklift.factory.getAccount('RootTokenContract', 'test/tip3_build/');
  const TONTokenWallet = await locklift.factory.getAccount('TONTokenWallet', 'test/tip3_build/');
  const keyPairs = await locklift.keys.getKeyPairs();
  const rootTokenContract = await locklift.giver.deployContract({
    contract: RootTokenContract,
    constructorParams: {
      root_public_key_: 0,
      root_owner_address_: owner
    },
    initParams: {
      name: stringToBytesArray('FooToken'),
      symbol: stringToBytesArray('FOO'),
      decimals: 0,
      wallet_code: TONTokenWallet.code
    },
    keyPair: keyPairs[0],
  }, locklift.utils.convertCrystal(100, 'nano'));
  return rootTokenContract;
}

async function deployNftRoot(owner) {
  const NftRoot = await locklift.factory.getContract('NftRoot');
  const keyPairs = await locklift.keys.getKeyPairs();

  const Index = await locklift.factory.getContract('Index');
  const Data = await locklift.factory.getContract('Data');

  const nftRoot = await locklift.giver.deployContract({
    contract: NftRoot,
    constructorParams: {
      codeIndex: Index.code,
      codeData: Data.code,
      internalOwner: owner,
      sendGasTo: owner,
    },
    keyPair: keyPairs[0],
  }, locklift.utils.convertCrystal(6, 'nano'));
  return nftRoot;
}

async function mintNft(account, root) {
  const keyPairs = await locklift.keys.getKeyPairs();
  const nftTx = await account.runTarget({
    contract: root,
    method: 'mintNft',
    params: {
      dataUrl: Buffer.from('test purposes').toString('hex'),
      sendGasTo: account.address
    },
    keyPair: keyPairs[0],
    value: locklift.utils.convertCrystal(3, 'nano'),
  })

  const tree = await locklift.ton.client.net.query_transaction_tree({
    in_msg: nftTx.transaction.in_msg,
    abi: await locklift.factory.getContract('Data').abi
  })
  if (tree.messages.length != 7) {
    throw new Error('mint error')
  }
  const data = await locklift.factory.getContract('Data')
  data.setAddress(tree.messages[6].src)
  return data
}

module.exports = {
  stringToBytesArray,
  deployAccount,
  deployTokenRoot,
  deployNftRoot,
  mintNft
}
