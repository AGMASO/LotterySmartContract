const { ethers, network } = require("hardhat");
const {
  developmentChain,
  networkConfig,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat-config");

async function mockKeepers() {
  const lottery = await ethers.getContract("Lottery");
  const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));
  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(checkData);
  if (upkeepNeeded) {
    const tx = await lottery.performUpkeep(checkData);
    const txReceipt = await tx.wait(1);
    const requestId = txReceipt.events[1].args.requestId;
    console.log(`Performed upkeep with RequestId: ${requestId}`);

    if (developmentChain.includes(network.name)) {
      await mockVrf(requestId, lottery);
      console.log("test1");
    }
  } else {
    console.log("No upkeep needed!");
  }
}

async function mockVrf(requestId, lottery) {
  console.log("We on a local network? Ok let's pretend...");
  VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
  await VRFCoordinatorV2Mock.fulfillRandomWords(requestId, lottery.address);
  console.log("Responded!");
  const recentWinner = await lottery.getRecentWinner();
  console.log(`The winner is: ${recentWinner}`);
}

mockKeepers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
