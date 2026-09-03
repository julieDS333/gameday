class Map {
  constructor() {
    this.platforms = [];
    this.refreshPlatforms();

    // Re-calculate platform positions on window scroll or resize
    window.addEventListener('resize', () => this.refreshPlatforms());
    window.addEventListener('scroll', () => this.refreshPlatforms());
  }

  refreshPlatforms() {
    this.platforms = [];

    // Sub-elements registered as platforms (card containers are excluded so gaps remain open)
    const selectors = [
      '.header-nav',
      '.dept-selector-box',
      '.user-avatar',
      '.nav-tab',

      // Hero Banner Stepping Stones
      '.hero-badge',
      '.hero-title',
      '.hero-desc',

      // Task Filter Bar
      '.filter-btn',

      // Sub-platforms inside Action Prompt Cards
      '.prompt-card span',
      '.prompt-card h3',
      '.prompt-card .copy-btn',

      // Sub-platforms inside Agent Builder Cards
      '.agent-card span',
      '.agent-card h3',
      '.agent-card .copy-btn',

      // Other Tab Cards & Elements
      '.steal-prompt-card',
      '.demo-card',
      '.cheatsheet-card',
      '.training-card',
      '.resource-card',
      '.glow-bubble'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        // Skip hidden elements (e.g. elements inside inactive tabs)
        if (el.offsetParent === null) return;

        const rect = el.getBoundingClientRect();
        this.platforms.push({
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          w: rect.width,
          h: rect.height,
          element: el
        });
      });
    });
  }
}