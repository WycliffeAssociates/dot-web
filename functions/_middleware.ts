import mailChannelsPlugin from "@cloudflare/pages-plugin-mailchannels";
// https://api.mailchannels.net/tx/v1/documentation#api-Default-sendPost
// https://developers.cloudflare.com/pages/platform/functions/plugins/mailchannels/
// For cc, bcc, split on an env var;
//
export const onRequest: PagesFunction = (context) => {
  return mailChannelsPlugin({
    personalizations: [
      {
        to: [{name: "Some User", email: "will_kelly@wycliffeassociates.org"}],
      },
    ],
    from: {
      name: "ACME Support",
      email: "questions@dot-web.pages.dev",
    },
    respondWith: () => {
      return new Response(
        `Thank you for submitting your enquiry. A member of the team will be in touch shortly.`
      );
    },
  })(context);
};
