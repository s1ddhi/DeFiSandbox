const IERC20 = artifacts.require("IERC20");
const EXCHANGE = artifacts.require("CurveExchange")

const USDC_WHALE = "0xcffad3200574698b78f32232aa9d63eabd290703";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const USDC_INDEX = 1;
const USDT_INDEX = 2;
const DAI_INDEX = 3;

contract("TestExchange", (accounts) => {

    beforeEach(async() => {
        USDC_CONTRACT = await IERC20.at(USDC);
        USDT_CONTRACT = await IERC20.at(USDT);
        DAI_CONTRACT = await IERC20.at(DAI);
        EXCHANGE_CONTRACT = await EXCHANGE.new();

        console.log("ORIGINAL")
        await displayAll(accounts);

        amount = 1

        await web3.eth.sendTransaction({
            from: accounts[0],
            to: USDC_WHALE,
            value: web3.utils.toWei(amount.toString(), "ether")
        });

        const usdcAmount = 1000000000;
        await USDC_CONTRACT.transfer(EXCHANGE_CONTRACT.address, usdcAmount, {
            from: USDC_WHALE,
          })

        console.log("SETUP")
        await displayAll(accounts);
    })

    // it("swaps all USDC for USDT", async() => {
    //     await EXCHANGE_CONTRACT.swapAll(USDC_INDEX, USDT_INDEX);
    // })

    it("constantly swaps", async () => {
        for (let i = 0; i < 100; i++) {
            await EXCHANGE_CONTRACT.swapAll(USDC_INDEX, USDT_INDEX);
            await EXCHANGE_CONTRACT.swapAll(USDT_INDEX, USDC_INDEX);
        }
    });
})

displayAll = async (accounts) => {
    const whaleBalUSDC = await USDC_CONTRACT.balanceOf(USDC_WHALE);
    const whaleBalUSDT = await USDT_CONTRACT.balanceOf(USDC_WHALE);
    const whaleBalDAI = await DAI_CONTRACT.balanceOf(USDC_WHALE);
    const accountBalUSDC = await USDC_CONTRACT.balanceOf(accounts[0]);
    const accountBalUSDT = await USDT_CONTRACT.balanceOf(accounts[0]);
    const accountBalDAI = await DAI_CONTRACT.balanceOf(accounts[0]);
    const contractBalUSDC = await USDC_CONTRACT.balanceOf(EXCHANGE_CONTRACT.address);
    const contractBalUSDT = await USDT_CONTRACT.balanceOf(EXCHANGE_CONTRACT.address);
    const contractBalDAI = await DAI_CONTRACT.balanceOf(EXCHANGE_CONTRACT.address);

    console.log("==========\n")

    console.log("WHALE USDC bal:", whaleBalUSDC.toString());
    console.log("WHALE USDT bal:", whaleBalUSDT.toString());
    console.log("WHALE DAI bal:", whaleBalDAI.toString());
    console.log("CONTRACT USDC bal:", contractBalUSDC.toString())
    console.log("CONTRACT USDT bal:", contractBalUSDT.toString())
    console.log("CONTRACT DAI bal:", contractBalDAI.toString())
    console.log("ACCOUNT USDC bal:", accountBalUSDC.toString());
    console.log("ACCOUNT USDT bal:", accountBalUSDT.toString());
    console.log("ACCOUNT DAI bal:", accountBalDAI.toString());

    console.log("\n==========")
}