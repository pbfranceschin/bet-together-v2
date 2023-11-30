import { ethers } from "hardhat";
import { Pool__factory, SampleAsset__factory, SampleVault__factory, SampleVaultAPI__factory, SampleController__factory, SampleController } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { BytesLike } from "ethers";

export const deployAsset = async(deployer: SignerWithAddress) => {
    const f = new SampleAsset__factory(deployer);
    const c = await f.deploy();
    await c.waitForDeployment();
    return c;
}

export const deployVault = async(deployer: SignerWithAddress, asset: string) => {
    const f = new SampleVault__factory(deployer);
    const c = await f.deploy(asset);
    await c.waitForDeployment();
    return c;
}

export const deployVaultAPI = async(deployer: SignerWithAddress, asset: string, vault: string ) => {
    const f = new SampleVaultAPI__factory(deployer);
    const c = await f.deploy(vault, asset);
    await c.waitForDeployment();
    return c;
}

export const deployResultContr = async(deployer: SignerWithAddress, game: string) => {
    const f = new SampleController__factory(deployer);
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