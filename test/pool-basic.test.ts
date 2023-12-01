import { expect } from "chai";
import { ethers } from "hardhat";
import { Pool, MockAsset, MockVault, MockVaultAPI, MockController } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { makeOutcomes, deployAsset, deployPool, deployResultContr, deployVault, deployVaultAPI } from "./test-utils";

describe.skip("Pool basic test", function () {
  let pool: Pool, vApi: MockVaultAPI, resContr: MockController , asset:MockAsset, vault:MockVault;
  let assAddr: string, vaultAddr: string, vApiAddr: string, resContrAddr:string, poolAddr:string;
  let owner: SignerWithAddress, signer1: SignerWithAddress, signer2: SignerWithAddress, signer3: SignerWithAddress, signer4: SignerWithAddress;
  // let provider = ethers.provider;
  
  beforeEach(async () => {
    // Deploy the contract and get the signers
    [owner, signer1, signer2, signer3, signer4] = await ethers.getSigners();
 
    asset = await deployAsset(owner);
    assAddr = await asset.getAddress();
    vault = await deployVault(signer1, assAddr);
    vaultAddr = await vault.getAddress();
    vApi = await deployVaultAPI(signer1, assAddr, vaultAddr);
    vApiAddr = await vApi.getAddress();
    resContr = await deployResultContr(owner, "Copa Libertadores");
    resContrAddr = await resContr.getAddress();
    pool = await deployPool(signer1, assAddr, resContrAddr, vApiAddr);
    poolAddr = await pool.getAddress();

    // expect(await asset.balanceOf(owner)).to.eq(1e6);
    await asset.mint(owner, 1e6);
    await asset.mint(signer1, 1e4);
    await asset.mint(signer2, 1e4);
    await asset.mint(signer3, 1e4);
    await asset.mint(signer4, 1e4);
    await asset.connect(owner).approve(poolAddr, ethers.MaxUint256);
    await asset.connect(signer1).approve(poolAddr, ethers.MaxUint256);
    await asset.connect(signer2).approve(poolAddr, ethers.MaxUint256);
    await asset.connect(signer3).approve(poolAddr, ethers.MaxUint256);
    await asset.connect(signer4).approve(poolAddr, ethers.MaxUint256);
    
    // console.log(
    //   'asset:', assAddr,
    //   '\nvault:', vaultAddr,
    //   '\nvaultAPI:', vApiAddr,
    //   '\nres-controller:', resContrAddr,
    //   '\npool:', poolAddr
    // );

    const outcomes = makeOutcomes();
    await resContr.setOutcomes(outcomes); 
  });

  it("Should stake correctly", async function () {
    await pool.connect(signer1).stake(1, 100);
    expect(await pool.totalStakes()).to.equal(100);
    expect(await pool.getStake(signer1.address, 1)).to.equal(100);
  });

  // it("Should not allow staking when pool is closed", async function () {
  //   // TODO: Close the pool
  //   await expect(pool.connect(signer1).stake(1, ethers.parseEther("1"))).to.be.revertedWith("Pool already closed");
  // });

  it("Should sponsor correctly", async function () {
    await pool.connect(signer1).sponsor(1e4);
    expect(await pool.totalStakes()).to.equal(1e4);
    expect(await pool.getStake(signer1.address, 0)).to.equal(1e4);
    expect(await asset.balanceOf(vaultAddr)).to.eq(1e4);
  });

  it("Should unStake correctly", async function () {
    await pool.connect(signer1).stake(1, 100);
    await pool.connect(signer1).unStake(1, 50);
    expect(await pool.getStake(signer1.address, 1)).to.equal(50);
    expect(await pool.totalStakes()).to.equal(50);
  });

  it("Should not allow unstaking more than staked amount", async function () {
    await pool.connect(signer1).stake(1, 100);
    await expect(pool.connect(signer1).unStake(1, 200)).to.be.revertedWith("Not enough stake, adjust amount.");
  });

  // // it("Should close pool correctly", async function () {
  // //   // TODO: Set the resultController to the owner for testing
  // //   await pool.closePool(1);
  // //   expect(await pool.hasResult()).to.equal(true);
  // // });

  // // it("Should not allow non-resultController to close pool", async function () {
  // //   await expect(pool.connect(signer1).closePool(1)).to.be.revertedWith("You can't close the Pool.");
  // // });

  it("Should withdraw correctly for the winner/loser", async function () {
    await pool.connect(owner).sponsor(1e6);
    await pool.connect(signer1).stake(1, 1e4);
    await pool.connect(signer2).stake(2, 1e4);
    await pool.connect(signer3).stake(3, 1e4);
    await pool.connect(signer4).stake(4, 1e4);
    const tvl = await vApi.totalAssets();
    /**tvl = 1,040,000 */
    console.log('\ntvl:', tvl.toString());
    expect(tvl).to.eq(1e6+1e4*4);
    await vault.generateYield(300);
    /**yield = 1,040,000 * .03 = 31,200 */
    const yield_ = await pool.getYield();
    console.log('\nyield:', yield_);
    const tvl_ = await vApi.totalAssets();
    /**tvl = 1,071,200 */
    console.log('\ntvl:', tvl_)
    expect(tvl_).to.eq(tvl + yield_);
    await resContr.connect(owner).generateResult(4);

    expect(await asset.balanceOf(owner.address)).to.eq(0);
    expect(await asset.balanceOf(signer1.address)).to.eq(0);
    expect(await asset.balanceOf(signer2.address)).to.eq(0);
    expect(await asset.balanceOf(signer3.address)).to.eq(0);
    expect(await asset.balanceOf(signer4.address)).to.eq(0);
    /**sponsor -> bal = 1e6 */
    await pool.connect(owner).withdraw(0);
    expect(await asset.balanceOf(owner.address)).to.eq(1e6);
    /**losers -> bal = 1e4 */
    await pool.connect(signer1).withdraw(1);
    expect(await asset.balanceOf(signer1.address)).to.eq(1e4);
    await pool.connect(signer2).withdraw(2);
    expect(await asset.balanceOf(signer2.address)).to.eq(1e4);
    await pool.connect(signer3).withdraw(3);
    expect(await asset.balanceOf(signer3.address)).to.eq(1e4);
    /**winner -> bal = (1 + 3.12) * 1e4 = 41,200 */
    await pool.connect(signer4).withdraw(4);
    expect(await asset.balanceOf(signer4.address)).to.eq(41200);
  });

  it("Should not allow withdrawing when pool is open", async function () {
    await expect(pool.connect(signer1).withdraw(1)).to.be.revertedWith("Pool is still open! Use unStake()");
  });
});