// WebKit may paginate each cell separately, or clip the last rows when cells
// are made atomic. Build real page boundaries before opening its print panel.
export function installSafariPrintLayout() {
  if (!window.CSS?.supports?.('-webkit-hyphens', 'auto')) return;
  let output: HTMLElement | undefined;
  window.addEventListener('afterprint', () => output?.remove());
  window.addEventListener('beforeprint', () => {
    const source = document.querySelector<HTMLElement>('#a4-page');
    if (!source || source.closest('[hidden]')) return;
    output?.remove();
    output = document.createElement('div');
    output.className = 'native-print-document';
    document.body.append(output);
    const documentRoot = output;
    const newPage = () => {
      const page = document.createElement('div');
      page.className = 'a4-page';
      documentRoot.append(page);
      return page;
    };
    let page = newPage();
    // Leave 3 mm for rounding of native font metrics and printer units.
    const limit = 266 * 96 / 25.4;
    const overflows = () => page.getBoundingClientRect().height > limit;
    const appendBlock = (block: Element) => {
      const previous = page.childElementCount;
      page.append(block);
      if (previous && overflows()) {
        page = newPage();
        page.append(block);
      }
    };
    for (const child of source.children) {
      if (!child.classList.contains('a4-body')) {
        appendBlock(child.cloneNode(true) as Element);
        continue;
      }
      for (const category of child.children) {
        const rows = [...category.querySelectorAll('[data-preview-item]')];
        const template = category.cloneNode(true) as HTMLElement;
        template.querySelector('tbody, ol')?.replaceChildren();
        const makeSection = () => {
          const section = template.cloneNode(true) as HTMLElement;
          page.append(section);
          return section;
        };
        let section = makeSection();
        for (const [index, original] of rows.entries()) {
          const row = original.cloneNode(true) as HTMLElement;
          row.querySelectorAll('.preview-row-controls,.a4-item-remove').forEach(el => el.remove());
          const list = section.querySelector('tbody, ol')!;
          list.append(row);
          if (!overflows() || (list.children.length === 1 && page.childElementCount === 1)) continue;
          row.remove();
          if (!list.children.length) section.remove();
          page = newPage();
          section = makeSection();
          const nextList = section.querySelector<HTMLElement>('tbody, ol')!;
          if (nextList.tagName === 'OL') nextList.style.counterReset = 'item ' + index;
          nextList.append(row);
        }
      }
    }
  });
}
