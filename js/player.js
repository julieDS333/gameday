class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 24; 
    this.h = 38.4; 
    this.vx = 0;
    this.vy = 0;
    this.speed = 5;
    this.gravity = 0.5;
    this.jumpPower = -11;
    this.grounded = false;
    this.facing = 'right';
    this.state = 'IDLE';

    // Double Jump Mechanics
    this.maxJumps = 2;
    this.jumpsLeft = 2;

    // Squash & Stretch Mechanics
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.prevGrounded = false;
    this.lastVy = 0; // To track how hard we hit the ground

    // Collectibles System
    this.coins = 0; 

    // Wall Mechanics
    this.touchingWall = false;
    this.wallDir = 0;
    this.dropTimer = 0;

    this.img = new Image();
    this.img.src = 'assets/female_idle.png';
    this.isLoaded = false;
    this.img.onload = () => { this.isLoaded = true; };
  }

  update(keys, platforms) {
    if (this.dropTimer > 0) this.dropTimer--;

    // Squash & Stretch Lerp (smoothly return scale to 1.0 every frame)
    this.scaleX += (1.0 - this.scaleX) * 0.2;
    this.scaleY += (1.0 - this.scaleY) * 0.2;

    if ((keys['ArrowDown'] || keys['KeyS']) && this.dropTimer === 0) {
      this.dropTimer = 12; 
      this.grounded = false;
    }

    // Horizontal Movement
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

    // --- BOUNDARY CHECKS (Left, Right, Top, Bottom) ---
    const docWidth = document.documentElement.scrollWidth;
    const docHeight = document.documentElement.scrollHeight;
    
    if (this.x < 0) { this.x = 0; this.vx = 0; } // Left Wall
    if (this.x + this.w > docWidth) { this.x = docWidth - this.w; this.vx = 0; } // Right Wall
    if (this.y < 0) { this.y = 0; this.vy = 0; } // Ceiling
    
    // Floor
    if (this.y + this.h >= docHeight) {
      this.y = docHeight - this.h;
      this.vy = 0;
      this.grounded = true;
    }

    this.grounded = false;
    this.touchingWall = false;
    this.wallDir = 0;

    platforms.forEach(p => {
      // Side Collisions
      if (this.y + this.h > p.y + 4 && this.y < p.y + p.h - 4) {
        if (this.vx > 0 && this.x + this.w >= p.x && this.x + this.w <= p.x + 10) {
          this.touchingWall = true; this.wallDir = 1; this.x = p.x - this.w; this.vx = 0;
        } else if (this.vx < 0 && this.x <= p.x + p.w && this.x >= p.x + p.w - 10) {
          this.touchingWall = true; this.wallDir = -1; this.x = p.x + p.w; this.vx = 0;
        }
      }

      // Top Landing Collisions
      if (this.dropTimer === 0 && this.vy >= 0 &&
          this.x + this.w > p.x + 2 &&
          this.x < p.x + p.w - 2 &&
          this.y + this.h >= p.y &&
          this.y + this.h - this.vy <= p.y + 12) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.grounded = true;
      }
    });

    // Reset Jumps and apply Landing Squash
    if (this.grounded) {
      this.jumpsLeft = this.maxJumps;
      
      // If we just hit the ground from a high fall, apply squash!
      if (!this.prevGrounded && this.lastVy > 2) {
        this.scaleX = 1.4; // Expand horizontally
        this.scaleY = 0.6; // Flatten vertically
      }
    }

    this.prevGrounded = this.grounded;
    this.lastVy = this.vy;

    if (!this.grounded) {
      this.state = this.touchingWall ? 'WALL_SLIDE' : 'JUMP';
    } else if (Math.abs(this.vx) > 0.5) {
      this.state = 'WALK';
    } else {
      this.state = 'IDLE';
    }
  }

  jump() {
    if (this.jumpsLeft > 0) {
      this.vy = this.jumpPower;
      this.grounded = false;
      this.jumpsLeft--;
      
      // Jump Stretch Animation
      this.scaleX = 0.5; // Squeeze horizontally
      this.scaleY = 1.5; // Stretch vertically
    } 
    else if (this.touchingWall) {
      this.vy = this.jumpPower;
      this.vx = -this.wallDir * (this.speed * 1.5);
      this.jumpsLeft = this.maxJumps - 1; // Allow 1 extra jump after wall jump
    }
  }

  collectItem() {
    this.coins += 1;
    // We will link this to the HUD later!
  }

  draw(ctx) {
    const renderX = this.x - window.scrollX;
    const renderY = this.y - window.scrollY;

    if (this.isLoaded) {
      ctx.save();
      // Translate to bottom-center of the player for correct squashing
      ctx.translate(renderX + this.w / 2, renderY + this.h);
      
      // Apply facing direction AND squash/stretch scales
      ctx.scale(this.facing === 'left' ? -this.scaleX : this.scaleX, this.scaleY);
      
      // Draw image offset by half width and full height so bottom-center anchors to (0,0)
      ctx.drawImage(this.img, -this.w / 2, -this.h, this.w, this.h);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0067b1';
      ctx.fillRect(renderX, renderY, this.w, this.h);
    }
  }
}
