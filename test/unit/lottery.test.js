/**
 * ! UNIT TEST significa, testear cada function localmente para comprobar que funciona perfectamente
 */

/**
 * !Unit test se empieza con describe("nombre del contrato ",async function)
 */

/**
 * !Orden para realizar los test. EN el describe que engloba todo el contrato, vamos a deploy FundMe.
 * !Nota: debemos importar DEPLOYMENTS, que junto el uso de .fixture(["all"]), podamos hacer el deployment de toda la carpeta deploy
 * !Luego Vamos a subdividir los test, para ello creamos un describe() dentro del principal
 */
const { assert, expect } = require("chai");
const { deployments, network } = require("hardhat");
const { ethers } = require("hardhat");
const { check } = require("prettier");
const {
  developmentChain,
  networkConfig,
} = require("../../helper-hardhat-config");
const chainId = network.config.chainId;

!developmentChain.includes(network.name)
  ? describe.skip
  : describe("lottery Unit Test", function () {
      let lottery;
      let lotteryContract;
      let VRFCoordinatorV2Mock;
      let lotteryEntranceFee;
      let interval;
      let player;

      beforeEach(async () => {
        accounts = await ethers.getSigners();
        player = accounts[1];
        await deployments.fixture(["mocks", "lottery"]); // Deploys modules with the tags "mocks" and "raffle"
        VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        lotteryContract = await ethers.getContract("Lottery"); // Returns a new connection to the Raffle contract
        lottery = lotteryContract.connect(player); // Returns a new instance of the Raffle contract connected to player
        lotteryEntranceFee = await lottery.getEntranceFee();
        interval = await lottery.getInterval();
      });

      describe("constructor", function () {
        it("Initializes the lottery contract correctly", async () => {
          //Queremos saber que se está inicializando el contrato correctamente.
          //Por ello vamos a comporbar que el contrato empieza con STATE.OPEN
          const lotteryState = (await lottery.getLotteryState()).toString();
          assert.equal(lotteryState, "0");
          assert.equal(
            interval.toString(),
            networkConfig[network.config.chainId]["interval"]
          );
        });
      });

      describe("enterLottery", function () {
        it(" revert when you don´t pay enough", async function () {
          //Para revertir el proceso, necesitamos usar expect.
          await expect(lottery.enterLottery()).to.be.revertedWith(
            "Lottery__notEnough"
          );
        });

        it(" records players when entering to the lottery", async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          const contractPlayer = await lottery.getAddressPlayers(0);
          assert.equal(player.address, contractPlayer);
        });
        //Testing EVENT
        it(" emits envent on enter the lottery", async () => {
          await expect(
            lottery.enterLottery({ value: lotteryEntranceFee })
          ).to.emit(lottery, "LotteryEnter");
        });

        it("not allow to entrance the lottery when lottery is calculating", async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          //Para manipular el State y convertirlo a CALCULATING, tenemos que llamar a la function checkUpkeep()
          // Esta necesita algunos parámetros como interval. Para no tener que esperar para hacer nuestros test.
          //Usamos los SPECIAL TESTING/ DEBUGGING METHODS de hardhat. Link--> https://hardhat.org/hardhat-network/docs/reference#special-testing/debugging-methods
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]); //Increase of the time equal to a interval + 1.
          await network.provider.request({ method: "evm_mine", params: [] }); // simpre que incrementamos el tiempo, hay que minar nuevo bloque

          //Hasta aqui hemos seguido los pasos de checkUpKeep() y nos reporta a la siguiente function performUpkeep().
          //Ahora vamos a pretender ser el Chainlink Keeper, y provocaremos que el State sea de calculating/close para que podamos
          //testear que cuando hay situaciones asi, se activa el REVERT error lottery__Closed();

          await lottery.performUpkeep([]);
          //Esta function cambia el STATE a CALCULATING. Por lo que si ahroa llamamos a la function ENTERlottery(), estará en
          //estado CALCULATING, por lo que tendria que saltar el error que queremos testear.
          await expect(
            lottery.enterLottery({ value: lotteryEntranceFee })
          ).to.be.revertedWith("Lottery__Closed");
        });
      });

      describe("checkUpKeep", function () {
        it("Returns false if people haven´t sent any ETH", async function () {
          //LA estrategia para comprobar esto no consiste en ver si hay dinero en el contrato, sino si UpkeepNeeded es falso o verdadero
          // Es decir. Sabemos que todos los booleanos anteriores son verdaderos. Porlo que si decimos que UpKeepNeeded es falso,
          //quiere decir que algunos de esos parametros esta falso y nos devolverá el error
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          //Extraemos upKeepNeeded de la function CheckUpKeep
          //Usamos CallStatic para simular que llamamos esta function.
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x");

          assert(!upkeepNeeded, "not enough money");
        });
        it("returns false if lottery isn´t OPEN", async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          await lottery.performUpkeep([]);
          const lotteryState = await lottery.getLotteryState();
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x");
          assert.equal(lotteryState.toString(), "1");
          assert.equal(upkeepNeeded, false);
        });
        it("Returns false if enough time hasn´t passed", async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() - 5,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x");
          assert(!upkeepNeeded);
        });
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x");
          assert(upkeepNeeded);
        });
      });

      describe("performUpKeep", function () {
        it("It can only run if checkUpKeep is true", async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const tx = await lottery.performUpkeep("0x");
          //Si assrt tx no funciona, quiere decir que checkupkeep es false.
          assert(tx);
        });
        it("Reverts when checkupkeep is false", async function () {
          await expect(lottery.performUpkeep("0x")).to.be.revertedWith(
            "Lottery__UpKeepNotNeeded"
          );
        });
        it("Updates the lotteryState, emits and event, and calls the VRF_Coordinator", async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const txResponse = await lottery.performUpkeep("0x");
          const txReceipt = await txResponse.wait(1);
          const requestId = txReceipt.events[1].args.requestId;
          const lotteryState = await lottery.getLotteryState();
          assert(requestId.toNumber() > 0);
          assert(lotteryState.toString() == "1");
        });
      });
      describe("fulfillRandomWords", function () {
        beforeEach(async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
        });
        it("can only be called after performUpKeep", async function () {
          await expect(
            VRFCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
          ).to.be.revertedWith("nonexistent request");
          await expect(
            VRFCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)
          ).to.be.revertedWith("nonexistent request");
        });
        //Way to big test sumarizing everything

        it("picks a winner, resets the lottery, and sends money", async function () {
          //Creamos varios jugadores.Para ello For

          const additionaEntrancesFees = 3;
          const startingAccountIndex = 2; // ya que el deployer es 0

          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + additionaEntrancesFees;
            i++
          ) {
            lottery = lotteryContract.connect(accounts[i]);
            await lottery.enterLottery({
              value: lotteryEntranceFee,
            });
          }
          console.log(accounts[2]);
          const startingTimeStamp = await lottery.getLatestTimeStamp();
          console.log(startingTimeStamp.toString());

          //Vamos a crear test usando new PROMISE. Este es un metodo nuevo en el curso.
          //Primero PerfomUpKeep
          //Luego fullfillRamdomWords
          //Hay que esperar a fullfillrandomWords para que se ejecute antes de continuar

          await new Promise(async (resolve, reject) => {
            //Queremos escuchar el evento WinerList que es el que indica quien ha sido el ganador

            lottery.once("WinnersList", async () => {
              console.log("Found the Event Winner");
              try {
                const recentWinner = await lottery.getRecentWinner();
                console.log(recentWinner);
                console.log(accounts[2]);
                console.log(accounts[0]);
                console.log(accounts[1]);
                console.log(accounts[3]);

                const lotteryState = await lottery.getLotteryState();
                const endingTimeStamp = await lottery.getLatestTimeStamp();
                const winnerBalance = await accounts[2].getBalance();
                const numPlayers = await lottery.getNumberOfPlayers();

                //Empezamos a hacer ASSERTS
                assert.equal(recentWinner.toString(), accounts[2].address);
                assert.equal(numPlayers.toString(), "0");
                assert.equal(lotteryState, "0");
                assert(endingTimeStamp > startingTimeStamp);
                assert.equal(
                  winnerBalance.toString(),
                  winnerStartingBalance
                    .add(
                      lotteryEntranceFee
                        .mul(additionaEntrancesFees)
                        .add(lotteryEntranceFee)
                    )
                    .toString()
                );

                resolve();
              } catch (e) {
                reject(e);
              }
            });

            //Pero antes, tenemos que ejectar todo el resto del smart contract para que podamos tener un WInner. Es decir es un poco
            //yendo hacia detras. primero hemos establecido el LISTENER y ahora hacemos lo que se necesita para producir ese LISTENER

            const tx = await lottery.performUpkeep("0x");
            const txReceipt = await tx.wait(1);
            const winnerStartingBalance = await accounts[2].getBalance();
            const requestId = txReceipt.events[1].args.requestId;
            console.log(requestId.toString());
            console.log(winnerStartingBalance);
            console.log(lottery.address);
            await VRFCoordinatorV2Mock.fulfillRandomWords(
              requestId,
              lottery.address
            );
            console.log("checkpoint");
          });
        });
      });
    });
