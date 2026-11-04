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

    // Drawn icons (tabler outline) so they match the theme's icon set in weight
    // and stroke. The sidebar toggle uses a panel glyph on both states — the
    // label carries the action, and an X glyph read like a close button.
    const ICON_SIDEBAR = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="0" /><path d="M9 4v16" /><path d="M13 12h4" /></svg>';

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
            icon.innerHTML = ICON_SIDEBAR;
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
    const CHECK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l6 6L20 6" /></svg>';

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
        box.innerHTML = '<div class="docs-progress__head"><span>' + done + ' of ' + links.length + ' modules</span><strong>' + pct + '%</strong></div>' + '<div class="docs-progress__track" role="progressbar" aria-label="Handbook progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '">' + '<div class="docs-progress__bar" style="width: ' + pct + '%"></div></div>';
    };

    // Progress boxes on the course pages (docs index: whole handbook; week
    // pages: that week only, counted from the module links beside the box).
    const renderProgressBoxes = () => {
        const state = readState();
        document.querySelectorAll('[data-handbook-progress]').forEach((box) => {
            let done = 0;
            let total = parseInt(box.dataset.totalModules, 10) || 0;
            if (box.dataset.progress === 'week') {
                // The week's module links are siblings of the box inside the hero
                // progress panel, so search the panel rather than the box itself.
                const links = [...box.parentElement.querySelectorAll('a[href]')].filter((a) => isModulePath(a.getAttribute('href')));
                done = links.filter((a) => state[a.getAttribute('href')]).length;
                total = total || links.length;
            } else {
                done = Object.keys(state).filter(isModulePath).length;
            }
            const pct = total ? Math.round((done / total) * 100) : 0;
            box.innerHTML = '<div class="docs-progress__head"><span>' + done + ' of ' + total + ' modules</span><strong>' + pct + '%</strong></div>' + '<div class="docs-progress__track" role="progressbar" aria-label="Course progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '">' + '<div class="docs-progress__bar" style="width: ' + pct + '%"></div></div>';
        });
    };

    // Completed-module markers on the course catalogue and week pages.
    const markCourseLinks = () => {
        const state = readState();
        document.querySelectorAll('.course-index a[href]').forEach((a) => {
            const href = a.getAttribute('href');
            if (!isModulePath(href)) return;
            const complete = Boolean(state[href]);
            a.classList.toggle('is-complete', complete);
            const stage = a.closest('.course-index__stage');
            if (stage) stage.classList.toggle('is-complete', complete);
        });
    };

    // "Continue where you left off" row on the course index.
    const renderContinue = () => {
        const slot = document.querySelector('[data-handbook-continue]');
        if (!slot) return;
        let last = null;
        try {
            last = JSON.parse(window.localStorage.getItem('handbook-last') || 'null');
        } catch {
            return;
        }
        if (!last || !isModulePath(last.href || '')) return;
        // The stored title is untrusted input (page titles contain "&" and
        // localStorage is writable), so escape it before the innerHTML build.
        const escapeHtml = (value) =>
            String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        slot.innerHTML = '<a class="course-index__continue" href="' + escapeHtml(last.href) + '">Continue where you left off: <strong>' + escapeHtml(last.title || '') + '</strong><span aria-hidden="true">→</span></a>';
    };

    // Remember the most recent module for the continue row.
    const rememberLastModule = () => {
        const path = normalizePath();
        if (!isModulePath(path)) return;
        try {
            window.localStorage.setItem(
                'handbook-last',
                JSON.stringify({
                    href: path,
                    title: document.title.replace(/ \| .*$/, '')
                })
            );
        } catch {
            // The continue row simply stays empty when storage is unavailable.
        }
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

        const actions =
            header.querySelector('.docs-page-actions') ||
            (() => {
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
            renderProgressBoxes();
            markCourseLinks();
            // Signals for the other reader features (navbar ring, card badges)
            // that derive from the same progress state.
            document.dispatchEvent(new CustomEvent('handbook:progress'));
        });
    };

    const init = () => {
        initCompleteToggle();
        rememberLastModule();
        renderSidebarProgress();
        renderProgressBoxes();
        markCourseLinks();
        renderContinue();
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

// Keyboard navigation between modules: ← / → (or J / K) follow the prev/next
// cards at the end of each module. Guarded so typing and open overlays win.
(() => {
    const initKeyNav = () => {
        const nav = document.querySelector('.docs-content .page-nav');
        if (!nav) return;

        // The theme renders the previous card first and the next card last (the
        // next card is the right-aligned one when both exist).
        const prev = nav.querySelector('.card:not(.text-end) a');
        const next = nav.querySelector('.card.text-end a');
        if (!prev && !next) return;

        if (prev) prev.setAttribute('title', 'Previous module (←)');
        if (next) next.setAttribute('title', 'Next module (→)');

        document.addEventListener('keydown', (event) => {
            if (event.altKey || event.ctrlKey || event.metaKey) return;
            if (document.querySelector('.modal.show, .offcanvas.show')) return;

            const target = event.target;
            if (target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))) return;

            const go = (link) => {
                if (!link) return;
                event.preventDefault();
                window.location.href = link.href;
            };

            if (event.key === 'ArrowLeft') {
                // Arrows also scroll focused elements (e.g. code blocks); only take
                // them over when nothing in particular has focus.
                if (target && target !== document.body && target !== document.documentElement && target !== document) return;
                go(prev);
            } else if (event.key === 'ArrowRight') {
                if (target && target !== document.body && target !== document.documentElement && target !== document) return;
                go(next);
            } else if (event.key === 'j' || event.key === 'J') {
                go(next);
            } else if (event.key === 'k' || event.key === 'K') {
                go(prev);
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initKeyNav, { once: true });
    } else {
        initKeyNav();
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


// Universal code block copy button
(() => {
  const initCodeCopy = () => {
    document.querySelectorAll('.code-block__copy').forEach((button) => {
      if (button.dataset.copyBound === 'true') return;
      button.dataset.copyBound = 'true';

      button.addEventListener('click', async () => {
        const block = button.closest('.code-block');
        if (!block) return;
        const code = block.querySelector('.code-block__body code') || block.querySelector('pre');
        if (!code) return;

        const text = code.innerText || code.textContent || '';
        const label = button.querySelector('.code-block__copy-text');

        const onSuccess = () => {
          button.classList.add('is-copied');
          if (label) label.textContent = 'Copied!';
          setTimeout(() => {
            button.classList.remove('is-copied');
            if (label) label.textContent = 'Copy';
          }, 2000);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(text);
            onSuccess();
            return;
          } catch {
            // fallback below
          }
        }

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          onSuccess();
        } finally {
          textarea.remove();
        }
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCodeCopy, { once: true });
  } else {
    initCodeCopy();
  }
})();

// Navbar progress ring: a compact handbook-completion indicator next to the
// navbar actions, linked to the course index. Rendered twice (desktop actions
// row and mobile top bar) and updated live via the handbook:progress event.
(() => {
    const STORAGE_KEY = 'handbook-progress';
    const RING_CIRCUMFERENCE = 97.4; // r = 15.5 on a 36 viewBox

    const isModulePath = (path) => /^\/docs\/week-\d+\/[^/]+\/$/.test(path);

    const readState = () => {
        try {
            const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    };

    const getTotal = () => {
        const attr = parseInt(document.body.dataset.handbookTotalModules, 10);
        if (attr > 0) return attr;
        const nav = document.querySelector('.docs-sidebar .section-nav');
        if (nav) return [...nav.querySelectorAll('a[href]')].filter((a) => isModulePath(a.getAttribute('href'))).length;
        return 0;
    };

    const buildRing = () => {
        const ring = document.createElement('a');
        ring.className = 'handbook-ring';
        ring.href = '/docs/';
        ring.innerHTML =
            '<svg class="handbook-ring__svg" viewBox="0 0 36 36" aria-hidden="true">' +
            '<circle class="handbook-ring__track" cx="18" cy="18" r="15.5"></circle>' +
            '<circle class="handbook-ring__bar" cx="18" cy="18" r="15.5"></circle>' +
            '</svg>' +
            '<span class="handbook-ring__label">0%</span>';
        return ring;
    };

    const render = () => {
        const rings = document.querySelectorAll('.handbook-ring');
        if (!rings.length) return;
        const done = Object.keys(readState()).filter(isModulePath).length;
        const total = getTotal();
        const pct = total ? Math.round((done / total) * 100) : 0;
        rings.forEach((ring) => {
            ring.querySelector('.handbook-ring__bar').style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - pct / 100));
            const label = ring.querySelector('.handbook-ring__label');
            if (label) label.textContent = pct + '%';
            const text = total ? 'Handbook progress: ' + pct + '% (' + done + ' of ' + total + ' modules complete)' : 'Handbook progress';
            ring.title = text;
            ring.setAttribute('aria-label', text);
        });
    };

    const init = () => {
        // Desktop: inside the collapsed-offcanvas row, ahead of the search button.
        const desktopBody = document.querySelector('#offcanvasNavMain .offcanvas-body');
        if (desktopBody && !desktopBody.querySelector('.handbook-ring')) {
            const ring = buildRing();
            ring.classList.add('d-none', 'd-lg-inline-flex');
            const search = document.getElementById('searchToggleDesktop');
            if (search) desktopBody.insertBefore(ring, search);
            else desktopBody.append(ring);
        }
        // Mobile: in the top bar, ahead of the mobile search button.
        const container = document.querySelector('header.navbar > div[class*="container"]');
        if (container && !container.querySelector(':scope > .handbook-ring')) {
            const ring = buildRing();
            ring.classList.add('d-lg-none');
            const anchor = document.getElementById('searchToggleMobile');
            if (anchor) container.insertBefore(ring, anchor);
            else container.append(ring);
        }
        render();
    };

    document.addEventListener('handbook:progress', render);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();

// Week badges on the course cards: the catalogue cards show "N/M done" for
// their week; the week-page module cards show a completed chip when their
// module is marked complete.
(() => {
    const STORAGE_KEY = 'handbook-progress';
    const CHECK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l6 6L20 6" /></svg>';

    const isModulePath = (path) => /^\/docs\/week-\d+\/[^/]+\/$/.test(path);
    const isWeekPath = (path) => /^\/docs\/week-\d+\/$/.test(path);

    const readState = () => {
        try {
            const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    };

    const ensureBadge = (card) => {
        let badge = card.querySelector(':scope > .course-index__card-top > .course-index__badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'course-index__badge';
            const top = card.querySelector('.course-index__card-top');
            const count = top ? top.querySelector('.course-index__count') : null;
            if (count) top.insertBefore(badge, count);
            else if (top) top.append(badge);
            else return null;
        }
        return badge;
    };

    const render = () => {
        const state = readState();
        document.querySelectorAll('.course-index__card').forEach((card) => {
            const explore = card.querySelector('.course-index__explore[href]');
            const weekHref = explore ? explore.getAttribute('href') : '';
            const moduleLink = card.querySelector('h3 a[href]');
            const moduleHref = moduleLink ? moduleLink.getAttribute('href') : '';

            if (isWeekPath(weekHref)) {
                const total = parseInt(card.dataset.totalModules, 10) || 0;
                const done = Object.keys(state).filter((h) => h.startsWith(weekHref) && isModulePath(h)).length;
                const complete = total > 0 && done === total;
                if (!total) return;
                const badge = ensureBadge(card);
                if (!badge) return;
                badge.innerHTML = '<b>' + done + '</b>&#8202;/&#8202;' + total + ' done';
                badge.dataset.state = complete ? 'done' : 'open';
                badge.setAttribute('aria-label', done + ' of ' + total + ' modules complete');
                card.classList.toggle('is-complete', complete);
            } else if (isModulePath(moduleHref)) {
                const complete = Boolean(state[moduleHref]);
                card.classList.toggle('is-complete', complete);
                const badge = ensureBadge(card);
                if (!badge) return;
                if (complete) {
                    badge.innerHTML = CHECK_SVG + '<span>Completed</span>';
                    badge.dataset.state = 'done';
                } else {
                    badge.remove();
                }
            }
        });
    };

    document.addEventListener('handbook:progress', render);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render, { once: true });
    } else {
        render();
    }
})();

// Bookmarks: save modules with a star toggle in the page header; the handbook
// index renders the saved list from localStorage. No backend.
(() => {
    const STORAGE_KEY = 'handbook-bookmarks';
    const STAR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17.75l-6.172 3.655l1.179 -6.873l-5.004 -4.867l6.9 -1.002l3.097 -6.163l3.096 6.163l6.9 1.002l-5.004 4.867l1.179 6.873z" /></svg>';

    const isModulePath = (path) => /^\/docs\/week-\d+\/[^/]+\/$/.test(path);

    const normalizePath = () => {
        let path = window.location.pathname;
        if (!path.endsWith('/')) path += '/';
        return path;
    };

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

    const escapeHtml = (value) =>
        String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const initBookmarkToggle = () => {
        const header = document.querySelector('.docs-content .page-header');
        const path = normalizePath();
        if (!header || !isModulePath(path) || header.querySelector('.docs-bookmark-toggle')) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'docs-bookmark-toggle';
        const icon = document.createElement('span');
        icon.className = 'docs-bookmark-toggle__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = STAR_SVG;
        const label = document.createElement('span');
        label.className = 'docs-bookmark-toggle__label';
        button.append(icon, label);

        const actions =
            header.querySelector('.docs-page-actions') ||
            (() => {
                const div = document.createElement('div');
                div.className = 'docs-page-actions';
                header.append(div);
                return div;
            })();
        const complete = actions.querySelector('.docs-complete-toggle');
        if (complete) complete.after(button);
        else actions.prepend(button);

        const setSaved = (saved) => {
            button.classList.toggle('is-bookmarked', saved);
            button.setAttribute('aria-pressed', String(saved));
            button.setAttribute('aria-label', saved ? 'Saved to bookmarks; select to remove' : 'Bookmark this module');
            button.title = saved ? 'Remove from bookmarks' : 'Bookmark this module';
            label.textContent = saved ? 'Saved' : 'Bookmark';
        };

        setSaved(Boolean(readState()[path]));

        button.addEventListener('click', () => {
            const state = readState();
            const nowSaved = !state[path];
            if (nowSaved) state[path] = document.title.replace(/ \| .*$/, '');
            else delete state[path];
            writeState(state);
            setSaved(nowSaved);
        });
    };

    const renderBookmarkList = () => {
        const slot = document.querySelector('[data-handbook-bookmarks]');
        if (!slot) return;
        const entries = Object.entries(readState()).filter(([href]) => isModulePath(href));
        if (!entries.length) {
            slot.innerHTML = '';
            return;
        }
        slot.innerHTML =
            '<div class="course-index__bookmarks"><div class="course-index__bookmarks-head">Your bookmarks</div>' +
            entries
                .map(
                    ([href, title]) =>
                        '<div class="course-index__bookmark" data-href="' + escapeHtml(href) + '">' +
                        '<a href="' + escapeHtml(href) + '"><span class="course-index__bookmark-star">' + STAR_SVG + '</span><strong>' + escapeHtml(title || href) + '</strong></a>' +
                        '<button type="button" class="course-index__bookmark-remove" aria-label="Remove bookmark: ' + escapeHtml(title || href) + '">&times;</button>' +
                        '</div>'
                )
                .join('') +
            '</div>';

        slot.querySelectorAll('.course-index__bookmark-remove').forEach((btn) => {
            btn.addEventListener('click', () => {
                const row = btn.closest('.course-index__bookmark');
                if (!row) return;
                const state = readState();
                delete state[row.dataset.href];
                writeState(state);
                renderBookmarkList();
            });
        });
    };

    const init = () => {
        initBookmarkToggle();
        renderBookmarkList();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
