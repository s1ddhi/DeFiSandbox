// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface ICurve3Pool {
   function add_liquidity(uint256[3] calldata amounts, uint256 min_mint_amount) external;
   function remove_liquidity(uint256 _amount, uint256[3] calldata min_amounts) external;
   function remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_amount) external;
   function balances(uint256 index) external view returns(uint256);
}

interface ICURVE3LPToken {
    function balanceOf(address addr) external view returns(uint256);
    function approve(address _spender, uint256 _value) external returns(bool);
}

interface IConvexBooster {
    function deposit(uint256 _pid, uint256 _amount, bool _stake) external returns(bool);
    function withdraw(uint256 _pid, uint256 _amount) external returns(bool);
    function withdrawAll(uint256 _pid) external returns(bool);
    function isShutdown() external view returns(bool);
}

interface IConvexRewards {
    function balanceOf(address _account) external view returns(uint256);
    function withdraw(uint256 _amount, bool _claim) external returns(bool);
    function earned(address account) external view returns (uint256);
}

contract CurveConvexLP is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Stablecoins
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

    // ERC-20 Assets
    address constant private CRV3LP_ADDRESS = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    address constant private CONVEX_3CRV_TOKEN_ADDRESS = 0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C;
    ICURVE3LPToken constant private CRV3LP_TOKEN = ICURVE3LPToken(CRV3LP_ADDRESS);

    // Pools
    uint256 constant private CONVEX_3POOL_PID = 9; // https://etherscan.io/address/0x9700152175dc22E7d1f3245fE3c1D2cfa3602548#readContract
    address constant private CURVE3POOL_ADDRESS = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    address constant private BOOSTER_CONTRACT_ADDRESS = 0xF403C135812408BFbE8713b5A23a04b3D48AAE31;
    address constant private CONVEX_3POOL_REWARDS_ADDRESS = 0x689440f2Ff927E1f24c72F1087E1FAF471eCe1c8;
    ICurve3Pool constant private CURVE3POOL = ICurve3Pool(CURVE3POOL_ADDRESS);
    IConvexBooster constant private CONVEX_BOOSTER = IConvexBooster(BOOSTER_CONTRACT_ADDRESS);
    IConvexRewards constant private CONVEX_3POOL_REWARDS = IConvexRewards(CONVEX_3POOL_REWARDS_ADDRESS);

    // MAIN METHODS //

    function oneShotLendAll() public onlyOwner nonReentrant {
        lendAll();
        uint256 CRV3LPBal = get3CRVLPBalance();
        convexDeposit(CRV3LPBal, true);
    }

    function oneShotLend(uint256 daiAmount, uint256 usdcAmount, uint256 usdtAmount) public onlyOwner nonReentrant {
        lend(daiAmount, usdcAmount, usdtAmount);
        uint256 CRV3LPBal = get3CRVLPBalance();
        convexDeposit(CRV3LPBal, true);
    }

    function oneShotWithdrawAll(int128 coinIndex) public onlyOwner nonReentrant {
        uint256 stakedBal = getStakedConvexLPBalance();
        convexUnstake(stakedBal);
        convexWithdraw(stakedBal);
        withdrawAllLP(coinIndex);
    }

    function oneShotWithdraw(uint256 toWithdrawInWei, int128 coinIndex) public onlyOwner nonReentrant {
        convexUnstake(toWithdrawInWei);
        convexWithdraw(toWithdrawInWei);
        withdrawAllLP(coinIndex);
    }

    // MAIN METHODS //

    // UTILITY METHODS - TODO re-run gas simulation + do for Swap + interest rate model script //

    function isConvexShutdown() public view returns(bool) {
        bool status = CONVEX_BOOSTER.isShutdown();
        return status;
    }

    function getPoolBalanceToken(uint256 tokenIndex) public view returns(uint256) {
        return CURVE3POOL.balances(tokenIndex);
    }

    function getPoolBalance() public view returns(uint256[3] memory) {
        uint256 balDAI = getPoolBalanceToken(DAI_INDEX);
        uint256 balUSDC = getPoolBalanceToken(USDC_INDEX);
        uint256 balUSDT = getPoolBalanceToken(USDT_INDEX);
        return [balDAI, balUSDC, balUSDT];
    }

    function getCallerBalance() view private returns(uint256[3] memory) {
       uint256 balToken0 = token[0].balanceOf(address(this));
       uint256 balToken1 = token[1].balanceOf(address(this));
       uint256 balToken2 = token[2].balanceOf(address(this));
       return [balToken0, balToken1, balToken2];
    }


    function approveLend(uint256[3] memory balance) private {
        for (uint i = 0; i < balance.length; i++) {
            token[i].safeApprove(CURVE3POOL_ADDRESS, balance[i]);
        }
    }

    function get3CRVLPBalance() public view returns(uint256) {
        return CRV3LP_TOKEN.balanceOf(address(this));
    }

    function getStakedConvexLPBalance() public view returns(uint256) {
        return CONVEX_3POOL_REWARDS.balanceOf(address(this));
    }

    function getClaimableRewards() public view returns(uint256) {
        return CONVEX_3POOL_REWARDS.earned(address(this));
    }

    // UTILITY METHODS //

    // MODIFIERS //

    modifier isNotShutdown {
        require(!isConvexShutdown(), "Convex is not accepting deposits at the moment");
        _;
    }

    modifier hasClaimableRewards {
        uint256 rewards = getClaimableRewards();
        require(rewards != 0, "There are no claimable rewards so we cannot call this function as it tries to claim and mint non-existent rewards");
        _;
    }

    // MODIFIERS //

    // INTERNAL METHODS //

    function lendAll() private {
        uint256[3] memory balance = getCallerBalance();
        approveLend(balance);
        uint256 min_mint_amount = 1;
        CURVE3POOL.add_liquidity(balance, min_mint_amount);
    }

    function lend(uint256 daiAmount, uint256 usdcAmount, uint256 usdtAmount) private {
        uint256[3] memory balance = [daiAmount, usdcAmount, usdtAmount];
        approveLend(balance);
        uint256 min_mint_amount = 1;
        CURVE3POOL.add_liquidity(balance, min_mint_amount);
    }

    function withdrawAllLP(int128 coinIndex) private {
        uint256 bal = get3CRVLPBalance();
        if (coinIndex == -1) {
            uint256[3] memory minAmount = [uint256(0), 0, 0];
            CURVE3POOL.remove_liquidity(bal, minAmount);
        } else {
            uint256 minAmount = 0;
            CURVE3POOL.remove_liquidity_one_coin(bal, coinIndex, minAmount);
        }
    }

    function convexDeposit(uint256 amount, bool toStake) private isNotShutdown {
        CRV3LP_TOKEN.approve(BOOSTER_CONTRACT_ADDRESS, amount);
        CONVEX_BOOSTER.deposit(CONVEX_3POOL_PID, amount, toStake);
    }

    function convexUnstake(uint256 amount) private hasClaimableRewards {
        CONVEX_3POOL_REWARDS.withdraw(amount, true);
    }

    function convexWithdraw(uint256 amount) private {
        CONVEX_BOOSTER.withdraw(CONVEX_3POOL_PID, amount);
    }

    // INTERNAL METHODS //
}