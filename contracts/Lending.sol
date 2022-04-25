// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface StableSwapLending {
   function add_liquidity(uint256[3] calldata amounts, uint256 min_mint_amount) external;
}

interface CurveToken {
    function balanceOf(address account) external view returns(uint256);
}

contract CurveLending {
    using SafeERC20 for IERC20;

    address constant private DAI_ADDRESS = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant private USDC_ADDRESS = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant private USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IERC20 constant private DAI = IERC20(DAI_ADDRESS);
    IERC20 constant private USDC = IERC20(USDC_ADDRESS);
    IERC20 constant private USDT = IERC20(USDT_ADDRESS);

    IERC20[3] token = [DAI, USDC, USDT];

    address constant private STABLESWAP_ADDRESS = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    StableSwapLending constant private STABLESWAP = StableSwapLending(STABLESWAP_ADDRESS);

    function lendAll() public {
        uint256[3] memory balance = getBalance();
        approveLend(balance);
        uint256 min_mint_amount = 1;
        STABLESWAP.add_liquidity(balance, min_mint_amount);
    }

    function getBalance() view private returns(uint256[3] memory) {
       uint256 balToken1 = token[0].balanceOf(address(this));
       uint256 balToken2 = token[1].balanceOf(address(this));
       uint256 balToken3 = token[2].balanceOf(address(this));
       return [balToken1, balToken2, balToken3];
    }

    function approveLend(uint256[3] memory balance) private {
        for (uint i = 0; i < balance.length; i++) {
            token[i].safeApprove(STABLESWAP_ADDRESS, balance[i]);
        }
    }

    address constant private CURVELP_ADDRESS = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    CurveToken constant private CURVELP = CurveToken(CURVELP_ADDRESS);

    function getLPBalance() view public returns(uint256) {
        return CURVELP.balanceOf(address(this));
    }
}