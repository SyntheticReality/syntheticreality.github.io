import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Runs before dev/build. This public repository uses production SEO settings.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(root, 'seo.config.json'), 'utf8'));
if (!['preview', 'production'].includes(config.mode)) throw new Error('Unknown SEO mode');
const parsedOrigin = new URL(config.origin);
if (parsedOrigin.protocol !== 'https:' || parsedOrigin.origin !== config.origin) throw new Error('Use an HTTPS origin without a trailing slash');
const dist = path.join(root, 'website');
const publicRoot = path.join(root, 'public');
const absolute = route => new URL(route, `${config.origin}/`).href;
const escape = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const decode = text => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
const orgId = absolute('/#organization');
const websiteId = absolute('/#website');
const organization = {
  '@type': 'Organization', '@id': orgId, name: 'Osyrys', url: absolute('/'),
  logo: absolute('/assets/osyrys-icon.svg'), email: 'hello@syry.io',
  description: 'An interactive media company creating games and simulations.',
  sameAs: ['https://www.linkedin.com/company/0syrys/', 'https://medium.com/syry-io']
};
const website = {
  '@type': 'WebSite', '@id': websiteId, name: 'Osyrys', url: absolute('/'),
  inLanguage: 'en', publisher: { '@id': orgId }
};

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(file));
    else if (entry.name.endsWith('.html')) files.push(file);
  }
  return files.sort();
}

for (const route of Object.keys(config.pages)) {
  await access(path.join(dist, route.slice(1), 'index.html'));
}

const files = await htmlFiles(dist);
for (const file of files) {
  const relative = path.relative(dist, file).split(path.sep).join('/');
  const route = `/${relative}`.replace(/index\.html$/, '');
  let html = await readFile(file, 'utf8');
  html = html.replace(/\r\n/g, '\n').replace(/  <!-- SEO:START -->[\s\S]*?  <!-- SEO:END -->\n?/g, '');
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const descriptionMatch = html.match(/<meta name="description" content="([^"]*)">/);
  if (!titleMatch || !descriptionMatch) throw new Error(`Missing title/description: ${route}`);
  const title = decode(titleMatch[1]);
  const page = config.pages[route];
  const description = page?.description ?? config.deferredDescriptions[route] ?? decode(descriptionMatch[1]);
  html = html.replace(descriptionMatch[0], `<meta name="description" content="${escape(description)}">`);
  // Only approved primary routes become indexable at launch. Labs and deferred profiles stay noindex.
  const indexable = config.mode === 'production' && Boolean(page);
  const tags = [
    '  <!-- SEO:START -->',
    `  <meta name="robots" content="${indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow'}">`
  ];
  // Do not invent public canonical URLs for private visual studies or error pages.
  if (page || route.startsWith('/projects/')) tags.push(`  <link rel="canonical" href="${escape(absolute(route))}">`);
  if (page) {
    const pageEntity = {
      '@type': page.type, '@id': absolute(`${route}#webpage`), url: absolute(route), name: title,
      description, inLanguage: 'en', isPartOf: { '@id': websiteId }, about: { '@id': orgId }
    };
    const graph = [organization, website, pageEntity];
    if (route === '/about/') {
      const personId = absolute('/about/#alexis-salinas-mark');
      graph.push({ '@type': 'Person', '@id': personId, name: 'Alexis Salinas Mark', jobTitle: 'Founder',
        worksFor: { '@id': orgId }, sameAs: ['https://www.linkedin.com/in/salinasmark/'] });
      pageEntity.mentions = { '@id': personId };
    }
    if (route === '/contact/') pageEntity.mainEntity = { '@id': orgId };
    const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c');
    tags.push(`  <script type="application/ld+json">${json}</script>`);
  }
  tags.push('  <!-- SEO:END -->');
  html = html.replace('</head>', `${tags.join('\n')}\n</head>`);
  await writeFile(file, html);
}

// This sitemap describes the approved launch origin, not the private prototype hostname.
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  [...Object.keys(config.pages), ...config.retainedRoutes].map(route => `  <url><loc>${escape(absolute(route))}</loc></url>`).join('\n') + '\n</urlset>\n';
await writeFile(path.join(publicRoot, 'sitemap.xml'), sitemap);
// Crawlers must be able to read noindex; access control, not robots.txt, keeps the preview private.
await writeFile(path.join(publicRoot, 'robots.txt'), 'User-agent: *\nAllow: /\n' +
  (config.mode === 'production' ? `\nSitemap: ${absolute('/sitemap.xml')}\n` : ''));
console.log(`SEO prepared: ${files.length} pages, ${config.mode} mode, ${config.origin}`);

// Preserve the old sitemap endpoints for existing search-engine submissions.
await writeFile(path.join(publicRoot, 'sitemap-0.xml'), sitemap);
await writeFile(path.join(publicRoot, 'sitemap-index.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>' + absolute('/sitemap.xml') + '</loc></sitemap></sitemapindex>\n');
