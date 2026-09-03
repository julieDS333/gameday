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

// --- LEVEL DATA & APP PORTALS ---
const GAME_LEVELS = [
  { id: 1, task: 'Summarize the Word Doc', targetApp: 'word', targetPrompt: 'word-summary' },
  { id: 2, task: 'Build a PowerPoint', targetApp: 'pwp', targetPrompt: 'pwp-build' }, 
  { id: 3, task: 'Make the PowerPoint Pretty', targetApp: 'pwp', targetPrompt: 'pwp-pretty' },
  { id: 4, task: 'Write an Email to send the deck', targetApp: 'outlook', targetPrompt: 'outlook-write' }
];

class GameManager {
  constructor() {
    this.level = 1;
    this.lives = 3;
    
    this.apps = {
      word: new Image(),
      pwp: new Image(),
      outlook: new Image()
    };
    
    this.apps.word.src = 'assets/word1.png';
    this.apps.pwp.src = 'assets/pwp1.png';
    this.apps.outlook.src = 'assets/outlook1.png';

    this.portals = [
      { id: 'word', img: this.apps.word, x: 250, y: 350 },
      { id: 'pwp', img: this.apps.pwp, x: 800, y: 550 },
      { id: 'outlook', img: this.apps.outlook, x: 500, y: 800 }
    ];
  }

  getCurrentObjective() {
    return GAME_LEVELS[this.level - 1];
  }

  loadLevelCards() {
    document.querySelectorAll('.prompt-card').forEach(card => {
      const cardLevel = parseInt(card.getAttribute('data-level'));
      if (cardLevel && cardLevel <= this.level) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  }

  triggerLevelTransition() {
    const container = document.getElementById('promptCardContainer');
    if (!container) return;
    
    const flash = document.createElement('div');
    flash.className = 'fixed inset-0 bg-green-400 opacity-0 z-[999] pointer-events-none transition-opacity duration-300';
    document.body.appendChild(flash);
    
    setTimeout(() => {
      flash.style.opacity = '0.3';
      container.style.filter = 'blur(8px)';
      container.style.opacity = '0.5';
    }, 50);

    setTimeout(() => {
      this.loadLevelCards();
      this.updateHUD();
      
      container.style.filter = 'blur(0px)';
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
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

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

// --- CONTROLS & GAME LOOP ---
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    player.jump();
  }
  // NEW: Press Ctrl + C (or Cmd + C) to pick up a prompt card
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
    e.preventDefault(); // Prevents the browser from actually copying text to your clipboard
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

// Initial Load setup
window.addEventListener('load', () => {
  syncCanvas();
  gameManager.loadLevelCards();
  gameManager.updateHUD();
  map.refreshPlatforms();
  gameLoop();
});