// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface StableSwapLending {
   function add_liquidity(uint256[3] calldata amounts, uint256 min_mint_amount) external;
   function remove_liquidity(uint256 _amount, uint256[3] calldata min_amounts) external;
   function remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_amount) external;
}

interface LiquidityGauge {
    function deposit(uint256 _value, address addr) external;
    function withdraw(uint256 _value) external;
    function claimable_tokens(address addr) external returns(uint256);
}

interface CRV3LPToken {
    function balanceOf(address addr) external view returns(uint256);
    function approve(address _spender, uint256 _value) external returns(bool);
}

interface CRVMINTER {
    function mint(address gauge_addr) external;
}

interface VOTINGESCROW {
    function create_lock(uint256 _value, uint256 _unlock_time) external;
    function balanceOf(address addr, uint256 _t) external returns(uint256);
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

    function lend(uint256 daiAmount, uint256 usdcAmount, uint256 usdtAmount) public {
        uint256[3] memory balance = [daiAmount, usdcAmount, usdtAmount];
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

    address constant private CRV3LP_ADDRESS = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    CRV3LPToken constant private CRV3LP_TOKEN = CRV3LPToken(CRV3LP_ADDRESS);

    function getLPBalance() public view returns(uint256) {
        return CRV3LP_TOKEN.balanceOf(address(this));
    }

    function withdrawAllLP(int128 coinIndex) public {
        uint256 bal = getLPBalance();
        if (coinIndex == -1) {
            uint256[3] memory minAmount = [uint256(0), 0, 0];
            STABLESWAP.remove_liquidity(bal, minAmount);
        } else {
            uint256 minAmount = 0;
            STABLESWAP.remove_liquidity_one_coin(bal, coinIndex, minAmount);
        }
    }

    function withdrawLP(int128 coinIndex, uint256 lpAmount) public {
        if (coinIndex == -1) {
            uint256[3] memory minAmount = [uint256(0), 0, 0];
            STABLESWAP.remove_liquidity(lpAmount, minAmount);
        } else {
            uint256 minAmount = 0;
            STABLESWAP.remove_liquidity_one_coin(lpAmount, coinIndex, minAmount);
        }
    }
}