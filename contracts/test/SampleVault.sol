// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./SampleAsset.sol";

contract SampleVault {

    SampleAsset public immutable asset;

    constructor(address _asset) {
        asset = SampleAsset(_asset);
    }

    function deposit(uint256 amount) external {
        require(asset.allowance(msg.sender, address(this)) >= amount, "not enough allowance");
        asset.transferFrom(msg.sender, address(this), amount);
    }

    function withdraw(uint256 amount) external {
        asset.transfer(msg.sender, amount);
    }

    function generateYield(uint256 basisPoints) external {
        uint256 yield = (asset.balanceOf(address(this))) * basisPoints / 1e4;
        asset.mint(address(this), yield);
    }
}