const cache = new Map<string, string>();

function apiUrl(query: string): string {
  return 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' +
    '&generator=search&gsrnamespace=6&gsrlimit=1&gsrsearch=' +
    encodeURIComponent(query + ' filetype:bitmap') +
    '&prop=imageinfo&iiprop=url|mime&iiurlwidth=96&iiurlheight=96';
}

export async function getProductImage(productName: string): Promise<string | null> {
  const key = productName.toLowerCase().trim();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) || null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(apiUrl(productName), { signal: controller.signal });
    if (!res.ok) {
      cache.set(key, '');
      return null;
    }
    const data = await res.json();
    const pages = data?.query?.pages;
    if (pages) {
      for (const pageId of Object.keys(pages)) {
        const info = pages[pageId]?.imageinfo?.[0];
        if (info?.thumburl) {
          cache.set(key, info.thumburl);
          return info.thumburl;
        }
      }
    }
    cache.set(key, '');
    return null;
  } catch {
    cache.set(key, '');
    return null;
  } finally {
    clearTimeout(timer);
  }
}
