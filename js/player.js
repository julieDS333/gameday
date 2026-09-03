class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 20; // 50% scale width
    this.h = 32; // 50% scale height
    this.vx = 0;
    this.vy = 0;
    this.speed = 5;
    this.gravity = 0.5;
    this.jumpPower = -11;
    this.grounded = false;
    this.facing = 'right';
    this.state = 'IDLE';

    // Wall Climb & Wall Jump Mechanics
    this.touchingWall = false;
    this.wallDir = 0; // -1 for Left wall, 1 for Right wall

    // Step-Down Timer (Triggered by Arrow Down / S key)
    this.dropTimer = 0;

    this.img = new Image();
    this.img.src = 'assets/female_idle.png';
    this.isLoaded = false;
    this.img.onload = () => { this.isLoaded = true; };
  }

  update(keys, platforms) {
    if (this.dropTimer > 0) this.dropTimer--;

    // Initiate drop down through sub-platform layers
    if ((keys['ArrowDown'] || keys['KeyS']) && this.dropTimer === 0) {
      this.dropTimer = 12; // Ignore top collisions for 12 frames
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
      this.vx *= 0.75; // Friction
    }

    // Wall Slide Friction
    if (this.touchingWall && !this.grounded && this.vy > 0) {
      this.vy = Math.min(this.vy, 2); // Slow descent down card edges
    } else {
      this.vy += this.gravity;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Keep player within page bounds
    const docWidth = document.documentElement.scrollWidth;
    if (this.x < 0) this.x = 0;
    if (this.x + this.w > docWidth) this.x = docWidth - this.w;

    this.grounded = false;
    this.touchingWall = false;
    this.wallDir = 0;

    platforms.forEach(p => {
      // Side Collisions (Wall climbing/jumping inside card gaps)
      if (!this.grounded && this.y + this.h > p.y + 4 && this.y < p.y + p.h - 4) {
        if (this.x + this.w >= p.x && this.x + this.w <= p.x + 8) {
          this.touchingWall = true;
          this.wallDir = 1; // Wall to the right
        } else if (this.x <= p.x + p.w && this.x >= p.x + p.w - 8) {
          this.touchingWall = true;
          this.wallDir = -1; // Wall to the left
        }
      }

      // Top Landing Collisions (Bypassed when dropTimer > 0)
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

    // Character State Machine
    if (!this.grounded) {
      this.state = this.touchingWall ? 'WALL_SLIDE' : 'JUMP';
    } else if (Math.abs(this.vx) > 0.5) {
      this.state = 'WALK';
    } else {
      this.state = 'IDLE';
    }
  }

  jump() {
    if (this.grounded) {
      this.vy = this.jumpPower;
      this.grounded = false;
    } 
    // Wall Jump / Kick off card edges
    else if (this.touchingWall) {
      this.vy = this.jumpPower;
      this.vx = -this.wallDir * (this.speed * 1.5);
    }
  }

  draw(ctx) {
    // Render relative to active scroll offsets
    const renderX = this.x - window.scrollX;
    const renderY = this.y - window.scrollY;

    if (this.isLoaded) {
      ctx.save();
      if (this.facing === 'left') {
        ctx.translate(renderX + this.w, renderY);
        ctx.scale(-1, 1);
        ctx.drawImage(this.img, 0, 0, this.w, this.h);
      } else {
        ctx.drawImage(this.img, renderX, renderY, this.w, this.h);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = '#0067b1';
      ctx.fillRect(renderX, renderY, this.w, this.h);
    }
  }
}