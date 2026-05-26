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
const GRAV = 0.4; 
const JUMP = -8.5; 
const PLAYER_SIZE = 24;

let player, obstacles, score, best = 0, speed, gameOver = true, particles, frameCount;
let grounds, stars, loopIniciado = false; 
let playerColor = '#4d96ff';

const COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff9ff3','#f368e0','#ff9f43','#0abde3'];
const OBS_COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#f368e0'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function init() {
  const radius = PLAYER_SIZE / 2;
  player = { x: 100, y: GND - radius, vy: 0, r: radius };
  obstacles = [];
  particles = [];
  score = 0;
  speed = 4;
  frameCount = 0;
  gameOver = false;
  playerColor = '#4d96ff';
  
  overlay.classList.add('hide');
  menu.classList.add('hide');

  grounds = [{ x: 0, w: W + 300 }];

  stars = [];
  for (let i = 0; i < 40; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * (GND - 50),
      size: 1 + Math.random() * 2,
      speed: 0.2 + Math.random() * 0.8
    });
  }
}

function spawnObstacle() {
  const lastGround = grounds[grounds.length - 1];
  if (lastGround && lastGround.x + lastGround.w > W) {
    const h = 16 + Math.random() * 28;
    const w = 10 + Math.random() * 6;
    obstacles.push({
      x: W + 20,
      y: GND - h,
      w, h,
      color: rand(OBS_COLORS),
      passed: false
    });
  }
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
  if (gameOver || !menu.classList.contains('hide')) return;
  
  // Tolerancia física limpia: salta si su velocidad vertical está quieta
  if (Math.abs(player.vy) < 0.01) {
    player.vy = JUMP;
    spawnParticles(player.x, player.y + player.r, playerColor, 8);
    playerColor = rand(COLORS); 
  }
}

function triggerGameOver() {
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
}

function update() {
  if (gameOver) return;
  frameCount++;

  player.vy += GRAV;
  player.y += player.vy;

  let overPlatform = false;
  for (const g of grounds) {
    if (player.x >= g.x && player.x <= g.x + g.w) {
      overPlatform = true;
      break;
    }
  }

  const bottomY = player.y + player.r;

  if (overPlatform && bottomY >= GND && player.vy >= 0) {
    player.y = GND - player.r; 
    player.vy = 0;             
  } 
  else if (player.y > H + 50) { 
    triggerGameOver();
    return;
  }

  for (const s of stars) {
    s.x -= speed * s.speed;
    if (s.x < -10) s.x = W + 10;
  }

  for (let i = grounds.length - 1; i >= 0; i--) {
    grounds[i].x -= speed;
    if (grounds[i].x + grounds[i].w < -50) {
      grounds.splice(i, 1);
    }
  }

  const lastGround = grounds[grounds.length - 1];
  if (!lastGround || (lastGround.x + lastGround.w < W + 150)) {
    const nextX = lastGround ? lastGround.x + lastGround.w : W;
    const makeGap = Math.random() > 0.45 && frameCount > 120;
    
    if (makeGap) {
      const gapWidth = 50 + Math.random() * 45; 
      const platformWidth = 180 + Math.random() * 200;
      grounds.push({ x: nextX + gapWidth, w: platformWidth });
    } else {
      const platformWidth = 180 + Math.random() * 200;
      grounds.push({ x: nextX, w: platformWidth });
    }
  }

  const minGap = Math.max(40, 80 - speed * 1.5);
  if (frameCount % Math.floor(minGap) === 0) {
    spawnObstacle();
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.x -= speed;

    if (!o.passed && o.x + o.w < player.x - player.r) {
      o.passed = true;
      score++;
      speed += 0.06; 
    }

    if (o.x + o.w < -40) {
      obstacles.splice(i, 1);
      continue;
    }

    const cx = player.x, cy = player.y, r = player.r;
    const nearX = Math.max(o.x, Math.min(cx, o.x + o.w));
    const nearY = Math.max(o.y, Math.min(cy, o.y + o.h));
    const dx = cx - nearX, dy = cy - nearY;
    
    if (dx * dx + dy * dy < r * r) {
      triggerGameOver();
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

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  for (const s of stars) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const g of grounds) {
    ctx.fillStyle = '#2d2d5e';
    ctx.fillRect(g.x, GND, g.w, H - GND);
    
    ctx.strokeStyle = '#4d4d8e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x, GND);
    ctx.lineTo(g.x + g.w, GND);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let step = 0; step < g.w; step += 30) {
      ctx.fillRect(g.x + step, GND, 10, H - GND);
    }
  }

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

  ctx.shadowColor = playerColor;
  ctx.shadowBlur = 20;
  const pg = ctx.createRadialGradient(
    player.x, player.y, 2,
    player.x, player.y, player.r
  );
  pg.addColorStop(0, '#ffffff');
  pg.addColorStop(1, playerColor);
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(player.x - 3, player.y - 2, 3, 0, Math.PI * 2);
  ctx.arc(player.x + 5, player.y - 2, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#8899bb';
  ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`⭐ ${score}`, 15, 32);
  ctx.fillStyle = '#556688';
  ctx.font = '12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`⚡ ${speed.toFixed(1)}`, 15, 50);
  if (best > 0) {
    ctx.fillStyle = '#ffd93d';
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`🏆 ${best}`, 15, 68);
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
canvas.addEventListener('touchstart', e => { 
  e.preventDefault(); 
  jump(); 
}, { passive: false });

jugarBtn.addEventListener('click', () => {
  best = parseInt(localStorage.getItem('bestJump')) || 0;
  init();
  if (!loopIniciado) {
    loopIniciado = true;
    loop();
  }
});

rBtn.addEventListener('click', () => {
  init();
});
