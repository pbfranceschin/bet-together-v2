import { ethers } from "hardhat";
import { 
    Factory__factory ,Pool__factory, MockAsset__factory, MockVault__factory, MockVaultAPI__factory, MockController__factory,
    MockAavePool__factory, MockAavePoolAddressesProvider__factory, MockAToken__factory, AaveAPI__factory, MockAToken, MockAsset } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { BytesLike } from "ethers";


export const deployFactory = async(deployer: SignerWithAddress) => {
    const f = new Factory__factory(deployer);
    const c = await f.deploy();
    await c.waitForDeployment();
    return c;
}

export const deployAsset = async(deployer: SignerWithAddress) => {
    const f = new MockAsset__factory(deployer);
    const c = await f.deploy();
    await c.waitForDeployment();
    return c;
}

export const deployVault = async(deployer: SignerWithAddress, asset: string) => {
    const f = new MockVault__factory(deployer);
    const c = await f.deploy(asset);
    await c.waitForDeployment();
    return c;
}

export const deployVaultAPI = async(deployer: SignerWithAddress, asset: string, vault: string ) => {
    const f = new MockVaultAPI__factory(deployer);
    const c = await f.deploy(vault, asset);
    await c.waitForDeployment();
    return c;
}

export const deployResultContr = async(deployer: SignerWithAddress, game: string) => {
    const f = new MockController__factory(deployer);
    const c = await f.deploy(game);
    await c.waitForDeployment();
    return c;
}

export const deployPool = async(deployer: SignerWithAddress, asset: string , resContr:string, vaultAPI:string) => {
    const f = new Pool__factory(deployer);
    const c = await f.deploy(asset, resContr, vaultAPI);
    await c.waitForDeployment();
    return c;
}

export const makeOutcomes = () => {
    let o: BytesLike[] = [ethers.solidityPackedKeccak256(["string"], ["EMPTY_SLOT"])];
    let i: number;
    for(i=0; i<20; i++) {
        o.push(ethers.solidityPackedKeccak256(["string"], [i.toString()]));
    }
    return o;
}

export const deployAaveAPI = async(deployer: SignerWithAddress, asset: string , aavePoolAddressProvider:string, baseExchangeRate: bigint) => {
    const f = new AaveAPI__factory(deployer);
    const c = await f.deploy(asset, aavePoolAddressProvider, baseExchangeRate);
    await c.waitForDeployment();
    return c;
}

export const deployMockAavePool = async(deployer: SignerWithAddress, aToken: MockAToken, underlying: MockAsset ) => {
    const f = new MockAavePool__factory(deployer);
    const c = await f.deploy(aToken, underlying);
    await c.waitForDeployment();
    return c;
}

export const deployMockAToken = async(deployer: SignerWithAddress, underlying: string ) => {
    const f = new MockAToken__factory(deployer);
    const c = await f.deploy(underlying);
    await c.waitForDeployment();
    return c;
}

export const deployMockAavePoolAddressProvider = async(deployer: SignerWithAddress, pool: string ) => {
    const f = new MockAavePoolAddressesProvider__factory(deployer);
    const c = await f.deploy(pool);
    await c.waitForDeployment();
    return c;
}