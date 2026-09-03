const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function syncCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', syncCanvas);
syncCanvas();

const map = new Map();
const player = new Player(window.innerWidth / 2 - 10, 20);

const GAME_LEVELS = [
  { id: 1, task: 'Summarize the Word Doc', targetApp: 'word', targetPrompt: 'word-summary' },
  { id: 2, task: 'Build a PowerPoint', targetApp: 'pwp', targetPrompt: 'pwp-build' }, 
  { id: 3, task: 'Make the PowerPoint Pretty', targetApp: 'pwp', targetPrompt: 'pwp-pretty' },
  // UPATED: Much more professional Copilot task for the final level!
  { id: 4, task: 'Draft an email to executives', targetApp: 'outlook', targetPrompt: 'outlook-write' }
];

class GameManager {
  constructor() {
    this.level = 1;
    this.lives = 3;
    this.activeCategory = 'all'; 
    
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
      this.lives--;
      player.vy = -6; 
      player.vx = player.facing === 'right' ? -10 : 10;
      
      if (this.lives <= 0) {
        alert("GAME OVER!"); 
        this.lives = 3;
        this.level = 1;
        this.loadLevelCards(); 
      }
      this.updateHUD(); 
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
  player.draw(ctx);

  requestAnimationFrame(gameLoop);
}

window.addEventListener('load', () => {
  syncCanvas();
  gameManager.loadLevelCards();
  gameManager.updateHUD();
  map.refreshPlatforms();
  gameLoop();
});