export function withinSite(value, allowedSite) {
  try {
    const url = new URL(value), site = new URL(allowedSite);
    if (url.protocol !== 'https:' || url.origin.toLowerCase() !== site.origin.toLowerCase() ||
      url.username || url.password || url.search || url.hash || /%2f|%5c/i.test(value)) return false;
    const segments = decodeURIComponent(url.pathname).split('/');
    if (segments.some(segment => segment === '..' || segment === '.' || segment.includes('\\'))) return false;
    const pathname = url.pathname.replace(/\/+$/, '').toLowerCase();
    const base = site.pathname.replace(/\/+$/, '').toLowerCase();
    return pathname === base || pathname.startsWith(`${base}/`);
  } catch { return false; }
}

const relativePath = value => typeof value === 'string' && value.length > 0 &&
  !/^[\\/]|[:?#]|%2f|%5c/i.test(value) &&
  value.split(/[\\/]/).every(segment => segment && segment !== '.' && segment !== '..' &&
    decodeURIComponent(segment) !== '..' && decodeURIComponent(segment) !== '.');

export class WriteBoundary {
  constructor({ siteUrl, siteKey, libraryUrl, libraryRelativeUrl, listId, ownedItems = [], ownedPaths = [] }) {
    if (!withinSite(libraryUrl, siteUrl)) throw new Error('Owned library is outside the exact allowed site.');
    Object.assign(this, { siteUrl, siteKey, libraryUrl, libraryRelativeUrl, listId });
    this.items = new Set(ownedItems.map(String));
    this.paths = new Set(ownedPaths);
  }
  authorize(name, body) {
    const deny = reason => { throw new Error(`Write boundary: ${reason}`); };
    if (body.siteKey !== this.siteKey) deny('unresolved or outside site key');
    if (body.listId !== undefined && body.listId !== this.listId) deny('unowned list ID');
    if (body.listFullUrl !== undefined && (body.listFullUrl !== this.libraryUrl ||
      !withinSite(body.listFullUrl, this.siteUrl))) deny('unowned library');
    if (body.listUrl !== undefined && body.listUrl !== this.libraryRelativeUrl) deny('unowned list URL');
    switch (name) {
      case 'create_folder':
        if (body.listFullUrl !== this.libraryUrl || body.listId !== this.listId ||
          !body.folders?.length) deny('missing owned parent');
        for (const folder of body.folders) {
          if (!relativePath(folder.name) || /[\\/"*:<>?|]/.test(folder.name) || folder.name.endsWith('.')) deny('invalid folder name');
          if (folder.relativeFolderPath && (!relativePath(folder.relativeFolderPath) ||
            !this.paths.has(folder.relativeFolderPath))) deny('unowned parent folder');
        }
        break;
      case 'rename_item':
        if (body.listFullUrl !== this.libraryUrl || !body.libraryRelativePaths?.length ||
          body.libraryRelativePaths.length !== body.newNames?.length) deny('invalid rename targets');
        body.libraryRelativePaths.forEach((value, index) => {
          if (!relativePath(value) || !this.paths.has(value)) deny('unowned source');
          if (!relativePath(body.newNames[index]) || /[\\/]/.test(body.newNames[index])) deny('invalid destination name');
        });
        break;
      case 'update_list_items_v2':
        if (body.listUrl !== this.libraryRelativeUrl || !body.items?.length ||
          body.items.some(item => !this.items.has(String(item.itemId)))) deny('unowned update target');
        break;
      case 'delete_list_item':
        if (body.listId !== this.listId || !body.items?.length ||
          body.items.some(item => !this.items.has(String(item.listItemId)))) deny('unowned delete target');
        break;
      default:
        deny('mutation is not allowlisted; effects are not inferred from function/action labels');
    }
    return true;
  }
}

export function requireMockLayer(layer) {
  if (layer !== 'model-mock') throw new Error('This runner cannot forward live operations. Live access/write preflight is blocked.');
}
