const timeMachine = require('ganache-time-traveler');

const IERC20 = artifacts.require("IERC20");
const LENDING = artifacts.require("CurveLending");

const DAI_WHALE = "0x28c6c06298d514db089934071355e5743bf21d60";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const DAI_INDEX = 0;
const DAI_DECIMAL = 18;

const USDC_WHALE = "0xcffad3200574698b78f32232aa9d63eabd290703";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_INDEX = 1;
const USDC_DECIMAL = 6;

const USDT_WHALE = "0x5754284f345afc66a98fbb0a0afe71e0f007b949";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const USDT_INDEX = 2;
const USDT_DECIMAL = 6;

const ERC20_DECIMAL = 18;

const LENDING_CONTRACT_ADDRESS = "0xe63e0c52605b33a93c1a6d8118f9f801c30d7cf8";

contract("SetupStableCoins", (accounts) => {
    it("adds stablecoins to contract address", async () => {
        DAI_CONTRACT = await IERC20.at(DAI);
        USDC_CONTRACT = await IERC20.at(USDC);
        USDT_CONTRACT = await IERC20.at(USDT);

        await setupAll(accounts[0], LENDING_CONTRACT_ADDRESS, DAI_CONTRACT, DAI_WHALE, DAI_DECIMAL, USDC_CONTRACT, USDC_WHALE, USDC_DECIMAL, USDT_CONTRACT, USDT_WHALE, USDT_DECIMAL);

        const currentDAIBal = await normalise(DAI_CONTRACT.balanceOf(LENDING_CONTRACT_ADDRESS), DAI_DECIMAL);
        const currentUSDCBal = await normalise(USDC_CONTRACT.balanceOf(LENDING_CONTRACT_ADDRESS), USDC_DECIMAL);
        const currentUSDTBal = await normalise(USDT_CONTRACT.balanceOf(LENDING_CONTRACT_ADDRESS), USDT_DECIMAL);

        assert.equal(currentDAIBal, 0, "[Setup fault] There should be DAI.");
        assert.equal(currentUSDCBal, 0, "[Setup fault] There should be USDC.");
        assert.equal(currentUSDTBal, 0, "[Setup fault] There should be USDT.");

        await debugDisplayAll(accounts[0]);
    })
})

const setupAll = async (account, DESTINATION, ERC20_CONTRACT_1, ERC20_WHALE_ADDRESS_1, ERC20_DECIMAL_1, ERC20_CONTRACT_2, ERC20_WHALE_ADDRESS_2, ERC20_DECIMAL_2, ERC20_CONTRACT_3, ERC20_WHALE_ADDRESS_3, ERC20_DECIMAL_3) => {
    const amount = 1;
    await sendETH(account, ERC20_WHALE_ADDRESS_1, amount);
    await sendETH(account, ERC20_WHALE_ADDRESS_2, amount);
    await sendETH(account, ERC20_WHALE_ADDRESS_3, amount);

    const erc20Amount = 1000000;
    await sendERC20(ERC20_CONTRACT_1, ERC20_WHALE_ADDRESS_1, DESTINATION, unnormalise(erc20Amount, ERC20_DECIMAL_1));
    await sendERC20(ERC20_CONTRACT_2, ERC20_WHALE_ADDRESS_2, DESTINATION, unnormalise(erc20Amount, ERC20_DECIMAL_2));
    await sendERC20(ERC20_CONTRACT_3, ERC20_WHALE_ADDRESS_3, DESTINATION, unnormalise(erc20Amount, ERC20_DECIMAL_3));
};

const sendERC20 = async (ERC20_CONTRACT, from, to, amount) => {
    await ERC20_CONTRACT.transfer(to, amount, {
        from,
    });
};

const sendETH = async (from, to, amount) => {
    await web3.eth.sendTransaction({
        from,
        to,
        value: web3.utils.toWei(amount.toString(), "ether")
    });
};

const normalise = (unnormalisedAmount, assetDecimal) => {
    return web3.utils.toBN(unnormalisedAmount).div(web3.utils.toBN(10).pow(web3.utils.toBN(assetDecimal)));
};

const unnormalise = (normalisedAmount, assetDecimal) => {
    return web3.utils.toBN(normalisedAmount).mul(web3.utils.toBN(10).pow(web3.utils.toBN(assetDecimal)))
};

const toDate = (unixTime) => {
    const date = new Date(unixTime * 1000)
    return date.toLocaleString()
}

const advanceTime = async () => {
    const MONTH_IN_SECONDS = 2628000;
    await timeMachine.advanceTimeAndBlock(MONTH_IN_SECONDS);
}

const debugDisplayAll = async (account) => {
    const currentBlockNumber = await web3.eth.getBlockNumber();
    const currentBlockDate =toDate((await web3.eth.getBlock(currentBlockNumber)).timestamp);

    const whaleBalDAI = normalise(await DAI_CONTRACT.balanceOf(DAI_WHALE), DAI_DECIMAL);
    const contractBalDAI = normalise(await DAI_CONTRACT.balanceOf(LENDING_CONTRACT.address), DAI_DECIMAL);
    const accountBalDAI = normalise(await DAI_CONTRACT.balanceOf(account), DAI_DECIMAL);

    const whaleBalUSDC = normalise(await USDC_CONTRACT.balanceOf(USDC_WHALE), USDC_DECIMAL);
    const contractBalUSDC = normalise(await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address), USDC_DECIMAL);
    const accountBalUSDC = normalise(await USDC_CONTRACT.balanceOf(account), USDC_DECIMAL);

    const whaleBalUSDT = normalise(await USDT_CONTRACT.balanceOf(USDT_WHALE), USDT_DECIMAL);
    const contractBalUSDT = normalise(await USDT_CONTRACT.balanceOf(LENDING_CONTRACT.address), USDT_DECIMAL);
    const accountBalUSDT = normalise(await USDT_CONTRACT.balanceOf(account), USDT_DECIMAL);

    const curveLPBal = normalise(await LENDING_CONTRACT.get3CRVLPBalance(), ERC20_DECIMAL);
    const convexLPBal = normalise(await LENDING_CONTRACT.getConvexLPBalance(), ERC20_DECIMAL);
    const stakedConvexLPBal = normalise(await LENDING_CONTRACT.getStakedConvexLPBalance(), ERC20_DECIMAL);

    const convexClaimableBal = normalise(await LENDING_CONTRACT.getClaimableRewards(), ERC20_DECIMAL);
    const crvBal = normalise(await LENDING_CONTRACT.getCRVBalance(), ERC20_DECIMAL);
    const cvxBal = normalise(await LENDING_CONTRACT.getCVXBalance(), ERC20_DECIMAL);

    console.log("==========\n");

    console.log("Current block and time:", currentBlockNumber, "@", currentBlockDate);

    console.log("\n");

    console.log("WHALE DAI bal:", whaleBalDAI.toString());
    console.log("CONTRACT DAI bal:", contractBalDAI.toString());
    console.log("ACCOUNT DAI bal:", accountBalDAI.toString());

    console.log("\n");

    console.log("WHALE USDC bal:", whaleBalUSDC.toString());
    console.log("CONTRACT USDC bal:", contractBalUSDC.toString());
    console.log("ACCOUNT USDC bal:", accountBalUSDC.toString());

    console.log("\n");

    console.log("WHALE USDT bal:", whaleBalUSDT.toString());
    console.log("CONTRACT USDT bal:", contractBalUSDT.toString());
    console.log("ACCOUNT USDT bal:", accountBalUSDT.toString());

    console.log("\n");

    console.log("3CRV LP bal:", curveLPBal.toString());
    console.log("Convex LP bal:", convexLPBal.toString());
    console.log("Staked Convex LP bal:", stakedConvexLPBal.toString());

    console.log("\n");

    console.log("CRV bal:", crvBal.toString());
    console.log("CVX bal:", cvxBal.toString());
    console.log("Convex claimable CRV bal:", convexClaimableBal.toString());

    console.log("\n==========\n");
};