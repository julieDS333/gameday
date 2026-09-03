class Map {
  constructor() {
    this.platforms = [];
  }

  refreshPlatforms() {
    this.platforms = [];
    
    // STRICT MODE: Only select elements explicitly marked with the 'platform' class
    const elements = document.querySelectorAll('.platform');
    
    elements.forEach(el => {
      // Ignore elements that are hidden (like cards for higher levels)
      if (el.closest('.hidden')) return;

      const rect = el.getBoundingClientRect();
      
      // Only create a physics block if the element is actually visible and has size
      if (rect.width > 0 && rect.height > 0) {
        this.platforms.push({
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          w: rect.width,
          h: rect.height,
          element: el
        });
      }
    });
  }
}