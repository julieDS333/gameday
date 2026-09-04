const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function syncCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', syncCanvas);
syncCanvas();

const map = new Map();
const player = new Player(window.innerWidth / 2 - 18, 20);

const GAME_LEVELS = [
  { id: 1, task: 'Summarize the Word Doc', targetApp: 'word', targetPrompt: 'word-summary' },
  { id: 2, task: 'Build a PowerPoint', targetApp: 'pwp', targetPrompt: 'pwp-build' }, 
  { id: 3, task: 'Make the PowerPoint Pretty', targetApp: 'pwp', targetPrompt: 'pwp-pretty' },
  { id: 4, task: 'Draft an email to executives', targetApp: 'outlook', targetPrompt: 'outlook-write' }
];

// --- GAME ENTITIES & OBSTACLES ---

class EmailProjectile {
  constructor(x, y, facingLeft) {
      this.x = x; this.y = y;
      this.w = 64; this.h = 64; // Scaled 2x larger
      this.img = new Image();
      this.img.src = 'assets/email.png';
      
      const speed = 2.5;
      this.vx = facingLeft ? -1.2 : 1.2; 
      this.vy = -speed; 
      this.active = true;
  }
  update(ctx) {
      this.x += this.vx; 
      this.y += this.vy;
      
      const renderX = this.x - window.scrollX;
      const renderY = this.y - window.scrollY;
      const radius = this.w / 2;
      const centerX = renderX + radius;
      const centerY = renderY + radius;

      // Draw Glowing Bubble Container
      ctx.save();
      ctx.shadowColor = 'rgba(239, 68, 68, 0.5)'; 
      ctx.shadowBlur = 14;

      const gradient = ctx.createRadialGradient(centerX - radius * 0.3, centerY - radius * 0.3, 0, centerX, centerY, radius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)'); 
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.stroke();
      ctx.restore();

      // Draw Inner Asset (2x larger)
      if (this.img.complete) {
          const imgSize = 36;
          ctx.drawImage(this.img, centerX - imgSize / 2, centerY - imgSize / 2, imgSize, imgSize);
      }
      
      // Player Collision Check
      if (player.x < this.x + this.w && player.x + player.w > this.x &&
          player.y < this.y + this.h && player.y + player.h > this.y) {
          if (typeof gameManager !== 'undefined') gameManager.takeDamage();
          this.active = false; 
      }
      
      const docHeight = document.documentElement.scrollHeight;
      if (this.y < -50 || this.y > docHeight + 50) {
          this.active = false;
      }
  }
}

class CoffeePickup {
  constructor(x, y) {
      this.x = x; this.y = y;
      this.w = 64; this.h = 64; // Scaled 2x larger
      this.vy = -6; 
      this.vx = (Math.random() - 0.5) * 4;
      this.active = true;
      this.img = new Image();
      this.img.src = 'assets/coffee.png';
  }
  update(ctx, platforms) {
      this.vy += 0.5; 
      this.x += this.vx;
      this.y += this.vy;
      
      platforms.forEach(p => {
         if (this.vy > 0 && this.x + this.w > p.x && this.x < p.x + p.w &&
             this.y + this.h >= p.y && this.y + this.h - this.vy <= p.y + 12) {
             this.y = p.y - this.h;
             this.vy = 0;
             this.vx = 0;
         }
      });

      const renderX = this.x - window.scrollX;
      const renderY = this.y - window.scrollY;
      const radius = this.w / 2;
      const centerX = renderX + radius;
      const centerY = renderY + radius;

      // Draw Glowing Coffee Bubble Container
      ctx.save();
      ctx.shadowColor = 'rgba(234, 179, 8, 0.5)'; 
      ctx.shadowBlur = 14;

      const gradient = ctx.createRadialGradient(centerX - radius * 0.3, centerY - radius * 0.3, 0, centerX, centerY, radius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)'); 
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
      gradient.addColorStop(1, 'rgba(254, 240, 138, 0.4)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.stroke();
      ctx.restore();

      // Draw Inner Coffee Asset (2x larger)
      if (this.img.complete) {
          const imgSize = 40;
          ctx.drawImage(this.img, centerX - imgSize / 2, centerY - imgSize / 2, imgSize, imgSize);
      }

      if (player.x < this.x + this.w && player.x + player.w > this.x &&
          player.y < this.y + this.h && player.y + player.h > this.y) {
          if (typeof gameManager !== 'undefined') {
              if (gameManager.lives < 3) gameManager.lives++;
              gameManager.updateHUD();
          }
          this.active = false; 
      }
  }
}

class ACBlock {
  constructor() {
      this.active = false;
      this.spawnedThisLevel = false;
      this.spawnDelay = 10000;
      this.x = 0; this.y = 0;
      this.w = 55; this.h = 40;
      this.coffees = 1;
      this.hitOffset = 0;
      this.img = new Image();
      this.img.src = 'assets/AC1.png';
  }
  resetSpawnTimer() {
      this.active = false;
      this.spawnedThisLevel = false;
      this.spawnDelay = Math.floor(Math.random() * 40000) + 10000;
  }
  spawn() {
      const valid = map.platforms.filter(p => p.y > 300 && p.w > 50);
      if (valid.length > 0) {
          const p = valid[Math.floor(Math.random() * valid.length)];
          this.x = p.x + p.w / 2 - this.w / 2;
          this.y = p.y - 130; 
          this.active = true;
          this.coffees = gameManager.level >= 3 ? 3 : 1;
      }
  }
  hit() {
      if (this.coffees > 0) {
          this.coffees--;
          this.hitOffset = -10; 
          setTimeout(() => this.hitOffset = 0, 100);
          // Spawn centered 64px coffee bubble
          gameManager.coffees.push(new CoffeePickup(this.x + this.w/2 - 32, this.y - 40));
      }
  }
  update(ctx) {
      if (!this.active) return;
      
      const renderX = this.x - window.scrollX;
      const renderY = this.y + this.hitOffset - window.scrollY;

      if (this.img.complete) {
          ctx.drawImage(this.img, renderX, renderY, this.w, this.h);
          if (this.coffees === 0) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
              ctx.fillRect(renderX, renderY, this.w, this.h);
          }
      }

      if (player.dropTimer === 0 && player.vy >= 0 &&
          player.x + player.w > this.x + 2 && player.x < this.x + this.w - 2 &&
          player.y + player.h >= this.y && player.y + player.h - player.vy <= this.y + 12) {
          player.y = this.y - player.h;
          player.vy = 0;
          player.grounded = true;
      }
      if (player.vy < 0 && 
          player.x + player.w > this.x + 4 && player.x < this.x + this.w - 4 &&
          player.y <= this.y + this.h && player.y - player.vy >= this.y + this.h) {
          player.y = this.y + this.h;
          player.vy = 0;
          this.hit();
      }
      if (player.y + player.h > this.y + 4 && player.y < this.y + this.h - 4) {
          if (player.vx > 0 && player.x + player.w >= this.x && player.x + player.w <= this.x + 10) {
              player.touchingWall = true; player.wallDir = 1; player.x = this.x - player.w; player.vx = 0;
          } else if (player.vx < 0 && player.x <= this.x + this.w && player.x >= this.x + this.w - 10) {
              player.touchingWall = true; player.wallDir = -1; player.x = this.x + this.w; player.vx = 0;
          }
      }
  }
}

// --- GAME MANAGER & LEVEL LOGIC ---

class GameManager {
  constructor() {
    this.level = 1;
    this.lives = 3;
    this.activeCategory = 'all'; 
    this.invulnerable = false;
    this.levelTime = 0;
    
    // Removed boss logic here, added lastEmailTime for randomized email spawning
    this.lastEmailTime = 0;
    
    this.acBlock = new ACBlock();
    this.acBlock.resetSpawnTimer();
    this.emails = [];
    this.coffees = [];
    
    this.apps = { word: new Image(), pwp: new Image(), outlook: new Image() };
    this.apps.word.src = 'assets/word1.png';
    this.apps.pwp.src = 'assets/pwp1.png';
    this.apps.outlook.src = 'assets/outlook1.png';

    this.portals = [
      { id: 'word', img: this.apps.word, x: 250, y: 350 },
      { id: 'pwp', img: this.apps.pwp, x: 800, y: 550 },
      { id: 'outlook', img: this.apps.outlook, x: 500, y: 800 }
    ];

    setInterval(() => {
      if (this.level >= 3) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
          btn.classList.add('animate-jump');
          setTimeout(() => btn.classList.remove('animate-jump'), 1000);
        });
      }
    }, 5000);
  }

  getCurrentObjective() {
    return GAME_LEVELS[this.level - 1];
  }

  takeDamage() {
      if (this.invulnerable) return;
      this.invulnerable = true;
      
      setTimeout(() => this.invulnerable = false, 1500); 
      
      this.lives--;
      player.vy = -6; 
      player.vx = player.facing === 'right' ? -10 : 10; 
      player.carriedPrompt = null; 
      
      if (this.lives <= 0) {
          alert("GAME OVER! You missed the deadline."); 
          this.resetToTask1(); 
      } else {
          this.updateHUD(); 
      }
  }

  resetToTask1() {
      this.lives = 3;
      this.level = 1;
      
      player.x = window.innerWidth / 2 - 18;
      player.y = 20;
      player.vx = 0;
      player.vy = 0;
      player.carriedPrompt = null;

      this.triggerLevelTransition();
  }

  selectCategory(category, targetElement) {
    if (this.level < 3) return; 

    this.activeCategory = category;

    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('bg-carrier-blue', 'text-white');
      b.classList.add('bg-white');
    });

    if (targetElement) {
      targetElement.classList.remove('bg-white');
      targetElement.classList.add('bg-carrier-blue', 'text-white');
      targetElement.style.transform = 'translateY(-10px)';
      setTimeout(() => targetElement.style.transform = 'translateY(0)', 150);
    }

    this.loadLevelCards();
    setTimeout(() => map.refreshPlatforms(), 100); 
  }

  loadLevelCards() {
    const container = document.getElementById('promptCardContainer');
    if (!container) return;

    if (this.level === 3 && this.activeCategory === 'all') {
      container.style.filter = 'blur(6px)';
      container.classList.add('pointer-events-none'); 
    } else {
      container.style.filter = 'blur(0px)';
      container.classList.remove('pointer-events-none');
    }

    document.querySelectorAll('.prompt-card').forEach(card => {
      const cardLevel = parseInt(card.getAttribute('data-level'));
      const cardCat = card.getAttribute('data-category');

      const isLevelMatch = cardLevel && cardLevel <= this.level;
      const isCatMatch = this.activeCategory === 'all' || cardCat === this.activeCategory;

      if (isLevelMatch && isCatMatch) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  }

  triggerLevelTransition() {
    const container = document.getElementById('promptCardContainer');
    if (!container) return;
    
    this.activeCategory = 'all';
    this.levelTime = 0;
    
    // Removed boss reset logic, reset email timer instead
    this.lastEmailTime = 0;
    this.emails = [];
    this.coffees = [];
    this.acBlock.resetSpawnTimer(); 

    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('bg-carrier-blue', 'text-white');
      b.classList.add('bg-white');
    });
    const allBtn = document.querySelector('[data-filter="all"]');
    if (allBtn) {
      allBtn.classList.remove('bg-white');
      allBtn.classList.add('bg-carrier-blue', 'text-white');
    }
    
    const flash = document.createElement('div');
    flash.className = 'fixed inset-0 bg-green-400 opacity-0 z-[999] pointer-events-none transition-opacity duration-300';
    document.body.appendChild(flash);
    
    setTimeout(() => {
      flash.style.opacity = '0.3';
      container.style.opacity = '0.5';
    }, 50);

    setTimeout(() => {
      this.loadLevelCards();
      this.updateHUD();
      
      container.style.opacity = '1';
      flash.style.opacity = '0';
      
      setTimeout(() => {
        map.refreshPlatforms();
        flash.remove();
      }, 300);

    }, 600);
  }

  handleDrop(promptId, portalId) {
    const objective = this.getCurrentObjective();
    
    if (portalId === objective.targetApp && promptId === objective.targetPrompt) {
      if (this.level < 4) {
        this.level++; 
        this.triggerLevelTransition();
      } else {
        alert("YOU WIN! Presentation delivered!"); 
      }
    } else {
      this.takeDamage(); 
    }
  }

  drawPortals(ctx) {
    const time = Date.now();
    this.portals.forEach((p, index) => {
      const floatY = Math.sin(time / 500 + index) * 12; 
      const radius = 38;
      const renderX = p.x - window.scrollX;
      const renderY = p.y + floatY - window.scrollY;
      const centerX = renderX + radius;
      const centerY = renderY + radius;

      ctx.save();
      const pulse = Math.sin(time / 300 + index) * 5;
      ctx.shadowColor = 'rgba(200, 220, 240, 0.6)';
      ctx.shadowBlur = 15 + pulse;

      const gradient = ctx.createRadialGradient(centerX - radius * 0.3, centerY - radius * 0.3, 0, centerX, centerY, radius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)'); 
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.stroke();
      ctx.restore();

      if (p.img.complete) {
        const imgSize = 44;
        ctx.drawImage(p.img, centerX - imgSize / 2, centerY - imgSize / 2, imgSize, imgSize);
      }
      
      p.hitX = p.x;
      p.hitY = p.y + floatY;
      p.hitW = radius * 2;
      p.hitH = radius * 2;
    });
  }
  
  updateHUD() {
    const livesElement = document.getElementById('livesDisplay');
    const taskElement = document.getElementById('taskDisplay');
    
    if (livesElement && taskElement) {
      const objective = this.getCurrentObjective();
      livesElement.innerHTML = '❤️'.repeat(this.lives); 
      taskElement.innerHTML = `Level ${this.level}/4: ${objective.task} ➡️ Drop in ${objective.targetApp.toUpperCase()}`;
    }
  }
}

const gameManager = new GameManager();

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    player.jump();
  }
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
    e.preventDefault(); 
    player.interact();
  }
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
});

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  gameManager.levelTime += 16.6; 

  if (!gameManager.acBlock.active && gameManager.levelTime > gameManager.acBlock.spawnDelay && !gameManager.acBlock.spawnedThisLevel) {
      gameManager.acBlock.spawn();
      gameManager.acBlock.spawnedThisLevel = true; 
  }

  let emailInterval = 20000;
  if (gameManager.level === 2) emailInterval = 15000;
  if (gameManager.level === 3) emailInterval = 10000;
  if (gameManager.level === 4) emailInterval = 5000;
  
  // UPDATED: Spawning emails randomly from the bottom of the document
  if (gameManager.levelTime - gameManager.lastEmailTime >= emailInterval) {
      gameManager.lastEmailTime = gameManager.levelTime;
      const docWidth = document.documentElement.scrollWidth || window.innerWidth;
      const docHeight = document.documentElement.scrollHeight || window.innerHeight;
      
      const spawnX = Math.random() * (docWidth - 100) + 50;
      const spawnY = docHeight + 50; // Start slightly below the visible page
      const facingLeft = Math.random() > 0.5;
      
      gameManager.emails.push(new EmailProjectile(
          spawnX, 
          spawnY, 
          facingLeft
      ));
  }

  player.update(keys, map.platforms);
  gameManager.updateHUD(); 

  if (player.carriedPrompt) {
    gameManager.portals.forEach(portal => {
      if (
        player.x < portal.hitX + portal.hitW &&
        player.x + player.w > portal.hitX &&
        player.y < portal.hitY + portal.hitH &&
        player.y + player.h > portal.hitY
      ) {
        gameManager.handleDrop(player.carriedPrompt, portal.id);
        player.carriedPrompt = null; 
      }
    });
  }

  const targetScrollY = player.y - (window.innerHeight / 2);
  window.scrollTo(0, Math.max(0, targetScrollY));

  gameManager.drawPortals(ctx);
  
  gameManager.acBlock.update(ctx);
  
  gameManager.coffees.forEach(c => c.update(ctx, map.platforms));
  gameManager.coffees = gameManager.coffees.filter(c => c.active); 
  
  gameManager.emails.forEach(e => e.update(ctx));
  gameManager.emails = gameManager.emails.filter(e => e.active); 

  if (gameManager.invulnerable) {
      ctx.globalAlpha = (Date.now() % 300 < 150) ? 0.5 : 1.0;
  }
  player.draw(ctx);
  ctx.globalAlpha = 1.0;

  requestAnimationFrame(gameLoop);
}

window.addEventListener('load', () => {
  syncCanvas();
  gameManager.loadLevelCards();
  gameManager.updateHUD();
  map.refreshPlatforms();
  gameLoop();
});