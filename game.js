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
const GRAV = 0.5;
const JUMP = -8.5;
const PLAYER_SIZE = 24;

let player, obstacles, score, best, speed, gameOver, particles, frameCount;
// Nuevas variables para huecos y decoración
let grounds, stars; 
let playerColor = '#4d96ff'; // Color inicial del jugador

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
  gameOver = false;
  playerColor = '#4d96ff';
  overlay.classList.add('hide');

  // Inicializar plataformas del suelo (empezamos con un suelo continuo al principio)
  grounds = [
    { x: 0, w: W + 200 }
  ];

  // Inicializar estrellas de fondo decorativas
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
  // Solo genera obstáculo si el último suelo cubre la zona de spawn (para evitar obstáculos flotando sin suelo)
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
  if (gameOver) return;
  
  // Verificar si el jugador está tocando alguna plataforma para poder saltar
  let onGround = false;
  const cy = player.y + player.r;
  if (Math.abs(cy - GND) < 2) {
    for (const g of grounds) {
      if (player.x >= g.x && player.x <= g.x + g.w) {
        onGround = true;
        break;
      }
    }
  }

  if (onGround) {
    player.vy = JUMP;
    spawnParticles(player.x, GND, playerColor, 8);
    // CAMBIO DE COLOR AL SALTAR
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

  // Actualizar jugador
  player.vy += GRAV;
  player.y += player.vy;

  // Verificar si el jugador está sobre suelo firme
  let overPlatform = false;
  for (const g of grounds) {
    if (player.x >= g.x && player.x <= g.x + g.w) {
      overPlatform = true;
      break;
    }
  }

  // Si está sobre una plataforma y cae al nivel del suelo, frena
  if (overPlatform && player.y > GND - PLAYER_SIZE && player.vy >= 0) {
    player.y = GND - PLAYER_SIZE;
    player.vy = 0;
  } 
  // SI SE CAE POR UN HUECO
  else if (player.y > H + 50) { 
    triggerGameOver();
    return;
  }

  // Actualizar estrellas de fondo (Decoración)
  for (const s of stars) {
    s.x -= speed * s.speed; // Efecto paralaje
    if (s.x < -10) s.x = W + 10;
  }

  // Manejo de Plataformas (Suelo con huecos)
  for (let i = grounds.length - 1; i >= 0; i--) {
    grounds[i].x -= speed;
    if (grounds[i].x + grounds[i].w < -50) {
      grounds.splice(i, 1);
    }
  }

  // Generar nuevo suelo de forma aleatoria
  const lastGround = grounds[grounds.length - 1];
  if (!lastGround || (lastGround.x + lastGround.w < W + 150)) {
    const nextX = lastGround ? lastGround.x + lastGround.w : W;
    const makeGap = Math.random() > 0.45 && frameCount > 100; // No hacer huecos al puro principio
    
    if (makeGap) {
      const gapWidth = 60 + Math.random() * 50; // Ancho del hueco
      const platformWidth = 150 + Math.random() * 200; // Ancho de la siguiente plataforma
      grounds.push({
        x: nextX + gapWidth,
        w: platformWidth
      });
    } else {
      // Si no hay hueco, simplemente extendemos o pegamos otra plataforma continua
      const platformWidth = 150 + Math.random() * 200;
      grounds.push({
        x: nextX,
        w: platformWidth
      });
    }
  }

  // Spawn Obstáculos (Ajustado el tiempo basado en velocidad)
  const minGap = Math.max(35, 75 - speed * 1.5);
  if (frameCount % Math.floor(minGap) === 0) {
    spawnObstacle();
  }

  // Actualizar Obstáculos y Colisiones
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.x -= speed;

    if (!o.passed && o.x + o.w < player.x - player.r) {
      o.passed = true;
      score++;
      speed += 0.08;
    }

    if (o.x + o.w < -40) {
      obstacles.splice(i, 1);
      continue;
    }

    // Colisión de círculo con rectángulo
    const cx = player.x, cy = player.y + player.r, r = player.r;
    const nearX = Math.max(o.x, Math.min(cx, o.x + o.w));
    const nearY = Math.max(o.y, Math.min(cy, o.y + o.h));
    const dx = cx - nearX, dy = cy - nearY;
    
    if (dx * dx + dy * dy < r * r) {
      triggerGameOver();
      return;
    }
  }

  // Partículas
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

  // Fondo (Cielo)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#0f0f23');
  skyGrad.addColorStop(0.6, '#1a1a3e');
  skyGrad.addColorStop(1, '#16213e');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // DIBUJAR DECORACIÓN: Estrellas de fondo
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  for (const s of stars) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // DIBUJAR EL SUELO (Segmentado/Plataformas)
  for (const g of grounds) {
    // Relleno de la plataforma
    ctx.fillStyle = '#2d2d5e';
    ctx.fillRect(g.x, GND, g.w, H - GND);
    
    // Línea de neón superior de la plataforma
    ctx.strokeStyle = '#4d4d8e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x, GND);
    ctx.lineTo(g.x + g.w, GND);
    ctx.stroke();

    // Efecto rejilla/líneas decorativas en el suelo activo
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let step = 0; step < g.w; step += 30) {
      ctx.fillRect(g.x + step, GND, 10, H - GND);
    }
  }

  // Partículas
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // Obstáculos
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

  // DIBUJAR JUGADOR (Con su nuevo color dinámico)
  ctx.shadowColor = playerColor;
  ctx.shadowBlur = 20;
  const pg = ctx.createRadialGradient(
    player.x, player.y, 2,
    player.x, player.y, player.r
  );
  pg.addColorStop(0, '#ffffff'); // Centro brillante
  pg.addColorStop(1, playerColor);
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();

  // Ojos del jugador
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(player.x - 4, player.y - 2, 3, 0, Math.PI * 2);
  ctx.arc(player.x + 4, player.y - 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Interfaz de Usuario (UI)
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
