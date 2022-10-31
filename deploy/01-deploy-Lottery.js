const { network, ethers } = require("hardhat");
const {
  developmentChain,
  networkConfig,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

//FundAmount hardcoded
const FUND_AMOUNT = ethers.utils.parseEther("2");

/*const VRF_SUBSCRIPTION_AMOUNT = ethers.utils.parseEther("2");
const chainId = network.config.chainId;
let VRFCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
let subscriptionId = networkConfig[chainId]["subscriptionId"];
let VRFCoordinatorV2Mock;*/

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;

  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let VRFCoordinatorV2Address, subscriptionId, VRFCoordinatorV2Mock;

  if (chainId == 31337) {
    VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    VRFCoordinatorV2Address = VRFCoordinatorV2Mock.address;

    //Crear subcription en mock

    const transactionResponse = await VRFCoordinatorV2Mock.createSubscription(); //createSubscription viene del contrato VRFCoordiantorV2Mock
    const transactionReceipt = await transactionResponse.wait();
    subscriptionId = transactionReceipt.events[0].args.subId;

    //Fund the subscription we just created.
    await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
    /*await VRFCoordinatorV2Mock.addConsumer(
      subscriptionIdMock.toNumber(),
      lottery.address
    );
    log("consumer added");*/
  } else {
    //Si no estamos trabajando en local, entonces ve a networkConfig/chainId y coge la address con nombre vrfCoordinatorV2
    VRFCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }
  const waitBlockConfirmations = developmentChain.includes(network.name)
    ? 1
    : VERIFICATION_BLOCK_CONFIRMATIONS;

  log("----------------------------------------------------");

  const entranceFee = networkConfig[chainId]["entranceFee"];
  const keyHash = networkConfig[chainId]["keyHash"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
  const interval = networkConfig[chainId]["interval"];

  const args = [
    VRFCoordinatorV2Address,
    subscriptionId,
    keyHash,
    interval,
    entranceFee,
    callbackGasLimit,
  ];

  //Agregamos el Contrato VRFCoordinatorV2Mock porque lo necesitamos en los ARGS

  const lottery = await deploy("Lottery", {
    from: deployer,
    args: args,
    log: true,
    waitConfiramtions: waitBlockConfirmations,
  });

  log("-----------------------");
  log("Deploying contract named Lottery");
  log(`Lottery Contract deployed at ${lottery.address}`);

  if (developmentChain.includes(network.name)) {
    const VRFCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    );
    await VRFCoordinatorV2Mock.addConsumer(subscriptionId, lottery.address);
  }

  if (
    !developmentChain.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    //Recuerda que verify, tiene dos parametros, adrress del contract y argumentos.
    await verify(lottery.address, args);
  }
};

//Tags para deploy este contrato directamente.

module.exports.tags = ["all", "lottery"];
