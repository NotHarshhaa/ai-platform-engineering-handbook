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
