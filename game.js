const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const overlay = document.getElementById('overlay');
const oh = document.getElementById('oh');
const om = document.getElementById('om');
const ob = document.getElementById('ob');
const nextEl = document.getElementById('next');
const aimEl = document.getElementById('aim');

const W = 400, H = 600;
canvas.width = W;
canvas.height = H;

const R = 16, D = R * 2;
const COLS = 10;
const MAX_ROWS = 16;
const TOP = 40;
const ROW_H = Math.floor(R * 1.73);

const COLORS = ['#e94560', '#0f3460', '#16c79a', '#f5a623', '#a855f7'];
let grid = [];
let score = 0;
let shooting = false;
let bullet = null;
let nextColor = '';
let currentColor = '';
let gameOver = false;
let shotCount = 0;
let mouseX = W / 2, mouseY = H;

function odd(r) { return r % 2 !== 0; }
function cols(r) { return odd(r) ? COLS - 1 : COLS; }
function off(r) { return odd(r) ? R : 0; }
function rowStart(r) { return (W - cols(r) * D) / 2; }
function cx(r, c) { return rowStart(r) + c * D + R; }
function cy(r) { return TOP + r * ROW_H + R; }

function snap(x, y) {
  let best = null, bestD = Infinity;
  for (let r = 0; r < MAX_ROWS; r++) {
    for (let c = 0; c < cols(r); c++) {
      if (grid[r] && grid[r][c]) continue;
      const d = Math.hypot(x - cx(r, c), y - cy(r));
      if (d < bestD) { bestD = d; best = { r, c }; }
    }
  }
  return best;
}

function randColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

function init() {
  grid = [];
  for (let r = 0; r < 6; r++) {
    grid[r] = [];
    for (let c = 0; c < cols(r); c++) grid[r][c] = randColor();
  }
  for (let r = 6; r < MAX_ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < cols(r); c++) grid[r][c] = null;
  }
  score = 0; shotCount = 0; gameOver = false; shooting = false; bullet = null;
  scoreEl.textContent = '0';
  currentColor = randColor();
  nextColor = randColor();
  nextEl.style.background = nextColor;
  overlay.classList.add('hide');
}

function neighbors(r, c) {
  const n = [];
  const dirs = odd(r)
    ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]]
    : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < MAX_ROWS && nc >= 0 && nc < cols(nr)) n.push({ r: nr, c: nc });
  }
  return n;
}

function findGroup(r, c, color, visited) {
  const k = `${r},${c}`;
  if (visited.has(k)) return [];
  if (!grid[r] || !grid[r][c] || grid[r][c] !== color) return [];
  visited.add(k);
  let g = [{ r, c }];
  for (const { r: nr, c: nc } of neighbors(r, c)) {
    g = g.concat(findGroup(nr, nc, color, visited));
  }
  return g;
}

function findFloating() {
  const top = new Set();
  const stack = [];
  for (let c = 0; c < cols(0); c++) {
    if (grid[0][c]) { stack.push({ r: 0, c }); top.add(`0,${c}`); }
  }
  while (stack.length) {
    const { r, c } = stack.pop();
    for (const { r: nr, c: nc } of neighbors(r, c)) {
      if (grid[nr][nc]) { const k = `${nr},${nc}`; if (!top.has(k)) { top.add(k); stack.push({ r: nr, c: nc }); } }
    }
  }
  const f = [];
  for (let r = 0; r < MAX_ROWS; r++) {
    for (let c = 0; c < cols(r); c++) {
      if (grid[r][c] && !top.has(`${r},${c}`)) f.push({ r, c });
    }
  }
  return f;
}

function shiftDown() {
  for (let r = MAX_ROWS - 1; r > 0; r--) grid[r] = [...grid[r - 1]];
  grid[0] = [];
  for (let c = 0; c < cols(0); c++) grid[0][c] = null;
}

function place(r, c, color) {
  grid[r][c] = color;
  shotCount++;

  const group = findGroup(r, c, color, new Set());
  if (group.length >= 3) {
    for (const { r: gr, c: gc } of group) { grid[gr][gc] = null; score += 10; }
    const float = findFloating();
    for (const { r: fr, c: fc } of float) { score += 5; grid[fr][fc] = null; }
    scoreEl.textContent = score;
    return;
  }

  let topRow = MAX_ROWS;
  for (let i = 0; i < MAX_ROWS; i++) {
    for (let j = 0; j < cols(i); j++) { if (grid[i][j]) { topRow = i; break; } }
    if (topRow !== MAX_ROWS) break;
  }

  if (topRow <= 1 || shotCount % 8 === 0) {
    shiftDown();
    for (let i = MAX_ROWS - 1; i >= 0; i--) {
      for (let j = 0; j < cols(i); j++) {
        if (grid[i][j] && i >= MAX_ROWS - 2) { gameOver = true; showGO(); return; }
      }
    }
  }
}

function showGO() {
  oh.textContent = 'game over';
  om.textContent = `score: ${score}`;
  overlay.classList.remove('hide');
}

function shoot() {
  if (gameOver || shooting) return;
  const dx = mouseX - W / 2;
  const dy = mouseY - (H - 30);
  const a = Math.atan2(dy, dx);
  const clamped = Math.max(-2.6, Math.min(-0.4, a));
  const speed = 12;
  bullet = { x: W / 2, y: H - 30, vx: Math.cos(clamped) * speed, vy: Math.sin(clamped) * speed, color: currentColor };
  shooting = true;
  currentColor = nextColor;
  nextColor = randColor();
  nextEl.style.background = nextColor;
}

function update() {
  if (!bullet) return;
  bullet.x += bullet.vx;
  bullet.y += bullet.vy;
  if (bullet.x - R <= 0) { bullet.x = R; bullet.vx *= -1; }
  if (bullet.x + R >= W) { bullet.x = W - R; bullet.vx *= -1; }

  if (bullet.y - R <= TOP) {
    const s = snap(bullet.x, bullet.y);
    if (s) { place(s.r, s.c, bullet.color); bullet = null; shooting = false; }
    return;
  }

  for (let r = 0; r < MAX_ROWS; r++) {
    for (let c = 0; c < cols(r); c++) {
      if (!grid[r][c]) continue;
      if (Math.hypot(bullet.x - cx(r, c), bullet.y - cy(r)) < D - 1) {
        const s = snap(bullet.x, bullet.y);
        if (s) { place(s.r, s.c, bullet.color); bullet = null; shooting = false; }
        return;
      }
    }
  }

  if (bullet.y + R >= H) {
    const s = snap(bullet.x, bullet.y);
    if (s) { place(s.r, s.c, bullet.color); bullet = null; shooting = false; }
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  ctx.shadowColor = 'rgba(0,0,0,.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;

  for (let r = 0; r < MAX_ROWS; r++) {
    for (let c = 0; c < cols(r); c++) {
      if (!grid[r][c]) continue;
      const x = cx(r, c), y = cy(r);
      const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, R);
      grad.addColorStop(0, lighten(grid[r][c]));
      grad.addColorStop(1, grid[r][c]);
      ctx.beginPath();
      ctx.arc(x, y, R - 1, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.shadowBlur = 10;
    }
  }

  if (bullet) {
    ctx.shadowBlur = 0;
    const x = bullet.x, y = bullet.y;
    const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, R);
    grad.addColorStop(0, lighten(bullet.color));
    grad.addColorStop(1, bullet.color);
    ctx.beginPath();
    ctx.arc(x, y, R - 1, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 8, H - 30);
  ctx.lineTo(W / 2 + 8, H - 30);
  ctx.lineTo(W / 2, H - 18);
  ctx.closePath();
  ctx.fillStyle = '#e94560';
  ctx.fill();

  const angle = Math.atan2(mouseY - (H - 30), mouseX - (W / 2));
  const clamped = Math.max(-2.6, Math.min(-0.4, angle));
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = 'rgba(255,255,255,.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, H - 25);
  ctx.lineTo(W / 2 + Math.cos(clamped) * 180, (H - 30) + Math.sin(clamped) * 180);
  ctx.stroke();
  ctx.setLineDash([]);

  aimEl.style.transform = `rotate(${clamped}rad)`;
}

function lighten(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, r + 60)},${Math.min(255, g + 60)},${Math.min(255, b + 60)})`;
}

function loop() {
  if (!gameOver) update();
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  const sx = W / r.width, sy = H / r.height;
  mouseX = (e.clientX - r.left) * sx;
  mouseY = (e.clientY - r.top) * sy;
});

canvas.addEventListener('click', shoot);
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0];
  const r = canvas.getBoundingClientRect();
  mouseX = (t.clientX - r.left) * (W / r.width);
  mouseY = (t.clientY - r.top) * (H / r.height);
  shoot();
});
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = e.touches[0];
  const r = canvas.getBoundingClientRect();
  mouseX = (t.clientX - r.left) * (W / r.width);
  mouseY = (t.clientY - r.top) * (H / r.height);
}, { passive: false });

ob.addEventListener('click', () => { init(); loop(); });

init();
loop();
