import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers"
import "@typechain/hardhat";
import 'hardhat-deploy';
import dotenv from 'dotenv';
dotenv.config();

const INFURA_API_KEY = process.env.INFURA_API_KEY;
// const defaultNetwork = 'localhost';
const defaultNetwork = 'hardhat';

const config: HardhatUserConfig = {
  solidity: "0.8.20",

  defaultNetwork,

  networks: {
    localhost: {
      chainId: 31337
    },
    mumbai: {
      chainId: 80001,
      url: `https://polygon-mumbai.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [`${process.env.PRIVATE_KEY}`]
    }
  },

  namedAccounts: {
    deployer: {
      default: 0,
    }
  }

};

export default config;
