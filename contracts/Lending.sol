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

    address constant private CRV3LP_ADDRESS = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    CRV3LPToken constant private CRV3LP_TOKEN = CRV3LPToken(CRV3LP_ADDRESS);

    function getLPBalance() public view returns(uint256) {
        return CRV3LP_TOKEN.balanceOf(address(this));
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
    // TODO This may not be a valid way to check for CRV token balance
    IERC20 constant private CURVEGAUGE_TOKEN = IERC20(CURVEGAUGE_ADDRESS);

    function stakeAllLP() public {
        // Require that address has LP tokens
        uint256 lpBal = getLPBalance();
        CRV3LP_TOKEN.approve(CURVEGAUGE_ADDRESS, lpBal);
        CURVEGAUGE.deposit(lpBal, address(this));
    }

    function getStakeBalance() public view returns(uint256) {
        return CURVEGAUGE_TOKEN.balanceOf(address(this));
    }

    // TODO Remove from locked, convert CRV to 3CRV LP (if necessary), then can withdraw all
    function redeemAllStakedLP() public {
        uint256 stakeBal = getStakeBalance();
        CURVEGAUGE.withdraw(stakeBal);
    }

    function getClaimableBalance() public returns(uint256) {
        uint256 bal = CURVEGAUGE.claimable_tokens(address(this));
        return bal;
    }

    address constant private CURVEDAO_ADDRESS = 0xD533a949740bb3306d119CC777fa900bA034cd52;
    IERC20 constant private CURVEDAO_TOKEN = IERC20(CURVEDAO_ADDRESS);

    function getCurveDAOBalance() public view returns(uint256) {
        return CURVEDAO_TOKEN.balanceOf(address(this));
    }

    address constant private VOTINGESCROW_ADDRESS = 0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2;
    VOTINGESCROW constant private ESCROW = VOTINGESCROW(VOTINGESCROW_ADDRESS);

    // TODO Called after `depositAllLP()`, but need to get smart contract address whitelisted before can call `create_lock` below
    // https://github.com/curvefi/curve-dao-contracts/blob/3156684fd7ca424ec4c56b2c8d898b77afa78496/contracts/VotingEscrow.vy#L418
    function lockInStakedLP() public {
        uint256 bal = getStakeBalance();
        uint256 unlockTime = 31536000; // 365 days in seconds
        ESCROW.create_lock(bal, unlockTime);
    }

    function votingPower() public returns(uint256) {
        return ESCROW.balanceOf(address(this), block.timestamp);
    }
}