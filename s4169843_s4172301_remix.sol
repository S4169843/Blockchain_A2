// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DecisionVotingPlatform {

    address public admin; // set once at deployment - the deployer automatically becomes Admin

    enum Phase { NotStarted, Voting, Ended, Revealed }
    Phase public phase;

    uint256 public currentRound; // increments every time a new round is prepared

    string public topic;
    string[] public options;

    // round => voter => hasVoted
    mapping(uint256 => mapping(address => bool)) private hasVoted;
    // round => voter => (option index + 1); 0 means "has not voted"
    mapping(uint256 => mapping(address => uint256)) private voteOf;
    // round => voter => excluded
    mapping(uint256 => mapping(address => bool)) private excluded;
    // round => every address ever excluded this round (may include later-reinstated ones,
    // filtered when read so getExcludedVoters() only returns currently-excluded addresses)
    mapping(uint256 => address[]) private excludedHistory;
    // round => option index => vote count
    mapping(uint256 => mapping(uint256 => uint256)) private voteCounts;

    uint256[] private winningOptions; // populated on reveal, cleared on next prepareRound

    event RoundPrepared(uint256 indexed round, string topic, uint256 optionCount);
    event VoteCast(uint256 indexed round, address indexed voter, uint256 optionIndex);
    event VoterExcluded(uint256 indexed round, address indexed voter);
    event VoterReinstated(uint256 indexed round, address indexed voter);
    event VotingEnded(uint256 indexed round);
    event ResultsRevealed(uint256 indexed round);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only the Admin can perform this action");
        _;
    }

    modifier notAdmin() {
        require(msg.sender != admin, "Admin is not permitted to vote");
        _;
    }

    constructor() {
        admin = msg.sender;
        phase = Phase.NotStarted;
        currentRound = 0;
    }

    /// Admin prepares (or re-prepares, after a round has ended) a new voting round.
    function prepareRound(string calldata _topic, string[] calldata _options) external onlyAdmin {
        require(phase != Phase.Voting, "An active round must be ended before starting a new one");
        require(bytes(_topic).length > 0, "Voting topic cannot be empty");
        require(_options.length >= 2, "At least 2 voting options are required");
        for (uint256 i = 0; i < _options.length; i++) {
            require(bytes(_options[i]).length > 0, "Option text cannot be empty");
        }

        currentRound += 1; // bumping the round key isolates all previous round mappings

        topic = _topic;
        delete options;
        for (uint256 i = 0; i < _options.length; i++) {
            options.push(_options[i]);
        }
        delete winningOptions;

        phase = Phase.Voting;
        emit RoundPrepared(currentRound, _topic, _options.length);
    }

    function castVote(uint256 optionIndex) external notAdmin {
        require(phase == Phase.Voting, "Voting is not currently open");
        require(!excluded[currentRound][msg.sender], "You are not eligible to vote in this round");
        require(!hasVoted[currentRound][msg.sender], "You have already voted in this round");
        require(optionIndex < options.length, "Selected option is invalid");

        hasVoted[currentRound][msg.sender] = true;
        voteOf[currentRound][msg.sender] = optionIndex + 1;
        voteCounts[currentRound][optionIndex] += 1;

        emit VoteCast(currentRound, msg.sender, optionIndex);
    }

    function excludeVoter(address voter) external onlyAdmin {
        require(phase == Phase.Voting, "No active round to manage eligibility for");
        require(voter != admin, "Admin is not a participant");
        if (!excluded[currentRound][voter]) {
            excluded[currentRound][voter] = true;
            excludedHistory[currentRound].push(voter);
        }
        emit VoterExcluded(currentRound, voter);
    }

    function reinstateVoter(address voter) external onlyAdmin {
        require(phase == Phase.Voting, "No active round to manage eligibility for");
        excluded[currentRound][voter] = false;
        emit VoterReinstated(currentRound, voter);
    }

    /// Admin-only view of everyone currently excluded in this round.
    function getExcludedVoters() external view onlyAdmin returns (address[] memory) {
        address[] memory history = excludedHistory[currentRound];
        uint256 count = 0;
        for (uint256 i = 0; i < history.length; i++) {
            if (excluded[currentRound][history[i]]) count++;
        }
        address[] memory result = new address[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < history.length; i++) {
            if (excluded[currentRound][history[i]]) {
                result[j] = history[i];
                j++;
            }
        }
        return result;
    }

    function endVoting() external onlyAdmin {
        require(phase == Phase.Voting, "No active voting round to end");
        phase = Phase.Ended;
        emit VotingEnded(currentRound);
    }

    function revealResults() external onlyAdmin {
        require(phase == Phase.Ended, "Voting must be ended before results can be revealed");

        uint256 maxVotes = 0;
        for (uint256 i = 0; i < options.length; i++) {
            if (voteCounts[currentRound][i] > maxVotes) {
                maxVotes = voteCounts[currentRound][i];
            }
        }
        delete winningOptions;
        for (uint256 i = 0; i < options.length; i++) {
            if (voteCounts[currentRound][i] == maxVotes) {
                winningOptions.push(i);
            }
        }

        phase = Phase.Revealed;
        emit ResultsRevealed(currentRound);
    }

    /// Option-level vote counts and winning option index/indices (ties included).
    function getResults() external view returns (uint256[] memory counts, uint256[] memory winners) {
        require(phase == Phase.Revealed, "Results have not been revealed yet");
        counts = new uint256[](options.length);
        for (uint256 i = 0; i < options.length; i++) {
            counts[i] = voteCounts[currentRound][i];
        }
        winners = winningOptions;
    }

    function getOptions() external view returns (string[] memory) {
        return options;
    }

    function getOptionsCount() external view returns (uint256) {
        return options.length;
    }

    /// Caller-bound status lookup - every user can only ever see their own status.
    /// isAdmin whether msg.sender is the Admin
    /// isEligible whether msg.sender is currently eligible (meaningless for Admin)
    /// hasVotedInRound whether msg.sender has voted this round
    /// myVoteOption the option index msg.sender voted for, or type(uint256).max if none
    function getMyStatus() external view returns (
        bool isAdmin,
        bool isEligible,
        bool hasVotedInRound,
        uint256 myVoteOption
    ) {
        isAdmin = (msg.sender == admin);
        isEligible = !excluded[currentRound][msg.sender];
        hasVotedInRound = hasVoted[currentRound][msg.sender];
        uint256 raw = voteOf[currentRound][msg.sender];
        myVoteOption = raw == 0 ? type(uint256).max : raw - 1;
    }

    /// Admin-only lookup of a specific participant's eligibility/voted status.
    /// Deliberately does NOT expose which option that participant voted for.
    function getParticipantStatus(address participant) external view onlyAdmin returns (
        bool isEligible,
        bool hasVotedInRound
    ) {
        isEligible = !excluded[currentRound][participant];
        hasVotedInRound = hasVoted[currentRound][participant];
    }
}