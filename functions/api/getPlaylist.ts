import {playbackApi} from "@customTypes/Api";

export const onRequestGet: PagesFunction = async (context) => {
  const request: Request = context.request;
  const env = context.env;
  const url = new URL(request.url);
  const playlist = url.searchParams?.get("playlist") as string;
  const policyKey = env.POLICY_KEY;
  const accountId = env.ACCOUNT_ID;

  if (!playlist) {
    return new Response(null, {
      status: 400,
      statusText: "Missing parameters",
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
  const pbApi = new playbackApi({
    baseUrl: "https://edge.api.brightcove.com/playback/v1",
    baseApiParams: {
      headers: {
        Accept: `application/json;pk=${policyKey}`,
      },
    },
  });

  try {
    const res = await pbApi.accounts.getPlaylistsByIdOrReferenceId(
      accountId,
      `ref:${playlist}`,
      {
        limit: 2000,
      }
    );
    if (res.ok) {
      return new Response(JSON.stringify(res.data), {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    } else {
      return new Response(null, {
        status: 404,
      });
    }
  } catch (error) {
    console.error(error);
    return new Response(null, {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
};
