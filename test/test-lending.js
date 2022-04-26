const IERC20 = artifacts.require("IERC20");
const LENDING = artifacts.require("CurveLending");

const USDC_WHALE = "0xcffad3200574698b78f32232aa9d63eabd290703";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_INDEX = 1;

contract("TestCurveLending", (accounts) => {
    beforeEach(async () => {
        USDC_CONTRACT = await IERC20.at(USDC);
        LENDING_CONTRACT = await LENDING.new();

        await setup(accounts[0], USDC_CONTRACT, LENDING_CONTRACT, USDC_WHALE);

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
});

contract("TestCurveLendingWithdrawal", (accounts) => {
    beforeEach(async () => {
        USDC_CONTRACT = await IERC20.at(USDC);
        LENDING_CONTRACT = await LENDING.new();

        await setup(accounts[0], USDC_CONTRACT, LENDING_CONTRACT, USDC_WHALE);

        await LENDING_CONTRACT.lendAll();

        const contractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.equal(contractBalUSDC, 0, "[Setup fault] There should not be USDC in contract where there is.");
        const lpBalance = await LENDING_CONTRACT.getLPBalance();
        assert.notEqual(lpBalance, 0, "[Setup fault] There is no LP tokens where there should be.");
    })

    it("withdraws all liquidity", async () => {
        await LENDING_CONTRACT.withdrawAll();

        lpBalance = await LENDING_CONTRACT.getLPBalance();
        assert.equal(lpBalance, 0, "There should not be any staked LP tokens where there is as all should be converted to USDC");
        const contractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.notEqual(contractBalUSDC, 0, "There should be USDC from withdrawing assets associated with LP tokens.");
    })
});

contract("TestCurveStaking", (accounts) => {
    beforeEach(async () => {
        USDC_CONTRACT = await IERC20.at(USDC);
        LENDING_CONTRACT = await LENDING.new();

        await setup(accounts[0], USDC_CONTRACT, LENDING_CONTRACT, USDC_WHALE);

        await LENDING_CONTRACT.lendAll();
        const contractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.equal(contractBalUSDC, 0, "[Setup fault] There should not be USDC in contract where there is.");
        const lpBalance = await LENDING_CONTRACT.getLPBalance();
        assert.notEqual(lpBalance, 0, "[Setup fault] There is no LP balance where there should be.");
        const stakeBalance = await LENDING_CONTRACT.getStakeBalance();
        assert.equal(stakeBalance, 0, "[Setup fault] There should not be any staked LP tokens where there is.");
    })

    it("stakes all liquidity", async () => {
        await LENDING_CONTRACT.stakeAllLP();

        const stakeBalance = await LENDING_CONTRACT.getStakeBalance();
        assert.notEqual(stakeBalance, 0, "There is no staked LP tokens where there should be from staking all LP tokens.");
    })

    it("redeems all staked liquidity", async () => {
        await LENDING_CONTRACT.stakeAllLP();

        stakeBalance = await LENDING_CONTRACT.getStakeBalance();
        assert.notEqual(stakeBalance, 0, "[Setup fault] There is no staked LP tokens where there should be.");

        await LENDING_CONTRACT.redeemAllStakedLP();

        stakeBalance = await LENDING_CONTRACT.getStakeBalance();
        assert.equal(stakeBalance, 0, "There should not be any staked LP tokens where there is as all should be unstaked.");
        const lpBalance = await LENDING_CONTRACT.getLPBalance();
        assert.notEqual(lpBalance, 0, "There is no LP tokens where there should be as all LP tokens should be unstaked.");
    })
});

const debugDisplayAll = async (account) => {
    const whaleBalUSDC = await USDC_CONTRACT.balanceOf(USDC_WHALE);
    const accountBalUSDC = await USDC_CONTRACT.balanceOf(account);
    const contractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
    const lpBalance = await LENDING_CONTRACT.getLPBalance();
    const stakeBalance = await LENDING_CONTRACT.getStakeBalance();

    console.log("==========\n");

    console.log("WHALE USDC bal:", whaleBalUSDC.toString());
    console.log("CONTRACT USDC bal:", contractBalUSDC.toString());
    console.log("ACCOUNT USDC bal:", accountBalUSDC.toString());
    console.log("LP Balance:", lpBalance.toString());
    console.log("Stake Balance:", stakeBalance.toString());

    console.log("\n==========\n");
};

const setup = async (account, ERC20_CONTRACT, LENDING_CONTRACT, ERC20_WHALE_ADDRESS) => {
    const amount = 1;
    await sendETH(account, ERC20_WHALE_ADDRESS, amount);

    const erc20Amount = 1000000000;
    await sendERC20(ERC20_CONTRACT, ERC20_WHALE_ADDRESS, LENDING_CONTRACT.address, erc20Amount);
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
