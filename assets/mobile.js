// assets/mobile.js
// ─────────────────────────────────────────────
// CASAVIOLA CRM — Mobile Sidebar Manager
// Handles: hamburger toggle, swipe to open/close,
//          overlay tap to close, body scroll lock
//
// Import this on every page via:
// <script src="../assets/mobile.js"></script>
// ─────────────────────────────────────────────

(function () {

  // ── Inject hamburger button and overlay into every page ──
  function injectElements() {
    // Hamburger toggle button
    const toggle = document.createElement('button');
    toggle.className = 'mob-toggle';
    toggle.id = 'mob-toggle';
    toggle.setAttribute('aria-label', 'Toggle menu');
    toggle.innerHTML = `<span></span><span></span><span></span>`;
    document.body.prepend(toggle);

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'mob-overlay';
    overlay.id = 'mob-overlay';
    document.body.prepend(overlay);
  }

  // ── State ──
  let isOpen = false;

  function openSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mob-overlay');
    const toggle  = document.getElementById('mob-toggle');
    if (!sidebar) return;

    isOpen = true;
    sidebar.classList.add('mob-open');
    overlay.classList.add('visible');
    toggle.classList.add('open');
    document.body.style.overflow = 'hidden'; // prevent background scroll
  }

  function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mob-overlay');
    const toggle  = document.getElementById('mob-toggle');
    if (!sidebar) return;

    isOpen = false;
    sidebar.classList.remove('mob-open');
    overlay.classList.remove('visible');
    toggle.classList.remove('open');
    document.body.style.overflow = '';
  }

  function toggleSidebar() {
    isOpen ? closeSidebar() : openSidebar();
  }

  // ── Close when a nav link is clicked (navigate away) ──
  function attachNavListeners() {
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) closeSidebar();
      });
    });
  }

  // ── Swipe gesture support ──
  let touchStartX = 0;
  let touchStartY = 0;
  const SWIPE_THRESHOLD   = 60;  // min px to count as swipe
  const EDGE_ZONE         = 32;  // px from left edge to trigger open swipe

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (window.innerWidth > 768) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    // Only horizontal swipes (ignore vertical scroll)
    if (Math.abs(dy) > Math.abs(dx)) return;

    // Swipe right from left edge → open
    if (!isOpen && dx > SWIPE_THRESHOLD && touchStartX < EDGE_ZONE) {
      openSidebar();
    }

    // Swipe left → close
    if (isOpen && dx < -SWIPE_THRESHOLD) {
      closeSidebar();
    }
  }, { passive: true });

  // ── Init ──
  document.addEventListener('DOMContentLoaded', () => {
    injectElements();

    // Hamburger click
    document.getElementById('mob-toggle').addEventListener('click', toggleSidebar);

    // Overlay click closes sidebar
    document.getElementById('mob-overlay').addEventListener('click', closeSidebar);

    // Nav links close sidebar on mobile
    attachNavListeners();

    // Close on resize to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && isOpen) closeSidebar();
    });
  });

})();