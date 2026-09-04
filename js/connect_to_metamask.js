/*
  voting.js
  ---------
  Combined: MetaMask connection + contract config + voting logic.

  Swap CONTRACT_ADDRESS and CONTRACT_ABI below for the real deployed
  contract once your partner has finished it in Remix. Everything past
  that is written against the function names/signatures documented here
  — either update the ABI + names to match his contract, or ask him to
  name things the same so nothing else has to change.

  Proposed Solidity interface (share this with your partner):

    address public admin;

    function prepareRound(string calldata topic, string[] calldata options) external;   // onlyAdmin
    function endVoting() external;                                                       // onlyAdmin
    function revealResults() external;                                                    // onlyAdmin
    function excludeVoter(address voter) external;                                        // onlyAdmin
    function reinstateVoter(address voter) external;                                      // onlyAdmin
    function castVote(uint256 optionIndex) external;                                       // participants

    function getTopic() external view returns (string memory);
    function getOptions() external view returns (string[] memory);
    function getPhase() external view returns (uint8);
        // 0 = NotPrepared, 1 = VotingOpen, 2 = VotingEnded, 3 = ResultsRevealed
    function amIEligible() external view returns (bool);      // checks msg.sender
    function haveIVoted() external view returns (bool);       // checks msg.sender
    function getExcludedList() external view returns (address[] memory);   // onlyAdmin
    function getVoterStatus(address voter) external view returns (bool eligible, bool voted); // onlyAdmin
    function getResults() external view returns (string[] memory options, uint256[] memory voteCounts); // only once revealed
    function getWinners() external view returns (string[] memory);         // only once revealed

    event RoundPrepared(string topic);
    event VoteCast(address indexed voter);
    event VotingEnded();
    event ResultsRevealed();
    event VoterExcluded(address indexed voter);
    event VoterReinstated(address indexed voter);
*/

// ============================================================
// MetaMask connection (your original functions, unchanged)
// ============================================================

async function connect_to_metamask() {
  if (!window.ethereum) {
    connectError.innerHTML = "No injected wallet. Please install Metamask";
  } else {
    connectError.innerHTML = '';

    try {
      var current_eth_address = await get_current_eth_address();
      var current_eth_address_balance = await get_current_eth_address_balance(current_eth_address);
      var current_network = await get_current_network();

      document.getElementById("current_eth_address").innerHTML = current_eth_address;
      document.getElementById("current_eth_address_balance").innerHTML = current_eth_address_balance;
      document.getElementById("current_network").innerHTML = current_network;

    } catch (error) {
      connectError.innerHTML = error.message;
      console.log(error);
    }
  }
}

async function get_current_eth_address() {
  if (typeof window.ethereum !== 'undefined') {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    console.log(accounts);
    return accounts[0];
  } else {
    console.error('Valid wallet is not installed!');
    return null;
  }
}

async function get_current_eth_address_balance(eth_address) {
  if (typeof window.ethereum !== 'undefined') {
    const balanceResponse = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [eth_address, 'latest']
    });

    const web3 = new Web3(window.ethereum);
    return web3.utils.fromWei(balanceResponse, 'ether');
  } else {
    console.error('MetaMask is not installed!');
    return null;
  }
}

async function get_current_network() {
  if (typeof window.ethereum !== 'undefined') {
    const chainIdHex = await window.ethereum.request({
      method: 'eth_chainId'
    });

    const chainId = parseInt(chainIdHex, 16);

    switch (chainId) {
      case 1:
        return "Mainnet";
      case 11155111:
        return "Sepolia";
      case 1337:
      case 31337:
        return "Localhost";
      default:
        return "unknown";
    }
  } else {
    console.error('MetaMask is not installed!');
    return null;
  }
}

// ============================================================
// Contract config — REPLACE with your partner's real address/ABI
// ============================================================

const CONTRACT_ADDRESS = "0xd36654c114476F0246cB4DD6937511b2D3e7e076";

const CONTRACT_ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [], "name": "admin", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },

  { "inputs": [{ "internalType": "string", "name": "topic", "type": "string" }, { "internalType": "string[]", "name": "options", "type": "string[]" }], "name": "prepareRound", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "endVoting", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "revealResults", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "voter", "type": "address" }], "name": "excludeVoter", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "voter", "type": "address" }], "name": "reinstateVoter", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "optionIndex", "type": "uint256" }], "name": "castVote", "outputs": [], "stateMutability": "nonpayable", "type": "function" },

  { "inputs": [], "name": "getTopic", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getOptions", "outputs": [{ "internalType": "string[]", "name": "", "type": "string[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getPhase", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "amIEligible", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "haveIVoted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getExcludedList", "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "voter", "type": "address" }], "name": "getVoterStatus", "outputs": [{ "internalType": "bool", "name": "eligible", "type": "bool" }, { "internalType": "bool", "name": "voted", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getResults", "outputs": [{ "internalType": "string[]", "name": "options", "type": "string[]" }, { "internalType": "uint256[]", "name": "voteCounts", "type": "uint256[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getWinners", "outputs": [{ "internalType": "string[]", "name": "", "type": "string[]" }], "stateMutability": "view", "type": "function" },

  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "string", "name": "topic", "type": "string" }], "name": "RoundPrepared", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "voter", "type": "address" }], "name": "VoteCast", "type": "event" },
  { "anonymous": false, "inputs": [], "name": "VotingEnded", "type": "event" },
  { "anonymous": false, "inputs": [], "name": "ResultsRevealed", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "voter", "type": "address" }], "name": "VoterExcluded", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "voter", "type": "address" }], "name": "VoterReinstated", "type": "event" }
];

// ============================================================
// Voting app logic
// ============================================================

const PHASE = {
  0: "Not Prepared",
  1: "Voting Open",
  2: "Voting Ended",
  3: "Results Revealed"
};

let web3;
let contract;

let state = {
  account: null,
  isAdmin: false,
  phase: 0,
  topic: "",
  options: [],
  amIEligible: true,
  haveIVoted: false
};

function get_contract() {
  if (!contract) {
    web3 = new Web3(window.ethereum);
    contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
  }
  return contract;
}

// Called after connect_to_metamask() has already populated the wallet info.
async function init_voting_app() {
  try {
    const c = get_contract();
    state.account = await get_current_eth_address();

    const adminAddress = await c.methods.admin().call();
    state.isAdmin = adminAddress.toLowerCase() === state.account.toLowerCase();

    await refreshState();

    window.ethereum.on("accountsChanged", refreshState);
    window.ethereum.on("chainChanged", () => window.location.reload());
  } catch (error) {
    console.log(error);
    document.getElementById("connectError").innerHTML = error.message;
  }
}

async function refreshState() {
  try {
    const c = get_contract();

    state.account = await get_current_eth_address();
    state.phase = parseInt(await c.methods.getPhase().call());
    state.topic = await c.methods.getTopic().call();
    state.options = await c.methods.getOptions().call();

    if (!state.isAdmin) {
      state.amIEligible = await c.methods.amIEligible().call();
      state.haveIVoted = await c.methods.haveIVoted().call();
    }

    if (state.isAdmin) {
      await refreshExcludedList();
    }

    if (state.phase === 3) {
      await refreshResults();
    }

    renderUI();
  } catch (error) {
    console.log(error);
  }
}

async function refreshExcludedList() {
  const c = get_contract();
  const excluded = await c.methods.getExcludedList().call();
  const el = document.getElementById("excluded_list");
  el.innerHTML = excluded.length ? excluded.join(", ") : "(none)";
}

async function refreshResults() {
  const c = get_contract();
  const result = await c.methods.getResults().call();
  const winners = await c.methods.getWinners().call();

  const options = result.options || result[0];
  const counts = result.voteCounts || result[1];

  const list = document.getElementById("results_list");
  list.innerHTML = "";
  for (let i = 0; i < options.length; i++) {
    const li = document.createElement("li");
    li.innerHTML = options[i] + ": " + counts[i] + " vote(s)";
    list.appendChild(li);
  }

  document.getElementById("winners_list").innerHTML = winners.join(", ");
}

function renderUI() {
  document.getElementById("current_topic").innerHTML = state.topic || "(not set)";
  document.getElementById("current_phase").innerHTML = PHASE[state.phase] || "Unknown";
  document.getElementById("my_role").innerHTML = state.isAdmin ? "Admin" : "Participant";

  const optionsDiv = document.getElementById("options_list");
  optionsDiv.innerHTML = "";
  state.options.forEach((opt, i) => {
    optionsDiv.innerHTML += `
      <label>
        <input type="radio" name="vote_option" value="${i}"> ${opt}
      </label><br>`;
  });

  if (state.isAdmin) {
    document.getElementById("admin_panel").style.display = "block";
    document.getElementById("participant_panel").style.display = "none";
    renderAdminWarnings();
  } else {
    document.getElementById("admin_panel").style.display = "none";
    document.getElementById("participant_panel").style.display = "block";
    document.getElementById("my_eligibility").innerHTML = state.amIEligible ? "Eligible" : "Not eligible";
    document.getElementById("my_vote_status").innerHTML = state.haveIVoted ? "Already voted" : "Not voted yet";
    renderParticipantWarnings();
  }

  document.getElementById("results_section").style.display = (state.phase === 3) ? "block" : "none";
}

function renderAdminWarnings() {
  setWarning("prepare_round_warning",
    state.phase === 1 ? "A voting round is already open — end it before preparing a new one." : "");

  setWarning("end_voting_warning",
    state.phase !== 1 ? "Voting is not currently open." : "");

  setWarning("reveal_results_warning",
    state.phase !== 2 ? "Voting must be ended before results can be revealed." : "");
}

function renderParticipantWarnings() {
  let warning = "";
  if (state.phase !== 1) {
    warning = "Voting is not currently open.";
  } else if (!state.amIEligible) {
    warning = "You have been excluded from this round.";
  } else if (state.haveIVoted) {
    warning = "You have already voted this round.";
  }
  setWarning("cast_vote_warning", warning);
}

function setWarning(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) el.innerHTML = message;
}

function clearError() {
  document.getElementById("actionError").innerHTML = "";
}

function showError(error) {
  console.log(error);
  document.getElementById("actionError").innerHTML = error.message || String(error);
}

// ---------- Admin actions ----------

async function prepareRound() {
  clearError();
  try {
    const topic = document.getElementById("new_topic_input").value.trim();
    const optionsRaw = document.getElementById("new_options_input").value;
    const options = optionsRaw.split(",").map(o => o.trim()).filter(o => o.length > 0);

    const c = get_contract();
    await c.methods.prepareRound(topic, options).send({ from: state.account });
    await refreshState();
  } catch (error) {
    showError(error);
  }
}

async function endVoting() {
  clearError();
  try {
    const c = get_contract();
    await c.methods.endVoting().send({ from: state.account });
    await refreshState();
  } catch (error) {
    showError(error);
  }
}

async function revealResults() {
  clearError();
  try {
    const c = get_contract();
    await c.methods.revealResults().send({ from: state.account });
    await refreshState();
  } catch (error) {
    showError(error);
  }
}

async function excludeVoter() {
  clearError();
  try {
    const address = document.getElementById("exclude_address_input").value.trim();
    const c = get_contract();
    await c.methods.excludeVoter(address).send({ from: state.account });
    await refreshState();
  } catch (error) {
    showError(error);
  }
}

async function reinstateVoter() {
  clearError();
  try {
    const address = document.getElementById("reinstate_address_input").value.trim();
    const c = get_contract();
    await c.methods.reinstateVoter(address).send({ from: state.account });
    await refreshState();
  } catch (error) {
    showError(error);
  }
}

// ---------- Participant actions ----------

async function castVote() {
  clearError();
  try {
    const selected = document.querySelector('input[name="vote_option"]:checked');
    if (!selected) {
      showError({ message: "Select an option before submitting." });
      return;
    }
    const c = get_contract();
    await c.methods.castVote(parseInt(selected.value)).send({ from: state.account });
    await refreshState();
  } catch (error) {
    showError(error);
  }
}