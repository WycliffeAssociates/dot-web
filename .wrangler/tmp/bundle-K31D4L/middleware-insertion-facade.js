				import worker, * as OTHER_EXPORTS from "/Users/willkelly/Documents/Work/Code/DotWeb/.wrangler/tmp/pages-B0FAVB/functionsWorker-0.7250311838429451.mjs";
				import * as __MIDDLEWARE_0__ from "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/wrangler@3.15.0/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts";
				const envWrappers = [__MIDDLEWARE_0__.wrap].filter(Boolean);
				const facade = {
					...worker,
					envWrappers,
					middleware: [
						__MIDDLEWARE_0__.default,
            ...(worker.middleware ? worker.middleware : []),
					].filter(Boolean)
				}
				export * from "/Users/willkelly/Documents/Work/Code/DotWeb/.wrangler/tmp/pages-B0FAVB/functionsWorker-0.7250311838429451.mjs";

				const maskDurableObjectDefinition = (cls) =>
					class extends cls {
						constructor(state, env) {
							let wrappedEnv = env
							for (const wrapFn of envWrappers) {
								wrappedEnv = wrapFn(wrappedEnv)
							}
							super(state, wrappedEnv);
						}
					};
				

				export default facade;