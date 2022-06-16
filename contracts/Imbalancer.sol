// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ICurve3Pool {
   function add_liquidity(uint256[3] calldata amounts, uint256 min_mint_amount) external;
   function remove_liquidity(uint256 _amount, uint256[3] calldata min_amounts) external;
   function remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_amount) external;
   function balances(uint256 index) external view returns(uint256);
}

contract Imbalancer {
    using SafeERC20 for IERC20;

    address constant private DAI_ADDRESS = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant private USDC_ADDRESS = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant private USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IERC20 constant private DAI = IERC20(DAI_ADDRESS);
    IERC20 constant private USDC = IERC20(USDC_ADDRESS);
    IERC20 constant private USDT = IERC20(USDT_ADDRESS);

    IERC20[3] token = [DAI, USDC, USDT];

    address constant private CURVE3POOL_ADDRESS = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    ICurve3Pool constant private CURVE3POOL = ICurve3Pool(CURVE3POOL_ADDRESS);

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
}