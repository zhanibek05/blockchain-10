// ---------- Scores ----------
let userScore = 0;
let computerScore = 0;

// ---------- DOM ----------
const userScore_span = document.getElementById('user-score');
const computerScore_span = document.getElementById('computer-score');
const result_p = document.querySelector('.result > p');
const rock_div = document.getElementById('r');
const paper_div = document.getElementById('p');
const scissors_div = document.getElementById('s');
const connectBtn = document.getElementById('connectBtn');
const walletStatus = document.getElementById('walletStatus');
const betAmountInput = document.getElementById('betAmount');
const onchainInfoSpan = document.getElementById('onchain-info');

// ---------- Blockchain setup ----------
let provider;
let signer;
let contract;

// REPLACE WITH YOUR OWN DEPLOYED CONTRACT ADDRESS
const CONTRACT_ADDRESS = "0x28Da0926c613EFd38F0250a6dA4063c3357E8040";

// Minimal ABI: only `play` and `Played` event
const CONTRACT_ABI = 
[
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "BetTooSmall",
    "type": "error",
    "inputs": []
  },
  {
    "name": "InsufficientContractLiquidity",
    "type": "error",
    "inputs": []
  },
  {
    "name": "NotOwner",
    "type": "error",
    "inputs": []
  },
  {
    "name": "PausedError",
    "type": "error",
    "inputs": []
  },
  {
    "name": "TransferFailed",
    "type": "error",
    "inputs": []
  },
  {
    "name": "ZeroAddress",
    "type": "error",
    "inputs": []
  },
  {
    "name": "Funded",
    "type": "event",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "name": "Paused",
    "type": "event",
    "inputs": [
      {
        "name": "isPaused",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "name": "Played",
    "type": "event",
    "inputs": [
      {
        "name": "player",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "bet",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "playerMove",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum RockPaperScissors.Move"
      },
      {
        "name": "houseMove",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum RockPaperScissors.Move"
      },
      {
        "name": "outcome",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum RockPaperScissors.Outcome"
      },
      {
        "name": "payout",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "name": "Withdrawn",
    "type": "event",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "name": "MIN_BET",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "bankroll",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "fund",
    "type": "function",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "name": "owner",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "paused",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "play",
    "type": "function",
    "inputs": [
      {
        "name": "playerMove",
        "type": "uint8",
        "internalType": "enum RockPaperScissors.Move"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "name": "setPaused",
    "type": "function",
    "inputs": [
      {
        "name": "_paused",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "withdraw",
    "type": "function",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address payable"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "receive",
    "stateMutability": "payable"
  }
]

async function connectWallet() {
    if (!window.ethereum) {
        alert("MetaMask not found. Please install it.");
        return;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        walletStatus.innerText = `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`;
    } catch (err) {
        console.error(err);
        walletStatus.innerText = "Connection failed";
    }
}

// Helper for mapping letters to Move enum values
// Move { Rock=0, Paper=1, Scissors=2 }
function choiceToMove(userChoice) {
    if (userChoice === 'r') return 0;
    if (userChoice === 'p') return 1;
    return 2; // 's'
}

function convertToWord(letter) {
    if (letter === 'r') return "Rock";
    if (letter === 'p') return "Paper";
    return "Scissors";
}

// For reading back houseMove numeric from event into text
function moveIndexToLetter(moveIndex) {
    if (moveIndex === 0) return 'r';
    if (moveIndex === 1) return 'p';
    return 's';
}

function moveIndexToWord(moveIndex) {
    return convertToWord(moveIndexToLetter(moveIndex));
}

// outcome: 0=Lose, 1=Draw, 2=Win
function outcomeIndexToText(outcome) {
    if (outcome === 2) return 'Win';
    if (outcome === 1) return 'Draw';
    return 'Lose';
}

// Local score update depending on outcome
function applyOutcome(userChoiceLetter, houseMoveIndex, outcomeIndex) {
    const houseLetter = moveIndexToLetter(houseMoveIndex);

    if (outcomeIndex === 2) { // Win
        userScore++;
        result_p.innerHTML =
            `${convertToWord(userChoiceLetter)} (you) beats ${moveIndexToWord(houseMoveIndex)} (house). You win!`;
    } else if (outcomeIndex === 0) { // Lose
        computerScore++;
        result_p.innerHTML =
            `${convertToWord(userChoiceLetter)} (you) loses to ${moveIndexToWord(houseMoveIndex)} (house). You lost...`;
    } else {
        result_p.innerHTML =
            `${convertToWord(userChoiceLetter)} (you) equals ${moveIndexToWord(houseMoveIndex)} (house). It's a draw.`;
    }

    userScore_span.innerHTML = userScore;
    computerScore_span.innerHTML = computerScore;
}

// Main game function using blockchain
async function gameOnChain(userChoiceLetter) {
    if (!contract || !signer) {
        alert("Please connect your wallet first.");
        return;
    }

    const move = choiceToMove(userChoiceLetter);

    // Convert betAmount (BNB) to wei
    const betBNB = betAmountInput.value || "0.0001";
    const betWei = ethers.parseEther(betBNB);

    try {
        // Optional: check MIN_BET on-chain
        const minBet = await contract.MIN_BET();
        if (betWei < minBet) {
            alert(`Bet is below MIN_BET. Minimum is ${ethers.formatEther(minBet)} BNB`);
            return;
        }

        onchainInfoSpan.innerText = "Sending transaction...";
        
        // Send transaction
        const tx = await contract.play(move, { value: betWei });

        onchainInfoSpan.innerText = "Waiting for confirmation...";
        const receipt = await tx.wait(); // wait to be mined

        // Find Played event in receipt logs
        let playedEvent = null;
        for (const log of receipt.logs) {
            try {
                const parsed = contract.interface.parseLog(log);
                if (parsed && parsed.name === "Played") {
                    playedEvent = parsed;
                    break;
                }
            } catch (e) {
                // not our event
            }
        }

        if (!playedEvent) {
            onchainInfoSpan.innerText = "No Played event found.";
            return;
        }

        const { bet, playerMove, houseMove, outcome, payout } = playedEvent.args;

        // Update info text
        onchainInfoSpan.innerText =
            `Bet: ${ethers.formatEther(bet)} BNB | ` +
            `House move: ${moveIndexToWord(Number(houseMove))} | ` +
            `Outcome: ${outcomeIndexToText(Number(outcome))} | ` +
            `Payout: ${ethers.formatEther(payout)} BNB`;

        // Update local scores & result text
        applyOutcome(userChoiceLetter, Number(houseMove), Number(outcome));

    } catch (err) {
        console.error(err);
        onchainInfoSpan.innerText = `Error: ${err.message || err}`;
    }
}

// UI wiring
function main() {
    connectBtn.addEventListener('click', connectWallet);

    rock_div.addEventListener('click', () => gameOnChain('r'));
    paper_div.addEventListener('click', () => gameOnChain('p'));
    scissors_div.addEventListener('click', () => gameOnChain('s'));
}

main();
