class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 36; 
    this.h = 57.6; 
    this.vx = 0;
    this.vy = 0;
    this.speed = 5;
    this.gravity = 0.5;
    this.jumpPower = -14.5; 
    this.grounded = false;
    this.facing = 'right';
    this.state = 'IDLE';

    this.maxJumps = 2;
    this.jumpsLeft = 2;

    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.prevGrounded = false;
    this.lastVy = 0; 

    this.carriedPrompt = null; 
    this.currentPlatformElement = null; 

    this.coins = 0; 
    this.touchingWall = false;
    this.wallDir = 0;
    this.dropTimer = 0;
    
    this.onAbsoluteBottom = false;

    this.img = new Image();
    this.img.src = 'assets/female_idle.png';
    this.isLoaded = false;
    this.img.onload = () => { this.isLoaded = true; };
  }

  update(keys, platforms) {
    if (this.dropTimer > 0) this.dropTimer--;

    this.scaleX += (1.0 - this.scaleX) * 0.2;
    this.scaleY += (1.0 - this.scaleY) * 0.2;

    if ((keys['ArrowDown'] || keys['KeyS']) && this.dropTimer === 0) {
      this.dropTimer = 12; 
      this.grounded = false;
      this.currentPlatformElement = null;
    }

    if (keys['ArrowRight'] || keys['KeyD']) {
      this.vx = this.speed;
      this.facing = 'right';
    } else if (keys['ArrowLeft'] || keys['KeyA']) {
      this.vx = -this.speed;
      this.facing = 'left';
    } else {
      this.vx *= 0.75; 
    }

    if (this.touchingWall && !this.grounded && this.vy > 0) {
      this.vy = Math.min(this.vy, 2); 
    } else {
      this.vy += this.gravity;
    }

    this.x += this.vx;
    this.y += this.vy;

    const docWidth = document.documentElement.scrollWidth;
    const docHeight = document.documentElement.scrollHeight;
    
    if (this.x < 0) { this.x = 0; this.vx = 0; } 
    if (this.x + this.w > docWidth) { this.x = docWidth - this.w; this.vx = 0; } 
    if (this.y < 0) { this.y = 0; this.vy = 0; } 
    
    this.onAbsoluteBottom = false;
    if (this.y + this.h >= docHeight) {
      this.y = docHeight - this.h;
      this.vy = 0;
      this.grounded = true;
      this.onAbsoluteBottom = true;
    }

    this.grounded = false;
    this.touchingWall = false;
    this.wallDir = 0;

    platforms.forEach(p => {
      // Wall Collisions
      if (this.y + this.h > p.y + 4 && this.y < p.y + p.h - 4) {
        if (this.vx > 0 && this.x + this.w >= p.x && this.x + this.w <= p.x + 10) {
          this.touchingWall = true; this.wallDir = 1; this.x = p.x - this.w; this.vx = 0;
        } else if (this.vx < 0 && this.x <= p.x + p.w && this.x >= p.x + p.w - 10) {
          this.touchingWall = true; this.wallDir = -1; this.x = p.x + p.w; this.vx = 0;
        }
      }

      // Landing Collisions (Top)
      if (this.dropTimer === 0 && this.vy >= 0 &&
          this.x + this.w > p.x + 2 &&
          this.x < p.x + p.w - 2 &&
          this.y + this.h >= p.y &&
          this.y + this.h - this.vy <= p.y + 12) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.grounded = true;
        this.currentPlatformElement = p.element; 
      }

      // Ceiling Collisions (Headbutting Blocks)
      if (this.vy < 0 && 
          this.x + this.w > p.x + 4 && 
          this.x < p.x + p.w - 4 &&
          this.y <= p.y + p.h && 
          this.y - this.vy >= p.y + p.h) { 
        
        this.y = p.y + p.h; 
        this.vy = 0; 
        
        if (p.element && p.element.classList.contains('filter-btn')) {
          const category = p.element.getAttribute('data-filter');
          if (typeof gameManager !== 'undefined') {
            gameManager.selectCategory(category, p.element);
          }
        }
      }
    });

    if (this.grounded || this.onAbsoluteBottom) {
      this.jumpsLeft = this.maxJumps;
      if (!this.prevGrounded && this.lastVy > 2) {
        this.scaleX = 1.4; 
        this.scaleY = 0.6; 
      }
    }

    this.prevGrounded = this.grounded || this.onAbsoluteBottom;
    this.lastVy = this.vy;
  }

  jump() {
    if (this.jumpsLeft > 0) {
      this.vy = this.onAbsoluteBottom ? this.jumpPower * 1.3 : this.jumpPower; 
      this.grounded = false;
      this.onAbsoluteBottom = false;
      this.currentPlatformElement = null;
      this.jumpsLeft--;
      this.scaleX = 0.5; 
      this.scaleY = 1.5; 
    } 
    else if (this.touchingWall) {
      this.vy = this.jumpPower;
      this.vx = -this.wallDir * (this.speed * 1.5);
      this.jumpsLeft = this.maxJumps - 1; 
    }
  }

  interact() {
    // FIX: Removed the '!this.carriedPrompt' check! 
    // Now, if you are grounded on a card, Ctrl+C will ALWAYS overwrite your current prompt.
    if (this.grounded && this.currentPlatformElement) {
      const card = this.currentPlatformElement.closest('.prompt-card');
      if (card && card.id) { 
        this.carriedPrompt = card.id;
        this.vy = -5; // Small jump visual feedback
        this.grounded = false;
        this.scaleX = 0.8;
        this.scaleY = 1.2;
      }
    }
  }

  draw(ctx) {
    const renderX = this.x - window.scrollX;
    const renderY = this.y - window.scrollY;

    if (this.carriedPrompt) {
      let cardColor = '#94a3b8';
      if (this.carriedPrompt.includes('word')) cardColor = '#0067b1'; 
      if (this.carriedPrompt.includes('pwp')) cardColor = '#d97706'; 
      if (this.carriedPrompt.includes('outlook')) cardColor = '#7e22ce'; 
      if (this.carriedPrompt.includes('excel')) cardColor = '#16a34a'; 

      const cardW = this.w + 16;
      const cardH = 20;
      const cardX = renderX - 8;
      const cardY = renderY - 35;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cardX, cardY, cardW, cardH);
      
      ctx.strokeStyle = cardColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(cardX, cardY, cardW, cardH);
      
      ctx.fillStyle = cardColor;
      ctx.fillRect(cardX + 4, cardY + 4, 16, 6);
      
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cardX + 4, cardY + 14, cardW - 8, 2);
    }

    if (this.isLoaded) {
      ctx.save();
      ctx.translate(renderX + this.w / 2, renderY + this.h);
      ctx.scale(this.facing === 'left' ? -this.scaleX : this.scaleX, this.scaleY);
      ctx.drawImage(this.img, -this.w / 2, -this.h, this.w, this.h);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0067b1';
      ctx.fillRect(renderX, renderY, this.w, this.h);
    }
  }
}