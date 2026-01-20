import { defineAction, ActionError } from 'astro:actions';

export const getPlayerEnv = defineAction({
  handler: async (_: any, context: any) => {
    const runtime = context.locals.runtime;
    const env = runtime.env;
    const accountId = String(env.ACCOUNT_ID);
    const playerId = String(env.PLAYER_ID);

    if (!accountId || !playerId) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Missing environment variables",
      });
    }

    return {
      accountId,
      playerId,
    };
  },
});
