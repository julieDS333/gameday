const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function syncCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', syncCanvas);
syncCanvas();

const map = new Map();
// Spawn player at top center of page
const player = new Player(window.innerWidth / 2 - 10, 20);

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    player.jump();
  }
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;
});

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  player.update(keys, map.platforms);

  // Smooth vertical camera tracking following player Y position
  const targetScrollY = player.y - (window.innerHeight / 2);
  window.scrollTo(0, Math.max(0, targetScrollY));

  player.draw(ctx);

  requestAnimationFrame(gameLoop);
}

window.addEventListener('load', () => {
  syncCanvas();
  map.refreshPlatforms();
  gameLoop();
});