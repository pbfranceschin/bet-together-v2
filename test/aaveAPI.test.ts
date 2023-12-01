import { expect } from "chai";
import { ethers } from "hardhat";
import { Pool, MockAsset, MockAavePool, AaveAPI, MockController, MockAToken, MockAavePoolAddressesProvider } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { makeOutcomes, deployAsset, deployPool, deployResultContr, deployMockAavePool, deployAaveAPI, deployMockAToken, deployMockAavePoolAddressProvider } from "./test-utils";

describe.skip("Pool scenarios test w/ AaveAPI", function () {
    let pool: Pool, vApi: AaveAPI, resContr: MockController , asset:MockAsset, vault:MockAavePool, aToken: MockAToken, aaveAddressProvider: MockAavePoolAddressesProvider;
    let assAddr: string, vaultAddr: string, vApiAddr: string, resContrAddr:string, poolAddr:string, aTokenAddr: string;
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
      aToken = await deployMockAToken(signers[0], assAddr);
      aTokenAddr = await aToken.getAddress();
      vault = await deployMockAavePool(signers[0], aToken, asset);
      vaultAddr = await vault.getAddress();
      aaveAddressProvider = await deployMockAavePoolAddressProvider(signers[0], vaultAddr);
      vApi = await deployAaveAPI(signers[1], assAddr, await aaveAddressProvider.getAddress(), BigInt(1e6));
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

    it.skip("#1: equal split / 2 winners", async function () {
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

      await vault.simulateYield(vApiAddr, 300);
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
    //   await printParams(3, signers[3].address, 4);
      await pool.connect(signers[3]).withdraw(4);
      expect(await asset.balanceOf(signers[3].address)).to.eq(1e10+750000000);
    //   
    //   await printParams(4, signers[4].address, 4);
      await pool.connect(signers[4]).withdraw(4);
      expect(await asset.balanceOf(signers[4].address)).to.eq(1e10+750000000);
    //   
      await pool.connect(signers[0]).withdraw(0);
      expect(await asset.balanceOf(signers[0].address)).to.eq(1e10);
      await pool.connect(signers[1]).withdraw(1);
      expect(await asset.balanceOf(signers[1].address)).to.eq(1e10);
      await pool.connect(signers[2]).withdraw(2);
      expect(await asset.balanceOf(signers[2].address)).to.eq(1e10);
    });
    it.skip('#2: equal split / 20 winners', async() => {
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
      /**tvl = 21e10 = 210,000,000,000 */
      console.log('tvl:', await vApi.totalAssets());
      /**yield = 21 * .03 * 1e10 = 6.3e9 = 6,300.000,000  */
      await vault.simulateYield(vApi, 300);
      const yield_ = await pool.getYield();
      console.log('\nyield:' , yield_);
      /**tvl = 216,300,000,000 */
      console.log('tvl:', await vApi.totalAssets(), '\n');
      await resContr.connect(signers[0]).generateResult(1);
    //   let prizes: BigInt[] = [];
      let bal: bigint;
    /**prize = yield / 20 = 315,000,000
     * final bal: 1e10 + prize = 10,315,000,000
     * signer[0]: final bal + 1e10 = 20,315,000,000
     */
      for(let i=0; i<signers.length; i++) {
        // const prize = await printParams(i, signers[i].address, 1);
        // prizes.push(prize);
        await pool.connect(signers[i]).withdraw(1);
        bal = await asset.balanceOf(signers[i].address);
        expect(bal).to.eq(BigInt(1e10)+(yield_/BigInt(20)))
        console.log(`balance of player ${i}: ${bal}`);
      }
    //   console.log('1st prize:', prizes[0]);
    //   console.log('20th prize:', prizes[19]);
      await pool.connect(signers[0]).withdraw(0);
      bal = await asset.balanceOf(signers[0].address);
      expect(bal).to.eq(BigInt(2e10)+yield_/BigInt(20));
    });
    it.skip('#3: equal stake different split: yield in between', async() => {
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
      /**tvl = 11e10 = 110,000,000,000 */
      console.log('tvl:', await vApi.totalAssets());
      /**yield = 11 * .009 *1e10 = .099 * 1e10 = 990,000,000 */
      await vault.simulateYield(vApiAddr, 90);
      const yield_1 = await pool.getYield();
      console.log('\nyield:', yield_1);
      /**tvl = 110,990,000,000 */
      console.log("tvl':", await vApi.totalAssets());
      for(let i=players/2; i<players; i++) {
        await pool.connect(signers[i]).stake(1, 1e10);
      }
      /**tvl = (1.1099 + 1)* 1e11 = 2.1099*1e11 = 210,990,000,000*/
      console.log('tvl 2nd round:', await vApi.totalAssets());
      await vault.simulateYield(vApiAddr, 90);
      /**yield =  2.1099 * .009 = 1.89891 * 1e9 = 1,898,910,000*/
      /**total yield = (1.89891 + .99) * 1e9 = 2,888,910,000 */
      const yield_2 = await pool.getYield();
      console.log('total yield 2nd round', yield_2);
      console.log('yield 2nd round:', yield_2 - yield_1);
      /**tvl = 212,888,910,000 */
      console.log('tvl:', await vApi.totalAssets());
      await resContr.connect(signers[0]).generateResult(1);
    //   await printParams(0, signers[0].address, 1 );
    //   await printParams(19, signers[19].address, 1 );
      let bal: bigint;
      /**1st round stakers:
       *    prize = (990,000,000)/10 + (1,898,910,000)/20 = 99e6 + 94,945,500 = 193,945,500
       *    final bal = 10,193,945,500
       * 2nd round stakers:
       *    prize = 94,945,500
       *    final bal = 10,094,945,500
       */
      const _2ndPrize = (yield_2-yield_1)/BigInt(20);
      const _1stPrize = (yield_1/BigInt(10)) + _2ndPrize
      console.log('1st prize:', _1stPrize);
      console.log('2nd prize', _2ndPrize);
      for(let i=0; i<players/2; i++) {
        await pool.connect(signers[i]).withdraw(1);
        bal = await asset.balanceOf(signers[i].address);
        // expect(bal).to.eq(BigInt(1e10)+_1stPrize)
        console.log(`balance of player ${i}: ${bal}`);
      }
      for(let i=players/2; i<players; i++) {
        await pool.connect(signers[i]).withdraw(1);
        bal = await asset.balanceOf(signers[i].address);
        // expect(bal).to.eq(BigInt(1e10)+_2ndPrize)
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
      /**tvl = 21e10 */
      await vault.simulateYield(vApiAddr, 200);
      /**yield = .42*1e10 = 4,200,000,000 */
      const yield_ = await pool.getYield();
      console.log('yield:', yield_);
      await resContr.connect(signers[0]).generateResult(19);
    //   await printParams(0, signers[0].address, 1 );
    //   await printParams(19, signers[19].address, 1 );
      let bal: bigint;
    //   console.log('========LOSERS=========')
      for(let i=0; i<players-3; i++) {
        await pool.connect(signers[i]).withdraw(i+1);
        bal = await asset.balanceOf(signers[i].address);
        expect(bal).to.eq(1e10);
        // console.log(`balance of player ${i}: ${bal}`);
      }
    //   console.log('\n========WINNERS=========');
      const prize = yield_/BigInt(3);
      /**prize = 1,400,000,000 */
      console.log('prize:', prize);
      await pool.connect(signers[17]).withdraw(19);
      bal = await asset.balanceOf(signers[17].address);
      expect(bal).to.eq(BigInt(1e10)+prize);
    //   console.log(`balance of player 17: ${bal}`);
      await pool.connect(signers[18]).withdraw(19);
      bal = await asset.balanceOf(signers[18].address);
      expect(bal).to.eq(BigInt(1e10)+prize);
    //   console.log(`balance of player 18: ${bal}`);
      /**tvl = 2e10 +  prize = 21,400,000,000 */
      const TVL = await vApi.totalAssets();
      console.log('\ntvl:', TVL);
      console.log('\nmore yield...');
      /**
       * late_yield = (2e10 + prize)*2/100 = 428,000,000
      */
      const late_yield = (BigInt(2e10) + prize)*BigInt(2)/BigInt(100);
      console.log('\nlate yield:', late_yield);
      await vault.simulateYield(vApiAddr, 200);
      const getYield = await pool.getYield();
      console.log('yield from getter:', getYield);
      console.log('diff:', getYield - late_yield);
      /**player 0 */
      await pool.connect(signers[0]).withdraw(0);
      bal = await asset.balanceOf(signers[0].address);
      expect(bal).to.eq(BigInt(2e10));
      /**19bal = 1e10 + prize + late_yield 
       *       = (1 + .14 + .0428) * 1e10 = 11,828,000,000
      */
      const late_TVL = await vApi.totalAssets();
      console.log('\nlate tvl:', late_TVL);
      console.log('expected 19bal:',BigInt(1e10)+prize+late_yield)
      await pool.connect(signers[19]).withdraw(19);
      bal = await asset.balanceOf(signers[19].address);
      console.log('actual', bal);
      console.log('diff:', BigInt(1e10)+prize+late_yield-bal);
      console.log('after withdrawal:', late_TVL - bal);
    //   expect(bal).to.eq(BigInt(1e10)+prize+late_yield);
      console.log(`balance of player 19: ${bal}`);
      bal = await vApi.totalAssets();
      console.log(`pool balance: ${bal}`);
    });
    it.skip("#5: yield-leach attack", async() => {
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
      await pool.connect(signers[17]).withdraw(19);
      bal = await asset.balanceOf(signers[17].address);
      console.log(`balance of player 17: ${bal}`);
      await pool.connect(signers[18]).withdraw(19);
      bal = await asset.balanceOf(signers[18].address);
      console.log(`balance of player 18: ${bal}`);
      console.log('\n===LEACH===');
    //   await printParams(19, signers[19].address, 19);
    //   return   
      await pool.connect(signers[19]).withdraw(19);
      bal = await asset.balanceOf(signers[19].address);
      console.log(`balance of player 19: ${bal}`);     
      console.log('========LOSERS=========')
      for(let i=0; i<players-3; i++) {
        await pool.connect(signers[i]).withdraw(i+1);
        bal = await asset.balanceOf(signers[i].address)
        console.log(`balance of player ${i}: ${bal}`);
      }
      console.log('sponsorship:', await pool.getStake(signers[0].address,0));
      console.log('pool balance:', await asset.balanceOf(vaultAddr));
      await pool.connect(signers[0]).withdraw(0);   
    });
    it.skip("#6: lower tvl", async() => {
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
            await pool.connect(signers[i]).withdraw(i);
            expect(await asset.balanceOf(signers[i].address)).to.eq(25);
          }
          await printParams(7, signers[7].address, 8);
        //   await pool.connect(signers[7]).withdraw(signers[7].address, 7);
        //   console.log('7 bal:', await asset.balanceOf(signers[7].address))
          
        //
    });
    it.skip("#7: low tvl", async() => {
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
        await pool.connect(signers[i]).withdraw(i);
        expect(await asset.balanceOf(signers[i].address)).to.eq(225);
      }
      await printParams(7, signers[7].address, 8);
      await pool.connect(signers[7]).withdraw(8);
      console.log("7 bal:", await asset.balanceOf(signers[7].address));
      await pool.connect(signers[8]).withdraw(8);
      console.log("8 bal:", await asset.balanceOf(signers[8].address));
      console.log('pool bal:', await asset.balanceOf(vaultAddr))
    //
    });
    it.skip('#8: high tvl', async() => {
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
      await pool.connect(signers[19]).withdraw(19);
      const bal19 = await asset.balanceOf(signers[19].address)
      console.log('19 bal', bal19);
    //   18
      await printParams(18, signers[18].address, 19);
      await pool.connect(signers[18]).withdraw(19);
      console.log('18 bal', await asset.balanceOf(signers[18].address));
      console.log('\n======LOSERS======')
      for(let i=0; i<players-5; i++) {
        // const prize = await printParams(i, signers[i].address, 1);
        // prizes.push(prize);
        await pool.connect(signers[i]).withdraw(i);
        bal = await asset.balanceOf(signers[i].address)
        console.log(`balance of player ${i}: ${bal}`);
      }
    //   17
      await printParams(17, signers[17].address, 19);
      await pool.connect(signers[17]).withdraw(19);
      console.log('17 bal', await asset.balanceOf(signers[17].address));
    //   16
      await printParams(16, signers[16].address, 19);
      await pool.connect(signers[16]).withdraw(19);
      console.log('16 bal', await asset.balanceOf(signers[16].address));
    // 15
      await printParams(15, signers[15].address, 19);
      await pool.connect(signers[15]).withdraw(19);
      const bal15 = await asset.balanceOf(signers[15].address);
      console.log('15 bal', bal15);
      
      console.log('\ndiff:', bal19 - bal15)
    //   console.log('1st prize:', prizes[0]);
    //   console.log('20th prize:', prizes[19]);
    });
});