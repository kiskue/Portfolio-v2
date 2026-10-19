/**
 * Static-route check (PLAN.md → Verification). Run after `next build`; `npm run check` runs it last.
 *
 * Asserts that the production build renders nothing per request:
 *   1. every nav route, the three case-study slugs and the 404 page are prerendered as complete
 *      static HTML that never revalidates;
 *   2. /projects/[slug] generates exactly the three slugs and has no runtime fallback
 *      (dynamicParams = false), so an unknown slug is a 404;
 *   3. every other app route is static as well;
 *   4. /dev pages are 404s in the production build.
 *
 * NAV_ROUTES and CASE_STUDY_SLUGS restate fixed PLAN contracts. tests/unit/routes.test.ts pins
 * site.nav to the same seven routes and tests/unit/content.invariants.test.ts pins the slugs, so
 * a change to either fails there first.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const NAV_ROUTES = ['/', '/projects', '/services', '/showcase', '/testimonials', '/about', '/contact'];
const CASE_STUDY_SLUGS = ['sme-panindio', 'defensys-citizen', 'defensys-responder'];
const SLUG_ROUTE = '/projects/[slug]';

const nextDir = new URL('../.next/', import.meta.url);

function readJson(relativePath) {
  const path = fileURLToPath(new URL(relativePath, nextDir));
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`check:static: cannot read ${path}. Run \`next build\` first.\n${error}`);
    process.exit(1);
  }
}

const { routes = {}, dynamicRoutes = {} } = readJson('prerender-manifest.json');
const appPaths = Object.values(readJson('app-path-routes-manifest.json'));
const problems = [];

/** Why a route is not complete static output, or null when it is. */
function staticProblem(route) {
  const entry = routes[route];
  if (!entry) return 'is not prerendered (it renders per request)';
  if (entry.initialRevalidateSeconds !== false) return `revalidates (${entry.initialRevalidateSeconds})`;
  if (entry.compute !== undefined && entry.compute !== 'static') return `compute is "${entry.compute}", not "static"`;
  if (entry.response !== undefined && entry.response !== 'complete') return `response is "${entry.response}", not "complete"`;
  return null;
}

// 1. Required routes.
const slugPaths = CASE_STUDY_SLUGS.map((slug) => `/projects/${slug}`);
const required = [...NAV_ROUTES, ...slugPaths, '/_not-found'];
for (const route of required) {
  const problem = staticProblem(route);
  if (problem) problems.push(`${route} ${problem}`);
}

// 2. The case-study route: exactly the three slugs, no fallback.
const slugRoute = dynamicRoutes[SLUG_ROUTE];
if (!slugRoute) problems.push(`${SLUG_ROUTE} is not a prerendered dynamic route (generateStaticParams)`);
else if (slugRoute.fallback !== false) problems.push(`${SLUG_ROUTE} has a runtime fallback (export dynamicParams = false)`);
const generated = Object.keys(routes).filter((route) => routes[route].srcRoute === SLUG_ROUTE).sort();
if (generated.join() !== [...slugPaths].sort().join()) {
  problems.push(`${SLUG_ROUTE} generates [${generated.join(', ')}], expected [${slugPaths.join(', ')}]`);
}

// 3. Every other app route.
for (const path of appPaths) {
  if (required.includes(path) || path === SLUG_ROUTE) continue;
  if (path.includes('[')) {
    const entry = dynamicRoutes[path];
    if (!entry) problems.push(`${path} renders per request (no generateStaticParams)`);
    else if (entry.fallback !== false) problems.push(`${path} has a runtime fallback (export dynamicParams = false)`);
  } else {
    const problem = staticProblem(path);
    if (problem) problems.push(`${path} ${problem}`);
  }
}

// 4. Dev-only pages.
const devRoutes = Object.keys(routes).filter((route) => route === '/dev' || route.startsWith('/dev/'));
for (const route of devRoutes) {
  let status;
  try {
    status = JSON.parse(readFileSync(fileURLToPath(new URL(`server/app${route}.meta`, nextDir)), 'utf8')).status;
  } catch {
    status = 'unknown';
  }
  if (status !== 404) {
    problems.push(`${route} is served in production (status ${status}); call notFound() when NODE_ENV is 'production'`);
  }
}

if (problems.length > 0) {
  console.error(`check:static failed:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(
  `check:static: ${appPaths.length} app routes are static, including the ${NAV_ROUTES.length} nav routes, ` +
    `${slugPaths.length} case studies and the 404 page; ${SLUG_ROUTE} has no fallback; ` +
    `${devRoutes.length} /dev route(s) return 404 in production.`,
);
