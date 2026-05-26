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
const JUMP = -9.5; 
const PLAYER_SIZE = 24;

// --- CONSTANTES DE JUEGO (NAVE Y RAMPAS) ---
const NAVE_SCORE = 15;       // Puntaje para transformarse en nave
const NAVE_GRAV = 0.3;       // Gravedad más suave para la nave
const NAVE_FLY_FORCE = -0.6; // Fuerza de empuje al mantener presionado

let player, obstacles, score, best = 0, speed, gameOver = true, particles, frameCount;
let grounds, stars, loopIniciado = false; 
let playerColor = '#4d96ff';
let isPressing = false;     // Detecta si mantienes presionado el botón

const COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff9ff3','#f368e0','#ff9f43','#0abde3'];
const OBS_COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#f368e0'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function init() {
  const radius = PLAYER_SIZE / 2;
  // Inicializamos con el modo 'bola' por defecto
  player = { x: 100, y: GND - radius, vy: 0, r: radius, grounded: true, mode: 'bola' };
  obstacles = [];
  particles = [];
  score = 0;
  speed = 4;
  frameCount = 0;
  gameOver = false;
  playerColor = '#4d96ff';
  
  overlay.classList.add('hide');
  menu.classList.add('hide');

  grounds = [{ x: 0, w: W + 300, hasRamp: false }];

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
    // Si la plataforma tiene rampa al final, evitamos generar el obstáculo sobre ella
    const obstacleX = lastGround.hasRamp ? lastGround.x + lastGround.w - 120 : W + 20;
    
    if (obstacleX > player.x + 50) {
      const h = 16 + Math.random() * 28;
      const w = 10 + Math.random() * 6;
      obstacles.push({
        x: obstacleX,
        y: GND - h,
        w, h,
        color: rand(OBS_COLORS),
        passed: false
      });
    }
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

// --- GESTIÓN DE ACCIONES (PULSAR Y SOLTAR) ---
function pressStart() {
  isPressing = true;
  if (gameOver || !menu.classList.contains('hide')) return;
  
  // Salto instantáneo solo en modo bola si está tocando el suelo
  if (player.mode === 'bola' && player.grounded) {
    player.vy = JUMP;
    player.grounded = false;
    spawnParticles(player.x, player.y + player.r, playerColor, 8);
    playerColor = rand(COLORS); 
  }
}

function pressEnd() {
  isPressing = false;
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

  // TRANFORMACIÓN: Evolución a nave espacial al alcanzar el puntaje requerido
  if (score >= NAVE_SCORE && player.mode === 'bola') {
    player.mode = 'nave';
    playerColor = '#ffd93d'; 
    spawnParticles(player.x, player.y, '#ffffff', 15);
  }

  // --- DETECCIÓN DE SUELO DINÁMICO (Y RAMPAS) ---
  let currentGndY = GND; 
  let overPlatform = false;

  for (const g of grounds) {
    if (player.x >= g.x && player.x <= g.x + g.w) {
      overPlatform = true;
      
      // Si la plataforma tiene rampa activa en sus últimos 100px
      if (g.hasRamp && player.x >= (g.x + g.w - 100)) {
        const progress = (player.x - (g.x + g.w - 100)) / 100; 
        currentGndY = GND - (progress * 50); // Elevación máxima de 50px
        
        if (player.mode === 'bola' && player.grounded) {
          player.y = currentGndY - player.r;
        }
      }
      break;
    }
  }

  // --- FÍSICAS CORREGIDAS (UNIFICADAS) ---
  if (player.mode === 'nave') {
    player.grounded = false; 
    if (isPressing) {
      player.vy += NAVE_FLY_FORCE; // Empuje propulsor hacia arriba
      if (frameCount % 3 === 0) spawnParticles(player.x - player.r, player.y, '#ff9f43', 2);
    } else {
      player.vy += NAVE_GRAV; // Caída por gravedad ligera
    }
    player.y += player.vy;
    
    // Topes para que la nave no se salga del techo
    if (player.y - player.r < 0) { player.y = player.r; player.vy = 0; }

  } else {
    // Modo Bola: La gravedad se aplica de manera única y limpia aquí si está en el aire
    if (!player.grounded) {
      player.vy += GRAV;
      player.y += player.vy;
    }
  }

  // --- COMPROBACIÓN DE COLISIÓN CON PLATAFORMA ---
  const bottomY = player.y + player.r;

  if (overPlatform) {
    if (bottomY >= currentGndY) {
      // Súper salto automático si la bola sale disparada desde la rampa elevada
      if (player.mode === 'bola' && currentGndY < GND && player.vy >= 0) {
         player.vy = JUMP * 1.2; 
         player.grounded = false;
         spawnParticles(player.x, player.y, '#6bcb77', 12);
      } else {
         player.y = currentGndY - player.r; 
         player.vy = 0;             
         player.grounded = true;
      }
    }
  } else {
    // Si cruza un hueco, el estado en el suelo se cancela limpiamente sin tirones
    player.grounded = false;
  }

  // Caída al vacío definitivo
  if (player.y > H + 50) { 
    triggerGameOver();
    return;
  }

  // Movimiento de estrellas
  for (const s of stars) {
    s.x -= speed * s.speed;
    if (s.x < -10) s.x = W + 10;
  }

  // Desplazamiento y limpieza de plataformas
  for (let i = grounds.length - 1; i >= 0; i--) {
    grounds[i].x -= speed;
    if (grounds[i].x + grounds[i].w < -100) {
      grounds.splice(i, 1);
    }
  }

  // Generador inteligente de terrenos y huecos
  const lastGround = grounds[grounds.length - 1];
  if (!lastGround || (lastGround.x + lastGround.w < W + 150)) {
    const nextX = lastGround ? lastGround.x + lastGround.w : W;
    const makeGap = Math.random() > 0.45 && frameCount > 120;
    const platformWidth = 200 + Math.random() * 200;
    // Las rampas aparecen de forma aleatoria únicamente en el modo Bola
    const hasRamp = player.mode === 'bola' && Math.random() > 0.5 && platformWidth > 250;
    
    if (makeGap) {
      const gapWidth = 50 + Math.random() * 45; 
      grounds.push({ x: nextX + gapWidth, w: platformWidth, hasRamp });
    } else {
      grounds.push({ x: nextX, w: platformWidth, hasRamp });
    }
  }

  const minGap = Math.max(40, 80 - speed * 1.5);
  if (frameCount % Math.floor(minGap) === 0) {
    spawnObstacle();
  }

  // Control de colisión con obstáculos
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

  // Ciclo de vida de partículas
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

  // Fondo gradiente espacial
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#0f0f23');
  skyGrad.addColorStop(0.6, '#1a1a3e');
  skyGrad.addColorStop(1, '#16213e');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Estrellas lejanas
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  for (const s of stars) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- RENDERIZADO DEL SUELO Y LAS RAMPAS ---
  for (const g of grounds) {
    ctx.fillStyle = '#2d2d5e';
    ctx.strokeStyle = '#4d4d8e';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(g.x, GND);
    
    if (g.hasRamp) {
      ctx.lineTo(g.x + g.w - 100, GND);
      ctx.lineTo(g.x + g.w, GND - 50);
      ctx.lineTo(g.x + g.w, H);
      ctx.lineTo(g.x, H);
    } else {
      ctx.lineTo(g.x + g.w, GND);
      ctx.lineTo(g.x + g.w, H);
      ctx.lineTo(g.x, H);
    }
    ctx.closePath();
    ctx.fill();
    
    // Línea brillante superior del camino
    ctx.beginPath();
    ctx.moveTo(g.x, GND);
    if (g.hasRamp) {
      ctx.lineTo(g.x + g.w - 100, GND);
      ctx.lineTo(g.x + g.w, GND - 50);
    } else {
      ctx.lineTo(g.x + g.w, GND);
    }
    ctx.stroke();
  }

  // Partículas en pantalla
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // Renderizado de obstáculos neón
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

  // --- RE-DISEÑO DEL JUGADOR (BOLA VS NAVE) ---
  ctx.shadowColor = playerColor;
  ctx.shadowBlur = 20;

  if (player.mode === 'nave') {
    // Aspecto de Cohete espacial geométrico futurista
    ctx.fillStyle = playerColor;
    ctx.beginPath();
    ctx.moveTo(player.x + player.r, player.y); 
    ctx.lineTo(player.x - player.r, player.y - player.r + 4); 
    ctx.lineTo(player.x - player.r + 6, player.y); 
    ctx.lineTo(player.x - player.r, player.y + player.r - 4); 
    ctx.closePath();
    ctx.fill();

    // Ventana/Cabina brillante de la nave
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(player.x + 2, player.y - 1, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Aspecto original de la Bola
    const pg = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, player.r);
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
  }

  ctx.shadowBlur = 0;

  // Interfaz Gráfica (UI)
  ctx.fillStyle = '#8899bb';
  ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`⭐ ${score}`, 15, 32);
  
  // Tag dinámico del modo actual
  ctx.fillStyle = player.mode === 'nave' ? '#ffd93d' : '#4d96ff';
  ctx.font = 'bold 11px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(player.mode === 'nave' ? '🚀 MODO NAVE' : '🔵 MODO BOLA', 15, 52);

  ctx.fillStyle = '#556688';
  ctx.font = '12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`⚡ ${speed.toFixed(1)}`, 15, 70);
  
  if (best > 0) {
    ctx.fillStyle = '#ffd93d';
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`🏆 ${best}`, 15, 88);
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

// --- CAPTURA DE ACCIONES DE ENTRADA COMPLETAS ---
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (!isPressing) pressStart();
  }
});
document.addEventListener('keyup', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    pressEnd();
  }
});

canvas.addEventListener('mousedown', e => {
  e.preventDefault();
  pressStart();
});
document.addEventListener('mouseup', pressEnd);

canvas.addEventListener('touchstart', e => { 
  e.preventDefault(); 
  pressStart(); 
}, { passive: false });
document.addEventListener('touchend', pressEnd);

jugarBtn.addEventListener('click', e => {
  e.stopPropagation();
  best = parseInt(localStorage.getItem('bestJump')) || 0;
  init();
  if (!loopIniciado) {
    loopIniciado = true;
    loop();
  }
});

rBtn.addEventListener('click', e => {
  e.stopPropagation();
  init();
});
