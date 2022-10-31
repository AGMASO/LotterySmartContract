const { network } = require("hardhat");
const { developmentChain } = require("../helper-hardhat-config");

//StateVariables que tenemos que definir porque van como porametros en el constructor de VRFCoordinatorV2Mock.
const BASE_FEE = "250000000000000000"; //El minimo que nos va acobrar en LINK por ejecutar. Se encuentra en la docu como Premium
const GAS_PRICE_LINK = 1e9;

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  //Aqui incluimos el IF statment para idicar que solo se ejecute este deploy mocks si tenemso la chain de hardhat o localhost

  if (chainId == 31337) {
    log("Local network detected!! Deploying contract to local");
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: [BASE_FEE, GAS_PRICE_LINK],
    });

    log("MOcks DePloYed!!");
    log(
      "-----------------------------------------------------------------------------------"
    );
  }
};

/**
 * !Con este module.exports.tags, estamos creando unos tags que los podremos usar en el comando y correr directamente
 * ! este mocks.
 */
module.exports.tags = ["all", "mocks"];
