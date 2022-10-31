const { assert, expect } = require("chai");
const { deployments, network } = require("hardhat");
const { ethers } = require("hardhat");
const { getNamedAccounts } = require("hardhat");
const {
  developmentChain,
  networkConfig,
} = require("../../helper-hardhat-config");

developmentChain.includes(network.name)
  ? describe.skip
  : describe("Lottery staging Test", function () {
      let lottery;
      let deployer;
      let lotteryEntranceFee;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;

        lottery = await ethers.getContract("Lottery", deployer);

        lotteryEntranceFee = await lottery.getEntranceFee();
      });
      describe("fullfillRandomWords", function () {
        it("Works with live Chainlink Automations and Chainlink VRF, we get random winner", async function () {
          //En este test queremos comprobar que todo funciona correctament en linea

          const startingTimeStamp = await lottery.getLatestTimeStamp();
          //Como solo entramos con una cuenta que es el deployer, es decir cuenta[0]. tenemso que declarar las cuentas
          const accounts = await ethers.getSigners();
          console.log(accounts);

          //Pero antes queremos setup el Listener antes de entrar en la Loteria, ya que puede pasar que la blockchain
          //Vaya muy rapida y se salte este paso.

          await new Promise(async (resolve, reject) => {
            lottery.once("WinnersList", async () => {
              console.log("WinnersList event fired");
              //Una vez hemos creado el .once y nos hemos asegurado que se está escuchando el EVENT. Entonces dentro de
              //Once vamos a añadir la tecnica TRY{} CATCH{}, y en try vamos a meter nuestros asserts

              try {
                //Una vez que se ejecuta el evento WinnerList. Queremos ver el recentWinner
                const recentWinner = await lottery.getRecentWinner();
                console.log(recentWinner);
                const lotteryState = await lottery.getLotteryState();
                console.log(lotteryState);
                const winnerEndingBalance = await accounts[0].getBalance(); //deployer account. la nuestra
                console.log(winnerEndingBalance.toString());
                const endingTimeStamp = await lottery.getLatestTimeStamp();
                console.log(endingTimeStamp.toString());
                const RandomWords = await lottery.getNumRandomWords();
                console.log(RandomWords.toString());

                //add asserts

                //Ver si se resetea la lista de players
                await expect(lottery.getAddressPlayers(0)).to.be.reverted;
                console.log("first test done");
                //Ver si la cuenta del ganador es la del deployer
                assert.equal(recentWinner.toString(), accounts[0].address);
                console.log("second test done");
                //Ver que la loteria se queda en OPEN despues de todo el proceso
                assert.equal(lotteryState, 0);
                console.log("third test done");

                //Ver si se ha pagado al winner
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance.add(lotteryEntranceFee).toString()
                );
                console.log("fourth test done");
                //Ver si el tiempo ha pasado correctametne
                assert(endingTimeStamp > startingTimeStamp);
                console.log("fith test done");

                resolve();
              } catch (error) {
                reject(error);
              }
            });
            //Primero debemos entrar en la loteria
            console.log("entering the lottery...");
            const tx = await lottery.enterLottery({
              value: lotteryEntranceFee,
            });
            await tx.wait(1);
            console.log("Ok, time to wait...");
            const winnerStartingBalance = await accounts[0].getBalance();

            console.log(winnerStartingBalance.toString());

            //Una vez mas, este codigo no finalizará hasta haber esuchado al listener (new Promise)
          });
        });
      });
    });
