const CurveLendingContract = artifacts.require("CurveLending");

module.exports = function (deployer) {
  deployer.deploy(CurveLendingContract);
};