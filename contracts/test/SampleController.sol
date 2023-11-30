// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../BaseResultController.sol";

contract SampleController is BaseResultController {

    address public owner;

    bytes32 immutable private _game;
    
    modifier onlyOwner {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor(string memory game) {
        owner = msg.sender;
        _game = bytes32(abi.encodePacked(game));
    }

    function _getGame() internal view override returns(bytes32) {
        return _game;
    }

    function generateResult(uint16 r) external onlyOwner {
        setResult(r);
    }


    function setOutcomes(bytes32[] memory outcomes) external onlyOwner {
        _setOutcomes(outcomes);
    }

}