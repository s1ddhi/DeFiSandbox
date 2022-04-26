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

        console.log("SETUP");
        await displayAll(accounts[0]);
    })

    it("adds all liquidity", async () => {
        await LENDING_CONTRACT.lendAll();
        console.log("POST LENDING");
        await displayAll(accounts[0]);
    })
});

contract("TestCurveLendingWithdrawal", (accounts) => {
    beforeEach(async () => {
        USDC_CONTRACT = await IERC20.at(USDC);
        LENDING_CONTRACT = await LENDING.new();

        await setup(accounts[0], USDC_CONTRACT, LENDING_CONTRACT, USDC_WHALE);

        await LENDING_CONTRACT.lendAll();
        console.log("SETUP");
        await displayAll(accounts[0]);
    })

    it("withdraws all liquidity", async () => {
        await LENDING_CONTRACT.withdrawAll();
        console.log("POST WITHDRWAL");
        await displayAll(accounts[0]);
    })
});

contract("TestCurveStaking", (accounts) => {
    beforeEach(async () => {
        USDC_CONTRACT = await IERC20.at(USDC);
        LENDING_CONTRACT = await LENDING.new();

        await setup(accounts[0], USDC_CONTRACT, LENDING_CONTRACT, USDC_WHALE);

        await LENDING_CONTRACT.lendAll();
        console.log("SETUP");
        await displayAll(accounts[0]);
    })

    it("stakes all liquidity", async () => {
        await LENDING_CONTRACT.stakeAllLP();
        console.log("POST STAKE");
        await displayAll(accounts[0]);
    })

    it("can redeem all staked liquidity", async () => {
        await LENDING_CONTRACT.stakeAllLP();
        console.log("POST STAKE");
        await displayAll(accounts[0]);

        await LENDING_CONTRACT.redeemAllStakedLP();
        console.log("POST REDEMPTION");
        await displayAll(accounts[0]);
    })
});

const displayAll = async (account) => {
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
