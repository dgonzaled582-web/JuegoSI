const SIZE = 4;
let grid = [];
let score = 0;
let bestScore = parseInt(localStorage.getItem('best2048')) || 0;
let gameOver = false;
let won = false;
let keepPlaying = false;
let tiles = [];

const gridEl = document.getElementById('grid');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const gameOverOverlay = document.getElementById('game-over-overlay');
const winOverlay = document.getElementById('win-overlay');
const finalScoreMsg = document.getElementById('final-score-msg');

function init() {
  bestScoreEl.textContent = bestScore;
  setupGrid();
  addRandomTile();
  addRandomTile();
  render();
  updateScore();
}

function setupGrid() {
  gridEl.innerHTML = '';
  tiles = [];
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

  const cellSize = `calc((100% - ${(SIZE - 1) * 12}px) / ${SIZE})`;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.width = cellSize;
      cell.style.height = cellSize;
      gridEl.appendChild(cell);
    }
  }
}

function addRandomTile() {
  const empty = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) empty.push({ r, c });
    }
  }
  if (empty.length === 0) return;

  const { r, c } = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  tiles.push({ r, c, value: grid[r][c], merged: false, isNew: true });
}

function render() {
  tiles.forEach(t => {
    const existing = document.querySelector(`.tile[data-r="${t.r}"][data-c="${t.c}"]`);
    if (existing) existing.remove();
  });

  const gaps = 12;
  const padding = 12;
  const gridElRect = gridEl.getBoundingClientRect();
  const containerRect = gridEl.parentElement.getBoundingClientRect();
  const totalGaps = (SIZE - 1) * gaps;
  const totalSize = gridElRect.width || (containerRect.width - padding * 2);
  const tileSize = (totalSize - totalGaps) / SIZE;

  tiles.forEach(t => {
    const div = document.createElement('div');
    div.className = `tile tile-${t.value >= 2048 ? (t.value > 2048 ? 'super' : '2048') : t.value}`;
    if (t.isNew) div.classList.add('tile-new');
    if (t.merged) div.classList.add('tile-merged');
    div.textContent = t.value;
    div.style.width = `${tileSize}px`;
    div.style.height = `${tileSize}px`;
    div.style.left = `${padding + t.c * (tileSize + gaps)}px`;
    div.style.top = `${padding + t.r * (tileSize + gaps)}px`;
    div.dataset.r = t.r;
    div.dataset.c = t.c;
    gridEl.parentElement.appendChild(div);
  });
}

function updateScore() {
  scoreEl.textContent = score;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('best2048', bestScore);
    bestScoreEl.textContent = bestScore;
  }
}

function slideRow(row) {
  let arr = row.filter(v => v !== 0);
  let merged = [];
  let scoreGain = 0;

  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      scoreGain += arr[i];
      arr[i + 1] = 0;
      merged.push(i);
    }
  }

  arr = arr.filter(v => v !== 0);
  while (arr.length < SIZE) arr.push(0);

  return { newRow: arr, scoreGain, merged };
}

function move(direction) {
  if (gameOver || (won && !keepPlaying)) return;

  let moved = false;
  let totalScore = 0;
  const newTiles = [];
  const mergedPositions = new Set();

  for (let i = 0; i < SIZE; i++) {
    let row;

    if (direction === 'left') {
      row = grid[i];
    } else if (direction === 'right') {
      row = [...grid[i]].reverse();
    } else if (direction === 'up') {
      row = grid.map(r => r[i]);
    } else {
      row = grid.map(r => r[i]).reverse();
    }

    const result = slideRow(row);

    if (direction === 'right') result.newRow.reverse();
    if (direction === 'down') result.newRow.reverse();

    for (let j = 0; j < SIZE; j++) {
      let r, c;
      if (direction === 'left') { r = i; c = j; }
      else if (direction === 'right') { r = i; c = SIZE - 1 - j; }
      else if (direction === 'up') { r = j; c = i; }
      else { r = SIZE - 1 - j; c = i; }

      if (grid[r][c] !== result.newRow[j]) moved = true;
      grid[r][c] = result.newRow[j];

      if (result.newRow[j] !== 0) {
        const key = `${r}-${c}`;
        const isMerged = result.merged.includes(
          direction === 'left' ? j :
          direction === 'right' ? SIZE - 1 - j :
          direction === 'up' ? j :
          SIZE - 1 - j
        );
        if (isMerged && !mergedPositions.has(key)) {
          mergedPositions.add(key);
          newTiles.push({ r, c, value: result.newRow[j], merged: true, isNew: false });
        } else if (!mergedPositions.has(key)) {
          newTiles.push({ r, c, value: result.newRow[j], merged: false, isNew: false });
        }
      }
    }

    totalScore += result.scoreGain;
  }

  if (moved) {
    score += totalScore;
    updateScore();
    tiles = newTiles;
    addRandomTile();
    render();
    checkWin();
    if (isGameOver()) {
      gameOver = true;
      finalScoreMsg.textContent = `Puntuación: ${score}`;
      gameOverOverlay.classList.remove('hidden');
    }
  }
}

function isGameOver() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return false;
      if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return false;
      if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return false;
    }
  }
  return true;
}

function checkWin() {
  if (won || keepPlaying) return;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 2048) {
        won = true;
        winOverlay.classList.remove('hidden');
        return;
      }
    }
  }
}

function resetGame() {
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  score = 0;
  gameOver = false;
  won = false;
  keepPlaying = false;
  gameOverOverlay.classList.add('hidden');
  winOverlay.classList.add('hidden');
  updateScore();
  addRandomTile();
  addRandomTile();
  render();
}

document.addEventListener('keydown', e => {
  const map = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down'
  };
  if (map[e.key]) {
    e.preventDefault();
    move(map[e.key]);
  }
});

let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', e => {
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

document.addEventListener('touchend', e => {
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (Math.max(absDx, absDy) < 30) return;

  if (absDx > absDy) {
    move(dx > 0 ? 'right' : 'left');
  } else {
    move(dy > 0 ? 'down' : 'up');
  }
}, { passive: true });

document.getElementById('new-game-btn').addEventListener('click', resetGame);
document.getElementById('restart-btn-overlay').addEventListener('click', resetGame);
document.getElementById('new-game-win-btn').addEventListener('click', resetGame);
document.getElementById('continue-btn').addEventListener('click', () => {
  keepPlaying = true;
  winOverlay.classList.add('hidden');
});

init();
