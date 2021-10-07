const { expect } = require('chai');
const {
  stringToBytesArray,
  deployAccount,
  deployTokenRoot,
  deployNftRoot,
  mintNft
} = require(process.cwd() + '/test/utils')


const ZERO_ADDRESS = '0:0000000000000000000000000000000000000000000000000000000000000000';

describe('success auction e2e', async function() {
  this.timeout(1200000);

  let account;
  let account2;

  let tokenRoot;

  let nftRoot;
  let nft;

  let auctionRootTip3;
  let auction;

  let wallet1;
  let wallet2;

  // root owner is account!
  const deployTonTokenWallet = async (rootOwner, tokenRoot, owner) => {
    const keyPairs = await locklift.keys.getKeyPairs();
    await rootOwner.runTarget({
      contract: tokenRoot,
      method: 'deployWallet',
      params: {
        tokens: 10000,
        deploy_grams: locklift.utils.convertCrystal(1, 'nano'),
        wallet_public_key_: 0,
        owner_address_: owner,
        gas_back_address: ZERO_ADDRESS,
      },
      keyPair: keyPairs[0],
    }, locklift.utils.convertCrystal(1, 'nano'))
    const walletAddress = await tokenRoot.call({
      method: 'getWalletAddress',
      params: {
        wallet_public_key_: 0,
        owner_address_: owner
      }
    })
    const wallet = await locklift.factory.getAccount('TONTokenWallet', 'test/tip3_build/')
    wallet.setAddress(walletAddress)
    return wallet;
  }

  before(async function() {
    const keyPairs = await locklift.keys.getKeyPairs();
    account = await deployAccount()
    account2 = await deployAccount()
    tokenRoot = await deployTokenRoot(account.address)
    nftRoot = await deployNftRoot(account.address)
    nft = await mintNft(account, nftRoot)
    wallet1 = await deployTonTokenWallet(account, tokenRoot, account.address);
    wallet2 = await deployTonTokenWallet(account, tokenRoot, account2.address);

  })

  after('print addresses', async function() {
    console.log('account1: ', account.address, (await locklift.ton.getBalance(account.address)).toNumber() / 10**9);
    console.log('account2: ', account2.address, (await locklift.ton.getBalance(account2.address)).toNumber() / 10**9);
    console.log('tokenRoot: ', tokenRoot.address, (await locklift.ton.getBalance(tokenRoot.address)).toNumber() / 10**9);
    console.log('wallet1: ', wallet1.address, (await locklift.ton.getBalance(wallet1.address)).toNumber() / 10**9);
    console.log('wallet2: ', wallet2.address, (await locklift.ton.getBalance(wallet2.address)).toNumber() / 10**9);
    console.log('nftRoot: ', nftRoot.address, (await locklift.ton.getBalance(nftRoot.address)).toNumber() / 10**9);
    console.log('nft: ', nft.address, (await locklift.ton.getBalance(nft.address)).toNumber() / 10**9);
    console.log('auctionRootTip3: ', auctionRootTip3.address, (await locklift.ton.getBalance(auctionRootTip3.address)).toNumber() / 10**9);
    console.log('auction: ', auction.address, (await locklift.ton.getBalance(auction.address)).toNumber() / 10**9);
  })

  it('deploy auction root contract', async function() {
    const AuctionRootTip3 = await locklift.factory.getContract('AuctionRootTip3');
    const keyPairs = await locklift.keys.getKeyPairs();

    const Index = await locklift.factory.getContract('Index');
    const Data = await locklift.factory.getContract('Data');
    const AuctionTip3 = await locklift.factory.getContract('AuctionTip3');

    auctionRootTip3 = await locklift.giver.deployContract({
      contract: AuctionRootTip3,
      constructorParams: {
        codeIndex: Index.code,
        codeData: Data.code,
        _owner: account.address,
        _offerCode: AuctionTip3.code,
        _deploymentFee: 0,
        _marketFee: 0,
        _marketFeeDecimals: 0,
        _auctionBidDelta: 10,
        _auctionBidDeltaDecimals: 0,
      },
      keyPair: keyPairs[0],
    }, locklift.utils.convertCrystal(5.5, 'nano'));
    expect(auctionRootTip3.address).to.be.a('string')
      .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
  });

  it('transfer nft token to auction root with requested payload', async function() {
    const keyPairs = await locklift.keys.getKeyPairs();
    const auctionPlacePayload = await auctionRootTip3.call({
      method: 'buildAuctionCreationPayload',
      params: {
        _paymentTokenRoot: tokenRoot.address,
        _addrRoot: nftRoot.address,
        _price: 10,
        _hash: stringToBytesArray('hashh'),
        _auctionDuration: 30 // SECONDS!
      }
    })

    await account.runTarget({
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
  })

  it('checking auction', async function() {
    const auctionAddress = await auctionRootTip3.call({
      method: 'getOfferAddres',
      params: {
        _addrData: nft.address,
        _price: 10,
        _hash: stringToBytesArray('hashh')
      }
    })
    expect(auctionAddress).to.be.a('string')
      .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
    auction = await locklift.factory.getContract('AuctionTip3')
    auction.setAddress(auctionAddress)
    const bidPayloadForTest = await auction.call({
      method: 'buildPlaceBidPayload',
      params: {
        callbackId: 1
      }
    })
    expect(bidPayloadForTest).to.be.a('string')
    const auctionInfo = await auction.call({
      method: 'getInfo'
    })
    expect(auctionInfo.auctionSubject).to.equal(nft.address);
    expect(auctionInfo.subjectOwner).to.equal(account.address)
    expect(auctionInfo.paymentTokenRoot).to.equal(tokenRoot.address)
    expect(auctionInfo.walletForBids).to.not.equal(ZERO_ADDRESS)
    expect(auctionInfo.duration.toNumber()).to.equal(30)
    expect(auctionInfo.finishTime.toNumber()).to.not.equal(0)
  })

  it('make a bid', async function() {
    const keyPairs = await locklift.keys.getKeyPairs();
    const bidPayloadForTest = await auction.call({
      method: 'buildPlaceBidPayload',
      params: {
        callbackId: 101
      }
    })
    const auctionTokenWalletAddress = await auction.call({
      method: 'tokenWallet',
      params: {}
    })
    const bidBefore = await auction.call({
      method: 'currentBid',
      params: {}
    })
    expect(bidBefore.addr).to.equal(ZERO_ADDRESS)
    expect(bidBefore.value.toNumber()).to.equal(0)
    await account.runTarget({
      contract: wallet1,
      method: 'transfer',
      params: {
        to: auctionTokenWalletAddress,
        tokens: 50,
        grams: locklift.utils.convertCrystal(1, 'nano'),
        send_gas_to: account.address,
        notify_receiver: true,
        payload: bidPayloadForTest,
      },
      keyPair: keyPairs[0],
    }, locklift.utils.convertCrystal(1.4, 'nano'))
    const bidAfter = await auction.call({
      method: 'currentBid',
      params: {}
    })
    await new Promise((resolve) => { setTimeout(resolve, 7000)})
    expect(bidAfter.addr).to.equal(account.address)
    expect(bidAfter.value.toNumber()).to.equal(50)
  })

  it('make another bid from another wallet (returning lower bid)', async function() {
    const keyPairs = await locklift.keys.getKeyPairs();
    // prepare data
    const auctionTokenWalletAddress = await auction.call({
      method: 'tokenWallet',
      params: {}
    })
    const bidPayloadForTest = await auction.call({
      method: 'buildPlaceBidPayload',
      params: {
        callbackId: 1
      }
    })
    const nextBidValue = (await auction.call({
      method: 'nextBidValue'
    })).toNumber() + 1 //amount > nextBidValue
    // old data
    const firstBidderBalanceBefore = await wallet1.call({
      method: 'balance',
      params: {}
    })
    expect(firstBidderBalanceBefore.toNumber()).to.equal(9950)
    await account2.runTarget({
      contract: wallet2,
      method: 'transfer',
      params: {
        to: auctionTokenWalletAddress,
        tokens: nextBidValue,
        grams: locklift.utils.convertCrystal(1, 'nano'),
        send_gas_to: account2.address,
        notify_receiver: true,
        payload: bidPayloadForTest,
      },
      keyPair: keyPairs[0],
    }, locklift.utils.convertCrystal(1.4, 'nano'))
    await new Promise((resolve) => { setTimeout(resolve, 7000)})
    //new data
    const firstBidderBalanceAfter = await wallet1.call({
      method: 'balance',
      params: {}
    })
    expect(firstBidderBalanceAfter.toNumber()).to.equal(10000)
    const bidAfter = await auction.call({
      method: 'currentBid',
      params: {}
    })
    expect(bidAfter.addr).to.equal(account2.address)
    expect(bidAfter.value.toNumber()).to.equal(nextBidValue)
  })

  it('finish auction (case will loop-wait for ending)', async function() {
    const keyPairs = await locklift.keys.getKeyPairs();
    const sellerBalanceBefore = await wallet1.call({
      method: 'balance',
      params: {}
    })
    const bid = await auction.call({
      method: 'currentBid',
      params: {}
    })
    let auctionEndTime = await auction.call({
      method: 'auctionEndTime'
    })
    let nowSeconds = Math.round(Date.now() / 1000);
    while (auctionEndTime > nowSeconds) {
      await new Promise((resolve)=>{setTimeout(resolve, 1000)})
      nowSeconds = Math.round(Date.now() / 1000);
    }
    await account.runTarget({
      contract: auction,
      method: 'finishAuction',
      params: {
        send_gas_to: account.address,
      },
      keyPair: keyPairs[0],
    }, locklift.utils.convertCrystal(1.4, 'nano'))
    await new Promise((resolve) => { setTimeout(resolve, 7000)})
    const nftInfo = await nft.call({
      method: 'getInfo'
    })
    const sellerBalanceAfter = await wallet1.call({
      method: 'balance',
      params: {}
    })
    expect(sellerBalanceAfter.toNumber() - sellerBalanceBefore.toNumber()).to.equal(bid.value.toNumber())
    expect(nftInfo.addrOwner).to.equal(account2.address)
  })

})
