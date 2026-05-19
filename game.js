const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu');
const overlay = document.getElementById('overlay');
const oh = document.getElementById('oh');
const os = document.getElementById('os');
const obest = document.getElementById('obest');
const rBtn = document.getElementById('r');
const jugarBtn = document.getElementById('jugar');

const W = 600, H = 400;
canvas.width = W;
canvas.height = H;

const GND = H - 60;
const GRAV = 0.6;
const JUMP = -9;
const PLAYER_SIZE = 30;

let player, obstacles, score, best, speed, gameOver, particles, frameCount, groundX;

const COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff9ff3','#f368e0','#ff9f43','#0abde3'];
const OBS_COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#f368e0'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function init() {
  player = { x: 100, y: GND - PLAYER_SIZE, vy: 0, r: PLAYER_SIZE / 2, alive: true };
  obstacles = [];
  particles = [];
  score = 0;
  speed = 4;
  frameCount = 0;
  groundX = 0;
  gameOver = false;
  overlay.classList.add('hide');
}

function spawnObstacle() {
  const h = 20 + Math.random() * 40;
  const w = 15 + Math.random() * 12;
  obstacles.push({
    x: W + 20,
    y: GND - h,
    w, h,
    color: rand(OBS_COLORS),
    passed: false
  });
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6 - 2,
      life: 1,
      decay: 0.015 + Math.random() * 0.02,
      size: 2 + Math.random() * 4,
      color
    });
  }
}

function jump() {
  if (gameOver) return;
  if (player.y >= GND - PLAYER_SIZE - 1) {
    player.vy = JUMP;
    spawnParticles(player.x, GND, '#ffd93d', 8);
  }
}

function update() {
  if (gameOver) return;
  frameCount++;

  player.vy += GRAV;
  player.y += player.vy;
  if (player.y > GND - PLAYER_SIZE) {
    player.y = GND - PLAYER_SIZE;
    player.vy = 0;
  }

  groundX -= speed;
  if (groundX <= -40) groundX += 40;

  if (frameCount % Math.max(30, 90 - speed * 3) === 0) {
    spawnObstacle();
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.x -= speed;

    if (!o.passed && o.x + o.w < player.x) {
      o.passed = true;
      score++;
      if (score % 5 === 0 && speed < 10) speed += 0.5;
    }

    if (o.x + o.w < -20) {
      obstacles.splice(i, 1);
      continue;
    }

    const px = player.x - player.r;
    const py = player.y;
    const pr = player.r;
    if (px + pr > o.x && px - pr < o.x + o.w && py + pr > o.y && py - pr < o.y + o.h) {
      gameOver = true;
      spawnParticles(player.x, player.y, '#ff6b6b', 20);
      if (score > best) {
        best = score;
        localStorage.setItem('bestJump', best);
      }
      oh.textContent = 'Game Over';
      os.textContent = `Puntaje: ${score}`;
      obest.textContent = `Mejor: ${best}`;
      overlay.classList.remove('hide');
      return;
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i, 1); }
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#0f0f23');
  skyGrad.addColorStop(0.6, '#1a1a3e');
  skyGrad.addColorStop(1, '#16213e');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 20; i++) {
    const sx = (i * 40 + groundX) % (W + 40);
    const sw = 20 + Math.sin(i * 1.7 + frameCount * 0.02) * 5;
    ctx.fillStyle = `rgba(255,255,255,${0.03 + Math.sin(i * 2.3) * 0.015})`;
    ctx.fillRect(sx, GND, 20, H - GND);
  }

  ctx.fillStyle = '#2d2d5e';
  ctx.fillRect(0, GND, W, H - GND);
  ctx.strokeStyle = '#4d4d8e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GND);
  ctx.lineTo(W, GND);
  ctx.stroke();

  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  for (const o of obstacles) {
    ctx.shadowColor = o.color;
    ctx.shadowBlur = 12;
    const grad = ctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y);
    grad.addColorStop(0, o.color);
    grad.addColorStop(1, lighten(o.color, 40));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.rect(o.x, o.y, o.w, o.h);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.shadowColor = '#4d96ff';
  ctx.shadowBlur = 20;
  const pg = ctx.createRadialGradient(
    player.x, player.y, 2,
    player.x, player.y, player.r
  );
  pg.addColorStop(0, '#74b9ff');
  pg.addColorStop(1, '#4d96ff');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#a29bfe';
  ctx.beginPath();
  ctx.arc(player.x - 5, player.y - 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a29bfe';
  ctx.beginPath();
  ctx.arc(player.x + 5, player.y - 4, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#8899bb';
  ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`⭐ ${score}`, 15, 32);
  if (best > 0) {
    ctx.fillStyle = '#556688';
    ctx.font = '14px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`Mejor: ${best}`, 15, 52);
  }
}

function lighten(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, r + amt)},${Math.min(255, g + amt)},${Math.min(255, b + amt)})`;
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    jump();
  }
});

canvas.addEventListener('click', jump);
canvas.addEventListener('touchstart', e => { e.preventDefault(); jump(); }, { passive: false });

jugarBtn.addEventListener('click', () => {
  menu.classList.add('hide');
  best = parseInt(localStorage.getItem('bestJump')) || 0;
  init();
  loop();
});

rBtn.addEventListener('click', () => {
  init();
});
