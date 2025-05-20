// Element references
const board       = document.querySelector('.game-board');
const startBtn    = document.getElementById('start-btn');
const resetBtn    = document.getElementById('reset-btn');
const powerBtn    = document.getElementById('power-btn');
const diffSelect  = document.getElementById('difficulty');
const themeSelect = document.getElementById('theme');
const clicksEl    = document.getElementById('clicks');
const matchedEl   = document.getElementById('matched');
const leftEl      = document.getElementById('left');
const totalEl     = document.getElementById('total');
const timerEl     = document.getElementById('timer');
const messageEl   = document.getElementById('message');

// Game state variables
let firstCard, secondCard;
let hasFlipped = false, lockBoard = false;
let clickCount = 0, pairsMatched = 0, pairsLeft = 0, totalPairs = 0;
let timer, timeLeft = 0;
const REVEAL_TIME = 2000;
const COOLDOWN    = 30; // seconds

// Card back image
let backSprite = './back.webp';

// Apply a selected theme
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

// Generate unique random Pokémon IDs
function getRandomIds(n, max = 898) {
  const set = new Set();
  while (set.size < n) set.add(Math.floor(Math.random() * max) + 1);
  return [...set];
}

// Fetch Pokémon data by ID
async function fetchPokemon(id) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  const js  = await res.json();
  return {
    name: js.name,
    img: js.sprites.other['official-artwork'].front_default
         || js.sprites.front_default
  };
}

// Generate a shuffled deck of Pokémon card pairs
async function generateDeck(pairCount) {
  const ids   = getRandomIds(pairCount);
  const pokes = await Promise.all(ids.map(fetchPokemon));
  return pokes.flatMap(p => ([{...p},{...p}])); // Each pair has identical data
}

// Shuffle the array in-place using Fisher-Yates algorithm
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Update click, match, and remaining statistics on UI
function updateStats() {
  clicksEl.textContent  = clickCount;
  matchedEl.textContent = pairsMatched;
  leftEl.textContent    = pairsLeft;
  totalEl.textContent   = totalPairs;
}

// Start countdown timer for the game
function startTimer() {
  timerEl.textContent = timeLeft;
  timer = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 0) endGame(false);
  }, 1000);
}

// End game and show result message
function endGame(won) {
  clearInterval(timer);
  lockBoard = true;

  const messageTxt = won ? '🎉 You Win!' : '💀 Game Over';
  const messageEl = document.getElementById('message');

  if (messageEl) {
    messageEl.innerHTML = `<div class="message-text">${messageTxt}</div>`;
    messageEl.classList.remove('hidden');
    requestAnimationFrame(() => messageEl.classList.add('show'));
  }
}

// Reset the flipped card tracking
function resetFlip() {
  hasFlipped = false;
  lockBoard = false;
  firstCard = null;
  secondCard = null;
}

// Check if the selected pair is a match
function checkMatch() {
  const isMatch = firstCard.dataset.name === secondCard.dataset.name;
  if (isMatch) {
    firstCard.classList.add('match');
    secondCard.classList.add('match');
    firstCard.removeEventListener('click', onCardClick);
    secondCard.removeEventListener('click', onCardClick);
    pairsMatched++;
    pairsLeft--;
    updateStats();
    if (pairsMatched === totalPairs) endGame(true);
    resetFlip();
  } else {
    setTimeout(() => {
      firstCard.classList.remove('flip');
      secondCard.classList.remove('flip');
      resetFlip();
    }, 800);
  }
}

// Handle card click events
function onCardClick(e) {
  if (lockBoard) return;
  const card = e.currentTarget;
  if (card === firstCard || card.classList.contains('match')) return;
  card.classList.add('flip');

  if (!hasFlipped) {
    hasFlipped = true;
    firstCard = this;
    return;
  } 
  
  secondCard = card;
  lockBoard = true;
  clickCount++;
  updateStats();
  checkMatch();
}

// Build and display the game board with cards
function renderBoard(deck) {
  board.innerHTML = '';
  deck.forEach(data => {
    const card = document.createElement('div');
    card.className    = 'card';
    card.dataset.name = data.name;
    card.innerHTML    = `
      <div class="card-inner">
        <div class="card-front">
          <img src="${data.img}" alt="${data.name}">
        </div>
        <div class="card-back">
          <img src="${backSprite}" alt="standard-balls">
        </div>
      </div>`;
    card.addEventListener('click', onCardClick);
    board.append(card);
  });
}

// Reveal all unmatched cards briefly as a power-up
function handlePowerUp() {
  powerBtn.disabled = true;
  const all = board.querySelectorAll('.card');
  all.forEach(c => { if (!c.classList.contains('match')) c.classList.add('flip'); });

  setTimeout(() => {
    all.forEach(c => { if (!c.classList.contains('match')) c.classList.remove('flip'); });
    let cd   = COOLDOWN;
    const txt = powerBtn.textContent;
    const iv = setInterval(() => {
      cd--;
      powerBtn.textContent = `Reveal (${cd}s)`;
      if (cd <= 0) {
        clearInterval(iv);
        powerBtn.textContent = txt;
        powerBtn.disabled = false;
      }
    }, 1000);
  }, REVEAL_TIME);
}

// Initialize and start a new game
async function startGame() {
  clickCount = pairsMatched = 0;

  const diff = diffSelect.value;
  if (diff === 'easy')       { totalPairs = 4;  timeLeft = 60;  }
  else if (diff === 'medium'){ totalPairs = 8;  timeLeft = 120; }
  else                       { totalPairs = 12; timeLeft = 180; }
  
  pairsLeft = totalPairs;
  updateStats();

  startBtn.disabled = true;
  resetBtn.disabled = false;
  powerBtn.disabled = false;

  const deck = await generateDeck(totalPairs);
  shuffle(deck);
  renderBoard(deck);
  startTimer();
}

// Reset game state and UI
function resetGame() {
  clearInterval(timer);
  board.innerHTML = '';
  clickCount = pairsMatched = pairsLeft = totalPairs = 0;
  timeLeft = 0;
  updateStats();
  timerEl.textContent = '0';

  startBtn.disabled = false;
  resetBtn.disabled = true;
  powerBtn.disabled = true;

  const messageEl = document.getElementById('message');
  if (messageEl) {
    messageEl.classList.add('hidden');
    messageEl.classList.remove('show');
  }
}

// Set up initial UI and event listeners
function init() {
  const saved = localStorage.getItem('theme') || 'light';
  themeSelect.value = saved;
  applyTheme(saved);
  themeSelect.addEventListener('change', () => applyTheme(themeSelect.value));

  startBtn.addEventListener('click', startGame);
  resetBtn.addEventListener('click', resetGame);
  powerBtn.addEventListener('click', handlePowerUp);
}

// Initialize when DOM is ready
if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);

// Dismiss message popup when clicked
document.addEventListener('DOMContentLoaded', () => {
  const messageEl = document.getElementById('message');
  if (messageEl) {
    messageEl.addEventListener('click', () => {
      messageEl.classList.add('hidden');
      messageEl.classList.remove('show');
    });
  }
});
