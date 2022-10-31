const { run } = require("hardhat");

/**
 * ! NUEVA Function para verificar autimaticamente los contratos
 */
//Tenemos que introducir dos argumentos a la function : contractAddress y args. Args si no hay constructor en nuestro .sol
// estará vacio.
async function verify(contractAddress, args) {
  console.log("Verifying contract...");

  try {
    //Usamos RUN para correr la funcion interna de Hardhat VERIFY. Esta tiene varias substask, debemso escoger Verify
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (e) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already Verified");
    } else {
      console.log(e);
    }
  }
}

module.exports = { verify };
