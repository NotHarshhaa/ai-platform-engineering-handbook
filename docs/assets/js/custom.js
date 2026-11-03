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

  // Drawn icons (tabler outline) instead of text glyphs so they match the
  // theme's icon set in weight and stroke.
  const ICON_SHOW =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></svg>';
  const ICON_HIDE =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>';

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
    icon.className = 'docs-sidebar-toggle__icon';
    button.append(icon, label);

    const actions = pageHeader.querySelector('#ai-dropdown')?.parentElement || document.createElement('div');
    actions.classList.add('docs-page-actions');
    if (!actions.isConnected) pageHeader.append(actions);
    actions.append(button);

    const setSidebarState = (isHidden) => {
      document.body.classList.toggle('docs-sidebar-hidden', isHidden);
      button.setAttribute('aria-expanded', String(!isHidden));
      button.setAttribute('aria-label', isHidden ? 'Show course navigation sidebar' : 'Hide course navigation sidebar');
      icon.innerHTML = isHidden ? ICON_SHOW : ICON_HIDE;
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

// Course progress: mark modules complete, reflect state in the sidebar and
// show an overall progress figure. Stored in localStorage; no backend.
(() => {
  const STORAGE_KEY = 'handbook-progress';
  const CHECK_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l6 6L20 6" /></svg>';

  const readState = () => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };

  const writeState = (state) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The toggle still works per page view when storage is blocked.
    }
  };

  const normalizePath = () => {
    let path = window.location.pathname;
    if (!path.endsWith('/')) path += '/';
    return path;
  };

  const isModulePath = (path) => /^\/docs\/week-\d+\/[^/]+\/$/.test(path);

  const renderSidebarProgress = () => {
    const nav = document.querySelector('.docs-sidebar .section-nav');
    if (!nav) return;

    const links = [...nav.querySelectorAll('a[href]')].filter((a) => isModulePath(a.getAttribute('href')));
    if (!links.length) return;

    const state = readState();
    let done = 0;
    links.forEach((a) => {
      const complete = Boolean(state[a.getAttribute('href')]);
      a.classList.toggle('is-complete', complete);
      if (complete) done += 1;
    });

    let box = nav.querySelector('.docs-progress');
    if (!box) {
      box = document.createElement('div');
      box.className = 'docs-progress';
      nav.prepend(box);
    }
    const pct = Math.round((done / links.length) * 100);
    box.innerHTML =
      '<div class="docs-progress__head"><span>' + done + ' of ' + links.length + ' modules</span><strong>' + pct + '%</strong></div>' +
      '<div class="docs-progress__track" role="progressbar" aria-label="Handbook progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '">' +
      '<div class="docs-progress__bar" style="width: ' + pct + '%"></div></div>';
  };

  const initCompleteToggle = () => {
    const header = document.querySelector('.docs-content .page-header');
    const path = normalizePath();
    if (!header || !isModulePath(path) || header.querySelector('.docs-complete-toggle')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'docs-complete-toggle';
    const icon = document.createElement('span');
    icon.className = 'docs-complete-toggle__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = CHECK_SVG;
    const label = document.createElement('span');
    label.className = 'docs-complete-toggle__label';
    button.append(icon, label);

    const actions = header.querySelector('.docs-page-actions') || (() => {
      const div = document.createElement('div');
      div.className = 'docs-page-actions';
      header.append(div);
      return div;
    })();
    actions.prepend(button);

    const setDone = (done) => {
      button.classList.toggle('is-complete', done);
      button.setAttribute('aria-pressed', String(done));
      button.setAttribute('aria-label', done ? 'Module completed; select to mark as not complete' : 'Mark this module as complete');
      label.textContent = done ? 'Completed' : 'Mark complete';
    };

    setDone(Boolean(readState()[path]));

    button.addEventListener('click', () => {
      const state = readState();
      const nowDone = !state[path];
      if (nowDone) state[path] = true;
      else delete state[path];
      writeState(state);
      setDone(nowDone);
      renderSidebarProgress();
    });
  };

  const init = () => {
    initCompleteToggle();
    renderSidebarProgress();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

// Reading progress bar: fills as the reader moves through the article.
(() => {
  const initReadingProgress = () => {
    const content = document.querySelector('.docs-content');
    if (!content || document.querySelector('.reading-progress')) return;

    const bar = document.createElement('div');
    bar.className = 'reading-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.append(bar);

    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = content.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) {
        bar.style.transform = 'scaleX(0)';
        return;
      }
      const done = Math.min(Math.max(-rect.top, 0), total);
      bar.style.transform = 'scaleX(' + done / total + ')';
    };
    const requestUpdate = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    update();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReadingProgress, { once: true });
  } else {
    initReadingProgress();
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



// Mobile offcanvas: rely on Bootstrap's built-in scroll lock (custom position:fixed
// locking conflicted with offcanvas open/close and left the page stuck).

// TOC highlighting: with valid heading IDs Bootstrap ScrollSpy marks the TOC
// anchor itself as active via the activate event. Mirror the event onto the
// matching TOC link when the event reports a section element instead.
(() => {
  const highlightToc = (event) => {
    const target = event.relatedTarget;
    if (!target) return;

    if (target.matches && target.matches('#toc a, #TableOfContents a')) {
      if (target.classList.contains('active')) return;
    }

    const id = target.id || (target.hash ? target.hash.slice(1) : '');
    if (!id) return;

    document.querySelectorAll('#toc a.active, #TableOfContents a.active').forEach((link) => {
      link.classList.remove('active');
    });
    const link = document.querySelector(`#toc a[href="#${id}"], #TableOfContents a[href="#${id}"]`);
    if (link) link.classList.add('active');
  };

  document.addEventListener('activate.bs.scrollspy', highlightToc);
})();
