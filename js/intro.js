const canvas = document.getElementById('introCanvas');
const ctx = canvas.getContext('2d');

function syncCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', syncCanvas);
syncCanvas();

const climb1 = new Image(); climb1.src = 'assets/female_climb1.png';
const climb2 = new Image(); climb2.src = 'assets/female_climb2.png';
const idle = new Image(); idle.src = 'assets/female_idle.png'; 

// NEW TUTORIAL ASSETS: Word Logo and Copilot Logo
const wordImg = new Image(); wordImg.src = 'assets/word1.png';
const copilotImg = new Image(); copilotImg.src = 'assets/copilot.png';

let gameState = 'CLIMBING'; 
let typingAreaElement = null;
let tutorialComplete = false;

const player = {
    x: 0,
    y: 0,
    w: 36,   
    h: 57.6, 
    vx: 0,
    vy: 0,
    grounded: false,
    frozen: false, // Added to freeze player when stuck in portal
    timer: 0
};

// Portal State
const tutorialPortal = {
    active: false,
    arrived: false,
    stuck: false,
    x: 0,
    y: -100,
    radius: 38,
    img: wordImg,
    floatY: 0
};

const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false
};

let targetY = 0;
let domFallingText = [];

// KEYBOARD UI FEEDBACK & CONTROLS
window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        keys[e.code] = true;
        const dir = e.code.replace('Arrow', '').toLowerCase();
        const elId = dir === 'right' ? 'key-right' : `key-${dir}`;
        const el = document.getElementById(elId);
        if (el) el.style.transform = 'scale(0.8)';
    }
    
    // NEW: Listen for Ctrl + V when stuck in the portal
    if (tutorialPortal.stuck && !tutorialComplete) {
        if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyV' || e.key === 'v')) {
            e.preventDefault();
            
            // Transform portal to Copilot!
            tutorialPortal.img = copilotImg;
            tutorialComplete = true;
            player.frozen = false;
            player.vy = -8; // Joy jump
            
            // Remove the floating DOM prompt
            const promptEl = document.getElementById('tutorial-paste-prompt');
            if (promptEl) promptEl.remove();

            // Scale up the Skip Button
            const skipBtn = document.getElementById('skip-btn');
            if (skipBtn) {
                skipBtn.classList.remove('bg-[#1e1e1e]/80');
                skipBtn.classList.add('bg-[#1e1e1e]', 'border-gray-600', 'scale-150', 'shadow-2xl');
            }
        }
    }
    
    if (tutorialComplete && (e.code === 'Enter' || e.key === 'Enter')) {
        e.preventDefault();
        window.location.href = 'game.html';
    }
});

window.addEventListener('keyup', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        keys[e.code] = false;
        const dir = e.code.replace('Arrow', '').toLowerCase();
        const elId = dir === 'right' ? 'key-right' : `key-${dir}`;
        const el = document.getElementById(elId);
        if (el) el.style.transform = 'scale(1)';
    }
});

function init() {
    const safePara = document.getElementById('doc-title');
    if (!safePara) return;

    const rect = safePara.getBoundingClientRect();
    targetY = rect.top - player.h + 2;
    player.x = rect.left + 20; 
    player.y = targetY + 600; 
    
    requestAnimationFrame(introLoop);
}

window.openEmail = function() {
    if (gameState !== 'WAITING') return;
    gameState = 'MODAL';
    
    const toast = document.getElementById('email-toast');
    if (toast) toast.style.display = 'none'; 
    
    const modal = document.getElementById('email-modal');
    if (modal) {
        document.getElementById('email-modal-overlay').style.display = 'block';
        modal.style.display = 'block';
    }
};

window.triggerGravity = function() {
    gameState = 'FALLING';
    
    const modal = document.getElementById('email-modal');
    if (modal) {
        document.getElementById('email-modal-overlay').style.display = 'none';
        modal.style.display = 'none';
    }
    
    const paragraphs = document.querySelectorAll('.word-text, #doc-title');
    
    paragraphs.forEach(el => {
        if (el.id !== 'doc-title') {
            domFallingText.push({ element: el, y: 0, vy: (Math.random() * -3) - 1 });
        }
    });

    setTimeout(startTypingInstructions, 1500);
};

function introLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const safePara = document.getElementById('doc-title');
    let rect = null;
    if (safePara) {
        rect = safePara.getBoundingClientRect();
        targetY = rect.top - player.h + 2;
    }

    if (gameState === 'CLIMBING') {
        player.y -= 1.5; 
        player.timer++;
        
        if (rect) player.x = rect.left + 20;

        const currentImg = (Math.floor(player.timer / 15) % 2 === 0) ? climb1 : climb2;
        if (currentImg.complete && currentImg.naturalWidth !== 0) {
            ctx.drawImage(currentImg, player.x, player.y, player.w, player.h);
        }

        if (player.y <= targetY) {
            player.y = targetY;
            gameState = 'WAITING';
            setTimeout(() => {
                const toast = document.getElementById('email-toast');
                if (toast) toast.classList.add('show');
            }, 1500);
        }
    } 
    else if (gameState === 'WAITING' || gameState === 'MODAL' || gameState === 'FALLING' || gameState === 'TYPING') {
        if (rect) {
            player.x = rect.left + 20;
            player.y = targetY;
        }

        if (idle.complete && idle.naturalWidth !== 0) {
            ctx.drawImage(idle, player.x, player.y, player.w, player.h);
        }
    }
    else if (gameState === 'TUTORIAL') {
        
        // --- PLAYER PHYSICS ---
        if (!player.frozen) {
            // Horizontal Movement
            if (keys.ArrowLeft) player.vx -= 0.6;
            if (keys.ArrowRight) player.vx += 0.6;
            player.vx *= 0.82; 
            player.x += player.vx;

            // Vertical Movement & Gravity
            player.vy += 0.5; 
            player.y += player.vy;
            player.grounded = false;

            // Jump
            if (keys.ArrowUp && player.grounded) {
                player.vy = -9;
                player.grounded = false;
            }
        } else {
            // Lock player onto the portal visually
            player.x = tutorialPortal.x + tutorialPortal.radius - player.w / 2;
            player.y = tutorialPortal.y + tutorialPortal.floatY - player.h + 20;
        }

        // --- ENVIRONMENT COLLISIONS ---
        let platforms = [];
        if (rect) platforms.push(rect); 
        
        if (typingAreaElement) {
            Array.from(typingAreaElement.children).forEach(el => {
                if (el.tagName === 'P') {
                    platforms.push(el.getBoundingClientRect());
                }
            });
        }

        if (!player.frozen) {
            platforms.forEach(pRect => {
                if (player.vy > 0 && 
                    player.x + player.w > pRect.left && 
                    player.x < pRect.right &&
                    player.y + player.h - player.vy <= pRect.top + 15 && 
                    player.y + player.h >= pRect.top) {
                    
                    player.y = pRect.top - player.h;
                    player.vy = 0;
                    player.grounded = true;
                }
            });
        }

        if (player.x < 0) player.x = 0;

        // --- PORTAL LOGIC ---
        if (rect) {
            const portalTargetX = rect.left + 340; 
            const portalTargetY = rect.top - 120;

            // Spawn portal
            if (!tutorialPortal.active) {
                tutorialPortal.x = portalTargetX;
                tutorialPortal.y = -100;
                tutorialPortal.active = true;
            }

            // Fall animation
            if (tutorialPortal.y < portalTargetY) {
                tutorialPortal.y += 3;
            } else {
                tutorialPortal.y = portalTargetY;
                tutorialPortal.arrived = true;
            }

            // Draw Portal
            tutorialPortal.floatY = Math.sin(Date.now() / 500) * 10;        
            const renderX = tutorialPortal.x;       
            const renderY = tutorialPortal.y + tutorialPortal.floatY;       
            const centerX = renderX + tutorialPortal.radius;       
            const centerY = renderY + tutorialPortal.radius;       
            
            ctx.save();       
            const pulse = Math.sin(Date.now() / 300) * 5;       
            ctx.shadowColor = 'rgba(200, 220, 240, 0.6)';       
            ctx.shadowBlur = 15 + pulse;       
            const gradient = ctx.createRadialGradient(centerX - tutorialPortal.radius * 0.3, centerY - tutorialPortal.radius * 0.3, 0, centerX, centerY, tutorialPortal.radius);       
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');        
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');       
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');       
            ctx.beginPath();       
            ctx.arc(centerX, centerY, tutorialPortal.radius, 0, Math.PI * 2);       
            ctx.fillStyle = gradient;       
            ctx.fill();       
            ctx.lineWidth = 2;       
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';       
            ctx.stroke();       
            ctx.restore();       
            
            if (tutorialPortal.img.complete && tutorialPortal.img.naturalWidth > 0) {         
                const maxImgSize = 44;
                const scale = Math.min(maxImgSize / tutorialPortal.img.naturalWidth, maxImgSize / tutorialPortal.img.naturalHeight);
                const drawW = tutorialPortal.img.naturalWidth * scale;
                const drawH = tutorialPortal.img.naturalHeight * scale;
                ctx.drawImage(tutorialPortal.img, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);       
            }              
            
            // Check Collision with Player to Trigger "Stuck" State
            if (tutorialPortal.arrived && !tutorialPortal.stuck && !tutorialComplete) {
                if (player.x < renderX + tutorialPortal.radius * 2 &&         
                    player.x + player.w > renderX &&         
                    player.y < renderY + tutorialPortal.radius * 2 &&         
                    player.y + player.h > renderY) { 
                    
                    tutorialPortal.stuck = true;
                    player.frozen = true;
                    player.vx = 0;
                    player.vy = 0;

                    // Generate the floating prompt
                    const block = document.createElement('div');
                    block.id = 'tutorial-paste-prompt';
                    block.className = 'fixed z-[9999] font-bold text-white text-center flex items-center justify-center shadow-lg rounded bg-[#0067b1]';
                    block.style.width = '120px';
                    block.style.height = '34px';
                    block.style.left = (player.x + player.w / 2 - 60) + 'px';
                    block.style.top = (player.y - 55) + 'px';
                    block.innerText = "Ctrl + V to drop";
                    document.body.appendChild(block);
                }
            }
        }

        // Draw Player
        if (idle.complete && idle.naturalWidth !== 0) {
            ctx.drawImage(idle, player.x, player.y, player.w, player.h);
        }
    }
    
    // Background falling text animation
    if (gameState === 'FALLING' || gameState === 'TYPING' || gameState === 'TUTORIAL') {
        domFallingText.forEach(item => {
            item.vy += 0.5; 
            item.y += item.vy;
            item.element.style.transform = `translateY(${item.y}px)`;
        });
    }

    requestAnimationFrame(introLoop);
}

const instructions = [
    { text: "You are going to be teleported to the Copilot Hub." },
    { text: "Check the level to know what task to achieve." },
    { text: "Find the right prompt and copy it." },
    { text: "Jump to the right software to paste it there." },
    { text: "Avoid emails and drink coffee to stay alive." }
];

function startTypingInstructions() {
    gameState = 'TYPING';
    
    typingAreaElement = document.createElement('div');
    typingAreaElement.className = "absolute z-[3000] flex flex-col items-start"; 
    
    const safePara = document.getElementById('doc-title');
    if (safePara) {
        typingAreaElement.style.top = (safePara.offsetTop + safePara.offsetHeight + 60) + "px";
    } else {
        typingAreaElement.style.top = "400px";
    }
    
    typingAreaElement.style.left = "80px";  
    typingAreaElement.style.right = "80px"; 
    document.getElementById('word-page').appendChild(typingAreaElement);
    
    let currentInst = 0;
    
    function typeNext() {
        if (currentInst >= instructions.length) {
            document.getElementById('tutorial-keys').classList.remove('hidden');
            gameState = 'TUTORIAL';
            return; 
        }
        
        const p = document.createElement('p');
        p.className = "text-xl font-bold text-red-600 mb-3 typing-cursor";
        typingAreaElement.appendChild(p);
        
        const fullText = instructions[currentInst].text;
        let charIndex = 0;
        
        const typeInterval = setInterval(() => {
            p.innerText = fullText.substring(0, charIndex);
            charIndex++;
            
            if (charIndex > fullText.length) {
                clearInterval(typeInterval);
                p.classList.remove('typing-cursor'); 
                currentInst++;
                setTimeout(typeNext, 600); 
            }
        }, 40);
    }
    
    typeNext();
}

window.addEventListener('load', () => setTimeout(init, 1000));