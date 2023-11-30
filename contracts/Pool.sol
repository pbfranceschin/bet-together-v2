// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IResultController.sol";
import "./interfaces/IERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Pool {

    /**token used in the vault */
    IERC20 public immutable asset;

    /**oracle API */
    IResultController public immutable resultController;

    /**vault API */
    IERC4626 public immutable vaultAPI;

    event Staked (address indexed staker, uint16 indexed outcome, uint256 amount);

    event UnStaked (address indexed staker, uint16 indexed outcome, uint256 amount);

    // event PoolClosed (uint16 outcome, uint256 totalStakes, uint256 totalYield);

    event Withdrawn (address indexed owner, uint16 outcome, uint256 stake, uint256 prize);

    mapping (address => mapping(uint16 => uint256)) private _stakes;

    mapping (address => mapping(uint16 => uint256)) private _shares;

    mapping (uint16 => uint256) private _sharesByOutcome;

    mapping(uint16 => uint256) private _stakeByOutcome;

    /**total amoutnt of assets staked in the pool */
    uint256 public totalStakes;
    /**total amount of yield currently withdrawn */
    uint256 public yieldWithdrawn;

    /**used in "close&redeem" format */
        /**total liquidity of the vault at the moment of closing */
        // uint256 public closingLiq;
        /**total supply of shares at the moment of closing */
        // uint256 public closingShareSupply;
        // bool public isOpen;
    /** */

    modifier OnlyIfOpen {
        require(!hasResult(), "Pool already closed");
        _;
    }

    constructor(
        address _assetToken,
        address _resultController,
        address _vaultAPI
    ) {
        asset = IERC20(_assetToken);
        resultController = IResultController(_resultController);
        vaultAPI = IERC4626(_vaultAPI);
        // isOpen = true;
        asset.approve(_vaultAPI, type(uint256).max);
    }

    function _safeSub(uint256 x, uint256 y) internal pure returns (uint256 r) {
        assembly{
            if or(lt(x,y), eq(x,y))  {
                r := 0
            }
            if gt(x,y) {
                r := sub(x,y)
            }
        }
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function _max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    /**
     * deposits `amount` in the vault on behalf of caller and assignes it to `outcome`.
     * @dev uses ERC4626 API to account for deposits. The contract retains all the shares and uses internal accounting logic.
     */
    function stake(uint16 outcome, uint256 amount) external OnlyIfOpen {
        require(amount <= maxDeposit(), "Amount too big.");
        require(asset.allowance(msg.sender, address(this)) >= amount, "Not enough allowance.");
        require(outcome < resultController.getOutcomesCount(), "Invalid pick");

        asset.transferFrom(msg.sender, address(this), amount);
        totalStakes += amount;
        _stakes[msg.sender][outcome] += amount;
        uint256 shares = vaultAPI.deposit(amount, address(this));
        _sharesByOutcome[outcome] += shares;
        _stakeByOutcome[outcome] += amount;
        _shares[msg.sender][outcome] += shares;

        emit Staked(msg.sender, outcome, amount);
    }

    /**
     * makes retrievable donation to the pool.
     * @notice exact amount can be withdrawn via unStake.
     */
    function sponsor(uint256 amount) external OnlyIfOpen {
        require(amount <= maxDeposit(), "Amount too big.");
        require(asset.allowance(msg.sender, address(this)) >= amount, "Not enough allowance.");

        asset.transferFrom(msg.sender, address(this), amount);
        totalStakes += amount;
        _stakes[msg.sender][0] += amount;
        uint256 shares = vaultAPI.deposit(amount, address(this));
        _sharesByOutcome[0] += shares;
        _stakeByOutcome[0] += amount;
        _shares[msg.sender][0] += amount;

        emit Staked(msg.sender, 0, amount);
    }

    /**
     * withdraws `amount` from the vault sends it to owner and deducts the corresponding value of shares/stake.
     * @notice can only withdraw stake and not yield.
     */
    function unStake(uint16 outcome, uint256 amount) external OnlyIfOpen /* put REENTRANCY GUARD */ { 
        require(amount <= _stakes[msg.sender][outcome], "Not enough stake, adjust amount.");
        require(amount <= maxWithdraw(msg.sender, outcome), "Amount too big.");

        _stakes[msg.sender][outcome] -= amount;
        totalStakes -= amount;
        uint256 shares = vaultAPI.withdraw(amount, msg.sender, address(this));
        _shares[msg.sender][outcome] -= shares;
        _sharesByOutcome[outcome] -= shares;
        _stakeByOutcome[outcome] -= amount;

        emit UnStaked(msg.sender, outcome, amount);
    }

    
    /**
     * metdodo close pool?
	 *   -retira todos os fundos do vault
	 *   -isOpen = false
	 *  -restrito a resultController
	 * PROBLEMA:
	 *	-é preciso capturar os valores agregados do vault no momento do fechamento e calcular a preço na pool pra distrubuir o premio
	 *	    -como o padrão é agnostico em relação a como as shares são precificadas, isso pode ser um problema pois poderia ter divergência
     *      -
     */
    
    /**
     * closes pool and withdraws all assets from vault
     */
    // function closePool(uint16 result) external {
    //     require(msg.sender == address(resultController), "You can't close the Pool.");
    //     /**logic used in "close&redeem" format */
    //         /*capturing pool aggregated values at moment of closing*/
    //         // closingLiq = vaultAPI.totalAssets();
    //         // closingShareSupply = vaultAPI.totalSupply();
    //         // 
    //         // vaultAPI.redeem(vaultAPI.totalSupply(), address(this), address(this));
    //     // isOpen = false;
    //     emit PoolClosed(result, totalStakes, getYield());
    // }

    /**
     * pulls balance from the pool after closing.
     * @notice needs to be called for each outcome picked.
     */
    function withdraw(uint16 outcome) external {
        require(hasResult(), "Pool is still open! Use unStake()");
        uint256 shares = _shares[msg.sender][outcome];
        require(shares != 0, "Nothing to withdraw. Adjust outcome.");
        uint256 stake_ = _stakes[msg.sender][outcome];
        if(outcome == resultController.getResult()){ /**includes prize */
            uint256 prize = previewPrize(outcome, shares, stake_);
            _shares[msg.sender][outcome] = 0;
            totalStakes -= stake_;
            vaultAPI.withdraw(prize + stake_, msg.sender, address(this));
            yieldWithdrawn += prize;
            emit Withdrawn(msg.sender, outcome, prize, stake_);
            return;
        }
        _shares[msg.sender][outcome] = 0;
        totalStakes -= stake_;
        uint256 totAss = vaultAPI.totalAssets();
        vaultAPI.withdraw(stake_ < totAss ? stake_ : totAss, msg.sender, address(this));
        emit Withdrawn(msg.sender, outcome, 0, stake_);
    }

    /**GETTERS */

    /**
     * @notice returns the value of the current prize if the oucome provided was the end result.
     * @param outcome the outcome predicted to be the end result.
     * @param shares number of shares related to `outcome`.
     * @param stake_ amount staked in `outcome`.
     */
    function previewPrize(uint16 outcome, uint256 shares, uint256 stake_) public view returns(uint256) {
        uint256 totalYield = getYield() + yieldWithdrawn;
        uint256 indYield = _safeSub(vaultAPI.convertToAssets(shares), stake_);
        uint256 outcomeYield = vaultAPI.convertToAssets(_sharesByOutcome[outcome]) - _stakeByOutcome[outcome];
        return outcomeYield > 0? (indYield * totalYield) / outcomeYield : 0;
    }

    /**
     * returns total yield generated by the pool
     */
    function getYield() public view returns (uint256) {
        // uint256 shares = vaultAPI.balanceOf(address(this));
        // return vaultAPI.convertToAssets(shares) - totalStakes;
        return _safeSub(vaultAPI.totalAssets(), totalStakes);
    }

    function getStakeByOutcome(uint16 outcome) public view returns (uint256) {
        return _stakeByOutcome[outcome];
    }

    /**returns total amount staked in a given outcome */
    function getSharesByOutcome(uint16 outcome) public view returns (uint256) {
        return _sharesByOutcome[outcome];
    }

    /**returns total amount staked by an account in a given outcome */
    function getStake(address staker, uint16 outcome) external view returns (uint256) {
        return _stakes[staker][outcome];
    }

    function getShares(address owner, uint16 outcome) external view returns (uint256) {
        return _shares[owner][outcome];
    }

    /**
     * @notice returns the maximum amount that can be deposited via the API. Usually defined by the vault protocol.
     */
    function maxDeposit() public view returns  (uint256) {
        return vaultAPI.maxDeposit(address(this));
    }

    /**
     * @notice returns the maximum amount withdrawable in a tx for a given pair (user, outcome).
     * @param owner the user that staked the assets and therefore has a claim to part of pool balance.
     * @param outcome the outcome related to this particular balance.
     */
    function maxWithdraw(address owner, uint16 outcome) public view returns (uint256){
        uint256 maxPool = vaultAPI.maxWithdraw(address(this));
        uint256 stake_ = _stakes[owner][outcome];
        
        if(!hasResult())
          return _min(stake_, maxPool);
        
        if(outcome == resultController.getResult()) {
          uint256 bal = previewPrize(outcome, _shares[owner][outcome], stake_) + stake_;
          return _min(bal, maxPool);
        }
        return _min(stake_, maxPool);
    }

    function hasResult() public view returns (bool) {
        return resultController.hasResult();
    }

}