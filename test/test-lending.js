const IERC20 = artifacts.require("IERC20")
const LENDING = artifacts.require("CurveLending")

const USDC_WHALE = "0xcffad3200574698b78f32232aa9d63eabd290703";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_INDEX = 1;

contract("TestCurveLending", (accounts) => {
    beforeEach(async () => {
        USDC_CONTRACT = await IERC20.at(USDC)
        LENDING_CONTRACT = await LENDING.new()

        console.log("ORIGINAL")
        await displayAll(accounts[0]);

        amount = 1

        await web3.eth.sendTransaction({
            from: accounts[0],
            to: USDC_WHALE,
            value: web3.utils.toWei(amount.toString(), "ether")
        });

        const usdcAmount = 1000000000;
        await USDC_CONTRACT.transfer(LENDING_CONTRACT.address, usdcAmount, {
            from: USDC_WHALE,
          })

        console.log("SETUP")
        await displayAll(accounts[0]);
    })

    it("adds liquidity", async () => {
        await LENDING_CONTRACT.lendAll()
        console.log("POST LENDING")
        await displayAll(accounts[0])
    })
})

displayAll = async (account) => {
    const whaleBalUSDC = await USDC_CONTRACT.balanceOf(USDC_WHALE);
    const accountBalUSDC = await USDC_CONTRACT.balanceOf(account);
    const contractBalUSDC = await USDC_CONTRACT.balanceOf(LENDING_CONTRACT.address);
    const lpBalance = await LENDING_CONTRACT.getLPBalance()

    console.log("==========\n")

    console.log("WHALE USDC bal:", whaleBalUSDC.toString());
    console.log("CONTRACT USDC bal:", contractBalUSDC.toString())
    console.log("ACCOUNT USDC bal:", accountBalUSDC.toString());
    console.log("LP Balance:", lpBalance.toString())

    console.log("\n==========")
}