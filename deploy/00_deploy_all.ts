import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const mumbaiAavePoolAddressProvider = '0x4CeDCB57Af02293231BAA9D39354D6BFDFD251e0';
// const mumbaiDaiAToken = '0x8903bbBD684B7ef734c01BEb00273Ff52703514F';
const mumbaiUSDCAToken = '0x4086fabeE92a080002eeBA1220B9025a27a40A49';
const mumbaiTestUSDC = '0x52D800ca262522580CeBAD275395ca6e7598C014';
  
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  
  await deploy('Factory', {
    from: deployer,
    args: [],
    log: true,
  });
  
  await deploy('MockController', {
    from: deployer,
    args: ["game"],
    log: true,
  });

  const baseExchangeRate = 1e6;

  await deploy('AaveAPI', {
    from: deployer,
    args: [
        mumbaiTestUSDC,
        mumbaiAavePoolAddressProvider,
        baseExchangeRate
    ],
    log: true,
  });
  
};
export default func;