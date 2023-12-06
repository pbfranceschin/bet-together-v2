import { ethers } from "ethers";
import factoryMumbai from "../deployments/mumbai/Factory.json";
import resultControllerMumbai from "../deployments/mumbai/MockController.json";
import aaveApiMumbai from "../deployments/mumbai/AaveAPI.json";
import { mumbaiTestUSDC } from "../test/addresses";
import dotenv from "dotenv";
dotenv.config();

// 
const network = {
    "name": "mumbai",
    "chainId": 80001
};
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const API_KEY = process.env.INFURA_API_KEY;
const provider = new ethers.InfuraProvider(network.chainId, API_KEY );
// 
const ABI = factoryMumbai.abi;
const FACTORY_ADDRESS = factoryMumbai.address;
const CONTROLLER = resultControllerMumbai.address;
const AAVE_API = aaveApiMumbai.address;
const ASSET = mumbaiTestUSDC;
const ASSET_NAME = "USDC";
const NETWORK_NAME = network.name;
// 

const main = async() => {
  console.log(`creating new ${ASSET_NAME} pool in ${NETWORK_NAME}...`);
  if(!PRIVATE_KEY) throw new Error('missing env');
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const factory = new ethers.Contract(FACTORY_ADDRESS, ABI, signer);
  const tx = await factory.createPool(ASSET, CONTROLLER, AAVE_API);
  const receipt = await tx.wait();
  console.log(`tx: ${tx.hash}`);
  const iface = new ethers.Interface(ABI);
  const logs = receipt?.logs.map((log: any) => iface.parseLog({
    ...log,
    topics: Array.from(log.topics)
  }));
  const pool = logs[1]?.args[2];
  if(!pool || pool === ethers.ZeroAddress) throw new Error('error fetching pool address');
  console.log(`new pool deployed at ${pool}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
