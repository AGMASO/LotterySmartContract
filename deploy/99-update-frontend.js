/**
 * * Este script automatiza y le da al front end el address local o mainnet y el abi que se está utilizando en cada caso.
 * * Muy práctico para que el frontend funciones siempre bien con el backend deployed en local o online.
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");

//Vamos a crear constantes globales para indicar donde guardar en el frontend el ABI, Address of the contract, etc
//En nuestro caso será en constants/contractAddresses y constants/abi
const FRONTEND_ADDRESSES_FILE =
  "../nextjs-lottery/constants/contractAddresses.json";
const FRONTEND_ABI = "../nextjs-lottery/constants/Abi.json";

module.exports = async function () {
  if (process.env.UPDATE_FRONTEND) {
    console.log("Updating Front-end");
    //Esta function la estamos creando para actualizar cambios y crear diferentes ficheros CONSTANTS para local y mainnet
    //ASi podremos tener versiones en local y online del frontend tambien. Ya que al frontend le debemos dar el ABI, contractAddress, etc
    //que van a ser diferentes en local y el mainnet. Por eso necesitamos hacer este paso

    await updateAbi();
    await updateContractAddresses();
  }
};

async function updateAbi() {
  const lottery = await ethers.getContract("Lottery");
  //esta linea de código utiliza el interface de ETHERS que nos facilita en un sola linea de codigo acceder al ABI del contrato
  //Simplemtne copia pega esta linea cuando lo necesites, o mira la documentacion.
  fs.writeFileSync(
    FRONTEND_ABI,
    lottery.interface.format(ethers.utils.FormatTypes.json)
  );
}

async function updateContractAddresses() {
  const lottery = await ethers.getContract("Lottery");
  //para update las direcciones que estamos usando
  const currentAddresses = JSON.parse(
    fs.readFileSync(FRONTEND_ADDRESSES_FILE, "utf-8")
  );
  const chainId = network.config.chainId.toString();

  if (chainId in currentAddresses) {
    if (!currentAddresses[chainId].includes(lottery.address)) {
      currentAddresses[chainId].push(lottery.address);
    }
  } else {
    currentAddresses[chainId] = [lottery.address];
  }
  fs.writeFileSync(FRONTEND_ADDRESSES_FILE, JSON.stringify(currentAddresses));
}

module.exports.tags = ["all", "frontend"];
