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

const DECIMALS = [DAI_DECIMAL, USDC_DECIMAL, USDT_DECIMAL];

contract("TestCurveLendingMultiAsset", (accounts) => {
    beforeEach(async () => {
        USDT_CONTRACT = await IERC20.at(USDT);
        USDC_CONTRACT = await IERC20.at(USDC);
        DAI_CONTRACT = await IERC20.at(DAI);
        LENDING_CONTRACT = await LENDING.new();

        await setupAll(accounts[0], LENDING_CONTRACT, DAI_CONTRACT, DAI_WHALE, USDC_CONTRACT, USDC_WHALE, USDC_CONTRACT, USDC_WHALE, USDT_CONTRACT, USDT_WHALE);

        const contractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.notEqual(contractBalUSDC, 0, "[Setup fault] There is no USDC in contract where there should be.");
        const lpBalance = await LENDING_CONTRACT.getLPBalance();
        assert.equal(lpBalance, 0, "[Setup fault] There is already LP tokens where there should not.");
    })

    it("adds all liquidity", async () => {
        await LENDING_CONTRACT.lendAll();

        const lpBalance = await LENDING_CONTRACT.getLPBalance();
        assert.notEqual(lpBalance, 0, "There is no LP tokens where there should be as USDC is all lent.");
    })

    it("adds partial liquidity", async () => {
        const initialContractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);

        const usdcToLend = 100;
        await LENDING_CONTRACT.lend(usdcToLend);

        const lpBalance = await LENDING_CONTRACT.getLPBalance();
        assert.notEqual(lpBalance, 0, "There is no LP tokens where there should be as USDC is all lent.");
        const contractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.equal(contractBalUSDC, initialContractBalUSDC - 100, "Only " + usdcToLend.toString() + " should have been lent.")
    })
});

contract("TestCurveLendingWithdrawalMultiAsset", (accounts) => {
    beforeEach(async () => {
        USDT_CONTRACT = await IERC20.at(USDT);
        USDC_CONTRACT = await IERC20.at(USDC);
        DAI_CONTRACT = await IERC20.at(DAI);
        LENDING_CONTRACT = await LENDING.new();

        await setupAll(accounts[0], LENDING_CONTRACT, DAI_CONTRACT, DAI_WHALE, USDC_CONTRACT, USDC_WHALE, USDC_CONTRACT, USDC_WHALE, USDT_CONTRACT, USDT_WHALE);

        await LENDING_CONTRACT.lendAll();

        const contractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.equal(contractBalUSDC, 0, "[Setup fault] There should not be USDC in contract where there is.");
        const lpBalance = await LENDING_CONTRACT.getLPBalance();
        assert.notEqual(lpBalance, 0, "[Setup fault] There is no LP tokens where there should be.");
    })

    it("withdraws all liquidity", async () => {
        await LENDING_CONTRACT.withdrawAll();

        lpBalance = await LENDING_CONTRACT.getLPBalance();
        assert.equal(lpBalance, 0, "There should not be LP tokens where there is as all should be converted to USDC.");
        const contractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.notEqual(contractBalUSDC, 0, "There should be USDC from withdrawing assets associated with LP tokens.");
    })

    it("withdraws partial liquidity", async () => {
        const initialLPBalance = web3.utils.toBN(await LENDING_CONTRACT.getLPBalance());
        const lpToWithdraw = initialLPBalance.div(web3.utils.toBN(2));

        await LENDING_CONTRACT.withdraw(lpToWithdraw);
        const finalLPBalance = web3.utils.toBN(await LENDING_CONTRACT.getLPBalance());

        assert.ok(finalLPBalance.eq(initialLPBalance.sub(lpToWithdraw)), "There should remain " + initialLPBalance.sub(lpToWithdraw).toString() + " LP tokens.");
        const contractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.notEqual(contractBalUSDC, 0, "There should be USDC from withdrawing assets associated with LP tokens.");
    })
});

const debugDisplayAll = async (account) => {
    const whaleBalDAI = rationalise(await DAI_CONTRACT.balanceOf(DAI_WHALE), DAI_DECIMAL);
    const contractBalDAI = rationalise(await DAI_CONTRACT.balanceOf(LENDING_CONTRACT.address), DAI_DECIMAL);
    const accountBalDAI = rationalise(await DAI_CONTRACT.balanceOf(account), DAI_DECIMAL);

    const whaleBalUSDC = rationalise(await USDC_CONTRACT.balanceOf(USDC_WHALE), USDC_DECIMAL);
    const contractBalUSDC = rationalise(await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address), USDC_DECIMAL);
    const accountBalUSDC = rationalise(await USDC_CONTRACT.balanceOf(account), USDC_DECIMAL);

    const whaleBalUSDT = rationalise(await USDT_CONTRACT.balanceOf(USDT_WHALE), USDT_DECIMAL);
    const contractBalUSDT = rationalise(await USDT_CONTRACT.balanceOf(LENDING_CONTRACT.address), USDT_DECIMAL);
    const accountBalUSDT = rationalise(await USDT_CONTRACT.balanceOf(account), USDT_DECIMAL);

    const lpBal = rationalise(await LENDING_CONTRACT.getLPBalance(), ERC20_DECIMAL);

    console.log("==========\n");

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

    console.log("LP bal:", lpBal.toString());

    console.log("\n==========\n");
};

const setupAll = async (account, LENDING_CONTRACT, ERC20_CONTRACT_1, ERC20_WHALE_ADDRESS_1, ERC20_CONTRACT_2, ERC20_WHALE_ADDRESS_2, ERC20_CONTRACT_3, ERC20_WHALE_ADDRESS_3) => {
    const amount = 1;
    await sendETH(account, ERC20_WHALE_ADDRESS_1, amount);

    const erc20Amount = 1000000000;
    await sendERC20(ERC20_CONTRACT_1, ERC20_WHALE_ADDRESS_1, LENDING_CONTRACT.address, erc20Amount);
    await sendERC20(ERC20_CONTRACT_2, ERC20_WHALE_ADDRESS_2, LENDING_CONTRACT.address, erc20Amount);
    await sendERC20(ERC20_CONTRACT_3, ERC20_WHALE_ADDRESS_3, LENDING_CONTRACT.address, erc20Amount);
};

const setupSingle = async (account, LENDING_CONTRACT, ERC20_CONTRACT, ERC20_WHALE_ADDRESS) => {
    const amount = 1;
    await sendETH(account, ERC20_WHALE_ADDRESS, amount);

    const erc20Amount = 1000000000;
    await sendERC20(ERC20_CONTRACT, ERC20_WHALE_ADDRESS, LENDING_CONTRACT.address, erc20Amount);
}

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

const rationalise = (amount, assetDecimal) => {
    return web3.utils.toBN(amount).div(web3.utils.toBN(10).pow(web3.utils.toBN(assetDecimal)));
}