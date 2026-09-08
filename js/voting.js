/*
  voting.js
  ---------
  Combined: MetaMask connection + contract config + voting logic.

  Design notes:
  - BOTH the Admin panel and Participant panel are ALWAYS visible to
    everyone, regardless of role. Per the assignment spec, restricted
    action elements must stay visible/clickable during the demo so the
    contract's own onlyAdmin/require() checks can be tested and shown
    failing — the UI's job is only to show a WARNING next to a
    restricted action, never to hide or disable it.
  - Each contract read in refreshState() is wrapped in its own
    try/catch. If one call reverts (e.g. getMyStatus() before any round
    has ever been prepared), the rest of the page still renders with
    whatever data succeeded, instead of the whole page staying blank.

  NOTE on phase() numbering: the ABI only tells us `phase` returns a
  `DecisionVotingPlatform.Phase` enum as uint8 — it doesn't tell us the
  order of the enum values. This assumes the natural declaration order:
    0 = NotPrepared, 1 = VotingOpen, 2 = VotingEnded, 3 = ResultsRevealed
  Confirm this against your partner's Solidity `enum Phase { ... }`
  declaration and fix PHASE below if the order is different.
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
const CONTRACT_ADDRESS = "0xd36654c114476F0246cB4DD6937511b2D3e7e076";

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
  adminAddress: null,
  isAdmin: false,
  phase: 0,
  topic: "",
  options: [],
  isEligible: true,
  hasVoted: false,
  myVoteOption: null,
  statusError: null // set if getMyStatus() itself reverted
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
  state.account = await get_current_eth_address();
  await refreshState();

  // Re-check everything whenever the user switches accounts/network in MetaMask.
  window.ethereum.on("accountsChanged", refreshState);
  window.ethereum.on("chainChanged", () => window.location.reload());
}

// Every read is wrapped individually — a revert on one call (e.g.
// getMyStatus() before any round exists) must not stop the rest of the
// page (and the always-visible buttons) from rendering.
async function refreshState() {
  const c = get_contract();
  state.account = await get_current_eth_address();
  state.statusError = null;

  try {
    state.adminAddress = await c.methods.admin().call();
  } catch (e) { console.log("admin() failed:", e); }

  try {
    state.phase = parseInt(await c.methods.phase().call());
  } catch (e) { console.log("phase() failed:", e); }

  try {
    state.topic = await c.methods.topic().call();
  } catch (e) { console.log("topic() failed:", e); }

  try {
    state.options = await c.methods.getOptions().call();
  } catch (e) { console.log("getOptions() failed:", e); }

  try {
    const myStatus = await c.methods.getMyStatus().call();
    state.isAdmin = myStatus.isAdmin;
    state.isEligible = myStatus.isEligible;
    state.hasVoted = myStatus.hasVotedInRound;
    state.myVoteOption = parseInt(myStatus.myVoteOption);
  } catch (e) {
    console.log("getMyStatus() failed:", e);
    // Fall back to comparing addresses directly so role still shows
    // even if the rest of getMyStatus() reverts (e.g. no round yet).
    state.isAdmin = state.adminAddress
      ? state.adminAddress.toLowerCase() === state.account.toLowerCase()
      : false;
    state.isEligible = true;
    state.hasVoted = false;
    state.myVoteOption = null;
    state.statusError = "Could not read full voting status (contract may revert until a round is prepared): " + (e.message || e);
  }

  try {
    state.excludedVoters = await c.methods.getExcludedVoters().call();
  } catch (e) {
    console.log("getExcludedVoters() failed:", e);
    state.excludedVoters = [];
  }

  if (state.phase === 3) {
    try {
      const result = await c.methods.getResults().call();
      state.resultCounts = result.counts || result[0];
      state.resultWinnerIndices = (result.winners || result[1]).map(w => parseInt(w));
    } catch (e) {
      console.log("getResults() failed:", e);
      state.resultCounts = [];
      state.resultWinnerIndices = [];
    }
  }

  renderUI();
}

// ---------- Rendering ----------

function renderUI() {
  document.getElementById("current_topic").innerHTML = state.topic || "(not set)";
  document.getElementById("current_phase").innerHTML = PHASE[state.phase] || "Unknown";
  document.getElementById("my_role").innerHTML = state.isAdmin ? "Admin" : "Participant";

  document.getElementById("actionError").innerHTML = state.statusError || "";

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

  // Both panels are ALWAYS visible/clickable to everyone — role only
  // changes which warnings show, never what's on screen.
  document.getElementById("my_eligibility").innerHTML = state.isEligible ? "Eligible" : "Not eligible";
  document.getElementById("my_vote_status").innerHTML = state.hasVoted
    ? "Already voted for: " + (state.options[state.myVoteOption] || "?")
    : "Not voted yet";

  const excluded = state.excludedVoters || [];
  document.getElementById("excluded_list").innerHTML = excluded.length ? excluded.join(", ") : "(none)";

  document.getElementById("results_section").style.display = (state.phase === 3) ? "block" : "none";
  if (state.phase === 3) {
    const list = document.getElementById("results_list");
    list.innerHTML = "";
    state.options.forEach((opt, i) => {
      const li = document.createElement("li");
      const count = (state.resultCounts && state.resultCounts[i]) || 0;
      li.innerHTML = opt + ": " + count + " vote(s)";
      list.appendChild(li);
    });
    const winnerNames = (state.resultWinnerIndices || []).map(i => state.options[i]);
    document.getElementById("winners_list").innerHTML = winnerNames.join(", ");
  }

  renderWarnings();
}

function renderWarnings() {
  // Admin-only actions: warn any non-admin that these are restricted,
  // regardless of phase. Admin still gets the phase-based warnings.
  setWarning("prepare_round_warning", adminWarning() ||
    (state.phase === 1 ? "A voting round is already open — end it before preparing a new one." : ""));

  setWarning("end_voting_warning", adminWarning() ||
    (state.phase !== 1 ? "Voting is not currently open." : ""));

  setWarning("reveal_results_warning", adminWarning() ||
    (state.phase !== 2 ? "Voting must be ended before results can be revealed." : ""));

  setWarning("exclude_warning", adminWarning());
  setWarning("reinstate_warning", adminWarning());

  // Participant action: Admin is not permitted to vote at all.
  let voteWarning = "";
  if (state.isAdmin) {
    voteWarning = "Admin accounts are not permitted to vote.";
  } else if (state.phase !== 1) {
    voteWarning = "Voting is not currently open.";
  } else if (!state.isEligible) {
    voteWarning = "You have been excluded from this round.";
  } else if (state.hasVoted) {
    voteWarning = "You have already voted this round.";
  }
  setWarning("cast_vote_warning", voteWarning);
}

function adminWarning() {
  return state.isAdmin ? "" : "Admin only — the contract will reject this from a non-admin account.";
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
// These stay callable by anyone in the UI — the contract's onlyAdmin
// modifier is what actually enforces the restriction and returns the
// error shown in showError() when a non-admin tries.

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