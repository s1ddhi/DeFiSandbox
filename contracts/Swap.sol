// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IUniswapV2Router {
  function getAmountsOut(uint256 amountIn, address[] memory path)
    external
    view
    returns (uint256[] memory amounts);

  function swapExactTokensForTokens(

    //amount of tokens we are sending in
    uint256 amountIn,
    //the minimum amount of tokens we want out of the trade
    uint256 amountOutMin,
    //list of token addresses we are going to trade in.  this is necessary to calculate amounts
    address[] calldata path,
    //this is the address we are going to send the output tokens to
    address to,
    //the last time that the trade is valid for
    uint256 deadline
  ) external returns (uint256[] memory amounts);

  function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
  external
  payable
  returns (uint[] memory amounts);
}

interface TokenSwap {
  function exchange(uint256 i, uint256 j, uint256 dx, uint256 min_dy, bool use_eth) external payable returns(uint256);
}

interface ICurve3PoolLending {
   function add_liquidity(uint256[3] calldata amounts, uint256 min_mint_amount) external;
   function remove_liquidity(uint256 _amount, uint256[3] calldata min_amounts) external;
   function remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_amount) external;
}

contract SwapGovernance {
    using SafeERC20 for IERC20;

    address constant private CRV_CONTRACT = 0xD533a949740bb3306d119CC777fa900bA034cd52;
    address constant private CVX_CONTRACT = 0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B;
    address constant private CRV3LP_CONTRACT = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;

    IERC20 constant private CRV = IERC20(CRV_CONTRACT);
    IERC20 constant private CVX = IERC20(CVX_CONTRACT);
    IERC20 constant private CRV3LP = IERC20(CRV3LP_CONTRACT);

    address private constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address private constant WETH_ADDRESS = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    IERC20 constant private WETH = IERC20(WETH_ADDRESS);

    function swapV2(address _tokenIn, address _tokenOut, uint256 _amountIn, uint256 _amountOutMin, address _to) public {
      IERC20(_tokenIn).approve(UNISWAP_V2_ROUTER, _amountIn);

      address[] memory path;
      if (_tokenIn == WETH_ADDRESS || _tokenOut == WETH_ADDRESS) {
        path = new address[](2);
        path[0] = _tokenIn;
        path[1] = _tokenOut;
      } else {
        path = new address[](3);
        path[0] = _tokenIn;
        path[1] = WETH_ADDRESS;
        path[2] = _tokenOut;
      }

      IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(_amountIn, _amountOutMin, path, _to, block.timestamp);
    }

    address private constant CRV_WETH_SWAP_ADDRESS = 0x8301AE4fc9c624d1D396cbDAa1ed877821D7C511;
    address private constant CVX_WETH_SWAP_ADDRESS = 0xB576491F1E6e5E62f1d8F26062Ee822B40B0E0d4;

    address[2] swapContracts = [CRV_WETH_SWAP_ADDRESS, CVX_WETH_SWAP_ADDRESS];
    address[2] tokenContracts = [CRV_CONTRACT, CVX_CONTRACT];

    function curveSwapGovernanceToWETH(int128 swapIndex, uint256 dx, uint256 min_dy) public returns(uint256) {
      address contractToSwapOn = swapContracts[uint128(swapIndex)];
      IERC20(tokenContracts[uint128(swapIndex)]).approve(contractToSwapOn, dx);
      uint256 resultant = TokenSwap(contractToSwapOn).exchange(1, 0, dx, min_dy, false);
      return resultant;
    }

    uint constant DAI_INDEX = 0;
    uint constant USDC_INDEX = 1;
    uint constant USDT_INDEX = 2;

    address constant private DAI_ADDRESS = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant private USDC_ADDRESS = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant private USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IERC20 constant private DAI = IERC20(DAI_ADDRESS);
    IERC20 constant private USDC = IERC20(USDC_ADDRESS);
    IERC20 constant private USDT = IERC20(USDT_ADDRESS);

    IERC20[3] token = [DAI, USDC, USDT];

    address constant private CURVE3POOL_ADDRESS = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    ICurve3PoolLending constant private CURVE3POOL = ICurve3PoolLending(CURVE3POOL_ADDRESS);

    function lend(uint256 daiAmount, uint256 usdcAmount, uint256 usdtAmount) public {
        uint256[3] memory balance = [daiAmount, usdcAmount, usdtAmount];
        approveLend(balance);
        uint256 min_mint_amount = 1;
        CURVE3POOL.add_liquidity(balance, min_mint_amount);
    }

    function approveLend(uint256[3] memory balance) private {
        for (uint i = 0; i < balance.length; i++) {
            token[i].safeApprove(CURVE3POOL_ADDRESS, balance[i]);
        }
    }

    IERC20[2] governanceToken = [CRV, CVX];

    // Goes via DAI to swap
    function swapGovernanceFor3CRV(int128 tokenIndex, uint256 swapAmount, uint256 minAmount) public {
      uint256 wethReceived = curveSwapGovernanceToWETH(tokenIndex, swapAmount, minAmount);
      swapV2(WETH_ADDRESS, DAI_ADDRESS, wethReceived, 0, address(this));
      uint256 daiAmount = DAI.balanceOf(address(this));
      lend(daiAmount, 0, 0);
    }
}