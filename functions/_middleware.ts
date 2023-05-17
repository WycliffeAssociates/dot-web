import mailChannelsPlugin from "@cloudflare/pages-plugin-mailchannels";

export const onRequest: PagesFunction = (context) =>
  mailChannelsPlugin({
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
