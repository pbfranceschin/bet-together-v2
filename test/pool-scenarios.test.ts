import { expect } from "chai";
import { ethers } from "hardhat";
import { Pool, SampleAsset, SampleVault, SampleVaultAPI, SampleController } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { makeOutcomes, deployAsset, deployPool, deployResultContr, deployVault, deployVaultAPI } from "./test-utils";

describe("Pool scenarios test", function () {
    let pool: Pool, vApi: SampleVaultAPI, resContr: SampleController , asset:SampleAsset, vault:SampleVault;
    let assAddr: string, vaultAddr: string, vApiAddr: string, resContrAddr:string, poolAddr:string;
    let signers: SignerWithAddress[];
    // let provider = ethers.provider;
    
    const printParams = async(player: number, account: string, pick:number) => {
        console.log('========================')
        const yield_ = await pool.getYield() + await pool.yieldWithdrawn();
        console.log('closing Yield:', yield_);
        const supp = await vApi.totalSupply();
        console.log('total supply:', supp);
        const totAss = await vApi.totalAssets();
        console.log('total assets:', totAss);
        console.log('exchange rate:', supp/totAss);
        console.log('total stake:', await pool.totalStakes());
        console.log(`\n==PLAYER ${player}==`)
        let shares = await pool.getShares(account, pick);
        // console.log('shares:', shares);
        let sh2ass = await vApi.convertToAssets(shares);
        console.log('shares to assets:', sh2ass);
        let indyield = sh2ass - (await pool.getStake(account, pick));
        console.log('ind yield:', indyield);
        let outcomeSh = await pool.getSharesByOutcome(pick);
        let outComYield = (await vApi.convertToAssets(outcomeSh)) - (await pool.getStakeByOutcome(pick));
        console.log('outcome yield:',outComYield);
        let prize = outComYield > 0 ? (indyield * yield_) / outComYield : 0;
        console.log('prize:', prize)
        console.log('stake:', await pool.getStake(account, pick));
        return prize;
    }
    
    
    beforeEach(async () => {
      // Deploy the contract and get the signers
      signers = await ethers.getSigners();
   
      asset = await deployAsset(signers[0]);
      assAddr = await asset.getAddress();
      vault = await deployVault(signers[1], assAddr);
      vaultAddr = await vault.getAddress();
      vApi = await deployVaultAPI(signers[1], assAddr, vaultAddr);
      vApiAddr = await vApi.getAddress();
      resContr = await deployResultContr(signers[0], "Copa Libertadores");
      resContrAddr = await resContr.getAddress();
      pool = await deployPool(signers[1], assAddr, resContrAddr, vApiAddr);
      poolAddr = await pool.getAddress();
  
      await asset.mint(signers[0], 1e10);
      await asset.mint(signers[1], 1e10);
      await asset.mint(signers[2], 1e10);
      await asset.mint(signers[3], 1e10);
      await asset.mint(signers[4], 1e10);
      await asset.connect(signers[0]).approve(poolAddr, ethers.MaxUint256);
      await asset.connect(signers[1]).approve(poolAddr, ethers.MaxUint256);
      await asset.connect(signers[2]).approve(poolAddr, ethers.MaxUint256);
      await asset.connect(signers[3]).approve(poolAddr, ethers.MaxUint256);
      await asset.connect(signers[4]).approve(poolAddr, ethers.MaxUint256);
    
      const outcomes = makeOutcomes();
      await resContr.setOutcomes(outcomes); 
    });

    it("#1: equal split / 2 winners", async function () {
      await pool.connect(signers[0]).sponsor(1e10);
      await pool.connect(signers[1]).stake(1, 1e10);
      await pool.connect(signers[2]).stake(2, 1e10);
      await pool.connect(signers[3]).stake(4, 1e10);
      await pool.connect(signers[4]).stake(4, 1e10);
      const tvl = await vApi.totalAssets();
      /**tvl = 50,000,000,000 */
      console.log('\ntvl:', tvl.toString());
      expect(tvl).to.eq(5e10);
    //   const sh = await pool.getShares(signers[1].address, 1);
    //   console.log('SH2ASS:', await vApi.convertToAssets(sh));

      await vault.generateYield(300);
      /**yield = 5e10 * .03 = 1,5e9 */
      const yield_ = await pool.getYield();
      console.log('\nyield:', yield_);
      const tvl_ = await vApi.totalAssets();
      /**tvl = 5,15e10 = 51,500,000,000 */
      console.log('\ntvl:', tvl_)
      expect(tvl_).to.eq(tvl + yield_);
      await resContr.connect(signers[0]).generateResult(4);
      expect(await asset.balanceOf(signers[0].address)).to.eq(0);
      expect(await asset.balanceOf(signers[1].address)).to.eq(0);
      expect(await asset.balanceOf(signers[2].address)).to.eq(0);
      expect(await asset.balanceOf(signers[3].address)).to.eq(0);
      expect(await asset.balanceOf(signers[4].address)).to.eq(0);
    //   
      /**prize/player = 7,5e8 = 750,000,000 */
      await printParams(3, signers[3].address, 4);
      await pool.connect(signers[3]).withdraw(signers[3].address, 4);
      expect(await asset.balanceOf(signers[3].address)).to.eq(1e10+750000000);
    //   
    //   await pool.connect(signers[4]).withdraw(signers[4].address, 4);
    //   expect(await asset.balanceOf(signers[4].address)).to.eq(25600);
    });
    it('#2: equal split / 20 winners', async() => {
    //   console.log('signers #:', signers.length)
    //   $10,000
      for(let i=5; i<signers.length; i++) {
        await asset.mint(signers[i].address, 1e10);
        await asset.connect(signers[i]).approve(poolAddr, ethers.MaxUint256);
      }
      await pool.connect(signers[0]).sponsor(1e10);
      await asset.mint(signers[0].address, 1e10);
      for(let i=0; i<signers.length; i++) {
        await pool.connect(signers[i]).stake(1, 1e10);
      }
      await vault.generateYield(300);
      await resContr.connect(signers[0]).generateResult(1);
    //   let prizes: BigInt[] = [];
      let bal: bigint;
      for(let i=0; i<signers.length; i++) {
        // const prize = await printParams(i, signers[i].address, 1);
        // prizes.push(prize);
        await pool.connect(signers[i]).withdraw(signers[i].address, 1);
        bal = await asset.balanceOf(signers[i].address)
        console.log(`balance of player ${i}: ${bal}`);
      }
    //   console.log('1st prize:', prizes[0]);
    //   console.log('20th prize:', prizes[19]);

    });
    it('#3: equal stake different split: yield in between', async() => {
      const players = signers.length;
      for(let i=5; i<players; i++) {
        await asset.mint(signers[i].address, 1e10);
        await asset.connect(signers[i]).approve(poolAddr, ethers.MaxUint256);
      }
      await pool.connect(signers[0]).sponsor(1e10);
      await asset.mint(signers[0].address, 1e10);
      for(let i=0; i<players/2; i++) {
        await pool.connect(signers[i]).stake(1, 1e10);
      }
      await vault.generateYield(90);
      for(let i=players/2; i<players; i++) {
        await pool.connect(signers[i]).stake(1, 1e10);
      }
      await vault.generateYield(90);
      await resContr.connect(signers[0]).generateResult(1);
      await printParams(0, signers[0].address, 1 );
      await printParams(19, signers[19].address, 1 );
      let bal: bigint;
      for(let i=0; i<signers.length; i++) {
        await pool.connect(signers[i]).withdraw(signers[i].address, 1);
        bal = await asset.balanceOf(signers[i].address)
        console.log(`balance of player ${i}: ${bal}`);
      }
    });
    it('#4: leave stake in the pool after closing', async() => {
      const players = signers.length;
      for(let i=5; i<players; i++) {
        await asset.mint(signers[i].address, 1e10);
        await asset.connect(signers[i]).approve(poolAddr, ethers.MaxUint256);
      }
      await pool.connect(signers[0]).sponsor(1e10);
      await asset.mint(signers[0].address, 1e10);
      for(let i=0; i<players-3; i++) {
        await pool.connect(signers[i]).stake(i+1, 1e10);
      }
      await pool.connect(signers[17]).stake(19, 1e10);
      await pool.connect(signers[18]).stake(19, 1e10);
      await pool.connect(signers[19]).stake(19, 1e10);
      await vault.generateYield(200);
      await resContr.connect(signers[0]).generateResult(19);
      await printParams(0, signers[0].address, 1 );
      await printParams(19, signers[19].address, 1 );
      let bal: bigint;
      console.log('========LOSERS=========')
      for(let i=0; i<players-3; i++) {
        await pool.connect(signers[i]).withdraw(signers[i].address, i+1);
        bal = await asset.balanceOf(signers[i].address)
        console.log(`balance of player ${i}: ${bal}`);
      }
      console.log('\n========WINNERS=========')
      await pool.connect(signers[17]).withdraw(signers[17].address, 19);
      bal = await asset.balanceOf(signers[17].address);
      console.log(`balance of player 17: ${bal}`);
      await pool.connect(signers[18]).withdraw(signers[18].address, 19);
      bal = await asset.balanceOf(signers[18].address);
      console.log(`balance of player 18: ${bal}`);
      console.log('\nmore yield...');
      await vault.generateYield(200);
      await pool.connect(signers[19]).withdraw(signers[19].address, 19);
      bal = await asset.balanceOf(signers[19].address);
      console.log(`balance of player 19: ${bal}`);
      await pool.connect(signers[0]).withdraw(signers[0].address, 0);
      bal = await asset.balanceOf(poolAddr);
      console.log(`pool balance: ${bal}`);
    });
    it("#5: yield-leach attack", async() => {
      const players = signers.length;
      for(let i=5; i<players; i++) {
        await asset.mint(signers[i].address, 1e10);
        await asset.connect(signers[i]).approve(poolAddr, ethers.MaxUint256);
      }
      await pool.connect(signers[0]).sponsor(1e10);
    //   console.log(
    //     'sponsorship:', await pool.getStake(signers[0].address,0), 
    //     '\npool bal:', await asset.balanceOf(vaultAddr)
    //   )
      await asset.mint(signers[0].address, 1e10);
      for(let i=0; i<players-3; i++) {
        await pool.connect(signers[i]).stake(i+1, 1e10);
      }
      await pool.connect(signers[17]).stake(19, 1e10);
      await pool.connect(signers[18]).stake(19, 1e10);
      await vault.generateYield(300);
      await pool.connect(signers[19]).stake(19, 1e10);
      await resContr.connect(signers[0]).generateResult(19);
    //   await printParams(0, signers[0].address, 1 );
    //   await printParams(19, signers[19].address, 1 );
      let bal: bigint;
      console.log('\n========WINNERS=========')
      await pool.connect(signers[17]).withdraw(signers[17].address, 19);
      bal = await asset.balanceOf(signers[17].address);
      console.log(`balance of player 17: ${bal}`);
      await pool.connect(signers[18]).withdraw(signers[18].address, 19);
      bal = await asset.balanceOf(signers[18].address);
      console.log(`balance of player 18: ${bal}`);
      console.log('\n===LEACH===');
    //   await printParams(19, signers[19].address, 19);
    //   return   
      await pool.connect(signers[19]).withdraw(signers[19].address, 19);
      bal = await asset.balanceOf(signers[19].address);
      console.log(`balance of player 19: ${bal}`);     
      console.log('========LOSERS=========')
      for(let i=0; i<players-3; i++) {
        await pool.connect(signers[i]).withdraw(signers[i].address, i+1);
        bal = await asset.balanceOf(signers[i].address)
        console.log(`balance of player ${i}: ${bal}`);
      }
      console.log('sponsorship:', await pool.getStake(signers[0].address,0));
      console.log('pool balance:', await asset.balanceOf(vaultAddr));
      await pool.connect(signers[0]).withdraw(signers[0].address, 0);   
    });
    it("#6: lower tvl", async() => {
        //   const players = signers.length;
          for (let i=5; i<9; i++) {
            await asset.mint(signers[i], 25);
            await asset.connect(signers[i]).approve(poolAddr, ethers.MaxUint256);
          }
          await pool.connect(signers[5]).stake(5, 25);
          await pool.connect(signers[6]).stake(6, 25);
          await pool.connect(signers[7]).stake(8, 25);
          await pool.connect(signers[8]).stake(8, 25);
          const tvl = await vApi.totalAssets();
          /**tvl = 100*/
          console.log('\ntvl:', tvl.toString());
          expect(tvl).to.eq(100);
          const sh = await pool.getShares(signers[5].address, 5);
          console.log('SH2ASS:', await vApi.convertToAssets(sh));
    
          await vault.generateYield(300);
          /**yield = 100 * .03 = 3 */
          const yield_ = await pool.getYield();
          console.log('\nyield:', yield_);
          const tvl_ = await vApi.totalAssets();
          /**tvl = 103 */
          console.log('\ntvl:', tvl_)
          expect(tvl_).to.eq(tvl + yield_);
          await resContr.connect(signers[0]).generateResult(8);
          for(let i=5; i<9; i++) {
            expect(await asset.balanceOf(signers[i].address)).to.eq(0);
          }
        //   
          /**prize/player = 0 */
          for(let i=5; i<7; i++) {
            // await printParams(i, signers[i].address, i);
            await pool.connect(signers[i]).withdraw(signers[i].address, i);
            expect(await asset.balanceOf(signers[i].address)).to.eq(25);
          }
          await printParams(7, signers[7].address, 8);
        //   await pool.connect(signers[7]).withdraw(signers[7].address, 7);
        //   console.log('7 bal:', await asset.balanceOf(signers[7].address))
          
        //
    });
    it("#7: low tvl", async() => {
    //   const players = signers.length;
      for (let i=5; i<9; i++) {
        await asset.mint(signers[i], 225);
        await asset.connect(signers[i]).approve(poolAddr, ethers.MaxUint256);
      }
      await pool.connect(signers[5]).stake(5, 225);
      await pool.connect(signers[6]).stake(6, 225);
      await pool.connect(signers[7]).stake(8, 225);
      await pool.connect(signers[8]).stake(8, 225);
      const tvl = await vApi.totalAssets();
      /**tvl = 900*/
      console.log('\ntvl:', tvl.toString());
      expect(tvl).to.eq(900);
      const sh = await pool.getShares(signers[5].address, 5);
      console.log('SH2ASS:', await vApi.convertToAssets(sh));

      await vault.generateYield(100);
      /**yield = 900 * .01 = 9 */
      const yield_ = await pool.getYield();
      console.log('\nyield:', yield_);
      const tvl_ = await vApi.totalAssets();
      /**tvl = 909 */
      console.log('\ntvl:', tvl_)
      expect(tvl_).to.eq(tvl + yield_);
      await resContr.connect(signers[0]).generateResult(8);
      for(let i=5; i<9; i++) {
        expect(await asset.balanceOf(signers[i].address)).to.eq(0);
      }
    //   
      /**prize/player = 0 */
      for(let i=5; i<7; i++) {
        // await printParams(i, signers[i].address, i);
        await pool.connect(signers[i]).withdraw(signers[i].address, i);
        expect(await asset.balanceOf(signers[i].address)).to.eq(225);
      }
      await printParams(7, signers[7].address, 8);
      await pool.connect(signers[7]).withdraw(signers[7].address, 8);
      console.log("7 bal:", await asset.balanceOf(signers[7].address));
      await pool.connect(signers[8]).withdraw(signers[8].address, 8);
      console.log("8 bal:", await asset.balanceOf(signers[8].address));
      console.log('pool bal:', await asset.balanceOf(vaultAddr))
    //
    });
    it('#8: high tvl', async() => {
      const players = signers.length;
      for(let i=5; i<players; i++) {
        await asset.mint(signers[i].address, BigInt(1e27));
        await asset.connect(signers[i]).approve(poolAddr, ethers.MaxUint256);
      }
      for(let i=0; i<5; i++) {
        await asset.mint(signers[i].address, BigInt(1e27-1e10));
      }
      for(let i=0; i<players-5; i++) {
        await pool.connect(signers[i]).stake(i, BigInt(1e27));
      }
      await pool.connect(signers[15]).stake(19, BigInt(1e27));
      await pool.connect(signers[16]).stake(19, BigInt(1e27));
      await pool.connect(signers[17]).stake(19, BigInt(1e27));
      await pool.connect(signers[18]).stake(19, BigInt(1e27));
      await pool.connect(signers[19]).stake(19, BigInt(1e27));
      /**tvl = 2e51 */
      const tvl = await asset.balanceOf(vaultAddr);
      console.log('tvl-0:',tvl);
      /**yield = 6e49 */
      await vault.generateYield(300);
      console.log('yield', await pool.getYield());
      console.log('tvl-1:', await asset.balanceOf(vaultAddr));
      await resContr.connect(signers[0]).generateResult(19);
    //   let prizes: BigInt[] = [];
      let bal: bigint;
    //   19
      await printParams(19, signers[19].address, 19);
      await pool.withdraw(signers[19].address, 19);
      const bal19 = await asset.balanceOf(signers[19].address)
      console.log('19 bal', bal19);
    //   18
      await printParams(18, signers[18].address, 19);
      await pool.withdraw(signers[18].address, 19);
      console.log('18 bal', await asset.balanceOf(signers[18].address));
      console.log('\n======LOSERS======')
      for(let i=0; i<players-5; i++) {
        // const prize = await printParams(i, signers[i].address, 1);
        // prizes.push(prize);
        await pool.connect(signers[i]).withdraw(signers[i].address, i);
        bal = await asset.balanceOf(signers[i].address)
        console.log(`balance of player ${i}: ${bal}`);
      }
    //   17
      await printParams(17, signers[17].address, 19);
      await pool.withdraw(signers[17].address, 19);
      console.log('17 bal', await asset.balanceOf(signers[17].address));
    //   16
      await printParams(16, signers[16].address, 19);
      await pool.withdraw(signers[16].address, 19);
      console.log('16 bal', await asset.balanceOf(signers[16].address));
    // 15
      await printParams(15, signers[15].address, 19);
      await pool.withdraw(signers[15].address, 19);
      const bal15 = await asset.balanceOf(signers[15].address);
      console.log('15 bal', bal15);
      
      console.log('\ndiff:', bal19 - bal15)
    //   console.log('1st prize:', prizes[0]);
    //   console.log('20th prize:', prizes[19]);
    });
});