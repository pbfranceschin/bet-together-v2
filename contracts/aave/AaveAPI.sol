// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../libs/FixedPointMathLib.sol";
import "./external/IPool.sol";
import "./external/IPoolAddressesProvider.sol";
import "./external/DataTypes.sol";
import "./external/Constants.sol";
import "./external/WadRayMath.sol";
import "./external/IAToken.sol";

contract AaveAPI is IERC4626, ERC20 {
    using FixedPointMathLib for uint256;
    
    IPoolAddressesProvider immutable AAVE_POOL_ADDRESS_PROVIDER;

    IERC20 public immutable ASSET;

    IAToken public immutable ATOKEN;

    uint256 public immutable BASE_EXCHANGE_RATE;

    constructor(address _asset, address _aavePoolAddressProvider, uint256 _baseExchangeRate) ERC20("AavePoolShares", "AVPS") {
        require(_baseExchangeRate > 0, "Invalid exchange rate.");
        BASE_EXCHANGE_RATE = _baseExchangeRate;
        ASSET = ERC20(_asset);
        AAVE_POOL_ADDRESS_PROVIDER = IPoolAddressesProvider(_aavePoolAddressProvider);
        IPool pool = _getPool();
        DataTypes.ReserveData memory data = pool.getReserveData(_asset);
        require(data.aTokenAddress != address(0), "Asset not compatible with Aave.");
        ATOKEN = IAToken(data.aTokenAddress) ;
        ASSET.approve(address(pool), type(uint256).max);
    }

    function deposit(uint256 assets, address receiver) external override returns (uint256 shares) {
        shares = previewDeposit(assets);
        require(shares != 0, "ZERO SHARES. Adjust amount.");

        ASSET.transferFrom(msg.sender, address(this), assets);
        _getPool().supply(address(ASSET), assets, address(this), 0); /**SEE HOW referralCode WORKS */
        _mint(receiver, shares);
        emit Deposit(msg.sender, receiver, assets, shares);
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) external override returns (uint256 shares) {
        shares = previewWithdraw(assets);
        require(balanceOf(msg.sender) >= shares, "caller does not have enough shares to cover withdrawal");
        
        _burn(owner, shares);
        uint256 ret = _getPool().withdraw(address(ASSET), assets, receiver);
        assert(ret == assets);
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) external override returns (uint256 assets) {}

    /**GETTERS */

    function totalAssets() public override view returns (uint256) {
        return _getBalance();
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply();
        return supply == 0 ? assets*BASE_EXCHANGE_RATE : assets.mulDivDown(supply, totalAssets());
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply();
        return supply == 0 ? shares/BASE_EXCHANGE_RATE : shares.mulDivDown(totalAssets(), supply);
    }

    function previewDeposit(uint256 assets) public view returns (uint256) {
        return convertToShares(assets);
    }

    function previewWithdraw(uint256 assets) public view returns (uint256){
        uint256 supply = totalSupply();
        return supply == 0 ? assets*BASE_EXCHANGE_RATE : assets.mulDivUp(supply, totalAssets());
    }

    function maxDeposit(address) external view returns (uint256) {
        return _maxAssetsSuppliableToAave();
    }

    function maxWithdraw(address owner) external view returns (uint256) {
        uint256 maxWithdrawable = _maxAssetsWithdrawableFromAave();
        return maxWithdrawable == 0 ? 0 : maxWithdrawable.min(convertToAssets(balanceOf(owner)));
    }

    /**INTERNAL */

    function _getPool() internal view returns(IPool) {
        return IPool(AAVE_POOL_ADDRESS_PROVIDER.getPool());
    }

    function _getBalance() internal view returns(uint256) {
        return ATOKEN.balanceOf(address(this));
    }

    function _maxAssetsSuppliableToAave() internal view returns (uint256) {
        // returns 0 if reserve is not active, frozen, or paused
        // returns max uint256 value if supply cap is 0 (not capped)
        // returns supply cap - current amount supplied as max suppliable if there is a supply cap for this reserve

        DataTypes.ReserveData memory reserveData = _getPool().getReserveData(address(ASSET));

        uint256 reserveConfigMap = reserveData.configuration.data;
        uint256 supplyCap = (reserveConfigMap & ~AAVE_SUPPLY_CAP_MASK) >> AAVE_SUPPLY_CAP_BIT_POSITION;

        if (
            (reserveConfigMap & ~AAVE_ACTIVE_MASK == 0) ||
            (reserveConfigMap & ~AAVE_FROZEN_MASK != 0) ||
            (reserveConfigMap & ~AAVE_PAUSED_MASK != 0)
        ) {
            return 0;
        } else if (supplyCap == 0) {
            return type(uint256).max;
        } else {
            // Reserve's supply cap - current amount supplied
            // See similar logic in Aave v3 ValidationLogic library, in the validateSupply function
            // https://github.com/aave/aave-v3-core/blob/a00f28e3ad7c0e4a369d8e06e0ac9fd0acabcab7/contracts/protocol/libraries/logic/ValidationLogic.sol#L71-L78
            uint256 currentSupply = WadRayMath.rayMul(
                (ATOKEN.scaledTotalSupply() + uint256(reserveData.accruedToTreasury)),
                reserveData.liquidityIndex
            );
            uint256 supplyCapWithDecimals = supplyCap * 10 ** decimals();
            return supplyCapWithDecimals > currentSupply ? supplyCapWithDecimals - currentSupply : 0;
        }
    }

    function _maxAssetsWithdrawableFromAave() internal view returns (uint256) {
        // returns 0 if reserve is not active, or paused
        // otherwise, returns available liquidity

        DataTypes.ReserveData memory reserveData = _getPool().getReserveData(address(ASSET));

        uint256 reserveConfigMap = reserveData.configuration.data;

        if ((reserveConfigMap & ~AAVE_ACTIVE_MASK == 0) || (reserveConfigMap & ~AAVE_PAUSED_MASK != 0)) {
            return 0;
        } else {
            return ASSET.balanceOf(address(ATOKEN));
        }
    }
}
