// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IResultController {

  event resultGenerated (address indexed controller, uint256 indexed result);

  function hasResult () external view returns (bool);
  
  function getResult () external view returns (uint256);
  
  function getOutcomesCount () external view returns (uint256);
  
  function getOutcomeName (uint256 index) external view returns (bytes32);
  
  function getGame () external view returns (bytes32);

}