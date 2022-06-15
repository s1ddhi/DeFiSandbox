const IERC20 = artifacts.require("IERC20");
const UNISWAP_GOVERNANCE = artifacts.require('SwapGovernance');

const CRV_WHALE = '0x9b44473e223f8a3c047ad86f387b80402536b029';
const CRV = '0xD533a949740bb3306d119CC777fa900bA034cd52';
const CVX_WHALE = '0xb576491f1e6e5e62f1d8f26062ee822b40b0e0d4';
const CVX = '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B';
const CRV3LP = '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490';

const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const ERC20_DECIMAL = 18;

contract('TestCurveSwapToWETH', (accounts) => {
    beforeEach(async () => {
        CRV_CONTRACT = await IERC20.at(CRV);
        CVX_CONTRACT = await IERC20.at(CVX);
        SWAP_CONTRACT = await UNISWAP_GOVERNANCE.new();
        DAI_CONTRACT = await IERC20.at(DAI);
        WETH_CONTRACT = await IERC20.at(WETH);
        CRV3LP_CONTRACT = await IERC20.at(CRV3LP);

        const etherAmount = 1

        await web3.eth.sendTransaction({
            from: accounts[0],
            to: CRV_WHALE,
            value: web3.utils.toWei(etherAmount.toString(), "ether")
        });

        await web3.eth.sendTransaction({
            from: accounts[0],
            to: CVX_WHALE,
            value: web3.utils.toWei(etherAmount.toString(), "ether")
        });

        const erc20Amount = 10;

        await sendERC20(CRV_CONTRACT, CRV_WHALE, SWAP_CONTRACT.address, unnormalise(erc20Amount, ERC20_DECIMAL));
        await sendERC20(CVX_CONTRACT, CVX_WHALE, SWAP_CONTRACT.address, unnormalise(erc20Amount, ERC20_DECIMAL));

        const contractCRVbal = await CRV_CONTRACT.balanceOf(SWAP_CONTRACT.address);
        const contractCVXbal = await CVX_CONTRACT.balanceOf(SWAP_CONTRACT.address);
        const contract3CRVLPbal = await CRV3LP_CONTRACT.balanceOf(SWAP_CONTRACT.address);

        assert.notEqual(contractCRVbal, 0, '[Setup fault] There should exist CRV for contract to swap');
        assert.notEqual(contractCVXbal, 0, '[Setup fault] There should exist CVX for contract to swap');
        assert.equal(contract3CRVLPbal, 0, '[Setup fault] There should not exist any 3CRV LP tokens as no swaps has taken place');
    });

    it('swapsCRVtoWETHViaCurve', async () => {
        const absToSwap = 10;

        const swapAmount = unnormalise(absToSwap, ERC20_DECIMAL);
        const outputAmount = 0;

        const initialContractBalCRV = normalise(await CRV_CONTRACT.balanceOf(SWAP_CONTRACT.address), ERC20_DECIMAL);

        await SWAP_CONTRACT.curveSwapGovernanceToWETH(0, swapAmount, outputAmount);

        const actualAccountBalWETH = await WETH_CONTRACT.balanceOf(SWAP_CONTRACT.address);
        const actualContractBalCRV = normalise(await CRV_CONTRACT.balanceOf(SWAP_CONTRACT.address), ERC20_DECIMAL);

        assert.notEqual(actualAccountBalWETH, 0, "There should exist WETH from CRV swap");
        assert.equal(actualContractBalCRV, initialContractBalCRV - absToSwap, `Only ${swapAmount.toString()} of CRV should have been swapped`);
    });

    it('swapsCVXtoWETHViaCurve', async () => {
        const absToSwap = 10;

        const swapAmount = unnormalise(absToSwap, ERC20_DECIMAL);
        const outputAmount = 0;

        const initialContractBalCRV = normalise(await CRV_CONTRACT.balanceOf(SWAP_CONTRACT.address), ERC20_DECIMAL);

        await SWAP_CONTRACT.curveSwapGovernanceToWETH(1, swapAmount, outputAmount);

        const actualAccountBalWETH = await WETH_CONTRACT.balanceOf(SWAP_CONTRACT.address);
        const actualContractBalCVX = normalise(await CVX_CONTRACT.balanceOf(SWAP_CONTRACT.address), ERC20_DECIMAL);

        assert.notEqual(actualAccountBalWETH, 0, "There should exist WETH from CRV swap");
        assert.equal(actualContractBalCVX, initialContractBalCRV - absToSwap, `Only ${swapAmount.toString()} of CVX should have been swapped`);
    });

    it.skip('swapsCRVToDAIV2ViaUniswap', async () => {
        const absToSwap = 10;

        const swapAmount = unnormalise(absToSwap, ERC20_DECIMAL);
        const outputAmount = unnormalise(1, ERC20_DECIMAL);

        const initialContractBalCRV = normalise(await CRV_CONTRACT.balanceOf(SWAP_CONTRACT.address), ERC20_DECIMAL);

        await SWAP_CONTRACT.swapV2(CRV, DAI, swapAmount, outputAmount, accounts[0]);

        const actualAccountBalDAI = normalise(await DAI_CONTRACT.balanceOf(accounts[0]), ERC20_DECIMAL);
        const actualContractBalCRV = normalise(await CRV_CONTRACT.balanceOf(SWAP_CONTRACT.address), ERC20_DECIMAL);

        assert.notEqual(actualAccountBalDAI, 0, "There should exist DAI from CRV swap");
        assert.equal(actualContractBalCRV, initialContractBalCRV - absToSwap, `Only ${swapAmount.toString()} of CRV should have been swapped`);
    });
});

contract('TestUniswapWETHToDai', async (accounts) => {
    beforeEach(async () => {
        CRV_CONTRACT = await IERC20.at(CRV);
        CVX_CONTRACT = await IERC20.at(CVX);
        SWAP_CONTRACT = await UNISWAP_GOVERNANCE.new();
        DAI_CONTRACT = await IERC20.at(DAI);
        WETH_CONTRACT = await IERC20.at(WETH);
        CRV3LP_CONTRACT = await IERC20.at(CRV3LP);

        const etherAmount = 1

        await web3.eth.sendTransaction({
            from: accounts[0],
            to: CRV_WHALE,
            value: web3.utils.toWei(etherAmount.toString(), "ether")
        });

        const erc20Amount = 10;

        await sendERC20(CRV_CONTRACT, CRV_WHALE, SWAP_CONTRACT.address, unnormalise(erc20Amount, ERC20_DECIMAL));

        const contractCRVbal = await CRV_CONTRACT.balanceOf(SWAP_CONTRACT.address);

        assert.notEqual(contractCRVbal, 0, '[Setup fault] There should exist CRV for contract to swap');

        const swapAmount = unnormalise(erc20Amount, ERC20_DECIMAL);
        const outputAmount = unnormalise(0, ERC20_DECIMAL);

        await SWAP_CONTRACT.curveSwapGovernanceToWETH(0, swapAmount, outputAmount);

        const actualAccountBalWETH = await WETH_CONTRACT.balanceOf(SWAP_CONTRACT.address);

        assert.notEqual(actualAccountBalWETH, 0, "[Setup fault] There should exist WETH from CRV swap");
    });

    it('swapsToDAI', async () => {
        const initialAccountBalWETH = await WETH_CONTRACT.balanceOf(SWAP_CONTRACT.address);

        await SWAP_CONTRACT.swapV2(WETH, DAI, initialAccountBalWETH, 0, SWAP_CONTRACT.address);

        const actualContractBalWETH = await WETH_CONTRACT.balanceOf(SWAP_CONTRACT.address);
        const actualAccountBalDAI = await DAI_CONTRACT.balanceOf(SWAP_CONTRACT.address);
        assert.equal(actualContractBalWETH, 0, "All WETH should be swapped");
        assert.notEqual(actualAccountBalDAI, 0, "There should exist DAI from WETH swap");
    });
});

contract('TestReinvestDAIInto3CRV', async (accounts) => {
    beforeEach(async () => {
        CRV_CONTRACT = await IERC20.at(CRV);
        CVX_CONTRACT = await IERC20.at(CVX);
        SWAP_CONTRACT = await UNISWAP_GOVERNANCE.new();
        DAI_CONTRACT = await IERC20.at(DAI);
        WETH_CONTRACT = await IERC20.at(WETH);
        CRV3LP_CONTRACT = await IERC20.at(CRV3LP);

        const etherAmount = 1

        await web3.eth.sendTransaction({
            from: accounts[0],
            to: CRV_WHALE,
            value: web3.utils.toWei(etherAmount.toString(), "ether")
        });

        const erc20Amount = 10;

        await sendERC20(CRV_CONTRACT, CRV_WHALE, SWAP_CONTRACT.address, unnormalise(erc20Amount, ERC20_DECIMAL));

        const contractCRVbal = await CRV_CONTRACT.balanceOf(SWAP_CONTRACT.address);

        assert.notEqual(contractCRVbal, 0, '[Setup fault] There should exist CRV for contract to swap');

        const swapAmount = unnormalise(erc20Amount, ERC20_DECIMAL);
        const outputAmount = unnormalise(0, ERC20_DECIMAL);

        await SWAP_CONTRACT.curveSwapGovernanceToWETH(0, swapAmount, outputAmount);

        const accountBalWETH = await WETH_CONTRACT.balanceOf(SWAP_CONTRACT.address);

        assert.notEqual(accountBalWETH, 0, "[Setup fault] There should exist WETH from CRV swap");

        await SWAP_CONTRACT.swapV2(WETH, DAI, accountBalWETH, 0, SWAP_CONTRACT.address);

        const accountBalDAI = await DAI_CONTRACT.balanceOf(SWAP_CONTRACT.address);

        assert.notEqual(accountBalDAI, 0, "[Setup fault] There should exist DAI from WETH swap");
    });

    it('lendsDAIFor3CRV', async () => {
        const initialContractBalDAI = await DAI_CONTRACT.balanceOf(SWAP_CONTRACT.address);

        await SWAP_CONTRACT.lend(initialContractBalDAI, 0, 0);

        const actualContractBalDAI = await DAI_CONTRACT.balanceOf(SWAP_CONTRACT.address);
        const actualContractBal3CRV = await CRV3LP_CONTRACT.balanceOf(SWAP_CONTRACT.address);

        assert.equal(actualContractBalDAI, 0, "All DAI should have been lent out for 3CRV");
        assert.notEqual(actualContractBal3CRV, 0, "There should exist 3CRV from lending DAI");
    });
});

contract('TestOneShotSwapGovernance', async (accounts) => {
    beforeEach(async() => {
        CRV_CONTRACT = await IERC20.at(CRV);
        CVX_CONTRACT = await IERC20.at(CVX);
        SWAP_CONTRACT = await UNISWAP_GOVERNANCE.new();
        DAI_CONTRACT = await IERC20.at(DAI);
        WETH_CONTRACT = await IERC20.at(WETH);
        CRV3LP_CONTRACT = await IERC20.at(CRV3LP);

        const etherAmount = 1

        await web3.eth.sendTransaction({
            from: accounts[0],
            to: CRV_WHALE,
            value: web3.utils.toWei(etherAmount.toString(), "ether")
        });

        await web3.eth.sendTransaction({
            from: accounts[0],
            to: CVX_WHALE,
            value: web3.utils.toWei(etherAmount.toString(), "ether")
        });

        const erc20Amount = 10;

        await sendERC20(CRV_CONTRACT, CRV_WHALE, SWAP_CONTRACT.address, unnormalise(erc20Amount, ERC20_DECIMAL));
        await sendERC20(CVX_CONTRACT, CVX_WHALE, SWAP_CONTRACT.address, unnormalise(erc20Amount, ERC20_DECIMAL));

        const contractCRVBal = await CRV_CONTRACT.balanceOf(SWAP_CONTRACT.address);
        const contractCVXBal = await CVX_CONTRACT.balanceOf(SWAP_CONTRACT.address);
        const contract3CRVLPBal = await CRV3LP_CONTRACT.balanceOf(SWAP_CONTRACT.address);

        assert.notEqual(contractCRVBal, 0, '[Setup fault] There should exist CRV for contract to swap');
        assert.notEqual(contractCVXBal, 0, '[Setup fault] There should exist CVX for contract to swap');
        assert.equal(contract3CRVLPBal, 0, '[Setup fault] There should not exist any 3CRV LP tokens as no swaps has taken place');
    });

    it('swapsCRVFor3CRV', async () => {
        const crvSwapAmount = await CRV_CONTRACT.balanceOf(SWAP_CONTRACT.address);

        await SWAP_CONTRACT.swapGovernanceFor3CRV(0, crvSwapAmount, 0, 1);

        const actualContractCRVBal = await CRV_CONTRACT.balanceOf(SWAP_CONTRACT.address);
        const actualContractWETHBal = await WETH_CONTRACT.balanceOf(SWAP_CONTRACT.address);;
        const actualContractDAIBal = await DAI_CONTRACT.balanceOf(SWAP_CONTRACT.address);
        const actualContract3CRVBal = await CRV3LP_CONTRACT.balanceOf(SWAP_CONTRACT.address);

        assert.equal(actualContractCRVBal, 0, "There should not exist any CRV as this should all be swapped");
        assert.equal(actualContractWETHBal, 0, "There should not exist any WETH as this is intermediary asset in swap");
        assert.equal(actualContractDAIBal, 0, "There should not exist any DAI as this is intermediary asset in swap");
        assert.notEqual(actualContract3CRVBal, 0, "There should exist some 3CRV from swap");
    });

    it('swapsCVXFor3CRV', async () => {
        const cvxSwapAmount = await CVX_CONTRACT.balanceOf(SWAP_CONTRACT.address);

        await SWAP_CONTRACT.swapGovernanceFor3CRV(1, cvxSwapAmount, 0, 1);

        const actualContractCVXBal = await CVX_CONTRACT.balanceOf(SWAP_CONTRACT.address);
        const actualContractWETHBal = await WETH_CONTRACT.balanceOf(SWAP_CONTRACT.address);;
        const actualContractDAIBal = await DAI_CONTRACT.balanceOf(SWAP_CONTRACT.address);
        const actualContract3CRVBal = await CRV3LP_CONTRACT.balanceOf(SWAP_CONTRACT.address);

        assert.equal(actualContractCVXBal, 0, "There should not exist any CVX as this should all be swapped");
        assert.equal(actualContractWETHBal, 0, "There should not exist any WETH as this is intermediary asset in swap");
        assert.equal(actualContractDAIBal, 0, "There should not exist any DAI as this is intermediary asset in swap");
        assert.notEqual(actualContract3CRVBal, 0, "There should exist some 3CRV from swap");
    });
});

const debugDisplayAll = async (account) => {
    const accountBalCRV = await CRV_CONTRACT.balanceOf(account);
    const accountBalCVX = await CVX_CONTRACT.balanceOf(account);
    const accountBal3CRV = await CRV3LP_CONTRACT.balanceOf(account);
    const accountBalDAI = await DAI_CONTRACT.balanceOf(account);
    const contractBalCRV = await CRV_CONTRACT.balanceOf(SWAP_CONTRACT.address);
    const contractBalCVX = await CVX_CONTRACT.balanceOf(SWAP_CONTRACT.address);
    const contractBal3CRVLP = await CRV3LP_CONTRACT.balanceOf(SWAP_CONTRACT.address);
    const contractBalWETH = await WETH_CONTRACT.balanceOf(SWAP_CONTRACT.address);
    const contractBalDAI = await DAI_CONTRACT.balanceOf(SWAP_CONTRACT.address);

    console.log("==========\n");

    console.log("Account CRV Bal:", accountBalCRV.toString());
    console.log("Account CVX Bal:", accountBalCVX.toString());
    console.log("Account 3CRV LP Bal:", accountBal3CRV.toString());
    console.log("Account DAI Bal:", normalise(accountBalDAI.toString(), ERC20_DECIMAL).toString());

    console.log("\n");

    console.log("Contract CRV Bal:", normalise(contractBalCRV.toString(), ERC20_DECIMAL).toString());
    console.log("Contract CVX Bal:", normalise(contractBalCVX.toString(), ERC20_DECIMAL).toString());
    console.log("Contract 3CRV LP Bal:", normalise(contractBal3CRVLP.toString(), ERC20_DECIMAL).toString());
    console.log("Contract WETH Bal:", contractBalWETH.toString());
    console.log("Contract DAI Bal:", normalise(contractBalDAI.toString(), ERC20_DECIMAL).toString());

    console.log("\n");

    console.log("==========\n");
};

const sendERC20 = async (ERC20_CONTRACT, from, to, amount) => {
    await ERC20_CONTRACT.transfer(to, amount, {
        from,
    });
};

const normalise = (unnormalisedAmount, assetDecimal) => {
    return web3.utils.toBN(unnormalisedAmount).div(web3.utils.toBN(10).pow(web3.utils.toBN(assetDecimal)));
};

const unnormalise = (normalisedAmount, assetDecimal) => {
    return web3.utils.toBN(normalisedAmount).mul(web3.utils.toBN(10).pow(web3.utils.toBN(assetDecimal)))
};