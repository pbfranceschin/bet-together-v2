// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IResultController} from "./interfaces/IResultController.sol";

interface IPool {
  function closePool(uint16 result) external;
}

abstract contract BaseResultController is IResultController {
  bool private _hasResult;
  uint16 private _result;
  bytes32[] private _outcomeNames;
  
  constructor () {
    _hasResult = false;
  }

  function setResult (uint16 r) internal {
    require(!_hasResult, "Already has result.");
    require(r != 0, "Result can't be ZERO.");

    _hasResult = true;
    _result = r;
    // 
    // IPool _pool = IPool(pool);
    // _pool.closePool(r);
    // 
    emit resultGenerated (address(this), r);
  }
  
  /**slot ZERO MUST be left empty */
  function _setOutcomes (bytes32[] memory outcomes) internal {
    _outcomeNames = outcomes;
  }

  function _addOutcome (bytes32 outcomeName) internal {
    _outcomeNames.push(outcomeName);
  }

  function hasResult () external view override returns (bool) {
    return _hasResult;
  }
  
  function getResult () external view override returns (uint256) {
    return _result;
  }

  function getOutcomesCount () external view override returns (uint256) {
    return _getOutcomesCount();
  }
  
  function getOutcomeName (uint256 index) external view override returns (bytes32) {
    return _outcomeNames[index];
  }

  function _getOutcomesCount () public view returns (uint256) {
    return _outcomeNames.length;
  }

  function getGame () external view returns (bytes32) {
    return _getGame();
  }

  function _getGame () internal view virtual returns (bytes32);
}