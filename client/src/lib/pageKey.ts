export type PageKey =
  | 'home'
  | 'workbench'
  | 'history'
  | 'privacy'
  | 'analysis'
  | 'shared'
  | 'notFound';

/** Which page a path belongs to, so the tab title and description can match it. */
export function pageKeyForPath(pathname: string): PageKey {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') {
    return 'home';
  }
  if (path === '/workbench') {
    return 'workbench';
  }
  if (path === '/history') {
    return 'history';
  }
  if (path === '/privacy') {
    return 'privacy';
  }
  if (path.startsWith('/analyses/')) {
    return 'analysis';
  }
  if (path.startsWith('/shared/')) {
    return 'shared';
  }
  return 'notFound';
}
