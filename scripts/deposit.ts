import { ethers } from "ethers";
import { mumbaiUSDCPool, mumbaiTestUSDC } from "../test/addresses";
import poolData from "../artifacts/contracts/Pool.sol/Pool.json";
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
const ABI = poolData.abi;
const POOL_ADDRESS = mumbaiUSDCPool;
const ASSET = mumbaiTestUSDC;
const ASSET_NAME = "USDC";
const NETWORK_NAME = network.name;
//
// args
const AMOUNT = 5000;
const OUTCOME = 10;
// 

const main = async(outcome:number, amount: number) => {
  console.log(`depositing ${amount} ${ASSET_NAME} in ${NETWORK_NAME} pool...`);
  if(!PRIVATE_KEY) throw new Error('missing env');
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const pool = new ethers.Contract(POOL_ADDRESS, ABI, signer);
//   
  const tx = await pool.stake(outcome, amount);
  const receipt = await tx.wait();
  console.log(`tx: ${tx.hash}`);
  console.log('===========');
  console.log(receipt.logs);
//   
  console.log(`\nchecking stake...\n`);
  const stake = await pool.getStake(signer.address, outcome);
  console.log(`stake = ${stake.toString()}, valid? ${stake == BigInt(amount)}`);
//   
  console.log(`\nchecking shares...\n`);
  const shares = await pool.getShares(signer.address, outcome);
  console.log(`shares: ${shares.toString()}`);
}

main(OUTCOME, AMOUNT).catch(error => {
    console.log(error);
    process.exitCode = 1;
});
