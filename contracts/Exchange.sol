// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface StableSwap {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external;
}

contract CurveExchange {
    using SafeERC20 for IERC20; // Because there is a bug in USDT's contract erroring transfer txs (see: https://ethereum.stackexchange.com/questions/64517/how-to-transfer-and-transferfrom-on-the-tether-smart-contract-from-another-smart/89567#89567)

    address constant private DAI_ADDRESS = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant private USDC_ADDRESS = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant private USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IERC20 constant private DAI = IERC20(DAI_ADDRESS);
    IERC20 constant private USDC = IERC20(USDC_ADDRESS);
    IERC20 constant private USDT = IERC20(USDT_ADDRESS);

    IERC20[3] token = [DAI, USDC, USDT];

    address constant private STABLESWAP_ADDRESS = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    StableSwap constant private stableSwap = StableSwap(STABLESWAP_ADDRESS);

    function swapAll(int128 fromTokenIndex, int128 toTokenIndex) public {
        IERC20 fromToken = token[uint128(fromTokenIndex)];
        uint256 balFrom = fromToken.balanceOf(address(this));
        uint256 minAmount = 1;
        fromToken.safeApprove(STABLESWAP_ADDRESS, balFrom);

        stableSwap.exchange(fromTokenIndex, toTokenIndex, balFrom, minAmount);

        // IERC20 toToken = token[uint128(toTokenIndex)];
        // uint256 balTo = toToken.balanceOf(address(this));

        // toToken.safeTransfer(msg.sender, balTo);
    }
}
