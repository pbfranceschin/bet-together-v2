// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Pool.sol";

contract Factory {

    event PoolCreated (
        address indexed owner,
        address indexed asset,
        address indexed poolAddress,
        address resultController,
        address vaultApi
    );

    function createPool(address asset, address resultController, address vaultAPI) external {
        Pool pool = new Pool(asset, resultController, vaultAPI);
        emit PoolCreated(msg.sender, asset, address(pool), resultController, vaultAPI);
    }
}