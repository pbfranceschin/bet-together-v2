import { expect } from "chai";
import { ethers } from "hardhat";
import { Factory, MockAsset, MockVaultAPI, MockController, MockVault } from "../typechain-types";
import { deployFactory, deployAsset, deployVault, deployVaultAPI, deployResultContr } from "./test-utils";
import factoryData from "../artifacts/contracts/Factory.sol/Factory.json";
import poolData from "../artifacts/contracts/Pool.sol/Pool.json";

describe("Factory tets", function () {
  
  let factory: Factory, asset: MockAsset, vault: MockVault, vApi: MockVaultAPI, contr: MockController;
  let assetAddr: string;
  const provider = ethers.provider;

  before(async() => {
    const [deployer] = await ethers.getSigners();
    factory = await deployFactory(deployer);
    asset = await deployAsset(deployer);
    assetAddr = await asset.getAddress();
    vault = await deployVault(deployer, assetAddr);
    vApi = await deployVaultAPI(deployer, assetAddr, await vault.getAddress() );
    contr = await deployResultContr(deployer, "Game");
  })

  it("should deploy a Pool contract", async () => {
    const deploy = await factory.createPool(assetAddr, await contr.getAddress(), await vApi.getAddress());
    const receipt = await deploy.wait();
    const iface = new ethers.Interface(factoryData.abi);
    const logs = receipt?.logs.map(log => iface.parseLog({
        ...log,
        topics: Array.from(log.topics)
    }));
    let poolAddr = "0x0000000000000000000000000000000000000000"
    if(logs) poolAddr = logs[1]?.args[2];
    const pool = new ethers.Contract(poolAddr, poolData.abi, provider);
    if(poolAddr === "0x0000000000000000000000000000000000000000") throw new Error("couldn't fetch pool address");
    expect(await pool.asset()).to.eq(assetAddr);
  });

});



// const ethers = require('ethers');

// async function checkEvent(provider, txHash, contract, eventName) {
//     // Get the transaction receipt
//     const receipt = await provider.getTransactionReceipt(txHash);

//     // Create an interface for the contract
//     const iface = new ethers.utils.Interface(contract.abi);

//     // Parse the logs in the receipt
//     const logs = receipt.logs.map(log => iface.parseLog(log));

//     // Filter the logs for the specific event
//     const eventLogs = logs.filter(log => log.name === eventName);

//     // If eventLogs array is not empty, the event was emitted
//     if (eventLogs.length > 0) {
//         console.log(`Event ${eventName} was emitted in transaction ${txHash}`);
//     } else {
//         console.log(`Event ${eventName} was not emitted in transaction ${txHash}`);
//     }
// }

// // Usage:
// const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
// const txHash = '0x...'; // Replace with your transaction hash
// const contract = { abi: [ /* Your contract ABI */ ] };
// const eventName = 'Staked'; // Replace with your event name

// checkEvent(provider, txHash, contract, eventName);