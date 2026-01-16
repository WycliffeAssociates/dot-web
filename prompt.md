The service worker is not working in produciton and has just acted flaky with astro pwa and vite pwa. Idk why. 
I originally only had it to enable cancellable downloads via a response as opposed to the hidden blob technique, but I'm ready ot just pull it out and just create another route on the server to handle the download.

I also want to go ahead and update my dependencies on cloudflare and astro the latest (beta) versions: 

Please see these release notes for refactoring things like env vars:

Introducing Astro 6 Beta! We’re excited to announce the first beta release of Astro 6, featuring a redesigned development server, significant rendering performance improvements, and new built-in APIs for working with CSP, fonts, and live content collections.

What is Astro? Astro is the web framework for building content-driven websites, including blogs, marketing, and e-commerce. If you need a website that loads fast with great SEO, then Astro is for you.

The new Astro 6 development server refactor brings Astro’s development and production codepaths much closer together and increases stability for Astro on all runtimes. Now, you can develop your Astro project using the same runtime as production. Notably, this unlocks first-class support for Astro on Cloudflare Workers, with more access to runtime-specific primitives and a more true-to-life development experience.

To try Astro 6 Beta, run the create astro command:

npm create astro@latest -- --ref next

To upgrade an existing project to the beta, use the automated @astrojs/upgrade CLI tool:

# Recommended:
npx @astrojs/upgrade beta

# Manual:
npm install astro@beta
pnpm install astro@beta
yarn add astro@beta

Check out our v6 upgrade guide for full details and migration guidance for breaking changes.

A redesigned astro dev
The headline feature of Astro 6 is a completely redesigned development server (astro dev).

Astro 6 was the chance to significantly improve how Astro manages different environments (client, server, and prerender) with an internal refactor to use Vite’s Environment API which closes the gap between prod and dev.

Previously, code that worked locally could behave somewhat differently once deployed. Platform-specific features often couldn’t be tested until after deployment. In some cases, Astro even had separate logic paths for “dev” and “prod,” increasing the chance of edge-case bugs.

By leveraging this API internally, Astro can now run your web application inside the same runtime you deploy to, with the same JavaScript engine, the same globals, and the same platform APIs available during development.

This refactor enables Astro to:

Run against real runtimes – Development can execute inside the same runtime as production.
Support more platforms – Cloudflare Workers today, with a foundation that supports additional runtimes in the future.
By unifying the development and production code paths we’ve already discovered and fixed numerous subtle bugs that existed only in development or only in production.

This change makes Astro 6 more stable for projects on all runtimes, including non-Node.js environments. All users of Astro will enjoy greater stability and reliability as a result of this upgrade!

Spotlight: Astro 6 on Cloudflare Workers
Cloudflare Workers are the most complete example of what the new astro dev makes possible today.

Until now, the Astro Cloudflare integration simulated the Workers runtime during development. You’d work against special Astro-specific APIs like Astro.locals.runtime that provided polyfills and mocks of Cloudflare’s platform, then deploy and hope everything behaved the same in production.

With Astro 6 Beta, astro dev can now run your entire application using workerd, Cloudflare’s open-source JavaScript runtime. This is the same runtime that powers Cloudflare Workers in production—not a simulation or polyfill.

In Astro 6, you can now develop directly against real platform APIs, catching issues during development rather than after deployment. The special simulation APIs like Astro.locals.runtime are no longer needed.

When you run astro dev with Cloudflare support, you now have access to:

Durable Objects – Test stateful serverless objects locally
KV Namespaces – Develop against real key-value storage
R2 Storage – Work with object storage in dev
Workers Analytics Engine – Test analytics collection
Environment variables & secrets – Full config support
Hot Module Replacement (HMR) – Real-time updates while running inside workerd
Access your Cloudflare bindings directly using the cloudflare:workers module:

---
import { env } from "cloudflare:workers";

// Access KV storage directly - works in both dev and production
const kv = env.MY_KV_NAMESPACE;
await kv.put("visits", "1");
const visits = await kv.get("visits");
---
<p>Visits: {visits}</p>

The Cloudflare adapter has also been significantly enhanced alongside the new dev server:

astro preview now works with Cloudflare, letting you test your built application locally before deploying
Integration API updates for custom entrypoints and dev server configuration
Improved error messages when your code differs from production behavior
We’re actively refining Cloudflare support as we work toward the stable Astro 6 release. Currently, prerendered (static) builds do not run through workerd, but they will before v6 is released.

If you encounter issues or unexpected behavior, please let us know. This feedback is especially important as we expand runtime support beyond Node.js.

See the Cloudflare adapter upgrade guide for more information, and the Cloudflare adapter changelog for the full list of changes and improvements.

Live Collections (Stable)
Astro 5.10’s experimental live content collections are now stable in Astro 6. These build on Astro’s type-safe content collections that already allow you to fetch content either locally or from CMSs, APIs, databases, and other sources, with a unified API that works across all your content.

Live collections unlock the missing piece: updating data in real time without requiring a rebuild. With custom data loaders, live collections are the perfect solution for your frequently updating data sources requiring up-to-the-moment data freshness, such as live stock prices or inventory.

Live collections use a different API under the hood, but the configuration and helper functions are designed to feel familiar for those already using Astro’s build-time content collections:

src/live.config.ts
import { defineLiveCollection } from 'astro:content';
import { storeLoader } from '@mystore/astro-loader';

const products = defineLiveCollection({
  loader: storeLoader({
    apiKey: process.env.STORE_API_KEY,
  }),
});

export const collections = { products };

And since anything can happen when making a live data request (e.g. network issues, API errors, validation problems), the API is designed to make error handling explicit:

---
import { getLiveEntry } from 'astro:content';

const { entry: product, error } = await getLiveEntry('products', Astro.params.id);
if (error) return Astro.redirect('/404');
---
<h1>{product.data.title}</h1>

See the live content collections documentation for more examples and configuration options.

Content Security Policy (Stable)
Content Security Policy (CSP) support, previously released as an experimental feature in Astro 5.9, is now stable in Astro 6. CSP helps protect your site against cross-site scripting (XSS) and other code injection attacks by controlling which resources can be loaded.

This was Astro’s most upvoted feature request so far, and we carefully designed the feature to work in all Astro render modes (static pages, dynamic pages, and single-page applications), with maximum flexibility and type-safety in mind.

This feature is compatible with all of Astro’s official adapters (Cloudflare, Netlify, Node, Vercel). Astro will generate the CSP header or <meta> element for you, including hashes of scripts and styles used on a page, even those that are loaded dynamically!

You can now set csp: true in your Astro config for default protection, or you can further customize your security policy by enabling this feature with a configuration object that includes additional options:

astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  csp: {
    scriptDirective: {
      resources: [
        "'self'", "https://cdn.example.com"
      ]
    }
  }
});

See the CSP configuration reference for all available options.

Breaking Changes & Migration
Astro 6 includes several breaking changes as we clean up deprecated APIs and align with new standards. Key changes:

Removed APIs: Astro.glob(), emitESMImage(), deprecated <ViewTransitions /> component, legacy content collections
Node version: Requires Node 22+ (dropped Node 18 & 20 support)
Integration API: Updates to adapter interfaces, route data, and SSR manifest
Cloudflare adapter: Breaking changes to Astro.locals.runtime and custom entrypoint patterns
i18n: Changed default behavior for i18n.redirectToDefaultLocale
Zod 4: Upgraded to Zod 4, Zod 3 no longer supported
See the upgrade guide for detailed migration steps for each change.

Stability & Roadmap
Astro 6 is currently beta software. This is our initial release of these features, and we’ll be refining them before the stable v6.0 release. We’re actively looking for feedback:

Are you hitting edge cases with workerd development?
Do you need runtime support beyond Cloudflare?
What could we improve about the dev experience?
The workerd dev support is particularly important to test broadly because we want to ensure it works smoothly across different project types and configurations.

Getting Started
Ready to try Astro 6 Beta?

npm create astro@latest -- --ref next

Already on Astro 5? Upgrade to the beta:

npx @astrojs/upgrade beta

For Cloudflare projects, check out the specific v6 beta Cloudflare adapter documentation for setup instructions.

## Cloudflare speeicifc:
Upgrading to v13 and Astro 6
Astro 6 brings significant improvements to the Cloudflare development experience and requires @astrojs/cloudflare v13 or later. Now, astro dev uses Cloudflare’s Vite plugin and workerd runtime to closely mirror production behavior.

See the Astro 6 upgrade guide for full instructions on upgrading Astro itself.
Development server now uses workerd
The biggest change for Cloudflare users in Astro 6 is that astro dev and astro preview now use the Cloudflare Vite plugin to run your site using the real Workers runtime (workerd) instead of Node.js. This means your development environment is now a much closer replica of your production environment, with the same runtime, APIs, and behavior.

This change helps you catch issues during development that would have previously only appeared in production, and features like Durable Objects, R2 bindings, and Workers AI now work exactly as they do when deployed to Cloudflare’s platform.

This change is transparent for most projects. If your project had special configuration for astro dev or was relying on Node.js-specific behavior in development, adjust your code or configuration accordingly.

Changed: Wrangler entrypoint configuration
Previously, the main field in your Wrangler configuration pointed to the built worker file (e.g. dist/_worker.js/index.js). With Astro 6, this has changed to point to a new unified entrypoint provided by the Cloudflare adapter: @astrojs/cloudflare/entrypoints/server.

Update your wrangler.jsonc to use the new entrypoint:

wrangler.jsonc
{
  "main": "dist/_worker.js/index.js",
  "main": "@astrojs/cloudflare/entrypoints/server",
  "name": "my-astro-app",
  // ... rest of config
}

This single entrypoint handles both astro dev and production deployments.

Removed: Astro.locals.runtime API
The Astro.locals.runtime object has been removed in favor of direct access to Cloudflare Workers APIs. Access environment variables, the cf object, caches, and execution context directly through the provided interfaces.

Accessing environment variables:

Previously, environment variables were accessed through Astro.locals.runtime.env. Now import env directly instead:

const { env } = Astro.locals.runtime;
import { env } from 'cloudflare:workers';

Accessing the cf object:

Previously, the cf object was accessed through Astro.locals.runtime.cf. Now access it directly from the request:

const { cf } = Astro.locals.runtime;
const cf = Astro.request.cf;

Accessing the caches API:

Previously, the caches API was accessed through Astro.locals.runtime.caches. Now use the global caches object directly:

const { caches } = Astro.locals.runtime;

caches.default.put(request, response);

Accessing the execution context:

The Astro.locals.runtime.ctx object is replaced with Astro.locals.cfContext, which contains the Cloudflare ExecutionContext:

const ctx = Astro.locals.runtime.ctx;
const ctx = Astro.locals.cfContext;

Changed: Wrangler configuration file is now optional
The Wrangler configuration file is now optional for simple projects. If you don’t have custom configuration, such as Cloudflare bindings (KV, D1, Durable Objects, etc.), Astro will automatically generate a default configuration for you.

If your wrangler.jsonc only contains basic configuration like this:

{
  "main": "@astrojs/cloudflare/entrypoints/server",
  "compatibility_date": "2025-05-21",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
  },
}

You can safely delete this file. Astro handles this configuration automatically. Alternatively, create a minimal wrangler.jsonc with just your project name and other custom settings:

wrangler.jsonc
{
  "name": "my-astro-app",
}

Changed: Custom entrypoint API
If you were using a custom workerEntryPoint configuration in the adapter options, this has been removed. Instead, specify your custom entrypoint in your Wrangler configuration and create a standard Cloudflare Worker export object directly, rather than using the createExports() function.

Remove the workerEntryPoint option from your adapter config:

astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  adapter: cloudflare({
    workerEntryPoint: {
      path: 'src/worker.ts',
      namedExports: ['MyDurableObject'],
    },
  }),
});

Specify the entrypoint in wrangler.jsonc instead:

wrangler.jsonc
{
  "main": "./src/worker.ts"
}

Update your custom worker entry file to use standard Worker syntax. Import the handler from @astrojs/cloudflare/entrypoints/server and export a standard Cloudflare Worker object, alongside any custom exports like Durable Objects:

src/worker.ts
import handler from '@astrojs/cloudflare/entrypoints/server';
import { DurableObject } from 'cloudflare:workers';

export class MyDurableObject extends DurableObject<Env> {
  // ...
}

export default {
  async fetch(request, env, ctx) {
    await env.MY_QUEUE.send('log');
    return handler.fetch(request, env, ctx);
  },
  async queue(batch, _env) {
    let messages = JSON.stringify(batch.messages);
    console.log(`consumed from our queue: ${messages}`);
  },
} satisfies ExportedHandler<Env>;

The manifest is now created internally by the adapter, so it does not need to be passed to your handler.

New: astro preview support
Use astro preview to test your Cloudflare Workers application locally before deploying. The preview runs using Cloudflare’s workerd runtime, closely mirroring production behavior. Run astro build followed by astro preview to start the preview server.

Deprecated: Cloudflare Pages support
The Astro Cloudflare adapter now only supports deploying to Cloudflare Workers by default. If you are currently deploying to Cloudflare Pages, consider migrating to Workers for the best experience and feature support.

See Cloudflare’s migration guide from Pages to Workers for detailed migration instructions.
If you need to continue using Cloudflare Pages, see Using with Cloudflare Pages for the required manual configuration.


# Migrating from Pages to workers:
Migrate from Pages to Workers
You can deploy full-stack applications, including front-end static assets and back-end APIs, as well as server-side rendered pages (SSR), with Cloudflare Workers.

Like Pages, requests for static assets on Workers are free, and Pages Functions invocations are charged at the same rate as Workers, so you can expect a similar cost structure.

Unlike Pages, Workers has a distinctly broader set of features available to it, (including Durable Objects, Cron Triggers, and more comprehensive Observability). A complete list can be found at the bottom of this page.

Migration
Migrating from Cloudflare Pages to Cloudflare Workers is often a straightforward process. The following are some of the most common steps you will need to take to migrate your project.

Frameworks
If your Pages project uses a popular framework, most frameworks already have adapters available for Cloudflare Workers. Switch out any Pages-specific adapters for the Workers equivalent and follow any guidance that they provide.

Project configuration
If your project doesn't already have one, create a Wrangler configuration file (either wrangler.jsonc, wrangler.json or wrangler.toml) in the root of your project. The two mandatory fields are:

name

Set this to the name of the Worker you wish to deploy to. This can be the same as your existing Pages project name, so long as it conforms to Workers' name restrictions (e.g. max length).

compatibility_date.

If you were already using Pages Functions, set this to the same date configured there. Otherwise, set it to the current date.

Build output directory
Where you previously would configure a "build output directory" for Pages (in either a Wrangler configuration file or in the Cloudflare dashboard), you must now set the assets.directory value for a Worker project.

Before, with Cloudflare Pages:

wrangler.jsonc
wrangler.toml
{
  "name": "my-pages-project",
  "pages_build_output_dir": "./dist/client/"
}

Now, with Cloudflare Workers:

wrangler.jsonc
wrangler.toml
{
  "name": "my-worker",
  "compatibility_date": "2025-04-01",
  "assets": {
    "directory": "./dist/client/"
  }
}

Note

If your Worker will only contain assets and no Worker script, then you should remove the "binding": "ASSETS" field from your configuration file, since this is only valid if you have a Worker script indicated by a "main" property. See the Assets binding section below.

Serving behavior
Pages would automatically attempt to determine the type of project you deployed. It would look for 404.html and index.html files as signals for whether the project was likely a Single Page Application (SPA) or if it should serve custom 404 pages.

In Workers, to prevent accidental misconfiguration, this behavior is explicit and must be set up manually.

For a Single Page Application (SPA):

wrangler.jsonc
wrangler.toml
{
  "name": "my-worker",
  "compatibility_date": "2025-04-01",
  "assets": {
    "directory": "./dist/client/",
    "not_found_handling": "single-page-application"
  }
}

For custom 404 pages:

wrangler.jsonc
wrangler.toml
{
  "name": "my-worker",
  "compatibility_date": "2025-04-01",
  "assets": {
    "directory": "./dist/client/",
    "not_found_handling": "404-page"
  }
}

Ignoring assets
Pages would automatically exclude some files and folders from being uploaded as static assets such as node_modules, .DS_Store, and .git. If you wish to also avoid uploading these files to Workers, you can create an .assetsignore file in your project's static asset directory.

dist/client/.assetsignore
**/node_modules
**/.DS_Store
**/.git

Pages Functions
Full-stack framework
If you use a full-stack framework powered by Pages Functions, ensure you have updated your framework to target Workers instead of Pages.

Pages Functions with an "advanced mode" _worker.js file
If you use Pages Functions with an "advanced mode" _worker.js file, you must first ensure this script doesn't get uploaded as a static asset. Either move _worker.js out of the static asset directory (recommended), or create an .assetsignore file in the static asset directory and include _worker.js within it.

dist/client/.assetsignore
_worker.js

Then, update your configuration file's main field to point to the location of this Worker script:

wrangler.jsonc
wrangler.toml
{
  "name": "my-worker",
  "compatibility_date": "2025-04-01",
  "main": "./dist/client/_worker.js", // or some other location if you moved the script out of the static asset directory
  "assets": {
    "directory": "./dist/client/"
  }
}

Pages Functions with a functions/ folder
If you use Pages Functions with a folder of functions/, you must first compile these functions into a single Worker script with the wrangler pages functions build command.

npm
yarn
pnpm
Terminal window
pnpm wrangler pages functions build --outdir=./dist/worker/

Although this command will remain available to you to run at any time, we do recommend considering using another framework if you wish to continue to use file-based routing. HonoX ↗ is one popular option.

Once the Worker script has been compiled, you can update your configuration file's main field to point to the location it was built to:

wrangler.jsonc
wrangler.toml
{
  "name": "my-worker",
  "compatibility_date": "2025-04-01",
  "main": "./dist/worker/index.js",
  "assets": {
    "directory": "./dist/client/"
  }
}

_routes.json and Pages Functions middleware
If you authored a _routes.json file in your Pages project, or used middleware in Pages Functions, you must pay close attention to the configuration of your Worker script. Pages would default to serving your Pages Functions ahead of static assets and _routes.json and Pages Functions middleware allowed you to customize this behavior.

Workers, on the other hand, will default to serving static assets ahead of your Worker script, unless you have configured assets.run_worker_first. This option is required if you are, for example, performing any authentication checks or logging requests before serving static assets.

wrangler.jsonc
wrangler.toml
{
  "name": "my-worker",
  "compatibility_date": "2025-04-01",
  "main": "./dist/worker/index.js",
  "assets": {
    "directory": "./dist/client/",
    "run_worker_first": true
  }
}

