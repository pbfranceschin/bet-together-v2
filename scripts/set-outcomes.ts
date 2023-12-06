import { BytesLike, ethers, getBigInt } from "ethers";
import { mumbaiUSDCPool, mumbaiTestUSDC } from "../test/addresses";
import poolData from "../artifacts/contracts/Pool.sol/Pool.json";
import mumbaiController from "../deployments/mumbai/MockController.json";
import dotenv from "dotenv";
import { string } from "hardhat/internal/core/params/argumentTypes";
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
const ABI = mumbaiController.abi;
const NETWORK_NAME = network.name;
const CONTROLLER_ADDRESS = mumbaiController.address;
// 
// args
const OUTCOMES = [
    ethers.solidityPackedKeccak256(["string"], ["EMPTY SLOT"]),
    ethers.solidityPackedKeccak256(["string"], ["OUTCOME 1"]),
    ethers.solidityPackedKeccak256(["string"], ["OUTCOME 2"]),
    ethers.solidityPackedKeccak256(["string"], ["OUTCOME 3"]),
    ethers.solidityPackedKeccak256(["string"], ["OUTCOME 4"]),
    ethers.solidityPackedKeccak256(["string"], ["OUTCOME 5"]),
    ethers.solidityPackedKeccak256(["string"], ["OUTCOME 6"]),
    ethers.solidityPackedKeccak256(["string"], ["OUTCOME 7"]),
    ethers.solidityPackedKeccak256(["string"], ["OUTCOME 8"]),
    ethers.solidityPackedKeccak256(["string"], ["OUTCOME 9"]),
    ethers.solidityPackedKeccak256(["string"], ["OUTCOME 10"])
];
// 

const test = () => {
    console.log(OUTCOMES)
}
// test();

// tx: 0xa2c91433f3c9cd9881aa3e7afcf67734871c82e62ec76b206319ff464167a330

const main = async(outcomes: BytesLike[]) => {
  console.log(`setting outcomes in ${NETWORK_NAME}...`);
  if(!PRIVATE_KEY) throw new Error('missing env');
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const controller = new ethers.Contract(CONTROLLER_ADDRESS, ABI, signer);
//   
  const tx = await controller.setOutcomes(outcomes);
  await tx.wait();
  console.log(`tx: ${tx.hash}`);
// 
  console.log('\nchecking entries...\n')
  const _outcomesCount = await controller.getOutcomesCount();
  console.log(`outcomes count = ${_outcomesCount.toString()}, valid? ${_outcomesCount == BigInt(outcomes.length)}`);
  const lastEntry = await controller.getOutcomeName(_outcomesCount - BigInt(1));
  console.log(`last entry valid? ${lastEntry === outcomes[outcomes.length - 1]}`);
}

main(OUTCOMES).catch((error) => {
    console.log(error);
    process.exitCode = 1;
});
