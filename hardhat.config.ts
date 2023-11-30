import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers"
import "@typechain/hardhat";
import 'hardhat-deploy';

// const defaultNetwork = 'localhost';
const defaultNetwork = 'hardhat';

const config: HardhatUserConfig = {
  solidity: "0.8.20",

  defaultNetwork,

  networks: {
    localhost: {
      chainId: 31337
    }
  },

  namedAccounts: {
    deployer: {
      default: 0,
    }
  }

};

export default config;
