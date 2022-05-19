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

contract("TestCurveLendingSingleAsset", (accounts) => {
    beforeEach(async () => {
        DAI_CONTRACT = await IERC20.at(DAI);
        USDC_CONTRACT = await IERC20.at(USDC);
        USDT_CONTRACT = await IERC20.at(USDT);
        LENDING_CONTRACT = await LENDING.new();

        await setupSingle(accounts[0], LENDING_CONTRACT, USDT_CONTRACT, USDT_WHALE, USDT_DECIMAL);

        const actualContractBalDAI = await DAI_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.equal(actualContractBalDAI, 0, "[Setup fault] There is DAI in contract where there should not.");
        const actualContractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.equal(actualContractBalUSDC, 0, "[Setup fault] There is USDC in contract where there should not.");
        const actualContractBalUSDT = await USDT_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.notEqual(actualContractBalUSDT, 0, "[Setup fault] There is no USDC in contract where there should be.");
        const actualContractLPBalance = await LENDING_CONTRACT.get3CRVLPBalance();
        assert.equal(actualContractLPBalance, 0, "[Setup fault] There is already LP tokens where there should not.");
    });

    it("adds specified liquidity of USDT", async () => {
        const initialContractBalUSDT = normalise(await USDT_CONTRACT.balanceOf(LENDING_CONTRACT.address), USDT_DECIMAL);

        const usdtToLend = 100;
        await LENDING_CONTRACT.lend(0, 0, unnormalise(usdtToLend, USDT_DECIMAL));

        const actualContractLPBalance = await LENDING_CONTRACT.get3CRVLPBalance();
        assert.notEqual(actualContractLPBalance, 0, "There is no LP tokens where there should be as USDT is all lent.");
        const actualContractBalUSDT = normalise(await USDT_CONTRACT.balanceOf(LENDING_CONTRACT.address), USDT_DECIMAL);
        const expectedContractBalUSDT = initialContractBalUSDT.sub(web3.utils.toBN(usdtToLend));
        assert.equal(actualContractBalUSDT.toString(), expectedContractBalUSDT.toString(), "Only " + usdtToLend.toString() + " should have been lent.")
    });
});

contract("TestCurveLendingMultiAsset", (accounts) => {
    beforeEach(async () => {
        DAI_CONTRACT = await IERC20.at(DAI);
        USDC_CONTRACT = await IERC20.at(USDC);
        USDT_CONTRACT = await IERC20.at(USDT);
        LENDING_CONTRACT = await LENDING.new();

        await setupAll(accounts[0], LENDING_CONTRACT, DAI_CONTRACT, DAI_WHALE, DAI_DECIMAL, USDC_CONTRACT, USDC_WHALE, USDC_DECIMAL, USDT_CONTRACT, USDT_WHALE, USDT_DECIMAL);

        const actualContractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.notEqual(actualContractBalUSDC, 0, "[Setup fault] There is no USDC in contract where there should be.");
        const actualContractLPBalance = await LENDING_CONTRACT.get3CRVLPBalance();
        assert.equal(actualContractLPBalance, 0, "[Setup fault] There is already LP tokens where there should not.");
    });

    it("adds all asset liquidity", async () => {
        await LENDING_CONTRACT.lendAll();

        const actualContractLPBalance = await LENDING_CONTRACT.get3CRVLPBalance();
        assert.notEqual(actualContractLPBalance, 0, "There is no LP tokens where there should be as USDC is all lent.");
    });

    it("adds only partial USDT liquidity", async () => {
        const initialContractBalUSDT = normalise(await USDT_CONTRACT.balanceOf(LENDING_CONTRACT.address), USDT_DECIMAL);

        const usdtToLend = 100;
        await LENDING_CONTRACT.lend(0, 0, unnormalise(usdtToLend, USDT_DECIMAL));

        const actualContractLPBalance = await LENDING_CONTRACT.get3CRVLPBalance();
        assert.notEqual(actualContractLPBalance, 0, "There is no LP tokens where there should be as USDT is all lent.");
        const actualContractBalDAI = await DAI_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.notEqual(actualContractBalDAI, 0, "There should be DAI as none should not be lent.");
        const actualContractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.notEqual(actualContractBalUSDC, 0, "There should be USDC as none should not be lent.");

        const actualContractBalUSDT = normalise(await USDT_CONTRACT.balanceOf(LENDING_CONTRACT.address), USDT_DECIMAL);
        const expectedContractBalUSDT = initialContractBalUSDT.sub(web3.utils.toBN(usdtToLend));
        assert.equal(actualContractBalUSDT.toString(), expectedContractBalUSDT.toString(), "Only " + usdtToLend.toString() + " should have been lent.")
    });
});

contract("TestCurveLendingWithdrawalSingleAsset", (accounts) => {
    beforeEach(async () => {
        USDT_CONTRACT = await IERC20.at(USDT);
        USDC_CONTRACT = await IERC20.at(USDC);
        DAI_CONTRACT = await IERC20.at(DAI);
        LENDING_CONTRACT = await LENDING.new();

        await setupAll(accounts[0], LENDING_CONTRACT, DAI_CONTRACT, DAI_WHALE, DAI_DECIMAL, USDC_CONTRACT, USDC_WHALE, USDC_DECIMAL, USDT_CONTRACT, USDT_WHALE, USDT_DECIMAL);

        await LENDING_CONTRACT.lendAll();

        const contractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.equal(contractBalUSDC, 0, "[Setup fault] There should not be USDC in contract where there is.");
        const actualContractLPBalance = await LENDING_CONTRACT.get3CRVLPBalance();
        assert.notEqual(actualContractLPBalance, 0, "[Setup fault] There is no LP tokens where there should be.");
    });

    it("withdraws only USDC liquidity", async () => {
        await LENDING_CONTRACT.withdrawAllLP(USDC_INDEX);

        const finalLPBalance = web3.utils.toBN(await LENDING_CONTRACT.get3CRVLPBalance());
        assert.equal(finalLPBalance, 0, "There should not be LP tokens where there is as all should be converted to USDC.");
        const contractBalDAI = await DAI_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.equal(contractBalDAI, 0, "There should be no DAI from withdrawing assets associated with LP tokens.");
        const contractBalUSDT = await USDT_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.equal(contractBalUSDT, 0, "There should be no USDT from withdrawing assets associated with LP tokens.");
        const contractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.notEqual(contractBalUSDC, 0, "There should be USDC from withdrawing assets associated with LP tokens.");
    });

    it("withdraws only partial USDC liquidity", async () => {
        const initialLPBalance = web3.utils.toBN(await LENDING_CONTRACT.get3CRVLPBalance());
        const lpToWithdraw = initialLPBalance.div(web3.utils.toBN(2));

        await LENDING_CONTRACT.withdrawLP(USDC_INDEX, lpToWithdraw);

        const finalLPBalance = web3.utils.toBN(await LENDING_CONTRACT.get3CRVLPBalance());
        assert.ok(finalLPBalance.eq(initialLPBalance.sub(lpToWithdraw)), "There should remain " + initialLPBalance.sub(lpToWithdraw).toString() + " LP tokens.");        const contractBalDAI = await DAI_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.equal(contractBalDAI, 0, "There should be no DAI from withdrawing assets associated with LP tokens.");
        const contractBalUSDT = await USDT_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.equal(contractBalUSDT, 0, "There should be no USDT from withdrawing assets associated with LP tokens.");
        const contractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.notEqual(contractBalUSDC, 0, "There should be USDC from withdrawing assets associated with LP tokens.");
    });
});

contract("TestCurveLendingWithdrawalMultiAsset", (accounts) => {
    beforeEach(async () => {
        USDT_CONTRACT = await IERC20.at(USDT);
        USDC_CONTRACT = await IERC20.at(USDC);
        DAI_CONTRACT = await IERC20.at(DAI);
        LENDING_CONTRACT = await LENDING.new();

        await setupAll(accounts[0], LENDING_CONTRACT, DAI_CONTRACT, DAI_WHALE, DAI_DECIMAL, USDC_CONTRACT, USDC_WHALE, USDC_DECIMAL, USDT_CONTRACT, USDT_WHALE, USDT_DECIMAL);

        await LENDING_CONTRACT.lendAll();

        const contractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.equal(contractBalUSDC, 0, "[Setup fault] There should not be USDC in contract where there is.");
        const actualContractLPBalance = await LENDING_CONTRACT.get3CRVLPBalance();
        assert.notEqual(actualContractLPBalance, 0, "[Setup fault] There is no LP tokens where there should be.");
    });

    it("withdraws all liquidity of all assets", async () => {
        await LENDING_CONTRACT.withdrawAllLP(-1);

        lpBalance = await LENDING_CONTRACT.get3CRVLPBalance();
        assert.equal(lpBalance, 0, "There should not be LP tokens where there is as all should be converted to USDC.");
        const actualContractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.notEqual(actualContractBalUSDC, 0, "There should be USDC from withdrawing assets associated with LP tokens.");
    });

    it("withdraws partial liquidity of all assets", async () => {
        const initialLPBalance = normalise(web3.utils.toBN(await LENDING_CONTRACT.get3CRVLPBalance()), ERC20_DECIMAL);
        const lpToWithdraw = initialLPBalance.div(web3.utils.toBN(2));

        await LENDING_CONTRACT.withdrawLP(-1, unnormalise(lpToWithdraw, ERC20_DECIMAL));

        const actualContractLPBalance = normalise(web3.utils.toBN(await LENDING_CONTRACT.get3CRVLPBalance()), ERC20_DECIMAL);
        const expectedContractLPBalance = initialLPBalance.sub(lpToWithdraw);
        assert.equal(actualContractLPBalance.toString(), expectedContractLPBalance.toString(), "There should remain " + initialLPBalance.sub(lpToWithdraw).toString() + " LP tokens.");

        const actualContractBalDAI = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.notEqual(actualContractBalDAI, 0, "There should be DAI from withdrawing assets associated with LP tokens.");
        const actualContractBalUSDT = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.notEqual(actualContractBalUSDT, 0, "There should be USDT from withdrawing assets associated with LP tokens.");
        const actualContractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
        assert.notEqual(actualContractBalUSDC, 0, "There should be USDC from withdrawing assets associated with LP tokens.");
    });
});

contract("TestConvexStakingDeposit", (accounts) => {
    beforeEach(async () => {
        DAI_CONTRACT = await IERC20.at(DAI);
        USDC_CONTRACT = await IERC20.at(USDC);
        USDT_CONTRACT = await IERC20.at(USDT);
        LENDING_CONTRACT = await LENDING.new();

        await setupSingle(accounts[0], LENDING_CONTRACT, USDT_CONTRACT, USDT_WHALE, USDT_DECIMAL);

        await LENDING_CONTRACT.lendAll();

        const actualContractLPBalance = await LENDING_CONTRACT.get3CRVLPBalance();
        assert.notEqual(actualContractLPBalance, 0, "[Setup fault] There is no LP tokens where there should be.");
    });

    it("lends all 3CRV LP tokens but does not stake", async () => {
        const crvLPBal = await LENDING_CONTRACT.get3CRVLPBalance();
        await LENDING_CONTRACT.convexDeposit(crvLPBal, false);

        const actualConvexLPBalance = await LENDING_CONTRACT.getConvexLPBalance();
        assert.notEqual(actualConvexLPBalance, 0, "There should Convex LP tokens as 3CRV LP has been deposited.");
        const actualStakedConvexLPBalance = await LENDING_CONTRACT.getStakedConvexLPBalance();
        assert.equal(actualStakedConvexLPBalance, 0, "There should be no staked Convex LP tokens.");
    });

    it("lends all 3CRV LP tokens and stakes all", async () => {
        const crvLPBal = await LENDING_CONTRACT.get3CRVLPBalance();
        await LENDING_CONTRACT.convexDeposit(crvLPBal, true);

        const actualConvexLPBalance = await LENDING_CONTRACT.getConvexLPBalance();
        assert.equal(actualConvexLPBalance, 0, "There should be no Convex LP tokens as all should have been staked.");
        const actualStakedConvexLPBalance = await LENDING_CONTRACT.getStakedConvexLPBalance();
        assert.equal(actualStakedConvexLPBalance.toString(), crvLPBal.toString(), "All 3CRV LP should be staked.");
    });

    it("lends partial 3CRV LP tokens and stakes all", async () => {
        const intialCRVLPBal = web3.utils.toBN(await LENDING_CONTRACT.get3CRVLPBalance());
        const toStakeCRVLPBal = web3.utils.toBN(intialCRVLPBal.div(web3.utils.toBN(2)));
        await LENDING_CONTRACT.convexDeposit(toStakeCRVLPBal, true);

        const actualContractLPBalance = await LENDING_CONTRACT.get3CRVLPBalance();
        assert.notEqual(actualContractLPBalance, intialCRVLPBal.sub(toStakeCRVLPBal), "[Setup fault] There is no LP tokens where there should be.");
        const actualConvexLPBalance = await LENDING_CONTRACT.getConvexLPBalance();
        assert.equal(actualConvexLPBalance, 0, "There should be no Convex LP tokens as all should have been staked.");
        const actualStakedConvexLPBalance = await LENDING_CONTRACT.getStakedConvexLPBalance();
        assert.equal(actualStakedConvexLPBalance.toString(), toStakeCRVLPBal.toString(), normalise(toStakeCRVLPBal, ERC20_DECIMAL).toString() + " of 3CRV LP should be staked but actual is " + normalise(actualStakedConvexLPBalance, ERC20_DECIMAL).toString() + ".");
    })
});

contract("TestConvexStakingWithdraw", (accounts) => {
    let snapshotId;

    beforeEach(async () => {
        DAI_CONTRACT = await IERC20.at(DAI);
        USDC_CONTRACT = await IERC20.at(USDC);
        USDT_CONTRACT = await IERC20.at(USDT);
        LENDING_CONTRACT = await LENDING.new();

        await setupSingle(accounts[0], LENDING_CONTRACT, USDT_CONTRACT, USDT_WHALE, USDT_DECIMAL);

        await LENDING_CONTRACT.lendAll();

        const crvLPBal = await LENDING_CONTRACT.get3CRVLPBalance();
        await LENDING_CONTRACT.convexDeposit(crvLPBal, true);

        const actualContractStakedConvexLPBalance = await LENDING_CONTRACT.getStakedConvexLPBalance();
        assert.notEqual(actualContractStakedConvexLPBalance, 0, "[Setup fault] There is no staked Convex LP tokens where there should be.");

        const snapshot = await timeMachine.takeSnapshot();
        snapshotId = snapshot['result'];
        await advanceTime(2);

        const currentRewardsBal = await LENDING_CONTRACT.getClaimableRewards();
        assert.notEqual(currentRewardsBal, 0, "[Setup fault] Time has elapsed so there should be claimable rewards.")
    });

    afterEach(async () => {
        await timeMachine.revertToSnapshot(snapshotId);
    });

    // TODO issue with withdrawing when there is claimable rewards from time passing
    it.skip("unstakes and withdraws all convex LP into 3CRV LP", async () => {
        const stakedConvexLPBal = await LENDING_CONTRACT.getStakedConvexLPBalance();
        await LENDING_CONTRACT.convexWithdrawStaked(stakedConvexLPBal);

        const actual3CRVLPBalance = await LENDING_CONTRACT.get3CRVLPBalance();
        assert.notEqual(actual3CRVLPBalance, stakedConvexLPBal, "There should be " + stakedConvexLPBal.toString() + " 3CRV.");
        const actualConvexLPBalance = await LENDING_CONTRACT.getConvexLPBalance();
        assert.equal(actualConvexLPBalance, 0, "There should be no Convex LP balance as all should be 3CRV LP tokens.")
        const actualStakedConvexLPBalance = await LENDING_CONTRACT.getStakedConvexLPBalance();
        assert.equal(actualStakedConvexLPBalance, 0, "There should be no staked Convex LP balance as all should be 3CRV LP tokens.")
    });

    it("claimEarnedRewards", async () => {
        const actualCurrentRewardsBal = await LENDING_CONTRACT.getClaimableRewards();
        await LENDING_CONTRACT.claimRewards();

        const actualCRVbal = await LENDING_CONTRACT.getCRVBalance();
        assert.equal(actualCurrentRewardsBal.toString(), actualCRVbal.toString(), "All CRV should have been claimed.")
    });
})

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

const setupAll = async (account, LENDING_CONTRACT, ERC20_CONTRACT_1, ERC20_WHALE_ADDRESS_1, ERC20_DECIMAL_1, ERC20_CONTRACT_2, ERC20_WHALE_ADDRESS_2, ERC20_DECIMAL_2, ERC20_CONTRACT_3, ERC20_WHALE_ADDRESS_3, ERC20_DECIMAL_3) => {
    const amount = 1;
    await sendETH(account, ERC20_WHALE_ADDRESS_1, amount);
    await sendETH(account, ERC20_WHALE_ADDRESS_2, amount);
    await sendETH(account, ERC20_WHALE_ADDRESS_3, amount);

    const erc20Amount = 100000;
    await sendERC20(ERC20_CONTRACT_1, ERC20_WHALE_ADDRESS_1, LENDING_CONTRACT.address, unnormalise(erc20Amount, ERC20_DECIMAL_1));
    await sendERC20(ERC20_CONTRACT_2, ERC20_WHALE_ADDRESS_2, LENDING_CONTRACT.address, unnormalise(erc20Amount, ERC20_DECIMAL_2));
    await sendERC20(ERC20_CONTRACT_3, ERC20_WHALE_ADDRESS_3, LENDING_CONTRACT.address, unnormalise(erc20Amount, ERC20_DECIMAL_3));
};

const setupSingle = async (account, LENDING_CONTRACT, ERC20_CONTRACT, ERC20_WHALE_ADDRESS, ERC20_DECIMAL) => {
    const amount = 1;
    await sendETH(account, ERC20_WHALE_ADDRESS, amount);

    const erc20Amount = 100000;
    await sendERC20(ERC20_CONTRACT, ERC20_WHALE_ADDRESS, LENDING_CONTRACT.address, unnormalise(erc20Amount, ERC20_DECIMAL));
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

const advanceTime = async (months) => {
    const MONTH_IN_SECONDS = 2628000;
    await timeMachine.advanceTimeAndBlock(MONTH_IN_SECONDS * months);
}