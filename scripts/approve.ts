import { ethers } from "ethers";
import { mumbaiUSDCPool, mumbaiTestUSDC } from "../test/addresses";
import mockAsset from "../artifacts/contracts/test/MockAsset.sol/MockAsset.json";
import dotenv from "dotenv";
dotenv.config();

import resultControllerMumbai from "../deployments/mumbai/MockController.json";
import aaveApiMumbai from "../deployments/mumbai/AaveAPI.json";

// const encode = () => {
//   const abiCoder = ethers.AbiCoder.defaultAbiCoder();

//   const args = abiCoder.encode(["address", "address", "address"], [mumbaiTestUSDC, resultControllerMumbai.address, aaveApiMumbai.address]);
//   console.log(args);
// }
// encode();

const network = {
    "name": "mumbai",
    "chainId": 80001
};
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const API_KEY = process.env.INFURA_API_KEY;
const provider = new ethers.InfuraProvider(network.chainId, API_KEY );
// 
const ABI = mockAsset.abi;
const ASSET = mumbaiTestUSDC;
const ASSET_NAME = "USDC";
const NETWORK_NAME = network.name;
// 
// args
const SPENDER = mumbaiUSDCPool;
const AMOUNT = ethers.MaxUint256;


const main = async(spender:string, amount:bigint) => {
  console.log(`approving ${ASSET_NAME} at ${NETWORK_NAME}...`)
  if(!PRIVATE_KEY) throw new Error('missing env');
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const asset = new ethers.Contract(ASSET, ABI, signer);
  const tx = await asset.approve(spender, amount);
  await tx.wait();
  console.log(`tx: ${tx.hash}`);
  console.log('\nchecking allowance...\n');
  const allowance = await asset.allowance(signer.address, spender);
  console.log(`allowance: ${allowance}, valid? ${allowance == amount}`);
}

main(SPENDER, AMOUNT).catch(error => {
    console.log(error);
    process.exitCode = 1;
});