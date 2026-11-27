import type { ReactNode } from 'react';

import { CreatorFooter } from '@/creator/CreatorFooter';
import {
  CreatorHeader,
  CreatorLanguageMenu,
  CreatorStatus,
} from '@/creator/CreatorShell';
import {
  currentLanguage,
  LANGUAGE_CODES,
  strings,
  type LanguageCode,
} from '@/strings';
import { contentPages, type ContentPageId } from '@/content-pages';

export { ContentPage, ContentMessage } from './react-content';

function Icon({ id }: { id: string }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
      <use href={'/icons.svg#icon-' + id} />
    </svg>
  );
}

function ToolbarButton({
  icon,
  label,
  id,
  shortcut,
  small,
}: {
  icon: string;
  label: string;
  id: string;
  shortcut?: string;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      id={id}
      className={small ? 'btn btn-small' : 'btn'}
      aria-label={label}
      aria-keyshortcuts={shortcut}
    >
      <Icon id={icon} />
      <span className="btn-label">{label}</span>
    </button>
  );
}

function ProjectActions({ mobile = false }: { mobile?: boolean }) {
  const actions = [
    ['config-save', 'download', strings.toolbar.saveConfig, 'Alt+S'],
    ['config-load', 'upload', strings.toolbar.loadConfig],
    ['history-undo', 'undo', strings.toolbar.undo, 'Control+Z Meta+Z'],
    [
      'history-redo',
      'redo',
      strings.toolbar.redo,
      'Control+Shift+Z Meta+Shift+Z',
    ],
    ['config-reset', 'trash', strings.toolbar.reset],
  ];
  return actions.map(([id, icon, label, shortcut]) => (
    <ToolbarButton
      key={id}
      id={mobile ? id + '-mobile' : id}
      icon={icon}
      label={label}
      shortcut={mobile ? undefined : shortcut}
    />
  ));
}

function ExportActions({ mobile = false }: { mobile?: boolean }) {
  const formats = [
    ['pdf-print', strings.toolbar.exportPdfPrint, 'pdf'],
    ['pdf-fillable', strings.toolbar.exportPdfFillable, 'pdf'],
    ['docx', strings.toolbar.exportDocx, 'doc'],
    ['xlsx', strings.toolbar.exportXlsx, 'xlsx'],
    ['odt', strings.toolbar.exportOdt, 'odt'],
  ];
  return formats.map(([id, label, icon]) => (
    <button
      key={id}
      type="button"
      data-export-format={id}
      className={mobile ? 'export-card-button' : 'menu-item'}
    >
      <Icon id={icon} />
      <span>{label}</span>
    </button>
  ));
}

function Toolbar() {
  return (
    <div
      className="action-bar action-bar--floating"
      role="toolbar"
      aria-label={strings.a11y.toolbar}
    >
      <div className="action-bar-inner">
        <div className="action-group">
          <ProjectActions />
        </div>
        <span className="divider" aria-hidden="true" />
        <div className="action-group">
          <details className="action-menu" id="export-menu">
            <summary
              className="btn menu-trigger"
              id="export-menu-trigger"
              aria-label={strings.toolbar.exportNow}
              aria-keyshortcuts="Alt+E"
            >
              <Icon id="download" />
              <span className="btn-label">{strings.toolbar.exportNow}</span>
            </summary>
            <div className="menu-panel">
              <ExportActions />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

function EditorSection({
  id,
  title,
  countId,
  children,
}: {
  id: string;
  title: string;
  countId?: string;
  children: ReactNode;
}) {
  const toggleId = 'sec-' + id + '-btn';
  const panelId = 'sec-' + id + '-panel';
  return (
    <section className="editor-section" data-section-id={id}>
      <h2 className="editor-section-title">
        <button
          id={toggleId}
          className="section-toggle"
          type="button"
          aria-expanded="true"
          aria-controls={panelId}
        >
          <span className="editor-section-title-text">{title}</span>
          {countId && (
            <span id={countId} className="editor-section-count" hidden />
          )}
        </button>
      </h2>
      <div
        id={panelId}
        className="editor-section-panel"
        role="region"
        aria-labelledby={toggleId}
      >
        {children}
      </div>
    </section>
  );
}

function EditorPane() {
  return (
    <aside
      id="workspace-edit"
      className="editor-pane"
      aria-label={strings.a11y.editorPane}
      data-mobile-panel="edit"
    >
      <div className="editor-start" id="editor-start">
        <button id="start-criteria" type="button" className="btn btn-primary">
          {strings.start.criteria}
        </button>
        <a href="/examples" data-app-route="examples" className="btn">
          {strings.start.example}
        </a>
        <button id="config-load-start" type="button" className="btn">
          {strings.start.project}
        </button>
      </div>
      <EditorSection
        id="criteria"
        title={strings.columns.categories}
        countId="criteria-count"
      >
        <div className="search-wrap">
          <label htmlFor="criteria-search" className="small-label">
            {strings.labels.searchCriteria}
          </label>
          <input
            id="criteria-search"
            type="search"
            className="criteria-search"
            placeholder={strings.labels.searchPlaceholder}
            autoComplete="off"
          />
        </div>
        <details className="scale-default-wrap">
          <summary>{strings.labels.defaultScale}</summary>
          <select
            id="default-scale"
            className="default-scale-select"
            aria-label={strings.labels.defaultScale}
          />
          <p className="scale-hint">{strings.labels.defaultScaleHint}</p>
        </details>
        <div id="categories" className="accordion" />
      </EditorSection>
      <EditorSection
        id="formats"
        title={strings.columns.productFormats}
        countId="product-format-count"
      >
        <div id="product-format-controls" className="product-format-controls" />
        <div
          id="product-format-categories"
          className="accordion product-format-categories"
        />
      </EditorSection>
      <EditorSection id="selected" title={strings.columns.selected}>
        <div className="selected-head">
          <div id="selected-counter" className="selected-counter" />
          <ToolbarButton
            small
            id="clear-selection"
            icon="trash"
            label={strings.labels.clearSelection}
          />
        </div>
        <div id="selected-list" className="selected-list" />
      </EditorSection>
      <div
        id="document-title-form"
        className="editor-title document-title-fields"
      />
      <EditorSection
        id="kopfdaten"
        title={strings.kopfdaten.title}
        countId="header-field-count"
      >
        <div id="kopfdaten-form" className="kopfdaten-fields" />
      </EditorSection>
      <EditorSection
        id="footer"
        title={strings.kopfdaten.footerTitle}
        countId="footer-field-count"
      >
        <div id="footer-fields" className="footer-fields" />
      </EditorSection>
    </aside>
  );
}

function Workspace() {
  const tabs = [
    ['edit', strings.labels.mobileEdit],
    ['preview', strings.labels.mobilePreview],
    ['export', strings.labels.mobileExport],
  ];
  return (
    <div className="workspace">
      <nav
        className="mobile-tabs"
        role="tablist"
        aria-label={strings.a11y.workspace}
      >
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={id === 'edit' ? 'mobile-tab active' : 'mobile-tab'}
            data-mobile-view={id}
            aria-selected={id === 'edit'}
            aria-controls={'workspace-' + id}
          >
            {label}
          </button>
        ))}
      </nav>
      <EditorPane />
      <section
        id="workspace-preview"
        className="preview-pane"
        data-mobile-panel="preview"
        aria-label={strings.a11y.previewPane}
      >
        <div className="preview-pane-inner">
          <div id="a4-page" className="a4-page" />
        </div>
        <Toolbar />
      </section>
      <section
        id="workspace-export"
        className="mobile-export-pane"
        data-mobile-panel="export"
        aria-label={strings.columns.export}
      >
        <section className="editor-section">
          <h2 className="editor-section-title">
            <span className="editor-section-title-text">
              {strings.columns.export}
            </span>
          </h2>
          <div className="mobile-export-actions">
            <ExportActions mobile />
          </div>
          <div className="mobile-secondary-actions">
            <ProjectActions mobile />
          </div>
        </section>
      </section>
    </div>
  );
}

function Header({
  onLanguageChange,
}: {
  onLanguageChange: (language: LanguageCode) => void;
}) {
  return (
    <CreatorHeader
      className="app-header"
      identity={
        <a
          className="brand"
          href="/"
          data-app-route="generator"
          aria-label={strings.appTitle}
        >
          <img
            src="/logo-wide.png"
            alt={strings.appTitle}
            className="brand__logo-wide"
          />
        </a>
      }
      controls={
        <>
          <CreatorLanguageMenu
            value={currentLanguage}
            languages={LANGUAGE_CODES}
            id="language-switch"
            className="language-switcher"
            onChange={onLanguageChange}
          />
          <div
            className="mode-switch"
            role="group"
            aria-label={strings.labels.previewMode}
          >
            <button
              type="button"
              className="mode-tab active"
              aria-pressed="true"
              data-mode="full"
            >
              {strings.modes.full}
            </button>
            <button
              type="button"
              className="mode-tab"
              aria-pressed="false"
              data-mode="checklist"
            >
              {strings.modes.checklist}
            </button>
          </div>
        </>
      }
    />
  );
}

function Footer() {
  const pages: ContentPageId[] = [
    'help',
    'examples',
    'support',
    'about',
    'terms',
    'imprint',
    'privacy',
  ];
  return (
    <CreatorFooter
      locale={currentLanguage}
      className="app-footer"
      innerClassName="app-footer-links"
      navClassName="app-footer-nav"
      navigationLabel={strings.a11y.footerNav}
      identity={
        <div className="footer-identity">
          <a href="https://haak3.de/" className="footer-brand">
            haak3
          </a>
          <span className="app-footer-note">{strings.footerNote}</span>
        </div>
      }
      links={pages.map((id) =>
        id === 'support' ? (
          <a
            key={id}
            href={contentPages[id].path}
            className="bmc-link"
            data-app-route={id}
            aria-label={strings.contentLinks.support}
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
            </svg>
            <span className="bmc-link-label">
              {strings.contentLinks.support}
            </span>
          </a>
        ) : (
          <a key={id} href={contentPages[id].path} data-app-route={id}>
            {strings.contentLinks[id]}
          </a>
        )
      )}
      actions={
        <a
          className="github-link"
          href="https://github.com/ChristianHaake/Feedbackbogen-Generator"
          aria-label={strings.appTitle + ' – ' + strings.footer.githubAria}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 16 16">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.5 7.5 0 0 1 8 3.86c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
            />
          </svg>
          <span className="github-link-label" aria-hidden="true">
            {strings.footer.githubAria}
          </span>
        </a>
      }
    />
  );
}

interface GeneratorShellProps {
  onLanguageChange: (language: LanguageCode) => void;
  content?: ReactNode;
}

export function GeneratorShell({
  onLanguageChange,
  content,
}: GeneratorShellProps) {
  return (
    <div id="app-root" className="app">
      <Header onLanguageChange={onLanguageChange} />
      <input id="config-file" type="file" accept="application/json" hidden />
      <div id="config-message" className="config-message" role="alert" hidden />
      <Workspace />
      <main id="content-page" className="content-page" hidden>
        {content}
      </main>
      <Footer />
      <div id="product-format-modal-root" />
      <div id="reset-confirm-modal-root" />
      <CreatorStatus id="aria-live" className="sr-only">
        {null}
      </CreatorStatus>
      <div
        id="app-toast"
        className="app-toast"
        role="status"
        aria-live="polite"
        hidden
      />
    </div>
  );
}
