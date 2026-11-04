import autoprefixer from 'autoprefixer';
import purgeCSSPlugin from '@fullhuman/postcss-purgecss';

const purgecss = purgeCSSPlugin({
    content: ['./hugo_stats.json'],
    defaultExtractor: (content) => {
        const els = JSON.parse(content).htmlElements;
        return [...(els.tags || []), ...(els.classes || []), ...(els.ids || [])];
    },
    dynamicAttributes: [
        'aria-controls',
        'aria-expanded',
        'aria-label',
        'aria-pressed',
        'data-bs-popper',
        'data-bs-target',
        'data-bs-theme',
        'data-dark-mode',
        'data-global-alert',
        'data-pane', // tabs.js
        'data-popper-placement',
        'data-sizes',
        'data-state', // course card badges (custom.js)
        'data-toggle-tab', // tabs.js
        'id',
        'size',
        'type'
    ],
    safelist: {
        standard: [
            'active',
            'btn-clipboard', // clipboards.js
            'clipboard', // clipboards.js
            'disabled',
            'fade', // to-top.js toggles it at runtime
            'hidden',
            'modal-backdrop', // search-modal.js
            'selected', // search-modal.js
            'show',
            'img-fluid',
            'blur-up',
            'lazyload',
            'lazyloaded',
            'alert-link',
            'container-fw ',
            'container-lg',
            'container-fluid',
            'offcanvas-backdrop',
            'figcaption',
            'dt',
            'dd',
            'showing',
            'hiding',
            'page-item',
            'page-link',
            'not-content',
            'copy',
            'btn-copy',
            'd-none', // handbook ring visibility classes (custom.js)
            'd-lg-none',
            'd-lg-inline-flex',
            // Docs dynamic classes injected by assets/js/custom.js
            'docs-page-actions',
            'docs-sidebar-toggle',
            'docs-sidebar-toggle__icon',
            'docs-sidebar-hidden',
            'docs-complete-toggle',
            'docs-complete-toggle__icon',
            'docs-complete-toggle__label',
            'docs-bookmark-toggle',
            'docs-bookmark-toggle__icon',
            'docs-bookmark-toggle__label',
            'is-complete',
            'is-bookmarked',
            'reading-progress',
            'docs-progress',
            'docs-progress__head',
            'docs-progress__track',
            'docs-progress__bar',
            'docs-progress--standalone',
            'course-index__continue',
            'course-index__badge',
            'course-index__bookmarks',
            'course-index__bookmarks-head',
            'course-index__bookmark',
            'course-index__bookmark-star',
            'course-index__bookmark-remove',
            'handbook-ring',
            'handbook-ring__svg',
            'handbook-ring__track',
            'handbook-ring__bar',
            'handbook-ring__label',
            // Code block classes
            'code-block',
            'code-block__header',
            'code-block__meta',
            'code-block__dots',
            'code-block__title',
            'code-block__copy',
            'code-block__copy-text',
            'code-block__body',
            'is-copied',
            'is-diagram',
            'dot',
            'dot--red',
            'dot--amber',
            'dot--green',
            'icon-copy',
            'icon-check'
        ],
        deep: [
            /^docs-complete-toggle/,
            /^docs-sidebar-toggle/,
            /^docs-page-actions/,
            /^docs-progress/,
            /^course-index/,
            /^code-block/,
            /^handbook-ring/,
            /^docs-bookmark/
        ],
        greedy: [
            /^docs-complete-toggle/,
            /^docs-sidebar/,
            /^docs-page-actions/,
            /^docs-progress/,
            /is-complete/,
            /reading-progress/,
            /^code-block/,
            /is-copied/,
            /is-diagram/,
            /handbook-ring/,
            /docs-bookmark/,
            /course-index__badge/,
            /course-index__bookmark/,
            /is-bookmarked/,
            /fade/
        ]
    }
});

export default {
    plugins: [autoprefixer(), ...(process.env.HUGO_ENVIRONMENT === 'production' ? [purgecss] : [])]
};
