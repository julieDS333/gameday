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

let gameState = 'CLIMBING'; 

const player = {
    x: 0,
    y: 0,
    w: 36,   
    h: 57.6, 
    frame: 0,
    timer: 0
};

let targetY = 0;
let domFallingText = [];

function init() {
    const safePara = document.getElementById('safe-paragraph');
    if (!safePara) return;

    const rect = safePara.getBoundingClientRect();
    
    targetY = rect.top - player.h + 2;
    player.x = rect.left + 20; 
    player.y = targetY + 400; 
    
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
        if (el.id !== 'safe-paragraph') {
            domFallingText.push({
                element: el,
                y: 0,
                vy: (Math.random() * -3) - 1 
            });
        }
    });

    setTimeout(startTypingInstructions, 1500);
};

function introLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'CLIMBING') {
        player.y -= 2.0; 
        player.timer++;
        
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
    else if (gameState === 'WAITING' || gameState === 'MODAL' || gameState === 'TYPING') {
        if (idle.complete && idle.naturalWidth !== 0) {
            ctx.drawImage(idle, player.x, player.y, player.w, player.h);
        } else if (climb1.complete && climb1.naturalWidth !== 0) {
            ctx.drawImage(climb1, player.x, player.y, player.w, player.h);
        }
    }
    
    if (gameState === 'FALLING' || gameState === 'TYPING') {
        if (idle.complete && idle.naturalWidth !== 0) {
            ctx.drawImage(idle, player.x, player.y, player.w, player.h);
        } 
        
        domFallingText.forEach(item => {
            item.vy += 0.5; 
            item.y += item.vy;
            item.element.style.transform = `translateY(${item.y}px)`;
        });
    }

    requestAnimationFrame(introLoop);
}

// Added the teleportation line back in at the start!
const instructions = [
    { text: "You are going to be teleported to the Copilot Hub." },
    { text: "Check the level to know what task to achieve." },
    { text: "Find the right prompt and copy it." },
    { text: "Jump to the right software to paste it there." },
    { text: "Avoid emails and drink coffee to stay alive." }
];

function startTypingInstructions() {
    gameState = 'TYPING';
    
    let typingArea = document.createElement('div');
    typingArea.className = "absolute z-[3000] pointer-events-none flex flex-col items-start";
    typingArea.style.top = "150px"; 
    typingArea.style.left = "80px";
    typingArea.style.right = "80px";
    document.getElementById('word-page').appendChild(typingArea);
    
    let currentInst = 0;
    
    function typeNext() {
        if (currentInst >= instructions.length) {
            const safePara = document.getElementById('safe-paragraph');
            const rect = safePara.getBoundingClientRect();
            
            const enterMsg = document.createElement('p');
            enterMsg.className = "fixed text-slate-400 font-light text-sm animate-pulse z-[3000] pointer-events-none w-full text-center";
            enterMsg.innerText = "Press enter to start";
            enterMsg.style.top = (rect.bottom + 50) + "px";
            enterMsg.style.left = "0";
            document.body.appendChild(enterMsg);
            return; 
        }
        
        const p = document.createElement('p');
        p.className = "text-xl font-bold text-red-600 mb-4 typing-cursor";
        typingArea.appendChild(p);
        
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

window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' || e.key === 'Enter') {
        e.preventDefault();
        window.location.href = 'game.html';
    }
});

window.addEventListener('load', () => setTimeout(init, 200));