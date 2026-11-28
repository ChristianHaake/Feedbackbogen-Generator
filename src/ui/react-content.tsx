import { Fragment, type ReactNode } from 'react';

import { strings } from '@/strings';
import type { ContentPageId } from '@/content-pages';

const headingPattern = /^(#{1,3})\s+(.+)$/;
const bulletPattern = /^-\s+/;

function inlineContent(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Only the site's feedback address and explicit web links are linkified.
  const links =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:apps@haak3\.de\?subject=Feedbackbogen-Generator%20Feedback)\)|(https?:\/\/[^\s]+)/g;
  let last = 0;
  for (const match of text.matchAll(links)) {
    const start = match.index!;
    if (start > last) nodes.push(text.slice(last, start));
    const href = match[2] ?? match[3];
    const external = href.startsWith('http');
    nodes.push(
      <a
        key={start}
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {match[1] ?? href}
      </a>
    );
    last = start + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function markdownBlocks(markdown: string, fallbackTitle: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let hasTitle = false;
  let line = 0;
  while (line < lines.length) {
    const start = line;
    const trimmed = lines[line].trim();
    if (!trimmed) {
      line++;
      continue;
    }
    const heading = headingPattern.exec(trimmed);
    if (heading) {
      const Heading =
        heading[1].length === 1 ? 'h1' : heading[1].length === 2 ? 'h2' : 'h3';
      const id = hasTitle ? undefined : 'content-page-title';
      hasTitle = true;
      blocks.push(
        <Heading key={start} id={id}>
          {inlineContent(heading[2].trim())}
        </Heading>
      );
      line++;
      continue;
    }
    if (bulletPattern.test(lines[line].trimStart())) {
      const items: ReactNode[] = [];
      while (
        line < lines.length &&
        bulletPattern.test(lines[line].trimStart())
      ) {
        items.push(
          <li key={line}>
            {inlineContent(lines[line].trimStart().replace(bulletPattern, ''))}
          </li>
        );
        line++;
      }
      blocks.push(<ul key={start}>{items}</ul>);
      continue;
    }
    const paragraph: ReactNode[] = [];
    while (
      line < lines.length &&
      lines[line].trim() &&
      !headingPattern.test(lines[line].trim()) &&
      !bulletPattern.test(lines[line].trimStart())
    ) {
      paragraph.push(
        <Fragment key={line}>
          {line > start && <br />}
          {inlineContent(lines[line].trimEnd())}
        </Fragment>
      );
      line++;
    }
    blocks.push(<p key={start}>{paragraph}</p>);
  }
  if (!hasTitle)
    blocks.unshift(
      <h1 key="title" id="content-page-title">
        {fallbackTitle}
      </h1>
    );
  return blocks;
}

function BackLink() {
  return (
    <a className="content-back-link" href="/" data-app-route="generator">
      {strings.footer.backToApp(strings.appTitle)}
    </a>
  );
}

export function ContentPage({
  pageId,
  markdown,
}: {
  pageId: ContentPageId;
  markdown: string;
}) {
  return (
    <article className="content-page-card" aria-labelledby="content-page-title">
      <BackLink />
      {markdownBlocks(markdown, strings.contentLinks[pageId])}
      {pageId === 'examples' && (
        <button type="button" className="btn btn-primary" id="open-example">
          {strings.contentLinks.openExample}
        </button>
      )}
    </article>
  );
}

export function ContentMessage({ error = false }: { error?: boolean }) {
  return (
    <article className="content-page-card">
      <p>
        {error
          ? strings.messages.contentPageLoadError
          : strings.messages.contentPageLoading}
      </p>
      {error && <BackLink />}
    </article>
  );
}
