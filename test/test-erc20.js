const IERC20 = artifacts.require("OZIERC20");

contract("IERC20", (accounts) => {
    const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const DAI_WHALE = "0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7";

    beforeEach(async() => {
        const dai = await IERC20.at(DAI);
        const bal = await dai.balanceOf(DAI_WHALE);
        console.log(`bal: ${bal}`);
    });

    it("should transfer DAI", async() => {
        console.log(accounts)
        const dai = await IERC20.at(DAI);
        const bal = await dai.balanceOf(DAI_WHALE);
        // await dai.transfer(accounts[0], bal, { from: DAI_WHALE })
        const bal1 = await dai.balanceOf(accounts[0])
        console.log(`bal: ${bal1}`)
    })
})
