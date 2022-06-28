# DeFi Sandbox

Integration with Curve's 3pool and Convex's staking facilities providing methods to deposit and withdraw from both protocols.

Swapping facilities through Uniswap and Curve is provided for CRV and CVX governance tokens as well.

## Testing

This has been designed to be tested on a local Ganache mainnet fork with a few unlocked accounts with an Alchemy.io data source (so an Alchemy account is required).

Please use the following command to run the blockchain environment to test the **lending smart contract** locally through Ganache and **add your API_KEY to the alchemy.io link**:

```
ganache-cli --fork https://eth-mainnet.alchemyapi.io/v2/API_KEY --unlock 0x28c6c06298d514db089934071355e5743bf21d60 --unlock 0xcffad3200574698b78f32232aa9d63eabd290703 --unlock 0x5754284f345afc66a98fbb0a0afe71e0f007b949 --unlock 0x0d2703ac846c26d5b6bbddf1fd6027204f409785 --unlock 0x5041ed759dd4afc3a72b8192c143f72f4724081a
```

Please use the following command to run the blockchain environment to test the **swap smart contract** locally through Ganache and **add your API_KEY to the alchemy.io link**:

```
ganache-cli --fork https://eth-mainnet.alchemyapi.io/v2/API_KEY --unlock 0x9b44473e223f8a3c047ad86f387b80402536b029 --unlock 0xb576491f1e6e5e62f1d8f26062ee822b40b0e0d4
```


## Main methods

```
function oneShotLendAll() public onlyOwner nonReentrant
function oneShotLend(uint256 daiAmount, uint256 usdcAmount, uint256 usdtAmount) public onlyOwner nonReentrant
function oneShotWithdrawAll(int128 coinIndex) public onlyOwner nonReentrant
function oneShotWithdraw(uint256 toWithdrawInWei, int128 coinIndex) public onlyOwner nonReentrant
```

## Deployable Contracts

- LendingDeploy.sol
- SwapDeploy.sol

These are 2 streamlined version of the tested smart contracts for lower deployment costs and with only the main methods (and some getters) exposed for security.

## This repository is built with thanks to:

- Truffle
- Solidity
- JS + Mocha