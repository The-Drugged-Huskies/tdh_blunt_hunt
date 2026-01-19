// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Leaderboard
 * @dev Stores the top 100 high scores for Blunt Hunt on Dogechain.
 *      Maintains a sorted array of scores (highest to lowest).
 */
contract Leaderboard {
    struct Score {
        address player;
        uint256 score;
        uint256 timestamp;
    }

    Score[] public leaderboard;
    uint256 constant MAX_LEADERBOARD_SIZE = 100;

    event NewHighScore(address indexed player, uint256 score, uint256 rank);

    /**
     * @dev Submits a score. If it qualifies for the top 100, it is inserted.
     * @param _score The score achieved by the player.
     */
    function submitScore(uint256 _score) external {
        uint256 length = leaderboard.length;

        // 1. If leaderboard is not full, add it
        if (length < MAX_LEADERBOARD_SIZE) {
            _insertScore(_score);
            return;
        }

        // 2. If leaderboard is full, check if it beats the lowest score
        // (Array is sorted High -> Low, so last element is lowest)
        if (_score > leaderboard[length - 1].score) {
            // Remove the last element
            leaderboard.pop();
            // Insert the new one
            _insertScore(_score);
        }
    }

    /**
     * @dev Internal function to insert a score and keep the array sorted.
     *      Assumption: Leaderboard is not full (or just had an element removed).
     */
    function _insertScore(uint256 _score) internal {
        uint256 length = leaderboard.length;
        
        // Add dummy element to extend array
        leaderboard.push(Score({
            player: msg.sender,
            score: _score,
            timestamp: block.timestamp
        }));

        // Bubble up from the end to the correct position
        // New element is at index `length` (since we just pushed, size is now length+1)
        
        for (uint256 i = length; i > 0; i--) {
            if (leaderboard[i].score > leaderboard[i - 1].score) {
                // Swap
                Score memory temp = leaderboard[i];
                leaderboard[i] = leaderboard[i - 1];
                leaderboard[i - 1] = temp;
            } else {
                // If current score is <= previous, we are in correct spot
                break;
            }
        }

        // Emit event (rank is i+1, but loop 'i' is dynamic. 
        // We could calc rank, but for gas savings we might skip exact rank in event unless needed)
    }

    /**
     * @dev Returns the entire leaderboard.
     */
    function getLeaderboard() external view returns (Score[] memory) {
        return leaderboard;
    }

    /**
     * @dev Returns the lowest qualifying score. 
     *      Useful for frontend to check if it's worth submitting transaction.
     */
    function getLowestQualifyingScore() external view returns (uint256) {
        if (leaderboard.length < MAX_LEADERBOARD_SIZE) {
            return 0; // Any score > 0 qualifies (assuming >0 logic)
        }
        return leaderboard[leaderboard.length - 1].score;
    }
}
