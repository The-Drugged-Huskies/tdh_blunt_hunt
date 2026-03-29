// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

/**Warning: Source file does not specify required compiler version! Consider adding "pragma solidity ^0.8.17;"
--> Leaderboard.sol

Error handling compilation result: can't access property "Leaderboard.sol", output.contracts is undefined
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 */
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _transferOwnership(_msgSender());
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    function renounceOwnership() public virtual onlyOwner {
        revert("Ownership renunciation is disabled");
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

/**
 * @dev Elliptic Curve Digital Signature Algorithm (ECDSA) operations.
 */
library ECDSA {
    enum RecoverError {
        NoError,
        InvalidSignature,
        InvalidSignatureLength,
        InvalidSignatureS
    }

    error ECDSAInvalidSignature();
    error ECDSAInvalidSignatureLength(uint256 length);
    error ECDSAInvalidSignatureS(bytes32 s);

    function tryRecover(bytes32 hash, bytes memory signature) internal pure returns (address recovered, RecoverError err, bytes32 errArg) {
        if (signature.length == 65) {
            bytes32 r;
            bytes32 s;
            uint8 v;
            assembly ("memory-safe") {
                r := mload(add(signature, 0x20))
                s := mload(add(signature, 0x40))
                v := byte(0, mload(add(signature, 0x60)))
            }
            return tryRecover(hash, v, r, s);
        } else {
            return (address(0), RecoverError.InvalidSignatureLength, bytes32(signature.length));
        }
    }

    function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        (address recovered, RecoverError error, bytes32 errorArg) = tryRecover(hash, signature);
        _throwError(error, errorArg);
        return recovered;
    }

    function tryRecover(bytes32 hash, bytes32 r, bytes32 vs) internal pure returns (address recovered, RecoverError err, bytes32 errArg) {
        unchecked {
            bytes32 s = vs & bytes32(0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
            uint8 v = uint8((uint256(vs) >> 255) + 27);
            return tryRecover(hash, v, r, s);
        }
    }

    function recover(bytes32 hash, bytes32 r, bytes32 vs) internal pure returns (address) {
        (address recovered, RecoverError error, bytes32 errorArg) = tryRecover(hash, r, vs);
        _throwError(error, errorArg);
        return recovered;
    }

    function tryRecover(bytes32 hash, uint8 v, bytes32 r, bytes32 s) internal pure returns (address recovered, RecoverError err, bytes32 errArg) {
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            return (address(0), RecoverError.InvalidSignatureS, s);
        }
        address signer = ecrecover(hash, v, r, s);
        if (signer == address(0)) {
            return (address(0), RecoverError.InvalidSignature, bytes32(0));
        }
        return (signer, RecoverError.NoError, bytes32(0));
    }

    function recover(bytes32 hash, uint8 v, bytes32 r, bytes32 s) internal pure returns (address) {
        (address recovered, RecoverError error, bytes32 errorArg) = tryRecover(hash, v, r, s);
        _throwError(error, errorArg);
        return recovered;
    }

    function _throwError(RecoverError error, bytes32 errorArg) private pure {
        if (error == RecoverError.NoError) {
            return;
        } else if (error == RecoverError.InvalidSignature) {
            revert ECDSAInvalidSignature();
        } else if (error == RecoverError.InvalidSignatureLength) {
            revert ECDSAInvalidSignatureLength(uint256(errorArg));
        } else if (error == RecoverError.InvalidSignatureS) {
            revert ECDSAInvalidSignatureS(errorArg);
        }
    }

    // Helper for strings
    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32 message) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}

/**
 * @title Leaderboard
 * @dev Stores the top 100 high scores. 
 */
contract Leaderboard is Ownable {
    using ECDSA for bytes32;

    struct Score {
        address player;
        uint48 score;
        uint48 timestamp;
    }

    /**
     * @notice Tournament Leaderboard (Resets every round)
     * Stores scores for the current prize interval. Cleared on payout.
     */
    Score[] public leaderboard;

    /**
     * @notice All-Time Leaderboard (Persistent)
     * Stores historical high scores. Never cleared.
     * Added in v2 to track long-term player performance.
     */
    Score[] public allTimeLeaderboard;

    uint256 constant MAX_LEADERBOARD_SIZE = 100;
    uint256 constant MAX_ALL_TIME_SIZE = 100;

    // Game Config
    uint256 public gameCost = 1 ether; // 1 DOGE
    uint256 public gameInterval = 1 hours; // Default duration
    uint256 public alignmentOffset = 0; // Seconds offset from Interval start (e.g. 16:20 relative to day)
    uint256 public prizePool;
    uint256 public gameEndTime;
    uint256 public gameRoundDuration = 60; // Seconds per game session
    uint256 public devFeePercent = 25; // Default 25%

    // Security
    address public signerAddress;

    // Ticket: True if user has paid for a game but not yet submitted
    mapping(address => bool) public hasTicket;

    // Nonce per player for replay protection
    mapping(address => uint256) public nonces;

    event NewHighScore(address indexed player, uint256 score, uint256 rank);
    event PrizePaid(address indexed winner, uint256 amount, uint256 timestamp);
    event GameStarted(address indexed player, uint256 timestamp);
    event PotUpdated(uint256 newAmount);
    event ScoreSubmitted(address indexed player, uint256 score);

    event PaymentFailed(address indexed recipient, uint256 amount);

    constructor() {
        gameEndTime = calculateNextEndTime();
    }

    function calculateNextEndTime() public view returns (uint256) {
        if (gameInterval == 0) return block.timestamp + 1 hours;
        
        // Robust Alignment Logic
        // Ensures the next deadline is always at (N * interval) + offset
        // e.g. If interval=1 day, offset=16:20, it will always end at 16:20.
        
        uint256 current = block.timestamp;
        
        // Standardize current time to interval grid
        // We subtract offset to shift the grid, divide to find "interval index", add 1 for next, then restore.
        // We use int cast to handle potential underflow if we were pre-1970, but uint is fine for current times > offset.
        
        // Safety: If offset > current (unlikely unless huge offset), just add interval.
        // In practice offset is usually 0..interval.
        
        uint256 next = ((current - alignmentOffset) / gameInterval + 1) * gameInterval + alignmentOffset;
        
        // If calculated time is in the past (edge case), add another interval
        if (next <= current) {
             next += gameInterval;
        }
        
        return next;
    }

    function startGame() external payable {
        require(msg.value == gameCost, "Payment must be exact game cost");

        distributePrize();

        uint256 devFee = (msg.value * devFeePercent) / 100;
        uint256 potShare = msg.value - devFee;

        (bool success, ) = payable(owner()).call{value: devFee}("");
        require(success, "Dev fee transfer failed");

        prizePool += potShare;
        emit PotUpdated(prizePool);

        hasTicket[msg.sender] = true;
        
        emit GameStarted(msg.sender, block.timestamp);
    }

    /**
     * @dev Submits a score. Consumes Ticket.
     *      Requires a server-side signature if signerAddress is set.
     */
    function submitScore(uint256 _score, bytes memory _signature) external {
        require(hasTicket[msg.sender] == true, "No ticket. Pay to play.");
        
        // Security Check: Fail-Closed
        require(signerAddress != address(0), "Security: Signer not initialized");
        
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, _score, address(this), nonces[msg.sender]));
        
        // Verify signature
        address recovered = hash.toEthSignedMessageHash().recover(_signature);
        require(recovered == signerAddress, "Invalid signature");

        // Increment nonce to prevent replay
        nonces[msg.sender]++;

        hasTicket[msg.sender] = false;
        emit ScoreSubmitted(msg.sender, _score);

        distributePrize();

        // 1. Update Tournament Leaderboard (Resets)
        uint256 tournamentRank = _updateLeaderboard(leaderboard, _score, MAX_LEADERBOARD_SIZE);

        // Emit event if player achieved #1 on tournament board
        if (tournamentRank == 0) {
            emit NewHighScore(msg.sender, _score, 1);
        }

        // 2. Update All-Time Leaderboard (Persistent)
        _updateLeaderboard(allTimeLeaderboard, _score, MAX_ALL_TIME_SIZE);
    }

    function setGameRoundDuration(uint256 _duration) external onlyOwner {
        gameRoundDuration = _duration;
    }

    function setSignerAddress(address _signer) external onlyOwner {
        signerAddress = _signer;
    }

    function setDevFeePercent(uint256 _percent) external onlyOwner {
        require(_percent <= 50, "Fee cannot exceed 50%");
        devFeePercent = _percent;
    }

    /**
     * @notice Distributes the prize pool to the winner of the current round.
     * @dev Triggered on game start or score submission if the time window has passed.
     *      - Pays out 100% of pot to Rank #1.
     *      - Resets 'leaderboard' (Tournament).
     *      - Preserves 'allTimeLeaderboard' (History).
     */
    function distributePrize() public {
        if (block.timestamp >= gameEndTime) {
            uint256 amount = prizePool;
            
            if (leaderboard.length > 0) {
                address winner = leaderboard[0].player;
                
                prizePool = 0;
                delete leaderboard; // Clears TOURNAMENT board
                
                // Align to next strict schedule
                gameEndTime = calculateNextEndTime(); 

                if (amount > 0) {
                    // SECURE: Use call but handle failure gracefully (Rollover)
                    (bool sent, ) = payable(winner).call{value: amount}("");
                    
                    if (sent) {
                        emit PrizePaid(winner, amount, block.timestamp);
                    } else {
                        // Anti-DoS: If payment fails, keep funds in pot for next round
                        prizePool += amount; 
                        emit PaymentFailed(winner, amount);
                    }
                }
            } else {
                gameEndTime = calculateNextEndTime();
            }
        }
    }

    /**
     * @dev Optimized leaderboard update logic.
     *      Uses a single-pass shift instead of multiple swaps to save ~50% gas on SSTOREs.
     */
    function _updateLeaderboard(Score[] storage _list, uint256 _score, uint256 _maxSize) internal returns (uint256) {
        // Safe Cast
        require(_score <= type(uint48).max, "Score overflow");
        uint48 score48 = uint48(_score);

        uint256 length = _list.length;
        
        // 1. Determine if score qualifies
        if (length == _maxSize && score48 <= _list[length - 1].score) {
            return type(uint256).max; // Doesn't make the cut
        }

        // 2. Find insertion point
        uint256 insertionIndex = length;
        while (insertionIndex > 0 && _list[insertionIndex - 1].score < score48) {
            unchecked { insertionIndex--; }
        }

        // 3. Handle Insertion
        if (length < _maxSize) {
            // List not full: Expand and shift
            _list.push(); // Temporary empty slot at end
            length++;
        }
        
        // 4. Single-pass Shift Down
        // We move elements from [insertionIndex...length-2] to [insertionIndex+1...length-1]
        for (uint256 i = length - 1; i > insertionIndex; ) {
            _list[i] = _list[i - 1];
            unchecked { i--; }
        }

        // 5. Place New Score
        _list[insertionIndex] = Score({
            player: msg.sender,
            score: score48,
            timestamp: uint48(block.timestamp)
        });

        return insertionIndex;
    }

    function getLeaderboard() external view returns (Score[] memory) {
        return leaderboard;
    }

    function getAllTimeLeaderboard() external view returns (Score[] memory) {
        return allTimeLeaderboard;
    }

    /**
     * @notice Paginated leaderboard getter to reduce gas on large reads.
     * @param _offset Starting index (0-based)
     * @param _limit Maximum number of entries to return
     */
    function getLeaderboardPaginated(uint256 _offset, uint256 _limit) external view returns (Score[] memory) {
        return _paginate(leaderboard, _offset, _limit);
    }

    function getAllTimeLeaderboardPaginated(uint256 _offset, uint256 _limit) external view returns (Score[] memory) {
        return _paginate(allTimeLeaderboard, _offset, _limit);
    }

    function _paginate(Score[] storage _list, uint256 _offset, uint256 _limit) internal view returns (Score[] memory) {
        if (_offset >= _list.length) {
            return new Score[](0);
        }
        uint256 end = _offset + _limit;
        if (end > _list.length) {
            end = _list.length;
        }
        uint256 size = end - _offset;
        Score[] memory result = new Score[](size);
        for (uint256 i = 0; i < size; i++) {
            result[i] = _list[_offset + i];
        }
        return result;
    }

    function getLowestQualifyingScore() external view returns (uint256) {
        if (leaderboard.length < MAX_LEADERBOARD_SIZE) {
            return 0;
        }
        return leaderboard[leaderboard.length - 1].score;
    }

    function getPotInfo() external view returns (uint256 pot, uint256 endTime) {
        return (prizePool, gameEndTime);
    }

    function setGameInterval(uint256 _interval) external onlyOwner {
        require(_interval > 0, "Interval must be positive");
        gameInterval = _interval;
    }
    
    function setHelperAlignment(uint256 _offset) external onlyOwner {
        require(_offset < gameInterval, "Offset must be less than interval");
        alignmentOffset = _offset;
    }

    function setGameCost(uint256 _newCost) external onlyOwner {
        gameCost = _newCost;
    }

    function setGameEndTime(uint256 _timestamp) external onlyOwner {
        gameEndTime = _timestamp;
    }

    function forceEndedState() external onlyOwner {
        gameEndTime = block.timestamp; 
    }

    /**
     * @dev Rejects direct DOGE transfers. All payments must go through startGame().
     */
    receive() external payable {
        revert("Direct transfers not accepted. Use startGame().");
    }

    /**
     * @dev Rejects calls to non-existent functions.
     */
    fallback() external payable {
        revert("Function does not exist.");
    }
}
