import {playbackApi} from "@customTypes/Api";

export const onRequestPost: PagesFunction = async (context) => {
  let start = Date.now();

  const request: Request = context.request;
  const env = context.env;
  const formBody = await readRequestBody(request);

  let send_request = new Request("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: formBody,
  });
  const url = new URL(request.url);
  const playlist = url.searchParams?.get("playlist") as string;
  const policyKey = env.POLICY_KEY;
  const accountId = env.ACCOUNT_ID;
  let resp = await fetch(send_request);
  let respText = await resp.text();
  let end = Date.now();
  let total = end - start;
  return new Response(respText, {
    headers: {
      "X-MC-Status": String(resp.status),
      "X-Response-Time": String(total),
    },
  });
};

async function readRequestBody(request) {
  const {headers} = request;
  const contentType = headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return JSON.stringify(await request.json());
  } else if (contentType.includes("form")) {
    const formData = await request.formData();
    const body = {};
    for (const entry of formData.entries()) {
      body[entry[0]] = entry[1];
    }
    let data = JSON.parse(JSON.stringify(body));
    let combine = `{"personalizations":[{"to":[{"email":"${data.to}","name":"${data.ton}"}],"from":{"email":"${data.from}","name":"${data.fromn}"},"subject":"${data.sbj}","content":[{"type":"${data.type}","value":"${data.body}"}]}`;
    return combine;
  } else {
    return '{"success":false}';
  }
}
