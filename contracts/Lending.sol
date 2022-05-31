// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ICurve3Pool {
   function add_liquidity(uint256[3] calldata amounts, uint256 min_mint_amount) external;
   function remove_liquidity(uint256 _amount, uint256[3] calldata min_amounts) external;
   function remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 min_amount) external;
}

interface ICURVE3LPToken {
    function balanceOf(address addr) external view returns(uint256);
    function approve(address _spender, uint256 _value) external returns(bool);
}

// Also known as the "Deposit contract"
interface IConvexBooster {
    //deposit into convex, receive a tokenized deposit.  parameter to stake immediately
    function deposit(uint256 _pid, uint256 _amount, bool _stake) external returns(bool);
    //burn a tokenized deposit to receive curve lp tokens back
    function withdraw(uint256 _pid, uint256 _amount) external returns(bool);
    //burn all tokenized deposit to receive all curve lp tokens back
    function withdrawAll(uint256 _pid) external returns(bool);
}

interface IConvexRewards {
    //get balance of an address
    function balanceOf(address _account) external view returns(uint256);
    //withdraw to a convex tokenized deposit
    function withdraw(uint256 _amount, bool _claim) external returns(bool);
    //withdraw directly to curve LP token
    function withdrawAndUnwrap(uint256 _amount, bool _claim) external returns(bool);
    //claim rewards
    function getReward() external returns(bool);
    //stake a convex tokenized deposit
    function stake(uint256 _amount) external returns(bool);
    //stake a convex tokenized deposit for another address(transfering ownership)
    function stakeFor(address _account,uint256 _amount) external returns(bool);
    //get earned awards of an address
    function earned(address account) external view returns (uint256);
}

interface ICurveGauge {
    function claimable_tokens(address addr) external returns(uint256);
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

    address constant private CURVE3POOL_ADDRESS = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    ICurve3Pool constant private CURVE3POOL = ICurve3Pool(CURVE3POOL_ADDRESS);

    function lendAll() public {
        uint256[3] memory balance = getBalance();
        approveLend(balance);
        uint256 min_mint_amount = 1;
        CURVE3POOL.add_liquidity(balance, min_mint_amount);
    }

    function lend(uint256 daiAmount, uint256 usdcAmount, uint256 usdtAmount) public {
        uint256[3] memory balance = [daiAmount, usdcAmount, usdtAmount];
        approveLend(balance);
        uint256 min_mint_amount = 1;
        CURVE3POOL.add_liquidity(balance, min_mint_amount);
    }

    function getBalance() view private returns(uint256[3] memory) {
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

    address constant private CRV3LP_ADDRESS = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    ICURVE3LPToken constant private CRV3LP_TOKEN = ICURVE3LPToken(CRV3LP_ADDRESS);

    function get3CRVLPBalance() public view returns(uint256) {
        return CRV3LP_TOKEN.balanceOf(address(this));
    }

    function withdrawAllLP(int128 coinIndex) public {
        uint256 bal = get3CRVLPBalance();
        if (coinIndex == -1) {
            uint256[3] memory minAmount = [uint256(0), 0, 0];
            CURVE3POOL.remove_liquidity(bal, minAmount);
        } else {
            uint256 minAmount = 0;
            CURVE3POOL.remove_liquidity_one_coin(bal, coinIndex, minAmount);
        }
    }

    function withdrawLP(int128 coinIndex, uint256 lpAmount) public {
        if (coinIndex == -1) {
            uint256[3] memory minAmount = [uint256(0), 0, 0];
            CURVE3POOL.remove_liquidity(lpAmount, minAmount);
        } else {
            uint256 minAmount = 0;
            CURVE3POOL.remove_liquidity_one_coin(lpAmount, coinIndex, minAmount);
        }
    }

    // https://etherscan.io/address/0x9700152175dc22E7d1f3245fE3c1D2cfa3602548#readContract
    uint256 constant private PID = 9;

    address constant private BOOSTER_CONTRACT_ADDRESS = 0xF403C135812408BFbE8713b5A23a04b3D48AAE31;
    IConvexBooster constant private CONVEX_BOOSTER = IConvexBooster(BOOSTER_CONTRACT_ADDRESS);
    address constant private CONVEX_3POOL_REWARDS_ADDRESS = 0x689440f2Ff927E1f24c72F1087E1FAF471eCe1c8;
    IConvexRewards constant private CONVEX_3POOL_REWARDS = IConvexRewards(CONVEX_3POOL_REWARDS_ADDRESS);
    address constant private CONVEX_3CRV_TOKEN_ADDRESS = 0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C;
    IERC20 constant private CONVEX_3CRV_TOKEN = IERC20(CONVEX_3CRV_TOKEN_ADDRESS);

    function convexDeposit(uint256 amount, bool toStake) public {
        CRV3LP_TOKEN.approve(BOOSTER_CONTRACT_ADDRESS, amount);
        CONVEX_BOOSTER.deposit(PID, amount, toStake);
    }

    function getConvexLPBalance() public view returns(uint256) {
        return CONVEX_3CRV_TOKEN.balanceOf(address(this));
    }

    function getStakedConvexLPBalance() public view returns(uint256) {
        return CONVEX_3POOL_REWARDS.balanceOf(address(this));
    }

    function getClaimableRewards() public view returns(uint256) {
        return CONVEX_3POOL_REWARDS.earned(address(this));
    }

    address constant private CRV_TOKEN_ADDRESS = 0xD533a949740bb3306d119CC777fa900bA034cd52;
    IERC20 constant private CRV_TOKEN = IERC20(CRV_TOKEN_ADDRESS);

    function getCRVBalance() public view returns(uint256) {
        return CRV_TOKEN.balanceOf(address(this));
    }

    address constant private CVX_TOKEN_ADDRESS = 0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B;
    IERC20 constant private CVX_TOKEN = IERC20(CVX_TOKEN_ADDRESS);

    function getCVXBalance() public view returns(uint256) {
        return CVX_TOKEN.balanceOf(address(this));
    }

    function claimRewards() public {
        CONVEX_3POOL_REWARDS.getReward();
    }

    // TODO check when no rewards to claim (if need to normalise rewards w.r.t. ERC20 decimal)
    modifier hasClaimableRewards {
        uint256 rewards = getClaimableRewards();
        require(rewards != 0, "There are no claimable rewards so we cannot call this function as it tries to claim and mint non-existent rewards");
        _;
    }

    function convexUnstake(uint256 amount) public hasClaimableRewards {
        CONVEX_3POOL_REWARDS.withdraw(amount, true);
    }

    function convexWithdraw(uint256 amount) public {
        CONVEX_BOOSTER.withdraw(PID, amount);
    }

    address constant private CURVE_GAUGE_ADDRESS = 0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A;
    ICurveGauge constant private CURVE_GAUGE = ICurveGauge(CURVE_GAUGE_ADDRESS);

    function getGaugeBalance() public returns(uint256) {
        uint256 bal = CURVE_GAUGE.claimable_tokens(address(this));
        return bal;
    }

    function oneShotLendAll() public {
        lendAll();
        uint256 CRV3LPBal = get3CRVLPBalance();
        convexDeposit(CRV3LPBal, true);
    }

    function oneShotLend(uint256 daiAmount, uint256 usdcAmount, uint256 usdtAmount) public {
        lend(daiAmount, usdcAmount, usdtAmount);
        uint256 CRV3LPBal = get3CRVLPBalance();
        convexDeposit(CRV3LPBal, true);
    }

    function oneShotWithdrawAll() public {
        uint256 stakedBal = getStakedConvexLPBalance();
        convexUnstake(stakedBal);
        convexWithdraw(stakedBal);
        withdrawAllLP(-1);
    }

    // TODO take out profit and deposit into trasury
    // TODO swap CRV and CVX as part of this as well (proportionally) -> or some other strategy
    function oneShotWithdraw(uint256 toWithdrawInWei) public {
        convexUnstake(toWithdrawInWei);
        convexWithdraw(toWithdrawInWei);
        withdrawAllLP(-1);
    }
}