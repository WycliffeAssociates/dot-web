export const onRequestGet: PagesFunction = async (context) => {
  const request: Request = context.request;
  const env = context.env;
  const url = new URL(request.url);

  const accountId = String(env.ACCOUNT_ID);
  const playerId = String(env.PLAYER_ID);

  if (!accountId || !playerId) {
    return new Response(null, {
      status: 400,
      statusText: "Missing vars",
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
  const data = JSON.stringify({accountId, playerId});
  return new Response(data, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
};
