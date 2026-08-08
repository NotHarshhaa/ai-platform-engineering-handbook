// Documentation sidebar toggle
(() => {
  const storageKey = 'docs-sidebar-hidden';

  const getStoredState = () => {
    try {
      return window.localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  };

  const storeState = (isHidden) => {
    try {
      window.localStorage.setItem(storageKey, String(isHidden));
    } catch {
      // The control still works when storage is unavailable or blocked.
    }
  };

  const initSidebarToggle = () => {
    const sidebar = document.querySelector('.docs-sidebar');
    const pageHeader = document.querySelector('.docs-content .page-header');

    if (!sidebar || !pageHeader) return;
    if (pageHeader.querySelector('.docs-sidebar-toggle')) return;

    sidebar.id = 'docs-sidebar';

    const button = document.createElement('button');
    const icon = document.createElement('span');
    const label = document.createElement('span');
    button.type = 'button';
    button.className = 'docs-sidebar-toggle';
    button.setAttribute('aria-controls', sidebar.id);
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon, label);

    const actions = pageHeader.querySelector('#ai-dropdown')?.parentElement || document.createElement('div');
    actions.classList.add('docs-page-actions');
    if (!actions.isConnected) pageHeader.append(actions);
    actions.prepend(button);

    const setSidebarState = (isHidden) => {
      document.body.classList.toggle('docs-sidebar-hidden', isHidden);
      button.setAttribute('aria-expanded', String(!isHidden));
      button.setAttribute('aria-label', isHidden ? 'Show course navigation sidebar' : 'Hide course navigation sidebar');
      icon.textContent = isHidden ? '☰' : '×';
      label.textContent = isHidden ? 'Show navigation' : 'Hide navigation';
    };

    setSidebarState(getStoredState());

    button.addEventListener('click', () => {
      const isHidden = !document.body.classList.contains('docs-sidebar-hidden');
      setSidebarState(isHidden);
      storeState(isHidden);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarToggle, { once: true });
  } else {
    initSidebarToggle();
  }
})();

// Theme toggle — handle clicks on the button itself so icon styling cannot break it.
(() => {
  const initThemeToggle = () => {
    const button = document.getElementById('buttonColorMode');
    if (!button || button.dataset.themeToggleBound === 'true') return;

    button.dataset.themeToggleBound = 'true';

    const resolveTheme = () => {
      const current = document.documentElement.getAttribute('data-bs-theme') || 'light';
      if (current === 'auto') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return current;
    };

    const setTheme = (theme) => {
      document.documentElement.setAttribute('data-bs-theme', theme);
      try {
        window.localStorage.setItem('theme', theme);
      } catch {
        // Theme still switches when storage is unavailable.
      }
      document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    };

    button.addEventListener('click', () => {
      const next = resolveTheme() === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeToggle, { once: true });
  } else {
    initThemeToggle();
  }
})();



// Lock the page behind mobile navigation drawers without preventing the drawer's
// own `.offcanvas-body` from scrolling. Bootstrap emits these lifecycle events
// for both the section and main navigation off-canvas elements.
(() => {
  const drawerSelector = '#offcanvasNavMain, #offcanvasNavSection';
  const drawers = document.querySelectorAll(drawerSelector);

  if (!drawers.length) return;

  let lockedScrollY = 0;
  let isLocked = false;

  const lockPageScroll = () => {
    if (isLocked) return;

    lockedScrollY = window.scrollY;
    isLocked = true;
    document.documentElement.classList.add('offcanvas-scroll-locked');
    document.body.classList.add('offcanvas-scroll-locked');
    document.body.style.setProperty('--offcanvas-scroll-top', `-${lockedScrollY}px`);
  };

  const unlockPageScroll = () => {
    window.requestAnimationFrame(() => {
      const hasOpenDrawer = [...drawers].some((drawer) =>
        drawer.classList.contains('show') || drawer.classList.contains('showing')
      );

      if (hasOpenDrawer) return;

      document.documentElement.classList.remove('offcanvas-scroll-locked');
      document.body.classList.remove('offcanvas-scroll-locked');
      document.body.style.removeProperty('--offcanvas-scroll-top');
      window.scrollTo(0, lockedScrollY);
      isLocked = false;
    });
  };

  drawers.forEach((drawer) => {
    drawer.addEventListener('show.bs.offcanvas', lockPageScroll);
    drawer.addEventListener('hidden.bs.offcanvas', unlockPageScroll);
  });
})();
