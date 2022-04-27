// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface StableSwapLending {
   function add_liquidity(uint256[3] calldata amounts, uint256 min_mint_amount) external;
   function remove_liquidity(uint256 _amount, uint256[3] calldata min_amounts) external;
}

interface LiquidityGauge {
    function deposit(uint256 _value, address addr) external;
    function withdraw(uint256 _value) external;
}

interface CRV3Token {
    function balanceOf(address addr) external view returns(uint256);
    function approve(address _spender, uint256 _value) external returns(bool);
}

contract CurveLending {
    using SafeERC20 for IERC20;

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

    address constant private STABLESWAP_ADDRESS = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    StableSwapLending constant private STABLESWAP = StableSwapLending(STABLESWAP_ADDRESS);

    function lendAll() public {
        uint256[3] memory balance = getBalance();
        approveLend(balance);
        uint256 min_mint_amount = 1;
        STABLESWAP.add_liquidity(balance, min_mint_amount);
    }

    function lend(uint256 usdcAmount) public {
        uint256[3] memory balance = getBalance();
        balance[USDC_INDEX] = usdcAmount;
        approveLend(balance);
        uint256 min_mint_amount = 1;
        STABLESWAP.add_liquidity(balance, min_mint_amount);
    }

    function getBalance() view private returns(uint256[3] memory) {
       uint256 balToken0 = token[0].balanceOf(address(this));
       uint256 balToken1 = token[1].balanceOf(address(this));
       uint256 balToken2 = token[2].balanceOf(address(this));
       return [balToken0, balToken1, balToken2];
    }

    function approveLend(uint256[3] memory balance) private {
        for (uint i = 0; i < balance.length; i++) {
            token[i].safeApprove(STABLESWAP_ADDRESS, balance[i]);
        }
    }

    address constant private CURVELP_ADDRESS = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    // Could be a specific Interface 'CurveToken' but the smart contract implements ERC20
    CRV3Token constant private CURVELP = CRV3Token(CURVELP_ADDRESS);

    function getLPBalance() public view returns(uint256) {
        return CURVELP.balanceOf(address(this));
    }

    function withdrawAll() public {
        uint256 bal = getLPBalance();
        uint256[3] memory minAmount = [uint256(0), 0, 0];
        STABLESWAP.remove_liquidity(bal, minAmount);
    }

    function withdraw(uint256 lpAmount) public {
        uint256[3] memory minAmount = [uint256(0), 0, 0];
        STABLESWAP.remove_liquidity(lpAmount, minAmount);
    }

    address constant private CURVEGAUGE_ADDRESS = 0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A;
    LiquidityGauge constant private CURVEGAUGE = LiquidityGauge(CURVEGAUGE_ADDRESS);
    IERC20 constant private CURVEGAUGE_TOKEN = IERC20(CURVEGAUGE_ADDRESS);

    function stakeAllLP() public {
        // Require that address has LP tokens
        uint256 lpBal = getLPBalance();
        CURVELP.approve(CURVEGAUGE_ADDRESS, lpBal);
        CURVEGAUGE.deposit(lpBal, address(this));
    }

    function getStakeBalance() public view returns(uint256) {
        return CURVEGAUGE_TOKEN.balanceOf(address(this));
    }

    function redeemAllStakedLP() public {
        uint256 stakeBal = getStakeBalance();
        CURVEGAUGE.withdraw(stakeBal);
    }
}