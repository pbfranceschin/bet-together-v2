// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IERC4626.sol";
import "./MockVault.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../libs/FixedPointMathLib.sol";

contract MockVaultAPI is IERC4626, ERC20 {
    using FixedPointMathLib for uint256;
    
    MockVault immutable vault;

    ERC20 immutable asset;

    uint256 constant exRate = 1e6;

    constructor(address _vault, address _asset) ERC20("VaultShares", "VLTS") {
        vault = MockVault(_vault);
        asset = ERC20(_asset);
        asset.approve(_vault, type(uint256).max);
        // _mint(address(this),1e6);
    }

    function deposit(uint256 assets, address receiver) external override returns (uint256 shares) {
        shares = convertToShares(assets);
        asset.transferFrom(msg.sender, address(this), assets);
        vault.deposit(assets);
        _mint(receiver, shares);
        emit Deposit(msg.sender, receiver, assets, shares);
    }

    // function mint(uint256 shares, address receiver) external returns (uint256 assets);

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) external override returns (uint256 shares) {
        shares = previewWithdraw(assets);
        require(balanceOf(msg.sender) >= shares, "caller does not have enough shares to cover withdrawal");
        
        vault.withdraw(assets);
        _burn(owner, shares);
        asset.transfer(receiver, assets);
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) external override returns (uint256 assets) {
        assets = convertToAssets(shares);
        vault.withdraw(assets);
        _burn(owner, shares);
        asset.transfer(receiver, assets);
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    function totalAssets() public override view returns (uint256) {
        return asset.balanceOf(address(vault));
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply();

        return supply == 0 ? assets*exRate : assets.mulDivDown(supply, totalAssets());
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply();

        return supply == 0 ? shares/exRate : shares.mulDivDown(totalAssets(), supply);
    }

    function previewWithdraw(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply();

        return supply == 0 ? assets*exRate : assets.mulDivUp(supply, totalAssets());
    }

    function previewDeposit(uint256 assets) external view returns (uint256) {}

    function maxDeposit(address) external pure returns (uint256) {
        return type(uint256).max;
    }

    function maxWithdraw(address owner) external view returns (uint256) {
        uint256 maxWithdrawable = asset.balanceOf(address(vault));
        return maxWithdrawable == 0 ? 0 : maxWithdrawable.min(convertToAssets(balanceOf(owner)));
    }


}