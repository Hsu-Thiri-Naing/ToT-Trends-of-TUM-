export function readScrollPosition(panel) {
  return {
    page: document.scrollingElement?.scrollTop ?? 0,
    body: document.body.scrollTop,
    panel: panel?.scrollTop ?? 0,
  };
}

export function restoreScrollPosition(position, panel) {
  const page = document.scrollingElement;
  if (page) page.scrollTop = position?.page ?? 0;
  document.body.scrollTop = position?.body ?? 0;
  if (panel) panel.scrollTop = position?.panel ?? 0;
}
