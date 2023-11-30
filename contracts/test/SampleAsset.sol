// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SampleAsset is ERC20 {

    constructor() ERC20("Sample", "SMPL") {
        // _mint(msg.sender, 1e12);
    }

    function mint(address receiver, uint256 amount) external {
        _mint(receiver, amount);
    }

    
}