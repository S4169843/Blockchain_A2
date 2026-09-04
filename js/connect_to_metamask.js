/*
  voting.js
  ---------
  Combined: MetaMask connection + contract config + voting logic.
  Written against the actual deployed contract's ABI (not a guess).

  NOTE on phase() numbering: the ABI only tells us `phase` returns a
  `DecisionVotingPlatform.Phase` enum as uint8 — it doesn't tell us the
  order of the enum values. This assumes the natural declaration order:
    0 = NotPrepared, 1 = VotingOpen, 2 = VotingEnded, 3 = ResultsRevealed
  Confirm this against your partner's Solidity `enum Phase { ... }`
  declaration and fix PHASE_* below if the order is different.
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
// Contract config — real deployed contract
// ============================================================

// Confirm this is the FINAL deployed + verified address before submitting.
const CONTRACT_ADDRESS = "0x3edaf3f06aa14b1c76af32cef3c9cd04ad80b030";

const CONTRACT_ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "uint256", "name": "round", "type": "uint256" }], "name": "ResultsRevealed", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "uint256", "name": "round", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "topic", "type": "string" }, { "indexed": false, "internalType": "uint256", "name": "optionCount", "type": "uint256" }], "name": "RoundPrepared", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "uint256", "name": "round", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "voter", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "optionIndex", "type": "uint256" }], "name": "VoteCast", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "uint256", "name": "round", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "voter", "type": "address" }], "name": "VoterExcluded", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "uint256", "name": "round", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "voter", "type": "address" }], "name": "VoterReinstated", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "uint256", "name": "round", "type": "uint256" }], "name": "VotingEnded", "type": "event" },
  { "inputs": [], "name": "admin", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "optionIndex", "type": "uint256" }], "name": "castVote", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "currentRound", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "endVoting", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "voter", "type": "address" }], "name": "excludeVoter", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "getExcludedVoters", "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getMyStatus", "outputs": [{ "internalType": "bool", "name": "isAdmin", "type": "bool" }, { "internalType": "bool", "name": "isEligible", "type": "bool" }, { "internalType": "bool", "name": "hasVotedInRound", "type": "bool" }, { "internalType": "uint256", "name": "myVoteOption", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getOptions", "outputs": [{ "internalType": "string[]", "name": "", "type": "string[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getOptionsCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "participant", "type": "address" }], "name": "getParticipantStatus", "outputs": [{ "internalType": "bool", "name": "isEligible", "type": "bool" }, { "internalType": "bool", "name": "hasVotedInRound", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getResults", "outputs": [{ "internalType": "uint256[]", "name": "counts", "type": "uint256[]" }, { "internalType": "uint256[]", "name": "winners", "type": "uint256[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "options", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "phase", "outputs": [{ "internalType": "enum DecisionVotingPlatform.Phase", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "string", "name": "_topic", "type": "string" }, { "internalType": "string[]", "name": "_options", "type": "string[]" }], "name": "prepareRound", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "voter", "type": "address" }], "name": "reinstateVoter", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "revealResults", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "topic", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }
];

// ============================================================
// Voting app logic
// ============================================================

// See the NOTE at the top of this file re: confirming this order against
// the actual Solidity enum declaration.
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
  isEligible: true,
  hasVoted: false,
  myVoteOption: null
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
    state.account = await get_current_eth_address();
    await refreshState();

    // Re-check everything whenever the user switches accounts/network in MetaMask.
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
    state.phase = parseInt(await c.methods.phase().call());
    state.topic = await c.methods.topic().call();
    state.options = await c.methods.getOptions().call();

    // getMyStatus() covers role + eligibility + vote status in one call.
    const myStatus = await c.methods.getMyStatus().call();
    state.isAdmin = myStatus.isAdmin;
    state.isEligible = myStatus.isEligible;
    state.hasVoted = myStatus.hasVotedInRound;
    state.myVoteOption = parseInt(myStatus.myVoteOption);

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
  const excluded = await c.methods.getExcludedVoters().call();
  const el = document.getElementById("excluded_list");
  el.innerHTML = excluded.length ? excluded.join(", ") : "(none)";
}

async function refreshResults() {
  const c = get_contract();
  const result = await c.methods.getResults().call();

  const counts = result.counts || result[0];
  const winnerIndices = (result.winners || result[1]).map(w => parseInt(w));

  const list = document.getElementById("results_list");
  list.innerHTML = "";
  state.options.forEach((opt, i) => {
    const li = document.createElement("li");
    li.innerHTML = opt + ": " + counts[i] + " vote(s)";
    list.appendChild(li);
  });

  // getResults() gives winner option INDICES, not names — map them back
  // to the option text for display.
  const winnerNames = winnerIndices.map(i => state.options[i]);
  document.getElementById("winners_list").innerHTML = winnerNames.join(", ");
}

// ---------- Rendering ----------

function renderUI() {
  document.getElementById("current_topic").innerHTML = state.topic || "(not set)";
  document.getElementById("current_phase").innerHTML = PHASE[state.phase] || "Unknown";
  document.getElementById("my_role").innerHTML = state.isAdmin ? "Admin" : "Participant";

  // Voting options as radio buttons
  const optionsDiv = document.getElementById("options_list");
  optionsDiv.innerHTML = "";
  state.options.forEach((opt, i) => {
    const checkedAttr = (state.hasVoted && state.myVoteOption === i) ? "checked" : "";
    optionsDiv.innerHTML += `
      <label>
        <input type="radio" name="vote_option" value="${i}" ${checkedAttr}> ${opt}
      </label><br>`;
  });

  if (state.isAdmin) {
    document.getElementById("admin_panel").style.display = "block";
    document.getElementById("participant_panel").style.display = "none";
    renderAdminWarnings();
  } else {
    document.getElementById("admin_panel").style.display = "none";
    document.getElementById("participant_panel").style.display = "block";
    document.getElementById("my_eligibility").innerHTML = state.isEligible ? "Eligible" : "Not eligible";
    document.getElementById("my_vote_status").innerHTML = state.hasVoted
      ? "Already voted for: " + (state.options[state.myVoteOption] || "?")
      : "Not voted yet";
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
  } else if (!state.isEligible) {
    warning = "You have been excluded from this round.";
  } else if (state.hasVoted) {
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
    const topicValue = document.getElementById("new_topic_input").value.trim();
    const optionsRaw = document.getElementById("new_options_input").value;
    const optionsArray = optionsRaw.split(",").map(o => o.trim()).filter(o => o.length > 0);

    const c = get_contract();
    await c.methods.prepareRound(topicValue, optionsArray).send({ from: state.account });
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