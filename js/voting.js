// MetaMask connection
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

// Ask the user to connect metamask account if not already connected then returns accounts connected after
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

// Returns currently connected accounts in the console
async function get_connected_account() {
  if (typeof window.ethereum !== 'undefined') {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts[0];
  } else {
    console.error('Valid wallet is not installed!');
    return null;
  }
}

// Gets the metamask balance of the connected user
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

// Gets the network that the connected account is using
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

// Deployed contract address and ABI
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

// Define phase to display 4 different phases
const PHASE = {
  0: "Not Prepared",
  1: "Voting Open",
  2: "Voting Ended",
  3: "Results Revealed"
};

// Define web3 and contract to use later
let web3;
let contract;

// Define state and have everything as default for when the contract is first deployed
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
  excludedVoters: [],
  statusError: null 
};

// Will create the web3 contract object for the first time then after just returns the cached version on later calls
function get_contract() {
  if (!contract) {
    web3 = new Web3(window.ethereum);
    contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
  }
  return contract;
}

// Called once when the webpage is first loaded and sets up 2 listeners
async function init_voting_app() {
  state.account = await get_connected_account();
  await refreshState(); // read all state data

  window.ethereum.on("accountsChanged", refreshState); // reread all state data when account is changed
  window.ethereum.on("chainChanged", () => window.location.reload()); // reloads the page is network is changed
}

// Reread all state variables every call has its own error catch
async function refreshState() {
  const c = get_contract();

  state.account = await get_connected_account(); // checks what address is currently connected
  state.statusError = null; //clears any error being shown

  try {
    state.adminAddress = await c.methods.admin().call(); // just checking that admin is admin
  } catch (e) { console.log("admin() failed:", e); }

  try {
    state.phase = parseInt(await c.methods.phase().call()); // checking what phase the voting is in
  } catch (e) { console.log("phase() failed:", e); }

  try {
    state.topic = await c.methods.topic().call(); // checking the topic for the current round
  } catch (e) { console.log("topic() failed:", e); }

  try {
    state.options = await c.methods.getOptions().call(); // checking the options to vote on in the current round
  } catch (e) { console.log("getOptions() failed:", e); }

  try {
    // gets role, voting eligibility and status of current account then sets the state variables to the corresponding status viables
    // myStatus must be declared before it's used below — using it above its own
    // declaration would throw an error, since it hasn't been assigned yet.
    const myStatus = await c.methods.getMyStatus().call({ from: state.account });
    state.isAdmin = myStatus.isAdmin;
    state.isEligible = myStatus.isEligible;
    state.hasVoted = myStatus.hasVotedInRound;
    state.myVoteOption = parseInt(myStatus.myVoteOption);
  } catch (e) {
    console.log("getMyStatus() failed:", e);
    // If statement to check if the address is admin if something fails
    if (state.adminAddress) {
      state.isAdmin = state.adminAddress.toLowerCase() === state.account.toLowerCase();
    } else {
      state.isAdmin = false;
    }
    // set rest to default values so that the page doesnt stop when there is an error
    state.isEligible = true;
    state.hasVoted = false;
    state.myVoteOption = null;
    state.statusError = "Could not read full voting status (contract may revert until a round is prepared): " + (e.message || e);
  }

  // since only admin can see excluded voter list only shows if user is admin 
  if (state.isAdmin) {
    try {
      state.excludedVoters = await c.methods.getExcludedVoters().call();
    } catch (e) {
      console.log("getExcludedVoters() failed:", e);
      state.excludedVoters = [];
    }
  } else {
    state.excludedVoters = [];
  }

  // only reveals results if in the correct phase
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

  renderUI(); // renders the calls into the platform
}

// Rendering for UI

function renderUI() {
  document.getElementById("current_topic").innerHTML = state.topic || "(not set)";
  document.getElementById("current_phase").innerHTML = PHASE[state.phase] || "Unknown";

  // Was: state.isAdmin ? "Admin" : "Participant"
  if (state.isAdmin) {
    document.getElementById("my_role").innerHTML = "Admin";
  } else {
    document.getElementById("my_role").innerHTML = "Participant";
  }

  document.getElementById("actionError").innerHTML = state.statusError || "";

  // Voting options as radio buttons
  const optionsDiv = document.getElementById("options_list");
  optionsDiv.innerHTML = "";
  state.options.forEach((opt, i) => {
    // Was: (state.hasVoted && state.myVoteOption === i) ? "checked" : ""
    let checkedAttr = "";
    if (state.hasVoted && state.myVoteOption === i) {
      checkedAttr = "checked";
    }
    optionsDiv.innerHTML += `
      <label>
        <input type="radio" name="vote_option" value="${i}" ${checkedAttr}> ${opt}
      </label><br>`;
  });

  // Was: state.isEligible ? "Eligible" : "Not eligible"
  if (state.isEligible) {
    document.getElementById("my_eligibility").innerHTML = "Eligible";
  } else {
    document.getElementById("my_eligibility").innerHTML = "Not eligible";
  }

  // Was: state.hasVoted ? "Already voted for: " + (...) : "Not voted yet"
  if (state.hasVoted) {
    let votedOptionName = state.options[state.myVoteOption];
    if (!votedOptionName) {
      votedOptionName = "?";
    }
    document.getElementById("my_vote_status").innerHTML = "Already voted for: " + votedOptionName;
  } else {
    document.getElementById("my_vote_status").innerHTML = "Not voted yet";
  }

  const excluded = state.excludedVoters || [];
  // Was: excluded.length ? excluded.join(", ") : "(none)"
  if (excluded.length) {
    document.getElementById("excluded_list").innerHTML = excluded.join(", ");
  } else {
    document.getElementById("excluded_list").innerHTML = "(none)";
  }

  renderResultsInto("admin_results_section", "admin_results_list", "admin_winners_list");

  renderWarnings(); // renders warning based on role
}

function renderResultsInto(sectionId, listId, winnersId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  // Was: (state.phase === 3) ? "block" : "none"
  if (state.phase === 3) {
    section.style.display = "block";
  } else {
    section.style.display = "none";
  }
  if (state.phase !== 3) return;

  const list = document.getElementById(listId);
  list.innerHTML = "";
  state.options.forEach((opt, i) => {
    const li = document.createElement("li");
    const count = (state.resultCounts && state.resultCounts[i]) || 0;
    li.innerHTML = opt + ": " + count + " vote(s)";
    list.appendChild(li);
  });

  const winnerNames = (state.resultWinnerIndices || []).map(i => state.options[i]);
  document.getElementById(winnersId).innerHTML = winnerNames.join(", ");
}

function renderWarnings() {
  // Admin-only actions: warn any non-admin that these are restricted,
  // regardless of phase. Admin still gets the phase-based warnings.

  // Was: state.phase === 1 ? "..." : ""
  let prepareRoundPhaseWarning = "";
  if (state.phase === 1) {
    prepareRoundPhaseWarning = "A voting round is already open — end it before preparing a new one.";
  }
  setWarning("prepare_round_warning", adminWarning() || prepareRoundPhaseWarning);

  // Was: state.phase !== 1 ? "..." : ""
  let endVotingPhaseWarning = "";
  if (state.phase !== 1) {
    endVotingPhaseWarning = "Voting is not currently open.";
  }
  setWarning("end_voting_warning", adminWarning() || endVotingPhaseWarning);

  // Was: state.phase !== 2 ? "..." : ""
  let revealResultsPhaseWarning = "";
  if (state.phase !== 2) {
    revealResultsPhaseWarning = "Voting must be ended before results can be revealed.";
  }
  setWarning("reveal_results_warning", adminWarning() || revealResultsPhaseWarning);

  setWarning("exclude_warning", adminWarning());
  setWarning("reinstate_warning", adminWarning());
  setWarning("check_status_warning", adminWarning());

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
  // Was: state.isAdmin ? "" : "Admin only — ..."
  if (state.isAdmin) {
    return "";
  } else {
    return "Admin only — the contract will reject this from a non-admin account.";
  }
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

// Admin actions 
// Allows admin to prepare a new round
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

// Allows admin to reveal results after voting phase has ended
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

// Allows admin to exclude a voter for the current round
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

// Allows admin to reinstate a voter
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

// Allows admin to check specific addresses voting status and eligibility
async function checkParticipantStatus() {
  clearError();
  document.getElementById("participant_status_result").innerHTML = "";
  try {
    const address = document.getElementById("check_status_address_input").value.trim();
    const c = get_contract();
    const result = await c.methods.getParticipantStatus(address).call({ from: state.account });

    let isEligible;
    if (result.isEligible !== undefined) {
      isEligible = result.isEligible;
    } else {
      isEligible = result[0];
    }

    let hasVoted;
    if (result.hasVotedInRound !== undefined) {
      hasVoted = result.hasVotedInRound;
    } else {
      hasVoted = result[1];
    }

    let isEligibleText;
    if (isEligible) {
      isEligibleText = "Yes";
    } else {
      isEligibleText = "No";
    }

    let hasVotedText;
    if (hasVoted) {
      hasVotedText = "Yes";
    } else {
      hasVotedText = "No";
    }

    document.getElementById("participant_status_result").innerHTML =
      address + " — Eligible: " + isEligibleText + ", Voted: " + hasVotedText;
  } catch (error) {
    showError(error);
  }
}

//  Participant actions 

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