// ../.wrangler/tmp/bundle-xvc1Uq/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// api/getId.ts
var onRequestGet = async (context) => {
  const env = context.env;
  const accountId = String(env.ACCOUNT_ID);
  const playerId = String(env.PLAYER_ID);
  if (!accountId || !playerId) {
    return new Response(null, {
      status: 400,
      statusText: "Missing vars",
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  const data = JSON.stringify({ accountId, playerId });
  return new Response(data, {
    headers: {
      "Access-Control-Allow-Origin": "*"
    }
  });
};

// ../src/customTypes/Api.ts
var HttpClient = class {
  baseUrl = "https://edge.api.brightcove.com/playback/v1";
  securityData = null;
  securityWorker;
  abortControllers = /* @__PURE__ */ new Map();
  customFetch = (...fetchParams) => fetch(...fetchParams);
  baseApiParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer"
  };
  constructor(apiConfig = {}) {
    Object.assign(this, apiConfig);
  }
  setSecurityData = (data) => {
    this.securityData = data;
  };
  encodeQueryParam(key, value) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }
  addQueryParam(query, key) {
    return this.encodeQueryParam(key, query[key]);
  }
  addArrayQueryParam(query, key) {
    const value = query[key];
    return value.map((v) => this.encodeQueryParam(key, v)).join("&");
  }
  toQueryString(rawQuery) {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter((key) => "undefined" !== typeof query[key]);
    return keys.map((key) => Array.isArray(query[key]) ? this.addArrayQueryParam(query, key) : this.addQueryParam(query, key)).join("&");
  }
  addQueryParams(rawQuery) {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }
  contentFormatters = {
    ["application/json" /* Json */]: (input) => input !== null && (typeof input === "object" || typeof input === "string") ? JSON.stringify(input) : input,
    ["text/plain" /* Text */]: (input) => input !== null && typeof input !== "string" ? JSON.stringify(input) : input,
    ["multipart/form-data" /* FormData */]: (input) => Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      formData.append(
        key,
        property instanceof Blob ? property : typeof property === "object" && property !== null ? JSON.stringify(property) : `${property}`
      );
      return formData;
    }, new FormData()),
    ["application/x-www-form-urlencoded" /* UrlEncoded */]: (input) => this.toQueryString(input)
  };
  mergeRequestParams(params1, params2) {
    return {
      ...this.baseApiParams,
      ...params1,
      ...params2 || {},
      headers: {
        ...this.baseApiParams.headers || {},
        ...params1.headers || {},
        ...params2 && params2.headers || {}
      }
    };
  }
  createAbortSignal = (cancelToken) => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController2 = this.abortControllers.get(cancelToken);
      if (abortController2) {
        return abortController2.signal;
      }
      return void 0;
    }
    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };
  abortRequest = (cancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);
    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };
  request = async ({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }) => {
    const secureParams = (typeof secure === "boolean" ? secure : this.baseApiParams.secure) && this.securityWorker && await this.securityWorker(this.securityData) || {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || "application/json" /* Json */];
    const responseFormat = format || requestParams.format;
    return this.customFetch(`${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`, {
      ...requestParams,
      headers: {
        ...requestParams.headers || {},
        ...type && type !== "multipart/form-data" /* FormData */ ? { "Content-Type": type } : {}
      },
      signal: cancelToken ? this.createAbortSignal(cancelToken) : requestParams.signal,
      body: typeof body === "undefined" || body === null ? null : payloadFormatter(body)
    }).then(async (response) => {
      const r = response;
      r.data = null;
      r.error = null;
      const data = !responseFormat ? r : await response[responseFormat]().then((data2) => {
        if (r.ok) {
          r.data = data2;
        } else {
          r.error = data2;
        }
        return r;
      }).catch((e) => {
        r.error = e;
        return r;
      });
      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }
      if (!response.ok)
        throw data;
      return data;
    });
  };
};
var playbackApi = class extends HttpClient {
  accounts = {
    /**
     * @description Gets a page of video objects that are related to the specified video. Using the name and short description of the specified video, the Playback API searches for videos with any partial matches in the following fields: `name`, `short` `description`, `long_description`, `tags`. Notes:  When performing a search (using the `q` parameter), you must use a search-enabled Policy Key. For information on getting policy keys, see the [Policy API Overview](/policy/getting-started/overview-policy-api.html). You can also use this [sample app](/policy/getting-started/quick-start-policy-api.html) to create a search-enabled key In general, search-enabled Policy Keys should only be stored on a server and not in a browser player or mobile app, since they can be used to list all playable videos. For some accounts this may not be applicable if you do not care if all of your playable videos can be discovered. The response results for this endpoint are subject to change as we improve the algorithm for finding related videos. If you do not want your results to change, or if you want precise control, then you should use the [Get Videos endpoint](#operation/Get_Videos) with a search parameter. Any geo-restricted videos that are denied for the particular requestor are omitted from the results. As long as some videos are allowed the request is considered successful. An errors field is added to the result with a summary explaining why videos were omitted.
     *
     * @tags Videos
     * @name GetRelatedVideosByIdOrReferenceId
     * @summary Get Related Videos by ID or Reference ID
     * @request GET:/accounts/{account_id}/videos/{video_id}/related
     * @response `200` `GetVideosResponse` 200
     * @response `400` `void` BAD_REQUEST: DUPLICATE_PARAMETERS - The same parameter name was provided more than once in the request INVALID_SEARCH - The search parameters are not valid ILLEGAL_QUERY - The search string syntax was invalid - example ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request <br>  API  - The policy key is not search-enabled when attempting to perform a search - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address <br>  DOMAIN - The video is restricted from playing on the current domain - POLICY_ERROR - Error when evaluating the policy key - VIDEO_NOT_PLAYABLE - For a single video request, the video exists, but is not allowed to be played now.
     * @response `401` `void` INVALID_POLICY_KEY:undefined
     * @response `403` `void` ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request - DOMAIN - The video is restricted from playing on the current domain - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address - POLICY_ERROR - Error when evaluating the policy key
     * @response `405` `void` METHOD_NOT_ALLOWED:Only GET, HEAD and OPTIONS are allowed for this api.
     * @response `500` `void` SERVER_ERROR:internal server error
     * @response `502` `void` SERVER_ERROR:Got a bad response from a backend server
     * @response `504` `void` SERVER_TIMEOUT:Either a backend server or one of the servers they rely on timed out.
     */
    getRelatedVideosByIdOrReferenceId: (accountId, videoId, query, params = {}) => this.request({
      path: `/accounts/${accountId}/videos/${videoId}/related`,
      method: "GET",
      query,
      format: "json",
      ...params
    }),
    /**
     * @description Gets a video object based on a video ID or reference ID. To get a video using the `reference_id`, use: https://edge.api.brightcove.com/playback/v1/accounts/{account_id}/videos/ref:{reference_id}` Note that you can specify multiple video ids in a comma-delimited list, but only **one** `reference_id`.
     *
     * @tags Videos
     * @name GetVideoByIdOrReferenceId
     * @summary Get Video by ID or Reference ID
     * @request GET:/accounts/{account_id}/videos/{video_id}
     * @response `200` `Video` 200
     * @response `400` `void` BAD_REQUEST: DUPLICATE_PARAMETERS - The same parameter name was provided more than once in the request INVALID_SEARCH - The search parameters are not valid ILLEGAL_QUERY - The search string syntax was invalid - example ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request <br>  API  - The policy key is not search-enabled when attempting to perform a search - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address <br>  DOMAIN - The video is restricted from playing on the current domain - POLICY_ERROR - Error when evaluating the policy key - VIDEO_NOT_PLAYABLE - For a single video request, the video exists, but is not allowed to be played now.
     * @response `401` `void` INVALID_POLICY_KEY:undefined
     * @response `403` `void` ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request - DOMAIN - The video is restricted from playing on the current domain - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address - POLICY_ERROR - Error when evaluating the policy key
     * @response `405` `void` METHOD_NOT_ALLOWED:Only GET, HEAD and OPTIONS are allowed for this api.
     * @response `500` `void` SERVER_ERROR:internal server error
     * @response `502` `void` SERVER_ERROR:Got a bad response from a backend server
     * @response `504` `void` SERVER_TIMEOUT:Either a backend server or one of the servers they rely on timed out.
     */
    getVideoByIdOrReferenceId: (accountId, videoId, query, params = {}) => this.request({
      path: `/accounts/${accountId}/videos/${videoId}`,
      method: "GET",
      query,
      format: "json",
      ...params
    }),
    /**
     * @description Gets a page of video objects. The Playback API allows you to programmatically search for videos in your Video Cloud library. For more information on the search syntax, see [CMS/Playback API: Videos Search](/cms/searching/cmsplayback-api-videos-search.html). Notes: - When performing a search, you need to use a search-enabled Policy Key. For information on getting policy keys, see the Policy API Overview or the Policy Keys documents.  In general, search-enabled Policy Keys should only be stored on a server and not in a browser player or mobile app, since they can be used to list all playable videos. For some accounts this may not be applicable if you do not care if all of your playable videos can be discovered. - The maximum number of videos (highest count value) returned is 1000, even if there are more matching videos in the account. The count value is an estimate and should not be relied on as the exact number to be returned. If all results are desired then keep paging until it no longer returns a full page, or use the CMS api. - Only currently playable videos are included in the results list. It is recommended to do a similar query with the CMS api to see why some videos are excluded.  Any geo-restricted videos that are denied for the particular requestor are omitted from the results. As long as some videos are allowed the request is considered successful. An errors field is added to the result with a summary explaining why videos were omitted.
     *
     * @tags Videos
     * @name GetVideos
     * @summary Get Videos
     * @request GET:/accounts/{account_id}/videos
     * @response `200` `GetVideosResponse` 200
     * @response `400` `void` BAD_REQUEST: DUPLICATE_PARAMETERS - The same parameter name was provided more than once in the request INVALID_SEARCH - The search parameters are not valid ILLEGAL_QUERY - The search string syntax was invalid - example ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request <br>  API  - The policy key is not search-enabled when attempting to perform a search - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address <br>  DOMAIN - The video is restricted from playing on the current domain - POLICY_ERROR - Error when evaluating the policy key - VIDEO_NOT_PLAYABLE - For a single video request, the video exists, but is not allowed to be played now.
     * @response `401` `void` INVALID_POLICY_KEY:undefined
     * @response `403` `void` ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request - DOMAIN - The video is restricted from playing on the current domain - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address - POLICY_ERROR - Error when evaluating the policy key
     * @response `405` `void` METHOD_NOT_ALLOWED:Only GET, HEAD and OPTIONS are allowed for this api.
     * @response `500` `void` SERVER_ERROR:internal server error
     * @response `502` `void` SERVER_ERROR:Got a bad response from a backend server
     * @response `504` `void` SERVER_TIMEOUT:Either a backend server or one of the servers they rely on timed out.
     */
    getVideos: (accountId, videoId, query, params = {}) => this.request({
      path: `/accounts/${accountId}/videos`,
      method: "GET",
      query,
      format: "json",
      ...params
    }),
    /**
     * @description Gets an HLS manifest with static URLs for the renditions and other assets. Note that the URLs carry a token, and are good for the TTL of the token. **Version 2 of the API only**
     *
     * @tags Static URLs
     * @name GetStaticUrLsHls
     * @summary Get an HLS Manifest with static URLs
     * @request GET:/accounts/{account_id}/videos/{video_id}/master.m3u8
     * @response `200` `void` 200 - returns the M3U8 manifest
     * @response `400` `void` BAD_REQUEST: DUPLICATE_PARAMETERS - The same parameter name was provided more than once in the request INVALID_SEARCH - The search parameters are not valid ILLEGAL_QUERY - The search string syntax was invalid - example ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request <br>  API  - The policy key is not search-enabled when attempting to perform a search - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address <br>  DOMAIN - The video is restricted from playing on the current domain - POLICY_ERROR - Error when evaluating the policy key - VIDEO_NOT_PLAYABLE - For a single video request, the video exists, but is not allowed to be played now.
     * @response `401` `void` Unauthorized - 'INVALID_POLICY_KEY:{bad policy key or undefined}' or `INVALID_JWT`(meaning that the JWT has expired)
     * @response `403` `void` ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request - DOMAIN - The video is restricted from playing on the current domain - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address - POLICY_ERROR - Error when evaluating the policy key
     * @response `405` `void` METHOD_NOT_ALLOWED:Only GET, HEAD and OPTIONS are allowed for this api.
     * @response `500` `void` SERVER_ERROR:internal server error
     * @response `502` `void` SERVER_ERROR:Got a bad response from a backend server
     * @response `504` `void` SERVER_TIMEOUT:Either a backend server or one of the servers they rely on timed out.
     */
    getStaticUrLsHls: (accountId, videoId, query, params = {}) => this.request({
      path: `/accounts/${accountId}/videos/${videoId}/master.m3u8`,
      method: "GET",
      query,
      ...params
    }),
    /**
     * @description Gets a DASH manifest with static URLs for the renditions and other assets. Note that the URLs carry a token, and are good for the TTL of the token. **Version 2 of the API only**
     *
     * @tags Static URLs
     * @name GetStaticUrLsDash
     * @summary Get a DASH Manifest with static URLs
     * @request GET:/accounts/{account_id}/videos/{video_id}/manifest.mpd
     * @response `200` `void` 200 - returns the MPD manifest
     * @response `400` `void` BAD_REQUEST: DUPLICATE_PARAMETERS - The same parameter name was provided more than once in the request INVALID_SEARCH - The search parameters are not valid ILLEGAL_QUERY - The search string syntax was invalid - example ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request <br>  API  - The policy key is not search-enabled when attempting to perform a search - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address <br>  DOMAIN - The video is restricted from playing on the current domain - POLICY_ERROR - Error when evaluating the policy key - VIDEO_NOT_PLAYABLE - For a single video request, the video exists, but is not allowed to be played now.
     * @response `401` `void` Unauthorized - 'INVALID_POLICY_KEY:{bad policy key or undefined}' or `INVALID_JWT`(meaning that the JWT has expired)
     * @response `403` `void` ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request - DOMAIN - The video is restricted from playing on the current domain - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address - POLICY_ERROR - Error when evaluating the policy key
     * @response `405` `void` METHOD_NOT_ALLOWED:Only GET, HEAD and OPTIONS are allowed for this api.
     * @response `500` `void` 'SERVER_ERROR:internal server error' (one cause of the error is requesting a VMAP with a JWT that does not include the `ssai` claim see [Static URL Delivery](/playback/guides/static-url-delivery.html))
     * @response `502` `void` SERVER_ERROR:Got a bad response from a backend server
     * @response `504` `void` SERVER_TIMEOUT:Either a backend server or one of the servers they rely on timed out.
     */
    getStaticUrLsDash: (accountId, videoId, query, params = {}) => this.request({
      path: `/accounts/${accountId}/videos/${videoId}/manifest.mpd`,
      method: "GET",
      query,
      ...params
    }),
    /**
     * @description Gets an HLS VMAP with static URLs for the renditions and other assets. Note that the URLs carry a token, and are good for the TTL of the token. Also, VMAPS can only be retrieved if the JWT includes an `ssai` claim - see [Creating a JSON Web Token](/playback/guides/static-url-delivery.html). **Version 2 of the API only**
     *
     * @tags Static URLs
     * @name GetStaticUrLsHlsVmap
     * @summary Get an HLS VMAP with static URLs
     * @request GET:/accounts/{account_id}/videos/{video_id}/hls.vmap
     * @response `200` `void` 200 - returns the HLS VMAP
     * @response `400` `void` BAD_REQUEST: DUPLICATE_PARAMETERS - The same parameter name was provided more than once in the request INVALID_SEARCH - The search parameters are not valid ILLEGAL_QUERY - The search string syntax was invalid - example ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request <br>  API  - The policy key is not search-enabled when attempting to perform a search - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address <br>  DOMAIN - The video is restricted from playing on the current domain - POLICY_ERROR - Error when evaluating the policy key - VIDEO_NOT_PLAYABLE - For a single video request, the video exists, but is not allowed to be played now.
     * @response `401` `void` Unauthorized - 'INVALID_POLICY_KEY:{bad policy key or undefined}' or `INVALID_JWT`(meaning that the JWT has expired)
     * @response `403` `void` ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request - DOMAIN - The video is restricted from playing on the current domain - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address - POLICY_ERROR - Error when evaluating the policy key
     * @response `405` `void` METHOD_NOT_ALLOWED:Only GET, HEAD and OPTIONS are allowed for this api.
     * @response `500` `void` 'SERVER_ERROR:internal server error' (one cause of the error is requesting a VMAP with a JWT that does not include the `ssai` claim see [Static URL Delivery](/playback/guides/static-url-delivery.html))
     * @response `502` `void` SERVER_ERROR:Got a bad response from a backend server
     * @response `504` `void` SERVER_TIMEOUT:Either a backend server or one of the servers they rely on timed out.
     */
    getStaticUrLsHlsVmap: (accountId, videoId, query, params = {}) => this.request({
      path: `/accounts/${accountId}/videos/${videoId}/hls.vmap`,
      method: "GET",
      query,
      ...params
    }),
    /**
     * @description Gets an DASH VMAP with static URLs for the renditions and other assets. Note that the URLs carry a token, and are good for the TTL of the token. Also, VMAPS can only be retrieved if the JWT includes an `ssai` claim - see [Creating a JSON Web Token](/playback/guides/static-url-delivery.html). **Version 2 of the API only**
     *
     * @tags Static URLs
     * @name GetStaticUrLsDashVmap
     * @summary Get an DASH VMAP with static URLs
     * @request GET:/accounts/{account_id}/videos/{video_id}/dash.vmap
     * @response `200` `void` 200 - returns the DASH VMAP
     * @response `400` `void` BAD_REQUEST: DUPLICATE_PARAMETERS - The same parameter name was provided more than once in the request INVALID_SEARCH - The search parameters are not valid ILLEGAL_QUERY - The search string syntax was invalid - example ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request <br>  API  - The policy key is not search-enabled when attempting to perform a search - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address <br>  DOMAIN - The video is restricted from playing on the current domain - POLICY_ERROR - Error when evaluating the policy key - VIDEO_NOT_PLAYABLE - For a single video request, the video exists, but is not allowed to be played now.
     * @response `401` `void` Unauthorized - 'INVALID_POLICY_KEY:{bad policy key or undefined}' or `INVALID_JWT`(meaning that the JWT has expired)
     * @response `403` `void` ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request - DOMAIN - The video is restricted from playing on the current domain - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address - POLICY_ERROR - Error when evaluating the policy key
     * @response `405` `void` METHOD_NOT_ALLOWED:Only GET, HEAD and OPTIONS are allowed for this api.
     * @response `500` `void` SERVER_ERROR:internal server error
     * @response `502` `void` SERVER_ERROR:Got a bad response from a backend server
     * @response `504` `void` SERVER_TIMEOUT:Either a backend server or one of the servers they rely on timed out.
     */
    getStaticUrLsDashVmap: (accountId, videoId, query, params = {}) => this.request({
      path: `/accounts/${accountId}/videos/${videoId}/dash.vmap`,
      method: "GET",
      query,
      ...params
    }),
    /**
     * @description Gets the MP4 rendition of the video that has the highest bitrate **Version 2 of the API only**
     *
     * @tags Static URLs
     * @name GetStaticUrLsHighestMp4
     * @summary Get the highest bitrate MP4 rendition
     * @request GET:/accounts/{account_id}/videos/{video_id}/high.mp4
     * @response `200` `void` 200 - returns the MP4 file
     * @response `400` `void` BAD_REQUEST: DUPLICATE_PARAMETERS - The same parameter name was provided more than once in the request INVALID_SEARCH - The search parameters are not valid ILLEGAL_QUERY - The search string syntax was invalid - example ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request <br>  API  - The policy key is not search-enabled when attempting to perform a search - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address <br>  DOMAIN - The video is restricted from playing on the current domain - POLICY_ERROR - Error when evaluating the policy key - VIDEO_NOT_PLAYABLE - For a single video request, the video exists, but is not allowed to be played now.
     * @response `401` `void` Unauthorized - 'INVALID_POLICY_KEY:{bad policy key or undefined}' or `INVALID_JWT`(meaning that the JWT has expired)
     * @response `403` `void` ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request - DOMAIN - The video is restricted from playing on the current domain - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address - POLICY_ERROR - Error when evaluating the policy key
     * @response `405` `void` METHOD_NOT_ALLOWED:Only GET, HEAD and OPTIONS are allowed for this api.
     * @response `500` `void` SERVER_ERROR:internal server error
     * @response `502` `void` SERVER_ERROR:Got a bad response from a backend server
     * @response `504` `void` SERVER_TIMEOUT:Either a backend server or one of the servers they rely on timed out.
     */
    getStaticUrLsHighestMp4: (accountId, videoId, query, params = {}) => this.request({
      path: `/accounts/${accountId}/videos/${videoId}/high.mp4`,
      method: "GET",
      query,
      ...params
    }),
    /**
     * @description Gets the MP4 rendition of the video that has the lowest bitrate **Version 2 of the API only**
     *
     * @tags Static URLs
     * @name GetStaticUrLsLowestMp4
     * @summary Get the lowest bitrate MP4 rendition
     * @request GET:/accounts/{account_id}/videos/{video_id}/low.mp4
     * @response `200` `void` 200 - returns the MP4 file
     * @response `400` `void` BAD_REQUEST: DUPLICATE_PARAMETERS - The same parameter name was provided more than once in the request INVALID_SEARCH - The search parameters are not valid ILLEGAL_QUERY - The search string syntax was invalid - example ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request <br>  API  - The policy key is not search-enabled when attempting to perform a search - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address <br>  DOMAIN - The video is restricted from playing on the current domain - POLICY_ERROR - Error when evaluating the policy key - VIDEO_NOT_PLAYABLE - For a single video request, the video exists, but is not allowed to be played now.
     * @response `401` `void` Unauthorized - 'INVALID_POLICY_KEY:{bad policy key or undefined}' or `INVALID_JWT`(meaning that the JWT has expired)
     * @response `403` `void` ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request - DOMAIN - The video is restricted from playing on the current domain - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address - POLICY_ERROR - Error when evaluating the policy key
     * @response `405` `void` METHOD_NOT_ALLOWED:Only GET, HEAD and OPTIONS are allowed for this api.
     * @response `500` `void` SERVER_ERROR:internal server error
     * @response `502` `void` SERVER_ERROR:Got a bad response from a backend server
     * @response `504` `void` SERVER_TIMEOUT:Either a backend server or one of the servers they rely on timed out.
     */
    getStaticUrLsLowestMp4: (accountId, videoId, query, params = {}) => this.request({
      path: `/accounts/${accountId}/videos/${videoId}/low.mp4`,
      method: "GET",
      query,
      ...params
    }),
    /**
     * @description Gets a playlist object for an account, based on playlist ID or reference ID. **Note that playlists may contain up to 1000 videos. By default, only the first 20 are returned. You can use the `limit` and `offset` parameters to control how many (up to 1000) and which videos are returned for a request**
     *
     * @tags Playlists
     * @name GetPlaylistsByIdOrReferenceId
     * @summary Get Playlist by ID or Reference ID
     * @request GET:/accounts/{account_id}/playlists/{playlist_id}
     * @response `200` `PlaylistResponse` 200
     * @response `400` `void` BAD_REQUEST: DUPLICATE_PARAMETERS - The same parameter name was provided more than once in the request INVALID_SEARCH - The search parameters are not valid ILLEGAL_QUERY - The search string syntax was invalid - example ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request <br>  API  - The policy key is not search-enabled when attempting to perform a search - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address <br>  DOMAIN - The video is restricted from playing on the current domain - POLICY_ERROR - Error when evaluating the policy key - VIDEO_NOT_PLAYABLE - For a single video request, the video exists, but is not allowed to be played now.
     * @response `401` `void` INVALID_POLICY_KEY:undefined
     * @response `403` `void` ACCESS_DENIED: - ACCOUNT_ID  - The account id in the policy key does not match the account in the api request - DOMAIN - The video is restricted from playing on the current domain - CLIENT_GEO - The video is restricted from playing in the current geo region; the message will contain additional information about the specific issue. For more details, see the Playback API Error Reference - CLIENT_IP - The video is restricted at the current IP address - POLICY_ERROR - Error when evaluating the policy key
     * @response `405` `void` METHOD_NOT_ALLOWED:Only GET, HEAD and OPTIONS are allowed for this api.
     * @response `500` `void` SERVER_ERROR:internal server error
     * @response `502` `void` SERVER_ERROR:Got a bad response from a backend server
     * @response `504` `void` SERVER_TIMEOUT:Either a backend server or one of the servers they rely on timed out.
     */
    getPlaylistsByIdOrReferenceId: (accountId, playlistId, query, params = {}) => this.request({
      path: `/accounts/${accountId}/playlists/${playlistId}`,
      method: "GET",
      query,
      format: "json",
      ...params
    })
  };
};

// api/getPlaylist.ts
var onRequestGet2 = async (context) => {
  const request = context.request;
  const env = context.env;
  const url = new URL(request.url);
  const playlist = url.searchParams?.get("playlist");
  const policyKey = env.POLICY_KEY;
  const accountId = env.ACCOUNT_ID;
  if (!playlist) {
    return new Response(null, {
      status: 400,
      statusText: "Missing parameters",
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  const pbApi = new playbackApi({
    baseUrl: "https://edge.api.brightcove.com/playback/v1",
    baseApiParams: {
      headers: {
        Accept: `application/json;pk=${policyKey}`
      }
    }
  });
  try {
    const res = await pbApi.accounts.getPlaylistsByIdOrReferenceId(
      accountId,
      `ref:${playlist}`,
      {
        limit: 2e3
      }
    );
    if (res.ok) {
      return new Response(JSON.stringify(res.data), {
        headers: {
          "Access-Control-Allow-Origin": "*"
        }
      });
    } else {
      return new Response(null, {
        status: 404
      });
    }
  } catch (error) {
    console.error(error);
    return new Response(null, {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};

// [[path]].js
globalThis.process = {
  argv: [],
  env: {}
};
var JA = Object.create;
var ln = Object.defineProperty;
var XA = Object.getOwnPropertyDescriptor;
var QA = Object.getOwnPropertyNames;
var e9 = Object.getPrototypeOf;
var t9 = Object.prototype.hasOwnProperty;
var p = (e, t) => () => (e && (t = e(e = 0)), t);
var be = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
var h = (e, t) => {
  for (var n in t)
    ln(e, n, { get: t[n], enumerable: true });
};
var o9 = (e, t, n, o) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let a of QA(t))
      !t9.call(e, a) && a !== n && ln(e, a, { get: () => t[a], enumerable: !(o = XA(t, a)) || o.enumerable });
  return e;
};
var A = (e, t, n) => (n = e != null ? JA(e9(e)) : {}, o9(t || !e || !e.__esModule ? ln(n, "default", { value: e, enumerable: true }) : n, e));
var cn = (e, t, n) => {
  if (!t.has(e))
    throw TypeError("Cannot " + n);
};
var m = (e, t, n) => (cn(e, t, "read from private field"), n ? n.call(e) : t.get(e));
var z = (e, t, n) => {
  if (t.has(e))
    throw TypeError("Cannot add the same private member more than once");
  t instanceof WeakSet ? t.add(e) : t.set(e, n);
};
var L = (e, t, n, o) => (cn(e, t, "write to private field"), o ? o.call(e, n) : t.set(e, n), n);
var he = (e, t, n) => (cn(e, t, "access private method"), n);
var n9;
var a9;
var s9;
var i9;
var zi;
var G = p(() => {
  ({ replace: n9 } = ""), a9 = /[&<>'"]/g, s9 = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }, i9 = (e) => s9[e], zi = (e) => n9.call(e, a9, i9);
});
var X = be((un) => {
  "use strict";
  un.parse = l9;
  un.serialize = c9;
  var r9 = Object.prototype.toString, oo = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
  function l9(e, t) {
    if (typeof e != "string")
      throw new TypeError("argument str must be a string");
    for (var n = {}, o = t || {}, a = o.decode || u9, s = 0; s < e.length; ) {
      var i = e.indexOf("=", s);
      if (i === -1)
        break;
      var r = e.indexOf(";", s);
      if (r === -1)
        r = e.length;
      else if (r < i) {
        s = e.lastIndexOf(";", i - 1) + 1;
        continue;
      }
      var l = e.slice(s, i).trim();
      if (n[l] === void 0) {
        var u = e.slice(i + 1, r).trim();
        u.charCodeAt(0) === 34 && (u = u.slice(1, -1)), n[l] = m9(u, a);
      }
      s = r + 1;
    }
    return n;
  }
  function c9(e, t, n) {
    var o = n || {}, a = o.encode || d9;
    if (typeof a != "function")
      throw new TypeError("option encode is invalid");
    if (!oo.test(e))
      throw new TypeError("argument name is invalid");
    var s = a(t);
    if (s && !oo.test(s))
      throw new TypeError("argument val is invalid");
    var i = e + "=" + s;
    if (o.maxAge != null) {
      var r = o.maxAge - 0;
      if (isNaN(r) || !isFinite(r))
        throw new TypeError("option maxAge is invalid");
      i += "; Max-Age=" + Math.floor(r);
    }
    if (o.domain) {
      if (!oo.test(o.domain))
        throw new TypeError("option domain is invalid");
      i += "; Domain=" + o.domain;
    }
    if (o.path) {
      if (!oo.test(o.path))
        throw new TypeError("option path is invalid");
      i += "; Path=" + o.path;
    }
    if (o.expires) {
      var l = o.expires;
      if (!p9(l) || isNaN(l.valueOf()))
        throw new TypeError("option expires is invalid");
      i += "; Expires=" + l.toUTCString();
    }
    if (o.httpOnly && (i += "; HttpOnly"), o.secure && (i += "; Secure"), o.priority) {
      var u = typeof o.priority == "string" ? o.priority.toLowerCase() : o.priority;
      switch (u) {
        case "low":
          i += "; Priority=Low";
          break;
        case "medium":
          i += "; Priority=Medium";
          break;
        case "high":
          i += "; Priority=High";
          break;
        default:
          throw new TypeError("option priority is invalid");
      }
    }
    if (o.sameSite) {
      var c = typeof o.sameSite == "string" ? o.sameSite.toLowerCase() : o.sameSite;
      switch (c) {
        case true:
          i += "; SameSite=Strict";
          break;
        case "lax":
          i += "; SameSite=Lax";
          break;
        case "strict":
          i += "; SameSite=Strict";
          break;
        case "none":
          i += "; SameSite=None";
          break;
        default:
          throw new TypeError("option sameSite is invalid");
      }
    }
    return i;
  }
  function u9(e) {
    return e.indexOf("%") !== -1 ? decodeURIComponent(e) : e;
  }
  function d9(e) {
    return encodeURIComponent(e);
  }
  function p9(e) {
    return r9.call(e) === "[object Date]" || e instanceof Date;
  }
  function m9(e, t) {
    try {
      return t(e);
    } catch {
      return e;
    }
  }
});
function no(e) {
  return e[0] === "/" ? e : "/" + e;
}
function dn(e) {
  return e.endsWith("/") ? e.slice(0, e.length - 1) : e;
}
function f9(e) {
  return e.startsWith("/") ? e.substring(1) : e;
}
function g9(e) {
  return e.replace(/^\/|\/$/g, "");
}
function h9(e) {
  return typeof e == "string" || e instanceof String;
}
function pn(...e) {
  return e.filter(h9).map((t, n) => n === 0 ? dn(t) : n === e.length - 1 ? f9(t) : g9(t)).join("/");
}
function mn(e) {
  return e.replace(/\\/g, "/");
}
var Q = p(() => {
});
function N(e, t) {
  let n = new RegExp(`\\x1b\\[${t}m`, "g"), o = `\x1B[${e}m`, a = `\x1B[${t}m`;
  return function(s) {
    return !D9.enabled || s == null ? s : o + (~("" + s).indexOf(a) ? s.replace(n, a + o) : s) + a;
  };
}
var fn;
var _i;
var Li;
var Ni;
var Ii;
var D9;
var $i;
var yt;
var Oi;
var NN;
var IN;
var $N;
var ON;
var UN;
var VN;
var Ui;
var WN;
var gn;
var qN;
var HN;
var Vi;
var GN;
var YN;
var KN;
var ZN;
var JN;
var XN;
var QN;
var eI;
var tI;
var oI;
var nI;
var ee = p(() => {
  Ii = true;
  typeof process < "u" && ({ FORCE_COLOR: fn, NODE_DISABLE_COLORS: _i, NO_COLOR: Li, TERM: Ni } = process.env || {}, Ii = process.stdout && process.stdout.isTTY);
  D9 = { enabled: !_i && Li == null && Ni !== "dumb" && (fn != null && fn !== "0" || Ii) };
  $i = N(0, 0), yt = N(1, 22), Oi = N(2, 22), NN = N(3, 23), IN = N(4, 24), $N = N(7, 27), ON = N(8, 28), UN = N(9, 29), VN = N(30, 39), Ui = N(31, 39), WN = N(32, 39), gn = N(33, 39), qN = N(34, 39), HN = N(35, 39), Vi = N(36, 39), GN = N(37, 39), YN = N(90, 39), KN = N(90, 39), ZN = N(40, 49), JN = N(41, 49), XN = N(42, 49), QN = N(43, 49), eI = N(44, 49), tI = N(45, 49), oI = N(46, 49), nI = N(47, 49);
});
function v9(e) {
  for (var t = [], n = 0; n < e.length; ) {
    var o = e[n];
    if (o === "*" || o === "+" || o === "?") {
      t.push({ type: "MODIFIER", index: n, value: e[n++] });
      continue;
    }
    if (o === "\\") {
      t.push({ type: "ESCAPED_CHAR", index: n++, value: e[n++] });
      continue;
    }
    if (o === "{") {
      t.push({ type: "OPEN", index: n, value: e[n++] });
      continue;
    }
    if (o === "}") {
      t.push({ type: "CLOSE", index: n, value: e[n++] });
      continue;
    }
    if (o === ":") {
      for (var a = "", s = n + 1; s < e.length; ) {
        var i = e.charCodeAt(s);
        if (i >= 48 && i <= 57 || i >= 65 && i <= 90 || i >= 97 && i <= 122 || i === 95) {
          a += e[s++];
          continue;
        }
        break;
      }
      if (!a)
        throw new TypeError("Missing parameter name at ".concat(n));
      t.push({ type: "NAME", index: n, value: a }), n = s;
      continue;
    }
    if (o === "(") {
      var r = 1, l = "", s = n + 1;
      if (e[s] === "?")
        throw new TypeError('Pattern cannot start with "?" at '.concat(s));
      for (; s < e.length; ) {
        if (e[s] === "\\") {
          l += e[s++] + e[s++];
          continue;
        }
        if (e[s] === ")") {
          if (r--, r === 0) {
            s++;
            break;
          }
        } else if (e[s] === "(" && (r++, e[s + 1] !== "?"))
          throw new TypeError("Capturing groups are not allowed at ".concat(s));
        l += e[s++];
      }
      if (r)
        throw new TypeError("Unbalanced pattern at ".concat(n));
      if (!l)
        throw new TypeError("Missing pattern at ".concat(n));
      t.push({ type: "PATTERN", index: n, value: l }), n = s;
      continue;
    }
    t.push({ type: "CHAR", index: n, value: e[n++] });
  }
  return t.push({ type: "END", index: n, value: "" }), t;
}
function y9(e, t) {
  t === void 0 && (t = {});
  for (var n = v9(e), o = t.prefixes, a = o === void 0 ? "./" : o, s = "[^".concat(w9(t.delimiter || "/#?"), "]+?"), i = [], r = 0, l = 0, u = "", c = function(b) {
    if (l < n.length && n[l].type === b)
      return n[l++].value;
  }, d = function(b) {
    var M = c(b);
    if (M !== void 0)
      return M;
    var K = n[l], Pe = K.type, F = K.index;
    throw new TypeError("Unexpected ".concat(Pe, " at ").concat(F, ", expected ").concat(b));
  }, g = function() {
    for (var b = "", M; M = c("CHAR") || c("ESCAPED_CHAR"); )
      b += M;
    return b;
  }; l < n.length; ) {
    var k = c("CHAR"), D = c("NAME"), v = c("PATTERN");
    if (D || v) {
      var C = k || "";
      a.indexOf(C) === -1 && (u += C, C = ""), u && (i.push(u), u = ""), i.push({ name: D || r++, prefix: C, suffix: "", pattern: v || s, modifier: c("MODIFIER") || "" });
      continue;
    }
    var E = k || c("ESCAPED_CHAR");
    if (E) {
      u += E;
      continue;
    }
    u && (i.push(u), u = "");
    var P = c("OPEN");
    if (P) {
      var C = g(), j = c("NAME") || "", x = c("PATTERN") || "", H = g();
      d("CLOSE"), i.push({ name: j || (x ? r++ : ""), pattern: j && !x ? s : x, prefix: C, suffix: H, modifier: c("MODIFIER") || "" });
      continue;
    }
    d("END");
  }
  return i;
}
function Wi(e, t) {
  return b9(y9(e, t), t);
}
function b9(e, t) {
  t === void 0 && (t = {});
  var n = k9(t), o = t.encode, a = o === void 0 ? function(l) {
    return l;
  } : o, s = t.validate, i = s === void 0 ? true : s, r = e.map(function(l) {
    if (typeof l == "object")
      return new RegExp("^(?:".concat(l.pattern, ")$"), n);
  });
  return function(l) {
    for (var u = "", c = 0; c < e.length; c++) {
      var d = e[c];
      if (typeof d == "string") {
        u += d;
        continue;
      }
      var g = l ? l[d.name] : void 0, k = d.modifier === "?" || d.modifier === "*", D = d.modifier === "*" || d.modifier === "+";
      if (Array.isArray(g)) {
        if (!D)
          throw new TypeError('Expected "'.concat(d.name, '" to not repeat, but got an array'));
        if (g.length === 0) {
          if (k)
            continue;
          throw new TypeError('Expected "'.concat(d.name, '" to not be empty'));
        }
        for (var v = 0; v < g.length; v++) {
          var C = a(g[v], d);
          if (i && !r[c].test(C))
            throw new TypeError('Expected all "'.concat(d.name, '" to match "').concat(d.pattern, '", but got "').concat(C, '"'));
          u += d.prefix + C + d.suffix;
        }
        continue;
      }
      if (typeof g == "string" || typeof g == "number") {
        var C = a(String(g), d);
        if (i && !r[c].test(C))
          throw new TypeError('Expected "'.concat(d.name, '" to match "').concat(d.pattern, '", but got "').concat(C, '"'));
        u += d.prefix + C + d.suffix;
        continue;
      }
      if (!k) {
        var E = D ? "an array" : "a string";
        throw new TypeError('Expected "'.concat(d.name, '" to be ').concat(E));
      }
    }
    return u;
  };
}
function w9(e) {
  return e.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function k9(e) {
  return e && e.sensitive ? "" : "i";
}
var qi = p(() => {
});
var Gi = be((iI, Hi) => {
  "use strict";
  function ao() {
    this._types = /* @__PURE__ */ Object.create(null), this._extensions = /* @__PURE__ */ Object.create(null);
    for (let e = 0; e < arguments.length; e++)
      this.define(arguments[e]);
    this.define = this.define.bind(this), this.getType = this.getType.bind(this), this.getExtension = this.getExtension.bind(this);
  }
  ao.prototype.define = function(e, t) {
    for (let n in e) {
      let o = e[n].map(function(a) {
        return a.toLowerCase();
      });
      n = n.toLowerCase();
      for (let a = 0; a < o.length; a++) {
        let s = o[a];
        if (s[0] !== "*") {
          if (!t && s in this._types)
            throw new Error('Attempt to change mapping for "' + s + '" extension from "' + this._types[s] + '" to "' + n + '". Pass `force=true` to allow this, otherwise remove "' + s + '" from the list of extensions for "' + n + '".');
          this._types[s] = n;
        }
      }
      if (t || !this._extensions[n]) {
        let a = o[0];
        this._extensions[n] = a[0] !== "*" ? a : a.substr(1);
      }
    }
  };
  ao.prototype.getType = function(e) {
    e = String(e);
    let t = e.replace(/^.*[/\\]/, "").toLowerCase(), n = t.replace(/^.*\./, "").toLowerCase(), o = t.length < e.length;
    return (n.length < t.length - 1 || !o) && this._types[n] || null;
  };
  ao.prototype.getExtension = function(e) {
    return e = /^\s*([^;\s]*)/.test(e) && RegExp.$1, e && this._extensions[e.toLowerCase()] || null;
  };
  Hi.exports = ao;
});
var Ki = be((rI, Yi) => {
  Yi.exports = { "application/andrew-inset": ["ez"], "application/applixware": ["aw"], "application/atom+xml": ["atom"], "application/atomcat+xml": ["atomcat"], "application/atomdeleted+xml": ["atomdeleted"], "application/atomsvc+xml": ["atomsvc"], "application/atsc-dwd+xml": ["dwd"], "application/atsc-held+xml": ["held"], "application/atsc-rsat+xml": ["rsat"], "application/bdoc": ["bdoc"], "application/calendar+xml": ["xcs"], "application/ccxml+xml": ["ccxml"], "application/cdfx+xml": ["cdfx"], "application/cdmi-capability": ["cdmia"], "application/cdmi-container": ["cdmic"], "application/cdmi-domain": ["cdmid"], "application/cdmi-object": ["cdmio"], "application/cdmi-queue": ["cdmiq"], "application/cu-seeme": ["cu"], "application/dash+xml": ["mpd"], "application/davmount+xml": ["davmount"], "application/docbook+xml": ["dbk"], "application/dssc+der": ["dssc"], "application/dssc+xml": ["xdssc"], "application/ecmascript": ["es", "ecma"], "application/emma+xml": ["emma"], "application/emotionml+xml": ["emotionml"], "application/epub+zip": ["epub"], "application/exi": ["exi"], "application/express": ["exp"], "application/fdt+xml": ["fdt"], "application/font-tdpfr": ["pfr"], "application/geo+json": ["geojson"], "application/gml+xml": ["gml"], "application/gpx+xml": ["gpx"], "application/gxf": ["gxf"], "application/gzip": ["gz"], "application/hjson": ["hjson"], "application/hyperstudio": ["stk"], "application/inkml+xml": ["ink", "inkml"], "application/ipfix": ["ipfix"], "application/its+xml": ["its"], "application/java-archive": ["jar", "war", "ear"], "application/java-serialized-object": ["ser"], "application/java-vm": ["class"], "application/javascript": ["js", "mjs"], "application/json": ["json", "map"], "application/json5": ["json5"], "application/jsonml+json": ["jsonml"], "application/ld+json": ["jsonld"], "application/lgr+xml": ["lgr"], "application/lost+xml": ["lostxml"], "application/mac-binhex40": ["hqx"], "application/mac-compactpro": ["cpt"], "application/mads+xml": ["mads"], "application/manifest+json": ["webmanifest"], "application/marc": ["mrc"], "application/marcxml+xml": ["mrcx"], "application/mathematica": ["ma", "nb", "mb"], "application/mathml+xml": ["mathml"], "application/mbox": ["mbox"], "application/mediaservercontrol+xml": ["mscml"], "application/metalink+xml": ["metalink"], "application/metalink4+xml": ["meta4"], "application/mets+xml": ["mets"], "application/mmt-aei+xml": ["maei"], "application/mmt-usd+xml": ["musd"], "application/mods+xml": ["mods"], "application/mp21": ["m21", "mp21"], "application/mp4": ["mp4s", "m4p"], "application/msword": ["doc", "dot"], "application/mxf": ["mxf"], "application/n-quads": ["nq"], "application/n-triples": ["nt"], "application/node": ["cjs"], "application/octet-stream": ["bin", "dms", "lrf", "mar", "so", "dist", "distz", "pkg", "bpk", "dump", "elc", "deploy", "exe", "dll", "deb", "dmg", "iso", "img", "msi", "msp", "msm", "buffer"], "application/oda": ["oda"], "application/oebps-package+xml": ["opf"], "application/ogg": ["ogx"], "application/omdoc+xml": ["omdoc"], "application/onenote": ["onetoc", "onetoc2", "onetmp", "onepkg"], "application/oxps": ["oxps"], "application/p2p-overlay+xml": ["relo"], "application/patch-ops-error+xml": ["xer"], "application/pdf": ["pdf"], "application/pgp-encrypted": ["pgp"], "application/pgp-signature": ["asc", "sig"], "application/pics-rules": ["prf"], "application/pkcs10": ["p10"], "application/pkcs7-mime": ["p7m", "p7c"], "application/pkcs7-signature": ["p7s"], "application/pkcs8": ["p8"], "application/pkix-attr-cert": ["ac"], "application/pkix-cert": ["cer"], "application/pkix-crl": ["crl"], "application/pkix-pkipath": ["pkipath"], "application/pkixcmp": ["pki"], "application/pls+xml": ["pls"], "application/postscript": ["ai", "eps", "ps"], "application/provenance+xml": ["provx"], "application/pskc+xml": ["pskcxml"], "application/raml+yaml": ["raml"], "application/rdf+xml": ["rdf", "owl"], "application/reginfo+xml": ["rif"], "application/relax-ng-compact-syntax": ["rnc"], "application/resource-lists+xml": ["rl"], "application/resource-lists-diff+xml": ["rld"], "application/rls-services+xml": ["rs"], "application/route-apd+xml": ["rapd"], "application/route-s-tsid+xml": ["sls"], "application/route-usd+xml": ["rusd"], "application/rpki-ghostbusters": ["gbr"], "application/rpki-manifest": ["mft"], "application/rpki-roa": ["roa"], "application/rsd+xml": ["rsd"], "application/rss+xml": ["rss"], "application/rtf": ["rtf"], "application/sbml+xml": ["sbml"], "application/scvp-cv-request": ["scq"], "application/scvp-cv-response": ["scs"], "application/scvp-vp-request": ["spq"], "application/scvp-vp-response": ["spp"], "application/sdp": ["sdp"], "application/senml+xml": ["senmlx"], "application/sensml+xml": ["sensmlx"], "application/set-payment-initiation": ["setpay"], "application/set-registration-initiation": ["setreg"], "application/shf+xml": ["shf"], "application/sieve": ["siv", "sieve"], "application/smil+xml": ["smi", "smil"], "application/sparql-query": ["rq"], "application/sparql-results+xml": ["srx"], "application/srgs": ["gram"], "application/srgs+xml": ["grxml"], "application/sru+xml": ["sru"], "application/ssdl+xml": ["ssdl"], "application/ssml+xml": ["ssml"], "application/swid+xml": ["swidtag"], "application/tei+xml": ["tei", "teicorpus"], "application/thraud+xml": ["tfi"], "application/timestamped-data": ["tsd"], "application/toml": ["toml"], "application/trig": ["trig"], "application/ttml+xml": ["ttml"], "application/ubjson": ["ubj"], "application/urc-ressheet+xml": ["rsheet"], "application/urc-targetdesc+xml": ["td"], "application/voicexml+xml": ["vxml"], "application/wasm": ["wasm"], "application/widget": ["wgt"], "application/winhlp": ["hlp"], "application/wsdl+xml": ["wsdl"], "application/wspolicy+xml": ["wspolicy"], "application/xaml+xml": ["xaml"], "application/xcap-att+xml": ["xav"], "application/xcap-caps+xml": ["xca"], "application/xcap-diff+xml": ["xdf"], "application/xcap-el+xml": ["xel"], "application/xcap-ns+xml": ["xns"], "application/xenc+xml": ["xenc"], "application/xhtml+xml": ["xhtml", "xht"], "application/xliff+xml": ["xlf"], "application/xml": ["xml", "xsl", "xsd", "rng"], "application/xml-dtd": ["dtd"], "application/xop+xml": ["xop"], "application/xproc+xml": ["xpl"], "application/xslt+xml": ["*xsl", "xslt"], "application/xspf+xml": ["xspf"], "application/xv+xml": ["mxml", "xhvml", "xvml", "xvm"], "application/yang": ["yang"], "application/yin+xml": ["yin"], "application/zip": ["zip"], "audio/3gpp": ["*3gpp"], "audio/adpcm": ["adp"], "audio/amr": ["amr"], "audio/basic": ["au", "snd"], "audio/midi": ["mid", "midi", "kar", "rmi"], "audio/mobile-xmf": ["mxmf"], "audio/mp3": ["*mp3"], "audio/mp4": ["m4a", "mp4a"], "audio/mpeg": ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"], "audio/ogg": ["oga", "ogg", "spx", "opus"], "audio/s3m": ["s3m"], "audio/silk": ["sil"], "audio/wav": ["wav"], "audio/wave": ["*wav"], "audio/webm": ["weba"], "audio/xm": ["xm"], "font/collection": ["ttc"], "font/otf": ["otf"], "font/ttf": ["ttf"], "font/woff": ["woff"], "font/woff2": ["woff2"], "image/aces": ["exr"], "image/apng": ["apng"], "image/avif": ["avif"], "image/bmp": ["bmp"], "image/cgm": ["cgm"], "image/dicom-rle": ["drle"], "image/emf": ["emf"], "image/fits": ["fits"], "image/g3fax": ["g3"], "image/gif": ["gif"], "image/heic": ["heic"], "image/heic-sequence": ["heics"], "image/heif": ["heif"], "image/heif-sequence": ["heifs"], "image/hej2k": ["hej2"], "image/hsj2": ["hsj2"], "image/ief": ["ief"], "image/jls": ["jls"], "image/jp2": ["jp2", "jpg2"], "image/jpeg": ["jpeg", "jpg", "jpe"], "image/jph": ["jph"], "image/jphc": ["jhc"], "image/jpm": ["jpm"], "image/jpx": ["jpx", "jpf"], "image/jxr": ["jxr"], "image/jxra": ["jxra"], "image/jxrs": ["jxrs"], "image/jxs": ["jxs"], "image/jxsc": ["jxsc"], "image/jxsi": ["jxsi"], "image/jxss": ["jxss"], "image/ktx": ["ktx"], "image/ktx2": ["ktx2"], "image/png": ["png"], "image/sgi": ["sgi"], "image/svg+xml": ["svg", "svgz"], "image/t38": ["t38"], "image/tiff": ["tif", "tiff"], "image/tiff-fx": ["tfx"], "image/webp": ["webp"], "image/wmf": ["wmf"], "message/disposition-notification": ["disposition-notification"], "message/global": ["u8msg"], "message/global-delivery-status": ["u8dsn"], "message/global-disposition-notification": ["u8mdn"], "message/global-headers": ["u8hdr"], "message/rfc822": ["eml", "mime"], "model/3mf": ["3mf"], "model/gltf+json": ["gltf"], "model/gltf-binary": ["glb"], "model/iges": ["igs", "iges"], "model/mesh": ["msh", "mesh", "silo"], "model/mtl": ["mtl"], "model/obj": ["obj"], "model/step+xml": ["stpx"], "model/step+zip": ["stpz"], "model/step-xml+zip": ["stpxz"], "model/stl": ["stl"], "model/vrml": ["wrl", "vrml"], "model/x3d+binary": ["*x3db", "x3dbz"], "model/x3d+fastinfoset": ["x3db"], "model/x3d+vrml": ["*x3dv", "x3dvz"], "model/x3d+xml": ["x3d", "x3dz"], "model/x3d-vrml": ["x3dv"], "text/cache-manifest": ["appcache", "manifest"], "text/calendar": ["ics", "ifb"], "text/coffeescript": ["coffee", "litcoffee"], "text/css": ["css"], "text/csv": ["csv"], "text/html": ["html", "htm", "shtml"], "text/jade": ["jade"], "text/jsx": ["jsx"], "text/less": ["less"], "text/markdown": ["markdown", "md"], "text/mathml": ["mml"], "text/mdx": ["mdx"], "text/n3": ["n3"], "text/plain": ["txt", "text", "conf", "def", "list", "log", "in", "ini"], "text/richtext": ["rtx"], "text/rtf": ["*rtf"], "text/sgml": ["sgml", "sgm"], "text/shex": ["shex"], "text/slim": ["slim", "slm"], "text/spdx": ["spdx"], "text/stylus": ["stylus", "styl"], "text/tab-separated-values": ["tsv"], "text/troff": ["t", "tr", "roff", "man", "me", "ms"], "text/turtle": ["ttl"], "text/uri-list": ["uri", "uris", "urls"], "text/vcard": ["vcard"], "text/vtt": ["vtt"], "text/xml": ["*xml"], "text/yaml": ["yaml", "yml"], "video/3gpp": ["3gp", "3gpp"], "video/3gpp2": ["3g2"], "video/h261": ["h261"], "video/h263": ["h263"], "video/h264": ["h264"], "video/iso.segment": ["m4s"], "video/jpeg": ["jpgv"], "video/jpm": ["*jpm", "jpgm"], "video/mj2": ["mj2", "mjp2"], "video/mp2t": ["ts"], "video/mp4": ["mp4", "mp4v", "mpg4"], "video/mpeg": ["mpeg", "mpg", "mpe", "m1v", "m2v"], "video/ogg": ["ogv"], "video/quicktime": ["qt", "mov"], "video/webm": ["webm"] };
});
var Ji = be((lI, Zi) => {
  Zi.exports = { "application/prs.cww": ["cww"], "application/vnd.1000minds.decision-model+xml": ["1km"], "application/vnd.3gpp.pic-bw-large": ["plb"], "application/vnd.3gpp.pic-bw-small": ["psb"], "application/vnd.3gpp.pic-bw-var": ["pvb"], "application/vnd.3gpp2.tcap": ["tcap"], "application/vnd.3m.post-it-notes": ["pwn"], "application/vnd.accpac.simply.aso": ["aso"], "application/vnd.accpac.simply.imp": ["imp"], "application/vnd.acucobol": ["acu"], "application/vnd.acucorp": ["atc", "acutc"], "application/vnd.adobe.air-application-installer-package+zip": ["air"], "application/vnd.adobe.formscentral.fcdt": ["fcdt"], "application/vnd.adobe.fxp": ["fxp", "fxpl"], "application/vnd.adobe.xdp+xml": ["xdp"], "application/vnd.adobe.xfdf": ["xfdf"], "application/vnd.ahead.space": ["ahead"], "application/vnd.airzip.filesecure.azf": ["azf"], "application/vnd.airzip.filesecure.azs": ["azs"], "application/vnd.amazon.ebook": ["azw"], "application/vnd.americandynamics.acc": ["acc"], "application/vnd.amiga.ami": ["ami"], "application/vnd.android.package-archive": ["apk"], "application/vnd.anser-web-certificate-issue-initiation": ["cii"], "application/vnd.anser-web-funds-transfer-initiation": ["fti"], "application/vnd.antix.game-component": ["atx"], "application/vnd.apple.installer+xml": ["mpkg"], "application/vnd.apple.keynote": ["key"], "application/vnd.apple.mpegurl": ["m3u8"], "application/vnd.apple.numbers": ["numbers"], "application/vnd.apple.pages": ["pages"], "application/vnd.apple.pkpass": ["pkpass"], "application/vnd.aristanetworks.swi": ["swi"], "application/vnd.astraea-software.iota": ["iota"], "application/vnd.audiograph": ["aep"], "application/vnd.balsamiq.bmml+xml": ["bmml"], "application/vnd.blueice.multipass": ["mpm"], "application/vnd.bmi": ["bmi"], "application/vnd.businessobjects": ["rep"], "application/vnd.chemdraw+xml": ["cdxml"], "application/vnd.chipnuts.karaoke-mmd": ["mmd"], "application/vnd.cinderella": ["cdy"], "application/vnd.citationstyles.style+xml": ["csl"], "application/vnd.claymore": ["cla"], "application/vnd.cloanto.rp9": ["rp9"], "application/vnd.clonk.c4group": ["c4g", "c4d", "c4f", "c4p", "c4u"], "application/vnd.cluetrust.cartomobile-config": ["c11amc"], "application/vnd.cluetrust.cartomobile-config-pkg": ["c11amz"], "application/vnd.commonspace": ["csp"], "application/vnd.contact.cmsg": ["cdbcmsg"], "application/vnd.cosmocaller": ["cmc"], "application/vnd.crick.clicker": ["clkx"], "application/vnd.crick.clicker.keyboard": ["clkk"], "application/vnd.crick.clicker.palette": ["clkp"], "application/vnd.crick.clicker.template": ["clkt"], "application/vnd.crick.clicker.wordbank": ["clkw"], "application/vnd.criticaltools.wbs+xml": ["wbs"], "application/vnd.ctc-posml": ["pml"], "application/vnd.cups-ppd": ["ppd"], "application/vnd.curl.car": ["car"], "application/vnd.curl.pcurl": ["pcurl"], "application/vnd.dart": ["dart"], "application/vnd.data-vision.rdz": ["rdz"], "application/vnd.dbf": ["dbf"], "application/vnd.dece.data": ["uvf", "uvvf", "uvd", "uvvd"], "application/vnd.dece.ttml+xml": ["uvt", "uvvt"], "application/vnd.dece.unspecified": ["uvx", "uvvx"], "application/vnd.dece.zip": ["uvz", "uvvz"], "application/vnd.denovo.fcselayout-link": ["fe_launch"], "application/vnd.dna": ["dna"], "application/vnd.dolby.mlp": ["mlp"], "application/vnd.dpgraph": ["dpg"], "application/vnd.dreamfactory": ["dfac"], "application/vnd.ds-keypoint": ["kpxx"], "application/vnd.dvb.ait": ["ait"], "application/vnd.dvb.service": ["svc"], "application/vnd.dynageo": ["geo"], "application/vnd.ecowin.chart": ["mag"], "application/vnd.enliven": ["nml"], "application/vnd.epson.esf": ["esf"], "application/vnd.epson.msf": ["msf"], "application/vnd.epson.quickanime": ["qam"], "application/vnd.epson.salt": ["slt"], "application/vnd.epson.ssf": ["ssf"], "application/vnd.eszigno3+xml": ["es3", "et3"], "application/vnd.ezpix-album": ["ez2"], "application/vnd.ezpix-package": ["ez3"], "application/vnd.fdf": ["fdf"], "application/vnd.fdsn.mseed": ["mseed"], "application/vnd.fdsn.seed": ["seed", "dataless"], "application/vnd.flographit": ["gph"], "application/vnd.fluxtime.clip": ["ftc"], "application/vnd.framemaker": ["fm", "frame", "maker", "book"], "application/vnd.frogans.fnc": ["fnc"], "application/vnd.frogans.ltf": ["ltf"], "application/vnd.fsc.weblaunch": ["fsc"], "application/vnd.fujitsu.oasys": ["oas"], "application/vnd.fujitsu.oasys2": ["oa2"], "application/vnd.fujitsu.oasys3": ["oa3"], "application/vnd.fujitsu.oasysgp": ["fg5"], "application/vnd.fujitsu.oasysprs": ["bh2"], "application/vnd.fujixerox.ddd": ["ddd"], "application/vnd.fujixerox.docuworks": ["xdw"], "application/vnd.fujixerox.docuworks.binder": ["xbd"], "application/vnd.fuzzysheet": ["fzs"], "application/vnd.genomatix.tuxedo": ["txd"], "application/vnd.geogebra.file": ["ggb"], "application/vnd.geogebra.tool": ["ggt"], "application/vnd.geometry-explorer": ["gex", "gre"], "application/vnd.geonext": ["gxt"], "application/vnd.geoplan": ["g2w"], "application/vnd.geospace": ["g3w"], "application/vnd.gmx": ["gmx"], "application/vnd.google-apps.document": ["gdoc"], "application/vnd.google-apps.presentation": ["gslides"], "application/vnd.google-apps.spreadsheet": ["gsheet"], "application/vnd.google-earth.kml+xml": ["kml"], "application/vnd.google-earth.kmz": ["kmz"], "application/vnd.grafeq": ["gqf", "gqs"], "application/vnd.groove-account": ["gac"], "application/vnd.groove-help": ["ghf"], "application/vnd.groove-identity-message": ["gim"], "application/vnd.groove-injector": ["grv"], "application/vnd.groove-tool-message": ["gtm"], "application/vnd.groove-tool-template": ["tpl"], "application/vnd.groove-vcard": ["vcg"], "application/vnd.hal+xml": ["hal"], "application/vnd.handheld-entertainment+xml": ["zmm"], "application/vnd.hbci": ["hbci"], "application/vnd.hhe.lesson-player": ["les"], "application/vnd.hp-hpgl": ["hpgl"], "application/vnd.hp-hpid": ["hpid"], "application/vnd.hp-hps": ["hps"], "application/vnd.hp-jlyt": ["jlt"], "application/vnd.hp-pcl": ["pcl"], "application/vnd.hp-pclxl": ["pclxl"], "application/vnd.hydrostatix.sof-data": ["sfd-hdstx"], "application/vnd.ibm.minipay": ["mpy"], "application/vnd.ibm.modcap": ["afp", "listafp", "list3820"], "application/vnd.ibm.rights-management": ["irm"], "application/vnd.ibm.secure-container": ["sc"], "application/vnd.iccprofile": ["icc", "icm"], "application/vnd.igloader": ["igl"], "application/vnd.immervision-ivp": ["ivp"], "application/vnd.immervision-ivu": ["ivu"], "application/vnd.insors.igm": ["igm"], "application/vnd.intercon.formnet": ["xpw", "xpx"], "application/vnd.intergeo": ["i2g"], "application/vnd.intu.qbo": ["qbo"], "application/vnd.intu.qfx": ["qfx"], "application/vnd.ipunplugged.rcprofile": ["rcprofile"], "application/vnd.irepository.package+xml": ["irp"], "application/vnd.is-xpr": ["xpr"], "application/vnd.isac.fcs": ["fcs"], "application/vnd.jam": ["jam"], "application/vnd.jcp.javame.midlet-rms": ["rms"], "application/vnd.jisp": ["jisp"], "application/vnd.joost.joda-archive": ["joda"], "application/vnd.kahootz": ["ktz", "ktr"], "application/vnd.kde.karbon": ["karbon"], "application/vnd.kde.kchart": ["chrt"], "application/vnd.kde.kformula": ["kfo"], "application/vnd.kde.kivio": ["flw"], "application/vnd.kde.kontour": ["kon"], "application/vnd.kde.kpresenter": ["kpr", "kpt"], "application/vnd.kde.kspread": ["ksp"], "application/vnd.kde.kword": ["kwd", "kwt"], "application/vnd.kenameaapp": ["htke"], "application/vnd.kidspiration": ["kia"], "application/vnd.kinar": ["kne", "knp"], "application/vnd.koan": ["skp", "skd", "skt", "skm"], "application/vnd.kodak-descriptor": ["sse"], "application/vnd.las.las+xml": ["lasxml"], "application/vnd.llamagraphics.life-balance.desktop": ["lbd"], "application/vnd.llamagraphics.life-balance.exchange+xml": ["lbe"], "application/vnd.lotus-1-2-3": ["123"], "application/vnd.lotus-approach": ["apr"], "application/vnd.lotus-freelance": ["pre"], "application/vnd.lotus-notes": ["nsf"], "application/vnd.lotus-organizer": ["org"], "application/vnd.lotus-screencam": ["scm"], "application/vnd.lotus-wordpro": ["lwp"], "application/vnd.macports.portpkg": ["portpkg"], "application/vnd.mapbox-vector-tile": ["mvt"], "application/vnd.mcd": ["mcd"], "application/vnd.medcalcdata": ["mc1"], "application/vnd.mediastation.cdkey": ["cdkey"], "application/vnd.mfer": ["mwf"], "application/vnd.mfmp": ["mfm"], "application/vnd.micrografx.flo": ["flo"], "application/vnd.micrografx.igx": ["igx"], "application/vnd.mif": ["mif"], "application/vnd.mobius.daf": ["daf"], "application/vnd.mobius.dis": ["dis"], "application/vnd.mobius.mbk": ["mbk"], "application/vnd.mobius.mqy": ["mqy"], "application/vnd.mobius.msl": ["msl"], "application/vnd.mobius.plc": ["plc"], "application/vnd.mobius.txf": ["txf"], "application/vnd.mophun.application": ["mpn"], "application/vnd.mophun.certificate": ["mpc"], "application/vnd.mozilla.xul+xml": ["xul"], "application/vnd.ms-artgalry": ["cil"], "application/vnd.ms-cab-compressed": ["cab"], "application/vnd.ms-excel": ["xls", "xlm", "xla", "xlc", "xlt", "xlw"], "application/vnd.ms-excel.addin.macroenabled.12": ["xlam"], "application/vnd.ms-excel.sheet.binary.macroenabled.12": ["xlsb"], "application/vnd.ms-excel.sheet.macroenabled.12": ["xlsm"], "application/vnd.ms-excel.template.macroenabled.12": ["xltm"], "application/vnd.ms-fontobject": ["eot"], "application/vnd.ms-htmlhelp": ["chm"], "application/vnd.ms-ims": ["ims"], "application/vnd.ms-lrm": ["lrm"], "application/vnd.ms-officetheme": ["thmx"], "application/vnd.ms-outlook": ["msg"], "application/vnd.ms-pki.seccat": ["cat"], "application/vnd.ms-pki.stl": ["*stl"], "application/vnd.ms-powerpoint": ["ppt", "pps", "pot"], "application/vnd.ms-powerpoint.addin.macroenabled.12": ["ppam"], "application/vnd.ms-powerpoint.presentation.macroenabled.12": ["pptm"], "application/vnd.ms-powerpoint.slide.macroenabled.12": ["sldm"], "application/vnd.ms-powerpoint.slideshow.macroenabled.12": ["ppsm"], "application/vnd.ms-powerpoint.template.macroenabled.12": ["potm"], "application/vnd.ms-project": ["mpp", "mpt"], "application/vnd.ms-word.document.macroenabled.12": ["docm"], "application/vnd.ms-word.template.macroenabled.12": ["dotm"], "application/vnd.ms-works": ["wps", "wks", "wcm", "wdb"], "application/vnd.ms-wpl": ["wpl"], "application/vnd.ms-xpsdocument": ["xps"], "application/vnd.mseq": ["mseq"], "application/vnd.musician": ["mus"], "application/vnd.muvee.style": ["msty"], "application/vnd.mynfc": ["taglet"], "application/vnd.neurolanguage.nlu": ["nlu"], "application/vnd.nitf": ["ntf", "nitf"], "application/vnd.noblenet-directory": ["nnd"], "application/vnd.noblenet-sealer": ["nns"], "application/vnd.noblenet-web": ["nnw"], "application/vnd.nokia.n-gage.ac+xml": ["*ac"], "application/vnd.nokia.n-gage.data": ["ngdat"], "application/vnd.nokia.n-gage.symbian.install": ["n-gage"], "application/vnd.nokia.radio-preset": ["rpst"], "application/vnd.nokia.radio-presets": ["rpss"], "application/vnd.novadigm.edm": ["edm"], "application/vnd.novadigm.edx": ["edx"], "application/vnd.novadigm.ext": ["ext"], "application/vnd.oasis.opendocument.chart": ["odc"], "application/vnd.oasis.opendocument.chart-template": ["otc"], "application/vnd.oasis.opendocument.database": ["odb"], "application/vnd.oasis.opendocument.formula": ["odf"], "application/vnd.oasis.opendocument.formula-template": ["odft"], "application/vnd.oasis.opendocument.graphics": ["odg"], "application/vnd.oasis.opendocument.graphics-template": ["otg"], "application/vnd.oasis.opendocument.image": ["odi"], "application/vnd.oasis.opendocument.image-template": ["oti"], "application/vnd.oasis.opendocument.presentation": ["odp"], "application/vnd.oasis.opendocument.presentation-template": ["otp"], "application/vnd.oasis.opendocument.spreadsheet": ["ods"], "application/vnd.oasis.opendocument.spreadsheet-template": ["ots"], "application/vnd.oasis.opendocument.text": ["odt"], "application/vnd.oasis.opendocument.text-master": ["odm"], "application/vnd.oasis.opendocument.text-template": ["ott"], "application/vnd.oasis.opendocument.text-web": ["oth"], "application/vnd.olpc-sugar": ["xo"], "application/vnd.oma.dd2+xml": ["dd2"], "application/vnd.openblox.game+xml": ["obgx"], "application/vnd.openofficeorg.extension": ["oxt"], "application/vnd.openstreetmap.data+xml": ["osm"], "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"], "application/vnd.openxmlformats-officedocument.presentationml.slide": ["sldx"], "application/vnd.openxmlformats-officedocument.presentationml.slideshow": ["ppsx"], "application/vnd.openxmlformats-officedocument.presentationml.template": ["potx"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"], "application/vnd.openxmlformats-officedocument.spreadsheetml.template": ["xltx"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"], "application/vnd.openxmlformats-officedocument.wordprocessingml.template": ["dotx"], "application/vnd.osgeo.mapguide.package": ["mgp"], "application/vnd.osgi.dp": ["dp"], "application/vnd.osgi.subsystem": ["esa"], "application/vnd.palm": ["pdb", "pqa", "oprc"], "application/vnd.pawaafile": ["paw"], "application/vnd.pg.format": ["str"], "application/vnd.pg.osasli": ["ei6"], "application/vnd.picsel": ["efif"], "application/vnd.pmi.widget": ["wg"], "application/vnd.pocketlearn": ["plf"], "application/vnd.powerbuilder6": ["pbd"], "application/vnd.previewsystems.box": ["box"], "application/vnd.proteus.magazine": ["mgz"], "application/vnd.publishare-delta-tree": ["qps"], "application/vnd.pvi.ptid1": ["ptid"], "application/vnd.quark.quarkxpress": ["qxd", "qxt", "qwd", "qwt", "qxl", "qxb"], "application/vnd.rar": ["rar"], "application/vnd.realvnc.bed": ["bed"], "application/vnd.recordare.musicxml": ["mxl"], "application/vnd.recordare.musicxml+xml": ["musicxml"], "application/vnd.rig.cryptonote": ["cryptonote"], "application/vnd.rim.cod": ["cod"], "application/vnd.rn-realmedia": ["rm"], "application/vnd.rn-realmedia-vbr": ["rmvb"], "application/vnd.route66.link66+xml": ["link66"], "application/vnd.sailingtracker.track": ["st"], "application/vnd.seemail": ["see"], "application/vnd.sema": ["sema"], "application/vnd.semd": ["semd"], "application/vnd.semf": ["semf"], "application/vnd.shana.informed.formdata": ["ifm"], "application/vnd.shana.informed.formtemplate": ["itp"], "application/vnd.shana.informed.interchange": ["iif"], "application/vnd.shana.informed.package": ["ipk"], "application/vnd.simtech-mindmapper": ["twd", "twds"], "application/vnd.smaf": ["mmf"], "application/vnd.smart.teacher": ["teacher"], "application/vnd.software602.filler.form+xml": ["fo"], "application/vnd.solent.sdkm+xml": ["sdkm", "sdkd"], "application/vnd.spotfire.dxp": ["dxp"], "application/vnd.spotfire.sfs": ["sfs"], "application/vnd.stardivision.calc": ["sdc"], "application/vnd.stardivision.draw": ["sda"], "application/vnd.stardivision.impress": ["sdd"], "application/vnd.stardivision.math": ["smf"], "application/vnd.stardivision.writer": ["sdw", "vor"], "application/vnd.stardivision.writer-global": ["sgl"], "application/vnd.stepmania.package": ["smzip"], "application/vnd.stepmania.stepchart": ["sm"], "application/vnd.sun.wadl+xml": ["wadl"], "application/vnd.sun.xml.calc": ["sxc"], "application/vnd.sun.xml.calc.template": ["stc"], "application/vnd.sun.xml.draw": ["sxd"], "application/vnd.sun.xml.draw.template": ["std"], "application/vnd.sun.xml.impress": ["sxi"], "application/vnd.sun.xml.impress.template": ["sti"], "application/vnd.sun.xml.math": ["sxm"], "application/vnd.sun.xml.writer": ["sxw"], "application/vnd.sun.xml.writer.global": ["sxg"], "application/vnd.sun.xml.writer.template": ["stw"], "application/vnd.sus-calendar": ["sus", "susp"], "application/vnd.svd": ["svd"], "application/vnd.symbian.install": ["sis", "sisx"], "application/vnd.syncml+xml": ["xsm"], "application/vnd.syncml.dm+wbxml": ["bdm"], "application/vnd.syncml.dm+xml": ["xdm"], "application/vnd.syncml.dmddf+xml": ["ddf"], "application/vnd.tao.intent-module-archive": ["tao"], "application/vnd.tcpdump.pcap": ["pcap", "cap", "dmp"], "application/vnd.tmobile-livetv": ["tmo"], "application/vnd.trid.tpt": ["tpt"], "application/vnd.triscape.mxs": ["mxs"], "application/vnd.trueapp": ["tra"], "application/vnd.ufdl": ["ufd", "ufdl"], "application/vnd.uiq.theme": ["utz"], "application/vnd.umajin": ["umj"], "application/vnd.unity": ["unityweb"], "application/vnd.uoml+xml": ["uoml"], "application/vnd.vcx": ["vcx"], "application/vnd.visio": ["vsd", "vst", "vss", "vsw"], "application/vnd.visionary": ["vis"], "application/vnd.vsf": ["vsf"], "application/vnd.wap.wbxml": ["wbxml"], "application/vnd.wap.wmlc": ["wmlc"], "application/vnd.wap.wmlscriptc": ["wmlsc"], "application/vnd.webturbo": ["wtb"], "application/vnd.wolfram.player": ["nbp"], "application/vnd.wordperfect": ["wpd"], "application/vnd.wqd": ["wqd"], "application/vnd.wt.stf": ["stf"], "application/vnd.xara": ["xar"], "application/vnd.xfdl": ["xfdl"], "application/vnd.yamaha.hv-dic": ["hvd"], "application/vnd.yamaha.hv-script": ["hvs"], "application/vnd.yamaha.hv-voice": ["hvp"], "application/vnd.yamaha.openscoreformat": ["osf"], "application/vnd.yamaha.openscoreformat.osfpvg+xml": ["osfpvg"], "application/vnd.yamaha.smaf-audio": ["saf"], "application/vnd.yamaha.smaf-phrase": ["spf"], "application/vnd.yellowriver-custom-menu": ["cmp"], "application/vnd.zul": ["zir", "zirz"], "application/vnd.zzazz.deck+xml": ["zaz"], "application/x-7z-compressed": ["7z"], "application/x-abiword": ["abw"], "application/x-ace-compressed": ["ace"], "application/x-apple-diskimage": ["*dmg"], "application/x-arj": ["arj"], "application/x-authorware-bin": ["aab", "x32", "u32", "vox"], "application/x-authorware-map": ["aam"], "application/x-authorware-seg": ["aas"], "application/x-bcpio": ["bcpio"], "application/x-bdoc": ["*bdoc"], "application/x-bittorrent": ["torrent"], "application/x-blorb": ["blb", "blorb"], "application/x-bzip": ["bz"], "application/x-bzip2": ["bz2", "boz"], "application/x-cbr": ["cbr", "cba", "cbt", "cbz", "cb7"], "application/x-cdlink": ["vcd"], "application/x-cfs-compressed": ["cfs"], "application/x-chat": ["chat"], "application/x-chess-pgn": ["pgn"], "application/x-chrome-extension": ["crx"], "application/x-cocoa": ["cco"], "application/x-conference": ["nsc"], "application/x-cpio": ["cpio"], "application/x-csh": ["csh"], "application/x-debian-package": ["*deb", "udeb"], "application/x-dgc-compressed": ["dgc"], "application/x-director": ["dir", "dcr", "dxr", "cst", "cct", "cxt", "w3d", "fgd", "swa"], "application/x-doom": ["wad"], "application/x-dtbncx+xml": ["ncx"], "application/x-dtbook+xml": ["dtb"], "application/x-dtbresource+xml": ["res"], "application/x-dvi": ["dvi"], "application/x-envoy": ["evy"], "application/x-eva": ["eva"], "application/x-font-bdf": ["bdf"], "application/x-font-ghostscript": ["gsf"], "application/x-font-linux-psf": ["psf"], "application/x-font-pcf": ["pcf"], "application/x-font-snf": ["snf"], "application/x-font-type1": ["pfa", "pfb", "pfm", "afm"], "application/x-freearc": ["arc"], "application/x-futuresplash": ["spl"], "application/x-gca-compressed": ["gca"], "application/x-glulx": ["ulx"], "application/x-gnumeric": ["gnumeric"], "application/x-gramps-xml": ["gramps"], "application/x-gtar": ["gtar"], "application/x-hdf": ["hdf"], "application/x-httpd-php": ["php"], "application/x-install-instructions": ["install"], "application/x-iso9660-image": ["*iso"], "application/x-iwork-keynote-sffkey": ["*key"], "application/x-iwork-numbers-sffnumbers": ["*numbers"], "application/x-iwork-pages-sffpages": ["*pages"], "application/x-java-archive-diff": ["jardiff"], "application/x-java-jnlp-file": ["jnlp"], "application/x-keepass2": ["kdbx"], "application/x-latex": ["latex"], "application/x-lua-bytecode": ["luac"], "application/x-lzh-compressed": ["lzh", "lha"], "application/x-makeself": ["run"], "application/x-mie": ["mie"], "application/x-mobipocket-ebook": ["prc", "mobi"], "application/x-ms-application": ["application"], "application/x-ms-shortcut": ["lnk"], "application/x-ms-wmd": ["wmd"], "application/x-ms-wmz": ["wmz"], "application/x-ms-xbap": ["xbap"], "application/x-msaccess": ["mdb"], "application/x-msbinder": ["obd"], "application/x-mscardfile": ["crd"], "application/x-msclip": ["clp"], "application/x-msdos-program": ["*exe"], "application/x-msdownload": ["*exe", "*dll", "com", "bat", "*msi"], "application/x-msmediaview": ["mvb", "m13", "m14"], "application/x-msmetafile": ["*wmf", "*wmz", "*emf", "emz"], "application/x-msmoney": ["mny"], "application/x-mspublisher": ["pub"], "application/x-msschedule": ["scd"], "application/x-msterminal": ["trm"], "application/x-mswrite": ["wri"], "application/x-netcdf": ["nc", "cdf"], "application/x-ns-proxy-autoconfig": ["pac"], "application/x-nzb": ["nzb"], "application/x-perl": ["pl", "pm"], "application/x-pilot": ["*prc", "*pdb"], "application/x-pkcs12": ["p12", "pfx"], "application/x-pkcs7-certificates": ["p7b", "spc"], "application/x-pkcs7-certreqresp": ["p7r"], "application/x-rar-compressed": ["*rar"], "application/x-redhat-package-manager": ["rpm"], "application/x-research-info-systems": ["ris"], "application/x-sea": ["sea"], "application/x-sh": ["sh"], "application/x-shar": ["shar"], "application/x-shockwave-flash": ["swf"], "application/x-silverlight-app": ["xap"], "application/x-sql": ["sql"], "application/x-stuffit": ["sit"], "application/x-stuffitx": ["sitx"], "application/x-subrip": ["srt"], "application/x-sv4cpio": ["sv4cpio"], "application/x-sv4crc": ["sv4crc"], "application/x-t3vm-image": ["t3"], "application/x-tads": ["gam"], "application/x-tar": ["tar"], "application/x-tcl": ["tcl", "tk"], "application/x-tex": ["tex"], "application/x-tex-tfm": ["tfm"], "application/x-texinfo": ["texinfo", "texi"], "application/x-tgif": ["*obj"], "application/x-ustar": ["ustar"], "application/x-virtualbox-hdd": ["hdd"], "application/x-virtualbox-ova": ["ova"], "application/x-virtualbox-ovf": ["ovf"], "application/x-virtualbox-vbox": ["vbox"], "application/x-virtualbox-vbox-extpack": ["vbox-extpack"], "application/x-virtualbox-vdi": ["vdi"], "application/x-virtualbox-vhd": ["vhd"], "application/x-virtualbox-vmdk": ["vmdk"], "application/x-wais-source": ["src"], "application/x-web-app-manifest+json": ["webapp"], "application/x-x509-ca-cert": ["der", "crt", "pem"], "application/x-xfig": ["fig"], "application/x-xliff+xml": ["*xlf"], "application/x-xpinstall": ["xpi"], "application/x-xz": ["xz"], "application/x-zmachine": ["z1", "z2", "z3", "z4", "z5", "z6", "z7", "z8"], "audio/vnd.dece.audio": ["uva", "uvva"], "audio/vnd.digital-winds": ["eol"], "audio/vnd.dra": ["dra"], "audio/vnd.dts": ["dts"], "audio/vnd.dts.hd": ["dtshd"], "audio/vnd.lucent.voice": ["lvp"], "audio/vnd.ms-playready.media.pya": ["pya"], "audio/vnd.nuera.ecelp4800": ["ecelp4800"], "audio/vnd.nuera.ecelp7470": ["ecelp7470"], "audio/vnd.nuera.ecelp9600": ["ecelp9600"], "audio/vnd.rip": ["rip"], "audio/x-aac": ["aac"], "audio/x-aiff": ["aif", "aiff", "aifc"], "audio/x-caf": ["caf"], "audio/x-flac": ["flac"], "audio/x-m4a": ["*m4a"], "audio/x-matroska": ["mka"], "audio/x-mpegurl": ["m3u"], "audio/x-ms-wax": ["wax"], "audio/x-ms-wma": ["wma"], "audio/x-pn-realaudio": ["ram", "ra"], "audio/x-pn-realaudio-plugin": ["rmp"], "audio/x-realaudio": ["*ra"], "audio/x-wav": ["*wav"], "chemical/x-cdx": ["cdx"], "chemical/x-cif": ["cif"], "chemical/x-cmdf": ["cmdf"], "chemical/x-cml": ["cml"], "chemical/x-csml": ["csml"], "chemical/x-xyz": ["xyz"], "image/prs.btif": ["btif"], "image/prs.pti": ["pti"], "image/vnd.adobe.photoshop": ["psd"], "image/vnd.airzip.accelerator.azv": ["azv"], "image/vnd.dece.graphic": ["uvi", "uvvi", "uvg", "uvvg"], "image/vnd.djvu": ["djvu", "djv"], "image/vnd.dvb.subtitle": ["*sub"], "image/vnd.dwg": ["dwg"], "image/vnd.dxf": ["dxf"], "image/vnd.fastbidsheet": ["fbs"], "image/vnd.fpx": ["fpx"], "image/vnd.fst": ["fst"], "image/vnd.fujixerox.edmics-mmr": ["mmr"], "image/vnd.fujixerox.edmics-rlc": ["rlc"], "image/vnd.microsoft.icon": ["ico"], "image/vnd.ms-dds": ["dds"], "image/vnd.ms-modi": ["mdi"], "image/vnd.ms-photo": ["wdp"], "image/vnd.net-fpx": ["npx"], "image/vnd.pco.b16": ["b16"], "image/vnd.tencent.tap": ["tap"], "image/vnd.valve.source.texture": ["vtf"], "image/vnd.wap.wbmp": ["wbmp"], "image/vnd.xiff": ["xif"], "image/vnd.zbrush.pcx": ["pcx"], "image/x-3ds": ["3ds"], "image/x-cmu-raster": ["ras"], "image/x-cmx": ["cmx"], "image/x-freehand": ["fh", "fhc", "fh4", "fh5", "fh7"], "image/x-icon": ["*ico"], "image/x-jng": ["jng"], "image/x-mrsid-image": ["sid"], "image/x-ms-bmp": ["*bmp"], "image/x-pcx": ["*pcx"], "image/x-pict": ["pic", "pct"], "image/x-portable-anymap": ["pnm"], "image/x-portable-bitmap": ["pbm"], "image/x-portable-graymap": ["pgm"], "image/x-portable-pixmap": ["ppm"], "image/x-rgb": ["rgb"], "image/x-tga": ["tga"], "image/x-xbitmap": ["xbm"], "image/x-xpixmap": ["xpm"], "image/x-xwindowdump": ["xwd"], "message/vnd.wfa.wsc": ["wsc"], "model/vnd.collada+xml": ["dae"], "model/vnd.dwf": ["dwf"], "model/vnd.gdl": ["gdl"], "model/vnd.gtw": ["gtw"], "model/vnd.mts": ["mts"], "model/vnd.opengex": ["ogex"], "model/vnd.parasolid.transmit.binary": ["x_b"], "model/vnd.parasolid.transmit.text": ["x_t"], "model/vnd.sap.vds": ["vds"], "model/vnd.usdz+zip": ["usdz"], "model/vnd.valve.source.compiled-map": ["bsp"], "model/vnd.vtu": ["vtu"], "text/prs.lines.tag": ["dsc"], "text/vnd.curl": ["curl"], "text/vnd.curl.dcurl": ["dcurl"], "text/vnd.curl.mcurl": ["mcurl"], "text/vnd.curl.scurl": ["scurl"], "text/vnd.dvb.subtitle": ["sub"], "text/vnd.fly": ["fly"], "text/vnd.fmi.flexstor": ["flx"], "text/vnd.graphviz": ["gv"], "text/vnd.in3d.3dml": ["3dml"], "text/vnd.in3d.spot": ["spot"], "text/vnd.sun.j2me.app-descriptor": ["jad"], "text/vnd.wap.wml": ["wml"], "text/vnd.wap.wmlscript": ["wmls"], "text/x-asm": ["s", "asm"], "text/x-c": ["c", "cc", "cxx", "cpp", "h", "hh", "dic"], "text/x-component": ["htc"], "text/x-fortran": ["f", "for", "f77", "f90"], "text/x-handlebars-template": ["hbs"], "text/x-java-source": ["java"], "text/x-lua": ["lua"], "text/x-markdown": ["mkd"], "text/x-nfo": ["nfo"], "text/x-opml": ["opml"], "text/x-org": ["*org"], "text/x-pascal": ["p", "pas"], "text/x-processing": ["pde"], "text/x-sass": ["sass"], "text/x-scss": ["scss"], "text/x-setext": ["etx"], "text/x-sfv": ["sfv"], "text/x-suse-ymp": ["ymp"], "text/x-uuencode": ["uu"], "text/x-vcalendar": ["vcs"], "text/x-vcard": ["vcf"], "video/vnd.dece.hd": ["uvh", "uvvh"], "video/vnd.dece.mobile": ["uvm", "uvvm"], "video/vnd.dece.pd": ["uvp", "uvvp"], "video/vnd.dece.sd": ["uvs", "uvvs"], "video/vnd.dece.video": ["uvv", "uvvv"], "video/vnd.dvb.file": ["dvb"], "video/vnd.fvt": ["fvt"], "video/vnd.mpegurl": ["mxu", "m4u"], "video/vnd.ms-playready.media.pyv": ["pyv"], "video/vnd.uvvu.mp4": ["uvu", "uvvu"], "video/vnd.vivo": ["viv"], "video/x-f4v": ["f4v"], "video/x-fli": ["fli"], "video/x-flv": ["flv"], "video/x-m4v": ["m4v"], "video/x-matroska": ["mkv", "mk3d", "mks"], "video/x-mng": ["mng"], "video/x-ms-asf": ["asf", "asx"], "video/x-ms-vob": ["vob"], "video/x-ms-wm": ["wm"], "video/x-ms-wmv": ["wmv"], "video/x-ms-wmx": ["wmx"], "video/x-ms-wvx": ["wvx"], "video/x-msvideo": ["avi"], "video/x-sgi-movie": ["movie"], "video/x-smv": ["smv"], "x-conference/x-cooltalk": ["ice"] };
});
var te = be((cI, Xi) => {
  "use strict";
  var C9 = Gi();
  Xi.exports = new C9(Ki(), Ji());
});
function hn({ onlyFirst: e = false } = {}) {
  let t = ["[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)", "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))"].join("|");
  return new RegExp(t, e ? void 0 : "g");
}
var Qi = p(() => {
});
var pI;
var er = p(() => {
  Qi();
  pI = hn();
});
var or = be((fI, Dn) => {
  var _e = {};
  typeof Dn > "u" ? window.eastasianwidth = _e : Dn.exports = _e;
  _e.eastAsianWidth = function(e) {
    var t = e.charCodeAt(0), n = e.length == 2 ? e.charCodeAt(1) : 0, o = t;
    return 55296 <= t && t <= 56319 && 56320 <= n && n <= 57343 && (t &= 1023, n &= 1023, o = t << 10 | n, o += 65536), o == 12288 || 65281 <= o && o <= 65376 || 65504 <= o && o <= 65510 ? "F" : o == 8361 || 65377 <= o && o <= 65470 || 65474 <= o && o <= 65479 || 65482 <= o && o <= 65487 || 65490 <= o && o <= 65495 || 65498 <= o && o <= 65500 || 65512 <= o && o <= 65518 ? "H" : 4352 <= o && o <= 4447 || 4515 <= o && o <= 4519 || 4602 <= o && o <= 4607 || 9001 <= o && o <= 9002 || 11904 <= o && o <= 11929 || 11931 <= o && o <= 12019 || 12032 <= o && o <= 12245 || 12272 <= o && o <= 12283 || 12289 <= o && o <= 12350 || 12353 <= o && o <= 12438 || 12441 <= o && o <= 12543 || 12549 <= o && o <= 12589 || 12593 <= o && o <= 12686 || 12688 <= o && o <= 12730 || 12736 <= o && o <= 12771 || 12784 <= o && o <= 12830 || 12832 <= o && o <= 12871 || 12880 <= o && o <= 13054 || 13056 <= o && o <= 19903 || 19968 <= o && o <= 42124 || 42128 <= o && o <= 42182 || 43360 <= o && o <= 43388 || 44032 <= o && o <= 55203 || 55216 <= o && o <= 55238 || 55243 <= o && o <= 55291 || 63744 <= o && o <= 64255 || 65040 <= o && o <= 65049 || 65072 <= o && o <= 65106 || 65108 <= o && o <= 65126 || 65128 <= o && o <= 65131 || 110592 <= o && o <= 110593 || 127488 <= o && o <= 127490 || 127504 <= o && o <= 127546 || 127552 <= o && o <= 127560 || 127568 <= o && o <= 127569 || 131072 <= o && o <= 194367 || 177984 <= o && o <= 196605 || 196608 <= o && o <= 262141 ? "W" : 32 <= o && o <= 126 || 162 <= o && o <= 163 || 165 <= o && o <= 166 || o == 172 || o == 175 || 10214 <= o && o <= 10221 || 10629 <= o && o <= 10630 ? "Na" : o == 161 || o == 164 || 167 <= o && o <= 168 || o == 170 || 173 <= o && o <= 174 || 176 <= o && o <= 180 || 182 <= o && o <= 186 || 188 <= o && o <= 191 || o == 198 || o == 208 || 215 <= o && o <= 216 || 222 <= o && o <= 225 || o == 230 || 232 <= o && o <= 234 || 236 <= o && o <= 237 || o == 240 || 242 <= o && o <= 243 || 247 <= o && o <= 250 || o == 252 || o == 254 || o == 257 || o == 273 || o == 275 || o == 283 || 294 <= o && o <= 295 || o == 299 || 305 <= o && o <= 307 || o == 312 || 319 <= o && o <= 322 || o == 324 || 328 <= o && o <= 331 || o == 333 || 338 <= o && o <= 339 || 358 <= o && o <= 359 || o == 363 || o == 462 || o == 464 || o == 466 || o == 468 || o == 470 || o == 472 || o == 474 || o == 476 || o == 593 || o == 609 || o == 708 || o == 711 || 713 <= o && o <= 715 || o == 717 || o == 720 || 728 <= o && o <= 731 || o == 733 || o == 735 || 768 <= o && o <= 879 || 913 <= o && o <= 929 || 931 <= o && o <= 937 || 945 <= o && o <= 961 || 963 <= o && o <= 969 || o == 1025 || 1040 <= o && o <= 1103 || o == 1105 || o == 8208 || 8211 <= o && o <= 8214 || 8216 <= o && o <= 8217 || 8220 <= o && o <= 8221 || 8224 <= o && o <= 8226 || 8228 <= o && o <= 8231 || o == 8240 || 8242 <= o && o <= 8243 || o == 8245 || o == 8251 || o == 8254 || o == 8308 || o == 8319 || 8321 <= o && o <= 8324 || o == 8364 || o == 8451 || o == 8453 || o == 8457 || o == 8467 || o == 8470 || 8481 <= o && o <= 8482 || o == 8486 || o == 8491 || 8531 <= o && o <= 8532 || 8539 <= o && o <= 8542 || 8544 <= o && o <= 8555 || 8560 <= o && o <= 8569 || o == 8585 || 8592 <= o && o <= 8601 || 8632 <= o && o <= 8633 || o == 8658 || o == 8660 || o == 8679 || o == 8704 || 8706 <= o && o <= 8707 || 8711 <= o && o <= 8712 || o == 8715 || o == 8719 || o == 8721 || o == 8725 || o == 8730 || 8733 <= o && o <= 8736 || o == 8739 || o == 8741 || 8743 <= o && o <= 8748 || o == 8750 || 8756 <= o && o <= 8759 || 8764 <= o && o <= 8765 || o == 8776 || o == 8780 || o == 8786 || 8800 <= o && o <= 8801 || 8804 <= o && o <= 8807 || 8810 <= o && o <= 8811 || 8814 <= o && o <= 8815 || 8834 <= o && o <= 8835 || 8838 <= o && o <= 8839 || o == 8853 || o == 8857 || o == 8869 || o == 8895 || o == 8978 || 9312 <= o && o <= 9449 || 9451 <= o && o <= 9547 || 9552 <= o && o <= 9587 || 9600 <= o && o <= 9615 || 9618 <= o && o <= 9621 || 9632 <= o && o <= 9633 || 9635 <= o && o <= 9641 || 9650 <= o && o <= 9651 || 9654 <= o && o <= 9655 || 9660 <= o && o <= 9661 || 9664 <= o && o <= 9665 || 9670 <= o && o <= 9672 || o == 9675 || 9678 <= o && o <= 9681 || 9698 <= o && o <= 9701 || o == 9711 || 9733 <= o && o <= 9734 || o == 9737 || 9742 <= o && o <= 9743 || 9748 <= o && o <= 9749 || o == 9756 || o == 9758 || o == 9792 || o == 9794 || 9824 <= o && o <= 9825 || 9827 <= o && o <= 9829 || 9831 <= o && o <= 9834 || 9836 <= o && o <= 9837 || o == 9839 || 9886 <= o && o <= 9887 || 9918 <= o && o <= 9919 || 9924 <= o && o <= 9933 || 9935 <= o && o <= 9953 || o == 9955 || 9960 <= o && o <= 9983 || o == 10045 || o == 10071 || 10102 <= o && o <= 10111 || 11093 <= o && o <= 11097 || 12872 <= o && o <= 12879 || 57344 <= o && o <= 63743 || 65024 <= o && o <= 65039 || o == 65533 || 127232 <= o && o <= 127242 || 127248 <= o && o <= 127277 || 127280 <= o && o <= 127337 || 127344 <= o && o <= 127386 || 917760 <= o && o <= 917999 || 983040 <= o && o <= 1048573 || 1048576 <= o && o <= 1114109 ? "A" : "N";
  };
  _e.characterLength = function(e) {
    var t = this.eastAsianWidth(e);
    return t == "F" || t == "W" || t == "A" ? 2 : 1;
  };
  function tr(e) {
    return e.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]/g) || [];
  }
  _e.length = function(e) {
    for (var t = tr(e), n = 0, o = 0; o < t.length; o++)
      n = n + this.characterLength(t[o]);
    return n;
  };
  _e.slice = function(e, t, n) {
    textLen = _e.length(e), t = t || 0, n = n || 1, t < 0 && (t = textLen + t), n < 0 && (n = textLen + n);
    for (var o = "", a = 0, s = tr(e), i = 0; i < s.length; i++) {
      var r = s[i], l = _e.length(r);
      if (a >= t - (l == 2 ? 1 : 0))
        if (a + l <= n)
          o += r;
        else
          break;
      a += l;
    }
    return o;
  };
});
var ar = be((gI, nr) => {
  "use strict";
  nr.exports = function() {
    return /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67)\uDB40\uDC7F|(?:\uD83E\uDDD1\uD83C\uDFFF\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFC-\uDFFF])|\uD83D\uDC68(?:\uD83C\uDFFB(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|[\u2695\u2696\u2708]\uFE0F|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))?|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])\uFE0F|\u200D(?:(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D[\uDC66\uDC67])|\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC)?|(?:\uD83D\uDC69(?:\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69]))|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC69(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83E\uDDD1(?:\u200D(?:\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDE36\u200D\uD83C\uDF2B|\uD83C\uDFF3\uFE0F\u200D\u26A7|\uD83D\uDC3B\u200D\u2744|(?:(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\uD83C\uDFF4\u200D\u2620|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])\u200D[\u2640\u2642]|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u2600-\u2604\u260E\u2611\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26B0\u26B1\u26C8\u26CF\u26D1\u26D3\u26E9\u26F0\u26F1\u26F4\u26F7\u26F8\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u3030\u303D\u3297\u3299]|\uD83C[\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]|\uD83D[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3])\uFE0F|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDE35\u200D\uD83D\uDCAB|\uD83D\uDE2E\u200D\uD83D\uDCA8|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83E\uDDD1(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83D\uDC69(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF6\uD83C\uDDE6|\uD83C\uDDF4\uD83C\uDDF2|\uD83D\uDC08\u200D\u2B1B|\u2764\uFE0F\u200D(?:\uD83D\uDD25|\uD83E\uDE79)|\uD83D\uDC41\uFE0F|\uD83C\uDFF3\uFE0F|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|[#\*0-9]\uFE0F\u20E3|\u2764\uFE0F|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|\uD83C\uDFF4|(?:[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270C\u270D]|\uD83D[\uDD74\uDD90])(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC08\uDC15\uDC3B\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE2E\uDE35\uDE36\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5]|\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD]|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF]|[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0D\uDD0E\uDD10-\uDD17\uDD1D\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78\uDD7A-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCB\uDDD0\uDDE0-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6]|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26A7\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5-\uDED7\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])\uFE0F|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDC8F\uDC91\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1F\uDD26\uDD30-\uDD39\uDD3C-\uDD3E\uDD77\uDDB5\uDDB6\uDDB8\uDDB9\uDDBB\uDDCD-\uDDCF\uDDD1-\uDDDD])/g;
  };
});
var x9;
var S9;
var oe = p(() => {
  er();
  x9 = A(or(), 1), S9 = A(ar(), 1);
});
function E9(e) {
  return e.replace(/\r\n|\r(?!\n)|\n/g, `
`);
}
function F9(e) {
  let t = Object.entries(w).find((n) => n[1].title === e);
  if (t)
    return { name: t[0], data: t[1] };
}
function T9(e, t) {
  if (!t || t.line === void 0 || t.column === void 0)
    return "";
  let n = E9(e).split(`
`).map((i) => i.replace(/\t/g, "  ")), o = [];
  for (let i = -2; i <= 2; i++)
    n[t.line + i] && o.push(t.line + i);
  let a = 0;
  for (let i of o) {
    let r = `> ${i}`;
    r.length > a && (a = r.length);
  }
  let s = "";
  for (let i of o) {
    let r = i === t.line - 1;
    s += r ? "> " : "  ", s += `${i + 1} | ${n[i]}
`, r && (s += `${Array.from({ length: a }).join(" ")}  | ${Array.from({ length: t.column }).join(" ")}^
`);
  }
  return s;
}
function P9(e) {
  return !(e.length !== 3 || !e[0] || typeof e[0] != "object");
}
function jr(e, t, n) {
  var o;
  let a = ((o = t?.split("/").pop()) == null ? void 0 : o.replace(".astro", "")) ?? "", s = (...i) => {
    if (!P9(i))
      throw new T({ ...w.InvalidComponentArgs, message: w.InvalidComponentArgs.message(a) });
    return e(...i);
  };
  return Object.defineProperty(s, "name", { value: a, writable: false }), s.isAstroComponentFactory = true, s.moduleId = t, s.propagation = n, s;
}
function j9(e) {
  return jr(e.factory, e.moduleId, e.propagation);
}
function we(e, t, n) {
  return typeof e == "function" ? jr(e, t, n) : j9(e);
}
function A9() {
  return (t) => {
    if (typeof t == "string")
      throw new T({ ...w.AstroGlobUsedOutside, message: w.AstroGlobUsedOutside.message(JSON.stringify(t)) });
    let n = [...Object.values(t)];
    if (n.length === 0)
      throw new T({ ...w.AstroGlobNoMatch, message: w.AstroGlobNoMatch.message(JSON.stringify(t)) });
    return Promise.all(n.map((o) => o()));
  };
}
function ke(e) {
  return { site: e ? new URL(e) : void 0, generator: `Astro v${Ar}`, glob: A9() };
}
function B9(e, t) {
  if (e[t])
    return e[t];
  if (t === "delete" && e.del)
    return e.del;
  if (e.all)
    return e.all;
}
async function sr(e, t, n) {
  var o;
  let { request: a, params: s } = t, i = (o = a.method) == null ? void 0 : o.toLowerCase(), r = B9(e, i);
  if (!n && n === false && i && i !== "get" && console.warn(`
${i} requests are not available when building a static site. Update your config to \`output: 'server'\` or \`output: 'hybrid'\` with an \`export const prerender = false\` to handle ${i} requests.`), !r || typeof r != "function")
    return new Response(null, { status: 404, headers: { "X-Astro-Response": "Not-Found" } });
  r.length > 1 && console.warn(`
API routes with 2 arguments have been deprecated. Instead they take a single argument in the form of:

export function get({ params, request }) {
	//...
}

Update your code to remove this warning.`);
  let l = new Proxy(t, { get(u, c) {
    return c in u ? Reflect.get(u, c) : c in s ? (console.warn(`
API routes no longer pass params as the first argument. Instead an object containing a params property is provided in the form of:

export function get({ params }) {
	// ...
}

Update your code to remove this warning.`), Reflect.get(s, c)) : void 0;
  } });
  return r.call(e, l, a);
}
function Br(e) {
  let t = {};
  return n(e), Object.keys(t).join(" ");
  function n(o) {
    o && typeof o.forEach == "function" ? o.forEach(n) : o === Object(o) ? Object.keys(o).forEach((a) => {
      o[a] && n(a);
    }) : (o = o === false || o == null ? "" : String(o).trim(), o && o.split(/\s+/).forEach((a) => {
      t[a] = true;
    }));
  }
}
function On(e) {
  return !!e && typeof e == "object" && typeof e.then == "function";
}
async function* ir(e) {
  let t = e.getReader();
  try {
    for (; ; ) {
      let { done: n, value: o } = await t.read();
      if (n)
        return;
      yield o;
    }
  } finally {
    t.releaseLock();
  }
}
function go(e) {
  return Object.prototype.toString.call(e) === "[object HTMLString]";
}
function z9(e) {
  return e._metadata.hasHydrationScript ? false : e._metadata.hasHydrationScript = true;
}
function _9(e, t) {
  return e._metadata.hasDirectives.has(t) ? false : (e._metadata.hasDirectives.add(t), true);
}
function rr(e, t) {
  let o = e.clientDirectives.get(t);
  if (!o)
    throw new Error(`Unknown directive: ${t}`);
  return o;
}
function L9(e, t, n) {
  switch (t) {
    case "both":
      return `${M9}<script>${rr(e, n)};${R9}<\/script>`;
    case "directive":
      return `<script>${rr(e, n)}<\/script>`;
  }
  return "";
}
function V9(e) {
  var t;
  let n = "";
  for (let [o, a] of Object.entries(e))
    n += `const ${U9(o)} = ${(t = JSON.stringify(a)) == null ? void 0 : t.replace(/<\/script>/g, "\\x3C/script>")};
`;
  return B(n);
}
function cr(e) {
  return e.length === 1 ? e[0] : `${e.slice(0, -1).join(", ")} or ${e[e.length - 1]}`;
}
function Oe(e, t, n = true) {
  if (e == null)
    return "";
  if (e === false)
    return I9.test(t) || $9.test(t) ? B(` ${t}="false"`) : "";
  if (O9.has(t))
    return console.warn(`[astro] The "${t}" directive cannot be applied dynamically at runtime. It will not be rendered as an attribute.

Make sure to use the static attribute syntax (\`${t}={value}\`) instead of the dynamic spread syntax (\`{...{ "${t}": value }}\`).`), "";
  if (t === "class:list") {
    let o = Qe(Br(e), n);
    return o === "" ? "" : B(` ${t.slice(0, -5)}="${o}"`);
  }
  if (t === "style" && !(e instanceof qe)) {
    if (Array.isArray(e) && e.length === 2)
      return B(` ${t}="${Qe(`${lr(e[0])};${e[1]}`, n)}"`);
    if (typeof e == "object")
      return B(` ${t}="${Qe(lr(e), n)}"`);
  }
  return t === "className" ? B(` class="${Qe(e, n)}"`) : e === true && (t.startsWith("data-") || N9.test(t)) ? B(` ${t}`) : B(` ${t}="${Qe(e, n)}"`);
}
function En(e, t = true) {
  let n = "";
  for (let [o, a] of Object.entries(e))
    n += Oe(a, o, t);
  return B(n);
}
function bt(e, { props: t, children: n = "" }, o = true) {
  let { lang: a, "data-astro-id": s, "define:vars": i, ...r } = t;
  return i && (e === "style" && (delete r["is:global"], delete r["is:scoped"]), e === "script" && (delete r.hoist, n = V9(i) + `
` + n)), (n == null || n == "") && Un.test(e) ? `<${e}${En(r, o)} />` : `<${e}${En(r, o)}>${n}</${e}>`;
}
function W9(e) {
  so.length === 0 && setTimeout(() => {
    so.forEach((t) => t.forEach((n) => !n.isStarted() && n.buffer())), so.length = 0;
  }), so.push(e);
}
function Rr(e) {
  let t = e.map((n) => new Fn(n));
  return W9(t), t;
}
function ur(e) {
  e._metadata.hasRenderedHead = true;
  let t = Array.from(e.styles).filter(yn).map((s) => s.props.rel === "stylesheet" ? bt("link", s) : bt("style", s));
  e.styles.clear();
  let n = Array.from(e.scripts).filter(yn).map((s) => bt("script", s, false)), a = Array.from(e.links).filter(yn).map((s) => bt("link", s, false)).join(`
`) + t.join(`
`) + n.join(`
`);
  if (e._metadata.extraHead.length > 0)
    for (let s of e._metadata.extraHead)
      a += s;
  return B(a);
}
function* Mr() {
  yield { type: "head" };
}
function* Ce() {
  yield { type: "maybe-head" };
}
function ho(e) {
  return typeof e == "object" && !!e[q9];
}
function _r(e) {
  return typeof e == "object" && !!e[zr];
}
async function* Do(e) {
  for await (let t of e)
    if (t || t === 0)
      for await (let n of it(t))
        switch (n.type) {
          case "directive": {
            yield n;
            break;
          }
          default: {
            yield B(n);
            break;
          }
        }
}
function J(e, ...t) {
  return new Pn(e, t);
}
function Lr(e) {
  return e == null ? false : e.isAstroComponentFactory === true;
}
async function H9(e, t, n, o) {
  let a = await t(e, n, o);
  if (a instanceof Response)
    throw a;
  let s = new lt(), i = ho(a) ? a.content : a;
  for await (let r of Do(i))
    s.append(r, e);
  return s.toString();
}
function G9(e, t) {
  let n = t.propagation || "none";
  return t.moduleId && e.componentMetadata.has(t.moduleId) && n === "none" && (n = e.componentMetadata.get(t.moduleId).propagation), n === "in-tree" || n === "self";
}
function Y9(e, t) {
  if (e != null)
    for (let n of Object.keys(e))
      n.startsWith("client:") && console.warn(`You are attempting to render <${t} ${n} />, but ${t} is an Astro component. Astro components do not render in the client and should not have a hydration directive. Please use a framework component for client rendering.`);
}
function K9(e, t, n, o, a = {}) {
  Y9(o, t);
  let s = new jn(e, o, a, n);
  return G9(e, n) && !e._metadata.propagators.has(n) && e._metadata.propagators.set(n, s), s;
}
function Vn(e) {
  return typeof e == "object" && !!e[Ir];
}
async function* it(e) {
  if (e = await e, e instanceof io)
    e.instructions && (yield* e.instructions), yield e;
  else if (go(e))
    yield e;
  else if (Array.isArray(e)) {
    let t = Rr(e.map((n) => it(n)));
    for (let n of t)
      yield B(await n);
  } else
    typeof e == "function" ? yield* it(e()) : typeof e == "string" ? yield B(wt(e)) : !e && e !== 0 || (_r(e) ? yield* Do(e) : Vn(e) ? yield* e.render() : ArrayBuffer.isView(e) ? yield e : typeof e == "object" && (Symbol.asyncIterator in e || Symbol.iterator in e) ? yield* e : yield e);
}
function Z9(e) {
  return !!e[$r];
}
async function* vo(e, t, n) {
  t && (yield* it(typeof t == "function" ? t(e) : t)), n && !t && (yield* vo(e, n));
}
async function rt(e, t, n) {
  let o = "", a = null, s = vo(e, t, n);
  for await (let i of s)
    typeof i.type == "string" ? (a === null && (a = []), a.push(i)) : o += i;
  return B(new io(o, a));
}
async function Or(e, t = {}) {
  let n = null, o = {};
  return t && await Promise.all(Object.entries(t).map(([a, s]) => rt(e, s).then((i) => {
    i.instructions && (n === null && (n = []), n.push(...i.instructions)), o[a] = i;
  }))), { slotInstructions: n, children: o };
}
function zt(e, t) {
  if (typeof t.type == "string") {
    let n = t;
    switch (n.type) {
      case "directive": {
        let { hydration: o } = n, a = o && z9(e), s = o && _9(e, o.directive), i = a ? "both" : s ? "directive" : null;
        if (i) {
          let r = L9(e, i, o.directive);
          return B(r);
        } else
          return "";
      }
      case "head":
        return e._metadata.hasRenderedHead ? "" : ur(e);
      case "maybe-head":
        return e._metadata.hasRenderedHead || e._metadata.headInTree ? "" : ur(e);
      default: {
        if (t instanceof Response)
          return "";
        throw new Error(`Unknown chunk type: ${t.type}`);
      }
    }
  } else {
    if (Z9(t)) {
      let n = "", o = t;
      if (o.instructions)
        for (let a of o.instructions)
          n += zt(e, a);
      return n += t.toString(), n;
    }
    return t.toString();
  }
}
function X9(e, t) {
  if (t instanceof Uint8Array)
    return t;
  let n = zt(e, t);
  return Wn.encode(n.toString());
}
async function $e(e, t) {
  switch (true) {
    case t instanceof qe:
      return t.toString().trim() === "" ? "" : t;
    case typeof t == "string":
      return B(wt(t));
    case typeof t == "function":
      return t;
    case (!t && t !== 0):
      return "";
    case Array.isArray(t):
      return B((await Promise.all(t.map((o) => $e(e, o)))).join(""));
  }
  let n;
  return t.props ? t.props[Ie.symbol] ? n = t.props[Ie.symbol] : n = new Ie(t) : n = new Ie(t), Bn(e, t, n);
}
async function Bn(e, t, n) {
  if (Ct(t)) {
    switch (true) {
      case !t.type:
        throw new Error(`Unable to render ${e.pathname} because it contains an undefined Component!
Did you forget to import the component or is it possible there is a typo?`);
      case t.type === Symbol.for("astro:fragment"):
        return $e(e, t.props.children);
      case t.type.isAstroComponentFactory: {
        let o = {}, a = {};
        for (let [i, r] of Object.entries(t.props ?? {}))
          i === "children" || r && typeof r == "object" && r.$$slot ? a[i === "children" ? "default" : i] = () => $e(e, r) : o[i] = r;
        return B(await H9(e, t.type, o, a));
      }
      case (!t.type && t.type !== 0):
        return "";
      case (typeof t.type == "string" && t.type !== pr):
        return B(await Q9(e, t.type, t.props ?? {}));
    }
    if (t.type) {
      let o = function(c) {
        if (Array.isArray(c))
          return c.map((d) => o(d));
        if (!Ct(c)) {
          i.default.push(c);
          return;
        }
        if ("slot" in c.props) {
          i[c.props.slot] = [...i[c.props.slot] ?? [], c], delete c.props.slot;
          return;
        }
        i.default.push(c);
      };
      if (typeof t.type == "function" && t.type["astro:renderer"] && n.increment(), typeof t.type == "function" && t.props["server:root"]) {
        let c = await t.type(t.props ?? {});
        return await $e(e, c);
      }
      if (typeof t.type == "function")
        if (n.haveNoTried() || n.isCompleted()) {
          tB();
          try {
            let c = await t.type(t.props ?? {}), d;
            if (c?.[yo])
              return d = await Bn(e, c, n), d;
            if (!c)
              return d = await Bn(e, c, n), d;
          } catch (c) {
            if (n.isCompleted())
              throw c;
            n.increment();
          } finally {
            oB();
          }
        } else
          n.increment();
      let { children: a = null, ...s } = t.props ?? {}, i = { default: [] };
      o(a);
      for (let [c, d] of Object.entries(s))
        d.$$slot && (i[c] = d, delete s[c]);
      let r = [], l = {};
      for (let [c, d] of Object.entries(i))
        r.push($e(e, d).then((g) => {
          g.toString().trim().length !== 0 && (l[c] = () => g);
        }));
      await Promise.all(r), s[Ie.symbol] = n;
      let u;
      if (t.type === pr && t.props["client:only"] ? u = await fr(e, t.props["client:display-name"] ?? "", null, s, l) : u = await fr(e, typeof t.type == "function" ? t.type.name : t.type, t.type, s, l), typeof u != "string" && Symbol.asyncIterator in u) {
        let c = new lt();
        for await (let d of u)
          c.append(d, e);
        return B(c.toString());
      } else
        return B(u);
    }
  }
  return B(`${t}`);
}
async function Q9(e, t, { children: n, ...o }) {
  return B(`<${t}${de(o)}${B((n == null || n == "") && Un.test(t) ? "/>" : `>${n == null ? "" : await $e(e, eB(t, n))}</${t}>`)}`);
}
function eB(e, t) {
  return typeof t == "string" && (e === "style" || e === "script") ? B(t) : t;
}
function tB() {
  if (qn++, !An) {
    An = console.error;
    try {
      console.error = nB;
    } catch {
    }
  }
}
function oB() {
  qn--;
}
function nB(e, ...t) {
  qn > 0 && typeof e == "string" && e.includes("Warning: Invalid hook call.") && e.includes("https://reactjs.org/link/invalid-hook-call") || An(e, ...t);
}
function bn(e, t = {}, n = /* @__PURE__ */ new WeakSet()) {
  if (n.has(e))
    throw new Error(`Cyclic reference detected while serializing props for <${t.displayName} client:${t.hydrate}>!

Cyclic references cannot be safely serialized for client-side usage. Please remove the cyclic reference.`);
  n.add(e);
  let o = e.map((a) => Vr(a, t, n));
  return n.delete(e), o;
}
function Ur(e, t = {}, n = /* @__PURE__ */ new WeakSet()) {
  if (n.has(e))
    throw new Error(`Cyclic reference detected while serializing props for <${t.displayName} client:${t.hydrate}>!

Cyclic references cannot be safely serialized for client-side usage. Please remove the cyclic reference.`);
  n.add(e);
  let o = Object.fromEntries(Object.entries(e).map(([a, s]) => [a, Vr(s, t, n)]));
  return n.delete(e), o;
}
function Vr(e, t = {}, n = /* @__PURE__ */ new WeakSet()) {
  switch (Object.prototype.toString.call(e)) {
    case "[object Date]":
      return [le.Date, e.toISOString()];
    case "[object RegExp]":
      return [le.RegExp, e.source];
    case "[object Map]":
      return [le.Map, JSON.stringify(bn(Array.from(e), t, n))];
    case "[object Set]":
      return [le.Set, JSON.stringify(bn(Array.from(e), t, n))];
    case "[object BigInt]":
      return [le.BigInt, e.toString()];
    case "[object URL]":
      return [le.URL, e.toString()];
    case "[object Array]":
      return [le.JSON, JSON.stringify(bn(e, t, n))];
    case "[object Uint8Array]":
      return [le.Uint8Array, JSON.stringify(Array.from(e))];
    case "[object Uint16Array]":
      return [le.Uint16Array, JSON.stringify(Array.from(e))];
    case "[object Uint32Array]":
      return [le.Uint32Array, JSON.stringify(Array.from(e))];
    default:
      return e !== null && typeof e == "object" ? [le.Value, Ur(e, t, n)] : e === void 0 ? [le.Value] : [le.Value, e];
  }
}
function Wr(e, t) {
  return JSON.stringify(Ur(e, t));
}
function aB(e, t) {
  let n = { isPage: false, hydration: null, props: {} };
  for (let [o, a] of Object.entries(e))
    if (o.startsWith("server:") && o === "server:root" && (n.isPage = true), o.startsWith("client:"))
      switch (n.hydration || (n.hydration = { directive: "", value: "", componentUrl: "", componentExport: { value: "" } }), o) {
        case "client:component-path": {
          n.hydration.componentUrl = a;
          break;
        }
        case "client:component-export": {
          n.hydration.componentExport.value = a;
          break;
        }
        case "client:component-hydration":
          break;
        case "client:display-name":
          break;
        default: {
          if (n.hydration.directive = o.split(":")[1], n.hydration.value = a, !t.has(n.hydration.directive)) {
            let s = Array.from(t.keys()).map((i) => `client:${i}`).join(", ");
            throw new Error(`Error: invalid hydration directive "${o}". Supported hydration methods: ${s}`);
          }
          if (n.hydration.directive === "media" && typeof n.hydration.value != "string")
            throw new T(w.MissingMediaQueryDirective);
          break;
        }
      }
    else
      o === "class:list" ? a && (n.props[o.slice(0, -5)] = Br(a)) : n.props[o] = a;
  for (let o of Object.getOwnPropertySymbols(e))
    n.props[o] = e[o];
  return n;
}
async function sB(e, t) {
  let { renderer: n, result: o, astroId: a, props: s, attrs: i } = e, { hydrate: r, componentUrl: l, componentExport: u } = t;
  if (!u.value)
    throw new Error(`Unable to resolve a valid export for "${t.displayName}"! Please open an issue at https://astro.build/issues!`);
  let c = { children: "", props: { uid: a } };
  if (i)
    for (let [g, k] of Object.entries(i))
      c.props[g] = wt(k);
  c.props["component-url"] = await o.resolve(decodeURI(l)), n.clientEntrypoint && (c.props["component-export"] = u.value, c.props["renderer-url"] = await o.resolve(decodeURI(n.clientEntrypoint)), c.props.props = wt(Wr(s, t))), c.props.ssr = "", c.props.client = r;
  let d = await o.resolve("astro:scripts/before-hydration.js");
  return d.length && (c.props["before-hydration-url"] = d), c.props.opts = wt(JSON.stringify({ name: t.displayName, value: t.hydrateArgs || "" })), c;
}
function iB(e) {
  let t = 0;
  if (e.length === 0)
    return t;
  for (let n = 0; n < e.length; n++) {
    let o = e.charCodeAt(n);
    t = (t << 5) - t + o, t = t & t;
  }
  return t;
}
function rB(e) {
  let t, n = "", o = iB(e), a = o < 0 ? "Z" : "";
  for (o = Math.abs(o); o >= wn; )
    t = o % wn, o = Math.floor(o / wn), n = Rn[t] + n;
  return o > 0 && (n = Rn[o] + n), a + n;
}
function lB(e) {
  return typeof HTMLElement < "u" && HTMLElement.isPrototypeOf(e);
}
async function cB(e, t, n, o) {
  let a = uB(t), s = "";
  for (let i in n)
    s += ` ${i}="${Qe(await n[i])}"`;
  return B(`<${a}${s}>${await rt(e, o?.default)}</${a}>`);
}
function uB(e) {
  let t = customElements.getName(e);
  return t || e.name.replace(/^HTML|Element$/g, "").replace(/[A-Z]/g, "-$&").toLowerCase().replace(/^-/, "html-");
}
function dB(e) {
  switch (e?.split(".").pop()) {
    case "svelte":
      return ["@astrojs/svelte"];
    case "vue":
      return ["@astrojs/vue"];
    case "jsx":
    case "tsx":
      return ["@astrojs/react", "@astrojs/preact", "@astrojs/solid-js", "@astrojs/vue (jsx)"];
    default:
      return ["@astrojs/react", "@astrojs/preact", "@astrojs/solid-js", "@astrojs/vue", "@astrojs/svelte", "@astrojs/lit"];
  }
}
function pB(e) {
  return e === ue;
}
function mB(e) {
  return e && e["astro:html"] === true;
}
function hB(e, t) {
  let n = t ? gB : fB;
  return e.replace(n, "");
}
async function DB(e, t, n, o, a = {}) {
  var s, i, r;
  if (!n && !o["client:only"])
    throw new Error(`Unable to render ${t} because it is ${n}!
Did you forget to import the component or is it possible there is a typo?`);
  let { renderers: l, clientDirectives: u } = e, c = { astroStaticSlot: true, displayName: t }, { hydration: d, isPage: g, props: k } = aB(o, u), D = "", v;
  d && (c.hydrate = d.directive, c.hydrateArgs = d.value, c.componentExport = d.componentExport, c.componentUrl = d.componentUrl);
  let C = dB(c.componentUrl), E = l.filter((F) => F.name !== "astro:jsx"), { children: P, slotInstructions: j } = await Or(e, a), x;
  if (c.hydrate !== "only") {
    let F = false;
    try {
      F = n && n[ro];
    } catch {
    }
    if (F) {
      let O = n[ro];
      x = l.find(({ name: I }) => I === O);
    }
    if (!x) {
      let O;
      for (let I of l)
        try {
          if (await I.ssr.check.call({ result: e }, n, k, P)) {
            x = I;
            break;
          }
        } catch (W) {
          O ?? (O = W);
        }
      if (!x && O)
        throw O;
    }
    if (!x && typeof HTMLElement == "function" && lB(n))
      return cB(e, n, o, a);
  } else {
    if (c.hydrateArgs) {
      let F = c.hydrateArgs, O = mr.has(F) ? mr.get(F) : F;
      x = l.find(({ name: I }) => I === `@astrojs/${O}` || I === O);
    }
    if (!x && E.length === 1 && (x = E[0]), !x) {
      let F = (s = c.componentUrl) == null ? void 0 : s.split(".").pop();
      x = l.filter(({ name: O }) => O === `@astrojs/${F}` || O === F)[0];
    }
  }
  if (x)
    c.hydrate === "only" ? D = await rt(e, a?.fallback) : { html: D, attrs: v } = await x.ssr.renderToStaticMarkup.call({ result: e }, n, k, P, c);
  else {
    if (c.hydrate === "only")
      throw new T({ ...w.NoClientOnlyHint, message: w.NoClientOnlyHint.message(c.displayName), hint: w.NoClientOnlyHint.hint(C.map((F) => F.replace("@astrojs/", "")).join("|")) });
    if (typeof n != "string") {
      let F = E.filter((I) => C.includes(I.name)), O = E.length > 1;
      if (F.length === 0)
        throw new T({ ...w.NoMatchingRenderer, message: w.NoMatchingRenderer.message(c.displayName, (i = c?.componentUrl) == null ? void 0 : i.split(".").pop(), O, E.length), hint: w.NoMatchingRenderer.hint(cr(C.map((I) => "`" + I + "`"))) });
      if (F.length === 1)
        x = F[0], { html: D, attrs: v } = await x.ssr.renderToStaticMarkup.call({ result: e }, n, k, P, c);
      else
        throw new Error(`Unable to render ${c.displayName}!

This component likely uses ${cr(C)},
but Astro encountered an error during server-side rendering.

Please ensure that ${c.displayName}:
1. Does not unconditionally access browser-specific globals like \`window\` or \`document\`.
   If this is unavoidable, use the \`client:only\` hydration directive.
2. Does not conditionally return \`null\` or \`undefined\` when rendered on the server.

If you're still stuck, please open an issue on GitHub or join us at https://astro.build/chat.`);
    }
  }
  if (x && !x.clientEntrypoint && x.name !== "@astrojs/lit" && c.hydrate)
    throw new T({ ...w.NoClientEntrypoint, message: w.NoClientEntrypoint.message(t, c.hydrate, x.name) });
  if (!D && typeof n == "string") {
    let F = vB(n), O = Object.values(P).join(""), I = Do(await J`<${F}${En(k)}${B(O === "" && Un.test(F) ? "/>" : `>${O}</${F}>`)}`);
    D = "";
    for await (let W of I)
      D += W;
  }
  if (!d)
    return async function* () {
      var F;
      j && (yield* j), g || x?.name === "astro:jsx" ? yield D : D && D.length > 0 ? yield B(hB(D, ((F = x?.ssr) == null ? void 0 : F.supportsAstroStaticSlot) ?? false)) : yield "";
    }();
  let H = rB(`<!--${c.componentExport.value}:${c.componentUrl}-->
${D}
${Wr(k, c)}`), b = await sB({ renderer: x, result: e, astroId: H, props: k, attrs: v }, c), M = [];
  if (D) {
    if (Object.keys(P).length > 0)
      for (let F of Object.keys(P)) {
        let O = (r = x?.ssr) != null && r.supportsAstroStaticSlot ? c.hydrate ? "astro-slot" : "astro-static-slot" : "astro-slot", I = F === "default" ? `<${O}>` : `<${O} name="${F}">`;
        D.includes(I) || M.push(F);
      }
  } else
    M = Object.keys(P);
  let K = M.length > 0 ? M.map((F) => `<template data-astro-template${F !== "default" ? `="${F}"` : ""}>${P[F]}</template>`).join("") : "";
  b.children = `${D ?? ""}${K}`, b.children && (b.props["await-children"] = "");
  async function* Pe() {
    j && (yield* j), yield { type: "directive", hydration: d, result: e }, yield B(bt("astro-island", b, false));
  }
  return Pe();
}
function vB(e) {
  let t = /[&<>'"\s]+/g;
  return t.test(e) ? e.trim().split(t)[0].trim() : e;
}
async function yB(e, t = {}) {
  let n = await rt(e, t?.default);
  return n == null ? n : B(n);
}
async function bB(e, t, n, o = {}) {
  let { slotInstructions: a, children: s } = await Or(e, o), i = t({ slots: s }), r = a ? a.map((l) => zt(e, l)).join("") : "";
  return B(r + i);
}
function ne(e, t, n, o, a = {}) {
  return On(n) ? Promise.resolve(n).then((s) => ne(e, t, s, o, a)) : pB(n) ? yB(e, a) : mB(n) ? bB(e, n, o, a) : Lr(n) ? K9(e, t, n, o, a) : DB(e, t, n, o, a);
}
function fr(e, t, n, o, a = {}) {
  let s = ne(e, t, n, o, a);
  return Vn(s) ? s.render() : s;
}
function wB() {
  var e, t, n;
  return kt = (n = class extends Response {
    constructor(a, s) {
      let i = a instanceof ReadableStream;
      super(i ? null : a, s);
      z(this, e, void 0);
      z(this, t, void 0);
      L(this, e, i), L(this, t, a);
    }
    get body() {
      return m(this, t);
    }
    async text() {
      if (m(this, e) && Mn) {
        let a = new TextDecoder(), s = m(this, t), i = "";
        for await (let r of ir(s))
          i += a.decode(r);
        return i;
      }
      return super.text();
    }
    async arrayBuffer() {
      if (m(this, e) && Mn) {
        let a = m(this, t), s = [], i = 0;
        for await (let u of ir(a))
          s.push(u), i += u.length;
        let r = new Uint8Array(i), l = 0;
        for (let u of s)
          r.set(u, l), l += u.length;
        return r;
      }
      return super.arrayBuffer();
    }
    clone() {
      return new kt(m(this, t), { status: this.status, statusText: this.statusText, headers: this.headers });
    }
  }, e = /* @__PURE__ */ new WeakMap(), t = /* @__PURE__ */ new WeakMap(), n), kt;
}
function CB(e) {
  return gr in e && !!e[gr];
}
async function hr(e, t, n) {
  let o = new lt(), a = 0;
  for await (let s of t)
    go(s) && a === 0 && (a++, /<!doctype html/i.test(String(s)) || (o.append(`${e.compressHTML ? "<!DOCTYPE html>" : `<!DOCTYPE html>
`}`, e), n && await n(o))), o.append(s, e);
  return o.toArrayBuffer();
}
async function xB(e) {
  let t = e._metadata.propagators.values();
  for (; ; ) {
    let { value: n, done: o } = t.next();
    if (o)
      break;
    let a = await n.init(e);
    ho(a) && e._metadata.extraHead.push(a.head);
  }
}
async function SB(e, t, n, o, a, s) {
  var i, r;
  if (!Lr(t)) {
    e._metadata.headInTree = ((i = e.componentMetadata.get(t.moduleId)) == null ? void 0 : i.containsHead) ?? false;
    let c = { ...n ?? {}, "server:root": true }, d, g = "";
    try {
      if (CB(t)) {
        let v = new lt();
        for await (let C of Ce())
          v.append(C, e);
        g = v.toString();
      }
      let D = await ne(e, t.name, t, c, null);
      Vn(D) ? d = D.render() : d = D;
    } catch (D) {
      throw T.is(D) && !D.loc && D.setLocation({ file: s?.component }), D;
    }
    let k = await hr(e, d, async (D) => {
      D.append(g, e);
    });
    return new Response(k, { headers: new Headers([["Content-Type", "text/html; charset=utf-8"], ["Content-Length", k.byteLength.toString()]]) });
  }
  e._metadata.headInTree = ((r = e.componentMetadata.get(t.moduleId)) == null ? void 0 : r.containsHead) ?? false;
  let l = await t(e, n, o), u = ho(l);
  if (_r(l) || u) {
    await xB(e);
    let c = u ? l.content : l, d = Do(c), g = e.response, k = new Headers(g.headers), D;
    return a ? D = new ReadableStream({ start(C) {
      async function E() {
        let P = 0;
        try {
          for await (let j of d) {
            if (go(j) && P === 0 && (/<!doctype html/i.test(String(j)) || C.enqueue(Wn.encode(`${e.compressHTML ? "<!DOCTYPE html>" : `<!DOCTYPE html>
`}`))), j instanceof Response)
              throw new T({ ...w.ResponseSentError });
            let x = X9(e, j);
            C.enqueue(x), P++;
          }
          C.close();
        } catch (j) {
          T.is(j) && !j.loc && j.setLocation({ file: s?.component }), C.error(j);
        }
      }
      E();
    } }) : (D = await hr(e, d), k.set("Content-Length", D.byteLength.toString())), kB(D, { ...g, headers: k });
  }
  if (!(l instanceof Response))
    throw new T({ ...w.OnlyResponseCanBeReturned, message: w.OnlyResponseCanBeReturned.message(s?.route, typeof l), location: { file: s?.component } });
  return l;
}
function y(e, t) {
  e && typeof e == "function" && Object.defineProperty(e, ro, { value: t, enumerable: false, writable: false });
}
function de(e = {}, t, { class: n } = {}) {
  let o = "";
  n && (typeof e.class < "u" ? e.class += ` ${n}` : typeof e["class:list"] < "u" ? e["class:list"] = [e["class:list"], n] : e.class = n);
  for (let [a, s] of Object.entries(e))
    o += Oe(s, a, true);
  return B(o);
}
function Ct(e) {
  return e && typeof e == "object" && e[yo];
}
function EB(e) {
  if (typeof e.type == "string")
    return e;
  let t = {};
  if (Ct(e.props.children)) {
    let n = e.props.children;
    if (!Ct(n) || !("slot" in n.props))
      return;
    let o = vr(n.props.slot);
    t[o] = [n], t[o].$$slot = true, delete n.props.slot, delete e.props.children;
  }
  Array.isArray(e.props.children) && (e.props.children = e.props.children.map((n) => {
    if (!Ct(n) || !("slot" in n.props))
      return n;
    let o = vr(n.props.slot);
    return Array.isArray(t[o]) ? t[o].push(n) : (t[o] = [n], t[o].$$slot = true), delete n.props.slot, Dr;
  }).filter((n) => n !== Dr)), Object.assign(e.props, t);
}
function qr(e) {
  return typeof e == "string" ? B(e) : Array.isArray(e) ? e.map((t) => qr(t)) : e;
}
function FB(e) {
  if ("set:html" in e.props || "set:text" in e.props) {
    if ("set:html" in e.props) {
      let t = qr(e.props["set:html"]);
      delete e.props["set:html"], Object.assign(e.props, { children: t });
      return;
    }
    if ("set:text" in e.props) {
      let t = e.props["set:text"];
      delete e.props["set:text"], Object.assign(e.props, { children: t });
      return;
    }
  }
}
function pe(e, t) {
  let n = { [ro]: "astro:jsx", [yo]: true, type: e, props: t ?? {} };
  return FB(n), EB(n), n;
}
async function TB(e, t, { default: n = null, ...o } = {}) {
  if (typeof e != "function")
    return false;
  let a = {};
  for (let [s, i] of Object.entries(o)) {
    let r = Hr(s);
    a[r] = i;
  }
  try {
    return (await e({ ...t, ...a, children: n }))[yo];
  } catch (s) {
    let i = s;
    if (e[Symbol.for("mdx-component")])
      throw jB({ message: i.message, title: i.name, hint: "This issue often occurs when your MDX component encounters runtime errors.", name: i.name, stack: i.stack });
  }
  return false;
}
async function PB(e, t = {}, { default: n = null, ...o } = {}) {
  let a = {};
  for (let [r, l] of Object.entries(o)) {
    let u = Hr(r);
    a[u] = l;
  }
  let { result: s } = this;
  return { html: await $e(s, pe(e, { ...t, ...a, children: n })) };
}
function jB({ message: e, name: t, stack: n, hint: o }) {
  let a = new Error(e);
  return a.name = t, a.stack = n, a.hint = o, a;
}
function Hn(e, t) {
  Reflect.set(e, Kr, t);
}
function RB(e) {
  let t = Reflect.get(e, Kr);
  if (t != null)
    return t;
}
function* MB(e) {
  let t = RB(e);
  if (!t)
    return [];
  for (let n of t.headers())
    yield n;
  return [];
}
function Zr(e, t, n, o) {
  let a = e.level, s = e.dest, i = { type: n, level: t, message: o };
  co[a] > co[t] || s.write(i);
}
function He(e, t, n) {
  return Zr(e, "warn", t, n);
}
function _B(e, t, n) {
  return Zr(e, "error", t, n);
}
function LB(...e) {
  "_astroGlobalDebug" in globalThis && globalThis._astroGlobalDebug(...e);
}
function OB(e) {
  return e?.type === "redirect";
}
function UB(e, t) {
  let n = e.redirectRoute, o = e.redirect;
  return typeof n < "u" ? n?.generate(t) || n?.pathname || "/" : typeof o == "string" ? o : typeof o > "u" ? "/" : o.destination;
}
function VB(e, t = "GET") {
  let n = e.redirectRoute;
  return typeof n?.redirect == "object" ? n.redirect.status : t !== "GET" ? 308 : 301;
}
async function Jr(e, t, n, o) {
  let a = false, s, r = t(n, async () => (a = true, s = o(), s));
  return await Promise.resolve(r).then(async (l) => {
    if (WB(l) && He(e, "middleware", `Using simple endpoints can cause unexpected issues in the chain of middleware functions.
It's strongly suggested to use full ${yt("Response")} objects.`), a)
      if (typeof l < "u") {
        if (!(l instanceof Response))
          throw new T(w.MiddlewareNotAResponse);
        return l;
      } else {
        if (s)
          return s;
        throw new T(w.MiddlewareNotAResponse);
      }
    else {
      if (typeof l > "u")
        throw new T(w.MiddlewareNoDataOrNextCalled);
      if (l instanceof Response)
        return l;
      throw new T(w.MiddlewareNotAResponse);
    }
  });
}
function WB(e) {
  return !(e instanceof Response) && typeof e == "object" && typeof e.body == "string";
}
function Xr({ request: e, params: t, site: n, props: o, adapterName: a }) {
  let s = { cookies: new lo(e), request: e, params: t, site: n ? new URL(n) : void 0, generator: `Astro v${Ar}`, props: o, redirect(i, r) {
    return new Response(null, { status: r || 302, headers: { Location: i } });
  }, url: new URL(e.url), get clientAddress() {
    if (!(wr in e))
      throw a ? new T({ ...w.ClientAddressNotAvailable, message: w.ClientAddressNotAvailable.message(a) }) : new T(w.StaticClientAddressNotAvailable);
    return Reflect.get(e, wr);
  } };
  return Object.defineProperty(s, "locals", { enumerable: true, get() {
    return Reflect.get(e, kr);
  }, set(i) {
    if (typeof i != "object")
      throw new T(w.LocalsNotAnObject);
    Reflect.set(e, kr, i);
  } }), s;
}
async function qB(e, t, n, o) {
  var a;
  let s = Xr({ request: n.request, params: n.params, props: n.props, site: t.site, adapterName: t.adapterName }), i;
  return o ? i = await Jr(t.logging, o, s, async () => await sr(e, s, t.ssr)) : i = await sr(e, s, t.ssr), i instanceof Response ? (Hn(i, s.cookies), { type: "response", response: i }) : (t.ssr && !((a = n.route) != null && a.prerender) && (i.hasOwnProperty("headers") && He(t.logging, "ssr", "Setting headers is not supported when returning an object. Please return an instance of Response. See https://docs.astro.build/en/core-concepts/endpoints/#server-endpoints-api-routes for more information."), i.encoding && He(t.logging, "ssr", "`encoding` is ignored in SSR. To return a charset other than UTF-8, please return an instance of Response. See https://docs.astro.build/en/core-concepts/endpoints/#server-endpoints-api-routes for more information.")), { type: "simple", body: i.body, encoding: i.encoding, cookies: s.cookies });
}
function GB(e) {
  var t;
  if (e && ((t = e.expressions) == null ? void 0 : t.length) === 1)
    return e.expressions[0];
}
function YB(e) {
  let { markdown: t, params: n, request: o, resolve: a, locals: s } = e, i = new URL(o.url), r = new Headers();
  r.set("Content-Type", "text/html");
  let l = { status: e.status, statusText: "OK", headers: r };
  Object.defineProperty(l, "headers", { value: l.headers, enumerable: true, writable: false });
  let u = e.cookies, c = { styles: e.styles ?? /* @__PURE__ */ new Set(), scripts: e.scripts ?? /* @__PURE__ */ new Set(), links: e.links ?? /* @__PURE__ */ new Set(), componentMetadata: e.componentMetadata ?? /* @__PURE__ */ new Map(), renderers: e.renderers, clientDirectives: e.clientDirectives, compressHTML: e.compressHTML, pathname: e.pathname, cookies: u, createAstro(d, g, k) {
    let D = new Ln(c, k, e.logging), v = { __proto__: d, get clientAddress() {
      if (!(Cr in o))
        throw e.adapterName ? new T({ ...w.ClientAddressNotAvailable, message: w.ClientAddressNotAvailable.message(e.adapterName) }) : new T(w.StaticClientAddressNotAvailable);
      return Reflect.get(o, Cr);
    }, get cookies() {
      return u || (u = new lo(o), c.cookies = u, u);
    }, params: n, props: g, locals: s, request: o, url: i, redirect(C, E) {
      if (o[HB])
        throw new T({ ...w.ResponseSentError });
      return new Response(null, { status: E || 302, headers: { Location: C } });
    }, response: l, slots: D };
    return Object.defineProperty(v, "__renderMarkdown", { enumerable: false, writable: false, value: async function(C, E) {
      if (typeof Deno < "u")
        throw new Error("Markdown is not supported in Deno SSR");
      if (!Cn) {
        let j = "@astrojs/";
        j += "markdown-remark", Cn = (await import(j)).renderMarkdown;
      }
      let { code: P } = await Cn(C, { ...t, ...E ?? {} });
      return P;
    } }), v;
  }, resolve: a, response: l, _metadata: { hasHydrationScript: false, hasRenderedHead: false, hasDirectives: /* @__PURE__ */ new Set(), headInTree: false, extraHead: [], propagators: /* @__PURE__ */ new Map() } };
  return c;
}
async function xr({ mod: e, renderContext: t, env: n, cookies: o }) {
  if (OB(t.route))
    return new Response(null, { status: VB(t.route, t.request.method), headers: { location: UB(t.route, t.params) } });
  let a = e.default;
  if (!a)
    throw new Error(`Expected an exported Astro component but received typeof ${typeof a}`);
  let s = YB({ adapterName: n.adapterName, links: t.links, styles: t.styles, logging: n.logging, markdown: n.markdown, params: t.params, pathname: t.pathname, componentMetadata: t.componentMetadata, resolve: n.resolve, renderers: n.renderers, clientDirectives: n.clientDirectives, compressHTML: n.compressHTML, request: t.request, site: n.site, scripts: t.scripts, ssr: n.ssr, status: t.status ?? 200, cookies: o, locals: t.locals ?? {} });
  typeof e.components == "object" && Object.assign(t.props, { components: e.components });
  let i = await SB(s, a, t.props, null, n.streaming, t.route);
  return s.cookies && Hn(i, s.cookies), i;
}
async function Sr(e, t, n, o, a) {
  let s = Xr({ request: t.request, params: t.params, props: t.props, site: n.site, adapterName: n.adapterName });
  switch (e) {
    case "page":
    case "redirect":
      return a ? await Jr(n.logging, a, s, () => xr({ mod: o, renderContext: t, env: n, cookies: s.cookies })) : await xr({ mod: o, renderContext: t, env: n, cookies: s.cookies });
    case "endpoint":
      return await qB(o, n, t, a);
    default:
      throw new Error(`Couldn't find route of type [${e}]`);
  }
}
function KB(e, t) {
  return e instanceof Response && (t === "page" || t === "redirect");
}
function JB([e, t], n) {
  if (!ZB.includes(typeof t))
    throw new T({ ...w.GetStaticPathsInvalidRouteParam, message: w.GetStaticPathsInvalidRouteParam.message(e, t, typeof t), location: { file: n } });
}
function XB(e, { ssr: t, route: n }) {
  if ((!t || n.prerender) && !e.getStaticPaths)
    throw new T({ ...w.GetStaticPathsRequired, location: { file: n.component } });
}
function QB(e, t, n) {
  if (!Array.isArray(e))
    throw new T({ ...w.InvalidGetStaticPathsReturn, message: w.InvalidGetStaticPathsReturn.message(typeof e), location: { file: n.component } });
  e.forEach((o) => {
    if (o.params === void 0 || o.params === null || o.params && Object.keys(o.params).length === 0)
      throw new T({ ...w.GetStaticPathsExpectedParams, location: { file: n.component } });
    if (typeof o.params != "object")
      throw new T({ ...w.InvalidGetStaticPathParam, message: w.InvalidGetStaticPathParam.message(typeof o.params), location: { file: n.component } });
    for (let [a, s] of Object.entries(o.params))
      typeof s > "u" || typeof s == "string" || typeof s == "number" || He(t, "getStaticPaths", `invalid path param: ${a}. A string, number or undefined value was expected, but got \`${JSON.stringify(s)}\`.`), typeof s == "string" && s === "" && He(t, "getStaticPaths", `invalid path param: ${a}. \`undefined\` expected for an optional param, but got empty string.`);
  });
}
function eR(e) {
  return (n) => {
    let o = {};
    return e.forEach((a, s) => {
      a.startsWith("...") ? o[a.slice(3)] = n[s + 1] ? decodeURIComponent(n[s + 1]) : void 0 : o[a] = decodeURIComponent(n[s + 1]);
    }), o;
  };
}
function Qr(e, t) {
  let n = Object.entries(e).reduce((o, a) => {
    JB(a, t.component);
    let [s, i] = a;
    return o[s] = i?.toString(), o;
  }, {});
  return JSON.stringify(t.generate(n));
}
function tR(e) {
  return function(n, o = {}) {
    let { pageSize: a, params: s, props: i } = o, r = a || 10, l = "page", u = s || {}, c = i || {}, d;
    if (e.params.includes(`...${l}`))
      d = false;
    else if (e.params.includes(`${l}`))
      d = true;
    else
      throw new T({ ...w.PageNumberParamNotFound, message: w.PageNumberParamNotFound.message(l) });
    let g = Math.max(1, Math.ceil(n.length / r));
    return [...Array(g).keys()].map((D) => {
      let v = D + 1, C = r === 1 / 0 ? 0 : (v - 1) * r, E = Math.min(C + r, n.length), P = { ...u, [l]: d || v > 1 ? String(v) : void 0 }, j = xn(e.generate({ ...P })), x = v === g ? void 0 : xn(e.generate({ ...P, page: String(v + 1) })), H = v === 1 ? void 0 : xn(e.generate({ ...P, page: !d && v - 1 === 1 ? void 0 : String(v - 1) }));
      return { params: P, props: { ...c, page: { data: n.slice(C, E), start: C, end: E - 1, size: r, total: n.length, currentPage: v, lastPage: g, url: { current: j, next: x, prev: H } } } };
    });
  };
}
function xn(e) {
  return e === "" ? "/" : e;
}
async function oR({ mod: e, route: t, routeCache: n, isValidate: o, logging: a, ssr: s }) {
  let i = n.get(t);
  if (i?.staticPaths)
    return i.staticPaths;
  if (XB(e, { ssr: s, route: t }), s && !t.prerender) {
    let u = Object.assign([], { keyed: /* @__PURE__ */ new Map() });
    return n.set(t, { ...i, staticPaths: u }), u;
  }
  if (!e.getStaticPaths)
    throw new Error("Unexpected Error.");
  let r = [];
  r = await e.getStaticPaths({ paginate: tR(t), rss() {
    throw new T(w.GetStaticPathsRemovedRSSHelper);
  } }), Array.isArray(r) && (r = r.flat()), o && QB(r, a, t);
  let l = r;
  l.keyed = /* @__PURE__ */ new Map();
  for (let u of l) {
    let c = Qr(u.params, t);
    l.keyed.set(c, u);
  }
  return n.set(t, { ...i, staticPaths: l }), l;
}
function nR(e, t, n) {
  let o = Qr(t, n), a = e.keyed.get(o);
  if (a)
    return a;
  LB("findPathItemByKey", `Unexpected cache miss looking for ${o}`);
}
async function aR(e) {
  let { logging: t, mod: n, route: o, routeCache: a, pathname: s, ssr: i } = e;
  if (!o || o.pathname)
    return [{}, {}];
  let r = sR(o, s) ?? {};
  iR(o, n, r);
  let l = await oR({ mod: n, route: o, routeCache: a, isValidate: true, logging: t, ssr: i }), u = nR(l, r, o);
  if (!u && (!i || o.prerender))
    throw new T({ ...w.NoMatchingStaticPathFound, message: w.NoMatchingStaticPathFound.message(s), hint: w.NoMatchingStaticPathFound.hint([o.component]) });
  let c = u?.props ? { ...u.props } : {};
  return [r, c];
}
function sR(e, t) {
  if (e.params.length) {
    let n = e.pattern.exec(decodeURIComponent(t));
    if (n)
      return eR(e.params)(n);
  }
}
function iR(e, t, n) {
  if (e.type === "endpoint" && t.getStaticPaths) {
    let o = e.segments[e.segments.length - 1], a = Object.values(n), s = a[a.length - 1];
    if (o.length === 1 && o[0].dynamic && s === void 0)
      throw new T({ ...w.PrerenderDynamicEndpointPathCollide, message: w.PrerenderDynamicEndpointPathCollide.message(e.route), hint: w.PrerenderDynamicEndpointPathCollide.hint(e.component), location: { file: e.component } });
  }
}
async function Fr(e) {
  let t = e.request, n = e.pathname ?? new URL(t.url).pathname, [o, a] = await aR({ mod: e.mod, route: e.route, routeCache: e.env.routeCache, pathname: n, logging: e.env.logging, ssr: e.env.ssr }), s = { ...e, pathname: n, params: o, props: a };
  return Object.defineProperty(s, "locals", { enumerable: true, get() {
    return Reflect.get(t, Er);
  }, set(i) {
    if (typeof i != "object")
      throw new T(w.LocalsNotAnObject);
    Reflect.set(t, Er, i);
  } }), s;
}
function Gn(e, t, n) {
  return n ? pn(n, mn(e)) : t ? no(pn(t, mn(e))) : e;
}
function rR(e, t, n) {
  return e.type === "inline" ? { props: { type: "text/css" }, children: e.content } : { props: { rel: "stylesheet", href: Gn(e.src, t, n) }, children: "" };
}
function lR(e, t, n) {
  return new Set(e.map((o) => rR(o, t, n)));
}
function cR(e, t, n) {
  return e.type === "external" ? uR(e.value, t, n) : { props: { type: "module" }, children: e.value };
}
function uR(e, t, n) {
  return { props: { type: "module", src: Gn(e, t, n) }, children: "" };
}
function Sn(e, t) {
  return t.routes.find((n) => n.pattern.test(decodeURI(e)));
}
function dR(e, t) {
  let n = e.map((s) => "/" + s.map((i) => i.spread ? `:${i.content.slice(3)}(.*)?` : i.dynamic ? `:${i.content}` : i.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("")).join(""), o = "";
  return t === "always" && e.length && (o = "/"), Wi(n + o);
}
function Tr(e) {
  return { route: e.route, type: e.type, pattern: new RegExp(e.pattern), params: e.params, component: e.component, generate: dR(e.segments, e._meta.trailingSlash), pathname: e.pathname || void 0, segments: e.segments, prerender: e.prerender };
}
function el(e) {
  let t = [];
  for (let s of e.routes) {
    t.push({ ...s, routeData: Tr(s.routeData) });
    let i = s;
    i.routeData = Tr(s.routeData);
  }
  let n = new Set(e.assets), o = new Map(e.componentMetadata), a = new Map(e.clientDirectives);
  return { ...e, assets: n, componentMetadata: o, clientDirectives: a, routes: t };
}
var St;
var Pr;
var w;
var T;
var Ar;
var wt;
var qe;
var B;
var R9;
var M9;
var Un;
var N9;
var I9;
var $9;
var O9;
var U9;
var Qe;
var vn;
var lr;
var so;
var et;
var We;
var tt;
var ot;
var Et;
var je;
var nt;
var Fn;
var Tn;
var yn;
var q9;
var dr;
var zr;
var Pn;
var Nr;
var Ir;
var jn;
var $r;
var io;
var ue;
var ro;
var Wn;
var J9;
var lt;
var pr;
var Ie;
var An;
var qn;
var le;
var Rn;
var wn;
var mr;
var fB;
var gB;
var Mn;
var kt;
var kB;
var gr;
var yo;
var Dr;
var vr;
var Hr;
var Gr;
var AB;
var yr;
var BB;
var xt;
var at;
var Ae;
var ce;
var Ft;
var zn;
var Tt;
var _n;
var po;
var Yr;
var lo;
var Kr;
var zB;
var co;
var br;
var kn;
var NB;
var IB;
var $B;
var wr;
var kr;
var Cr;
var HB;
var Pt;
var Be;
var jt;
var Ln;
var Cn;
var ZB;
var Nn;
var Er;
var pR;
var mR;
var Le;
var U;
var Ne;
var At;
var mo;
var st;
var Bt;
var fo;
var tl;
var Rt;
var In;
var Mt;
var $n;
var uo;
var Z = p(() => {
  "use strict";
  G();
  St = A(X(), 1);
  Q();
  ee();
  qi();
  Pr = A(te(), 1);
  oe();
  w = { UnknownCompilerError: { title: "Unknown compiler error.", hint: "This is almost always a problem with the Astro compiler, not your code. Please open an issue at https://astro.build/issues/compiler." }, StaticRedirectNotAvailable: { title: "`Astro.redirect` is not available in static mode.", message: "Redirects are only available when using `output: 'server'` or `output: 'hybrid'`. Update your Astro config if you need SSR features.", hint: "See https://docs.astro.build/en/guides/server-side-rendering/#enabling-ssr-in-your-project for more information on how to enable SSR." }, ClientAddressNotAvailable: { title: "`Astro.clientAddress` is not available in current adapter.", message: (e) => `\`Astro.clientAddress\` is not available in the \`${e}\` adapter. File an issue with the adapter to add support.` }, StaticClientAddressNotAvailable: { title: "`Astro.clientAddress` is not available in static mode.", message: "`Astro.clientAddress` is only available when using `output: 'server'` or `output: 'hybrid'`. Update your Astro config if you need SSR features.", hint: "See https://docs.astro.build/en/guides/server-side-rendering/#enabling-ssr-in-your-project for more information on how to enable SSR." }, NoMatchingStaticPathFound: { title: "No static path found for requested path.", message: (e) => `A \`getStaticPaths()\` route pattern was matched, but no matching static path was found for requested path \`${e}\`.`, hint: (e) => `Possible dynamic routes being matched: ${e.join(", ")}.` }, OnlyResponseCanBeReturned: { title: "Invalid type returned by Astro page.", message: (e, t) => `Route \`${e || ""}\` returned a \`${t}\`. Only a [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) can be returned from Astro files.`, hint: "See https://docs.astro.build/en/guides/server-side-rendering/#response for more information." }, MissingMediaQueryDirective: { title: "Missing value for `client:media` directive.", message: 'Media query not provided for `client:media` directive. A media query similar to `client:media="(max-width: 600px)"` must be provided' }, NoMatchingRenderer: { title: "No matching renderer found.", message: (e, t, n, o) => `Unable to render \`${e}\`.

${o > 0 ? `There ${n ? "are" : "is"} ${o} renderer${n ? "s" : ""} configured in your \`astro.config.mjs\` file,
but ${n ? "none were" : "it was not"} able to server-side render \`${e}\`.` : `No valid renderer was found ${t ? `for the \`.${t}\` file extension.` : "for this file extension."}`}`, hint: (e) => `Did you mean to enable the ${e} integration?

See https://docs.astro.build/en/core-concepts/framework-components/ for more information on how to install and configure integrations.` }, NoClientEntrypoint: { title: "No client entrypoint specified in renderer.", message: (e, t, n) => `\`${e}\` component has a \`client:${t}\` directive, but no client entrypoint was provided by \`${n}\`.`, hint: "See https://docs.astro.build/en/reference/integrations-reference/#addrenderer-option for more information on how to configure your renderer." }, NoClientOnlyHint: { title: "Missing hint on client:only directive.", message: (e) => `Unable to render \`${e}\`. When using the \`client:only\` hydration strategy, Astro needs a hint to use the correct renderer.`, hint: (e) => `Did you mean to pass \`client:only="${e}"\`? See https://docs.astro.build/en/reference/directives-reference/#clientonly for more information on client:only` }, InvalidGetStaticPathParam: { title: "Invalid value returned by a `getStaticPaths` path.", message: (e) => `Invalid params given to \`getStaticPaths\` path. Expected an \`object\`, got \`${e}\``, hint: "See https://docs.astro.build/en/reference/api-reference/#getstaticpaths for more information on getStaticPaths." }, InvalidGetStaticPathsReturn: { title: "Invalid value returned by getStaticPaths.", message: (e) => `Invalid type returned by \`getStaticPaths\`. Expected an \`array\`, got \`${e}\``, hint: "See https://docs.astro.build/en/reference/api-reference/#getstaticpaths for more information on getStaticPaths." }, GetStaticPathsRemovedRSSHelper: { title: "getStaticPaths RSS helper is not available anymore.", message: "The RSS helper has been removed from `getStaticPaths`. Try the new @astrojs/rss package instead.", hint: "See https://docs.astro.build/en/guides/rss/ for more information." }, GetStaticPathsExpectedParams: { title: "Missing params property on `getStaticPaths` route.", message: "Missing or empty required `params` property on `getStaticPaths` route.", hint: "See https://docs.astro.build/en/reference/api-reference/#getstaticpaths for more information on getStaticPaths." }, GetStaticPathsInvalidRouteParam: { title: "Invalid value for `getStaticPaths` route parameter.", message: (e, t, n) => `Invalid getStaticPaths route parameter for \`${e}\`. Expected undefined, a string or a number, received \`${n}\` (\`${t}\`)`, hint: "See https://docs.astro.build/en/reference/api-reference/#getstaticpaths for more information on getStaticPaths." }, GetStaticPathsRequired: { title: "`getStaticPaths()` function required for dynamic routes.", message: "`getStaticPaths()` function is required for dynamic routes. Make sure that you `export` a `getStaticPaths` function from your dynamic route.", hint: 'See https://docs.astro.build/en/core-concepts/routing/#dynamic-routes for more information on dynamic routes.\n\nAlternatively, set `output: "server"` in your Astro config file to switch to a non-static server build. This error can also occur if using `export const prerender = true;`.\nSee https://docs.astro.build/en/guides/server-side-rendering/ for more information on non-static rendering.' }, ReservedSlotName: { title: "Invalid slot name.", message: (e) => `Unable to create a slot named \`${e}\`. \`${e}\` is a reserved slot name. Please update the name of this slot.` }, NoAdapterInstalled: { title: "Cannot use Server-side Rendering without an adapter.", message: "Cannot use `output: 'server'` or `output: 'hybrid'` without an adapter. Please install and configure the appropriate server adapter for your final deployment.", hint: "See https://docs.astro.build/en/guides/server-side-rendering/ for more information." }, NoMatchingImport: { title: "No import found for component.", message: (e) => `Could not render \`${e}\`. No matching import has been found for \`${e}\`.`, hint: "Please make sure the component is properly imported." }, InvalidPrerenderExport: { title: "Invalid prerender export.", message: (e, t, n) => {
    let o = n ? "false" : "true", a = "A `prerender` export has been detected, but its value cannot be statically analyzed.";
    return e !== "const" && (a += `
Expected \`const\` declaration but got \`${e}\`.`), t !== "true" && (a += `
Expected \`${o}\` value but got \`${t}\`.`), a;
  }, hint: "Mutable values declared at runtime are not supported. Please make sure to use exactly `export const prerender = true`." }, InvalidComponentArgs: { title: "Invalid component arguments.", message: (e) => `Invalid arguments passed to${e ? ` <${e}>` : ""} component.`, hint: "Astro components cannot be rendered directly via function call, such as `Component()` or `{items.map(Component)}`." }, PageNumberParamNotFound: { title: "Page number param not found.", message: (e) => `[paginate()] page number param \`${e}\` not found in your filepath.`, hint: "Rename your file to `[page].astro` or `[...page].astro`." }, ImageMissingAlt: { title: "Missing alt property.", message: "The alt property is required.", hint: "The `alt` property is important for the purpose of accessibility, without it users using screen readers or other assistive technologies won't be able to understand what your image is supposed to represent. See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-alt for more information." }, InvalidImageService: { title: "Error while loading image service.", message: "There was an error loading the configured image service. Please see the stack trace for more information." }, MissingImageDimension: { title: "Missing image dimensions", message: (e, t) => `Missing ${e === "both" ? "width and height attributes" : `${e} attribute`} for ${t}. When using remote images, both dimensions are always required in order to avoid CLS.`, hint: "If your image is inside your `src` folder, you probably meant to import it instead. See [the Imports guide for more information](https://docs.astro.build/en/guides/imports/#other-assets)." }, UnsupportedImageFormat: { title: "Unsupported image format", message: (e, t, n) => `Received unsupported format \`${e}\` from \`${t}\`. Currently only ${n.join(", ")} are supported by our image services.`, hint: "Using an `img` tag directly instead of the `Image` component might be what you're looking for." }, PrerenderDynamicEndpointPathCollide: { title: "Prerendered dynamic endpoint has path collision.", message: (e) => `Could not render \`${e}\` with an \`undefined\` param as the generated path will collide during prerendering. Prevent passing \`undefined\` as \`params\` for the endpoint's \`getStaticPaths()\` function, or add an additional extension to the endpoint's filename.`, hint: (e) => `Rename \`${e}\` to \`${e.replace(/\.(js|ts)/, (t) => ".json" + t)}\`` }, ExpectedImage: { title: "Expected src to be an image.", message: (e) => `Expected \`src\` property to be either an ESM imported image or a string with the path of a remote image. Received \`${e}\`.`, hint: "This error can often happen because of a wrong path. Make sure the path to your image is correct." }, ExpectedImageOptions: { title: "Expected image options.", message: (e) => `Expected getImage() parameter to be an object. Received \`${e}\`.` }, MarkdownImageNotFound: { title: "Image not found.", message: (e, t) => `Could not find requested image \`${e}\`${t ? ` at \`${t}\`.` : "."}`, hint: "This is often caused by a typo in the image path. Please make sure the file exists, and is spelled correctly." }, ResponseSentError: { title: "Unable to set response.", message: "The response has already been sent to the browser and cannot be altered." }, MiddlewareNoDataOrNextCalled: { title: "The middleware didn't return a response or call `next`.", message: "The middleware needs to either return a `Response` object or call the `next` function." }, MiddlewareNotAResponse: { title: "The middleware returned something that is not a `Response` object.", message: "Any data returned from middleware must be a valid `Response` object." }, LocalsNotAnObject: { title: "Value assigned to `locals` is not accepted.", message: "`locals` can only be assigned to an object. Other values like numbers, strings, etc. are not accepted.", hint: "If you tried to remove some information from the `locals` object, try to use `delete` or set the property to `undefined`." }, LocalImageUsedWrongly: { title: "ESM imported images must be passed as-is.", message: (e) => `\`Image\`'s and \`getImage\`'s \`src\` parameter must be an imported image or an URL, it cannot be a filepath. Received \`${e}\`.` }, AstroGlobUsedOutside: { title: "Astro.glob() used outside of an Astro file.", message: (e) => `\`Astro.glob(${e})\` can only be used in \`.astro\` files. \`import.meta.glob(${e})\` can be used instead to achieve a similar result.`, hint: "See Vite's documentation on `import.meta.glob` for more information: https://vitejs.dev/guide/features.html#glob-import" }, AstroGlobNoMatch: { title: "Astro.glob() did not match any files.", message: (e) => `\`Astro.glob(${e})\` did not return any matching files. Check the pattern for typos.` }, RedirectWithNoLocation: { title: "A redirect must be given a location with the `Location` header." }, InvalidDynamicRoute: { title: "Invalid dynamic route.", message: (e, t, n) => `The ${t} param for route ${e} is invalid. Received **${n}**.` }, UnknownViteError: { title: "Unknown Vite Error." }, FailedToLoadModuleSSR: { title: "Could not import file.", message: (e) => `Could not import \`${e}\`.`, hint: "This is often caused by a typo in the import path. Please make sure the file exists." }, InvalidGlob: { title: "Invalid glob pattern.", message: (e) => `Invalid glob pattern: \`${e}\`. Glob patterns must start with './', '../' or '/'.`, hint: "See https://docs.astro.build/en/guides/imports/#glob-patterns for more information on supported glob patterns." }, FailedToFindPageMapSSR: { title: "Astro couldn't find the correct page to render", message: "Astro couldn't find the correct page to render, probably because it wasn't correctly mapped for SSR usage. This is an internal error. Please file an issue." }, UnknownCSSError: { title: "Unknown CSS Error." }, CSSSyntaxError: { title: "CSS Syntax Error." }, UnknownMarkdownError: { title: "Unknown Markdown Error." }, MarkdownFrontmatterParseError: { title: "Failed to parse Markdown frontmatter." }, InvalidFrontmatterInjectionError: { title: "Invalid frontmatter injection.", message: 'A remark or rehype plugin attempted to inject invalid frontmatter. Ensure "astro.frontmatter" is set to a valid JSON object that is not `null` or `undefined`.', hint: "See the frontmatter injection docs https://docs.astro.build/en/guides/markdown-content/#modifying-frontmatter-programmatically for more information." }, MdxIntegrationMissingError: { title: "MDX integration missing.", message: (e) => `Unable to render ${e}. Ensure that the \`@astrojs/mdx\` integration is installed.`, hint: "See the MDX integration docs for installation and usage instructions: https://docs.astro.build/en/guides/integrations-guide/mdx/" }, UnknownConfigError: { title: "Unknown configuration error." }, ConfigNotFound: { title: "Specified configuration file not found.", message: (e) => `Unable to resolve \`--config "${e}"\`. Does the file exist?` }, ConfigLegacyKey: { title: "Legacy configuration detected.", message: (e) => `Legacy configuration detected: \`${e}\`.`, hint: `Please update your configuration to the new format.
See https://astro.build/config for more information.` }, UnknownCLIError: { title: "Unknown CLI Error." }, GenerateContentTypesError: { title: "Failed to generate content types.", message: (e) => `\`astro sync\` command failed to generate content collection types: ${e}`, hint: "Check your `src/content/config.*` file for typos." }, UnknownContentCollectionError: { title: "Unknown Content Collection Error." }, InvalidContentEntryFrontmatterError: { title: "Content entry frontmatter does not match schema.", message: (e, t, n) => [`**${String(e)} \u2192 ${String(t)}** frontmatter does not match collection schema.`, ...n.errors.map((o) => o.message)].join(`
`), hint: "See https://docs.astro.build/en/guides/content-collections/ for more information on content schemas." }, InvalidContentEntrySlugError: { title: "Invalid content entry slug.", message: (e, t) => `${String(e)} \u2192 ${String(t)} has an invalid slug. \`slug\` must be a string.`, hint: "See https://docs.astro.build/en/guides/content-collections/ for more on the `slug` field." }, ContentSchemaContainsSlugError: { title: "Content Schema should not contain `slug`.", message: (e) => `A content collection schema should not contain \`slug\` since it is reserved for slug generation. Remove this from your ${e} collection schema.`, hint: "See https://docs.astro.build/en/guides/content-collections/ for more on the `slug` field." }, CollectionDoesNotExistError: { title: "Collection does not exist", message: (e) => `The collection **${e}** does not exist. Ensure a collection directory with this name exists.`, hint: "See https://docs.astro.build/en/guides/content-collections/ for more on creating collections." }, MixedContentDataCollectionError: { title: "Content and data cannot be in same collection.", message: (e) => `**${e}** contains a mix of content and data entries. All entries must be of the same type.`, hint: "Store data entries in a new collection separate from your content collection." }, ContentCollectionTypeMismatchError: { title: "Collection contains entries of a different type.", message: (e, t, n) => `${e} contains ${t} entries, but is configured as a ${n} collection.` }, DataCollectionEntryParseError: { title: "Data collection entry failed to parse.", message: (e, t) => `**${e}** failed to parse: ${t}`, hint: "Ensure your data entry is an object with valid JSON (for `.json` entries) or YAML (for `.yaml` entries)." }, DuplicateContentEntrySlugError: { title: "Duplicate content entry slug.", message: (e, t) => `**${e}** contains multiple entries with the same slug: \`${t}\`. Slugs must be unique.` }, UnsupportedConfigTransformError: { title: "Unsupported transform in content config.", message: (e) => `\`transform()\` functions in your content config must return valid JSON, or data types compatible with the devalue library (including Dates, Maps, and Sets).
Full error: ${e}`, hint: "See the devalue library for all supported types: https://github.com/rich-harris/devalue" }, UnknownError: { title: "Unknown Error." } };
  T = class extends Error {
    constructor(t, ...n) {
      var o;
      super(...n), this.type = "AstroError";
      let { name: a, title: s, message: i, stack: r, location: l, hint: u, frame: c } = t;
      if (this.title = s, a && a !== "Error")
        this.name = a;
      else if (this.title) {
        let d = (o = F9(this.title)) == null ? void 0 : o.name;
        d && (this.name = d);
      }
      i && (this.message = i), this.stack = r || this.stack, this.loc = l, this.hint = u, this.frame = c;
    }
    setLocation(t) {
      this.loc = t;
    }
    setName(t) {
      this.name = t;
    }
    setMessage(t) {
      this.message = t;
    }
    setHint(t) {
      this.hint = t;
    }
    setFrame(t, n) {
      this.frame = T9(t, n);
    }
    static is(t) {
      return t.type === "AstroError";
    }
  };
  Ar = "2.9.0";
  wt = zi, qe = class extends String {
    get [Symbol.toStringTag]() {
      return "HTMLString";
    }
  }, B = (e) => e instanceof qe ? e : typeof e == "string" ? new qe(e) : e;
  R9 = '(()=>{var d;{let h={0:t=>t,1:t=>JSON.parse(t,a),2:t=>new RegExp(t),3:t=>new Date(t),4:t=>new Map(JSON.parse(t,a)),5:t=>new Set(JSON.parse(t,a)),6:t=>BigInt(t),7:t=>new URL(t),8:t=>new Uint8Array(JSON.parse(t)),9:t=>new Uint16Array(JSON.parse(t)),10:t=>new Uint32Array(JSON.parse(t))},a=(t,e)=>{if(t===""||!Array.isArray(e))return e;let[r,n]=e;return r in h?h[r](n):void 0};customElements.get("astro-island")||customElements.define("astro-island",(d=class extends HTMLElement{constructor(){super(...arguments);this.hydrate=async()=>{var o;if(!this.hydrator||!this.isConnected)return;let e=(o=this.parentElement)==null?void 0:o.closest("astro-island[ssr]");if(e){e.addEventListener("astro:hydrate",this.hydrate,{once:!0});return}let r=this.querySelectorAll("astro-slot"),n={},c=this.querySelectorAll("template[data-astro-template]");for(let s of c){let i=s.closest(this.tagName);i!=null&&i.isSameNode(this)&&(n[s.getAttribute("data-astro-template")||"default"]=s.innerHTML,s.remove())}for(let s of r){let i=s.closest(this.tagName);i!=null&&i.isSameNode(this)&&(n[s.getAttribute("name")||"default"]=s.innerHTML)}let l=this.hasAttribute("props")?JSON.parse(this.getAttribute("props"),a):{};await this.hydrator(this)(this.Component,l,n,{client:this.getAttribute("client")}),this.removeAttribute("ssr"),this.dispatchEvent(new CustomEvent("astro:hydrate"))}}connectedCallback(){!this.hasAttribute("await-children")||this.firstChild?this.childrenConnectedCallback():new MutationObserver((e,r)=>{r.disconnect(),setTimeout(()=>this.childrenConnectedCallback(),0)}).observe(this,{childList:!0})}async childrenConnectedCallback(){let e=this.getAttribute("before-hydration-url");e&&await import(e),this.start()}start(){let e=JSON.parse(this.getAttribute("opts")),r=this.getAttribute("client");if(Astro[r]===void 0){window.addEventListener(`astro:${r}`,()=>this.start(),{once:!0});return}Astro[r](async()=>{let n=this.getAttribute("renderer-url"),[c,{default:l}]=await Promise.all([import(this.getAttribute("component-url")),n?import(n):()=>()=>{}]),o=this.getAttribute("component-export")||"default";if(!o.includes("."))this.Component=c[o];else{this.Component=c;for(let s of o.split("."))this.Component=this.Component[s]}return this.hydrator=l,this.hydrate},e,this)}attributeChangedCallback(){this.hydrate()}},d.observedAttributes=["props"],d))}})();', M9 = "<style>astro-island,astro-slot,astro-static-slot{display:contents}</style>";
  Un = /^(area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/i, N9 = /^(allowfullscreen|async|autofocus|autoplay|controls|default|defer|disabled|disablepictureinpicture|disableremoteplayback|formnovalidate|hidden|loop|nomodule|novalidate|open|playsinline|readonly|required|reversed|scoped|seamless|itemscope)$/i, I9 = /^(contenteditable|draggable|spellcheck|value)$/i, $9 = /^(autoReverse|externalResourcesRequired|focusable|preserveAlpha)$/i, O9 = /* @__PURE__ */ new Set(["set:html", "set:text"]), U9 = (e) => e.trim().replace(/(?:(?!^)\b\w|\s+|[^\w]+)/g, (t, n) => /[^\w]|\s/.test(t) ? "" : n === 0 ? t : t.toUpperCase()), Qe = (e, t = true) => t ? String(e).replace(/&/g, "&#38;").replace(/"/g, "&#34;") : e, vn = (e) => e.toLowerCase() === e ? e : e.replace(/[A-Z]/g, (t) => `-${t.toLowerCase()}`), lr = (e) => Object.entries(e).map(([t, n]) => t[0] !== "-" && t[1] !== "-" ? `${vn(t)}:${n}` : vn(t) !== t ? `${vn(t)}:var(${t});${t}:${n}` : `${t}:${n}`).join(";");
  so = [];
  Fn = class {
    constructor(t) {
      z(this, et, void 0);
      z(this, We, new Tn());
      z(this, tt, void 0);
      z(this, ot, void 0);
      z(this, Et, false);
      z(this, je, void 0);
      z(this, nt, false);
      L(this, et, t);
    }
    async buffer() {
      if (m(this, je))
        throw new Error("Cannot not switch from non-buffer to buffer mode");
      L(this, Et, true), L(this, nt, true), L(this, je, m(this, et)[Symbol.asyncIterator]());
      let t;
      do {
        L(this, ot, m(this, je).next());
        try {
          t = await m(this, ot), m(this, We).push(t);
        } catch (n) {
          L(this, tt, n);
        }
      } while (t && !t.done);
    }
    async next() {
      if (m(this, tt))
        throw m(this, tt);
      return m(this, Et) ? m(this, We).isEmpty() ? (await m(this, ot), m(this, We).shift()) : m(this, We).shift() : (m(this, je) || (L(this, nt, true), L(this, je, m(this, et)[Symbol.asyncIterator]())), await m(this, je).next());
    }
    isStarted() {
      return m(this, nt);
    }
    [Symbol.asyncIterator]() {
      return this;
    }
  };
  et = /* @__PURE__ */ new WeakMap(), We = /* @__PURE__ */ new WeakMap(), tt = /* @__PURE__ */ new WeakMap(), ot = /* @__PURE__ */ new WeakMap(), Et = /* @__PURE__ */ new WeakMap(), je = /* @__PURE__ */ new WeakMap(), nt = /* @__PURE__ */ new WeakMap();
  Tn = class {
    constructor() {
      this.head = void 0, this.tail = void 0;
    }
    push(t) {
      this.head === void 0 ? (this.head = { item: t }, this.tail = this.head) : (this.tail.next = { item: t }, this.tail = this.tail.next);
    }
    isEmpty() {
      return this.head === void 0;
    }
    shift() {
      var t, n;
      let o = (t = this.head) == null ? void 0 : t.item;
      return this.head = (n = this.head) == null ? void 0 : n.next, o;
    }
  }, yn = (e, t, n) => {
    let o = JSON.stringify(e.props), a = e.children;
    return t === n.findIndex((s) => JSON.stringify(s.props) === o && s.children == a);
  };
  q9 = Symbol.for("astro.headAndContent");
  zr = Symbol.for("astro.renderTemplateResult"), Pn = class {
    constructor(t, n) {
      this[dr] = true, this.htmlParts = t, this.error = void 0, this.expressions = n.map((o) => On(o) ? Promise.resolve(o).catch((a) => {
        if (!this.error)
          throw this.error = a, a;
      }) : o);
    }
    async *[(dr = zr, Symbol.asyncIterator)]() {
      let { htmlParts: t, expressions: n } = this, o = Rr(n.map((a) => it(a)));
      for (let a = 0; a < t.length; a++) {
        let s = t[a], i = o[a];
        yield B(s), i && (yield* i);
      }
    }
  };
  Ir = Symbol.for("astro.componentInstance"), jn = class {
    constructor(t, n, o, a) {
      this[Nr] = true, this.result = t, this.props = n, this.factory = a, this.slotValues = {};
      for (let s in o) {
        let i = o[s](t);
        this.slotValues[s] = () => i;
      }
    }
    async init(t) {
      return this.returnValue = this.factory(t, this.props, this.slotValues), this.returnValue;
    }
    async *render() {
      this.returnValue === void 0 && await this.init(this.result);
      let t = this.returnValue;
      On(t) && (t = await t), ho(t) ? yield* t.content : yield* it(t);
    }
  };
  Nr = Ir;
  $r = Symbol.for("astro:slot-string"), io = class extends qe {
    constructor(t, n) {
      super(t), this.instructions = n, this[$r] = true;
    }
  };
  ue = Symbol.for("astro:fragment"), ro = Symbol.for("astro:renderer"), Wn = new TextEncoder(), J9 = new TextDecoder();
  lt = class {
    constructor() {
      this.parts = "";
    }
    append(t, n) {
      ArrayBuffer.isView(t) ? this.parts += J9.decode(t) : this.parts += zt(n, t);
    }
    toString() {
      return this.parts;
    }
    toArrayBuffer() {
      return Wn.encode(this.parts);
    }
  };
  pr = "astro-client-only", Ie = class {
    constructor(t) {
      this.vnode = t, this.count = 0;
    }
    increment() {
      this.count++;
    }
    haveNoTried() {
      return this.count === 0;
    }
    isCompleted() {
      return this.count > 2;
    }
  };
  Ie.symbol = Symbol("astro:jsx:skip");
  qn = 0;
  le = { Value: 0, JSON: 1, RegExp: 2, Date: 3, Map: 4, Set: 5, BigInt: 6, URL: 7, Uint8Array: 8, Uint16Array: 9, Uint32Array: 10 };
  Rn = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXY", wn = Rn.length;
  mr = /* @__PURE__ */ new Map([["solid", "solid-js"]]);
  fB = /\<\/?astro-slot\b[^>]*>/g, gB = /\<\/?astro-static-slot\b[^>]*>/g;
  Mn = typeof process == "object" && Object.prototype.toString.call(process) === "[object process]";
  kB = Mn ? (e, t) => typeof e == "string" || ArrayBuffer.isView(e) ? new Response(e, t) : typeof kt > "u" ? new (wB())(e, t) : new kt(e, t) : (e, t) => new Response(e, t), gr = Symbol.for("astro.needsHeadRendering");
  yo = "astro:jsx", Dr = Symbol("empty"), vr = (e) => e;
  Hr = (e) => e.trim().replace(/[-_]([a-z])/g, (t, n) => n.toUpperCase());
  Gr = { check: TB, renderToStaticMarkup: PB }, AB = /* @__PURE__ */ new Date(0), yr = "deleted", BB = Symbol.for("astro.responseSent"), xt = class {
    constructor(t) {
      this.value = t;
    }
    json() {
      if (this.value === void 0)
        throw new Error("Cannot convert undefined to an object.");
      return JSON.parse(this.value);
    }
    number() {
      return Number(this.value);
    }
    boolean() {
      return this.value === "false" || this.value === "0" ? false : !!this.value;
    }
  }, lo = class {
    constructor(t) {
      z(this, Ft);
      z(this, Tt);
      z(this, po);
      z(this, at, void 0);
      z(this, Ae, void 0);
      z(this, ce, void 0);
      L(this, at, t), L(this, Ae, null), L(this, ce, null);
    }
    delete(t, n) {
      let o = { expires: AB };
      n?.domain && (o.domain = n.domain), n?.path && (o.path = n.path), he(this, Tt, _n).call(this).set(t, [yr, (0, St.serialize)(t, yr, o), false]);
    }
    get(t) {
      var n;
      if ((n = m(this, ce)) != null && n.has(t)) {
        let [s, , i] = m(this, ce).get(t);
        return i ? new xt(s) : new xt(void 0);
      }
      let a = he(this, Ft, zn).call(this)[t];
      return new xt(a);
    }
    has(t) {
      var n;
      if ((n = m(this, ce)) != null && n.has(t)) {
        let [, , a] = m(this, ce).get(t);
        return a;
      }
      return !!he(this, Ft, zn).call(this)[t];
    }
    set(t, n, o) {
      let a;
      if (typeof n == "string")
        a = n;
      else {
        let i = n.toString();
        i === Object.prototype.toString.call(n) ? a = JSON.stringify(n) : a = i;
      }
      let s = {};
      if (o && Object.assign(s, o), he(this, Tt, _n).call(this).set(t, [a, (0, St.serialize)(t, a, s), true]), m(this, at)[BB])
        throw new T({ ...w.ResponseSentError });
    }
    *headers() {
      if (m(this, ce) != null)
        for (let [, t] of m(this, ce))
          yield t[1];
    }
  };
  at = /* @__PURE__ */ new WeakMap(), Ae = /* @__PURE__ */ new WeakMap(), ce = /* @__PURE__ */ new WeakMap(), Ft = /* @__PURE__ */ new WeakSet(), zn = function() {
    return m(this, Ae) || he(this, po, Yr).call(this), m(this, Ae) || L(this, Ae, {}), m(this, Ae);
  }, Tt = /* @__PURE__ */ new WeakSet(), _n = function() {
    return m(this, ce) || L(this, ce, /* @__PURE__ */ new Map()), m(this, ce);
  }, po = /* @__PURE__ */ new WeakSet(), Yr = function() {
    let t = m(this, at).headers.get("cookie");
    t && L(this, Ae, (0, St.parse)(t));
  };
  Kr = Symbol.for("astro.cookies");
  zB = new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), co = { debug: 20, info: 30, warn: 40, error: 50, silent: 90 };
  if (typeof process < "u") {
    let e = process;
    "argv" in e && Array.isArray(e.argv) && (e.argv.includes("--verbose") || e.argv.includes("--silent"));
  }
  kn = 1, NB = { write(e) {
    let t = console.error;
    co[e.level] < co.error && (t = console.log);
    function n() {
      let s = "", i = e.type;
      return i && (s += Oi(zB.format(/* @__PURE__ */ new Date()) + " "), e.level === "info" ? i = yt(Vi(`[${i}]`)) : e.level === "warn" ? i = yt(gn(`[${i}]`)) : e.level === "error" && (i = yt(Ui(`[${i}]`))), s += `${i} `), $i(s);
    }
    let o = e.message;
    o === br ? (kn++, o = `${o} ${gn(`(x${kn})`)}`) : (br = o, kn = 1);
    let a = n() + o;
    return t(a), true;
  } }, IB = { default() {
    return new Response(null, { status: 301 });
  } }, $B = { page: () => Promise.resolve(IB), onRequest: (e, t) => t(), renderers: [] };
  wr = Symbol.for("astro.clientAddress"), kr = Symbol.for("astro.locals");
  Cr = Symbol.for("astro.clientAddress"), HB = Symbol.for("astro.responseSent");
  Ln = class {
    constructor(t, n, o) {
      z(this, Pt, void 0);
      z(this, Be, void 0);
      z(this, jt, void 0);
      if (L(this, Pt, t), L(this, Be, n), L(this, jt, o), n)
        for (let a of Object.keys(n)) {
          if (this[a] !== void 0)
            throw new T({ ...w.ReservedSlotName, message: w.ReservedSlotName.message(a) });
          Object.defineProperty(this, a, { get() {
            return true;
          }, enumerable: true });
        }
    }
    has(t) {
      return m(this, Be) ? !!m(this, Be)[t] : false;
    }
    async render(t, n = []) {
      if (!m(this, Be) || !this.has(t))
        return;
      let o = m(this, Pt);
      if (!Array.isArray(n))
        He(m(this, jt), "Astro.slots.render", `Expected second parameter to be an array, received a ${typeof n}. If you're trying to pass an array as a single argument and getting unexpected results, make sure you're passing your array as a item of an array. Ex: Astro.slots.render('default', [["Hello", "World"]])`);
      else if (n.length > 0) {
        let i = m(this, Be)[t], r = typeof i == "function" ? await i(o) : await i, l = GB(r);
        if (l)
          return await rt(o, async () => go(await l) ? l : l(...n)).then((c) => c != null ? String(c) : c);
        if (typeof r == "function")
          return await $e(o, r(...n)).then((u) => u != null ? String(u) : u);
      }
      let a = await rt(o, m(this, Be)[t]);
      return zt(o, a);
    }
  };
  Pt = /* @__PURE__ */ new WeakMap(), Be = /* @__PURE__ */ new WeakMap(), jt = /* @__PURE__ */ new WeakMap();
  Cn = null;
  ZB = ["string", "number", "undefined"];
  Nn = class {
    constructor(t, n = "production") {
      this.cache = {}, this.logging = t, this.mode = n;
    }
    clearAll() {
      this.cache = {};
    }
    set(t, n) {
      var o;
      this.mode === "production" && ((o = this.cache[t.component]) != null && o.staticPaths) && He(this.logging, "routeCache", `Internal Warning: route cache overwritten. (${t.component})`), this.cache[t.component] = n;
    }
    get(t) {
      return this.cache[t.component];
    }
  };
  Er = Symbol.for("astro.locals");
  pR = Symbol.for("astro.locals"), mR = Symbol.for("astro.responseSent"), uo = class {
    constructor(t, n = true) {
      z(this, fo);
      z(this, Rt);
      z(this, Mt);
      z(this, Le, void 0);
      z(this, U, void 0);
      z(this, Ne, void 0);
      z(this, At, void 0);
      z(this, mo, new TextEncoder());
      z(this, st, { dest: NB, level: "info" });
      z(this, Bt, void 0);
      L(this, U, t), L(this, Ne, { routes: t.routes.map((o) => o.routeData) }), L(this, At, new Map(t.routes.map((o) => [o.routeData, o]))), L(this, Bt, dn(m(this, U).base)), L(this, Le, he(this, fo, tl).call(this, n));
    }
    set setManifest(t) {
      L(this, U, t);
    }
    set setManifestData(t) {
      L(this, Ne, t);
    }
    removeBase(t) {
      return t.startsWith(m(this, U).base) ? t.slice(m(this, Bt).length + 1) : t;
    }
    match(t, { matchNotFound: n = false } = {}) {
      let o = new URL(t.url);
      if (m(this, U).assets.has(o.pathname))
        return;
      let a = no(this.removeBase(o.pathname)), s = Sn(a, m(this, Ne));
      if (s)
        return s.prerender ? void 0 : s;
      if (n) {
        let i = Sn("/404", m(this, Ne));
        return i?.prerender ? void 0 : i;
      } else
        return;
    }
    async render(t, n, o) {
      let a = 200;
      if (!n && (n = this.match(t), n || (a = 404, n = this.match(t, { matchNotFound: true })), !n))
        return new Response(null, { status: 404, statusText: "Not found" });
      Reflect.set(t, pR, o ?? {}), n.route === "/404" && (a = 404);
      let s = await he(this, Mt, $n).call(this, n), i = await s.page(), r = new URL(t.url), l = await he(this, Rt, In).call(this, r, t, n, s, a), u;
      try {
        u = await Sr(n.type, l, m(this, Le), i, s.onRequest);
      } catch (c) {
        _B(m(this, st), "ssr", c.stack || c.message || String(c)), u = new Response(null, { status: 500, statusText: "Internal server error" });
      }
      if (KB(u, n.type)) {
        if (u.status === 500 || u.status === 404) {
          let c = Sn("/" + u.status, m(this, Ne));
          if (c && c.route !== n.route) {
            s = await he(this, Mt, $n).call(this, c);
            try {
              let d = await he(this, Rt, In).call(this, r, t, n, s, u.status), g = await s.page();
              return await Sr(n.type, d, m(this, Le), g);
            } catch {
            }
          }
        }
        return Reflect.set(u, mR, true), u;
      } else if (u.type === "response") {
        if (u.response.headers.get("X-Astro-Response") === "Not-Found") {
          let c = new Request(new URL("/404", t.url)), d = this.match(c);
          if (d)
            return this.render(c, d);
        }
        return u.response;
      } else {
        let c = u.body, d = new Headers(), g = Pr.default.getType(r.pathname);
        g ? d.set("Content-Type", `${g};charset=utf-8`) : d.set("Content-Type", "text/plain;charset=utf-8");
        let k = m(this, mo).encode(c);
        d.set("Content-Length", k.byteLength.toString());
        let D = new Response(k, { status: 200, headers: d });
        return Hn(D, u.cookies), D;
      }
    }
    setCookieHeaders(t) {
      return MB(t);
    }
  };
  Le = /* @__PURE__ */ new WeakMap(), U = /* @__PURE__ */ new WeakMap(), Ne = /* @__PURE__ */ new WeakMap(), At = /* @__PURE__ */ new WeakMap(), mo = /* @__PURE__ */ new WeakMap(), st = /* @__PURE__ */ new WeakMap(), Bt = /* @__PURE__ */ new WeakMap(), fo = /* @__PURE__ */ new WeakSet(), tl = function(t = false) {
    return { adapterName: m(this, U).adapterName, logging: m(this, st), markdown: m(this, U).markdown, mode: "production", compressHTML: m(this, U).compressHTML, renderers: m(this, U).renderers, clientDirectives: m(this, U).clientDirectives, resolve: async (n) => {
      if (!(n in m(this, U).entryModules))
        throw new Error(`Unable to resolve [${n}]`);
      let o = m(this, U).entryModules[n];
      switch (true) {
        case o.startsWith("data:"):
        case o.length === 0:
          return o;
        default:
          return Gn(o, m(this, U).base, m(this, U).assetsPrefix);
      }
    }, routeCache: new Nn(m(this, st)), site: m(this, U).site, ssr: true, streaming: t };
  }, Rt = /* @__PURE__ */ new WeakSet(), In = async function(t, n, o, a, s = 200) {
    if (o.type === "endpoint") {
      let i = "/" + this.removeBase(t.pathname), l = await a.page();
      return await Fr({ request: n, pathname: i, route: o, status: s, env: m(this, Le), mod: l });
    } else {
      let i = no(this.removeBase(t.pathname)), r = m(this, At).get(o), l = /* @__PURE__ */ new Set(), u = lR(r.styles), c = /* @__PURE__ */ new Set();
      for (let g of r.scripts)
        "stage" in g ? g.stage === "head-inline" && c.add({ props: {}, children: g.children }) : c.add(cR(g));
      let d = await a.page();
      return await Fr({ request: n, pathname: i, componentMetadata: m(this, U).componentMetadata, scripts: c, styles: u, links: l, route: o, status: s, mod: d, env: m(this, Le) });
    }
  }, Mt = /* @__PURE__ */ new WeakSet(), $n = async function(t) {
    if (t.type === "redirect")
      return $B;
    if (m(this, U).pageMap) {
      let n = m(this, U).pageMap.get(t.component);
      if (!n)
        throw new Error(`Unexpectedly unable to find a component instance for route ${t.route}`);
      return await n();
    } else {
      if (m(this, U).pageModule)
        return m(this, U).pageModule;
      throw new Error("Astro couldn't find the correct page to render, probably because it wasn't correctly mapped for SSR usage. This is an internal error, please file an issue.");
    }
  };
});
function gR(e) {
  return e instanceof Error ? e : new Error(typeof e == "string" ? e : "Unknown error", { cause: e });
}
function Kn(e, t = Y) {
  let n = Xn(t, fR), o = gR(e);
  if (!n)
    throw o;
  try {
    for (let a of n)
      a(o);
  } catch (a) {
    Kn(a, t && t.owner || null);
  }
}
function DR() {
  let e = { owner: Y, context: null, owned: null, cleanups: null };
  return Y && (Y.owned ? Y.owned.push(e) : Y.owned = [e]), e;
}
function al(e, t) {
  let n = Y, o = e.length === 0 ? hR : { context: null, owner: t === void 0 ? n : t, owned: null, cleanups: null };
  Y = o;
  let a;
  try {
    a = e(e.length === 0 ? () => {
    } : () => il(o));
  } catch (s) {
    Kn(s);
  } finally {
    Y = n;
  }
  return a;
}
function q(e, t) {
  return [() => e, (n) => e = typeof n == "function" ? n(e) : n];
}
function Re(e, t) {
  Y = DR();
  let n;
  try {
    n = e(t);
  } catch (o) {
    Kn(o);
  } finally {
    Y = Y.owner;
  }
  return () => n;
}
function vR(e) {
  return e();
}
function _t(e) {
  return Y && (Y.cleanups ? Y.cleanups.push(e) : Y.cleanups = [e]), e;
}
function il(e) {
  if (e.owned) {
    for (let t = 0; t < e.owned.length; t++)
      il(e.owned[t]);
    e.owned = null;
  }
  if (e.cleanups) {
    for (let t = 0; t < e.cleanups.length; t++)
      e.cleanups[t]();
    e.cleanups = null;
  }
}
function Zn(e) {
  let t = Symbol("context");
  return { id: t, Provider: yR(t), defaultValue: e };
}
function rl(e) {
  let t;
  return (t = Xn(Y, e.id)) !== void 0 ? t : e.defaultValue;
}
function Jn() {
  return Y;
}
function bo(e) {
  let t = Re(() => Yn(e()));
  return t.toArray = () => {
    let n = t();
    return Array.isArray(n) ? n : n != null ? [n] : [];
  }, t;
}
function Xn(e, t) {
  return e ? e.context && e.context[t] !== void 0 ? e.context[t] : Xn(e.owner, t) : void 0;
}
function Yn(e) {
  if (typeof e == "function" && !e.length)
    return Yn(e());
  if (Array.isArray(e)) {
    let t = [];
    for (let n = 0; n < e.length; n++) {
      let o = Yn(e[n]);
      Array.isArray(o) ? t.push.apply(t, o) : t.push(o);
    }
    return t;
  }
  return e;
}
function yR(e) {
  return function(n) {
    return Re(() => (Y.context = { [e]: n.value }, bo(() => n.children)));
  };
}
function ol(e) {
  ae.context = e;
}
function bR() {
  return ae.context ? { ...ae.context, id: `${ae.context.id}${ae.context.count++}-`, count: 0 } : void 0;
}
function S(e, t) {
  if (ae.context && !ae.context.noHydrate) {
    let n = ae.context;
    ol(bR());
    let o = e(t || {});
    return ol(n), o;
  }
  return e(t || {});
}
function ie(...e) {
  let t = {};
  for (let n = 0; n < e.length; n++) {
    let o = e[n];
    if (typeof o == "function" && (o = o()), o) {
      let a = Object.getOwnPropertyDescriptors(o);
      for (let s in a)
        s in t || Object.defineProperty(t, s, { enumerable: true, get() {
          for (let i = e.length - 1; i >= 0; i--) {
            let r = e[i] || {};
            typeof r == "function" && (r = r());
            let l = r[s];
            if (l !== void 0)
              return l;
          }
        } });
    }
  }
  return t;
}
function ct(e, ...t) {
  let n = Object.getOwnPropertyDescriptors(e), o = (a) => {
    let s = {};
    for (let i = 0; i < a.length; i++) {
      let r = a[i];
      n[r] && (Object.defineProperty(s, r, n[r]), delete n[r]);
    }
    return s;
  };
  return t.map(o).concat(o(Object.keys(n)));
}
function wR(e, t) {
  let n = e.each || [], o = n.length, a = e.children;
  if (o) {
    let s = Array(o);
    for (let i = 0; i < o; i++)
      s[i] = t(a, n[i], i);
    return s;
  }
  return e.fallback;
}
function ut(e) {
  return wR(e, (t, n, o) => t(n, () => o));
}
function fe(e) {
  let t;
  return e.when ? typeof (t = e.children) == "function" ? t(e.keyed ? e.when : () => e.when) : t : e.fallback || "";
}
var nl;
var FI;
var TI;
var fR;
var hR;
var Y;
var sl;
var ae;
var PI;
var Me = p(() => {
  nl = Symbol("solid-proxy"), FI = Symbol("solid-track"), TI = Symbol("solid-dev-component"), fR = Symbol("error");
  hR = { context: null, owner: null, owned: null, cleanups: null }, Y = null;
  sl = vR;
  ae = {};
  PI = Zn();
});
function kR(e) {
  let t = e % ll, n = ml[t];
  for (e = (e - t) / ll; e > 0; )
    t = e % cl, n += fl[t], e = (e - t) / cl;
  return n;
}
function xR(e = {}) {
  let t = Object.assign({}, CR, e || {});
  return { markedRefs: /* @__PURE__ */ new Set(), refs: /* @__PURE__ */ new Map(), features: 8191 ^ t.disabledFeatures };
}
function SR(e) {
  return { stack: [], vars: [], assignments: [], validRefs: [], refSize: 0, features: e.features, markedRefs: new Set(e.markedRefs), valueMap: /* @__PURE__ */ new Map() };
}
function pt(e, t) {
  e.markedRefs.add(t);
}
function se(e, t) {
  let n = e.validRefs[t];
  n == null && (n = e.refSize++, e.validRefs[t] = n);
  let o = e.vars[n];
  return o == null && (o = kR(n), e.vars[n] = o), o;
}
function ER(e, t) {
  let n = e.refs.get(t);
  return n ?? e.refs.size;
}
function FR(e, t) {
  let n = e.refs.get(t);
  if (n == null) {
    let o = e.refs.size;
    return e.refs.set(t, o), o;
  }
  return pt(e, n), n;
}
function Ue(e, t) {
  if (!e)
    throw new Error(t);
}
function dt(e) {
  let t = "", n = 0;
  for (let o = 0, a = e.length; o < a; o++) {
    let s;
    switch (e[o]) {
      case '"':
        s = '\\"';
        break;
      case "\\":
        s = "\\\\";
        break;
      case "<":
        s = "\\x3C";
        break;
      case `
`:
        s = "\\n";
        break;
      case "\r":
        s = "\\r";
        break;
      case "\u2028":
        s = "\\u2028";
        break;
      case "\u2029":
        s = "\\u2029";
        break;
      default:
        continue;
    }
    t += e.slice(n, o) + s, n = o + 1;
  }
  return n === 0 ? t = e : t += e.slice(n), t;
}
function LR(e) {
  return { t: 0, i: void 0, s: e, l: void 0, c: void 0, m: void 0, d: void 0, a: void 0, f: void 0 };
}
function NR(e) {
  return { t: 1, i: void 0, s: dt(e), l: void 0, c: void 0, m: void 0, d: void 0, a: void 0, f: void 0 };
}
function IR(e, t) {
  return Ue(e.features & 8, 'Unsupported type "BigInt"'), { t: 9, i: void 0, s: "" + t, l: void 0, c: void 0, m: void 0, d: void 0, a: void 0, f: void 0 };
}
function $R(e) {
  return { t: 10, i: e, s: void 0, l: void 0, c: void 0, m: void 0, d: void 0, a: void 0, f: void 0 };
}
function OR(e, t) {
  return { t: 11, i: e, s: t.toISOString(), l: void 0, c: void 0, m: void 0, d: void 0, f: void 0, a: void 0 };
}
function UR(e, t) {
  return { t: 12, i: e, s: void 0, l: void 0, c: t.source, m: t.flags, d: void 0, a: void 0, f: void 0 };
}
function VR(e, t, n) {
  let o = n.constructor.name;
  Ue(e.features & 2048, `Unsupported value type "${o}"`);
  let a = n.length, s = new Array(a);
  for (let i = 0; i < a; i++)
    s[i] = "" + n[i];
  return { t: 22, i: t, s, l: n.byteOffset, c: o, m: void 0, d: void 0, a: void 0, f: void 0 };
}
function WR(e, t, n) {
  let o = n.constructor.name;
  Ue((e.features & ul) === ul, `Unsupported value type "${o}"`);
  let a = n.length, s = new Array(a);
  for (let i = 0; i < a; i++)
    s[i] = "" + n[i];
  return { t: 23, i: t, s, l: n.byteOffset, c: o, m: void 0, d: void 0, a: void 0, f: void 0 };
}
function qR(e) {
  return { t: 24, i: void 0, s: gl[e], l: void 0, c: void 0, m: void 0, d: void 0, a: void 0, f: void 0 };
}
function hl(e) {
  return e instanceof EvalError ? "EvalError" : e instanceof RangeError ? "RangeError" : e instanceof ReferenceError ? "ReferenceError" : e instanceof SyntaxError ? "SyntaxError" : e instanceof TypeError ? "TypeError" : e instanceof URIError ? "URIError" : "Error";
}
function Dl(e, t) {
  let n, o = hl(t);
  t.name !== o ? n = { name: t.name } : t.constructor.name !== o && (n = { name: t.constructor.name });
  let a = Object.getOwnPropertyNames(t);
  for (let s of a)
    s !== "name" && s !== "message" && (s === "stack" ? e.features & 16 && (n = n || {}, n[s] = t[s]) : (n = n || {}, n[s] = t[s]));
  return n;
}
function HR(e) {
  let t = Object.getOwnPropertyNames(e);
  if (t.length) {
    let n = {};
    for (let o of t)
      n[o] = e[o];
    return n;
  }
}
function Lt(e) {
  if (!e || typeof e != "object" || Array.isArray(e))
    return false;
  switch (e.constructor) {
    case Map:
    case Set:
    case Int8Array:
    case Int16Array:
    case Int32Array:
    case Uint8Array:
    case Uint16Array:
    case Uint32Array:
    case Uint8ClampedArray:
    case Float32Array:
    case Float64Array:
    case BigInt64Array:
    case BigUint64Array:
      return false;
    default:
      break;
  }
  return Symbol.iterator in e;
}
function vl(e) {
  let t = e[0];
  return (t === "$" || t === "_" || t >= "A" && t <= "Z" || t >= "a" && t <= "z") && GR.test(e);
}
function ko(e) {
  switch (e.t) {
    case "index":
      return e.s + "=" + e.v;
    case "map":
      return e.s + ".set(" + e.k + "," + e.v + ")";
    case "set":
      return e.s + ".add(" + e.v + ")";
    default:
      return "";
  }
}
function YR(e) {
  let t = [], n = e[0], o = n, a;
  for (let s = 1, i = e.length; s < i; s++) {
    if (a = e[s], a.t === o.t)
      switch (a.t) {
        case "index":
          a.v === o.v ? n = { t: "index", s: a.s, k: void 0, v: ko(n) } : (t.push(n), n = a);
          break;
        case "map":
          a.s === o.s ? n = { t: "map", s: ko(n), k: a.k, v: a.v } : (t.push(n), n = a);
          break;
        case "set":
          a.s === o.s ? n = { t: "set", s: ko(n), k: void 0, v: a.v } : (t.push(n), n = a);
          break;
        default:
          break;
      }
    else
      t.push(n), n = a;
    o = a;
  }
  return t.push(n), t;
}
function yl(e) {
  if (e.length) {
    let t = "", n = YR(e);
    for (let o = 0, a = n.length; o < a; o++)
      t += ko(n[o]) + ",";
    return t;
  }
}
function KR(e) {
  return yl(e.assignments);
}
function bl(e, t, n) {
  e.assignments.push({ t: "index", s: t, k: void 0, v: n });
}
function ZR(e, t, n) {
  pt(e, t), e.assignments.push({ t: "set", s: se(e, t), k: void 0, v: n });
}
function Qn(e, t, n, o) {
  pt(e, t), e.assignments.push({ t: "map", s: se(e, t), k: n, v: o });
}
function ea(e, t, n, o) {
  pt(e, t), bl(e, se(e, t) + "[" + n + "]", o);
}
function wl(e, t, n, o) {
  pt(e, t), bl(e, se(e, t) + "." + n, o);
}
function Se(e, t, n) {
  return e.markedRefs.has(t) ? se(e, t) + "=" + n : n;
}
function Ge(e, t) {
  return t.t === 10 && e.stack.includes(t.i);
}
function ta(e, t) {
  let n = t.l, o = "", a, s = false;
  for (let i = 0; i < n; i++)
    i !== 0 && (o += ","), a = t.a[i], a ? Ge(e, a) ? (ea(e, t.i, i, se(e, a.i)), s = true) : (o += xe(e, a), s = false) : s = true;
  return "[" + o + (s ? ",]" : "]");
}
function JR(e, t) {
  e.stack.push(t.i);
  let n = ta(e, t);
  return e.stack.pop(), Se(e, t.i, n);
}
function kl(e, t, n) {
  if (n.s === 0)
    return "{}";
  let o = "";
  e.stack.push(t);
  let a, s, i, r, l, u = false;
  for (let c = 0; c < n.s; c++)
    a = n.k[c], s = n.v[c], i = Number(a), r = i >= 0 || vl(a), Ge(e, s) ? (l = se(e, s.i), r && Number.isNaN(i) ? wl(e, t, a, l) : ea(e, t, r ? a : '"' + dt(a) + '"', l)) : (o += (u ? "," : "") + (r ? a : '"' + dt(a) + '"') + ":" + xe(e, s), u = true);
  return e.stack.pop(), "{" + o + "}";
}
function XR(e, t, n, o) {
  let a = kl(e, n, t);
  return a !== "{}" ? "Object.assign(" + o + "," + a + ")" : o;
}
function QR(e, t, n) {
  e.stack.push(t);
  let o = [], a, s, i, r, l, u;
  for (let c = 0; c < n.s; c++)
    a = e.stack, e.stack = [], s = xe(e, n.v[c]), e.stack = a, i = n.k[c], r = Number(i), l = e.assignments, e.assignments = o, u = r >= 0 || vl(i), u && Number.isNaN(r) ? wl(e, t, i, s) : ea(e, t, u ? i : '"' + dt(i) + '"', s), e.assignments = l;
  return e.stack.pop(), yl(o);
}
function Co(e, t, n, o) {
  if (n)
    if (e.features & 128)
      o = XR(e, n, t, o);
    else {
      pt(e, t);
      let a = QR(e, t, n);
      if (a)
        return "(" + Se(e, t, o) + "," + a + se(e, t) + ")";
    }
  return Se(e, t, o);
}
function eM(e, t) {
  return Co(e, t.i, t.d, "Object.create(null)");
}
function tM(e, t) {
  return Se(e, t.i, kl(e, t.i, t.d));
}
function oM(e, t) {
  let n = "new Set", o = t.l;
  if (o) {
    let a = "";
    e.stack.push(t.i);
    let s, i = false;
    for (let r = 0; r < o; r++)
      s = t.a[r], Ge(e, s) ? ZR(e, t.i, se(e, s.i)) : (a += (i ? "," : "") + xe(e, s), i = true);
    e.stack.pop(), a && (n += "([" + a + "])");
  }
  return Se(e, t.i, n);
}
function nM(e, t) {
  let n = "new Map";
  if (t.d.s) {
    let o = "";
    e.stack.push(t.i);
    let a, s, i, r, l, u = false;
    for (let c = 0; c < t.d.s; c++)
      a = t.d.k[c], s = t.d.v[c], Ge(e, a) ? (i = se(e, a.i), Ge(e, s) ? (r = se(e, s.i), Qn(e, t.i, i, r)) : (l = e.stack, e.stack = [], Qn(e, t.i, i, xe(e, s)), e.stack = l)) : Ge(e, s) ? (r = se(e, s.i), l = e.stack, e.stack = [], Qn(e, t.i, xe(e, a), r), e.stack = l) : (o += (u ? ",[" : "[") + xe(e, a) + "," + xe(e, s) + "]", u = true);
    e.stack.pop(), o && (n += "([" + o + "])");
  }
  return Se(e, t.i, n);
}
function aM(e, t) {
  e.stack.push(t.i);
  let n = "new AggregateError(" + ta(e, t) + ',"' + dt(t.m) + '")';
  return e.stack.pop(), Co(e, t.i, t.d, n);
}
function sM(e, t) {
  let n = "new " + t.c + '("' + dt(t.m) + '")';
  return Co(e, t.i, t.d, n);
}
function iM(e, t) {
  let n;
  if (Ge(e, t.f)) {
    let o = se(e, t.f.i);
    e.features & 4 ? n = "Promise.resolve().then(()=>" + o + ")" : n = "Promise.resolve().then(function(){return " + o + "})";
  } else {
    e.stack.push(t.i);
    let o = xe(e, t.f);
    e.stack.pop(), n = "Promise.resolve(" + o + ")";
  }
  return Se(e, t.i, n);
}
function rM(e, t) {
  let n = "", o = t.t === 23;
  for (let s = 0, i = t.s.length; s < i; s++)
    n += (s !== 0 ? "," : "") + t.s[s] + (o ? "n" : "");
  let a = "[" + n + "]" + (t.l !== 0 ? "," + t.l : "");
  return Se(e, t.i, "new " + t.c + "(" + a + ")");
}
function lM(e, t) {
  let n = e.stack;
  e.stack = [];
  let o = ta(e, t);
  e.stack = n;
  let a = o;
  return e.features & 2 ? a += ".values()" : a += "[Symbol.iterator]()", e.features & 4 ? a = "{[Symbol.iterator]:()=>" + a + "}" : e.features & 64 ? a = "{[Symbol.iterator](){return " + a + "}}" : a = "{[Symbol.iterator]:function(){return " + a + "}}", Co(e, t.i, t.d, a);
}
function xe(e, t) {
  switch (t.t) {
    case 0:
      return "" + t.s;
    case 1:
      return '"' + t.s + '"';
    case 2:
      return t.s ? "!0" : "!1";
    case 4:
      return "void 0";
    case 3:
      return "null";
    case 5:
      return "-0";
    case 6:
      return "1/0";
    case 7:
      return "-1/0";
    case 8:
      return "NaN";
    case 9:
      return t.s + "n";
    case 10:
      return se(e, t.i);
    case 15:
      return JR(e, t);
    case 16:
      return tM(e, t);
    case 17:
      return eM(e, t);
    case 11:
      return Se(e, t.i, 'new Date("' + t.s + '")');
    case 12:
      return Se(e, t.i, "/" + t.c + "/" + t.m);
    case 13:
      return oM(e, t);
    case 14:
      return nM(e, t);
    case 23:
    case 22:
      return rM(e, t);
    case 20:
      return aM(e, t);
    case 19:
      return sM(e, t);
    case 21:
      return lM(e, t);
    case 18:
      return iM(e, t);
    case 24:
      return TR[t.s];
    default:
      throw new Error("Unsupported type");
  }
}
function oa(e, t) {
  let n = t.length, o = new Array(n), a = new Array(n), s;
  for (let i = 0; i < n; i++)
    i in t && (s = t[i], Lt(s) ? a[i] = s : o[i] = De(e, s));
  for (let i = 0; i < n; i++)
    i in a && (o[i] = De(e, a[i]));
  return o;
}
function cM(e, t, n) {
  return { t: 15, i: t, s: void 0, l: n.length, c: void 0, m: void 0, d: void 0, a: oa(e, n), f: void 0 };
}
function uM(e, t, n) {
  Ue(e.features & 32, 'Unsupported type "Map"');
  let o = n.size, a = new Array(o), s = new Array(o), i = new Array(o), r = new Array(o), l = 0, u = 0;
  for (let [c, d] of n.entries())
    Lt(c) || Lt(d) ? (i[l] = c, r[l] = d, l++) : (a[u] = De(e, c), s[u] = De(e, d), u++);
  for (let c = 0; c < l; c++)
    a[u + c] = De(e, i[c]), s[u + c] = De(e, r[c]);
  return { t: 14, i: t, s: void 0, l: void 0, c: void 0, m: void 0, d: { k: a, v: s, s: o }, a: void 0, f: void 0 };
}
function dM(e, t, n) {
  Ue(e.features & 512, 'Unsupported type "Set"');
  let o = n.size, a = new Array(o), s = new Array(o), i = 0, r = 0;
  for (let l of n.keys())
    Lt(l) ? s[i++] = l : a[r++] = De(e, l);
  for (let l = 0; l < i; l++)
    a[r + l] = De(e, s[l]);
  return { t: 13, i: t, s: void 0, l: o, c: void 0, m: void 0, d: void 0, a, f: void 0 };
}
function xo(e, t) {
  let n = Object.keys(t), o = n.length, a = new Array(o), s = new Array(o), i = new Array(o), r = new Array(o), l = 0, u = 0, c;
  for (let d of n)
    c = t[d], Lt(c) ? (i[l] = d, r[l] = c, l++) : (a[u] = d, s[u] = De(e, c), u++);
  for (let d = 0; d < l; d++)
    a[u + d] = i[d], s[u + d] = De(e, r[d]);
  return { k: a, v: s, s: o };
}
function Cl(e, t, n) {
  Ue(e.features & 1024, 'Unsupported type "Iterable"');
  let o = HR(n), a = Array.from(n);
  return { t: 21, i: t, s: void 0, l: a.length, c: void 0, m: void 0, d: o ? xo(e, o) : void 0, a: oa(e, a), f: void 0 };
}
function dl(e, t, n, o) {
  return Symbol.iterator in n ? Cl(e, t, n) : { t: o ? 17 : 16, i: t, s: void 0, l: void 0, c: void 0, m: void 0, d: xo(e, n), a: void 0, f: void 0 };
}
function pl(e, t, n) {
  let o = Dl(e, n), a = o ? xo(e, o) : void 0;
  return { t: 20, i: t, s: void 0, l: n.errors.length, c: void 0, m: n.message, d: a, a: oa(e, n.errors), f: void 0 };
}
function wo(e, t, n) {
  let o = Dl(e, n), a = o ? xo(e, o) : void 0;
  return { t: 19, i: t, s: void 0, l: void 0, c: hl(n), m: n.message, d: a, a: void 0, f: void 0 };
}
function De(e, t) {
  switch (typeof t) {
    case "boolean":
      return t ? PR : jR;
    case "undefined":
      return AR;
    case "string":
      return NR(t);
    case "number":
      switch (t) {
        case 1 / 0:
          return MR;
        case -1 / 0:
          return zR;
        default:
          break;
      }
      return t !== t ? _R : Object.is(t, -0) ? RR : LR(t);
    case "bigint":
      return IR(e, t);
    case "object": {
      if (!t)
        return BR;
      let n = FR(e, t);
      if (e.markedRefs.has(n))
        return $R(n);
      if (Array.isArray(t))
        return cM(e, n, t);
      switch (t.constructor) {
        case Date:
          return OR(n, t);
        case RegExp:
          return UR(n, t);
        case Int8Array:
        case Int16Array:
        case Int32Array:
        case Uint8Array:
        case Uint16Array:
        case Uint32Array:
        case Uint8ClampedArray:
        case Float32Array:
        case Float64Array:
          return VR(e, n, t);
        case BigInt64Array:
        case BigUint64Array:
          return WR(e, n, t);
        case Map:
          return uM(e, n, t);
        case Set:
          return dM(e, n, t);
        case Object:
          return dl(e, n, t, false);
        case void 0:
          return dl(e, n, t, true);
        case AggregateError:
          return e.features & 1 ? pl(e, n, t) : wo(e, n, t);
        case Error:
        case EvalError:
        case RangeError:
        case ReferenceError:
        case SyntaxError:
        case TypeError:
        case URIError:
          return wo(e, n, t);
        default:
          break;
      }
      if (t instanceof AggregateError)
        return e.features & 1 ? pl(e, n, t) : wo(e, n, t);
      if (t instanceof Error)
        return wo(e, n, t);
      if (Symbol.iterator in t)
        return Cl(e, n, t);
      throw new Error("Unsupported type");
    }
    case "symbol":
      return Ue(e.features & 1024, 'Unsupported type "symbol"'), Ue(t in gl, "seroval only supports well-known symbols"), qR(t);
    default:
      throw new Error("Unsupported type");
  }
}
function pM(e, t) {
  let n = De(e, t), o = n.t === 16 || n.t === 21;
  return [n, ER(e, t), o];
}
function mM(e, t, n, o) {
  if (e.vars.length) {
    let a = KR(e), s = o;
    if (a) {
      let r = se(e, t);
      s = o + "," + a + r, o.startsWith(r + "=") || (s = r + "=" + s);
    }
    let i = e.vars.length > 1 ? e.vars.join(",") : e.vars[0];
    return e.features & 4 ? (i = e.vars.length > 1 || e.vars.length === 0 ? "(" + i + ")" : i, "(" + i + "=>(" + s + "))()") : "(function(" + i + "){return " + s + "})()";
  }
  return n ? "(" + o + ")" : o;
}
function xl(e, t) {
  let n = xR(t), [o, a, s] = pM(n, e), i = SR(n), r = xe(i, o);
  return mM(i, a, s, r);
}
var Nt;
var ml;
var ll;
var fl;
var cl;
var CR;
var TR;
var gl;
var PR;
var jR;
var AR;
var BR;
var RR;
var MR;
var zR;
var _R;
var ul;
var GR;
var Sl = p(() => {
  Nt = ((e) => (e[e.AggregateError = 1] = "AggregateError", e[e.ArrayPrototypeValues = 2] = "ArrayPrototypeValues", e[e.ArrowFunction = 4] = "ArrowFunction", e[e.BigInt = 8] = "BigInt", e[e.ErrorPrototypeStack = 16] = "ErrorPrototypeStack", e[e.Map = 32] = "Map", e[e.MethodShorthand = 64] = "MethodShorthand", e[e.ObjectAssign = 128] = "ObjectAssign", e[e.Promise = 256] = "Promise", e[e.Set = 512] = "Set", e[e.Symbol = 1024] = "Symbol", e[e.TypedArray = 2048] = "TypedArray", e[e.BigIntTypedArray = 4096] = "BigIntTypedArray", e))(Nt || {}), ml = "hjkmoquxzABCDEFGHIJKLNPQRTUVWXYZ$_", ll = ml.length, fl = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$_", cl = fl.length;
  CR = { disabledFeatures: 0 };
  TR = { [0]: "Symbol.asyncIterator", [1]: "Symbol.hasInstance", [2]: "Symbol.isConcatSpreadable", [3]: "Symbol.iterator", [4]: "Symbol.match", [5]: "Symbol.matchAll", [6]: "Symbol.replace", [7]: "Symbol.search", [8]: "Symbol.species", [9]: "Symbol.split", [10]: "Symbol.toPrimitive", [11]: "Symbol.toStringTag", [12]: "Symbol.unscopables" }, gl = { [Symbol.asyncIterator]: 0, [Symbol.hasInstance]: 1, [Symbol.isConcatSpreadable]: 2, [Symbol.iterator]: 3, [Symbol.match]: 4, [Symbol.matchAll]: 5, [Symbol.replace]: 6, [Symbol.search]: 7, [Symbol.species]: 8, [Symbol.split]: 9, [Symbol.toPrimitive]: 10, [Symbol.toStringTag]: 11, [Symbol.unscopables]: 12 }, PR = { t: 2, i: void 0, s: true, l: void 0, c: void 0, m: void 0, d: void 0, a: void 0, f: void 0 }, jR = { t: 2, i: void 0, s: false, l: void 0, c: void 0, m: void 0, d: void 0, a: void 0, f: void 0 }, AR = { t: 4, i: void 0, s: void 0, l: void 0, c: void 0, m: void 0, d: void 0, a: void 0, f: void 0 }, BR = { t: 3, i: void 0, s: void 0, l: void 0, c: void 0, m: void 0, d: void 0, a: void 0, f: void 0 }, RR = { t: 5, i: void 0, s: void 0, l: void 0, c: void 0, m: void 0, d: void 0, a: void 0, f: void 0 }, MR = { t: 6, i: void 0, s: void 0, l: void 0, c: void 0, m: void 0, d: void 0, a: void 0, f: void 0 }, zR = { t: 7, i: void 0, s: void 0, l: void 0, c: void 0, m: void 0, d: void 0, a: void 0, f: void 0 }, _R = { t: 8, i: void 0, s: void 0, l: void 0, c: void 0, m: void 0, d: void 0, a: void 0, f: void 0 };
  ul = 4104;
  GR = /^[$A-Z_][0-9A-Z_$]*$/i;
});
function El(e) {
  return xl(e, { disabledFeatures: vM });
}
function Fl(e, t = {}) {
  let n = "";
  ae.context = { id: t.renderId || "", count: 0, suspense: {}, lazy: {}, assets: [], nonce: t.nonce, writeResource(a, s, i) {
    if (!ae.context.noHydrate) {
      if (i)
        return n += `_$HY.set("${a}", ${El(s)});`;
      n += `_$HY.set("${a}", ${El(s)});`;
    }
  } };
  let o = al((a) => (setTimeout(a), It(f(e()))));
  return ae.context.noHydrate = true, o = CM(ae.context.assets, o), n.length && (o = xM(o, n, t.nonce)), o;
}
function R(e, ...t) {
  if (t.length) {
    let n = "";
    for (let o = 0; o < t.length; o++) {
      n += e[o];
      let a = t[o];
      a !== void 0 && (n += It(a));
    }
    e = n + e[t.length];
  }
  return { t: e };
}
function bM(e) {
  if (!e)
    return "";
  let t = Object.keys(e), n = "";
  for (let o = 0, a = t.length; o < a; o++) {
    let s = t[o], i = !!e[s];
    !s || s === "undefined" || !i || (o && (n += " "), n += f(s));
  }
  return n;
}
function wM(e) {
  if (!e)
    return "";
  if (typeof e == "string")
    return e;
  let t = "", n = Object.keys(e);
  for (let o = 0; o < n.length; o++) {
    let a = n[o], s = e[a];
    s != null && (o && (t += ";"), t += `${a}:${f(s, true)}`);
  }
  return t;
}
function $t(e, t, n, o) {
  t == null ? t = {} : typeof t == "function" && (t = t());
  let a = yM.test(e), s = Object.keys(t), i = `<${e}${o ? _() : ""} `, r;
  for (let l = 0; l < s.length; l++) {
    let u = s[l];
    if (hM.has(u)) {
      n === void 0 && !a && (n = u === "innerHTML" ? t[u] : f(t[u]));
      continue;
    }
    let c = t[u];
    if (u === "style")
      i += `style="${wM(c)}"`;
    else if (u === "class" || u === "className" || u === "classList") {
      if (r)
        continue;
      let d;
      i += `class="${f(((d = t.class) ? d + " " : "") + ((d = t.className) ? d + " " : ""), true) + bM(t.classList)}"`, r = true;
    } else if (gM.has(u))
      if (c)
        i += u;
      else
        continue;
    else {
      if (c == null || u === "ref" || u.slice(0, 2) === "on")
        continue;
      i += `${DM[u] || u}="${f(c, true)}"`;
    }
    l !== s.length - 1 && (i += " ");
  }
  return a ? { t: i + "/>" } : (typeof n == "function" && (n = n()), { t: i + `>${It(n, true)}</${e}>` });
}
function V(e, t, n) {
  return n ? t ? " " + e : "" : t != null ? ` ${e}="${t}"` : "";
}
function _() {
  let e = kM();
  return e ? ` data-hk="${e}"` : "";
}
function f(e, t) {
  let n = typeof e;
  if (n !== "string") {
    if (!t && n === "function")
      return f(e());
    if (!t && Array.isArray(e)) {
      for (let u = 0; u < e.length; u++)
        e[u] = f(e[u]);
      return e;
    }
    return t && n === "boolean" ? String(e) : e;
  }
  let o = t ? '"' : "<", a = t ? "&quot;" : "&lt;", s = e.indexOf(o), i = e.indexOf("&");
  if (s < 0 && i < 0)
    return e;
  let r = 0, l = "";
  for (; s >= 0 && i >= 0; )
    s < i ? (r < s && (l += e.substring(r, s)), l += a, r = s + 1, s = e.indexOf(o, r)) : (r < i && (l += e.substring(r, i)), l += "&amp;", r = i + 1, i = e.indexOf("&", r));
  if (s >= 0)
    do
      r < s && (l += e.substring(r, s)), l += a, r = s + 1, s = e.indexOf(o, r);
    while (s >= 0);
  else
    for (; i >= 0; )
      r < i && (l += e.substring(r, i)), l += "&amp;", r = i + 1, i = e.indexOf("&", r);
  return r < e.length ? l + e.substring(r) : l;
}
function It(e, t) {
  let n = typeof e;
  if (n === "string")
    return e;
  if (e == null || n === "boolean")
    return "";
  if (Array.isArray(e)) {
    let o = {}, a = "";
    for (let s = 0, i = e.length; s < i; s++)
      !t && typeof o != "object" && typeof e[s] != "object" && (a += "<!--!$-->"), a += It(o = e[s]);
    return a;
  }
  return n === "object" ? e.t : n === "function" ? It(e()) : String(e);
}
function kM() {
  let e = ae.context;
  return e && !e.noHydrate && `${e.id}${e.count++}`;
}
function CM(e, t) {
  if (!e || !e.length)
    return t;
  let n = "";
  for (let o = 0, a = e.length; o < a; o++)
    n += e[o]();
  return t.replace("</head>", n + "</head>");
}
function xM(e, t, n) {
  let o = `<script${n ? ` nonce="${n}"` : ""}>${t}<\/script>`, a = e.indexOf("<!--xs-->");
  return a > -1 ? e.slice(0, a) + o + e.slice(a) : e + o;
}
function So(e) {
  let [t, n] = ct(e, ["component"]), o = t.component, a = typeof o;
  if (o) {
    if (a === "function")
      return o(n);
    if (a === "string")
      return $t(o, n, void 0, true);
  }
}
var fM;
var gM;
var hM;
var DM;
var vM;
var yM;
var Ye;
var mt = p(() => {
  Me();
  Me();
  Sl();
  fM = ["allowfullscreen", "async", "autofocus", "autoplay", "checked", "controls", "default", "disabled", "formnovalidate", "hidden", "indeterminate", "ismap", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "seamless", "selected"], gM = new Set(fM), hM = /* @__PURE__ */ new Set(["innerHTML", "textContent", "innerText", "children"]), DM = Object.assign(/* @__PURE__ */ Object.create(null), { className: "class", htmlFor: "for" }), vM = Nt.AggregateError | Nt.BigInt | Nt.BigIntTypedArray;
  yM = /^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i;
  Ye = true;
});
function SM(e) {
  if (na.has(e))
    return na.get(e);
  let t = { c: 0, get id() {
    return "s" + this.c.toString();
  } };
  return na.set(e, t), t;
}
function EM(e) {
  let t = e.id;
  return e.c++, t;
}
function TM(e, t, n) {
  if (typeof e != "function")
    return false;
  let { html: o } = Tl.call(this, e, t, n);
  return typeof o == "string";
}
function Tl(e, t, { default: n, ...o }, a) {
  let s = a?.hydrate ? EM(SM(this.result)) : "", r = (a?.astroStaticSlot ? !!a.hydrate : true) ? "astro-slot" : "astro-static-slot", l = Fl(() => {
    let u = {};
    for (let [d, g] of Object.entries(o)) {
      let k = FM(d);
      u[k] = R(`<${r} name="${k}">${g}</${r}>`);
    }
    let c = { ...t, ...u, children: n != null ? R(`<${r}>${n}</${r}>`) : n };
    return S(e, c);
  }, { renderId: s });
  return { attrs: { "data-solid-render-id": s }, html: l };
}
var qI;
var YI;
var na;
var FM;
var PM;
var ge;
var Ke = p(() => {
  "use strict";
  Z();
  mt();
  G();
  qI = A(X(), 1);
  Q();
  ee();
  YI = A(te(), 1);
  oe();
  na = /* @__PURE__ */ new WeakMap();
  FM = (e) => e.trim().replace(/[-_]([a-z])/g, (t, n) => n.toUpperCase());
  PM = { check: TM, renderToStaticMarkup: Tl, supportsAstroStaticSlot: true }, ge = [Object.assign({ name: "astro:jsx", serverEntrypoint: "astro/jsx/server.js", jsxImportSource: "astro" }, { ssr: Gr }), Object.assign({ name: "@astrojs/solid-js", clientEntrypoint: "@astrojs/solid-js/client.js", serverEntrypoint: "@astrojs/solid-js/server.js", jsxImportSource: "solid-js" }, { ssr: PM })];
});
var Ee;
var ft = p(() => {
  "use strict";
  Ee = void 0;
});
function Pl(e) {
  return e != null && typeof e == "object" && (Object.getPrototypeOf(e) === Object.prototype || Array.isArray(e));
}
function Eo(e, t, n, o) {
  !o && e[t] === n || (n === void 0 ? delete e[t] : e[t] = n);
}
function jl(e, t, n) {
  let o = Object.keys(t);
  for (let a = 0; a < o.length; a += 1) {
    let s = o[a];
    Eo(e, s, t[s], n);
  }
}
function jM(e, t) {
  if (typeof t == "function" && (t = t(e)), Array.isArray(t)) {
    if (e === t)
      return;
    let n = 0, o = t.length;
    for (; n < o; n++) {
      let a = t[n];
      e[n] !== a && Eo(e, n, a);
    }
    Eo(e, "length", o);
  } else
    jl(e, t);
}
function Ot(e, t, n = []) {
  let o, a = e;
  if (t.length > 1) {
    o = t.shift();
    let i = typeof o, r = Array.isArray(e);
    if (Array.isArray(o)) {
      for (let l = 0; l < o.length; l++)
        Ot(e, [o[l]].concat(t), n);
      return;
    } else if (r && i === "function") {
      for (let l = 0; l < e.length; l++)
        o(e[l], l) && Ot(e, [l].concat(t), n);
      return;
    } else if (r && i === "object") {
      let { from: l = 0, to: u = e.length - 1, by: c = 1 } = o;
      for (let d = l; d <= u; d += c)
        Ot(e, [d].concat(t), n);
      return;
    } else if (t.length > 1) {
      Ot(e[o], t, [o].concat(n));
      return;
    }
    a = e[o], n = [o].concat(n);
  }
  let s = t[0];
  typeof s == "function" && (s = s(a, n), s === a) || o === void 0 && s == null || (o === void 0 || Pl(a) && Pl(s) && !Array.isArray(s) ? jl(a, s) : Eo(e, o, s));
}
function Fo(e) {
  let t = Array.isArray(e);
  function n(...o) {
    t && o.length === 1 ? jM(e, o[0]) : Ot(e, o);
  }
  return [e, n];
}
var XI;
var aa = p(() => {
  XI = Symbol("state-raw");
});
function sa(e, t, n) {
  let o = t.trim().split(".").reduce((a, s) => a ? a[s] : void 0, e);
  return o !== void 0 ? o : n;
}
var AM;
var Al;
var ia;
var To;
var ra = p(() => {
  Me();
  aa();
  AM = (e, t, n = /{{([^{}]+)}}/g) => e.replace(n, (o, a) => sa(t, a, "")), Al = (e = {}, t = typeof navigator < "u" && navigator.language in e ? navigator.language : Object.keys(e)[0] ?? "") => {
    let [n, o] = q(t), [a, s] = Fo(e);
    return [(l, u, c) => {
      let d = sa(a[n()], l, c || "");
      return typeof d == "function" ? d(u) : typeof d == "string" ? AM(d, u || {}) : d;
    }, { add(l, u) {
      s(l, (c) => Object.assign(c || {}, u));
    }, locale: (l) => l ? o(l) : n(), dict: (l) => sa(a, l) }];
  }, ia = Zn({}), To = () => rl(ia);
});
function ca(e) {
  return (...t) => {
    for (let n of e)
      n && n(...t);
  };
}
function ua(e) {
  return (...t) => {
    for (let n = e.length - 1; n >= 0; n--) {
      let o = e[n];
      o && o(...t);
    }
  };
}
function pa(e, ...t) {
  return typeof e == "function" ? e(...t) : e;
}
var Po;
var Bl;
var la;
var re;
var da;
var Rl = p(() => {
  Po = () => {
  }, Bl = (e) => e != null, la = (e) => e.filter(Bl);
  re = (e) => typeof e == "function" && !e.length ? e() : e, da = (e) => Array.isArray(e) ? e : e ? [e] : [];
});
var jo = p(() => {
  Rl();
});
function Ao() {
  return true;
}
function Ml(e) {
  let t = {}, n;
  for (; n = RM.exec(e); )
    t[n[1]] = n[2];
  return t;
}
function MM(e, t) {
  if (typeof e == "object" && typeof t == "object")
    return { ...e, ...t };
  if (typeof e == "string" && typeof t == "string")
    return `${e};${t}`;
  let n = typeof e == "object" ? e : Ml(e), o = typeof t == "object" ? t : Ml(t);
  return { ...n, ...o };
}
function zl(...e) {
  let t = Array.isArray(e[0]), n = t ? e[0] : e;
  if (n.length === 1)
    return n[0];
  let o = t && e[1]?.reverseEventHandlers ? ua : ca, a = {};
  for (let i of n) {
    let r = re(i);
    for (let l in r)
      if (l[0] === "o" && l[1] === "n" && l[2]) {
        let u = r[l], c = l.toLowerCase(), d = typeof u == "function" ? u : Array.isArray(u) ? u.length === 1 ? u[0] : u[0].bind(void 0, u[1]) : void 0;
        d ? a[c] ? a[c].push(d) : a[c] = [d] : delete a[c];
      }
  }
  let s = ie(...n);
  return new Proxy({ get(i) {
    if (typeof i != "string")
      return Reflect.get(s, i);
    if (i === "style")
      return fa(n, "style", MM);
    if (i === "ref") {
      let r = [];
      for (let l of n) {
        let u = re(l)[i];
        typeof u == "function" && r.push(u);
      }
      return o(r);
    }
    if (i[0] === "o" && i[1] === "n" && i[2]) {
      let r = a[i.toLowerCase()];
      return r ? o(r) : Reflect.get(s, i);
    }
    return i === "class" || i === "className" ? fa(n, i, (r, l) => `${r} ${l}`) : i === "classList" ? fa(n, i, (r, l) => ({ ...r, ...l })) : Reflect.get(s, i);
  }, has(i) {
    return Reflect.has(s, i);
  }, keys() {
    return Object.keys(s);
  } }, BM);
}
var BM;
var RM;
var fa;
var _l = p(() => {
  Me();
  jo();
  BM = { get(e, t, n) {
    return t === nl ? n : e.get(t);
  }, has(e, t) {
    return e.has(t);
  }, set: Ao, deleteProperty: Ao, getOwnPropertyDescriptor(e, t) {
    return { configurable: true, enumerable: true, get() {
      return e.get(t);
    }, set: Ao, deleteProperty: Ao };
  }, ownKeys(e) {
    return e.keys();
  } }, RM = /((?:--)?(?:\w+-?)+)\s*:\s*([^;]*)/g;
  fa = (e, t, n) => {
    let o;
    for (let a of e) {
      let s = re(a)[t];
      o ? s && (o = n(o, s)) : o = s;
    }
    return o;
  };
});
var Bo = {};
h(Bo, { default: () => zM, lang: () => zM });
var zM;
var Ro = p(() => {
  "use strict";
  zM = { about: "About", bibleSelection: "Bible Selection", chooseABook: "Choose a book of the Bible to watch here.", homePage: "Home", license: "License" };
});
var Mo = {};
h(Mo, { default: () => _M });
var _M;
var zo = p(() => {
  "use strict";
  _M = { about: "A propos", bibleSelection: "S\xE9lection de la Bible", chooseABook: "Choisissez un livre de la Bible \xE0 regarder ici.", homePage: "Page d'accueil", license: "Licence" };
});
var tn = {};
h(tn, { $: () => Fe, A: () => Ho, B: () => xa, C: () => Sa, D: () => Ko, E: () => Zt, F: () => Wt, G: () => Yo, H: () => Go, I: () => No, J: () => qo, K: () => nc, L: () => Lo, M: () => Oz, P: () => Ca, S: () => $o, _: () => Ze, a: () => Wo, b: () => ka, c: () => ht, d: () => Da, e: () => ba, f: () => va, g: () => Je, h: () => en, i: () => Gt, j: () => Xo, k: () => ya, l: () => Fa, m: () => Qo, n: () => Io, o: () => wa, p: () => Jo, q: () => Kt, r: () => Oo, s: () => ze, t: () => Yt, u: () => Uo, v: () => $, w: () => Ht, x: () => ve, y: () => Vo, z: () => qt });
function Kl(e) {
  let n = ie({ fillColor: "fill-surface", dotOne: "fill-primary", dotTwo: "fill-secondary", dotThree: "fill-tertiary" }, e);
  return R(IM, _(), V("class", f(n.fillColor, true), false), V("class", f(n.fillColor, true), false), V("class", f(n.dotOne, true), false), V("class", f(n.fillColor, true), false), V("class", f(n.dotTwo, true), false), V("class", f(n.fillColor, true), false), V("class", f(n.dotThree, true), false));
}
function ez(e) {
  R($M, _(), V("class", f(e.classNames, true) || "", false), "stroke:none;stroke-width:1;stroke-dasharray:none;stroke-linecap:butt;stroke-dashoffset:0;stroke-linejoin:miter;stroke-miterlimit:4;fill:#981414;fill-rule:nonzero;opacity:1");
}
function Zl(e) {
  return R(OM, _(), V("class", f(e.classNames, true) || "", false));
}
function tz(e) {
  return R(UM, _() + V("class", f(e.classNames, true) || "", false));
}
function Lo(e) {
  return R(VM, _(), `animate-spin ${f(e.classNames, true)}`);
}
function No(e) {
  return R(WM, _(), `${f(e.classNames, true)}`);
}
function Io(e) {
  return R(qM, _(), `${f(e.classNames, true)}`);
}
function $o(e) {
  return R(HM, _(), `${f(e.classNames, true)}`);
}
function Jl(e) {
  return R(GM, _(), V("class", f(e.classNames, true) || "", false));
}
function Xl(e) {
  return R(YM, _(), V("class", f(e.classNames, true) || "", false));
}
function Oo(e) {
  return R(KM, _(), V("class", f(e.classNames, true) || "", false));
}
function oz(e) {
  return R(ZM, _() + V("class", f(e.classNames, true) || "", false));
}
function Uo(e) {
  return $t("svg", ie({ xmlns: "http://www.w3.org/2000/svg", width: "1em", height: "1em", viewBox: "0 0 24 24" }, e), () => R(JM), true);
}
function Vo(e) {
  return $t("svg", ie({ xmlns: "http://www.w3.org/2000/svg", width: "1em", height: "1em", viewBox: "0 0 24 24" }, e), () => R(XM), true);
}
function Ql(e) {
  return $t("svg", ie({ get class() {
    return e.classNames || "";
  }, xmlns: "http://www.w3.org/2000/svg", width: "1em", height: "1em", viewBox: "0 0 24 24" }, e), () => R(QM), true);
}
function ec(e) {
  return R(az, _(), `left:${f(e.leftAmt, true)}%`);
}
function tc() {
  document.querySelectorAll('[data-role="chapterMarker"]').forEach((t) => {
    t.remove();
  });
}
function Il(e) {
  let t = e.normalize().toUpperCase();
  return iz[t];
}
function qo(e) {
  if (e)
    return Reflect.get(e, Symbol.for("runtime"));
  throw new Error("To retrieve the current cloudflare runtime you need to pass in the Astro request object");
}
function $l(e) {
  let t = Math.floor(e / 1e3), n = Math.floor(t / 3600), o = Math.floor(t % 3600 / 60), a = t % 60, s = "";
  return n > 0 && (s = `${n}:${o.toString().padStart(2, "0")}:${a.toString().padStart(2, "0")}`), n == 0 || o > 0 ? s = `${o.toString().padStart(2, "0")}:${a.toString().padStart(2, "0")}` : s = `0:${a.toString().padStart(2, "0")}`, s;
}
function rz(e) {
  return e.replace(/[\/|\\:*?"<>]/g, " ").replace(" ", "_");
}
function Ho(e) {
  if (!e)
    return "";
  let t = e.split(/(\d+)/).filter((n) => !!n);
  if (t.length > 1) {
    let n = ga(t[1]);
    return `${t[0]} ${n}`;
  } else
    return ga(e);
}
function ga(e) {
  return `${e.trim().slice(0, 1).toUpperCase()}${e.trim().slice(1).toLowerCase()}`;
}
function xa(e) {
  return e ? e.split("-").map((o) => ga(o)).join(" ") : "";
}
function Ol(e) {
  let [t, n] = e.split(":").map(Number), o = Number(e.split(".")[1]);
  return t * 60 + n + o / 1e3;
}
function Go(e, t) {
  let n = {};
  return e.forEach((o) => {
    let a = o[t];
    n[a] || (n[a] = []), n[a].push(o);
  }), n;
}
function Wt(e) {
  if (e.cookies.has("userPreferences"))
    return e.cookies.get("userPreferences").json();
}
function Je(e) {
  if (!e)
    return _o;
  let t = e.headers.get("Accept-Language");
  if (!t)
    return _o;
  let n = t.split(",").map((a) => a.split(";")[0]), o = _o;
  for (let a = 0; a < n.length; a++) {
    let s = n[a];
    if (oc.find((r) => r.code === s)) {
      o = s;
      break;
    } else
      continue;
  }
  return o;
}
function Yo(e) {
  let t = e.reduce((o, a) => (a.custom_fields?.book && a.custom_fields?.chapter ? o.matching.push(a) : o.notMatching.push(a), o), { matching: [], notMatching: [] }), n = t.matching.sort((o, a) => {
    let s = o.custom_fields?.book, i = a.custom_fields?.book;
    if (!s || !i)
      return 0;
    let r = Il(s), l = Il(i), u = Number(o.custom_fields?.chapter), c = Number(a.custom_fields?.chapter), d;
    return r == l ? d = u < c ? -1 : u == c ? 0 : 1 : d = r < l ? -1 : r == l ? 0 : 1, d;
  });
  return n.forEach((o, a) => {
    o.originalIdx = a, o.slugName = rz(String(o.name)), o.book = o.custom_fields?.book?.toUpperCase(), o.chapter = o.custom_fields?.chapter, o.localizedBookName = o.custom_fields?.localized_book_name || o.custom_fields?.book?.toUpperCase();
  }), { sortedVids: n, filteredByMatchingReferenceId: t };
}
function gt(e) {
  let t = e || "userPreferences", n = document.cookie.split(";")?.find((a) => a.replaceAll(" ", "").startsWith(t))?.split("=")?.[1];
  if (!n)
    return null;
  let o = null;
  try {
    o = JSON.parse(n);
  } catch (a) {
    console.error(a);
  }
  return o;
}
function Zo(e, t) {
  let n = t || "userPreferences", o = { expires: (/* @__PURE__ */ new Date("01-18-2038")).toUTCString(), path: "/", secure: true, sameSite: "strict" }, a = `${n}=${e};expires=${o.expires};` + o.path + +"secure;" + `sameSite=${o.sameSite};`;
  document.cookie = a;
}
function Jo({ e, vjsPlayer: t, increment: n, setJumpingBackAmount: o, setJumpingForwardAmount: a }) {
  let s = t.currentTime(), i = null;
  switch (e.key) {
    case "ArrowLeft":
      t.currentTime(s - n), o($l((s - n) * 1e3)), i && window.clearTimeout(i), i = window.setTimeout(() => {
        o(null);
      }, 250);
      break;
    case "ArrowRight":
      t.currentTime(s + n), a($l((s + n) * 1e3)), i && window.clearTimeout(i), i = window.setTimeout(() => {
        a(null);
      }, 250);
      break;
  }
}
function ac(e, t) {
  let n = document.querySelector("html"), o = gt() || {};
  if (e.matches) {
    n.classList.add("dark"), t(true);
    let a = gt();
    a && (a.prefersDark = true);
  } else {
    n.classList.remove("dark"), t(false);
    let a = gt();
    a && (a.prefersDark = false);
  }
  Zo(JSON.stringify(o).trim());
}
function lz(e) {
}
function sc(e, t) {
  let n = gt() || {};
  n[e] = t, Zo(JSON.stringify(n).trim());
}
function ic(e) {
  let t = ht();
  if (!e || !t)
    return;
  let n = t.find((o) => o.chapter == e);
  n && ze(n);
}
function Ht(e) {
  if (!$())
    return;
  $()?.pause(), ic(e.chapter);
  let t = e.sources.filter((n) => n.src.startsWith("https"));
  e.sources && $()?.src(t), e.poster && $()?.poster(e.poster), $()?.load(), $()?.one("loadedmetadata", () => {
    Gt(e);
  });
}
async function rc(e) {
  try {
    return await (await fetch(e)).text();
  } catch (t) {
    console.error(t);
    return;
  }
}
function cz(e) {
  let t = $();
  if (!t)
    return;
  let n = t.controlBar?.progressControl?.seekBar?.el();
  e.forEach((o) => {
    let a = S(ec, { get leftAmt() {
      return o.xPos;
    } });
    n.appendChild(a);
  });
}
async function Ea(e) {
  tc();
  let t = e.text_tracks?.find((r) => r.kind === "chapters");
  if (!t || !t.src || !t.sources) {
    ze("chapterMarkers", []);
    return;
  }
  let n = t.sources.find((r) => r.src?.startsWith("https"));
  if (!n || !n.src)
    return;
  if (e.chapterMarkers)
    return e.chapterMarkers;
  let o = $();
  if (!o)
    return;
  let a = await rc(n.src);
  if (!a) {
    ze("chapterMarkers", []);
    return;
  }
  let s = /(?:\d? ?\w+ ?\d*:)(\d+)-(\d+)/, i = a.split(`

`).filter((r) => r.includes("-->")).map((r) => {
    let l = r.split(`
`), u = l[0].split("-->"), c = Ol(u[0]), d = Ol(u[1]), g = o.duration(), k = l[1].match(s), D = String(c / g * 100);
    return { chapterStart: c, chapterEnd: d, label: l[1], startVerse: k ? k[1] : null, endVerse: k ? k[2] : null, xPos: D };
  });
  return ze("chapterMarkers", i), i;
}
async function Gt(e) {
  let t = await Ea(e);
  t && cz(t);
}
async function Xo(e, t) {
  let n = Number(t);
  if (!n)
    return;
  let o = await Ea(e);
  if (!o || !o.length)
    return;
  let a = o.find((s) => Number(s.startVerse) <= n && Number(s.endVerse) >= n);
  return a || null;
}
function lc(e) {
  let t = ve;
  if (!t || !t.chapterMarkers)
    return;
  let n = t.chapterMarkers.find((o) => e >= o.chapterStart && e < o.chapterEnd);
  if (n)
    return n.label;
}
function Yt() {
  nz();
  let e = Vt("NEXT"), t = Vt("PREV");
  return { next: e, prev: t };
}
function Vt(e) {
  let t = $(), n = ve;
  if (!t || !n)
    return;
  let o = t.currentTime();
  if (!(o !== 0 && !o)) {
    if (e == "NEXT")
      return n.chapterMarkers?.find((s) => s.chapterStart > o) || void 0;
    if (e == "PREV") {
      let a = n.chapterMarkers?.filter((i) => i.chapterStart + 3 < o);
      return !a || !a.length ? void 0 : a.reduce((i, r) => i.chapterEnd > r.chapterEnd ? i : r) || void 0;
    }
  }
}
function uz(e) {
  if (e == "NEXT") {
    let t = Vt("NEXT");
    t && $()?.currentTime(t.chapterStart);
  } else if (e == "PREV") {
    let t = Vt("PREV");
    t && $()?.currentTime(t.chapterStart);
  }
}
function dz(e) {
  Wo(e);
  let t = e[0];
  ze(t), Ht(t);
}
function mz({ type: e, val: t }) {
  if (e === "VID") {
    let n = Kt();
    if (!n || !n.length)
      return;
    let o = n.find((a) => String(a.size) === t);
    Ll((a) => ({ ...a, swPayload: [o] }));
  } else if (e === "BOOK") {
    let n = cc(t);
    if (!n || !n.length)
      return;
    Ll((o) => ({ ...o, swPayload: n }));
  }
}
function Fa() {
}
function fz(e) {
  let t = $();
  if (!t)
    return;
  let n = t.controlBar?.progressControl?.seekBar, o = document.querySelector(".vjs-progress-control .vjs-mouse-display"), a = n.calculateDistance(e), s = t.duration(), i = a * s, r = lc(i);
  Nl(r && o ? r : "");
}
function gz(e, t) {
}
function hz(e) {
  let t = $(), n = e.target;
  if (!t)
    return;
  t.playbackRate(Number(n.value));
  let o = gt() || {};
  o.playbackSpeed = String(n.value), Zo(JSON.stringify(o));
}
async function Dz(e) {
  return { response: null, isSaved: false };
}
function Qo(e, t) {
  if (!e)
    return;
  let n = document.querySelector('[data-js="chapterButtonTrack"]');
  n && (n.scrollWidth > e.width ? t(true) : t(false));
}
function en({ el: e, leftDoubleFxn: t, rightDoubleFxn: n, singleTapFxn: o, doubleTapUiClue: a }) {
  let s = 0, i, r = 0, l, u, c = 250, d = 50;
  function g(v) {
    let C = v.target, E = C && C.nodeName === "VIDEO";
    if (v.touches.length === 1 && E) {
      e.classList.add("vjs-user-active"), r = v.timeStamp;
      let P = v.touches[0], j = C.getBoundingClientRect();
      l = P.clientX - j.left;
      let x = j.width * 0.3, H = j.width * 0.7;
      s += 1, l <= x ? u = "LEFT" : l >= H && (u = "RIGHT");
    }
  }
  function k(v) {
    let C = v.timeStamp;
    s === 1 && C - r < d ? D() : s === 1 ? i = window.setTimeout(() => {
      o(), D();
    }, c) : s > 1 && (window.clearTimeout(i), a(u, s), i = window.setTimeout(() => {
      u === "LEFT" ? t(s) : u === "RIGHT" && n(s), D();
    }, c));
  }
  function D() {
    window.clearTimeout(i), s = 0, r = 0, u = null;
  }
  e.addEventListener("touchstart", (v) => g(v)), e.addEventListener("touchend", (v) => k(v));
}
function vz(e) {
  return Array.isArray(e);
}
function yz(e) {
  return Object.prototype.toString.call(e) === "[object String]";
}
function uc(e) {
  return typeof e == "function";
}
function bz(e, t) {
  return t && (uc(t) ? t(e) : t[0](t[1], e)), e?.defaultPrevented;
}
function wz(e, t) {
  return ie(e, t);
}
function Vl() {
  if (typeof window > "u")
    return;
  let e = (n) => {
    if (!n.target)
      return;
    let o = Ut.get(n.target);
    o || (o = /* @__PURE__ */ new Set(), Ut.set(n.target, o), n.target.addEventListener("transitioncancel", t)), o.add(n.propertyName);
  }, t = (n) => {
    if (!n.target)
      return;
    let o = Ut.get(n.target);
    if (o && (o.delete(n.propertyName), o.size === 0 && (n.target.removeEventListener("transitioncancel", t), Ut.delete(n.target)), Ut.size === 0)) {
      for (let a of Ul)
        a();
      Ul.clear();
    }
  };
  document.body.addEventListener("transitionrun", e), document.body.addEventListener("transitionend", t);
}
function kz(e) {
  let [t, n] = q(e.defaultValue?.()), o = Re(() => e.value?.() !== void 0), a = Re(() => o() ? e.value?.() : t());
  return [a, (i) => {
    sl(() => {
      let r = pa(i, a());
      return Object.is(r, a()) || (o() || n(r), e.onChange?.(r)), r;
    });
  }];
}
function Cz(e) {
  let [t, n] = kz(e);
  return [() => t() ?? false, n];
}
function xz(e, t) {
  let [n, o] = q(Wl(t?.()));
  return n;
}
function Wl(e) {
  return yz(e) ? e : void 0;
}
function Sz(e = {}) {
  let [t, n] = Cz({ value: () => re(e.isSelected), defaultValue: () => !!re(e.defaultIsSelected), onChange: (s) => e.onSelectedChange?.(s) });
  return { isSelected: t, setIsSelected: (s) => {
    !re(e.isReadOnly) && !re(e.isDisabled) && n(s);
  }, toggle: () => {
    !re(e.isReadOnly) && !re(e.isDisabled) && n(!t());
  } };
}
function dc(e) {
  let [t, n] = ct(e, ["asChild", "as", "children"]);
  if (!t.asChild)
    return S(So, ie({ get component() {
      return t.as;
    } }, n, { get children() {
      return t.children;
    } }));
  let o = bo(() => t.children);
  if (ql(o())) {
    let a = Hl(n, o()?.props ?? {});
    return S(So, a);
  }
  if (vz(o())) {
    let a = o().find(ql);
    if (a) {
      let s = () => S(ut, { get each() {
        return o();
      }, children: (r) => S(fe, { when: r === a, fallback: r, get children() {
        return a.props.children;
      } }) }), i = Hl(n, a?.props ?? {});
      return S(So, ie(i, { children: s }));
    }
  }
  throw new Error("[kobalte]: Component is expected to render `asChild` but no children `As` component was found.");
}
function Ez(e) {
  return { [pc]: true, props: e };
}
function ql(e) {
  return e?.[pc] === true;
}
function Hl(e, t) {
  return zl([e, t], { reverseEventHandlers: true });
}
function Tz(e) {
  let t = e.tagName.toLowerCase();
  return t === "button" ? true : t === "input" && e.type ? Fz.indexOf(e.type) !== -1 : false;
}
function mc(e) {
  let t;
  e = wz({ type: "button" }, e);
  let [n, o] = ct(e, ["ref", "type", "disabled"]), a = xz(() => t, () => "button"), s = Re(() => {
    let l = a();
    return l == null ? false : Tz({ tagName: l, type: n.type });
  }), i = Re(() => a() === "input"), r = Re(() => a() === "a" && t?.getAttribute("href") != null);
  return S(dc, ie({ as: "button", get type() {
    return s() || i() ? n.type : void 0;
  }, get role() {
    return !s() && !r() ? "button" : void 0;
  }, get tabIndex() {
    return !s() && !r() && !n.disabled ? 0 : void 0;
  }, get disabled() {
    return s() || i() ? n.disabled : void 0;
  }, get ["aria-disabled"]() {
    return !s() && !i() && n.disabled ? true : void 0;
  }, get ["data-disabled"]() {
    return n.disabled ? "" : void 0;
  } }, o));
}
function ha(e) {
  let [t, n] = ct(e, ["children", "pressed", "defaultPressed", "onChange", "onClick"]), o = Sz({ isSelected: () => t.pressed, defaultIsSelected: () => t.defaultPressed, onSelectedChange: (s) => t.onChange?.(s), isDisabled: () => n.disabled }), a = (s) => {
    bz(s, t.onClick), o.toggle();
  };
  return S(mc, ie({ get ["aria-pressed"]() {
    return o.isSelected();
  }, get ["data-pressed"]() {
    return o.isSelected() ? "" : void 0;
  }, onClick: a }, n, { get children() {
    return S(Pz, { get state() {
      return { pressed: o.isSelected };
    }, get children() {
      return t.children;
    } });
  } }));
}
function Pz(e) {
  return bo(() => {
    let n = e.children;
    return uc(n) ? n(e.state) : n;
  })();
}
function Zt(e) {
  let t = Al(e.initialDict, e.locale);
  return S(ia.Provider, { value: t, get children() {
    return e.children;
  } });
}
function fc(e) {
  return S(Rz, { get locale() {
    return e.locale;
  }, get initialDict() {
    return e.initialDict;
  }, get children() {
    return S(Mz, e);
  } });
}
function Rz(e) {
  return S(Zt, { get locale() {
    return e.locale;
  }, get initialDict() {
    return e.initialDict;
  }, get children() {
    return e.children;
  } });
}
function Mz(e) {
  let [t, n] = q(!!e.prefersDark), [o, a] = q(false), [s] = To();
  function i(r) {
    let l = document.querySelector("html");
    n(r), r ? (l.classList.add("dark"), l.classList.remove("light")) : (l.classList.remove("dark"), l.classList.add("light")), sc("prefersDark", r);
  }
  return R(Bz, _(), `${f(qt, true)} py-2 flex justify-between items-center relative`, f(S(Kl, {})), f(S(ha, { class: "toggle-button", "aria-label": "Light Mode or Dark Mode", get isPressed() {
    return t();
  }, onChange: (r) => i(r), get children() {
    return S(fe, { get when() {
      return t();
    }, get fallback() {
      return S(Jl, {});
    }, get children() {
      return S(Xl, {});
    } });
  } })), f(S(ha, { get isPressed() {
    return o();
  }, onChange: () => a(!o()), get children() {
    return S(Zl, { classNames: "w-8" });
  } })), f(S(fe, { get when() {
    return o();
  }, get children() {
    return R(jz, _());
  } })), `w-full max-w-md  z-40 bg-white absolute right-0 top-0 transform transition-250 translate-x-full p-4 h-full fixed rounded-md dark:bg-[#181817] ${o() ? "translate-x-0" : ""}`, f(S(Ql, {})), f(S(fe, { get when() {
    return e.initialPath != "/";
  }, get children() {
    return R(Az, _(), f(s("homePage", void 0, "Home")));
  } })), f(s("license", void 0, "License")), f(s("about", void 0, "About")));
}
var Ze;
var IM;
var $M;
var OM;
var UM;
var VM;
var WM;
var qM;
var HM;
var GM;
var YM;
var KM;
var ZM;
var JM;
var XM;
var QM;
var U$;
var Ll;
var ve;
var ze;
var V$;
var Da;
var nz;
var va;
var ht;
var Wo;
var ya;
var Nl;
var $;
var ba;
var wa;
var ka;
var az;
var sz;
var iz;
var Ca;
var oc;
var _o;
var nc;
var Sa;
var qt;
var Ko;
var cc;
var pz;
var Kt;
var Ut;
var Ul;
var pc;
var Fz;
var jz;
var Az;
var Bz;
var Gl;
var zz;
var _z;
var Yl;
var Lz;
var Fe;
var Nz;
var gc;
var Iz;
var $z;
var Oz;
var Xe = p(() => {
  "use strict";
  G();
  Z();
  mt();
  Me();
  aa();
  ra();
  jo();
  _l();
  Ze = (e, t) => {
    let n = e[t];
    return n ? typeof n == "function" ? n() : Promise.resolve(n) : new Promise((o, a) => {
      (typeof queueMicrotask == "function" ? queueMicrotask : setTimeout)(a.bind(null, new Error("Unknown variable dynamic import: " + t)));
    });
  }, IM = ["<svg", ' class="" viewBox="0 0 102 30" xml-space="preserve" xmlns="http://www.w3.org/2000/svg" fill="black"><path', ' d="M0 0h-4.555c-3.314.003-6.628.054-9.942.001-5.839-.095-11.255-5.606-11.261-11.4-.004-4.35.032-8.7-.011-13.05-.02-2.071.476-3.965 1.599-5.688 2.521-3.868 6.133-6.12 10.712-6.015 6.267.144 11.945 5.912 11.93 12.56-.011 5.109-.011 10.219-.073 15.328-.027 2.235.155 4.394 1.185 6.433C-.163-1.33-.152-.706 0 0m52.84-7.983c.286-.483.401-.821.629-1.041 3.173-3.071 6.38-6.107 9.543-9.188 4.435-4.319 10.755-4.879 15.389-.847 3.896 3.391 7.536 7.124 10.951 11.003 2.07 2.352 3.128 5.392 2.41 8.682-.684 3.129-2.189 5.836-4.763 7.794-3.062 2.329-6.447 3.28-10.311 2.213-2.704-.746-4.852-2.276-6.784-4.193A2560.187 2560.187 0 0 1 59.35-4.109c-1.585-1.593-3.336-2.892-5.583-3.393-.251-.056-.473-.241-.927-.481m-78.508 40.197c.362-.03.716-.147 1.023-.071 3.702.921 7.443 1.375 11.266 1.171 1.471-.078 1.685.243 1.683 1.894-.023 16.712-.045 33.424-.079 50.136-.001.755.003 1.54-.19 2.258-1.846 6.845-10.137 11.937-17.426 5.644a17 17 0 0 1-1.612-1.609c-.919-1.04-.901-1.285.03-2.23 3.458-3.507 5.269-7.722 5.256-12.648-.04-14.568-.127-29.136-.184-43.704-.001-.259.14-.518.233-.841m-20.781-11.843c.854.476 1.339.613 1.632.929 2.772 2.982 6.132 5.223 9.739 6.925 2.487 1.174 3.261 2.497 3.222 5.281-.197 14.022-.089 28.048-.12 42.072a21.25 21.25 0 0 1-.381 3.905c-1.063 5.592-7.334 9.416-12.769 7.939-3.131-.851-5.373-2.692-6.931-5.485-1.154-2.067-1.104-2.279.561-3.842 3.618-3.395 5.334-7.636 5.397-12.565.019-1.45-.055-2.9-.056-4.35-.01-12.228-.007-24.457-.03-36.685-.002-1.211-.151-2.421-.264-4.124M70.905-54.8c-.91.069-1.245.131-1.577.115a30.368 30.368 0 0 0-13.334 2.323c-1.169.486-1.887.233-2.719-.622-3.562-3.657-7.176-7.264-10.781-10.879-7.064-7.085-14.136-14.161-21.203-21.243-1.686-1.69-3.07-3.603-3.437-6.003-.678-4.447.951-8.04 4.564-10.613 3.579-2.55 7.015-2.717 10.692-.759.843.448 1.188.989 1.043 1.98-.47 3.19.282 6.23 1.783 8.977 1.007 1.845 2.41 3.545 3.906 5.039 9.957 9.944 19.991 19.81 29.976 29.726.422.419.609 1.077 1.087 1.959m-22.521 5.695c-.28.267-.442.503-.667.621a31.96 31.96 0 0 0-9.191 7.285c-.953 1.09-1.229 1.051-2.313-.041C29.506-48 22.807-54.768 16.089-61.517A4481.231 4481.231 0 0 0 1.297-76.298c-1.902-1.894-3.345-4.048-3.754-6.744-1.118-7.353 6.01-12.832 11.422-12.172 2.38.291 2.64.348 2.709 2.641.135 4.475 1.695 8.345 4.847 11.533 1.648 1.666 3.389 3.24 5.05 4.894 8.657 8.618 17.303 17.247 25.944 25.881.322.322.554.734.869 1.16M-51.76-.482l-.64.078c.046 1.058.126 2.115.134 3.172.044 5.867.102 11.735.095 17.602-.013 10.357-.073 20.714-.104 31.072-.013 4.627.084 9.257-.052 13.881-.048 1.613-.37 3.34-1.048 4.79-2.089 4.472-7.164 6.924-11.667 5.887-5.093-1.172-8.51-5.377-8.521-10.58-.021-10.084.001-20.167-.011-30.251-.026-22.378-.093-44.756-.052-67.134.005-2.811.379-5.653.891-8.423 1.286-6.952 4.087-13.3 8.143-19.087 5.576-7.957 12.904-13.757 21.831-17.52 6.445-2.717 13.182-3.911 20.19-3.765 4.601.097 9.036.932 13.406 2.298 1.271.397 2.095 1.194 2.811 2.275.834 1.257 1.708 2.527 2.767 3.59a6085.926 6085.926 0 0 0 25.811 25.759c1.174 1.166 1.985 2.488 2.208 4.115.524 3.824.951 7.662 1.513 11.48.239 1.618-.32 2.764-1.446 3.857-2.627 2.548-5.165 5.187-7.765 7.764-5.07 5.023-6.507 14.164-2.065 20.585.313.452.455 1.023.734 1.673-2.325.462-3.964-.48-5.525-1.455C6.365-1.014 4.347-4.11 4.375-8.388c.035-5.18.009-10.361.021-15.541.026-11.141-9.748-19.699-20.754-18.064-8.715 1.295-15.107 8.052-15.575 16.786-.144 2.682-.072 5.376-.068 8.065.003 2.344-.147 4.71.113 7.028.767 6.859 4.985 13.023 12.411 15.308 2.814.866 5.682.937 8.595.916 9.043-.064 18.088.019 27.131-.091 2.231-.027 4.199.488 6.123 1.492 4.024 2.1 6.476 7.11 5.505 11.311-1.135 4.916-5.788 8.628-10.846 8.629-10.773.001-21.547-.008-32.321-.017-.551-.001-1.108-.006-1.653-.076-6.581-.846-12.837-2.632-18.385-6.431-7.073-4.845-12.489-11.017-15.397-19.208-.27-.76-.686-1.469-1.035-2.201M90.208-44.087l.364-.432c-1.316-1.292-2.644-2.572-3.945-3.88C75.426-59.66 64.23-70.928 53.032-82.193c-3.263-3.281-6.562-6.526-9.781-9.85-4.004-4.136-4.04-9.023-.823-13.53 2.443-3.423 7.349-5.017 11.374-3.796 2.117.641 3.802 1.898 5.336 3.433 9.423 9.427 18.845 18.855 28.284 28.265 13.106 13.068 26.254 26.093 39.329 39.192 5.742 5.752 9.993 12.466 12.425 20.278 2.031 6.523 3.029 13.128 2.175 19.987-.55 4.414-1.481 8.717-3.133 12.823-3.331 8.281-8.328 15.357-15.413 20.92-5.848 4.592-12.333 7.81-19.552 9.541-5.417 1.298-10.907 1.593-16.45 1.057a46.903 46.903 0 0 1-12.832-3.077c-6.964-2.761-13.026-6.865-18.265-12.243-5.012-5.144-10.143-10.172-15.223-15.25-2.208-2.207-3.444-4.883-3.304-7.99.199-4.418 2.625-7.514 6.509-9.354 3.958-1.875 7.749-1.186 10.928 1.756 3.698 3.421 7.323 6.937 10.77 10.609 4.594 4.894 10.113 6.986 16.739 6.226 4.662-.535 8.526-2.573 11.554-6.198 5.756-6.89 5.609-17.886-1.073-24.562-2.833-2.831-5.657-5.672-8.504-8.489-2.203-2.178-4.789-3.906-7.778-4.557-6.963-1.514-13.275-.264-18.484 5.035-6.439 6.55-12.958 13.022-19.455 19.515-1.024 1.024-2.028 2.099-3.188 2.95-3.447 2.531-7.229 3.205-11.062 1.084-4.032-2.232-6.366-5.654-6.052-10.478.17-2.621 1.501-4.688 3.305-6.495 7.565-7.574 15.087-15.191 22.726-22.689 1.857-1.822 3.996-3.416 6.19-4.826 8.243-5.298 17.318-7.031 26.947-5.651 4.097.587 8.113 1.683 11.693 3.945.38.24.84.353 1.264.525M-8.723-84.715c-.77-.162-1.178-.212-1.564-.334-3.993-1.26-8.098-1.604-12.262-1.633-4.567-.032-9.096.133-13.577 1.169-6.309 1.458-12.224 3.76-17.705 7.271-11.462 7.341-19.137 17.559-23.356 30.409-1.183 3.601-2.006 7.314-2.078 11.156-.063 3.306-.348 6.61-.352 9.915-.039 30.047-.039 60.094-.047 90.142-.001 1.918-.219 3.818.214 5.751 1.569 6.997 6.018 11.204 12.744 13.002 1.94.518 4.128.295 6.182.136 1.473-.114 1.829.185 2.306 1.384 3.007 7.561 10.916 11.752 18.801 9.94 1.363-.313 2.155-.045 2.947 1.102 3.11 4.502 7.322 7.251 12.874 7.675 3.546.271 6.877-.554 9.896-2.386 4.223-2.564 6.831-6.352 7.939-11.159.153-.663.178-1.368.177-2.053-.009-7.944-.018-15.887-.06-23.831-.049-9.176-.131-18.352-.2-27.528-.014-1.838.289-2.122 2.167-2.111 7.316.042 14.634.203 21.946.073 6.576-.117 11.102-3.686 14.09-9.325.825-1.558 1.651-3.213 1.262-5.129-.042-.208.197-.474.385-.887.465.32.88.523 1.188.832 6.434 6.453 12.709 13.073 19.323 19.335 5.73 5.426 12.562 9.136 20.123 11.551 10.912 3.485 21.859 3.633 32.83.559 8.724-2.444 16.35-6.876 22.913-13.181 6.871-6.6 11.846-14.368 14.642-23.454.969-3.149 1.579-6.443 1.993-9.716.423-3.338.719-6.752.505-10.096-.36-5.651-1.332-11.243-3.396-16.569-2.415-6.229-5.677-11.983-10.102-17.004-2.326-2.639-4.86-5.096-7.347-7.589a51383.997 51383.997 0 0 0-49.491-49.556 1288.346 1288.346 0 0 0-14.757-14.538c-6.151-5.955-16.253-6.191-22.686-.545-.973.854-1.731 1.958-2.556 2.974-1.017 1.252-1.169 1.297-2.544.502-2.126-1.229-4.519-1.32-6.83-1.252-6.019.177-10.697 2.873-13.879 8.042-.444.72-.788 1.442-1.907 1.068-3.805-1.271-7.498-.664-11.062.913-4.892 2.163-7.776 6.043-9.129 11.117-.312 1.169-.358 2.41-.56 3.858" transform="matrix(.11704 0 0 -.11704 9.33 11.988)"></path><path', ' d="M0 0c30.343 0 49.988 18.478 49.988 46.681 0 28.203-19.645 46.681-49.988 46.681h-33.065V0Zm-58.351 114.757H1.167c44.153 0 74.301-27.231 74.301-68.076 0-40.846-30.148-68.077-74.301-68.077h-59.518z" transform="matrix(.11704 0 0 -.11704 41.888 18.476)"></path><path', ' d="M0 0c0 9.726 7.196 16.144 15.949 16.144S31.898 9.726 31.898 0c0-9.336-7.196-16.144-15.949-16.144S0-9.336 0 0" transform="matrix(.11704 0 0 -.11704 52.177 19.25)"></path><path', ' d="M0 0c0 27.814-20.423 47.848-47.849 47.848-27.424 0-47.847-20.034-47.847-47.848 0-27.813 20.423-47.848 47.847-47.848C-20.423-47.848 0-27.813 0 0m-121.176 0c0 40.262 31.12 70.021 73.327 70.021 42.208 0 73.328-29.564 73.328-70.021s-31.12-70.021-73.328-70.021c-42.207 0-73.327 29.759-73.327 70.021" transform="matrix(.11704 0 0 -.11704 71.55 13.013)"></path><path', ' d="M0 0c0 9.726 7.196 16.144 15.949 16.144S31.898 9.726 31.898 0c0-9.336-7.196-16.144-15.949-16.144S0-9.336 0 0" transform="matrix(.11704 0 0 -.11704 75.99 19.25)"></path><path', ' d="M0 0h-45.125v21.396H70.41V0H25.285v-114.757H0Z" transform="matrix(.11704 0 0 -.11704 85.277 7.549)"></path><path', ' d="M0 0c0 9.726 7.196 16.144 15.949 16.144S31.898 9.726 31.898 0c0-9.336-7.196-16.144-15.949-16.144S0-9.336 0 0" transform="matrix(.11704 0 0 -.11704 93.79 19.25)"></path></svg>'], $M = ["<svg", ' xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="5.07 5.07 1080 1080" xml-space="preserve"', '><g transform="matrix(1.35 0 0 -1.35 540 540)" clip-path="url(#a)"><clipPath id="a"><path transform="translate(-656.26 -541.37)" d="M0 1080h1920V0H0Z" stroke-linecap="round"></path></clipPath><path style="', '" vector-effect="non-scaling-stroke" transform="translate(-33.94 6.8)" d="M0 0h-4.555c-3.314.003-6.628.054-9.942.001-5.839-.095-11.255-5.606-11.261-11.4-.004-4.35.032-8.7-.011-13.05-.02-2.071.476-3.965 1.599-5.688 2.521-3.868 6.133-6.12 10.712-6.015 6.267.144 11.945 5.912 11.93 12.56-.011 5.109-.011 10.219-.073 15.328-.027 2.235.155 4.394 1.185 6.433C-.163-1.33-.152-.706 0 0m52.84-7.983c.286-.483.401-.821.629-1.041 3.173-3.071 6.38-6.107 9.543-9.188 4.435-4.319 10.755-4.879 15.389-.847 3.896 3.391 7.536 7.124 10.951 11.003 2.07 2.352 3.128 5.392 2.41 8.682-.684 3.129-2.189 5.836-4.763 7.794-3.062 2.329-6.447 3.28-10.311 2.213-2.704-.746-4.852-2.276-6.784-4.193A2560.187 2560.187 0 0 1 59.35-4.109c-1.585-1.593-3.336-2.892-5.583-3.393-.251-.056-.473-.241-.927-.481m-78.508 40.197c.362-.03.716-.147 1.023-.071 3.702.921 7.443 1.375 11.266 1.171 1.471-.078 1.685.243 1.683 1.894-.023 16.712-.045 33.424-.079 50.136-.001.755.003 1.54-.19 2.258-1.846 6.845-10.137 11.937-17.426 5.644a17 17 0 0 1-1.612-1.609c-.919-1.04-.901-1.285.03-2.23 3.458-3.507 5.269-7.722 5.256-12.648-.04-14.568-.127-29.136-.184-43.704-.001-.259.14-.518.233-.841m-20.781-11.843c.854.476 1.339.613 1.632.929 2.772 2.982 6.132 5.223 9.739 6.925 2.487 1.174 3.261 2.497 3.222 5.281-.197 14.022-.089 28.048-.12 42.072a21.25 21.25 0 0 1-.381 3.905c-1.063 5.592-7.334 9.416-12.769 7.939-3.131-.851-5.373-2.692-6.931-5.485-1.154-2.067-1.104-2.279.561-3.842 3.618-3.395 5.334-7.636 5.397-12.565.019-1.45-.055-2.9-.056-4.35-.01-12.228-.007-24.457-.03-36.685-.002-1.211-.151-2.421-.264-4.124M70.905-54.8c-.91.069-1.245.131-1.577.115a30.368 30.368 0 0 0-13.334 2.323c-1.169.486-1.887.233-2.719-.622-3.562-3.657-7.176-7.264-10.781-10.879-7.064-7.085-14.136-14.161-21.203-21.243-1.686-1.69-3.07-3.603-3.437-6.003-.678-4.447.951-8.04 4.564-10.613 3.579-2.55 7.015-2.717 10.692-.759.843.448 1.188.989 1.043 1.98-.47 3.19.282 6.23 1.783 8.977 1.007 1.845 2.41 3.545 3.906 5.039 9.957 9.944 19.991 19.81 29.976 29.726.422.419.609 1.077 1.087 1.959m-22.521 5.695c-.28.267-.442.503-.667.621a31.96 31.96 0 0 0-9.191 7.285c-.953 1.09-1.229 1.051-2.313-.041C29.506-48 22.807-54.768 16.089-61.517A4481.231 4481.231 0 0 0 1.297-76.298c-1.902-1.894-3.345-4.048-3.754-6.744-1.118-7.353 6.01-12.832 11.422-12.172 2.38.291 2.64.348 2.709 2.641.135 4.475 1.695 8.345 4.847 11.533 1.648 1.666 3.389 3.24 5.05 4.894 8.657 8.618 17.303 17.247 25.944 25.881.322.322.554.734.869 1.16M-51.76-.482l-.64.078c.046 1.058.126 2.115.134 3.172.044 5.867.102 11.735.095 17.602-.013 10.357-.073 20.714-.104 31.072-.013 4.627.084 9.257-.052 13.881-.048 1.613-.37 3.34-1.048 4.79-2.089 4.472-7.164 6.924-11.667 5.887-5.093-1.172-8.51-5.377-8.521-10.58-.021-10.084.001-20.167-.011-30.251-.026-22.378-.093-44.756-.052-67.134.005-2.811.379-5.653.891-8.423 1.286-6.952 4.087-13.3 8.143-19.087 5.576-7.957 12.904-13.757 21.831-17.52 6.445-2.717 13.182-3.911 20.19-3.765 4.601.097 9.036.932 13.406 2.298 1.271.397 2.095 1.194 2.811 2.275.834 1.257 1.708 2.527 2.767 3.59a6085.926 6085.926 0 0 0 25.811 25.759c1.174 1.166 1.985 2.488 2.208 4.115.524 3.824.951 7.662 1.513 11.48.239 1.618-.32 2.764-1.446 3.857-2.627 2.548-5.165 5.187-7.765 7.764-5.07 5.023-6.507 14.164-2.065 20.585.313.452.455 1.023.734 1.673-2.325.462-3.964-.48-5.525-1.455C6.365-1.014 4.347-4.11 4.375-8.388c.035-5.18.009-10.361.021-15.541.026-11.141-9.748-19.699-20.754-18.064-8.715 1.295-15.107 8.052-15.575 16.786-.144 2.682-.072 5.376-.068 8.065.003 2.344-.147 4.71.113 7.028.767 6.859 4.985 13.023 12.411 15.308 2.814.866 5.682.937 8.595.916 9.043-.064 18.088.019 27.131-.091 2.231-.027 4.199.488 6.123 1.492 4.024 2.1 6.476 7.11 5.505 11.311-1.135 4.916-5.788 8.628-10.846 8.629-10.773.001-21.547-.008-32.321-.017-.551-.001-1.108-.006-1.653-.076-6.581-.846-12.837-2.632-18.385-6.431-7.073-4.845-12.489-11.017-15.397-19.208-.27-.76-.686-1.469-1.035-2.201M90.208-44.087l.364-.432c-1.316-1.292-2.644-2.572-3.945-3.88C75.426-59.66 64.23-70.928 53.032-82.193c-3.263-3.281-6.562-6.526-9.781-9.85-4.004-4.136-4.04-9.023-.823-13.53 2.443-3.423 7.349-5.017 11.374-3.796 2.117.641 3.802 1.898 5.336 3.433 9.423 9.427 18.845 18.855 28.284 28.265 13.106 13.068 26.254 26.093 39.329 39.192 5.742 5.752 9.993 12.466 12.425 20.278 2.031 6.523 3.029 13.128 2.175 19.987-.55 4.414-1.481 8.717-3.133 12.823-3.331 8.281-8.328 15.357-15.413 20.92-5.848 4.592-12.333 7.81-19.552 9.541-5.417 1.298-10.907 1.593-16.45 1.057a46.903 46.903 0 0 1-12.832-3.077c-6.964-2.761-13.026-6.865-18.265-12.243-5.012-5.144-10.143-10.172-15.223-15.25-2.208-2.207-3.444-4.883-3.304-7.99.199-4.418 2.625-7.514 6.509-9.354 3.958-1.875 7.749-1.186 10.928 1.756 3.698 3.421 7.323 6.937 10.77 10.609 4.594 4.894 10.113 6.986 16.739 6.226 4.662-.535 8.526-2.573 11.554-6.198 5.756-6.89 5.609-17.886-1.073-24.562-2.833-2.831-5.657-5.672-8.504-8.489-2.203-2.178-4.789-3.906-7.778-4.557-6.963-1.514-13.275-.264-18.484 5.035-6.439 6.55-12.958 13.022-19.455 19.515-1.024 1.024-2.028 2.099-3.188 2.95-3.447 2.531-7.229 3.205-11.062 1.084-4.032-2.232-6.366-5.654-6.052-10.478.17-2.621 1.501-4.688 3.305-6.495 7.565-7.574 15.087-15.191 22.726-22.689 1.857-1.822 3.996-3.416 6.19-4.826 8.243-5.298 17.318-7.031 26.947-5.651 4.097.587 8.113 1.683 11.693 3.945.38.24.84.353 1.264.525M-8.723-84.715c-.77-.162-1.178-.212-1.564-.334-3.993-1.26-8.098-1.604-12.262-1.633-4.567-.032-9.096.133-13.577 1.169-6.309 1.458-12.224 3.76-17.705 7.271-11.462 7.341-19.137 17.559-23.356 30.409-1.183 3.601-2.006 7.314-2.078 11.156-.063 3.306-.348 6.61-.352 9.915-.039 30.047-.039 60.094-.047 90.142-.001 1.918-.219 3.818.214 5.751 1.569 6.997 6.018 11.204 12.744 13.002 1.94.518 4.128.295 6.182.136 1.473-.114 1.829.185 2.306 1.384 3.007 7.561 10.916 11.752 18.801 9.94 1.363-.313 2.155-.045 2.947 1.102 3.11 4.502 7.322 7.251 12.874 7.675 3.546.271 6.877-.554 9.896-2.386 4.223-2.564 6.831-6.352 7.939-11.159.153-.663.178-1.368.177-2.053-.009-7.944-.018-15.887-.06-23.831-.049-9.176-.131-18.352-.2-27.528-.014-1.838.289-2.122 2.167-2.111 7.316.042 14.634.203 21.946.073 6.576-.117 11.102-3.686 14.09-9.325.825-1.558 1.651-3.213 1.262-5.129-.042-.208.197-.474.385-.887.465.32.88.523 1.188.832 6.434 6.453 12.709 13.073 19.323 19.335 5.73 5.426 12.562 9.136 20.123 11.551 10.912 3.485 21.859 3.633 32.83.559 8.724-2.444 16.35-6.876 22.913-13.181 6.871-6.6 11.846-14.368 14.642-23.454.969-3.149 1.579-6.443 1.993-9.716.423-3.338.719-6.752.505-10.096-.36-5.651-1.332-11.243-3.396-16.569-2.415-6.229-5.677-11.983-10.102-17.004-2.326-2.639-4.86-5.096-7.347-7.589a51383.997 51383.997 0 0 0-49.491-49.556 1288.346 1288.346 0 0 0-14.757-14.538c-6.151-5.955-16.253-6.191-22.686-.545-.973.854-1.731 1.958-2.556 2.974-1.017 1.252-1.169 1.297-2.544.502-2.126-1.229-4.519-1.32-6.83-1.252-6.019.177-10.697 2.873-13.879 8.042-.444.72-.788 1.442-1.907 1.068-3.805-1.271-7.498-.664-11.062.913-4.892 2.163-7.776 6.043-9.129 11.117-.312 1.169-.358 2.41-.56 3.858"></path></g></svg>'], OM = ["<svg", ' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"', '><path fill="currentColor" d="M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2Z"></path></svg>'], UM = ["<svg", ' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M10 16.5v-9l6 4.5M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2Z"></path></svg>'], VM = ["<svg", ' class="', '" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>'], WM = ["<svg", ' xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" class="', '"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 5v14L8 12zM4 5v14"></path></svg>'], qM = ["<svg", ' xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" class="', '"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5v14l12-7zm16 0v14"></path></svg>'], HM = ["<svg", ' xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" class="', '"><path fill="currentColor" d="m20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1a10 10 0 0 0-.27-10.44z"></path><path fill="currentColor" d="M10.59 15.41a2 2 0 0 0 2.83 0l5.66-8.49l-8.49 5.66a2 2 0 0 0 0 2.83z"></path></svg>'], GM = ["<svg", ' xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"', '><path fill="currentColor" d="M12 21q-3.75 0-6.375-2.625T3 12q0-3.75 2.625-6.375T12 3q.35 0 .688.025t.662.075q-1.025.725-1.638 1.888T11.1 7.5q0 2.25 1.575 3.825T16.5 12.9q1.375 0 2.525-.613T20.9 10.65q.05.325.075.662T21 12q0 3.75-2.625 6.375T12 21Z"></path></svg>'], YM = ["<svg", ' xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"', '><path fill="currentColor" d="M12 5q-.425 0-.713-.288T11 4V2q0-.425.288-.713T12 1q.425 0 .713.288T13 2v2q0 .425-.288.713T12 5Zm4.95 2.05q-.275-.275-.275-.687t.275-.713l1.4-1.425q.3-.3.712-.3t.713.3q.275.275.275.7t-.275.7L18.35 7.05q-.275.275-.7.275t-.7-.275ZM20 13q-.425 0-.713-.288T19 12q0-.425.288-.713T20 11h2q.425 0 .713.288T23 12q0 .425-.288.713T22 13h-2Zm-8 10q-.425 0-.713-.288T11 22v-2q0-.425.288-.713T12 19q.425 0 .713.288T13 20v2q0 .425-.288.713T12 23ZM5.65 7.05l-1.425-1.4q-.3-.3-.3-.725t.3-.7q.275-.275.7-.275t.7.275L7.05 5.65q.275.275.275.7t-.275.7q-.3.275-.7.275t-.7-.275Zm12.7 12.725l-1.4-1.425q-.275-.3-.275-.713t.275-.687q.275-.275.688-.275t.712.275l1.425 1.4q.3.275.288.7t-.288.725q-.3.3-.725.3t-.7-.3ZM2 13q-.425 0-.713-.288T1 12q0-.425.288-.713T2 11h2q.425 0 .713.288T5 12q0 .425-.288.713T4 13H2Zm2.225 6.775q-.275-.275-.275-.7t.275-.7L5.65 16.95q.275-.275.687-.275t.713.275q.3.3.3.713t-.3.712l-1.4 1.4q-.3.3-.725.3t-.7-.3ZM12 18q-2.5 0-4.25-1.75T6 12q0-2.5 1.75-4.25T12 6q2.5 0 4.25 1.75T18 12q0 2.5-1.75 4.25T12 18Z"></path></svg>'], KM = ["<svg", ' xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"', '><path fill="currentColor" d="M7 17h10v-2H7v2Zm5-3l4-4l-1.4-1.4l-1.6 1.55V6h-2v4.15L9.4 8.6L8 10l4 4Zm0 8q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Zm0-2q3.35 0 5.675-2.325T20 12q0-3.35-2.325-5.675T12 4Q8.65 4 6.325 6.325T4 12q0 3.35 2.325 5.675T12 20Zm0-8Z"></path></svg>'], ZM = ["<svg", ' xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M10.925 14.05L16.6 8.4l-1.425-1.425l-4.25 4.25L8.8 9.1l-1.4 1.4l3.525 3.55ZM1 21v-2h22v2H1Zm3-3q-.825 0-1.413-.588T2 16V5q0-.825.588-1.413T4 3h16q.825 0 1.413.588T22 5v11q0 .825-.588 1.413T20 18H4Z"></path></svg>'], JM = '<path fill="currentColor" d="m14 18l-6-6l6-6l1.4 1.4l-4.6 4.6l4.6 4.6L14 18Z"></path>', XM = '<path fill="currentColor" d="M9.4 18L8 16.6l4.6-4.6L8 7.4L9.4 6l6 6l-6 6Z"></path>', QM = '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 12L7 7m5 5l5 5m-5-5l5-5m-5 5l-5 5"></path>';
  y(Kl, "@astrojs/solid-js");
  y(ez, "@astrojs/solid-js");
  y(Zl, "@astrojs/solid-js");
  y(tz, "@astrojs/solid-js");
  y(Lo, "@astrojs/solid-js");
  y(No, "@astrojs/solid-js");
  y(Io, "@astrojs/solid-js");
  y($o, "@astrojs/solid-js");
  y(Jl, "@astrojs/solid-js");
  y(Xl, "@astrojs/solid-js");
  y(Oo, "@astrojs/solid-js");
  y(oz, "@astrojs/solid-js");
  y(Uo, "@astrojs/solid-js");
  y(Vo, "@astrojs/solid-js");
  y(Ql, "@astrojs/solid-js");
  [U$, Ll] = q({ saveToServiceWorker: false, downloadOffline: true, justThisVideo: true, swPayload: null }), [ve, ze] = Fo({}), [V$, Da] = q(), [nz, va] = q(0), [ht, Wo] = q(), [ya, Nl] = q(""), [$, ba] = q();
  q(false);
  [wa, ka] = q(), az = ["<span", ' data-role="chapterMarker" class="w-1 h-full inline-block bg-primary absolute" style="', '"></span>'];
  y(ec, "@astrojs/solid-js");
  y(tc, "@astrojs/solid-js");
  sz = { OT: ["GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO", "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL"], NT: ["MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV"] }, iz = Object.values(sz).flat().reduce((e, t, n) => (e[t] = n + 1, e), {});
  Ca = { refNodeInsert: "replace", controls: true, embedType: "in-page", options: { responsive: true, fluid: true, fill: true, controls: true, playbackRates: [0.5, 1, 1.5, 2, 2.5], preload: "auto", fullscreen: { navigationUI: "show" } } }, oc = [{ code: "en", name: "English" }, { code: "fr", name: "French" }], _o = "en", nc = Object.freeze(Object.defineProperty({ __proto__: null, baseLocale: _o, supportedLanguages: oc }, Symbol.toStringTag, { value: "Module" }));
  Sa = "max-w-[1000px] mx-auto", qt = "px-3", Ko = (e, t) => (...n) => {
  };
  cc = (e) => {
    let t = ht();
    if (!t)
      return;
    let n = t.reduce((o, a) => {
      let s = a.sources?.filter((r) => r.container === "MP4" && r.src.includes("https")), i = s[0];
      return e === "BIG" ? i = s.reduce((r, l) => r.size ? l.size ? r ? l.size > r.size ? l : r : (r = l, r) : r : l) : e === "SMALL" && (i = s.reduce((r, l) => r.size ? l.size ? r ? l.size < r.size ? l : r : (r = l, r) : r : l)), i && (i.name = `${a.book}-${a.chapter}`, i.refId = String(a.reference_id), o.push(i)), o;
    }, []);
    if (!(!n || !n.length))
      return n;
  }, pz = () => {
    let e = ht();
    if (!e)
      return;
    let t = e.map((i) => Math.max(...i.sources.map((r) => r.size ? r.size : 0))), n = e.map((i) => Math.min(...i.sources.filter((r) => !!r.size).map((r) => r.size ? r.size : 1 / 0))), o = t.reduce((i, r) => i + r, 0), a = n.reduce((i, r) => i + r, 0);
    return [{ size: "biggest", totalSize: o, wholeBooksOptionsForSelectId: "BIG" }, { size: "smallest", totalSize: a, wholeBooksOptionsForSelectId: "SMALL" }];
  }, Kt = () => {
    let e = ve;
    if (!e)
      return;
    let t = e.sources?.filter((a) => a.container === "MP4" && a.src?.includes("https")), n = [], o = t.filter((a) => !a.size || n.includes(a.size) ? false : (a.size && n.push(a.size), true));
    return o.forEach((a) => {
      ze("sources", (s) => s.src === a.src, { name: `${e.book}-${e.chapter}`, refId: String(e.reference_id) });
    }), o;
  };
  y(Ko, "@astrojs/solid-js");
  y(gt, "@astrojs/solid-js");
  y(Zo, "@astrojs/solid-js");
  y(Jo, "@astrojs/solid-js");
  y(ac, "@astrojs/solid-js");
  y(lz, "@astrojs/solid-js");
  y(sc, "@astrojs/solid-js");
  y(ic, "@astrojs/solid-js");
  y(Ht, "@astrojs/solid-js");
  y(rc, "@astrojs/solid-js");
  y(Ea, "@astrojs/solid-js");
  y(Gt, "@astrojs/solid-js");
  y(Xo, "@astrojs/solid-js");
  y(lc, "@astrojs/solid-js");
  y(Yt, "@astrojs/solid-js");
  y(Vt, "@astrojs/solid-js");
  y(uz, "@astrojs/solid-js");
  y(dz, "@astrojs/solid-js");
  y(cc, "@astrojs/solid-js");
  y(pz, "@astrojs/solid-js");
  y(Kt, "@astrojs/solid-js");
  y(mz, "@astrojs/solid-js");
  y(Fa, "@astrojs/solid-js");
  y(fz, "@astrojs/solid-js");
  y(gz, "@astrojs/solid-js");
  y(hz, "@astrojs/solid-js");
  y(Dz, "@astrojs/solid-js");
  y(Qo, "@astrojs/solid-js");
  y(en, "@astrojs/solid-js");
  Ut = /* @__PURE__ */ new Map(), Ul = /* @__PURE__ */ new Set();
  typeof document < "u" && (document.readyState !== "loading" ? Vl() : document.addEventListener("DOMContentLoaded", Vl));
  pc = Symbol("$$KobalteAsComponent");
  y(dc, "@astrojs/solid-js");
  y(Ez, "@astrojs/solid-js");
  Fz = ["button", "color", "file", "image", "reset", "submit"];
  y(mc, "@astrojs/solid-js");
  y(ha, "@astrojs/solid-js");
  y(Zt, "@astrojs/solid-js");
  jz = ["<div", ' class="fixed inset-0 bg-black/30 dark:bg-black/50 z-30"></div>'], Az = ["<a", ' class="block py-3 text-lg hover:text-primary hover:underline" href="/">', "</a>"], Bz = ["<div", ' class="relative"><header class="', '"><span class="w-32">', '</span><div class="flex gap-2"><!--#-->', "<!--/--><!--#-->", "<!--/--></div></header><!--#-->", '<!--/--><div class="relative overflow-hidden w-full"><div class="', '"><button class="block ml-auto text-4xl hover:text-primary focus:text-primary transform active:scale-95">', '</button><div class="flex flex-col divide-y border-gray-600 dark:border-gray-300 mt-12"><!--#-->', '<!--/--><a class="block py-3 text-lg hover:text-primary hover:underline" href="/license">', '</a><a class="block py-3 text-lg hover:text-primary hover:underline" href="https://slbible.com/">', "</a></div></div></div></div>"];
  y(fc, "@astrojs/solid-js");
  Gl = Object.freeze, zz = Object.defineProperty, _z = (e, t) => Gl(zz(e, "raw", { value: Gl(t || e.slice()) })), Lz = ke(), Fe = we(async (e, t, n) => {
    let o = e.createAstro(Lz, t, n);
    o.self = Fe;
    let { title: a } = o.props, s = Wt(o), i = Je(o.request), r = await Ze(Object.assign({ "../i18n/en.ts": () => Promise.resolve().then(() => (Ro(), Bo)), "../i18n/fr.ts": () => Promise.resolve().then(() => (zo(), Mo)), "../i18n/index.ts": () => Promise.resolve().then(() => nc) }), `../i18n/${i}.ts`), l = { [i]: r.default }, u = o.url.pathname;
    return J`<html lang="en"${Oe(`bg-base ${s?.prefersDark ? "dark" : s?.prefersDark === false ? "light" : ""}`, "class")}>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width">
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">
    <link rel="manifest" href="/icons/site.webmanifest">
    <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#ff691f">
    <meta name="msapplication-TileColor" content="#da532c">
    <meta name="theme-color" content="#202020">
    <meta name="generator"${Oe(o.generator, "content")}>
    <title>${a}</title>
    <link href="https://vjs.zencdn.net/8.0.4/video-js.css" rel="stylesheet">
    

    <!-- {pwaInfo && <Fragment set:html={pwaInfo.webManifest.linkTag} />} -->
  ${Mr()}</head>
  <body class="font-sans leading-relaxed bg-base text-surface pb-[54px]">
    ${ne(e, "Header", fc, { "client:load": true, prefersDark: s?.prefersDark, locale: i, initialDict: l, initialPath: u, "client:component-hydration": "load", "client:component-path": "@components/Header", "client:component-export": "Header" })}
    ${vo(e, n.default)}
    ${J(Yl || (Yl = _z([`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon="{&quot;token&quot;: &quot;89d66736f5cc483f80819161bfd67ead&quot;}">
    <\/script><script async src="https://www.googletagmanager.com/gtag/js?id=G-5HN2P1BPRC"><\/script>`])))}
  </body>
</html>`;
  }, "/Users/willkelly/Documents/Work/Code/DotWeb/src/layouts/Layout.astro", void 0), Nz = ke(), gc = we(async (e, t, n) => {
    let o = e.createAstro(Nz, t, n);
    return o.self = gc, J`${ne(e, "Layout", Fe, { title: "404" }, { default: (a) => J`
	${Ce()}<div class="h-screen grid w-full place-content-center text-3xl">404</div>
` })}`;
  }, "/Users/willkelly/Documents/Work/Code/DotWeb/src/pages/404.astro", void 0), Iz = "/Users/willkelly/Documents/Work/Code/DotWeb/src/pages/404.astro", $z = "/404", Oz = Object.freeze(Object.defineProperty({ __proto__: null, default: gc, file: Iz, url: $z }, Symbol.toStringTag, { value: "Module" }));
});
var hc = {};
h(hc, { default: () => Uz });
var Uz;
var Dc = p(() => {
  "use strict";
  Uz = "/_astro/Benin-example.bbd5e4ae.jpg";
});
var yc = {};
h(yc, { a: () => Hz, c: () => me });
var me;
var Vz;
var vc;
var Wz;
var qz;
var Hz;
var on = p(() => {
  "use strict";
  Z();
  G();
  Xe();
  me = { benin: { playlist: "benin-new-testament", license: "benin.md", aboutImg: "benin-example" }, ghana: { playlist: "ghana-new-testament", license: "ghana.md" }, cote: { playlist: "cote-d'ivoire-new-testament", license: "cotdivoir.md" }, togo: { playlist: "togo-new-testament", license: "togo.md" }, malawi: { playlist: "malawi-new-testament", license: "malawi.md" } }, Vz = ke(), vc = we(async (e, t, n) => {
    let o = e.createAstro(Vz, t, n);
    o.self = vc;
    let a = "src/images/benin-example.jpg", s = o.url.origin;
    s.includes("dot-web.pages.dev") && (s = "benin");
    let i = Object.keys(me).find((v) => s.toLowerCase().includes(v.toLowerCase()));
    if (!i)
      return o.redirect("404");
    let r = me[i], u = (await o.glob(Object.assign({ "../images/Benin-example.jpg": () => Promise.resolve().then(() => (Dc(), hc)) }), () => "../images/*.jpg")).map((v) => v.default);
    console.log({ allImgs: u });
    let c = u.find((v) => v.toLowerCase().includes(r.aboutImg.toLowerCase())), d = c || a, g = Je(o.request), k = g == "fr" ? "En savoir plus sur le B\xE9nin" : "Learn more about Benin", D = g == "fr" ? "La traduction des sourds au B\xE9nin" : "Deaf owned translation for Benin";
    return J`${ne(e, "Layout", Fe, { title: "contact", class: "astro-KH7BTL4R" }, { default: (v) => J` 
	${Ce()}<div class=" astro-KH7BTL4R">
		<div${Oe("relative min-h-60vh border-red-400 bg-cover bg-center bg-black/40 astro-KH7BTL4R", "class")}${Oe(`background-image: linear-gradient(
			rgba(0, 0, 0, 0.45), 
			rgba(0, 0, 0, 0.45)
		), url(${d})`, "style")}>
			<!-- <img src={imgSrc} class="" alt="About Dot"> -->
			<div class="text-white absolute bottom-8 text-center left-1/2 -translate-x-1/2 w-full astro-KH7BTL4R">
			<p class="astro-KH7BTL4R">${k}</p>
			<h1 class="astro-KH7BTL4R">${D}</h1>
			</div>
		</div>
		<div class="max-w-prose mx-auto p-4 m-8  text-xl leading-loose astro-KH7BTL4R">
			<h1 class="text-4xl mb-3 font-bold astro-KH7BTL4R">About</h1>
			<p class="astro-KH7BTL4R">Lorem ipsum dolor sit amet consectetur, adipisicing elit. Eligendi ab quas dolores, libero sit sapiente aliquid molestias nisi, eveniet impedit natus cupiditate mollitia! Voluptatibus ratione expedita, maiores et, optio quas sapiente ducimus odio dolores consectetur, quae placeat odit? Fugit unde nostrum illo veritatis cupiditate nihil, sint quam dolor. Rerum, explicabo? Contact us at <a href="mailto:nowhere@wa.org" class="text-primary underline astro-KH7BTL4R">CONTACT_EMAIL</a></p>
		</div>
	</div>
` })}`;
  }, "/Users/willkelly/Documents/Work/Code/DotWeb/src/pages/about.astro", void 0), Wz = "/Users/willkelly/Documents/Work/Code/DotWeb/src/pages/about.astro", qz = "/about", Hz = Object.freeze(Object.defineProperty({ __proto__: null, default: vc, file: Wz, url: qz }, Symbol.toStringTag, { value: "Module" }));
});
var Ta;
var Z$;
var bc = p(() => {
  Me();
  mt();
  Ta = (e, t) => {
    if (Ye)
      return Object.assign(() => {
      }, { clear: () => {
      } });
    let n = false, o, a, s = (...r) => {
      a = r, !n && (n = true, o = setTimeout(() => {
        e(...a), n = false;
      }, t));
    }, i = () => {
      clearTimeout(o), n = false;
    };
    return Jn() && _t(i), Object.assign(s, { clear: i });
  }, Z$ = Ye ? () => Object.assign(() => {
  }, { clear: () => {
  } }) : window.requestIdleCallback ? (e, t) => {
    let n = false, o, a, s = (...r) => {
      a = r, !n && (n = true, o = requestIdleCallback(() => {
        e(...a), n = false;
      }, { timeout: t }));
    }, i = () => {
      cancelIdleCallback(o), n = false;
    };
    return Jn() && _t(i), Object.assign(s, { clear: i });
  } : (e) => Ta(e);
});
var kc = p(() => {
  jo();
  Me();
  mt();
});
var Cc = be(() => {
});
var Ec = be((aO, Sc) => {
  var xc = typeof global < "u" ? global : typeof window < "u" ? window : {}, Yz = Cc(), Jt;
  typeof document < "u" ? Jt = document : (Jt = xc["__GLOBAL_DOCUMENT_CACHE@4"], Jt || (Jt = xc["__GLOBAL_DOCUMENT_CACHE@4"] = Yz));
  Sc.exports = Jt;
});
var Tc = be((sO, Fc) => {
  var Xt;
  typeof window < "u" ? Xt = window : typeof global < "u" ? Xt = global : typeof self < "u" ? Xt = self : Xt = {};
  Fc.exports = Xt;
});
var Oc = {};
h(Oc, { default: () => A_ });
function nn() {
  return nn = Object.assign || function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var n = arguments[t];
      for (var o in n)
        Object.prototype.hasOwnProperty.call(n, o) && (e[o] = n[o]);
    }
    return e;
  }, nn.apply(this, arguments);
}
var Te;
var ye;
var Kz;
var Zz;
var Jz;
var Xz;
var Qz;
var e_;
var t_;
var Bc;
var o_;
var n_;
var a_;
var s_;
var Rc;
var an;
var Pa;
var Ve;
var Mc;
var ja;
var Aa;
var Ba;
var sn;
var i_;
var Ra;
var r_;
var l_;
var c_;
var vt;
var zc;
var _c;
var u_;
var d_;
var p_;
var m_;
var f_;
var g_;
var h_;
var D_;
var eo;
var rn;
var v_;
var y_;
var b_;
var w_;
var k_;
var Dt;
var Lc;
var Nc;
var C_;
var Pc;
var x_;
var S_;
var Ic;
var Qt;
var E_;
var F_;
var T_;
var P_;
var j_;
var jc;
var Ac;
var $c;
var to;
var A_;
var Uc = p(() => {
  Te = A(Ec()), ye = A(Tc());
  Kz = "1.8.0";
  Zz = "1.2.0", Jz = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
    return typeof e;
  } : function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, Xz = ["catalogSearch", "catalogSequence"], Qz = ["adConfigId", "applicationId", "catalogSearch", "catalogSequence", "playlistId", "playlistVideoId", "videoId"], e_ = function(t, n) {
    if (!(!t || t[n] === void 0)) {
      if (typeof t[n] != "string" && Xz.indexOf(n) !== -1)
        try {
          return encodeURIComponent(JSON.stringify(t[n]));
        } catch {
          return;
        }
      return encodeURIComponent(String(t[n]).trim()) || void 0;
    }
  }, t_ = function(t) {
    return Object.keys(t).filter(function(n) {
      return Qz.indexOf(n) !== -1;
    }).reduce(function(n, o) {
      var a = e_(t, o);
      return a !== void 0 && (n += n ? "&" : "?", n += encodeURIComponent(o) + "=" + a), n;
    }, "");
  }, Bc = function(t) {
    var n = t.accountId, o = t.base, a = o === void 0 ? "https://players.brightcove.net" : o, s = t.playerId, i = s === void 0 ? "default" : s, r = t.embedId, l = r === void 0 ? "default" : r, u = t.iframe, c = u === void 0 ? false : u, d = t.minified, g = d === void 0 ? true : d, k = t.queryParams, D = k === void 0 ? null : k, v = "";
    c ? v += "html" : (g && (v += "min."), v += "js"), a.charAt(a.length - 1) === "/" && (a = a.substring(0, a.length - 1));
    var C = "";
    return c && D && (typeof D > "u" ? "undefined" : Jz(D)) === "object" && (C = t_(D)), n = encodeURIComponent(n), i = encodeURIComponent(i), l = encodeURIComponent(l), a + "/" + n + "/" + i + "_" + l + "/index." + v + C;
  };
  Bc.VERSION = Zz;
  o_ = { embedId: "default", embedType: "in-page", playerId: "default", Promise: ye.default.Promise, refNodeInsert: "append" }, n_ = "16:9", a_ = false, s_ = "100%", Rc = "video", an = "video-js", Pa = "in-page", Ve = "iframe", Mc = "append", ja = "prepend", Aa = "before", Ba = "after", sn = "replace", i_ = ["catalogSearch", "catalogSequence"], Ra = "https://players.brightcove.net/", r_ = function(t) {
    if (t.playerUrl)
      return t.playerUrl;
    var n = t.accountId, o = t.playerId, a = t.embedId, s = t.embedOptions, i = t.embedType === Ve;
    return Bc({ accountId: n, playerId: o, embedId: a, iframe: i, base: Ra, minified: s ? !s.unminified : true, queryParams: t });
  }, l_ = function() {
    return Ra;
  }, c_ = function(t) {
    Ra = t;
  }, vt = { getUrl: r_, getBaseUrl: l_, setBaseUrl: c_ }, zc = function(t) {
    return !!(t && t.nodeType === 1);
  }, _c = function(t) {
    return !!(zc(t) && t.parentNode);
  }, u_ = function(t) {
    var n = Te.default.createElement("iframe");
    return n.setAttribute("allow", "autoplay;encrypted-media;fullscreen"), n.setAttribute("allowfullscreen", "allowfullscreen"), n.src = vt.getUrl(t), n;
  }, d_ = function(t) {
    var n = t.embedOptions, o = { adConfigId: "data-ad-config-id", applicationId: "data-application-id", catalogSearch: "data-catalog-search", catalogSequence: "data-catalog-sequence", deliveryConfigId: "data-delivery-config-id", playlistId: "data-playlist-id", playlistVideoId: "data-playlist-video-id", poster: "poster", videoId: "data-video-id" }, a = n && n.tagName || an, s = Te.default.createElement(a);
    return Object.keys(o).filter(function(i) {
      return t[i];
    }).forEach(function(i) {
      var r;
      if (typeof t[i] != "string" && i_.indexOf(i) !== -1)
        try {
          r = JSON.stringify(t[i]);
        } catch {
          return;
        }
      else
        r = String(t[i]).trim();
      s.setAttribute(o[i], r);
    }), s.setAttribute("controls", "controls"), s.classList.add("video-js"), s;
  }, p_ = function(t, n, o) {
    if (!n.responsive)
      return o;
    o.style.position = "absolute", o.style.top = "0px", o.style.right = "0px", o.style.bottom = "0px", o.style.left = "0px", o.style.width = "100%", o.style.height = "100%";
    var a = nn({ aspectRatio: n_, iframeHorizontalPlaylist: a_, maxWidth: s_ }, n.responsive), s = a.aspectRatio.split(":").map(Number), i = Te.default.createElement("div"), r = s[1] / s[0] * 100;
    t === Ve && a.iframeHorizontalPlaylist && (r *= 1.25), i.style.paddingTop = r + "%", i.appendChild(o);
    var l = Te.default.createElement("div");
    return l.style.position = "relative", l.style.display = "block", l.style.maxWidth = a.maxWidth, l.appendChild(i), l;
  }, m_ = function(t, n) {
    if (!t.pip)
      return n;
    var o = Te.default.createElement("div");
    return o.classList.add("vjs-pip-container"), o.appendChild(n), o;
  }, f_ = function(t, n, o) {
    return n ? m_(n, p_(t, n, o)) : o;
  }, g_ = function(t, n) {
    var o = t.refNode, a = t.refNodeInsert, s = o.parentNode, i = f_(t.embedType, t.embedOptions, n);
    if (a === Aa ? s.insertBefore(i, o) : a === Ba ? s.insertBefore(i, o.nextElementSibling || null) : a === sn ? s.replaceChild(i, o) : a === ja ? o.insertBefore(i, o.firstChild || null) : o.appendChild(i), t.embedOptions && t.embedOptions.playlist) {
      var r = t.embedOptions.playlist.legacy ? "ul" : "div", l = Te.default.createElement(r);
      l.classList.add("vjs-playlist"), n.parentNode.insertBefore(l, n.nextElementSibling || null);
    }
    return t.refNode = null, n;
  }, h_ = function(t, n) {
    if (typeof t.onEmbedCreated != "function")
      return n;
    var o = t.onEmbedCreated(n);
    return zc(o) ? o : n;
  }, D_ = function(t) {
    var n = t.embedType === Ve ? u_(t) : d_(t);
    return g_(t, h_(t, n));
  }, eo = new ye.default.Map(), rn = function(t) {
    var n = t.accountId, o = t.playerId, a = t.embedId;
    return (n || "*") + "_" + o + "_" + a;
  }, v_ = function(t) {
    eo.set(rn(t), t.accountId ? vt.getUrl(t) : "");
  }, y_ = function(t) {
    return eo.has(rn(t));
  }, b_ = function(t) {
    return eo.get(rn(t));
  }, w_ = function() {
    eo.clear();
  }, k_ = function(t) {
    eo.forEach(t);
  }, Dt = { clear: w_, forEach: k_, get: b_, has: y_, key: rn, store: v_ }, Lc = /^([A-Za-z0-9]+)_([A-Za-z0-9]+)$/, Nc = function() {
    return ye.default.bc ? Object.keys(ye.default.bc).filter(function(t) {
      return Lc.test(t);
    }) : [];
  }, C_ = function() {
    return Object.keys(ye.default).filter(function(t) {
      return /^videojs/i.test(t) || /^(bc)$/.test(t);
    });
  }, Pc = function(t) {
    t && Object.keys(t.players).forEach(function(n) {
      var o = t.players[n];
      o && o.dispose();
    });
  }, x_ = function() {
    Dt.forEach(function(t, n) {
      t && Array.prototype.slice.call(Te.default.querySelectorAll('script[src="' + t + '"]')).forEach(function(o) {
        return o.parentNode.removeChild(o);
      });
    }), Dt.clear(), Pc(ye.default.videojs), Nc().forEach(function(t) {
      return Pc(ye.default.bc[t].videojs);
    }), C_().forEach(function(t) {
      delete ye.default[t];
    });
  }, S_ = function() {
    Nc().forEach(function(t) {
      var n = t.match(Lc), o = { playerId: n[1], embedId: n[2] };
      Dt.has(o) || Dt.store(o);
    });
  }, Ic = { detectPlayers: S_, reset: x_ };
  Ic.detectPlayers();
  Qt = function(t) {
    return typeof t == "function";
  }, E_ = function(t) {
    return t === Pa || t === Ve;
  }, F_ = function(t) {
    return t === an || t === Rc;
  }, T_ = function(t) {
    return t === Mc || t === ja || t === Aa || t === Ba || t === sn;
  }, P_ = function(t) {
    var n = t.accountId, o = t.embedOptions, a = t.embedType, s = t.options, i = t.refNode, r = t.refNodeInsert;
    if (n)
      if (_c(i))
        if (E_(a)) {
          if (a === Ve && s)
            throw new Error("cannot use options with an iframe embed");
          if (o && o.tagName !== void 0 && !F_(o.tagName))
            throw new Error('embedOptions.tagName is invalid (value: "' + o.tagName + '")');
          if (o && o.responsive && o.responsive.aspectRatio && !/^\d+\:\d+$/.test(o.responsive.aspectRatio))
            throw new Error('embedOptions.responsive.aspectRatio must be in the "n:n" format (value: "' + o.responsive.aspectRatio + '")');
          if (!T_(r))
            throw new Error("refNodeInsert is missing or invalid");
        } else
          throw new Error("embedType is missing or invalid");
      else
        throw new Error("refNode must resolve to a node attached to the DOM");
    else
      throw new Error("accountId is required");
  }, j_ = function(t) {
    return _c(t) ? t : typeof t == "string" ? Te.default.querySelector(t) : null;
  }, jc = function(t, n, o, a) {
    var s = t.embedId, i = t.playerId, r = ye.default.bc[i + "_" + s] || ye.default.bc;
    if (!r)
      return a(new Error("missing bc function for " + i));
    Dt.store(t);
    var l;
    try {
      l = r(n, t.options), l.bcinfo && (l.bcinfo.PLAYER_LOADER = true);
    } catch {
      var u = "Could not initialize the Brightcove Player.";
      return t.embedOptions.tagName === an && (u += ' You are attempting to embed using a "video-js" element. Please ensure that your Player is v6.11.0 or newer in order to support this embed type. Alternatively, pass `"video"` for `embedOptions.tagName`.'), a(new Error(u));
    }
    o({ type: Pa, ref: l });
  }, Ac = function(t, n, o) {
    t.refNode = j_(t.refNode), P_(t);
    var a = t.refNode, s = t.refNodeInsert, i = a.parentNode, r = D_(t);
    if (t.embedType === Ve) {
      n({ type: Ve, ref: r });
      return;
    }
    if (Dt.has(t))
      return jc(t, r, n, o);
    var l = Te.default.createElement("script");
    l.onload = function() {
      return jc(t, r, n, o);
    }, l.onerror = function() {
      o(new Error("player script could not be downloaded"));
    }, l.async = true, l.charset = "utf-8", l.src = vt.getUrl(t), s === sn ? i.appendChild(l) : a.appendChild(l);
  }, $c = function(t) {
    var n = nn({}, o_, t), o = n.Promise, a = n.onSuccess, s = n.onFailure;
    return !Qt(o) || Qt(a) || Qt(s) ? Ac(n, Qt(a) ? a : function() {
    }, Qt(s) ? s : function(i) {
      throw i;
    }) : new o(function(i, r) {
      return Ac(n, i, r);
    });
  }, to = function(t, n) {
    Object.defineProperty($c, t, { configurable: false, enumerable: true, value: n, writable: false });
  };
  to("getBaseUrl", function() {
    return vt.getBaseUrl();
  });
  to("setBaseUrl", function(e) {
    vt.setBaseUrl(e);
  });
  to("getUrl", function(e) {
    return vt.getUrl(e);
  });
  to("reset", function() {
    return Ic.reset();
  });
  [["EMBED_TAG_NAME_VIDEO", Rc], ["EMBED_TAG_NAME_VIDEOJS", an], ["EMBED_TYPE_IN_PAGE", Pa], ["EMBED_TYPE_IFRAME", Ve], ["REF_NODE_INSERT_APPEND", Mc], ["REF_NODE_INSERT_PREPEND", ja], ["REF_NODE_INSERT_BEFORE", Aa], ["REF_NODE_INSERT_AFTER", Ba], ["REF_NODE_INSERT_REPLACE", sn], ["VERSION", Kz]].forEach(function(e) {
    to(e[0], e[1]);
  });
  A_ = $c;
});
var Ma = {};
h(Ma, { Background: () => mu, Black: () => iu, Blue: () => cu, Captions: () => Qc, Casual: () => ku, Chapters: () => eu, Close: () => tu, Color: () => Eu, Cyan: () => pu, Depressed: () => yu, Descriptions: () => nu, Done: () => Su, Dropshadow: () => wu, Duration: () => qc, Fullscreen: () => Kc, Green: () => lu, LIVE: () => Hc, Loaded: () => Gc, Magenta: () => du, Mute: () => Zc, None: () => Du, Opacity: () => Fu, Opaque: () => hu, Pause: () => Wc, Play: () => Vc, Progress: () => Yc, Raised: () => vu, Red: () => ru, Replay: () => ou, Reset: () => xu, Script: () => Cu, Subtitles: () => Xc, Text: () => au, Transparent: () => gu, Uniform: () => bu, Unmute: () => Jc, White: () => su, Window: () => fu, Yellow: () => uu, default: () => B_ });
var Vc;
var Wc;
var qc;
var Hc;
var Gc;
var Yc;
var Kc;
var Zc;
var Jc;
var Xc;
var Qc;
var eu;
var tu;
var ou;
var nu;
var au;
var su;
var iu;
var ru;
var lu;
var cu;
var uu;
var du;
var pu;
var mu;
var fu;
var gu;
var hu;
var Du;
var vu;
var yu;
var bu;
var wu;
var ku;
var Cu;
var xu;
var Su;
var Eu;
var Fu;
var B_;
var za = p(() => {
  "use strict";
  Vc = "\u062A\u0634\u063A\u064A\u0644", Wc = "\u0625\u064A\u0642\u0627\u0641", qc = "\u0645\u062F\u0629", Hc = "\u0645\u0628\u0627\u0634\u0631", Gc = "\u062A\u0645 \u0627\u0644\u062A\u062D\u0645\u064A\u0644", Yc = "\u0627\u0644\u062A\u0642\u062F\u0645", Kc = "\u0645\u0644\u0621 \u0627\u0644\u0634\u0627\u0634\u0629", Zc = "\u0635\u0627\u0645\u062A", Jc = "\u063A\u064A\u0631 \u0627\u0644\u0635\u0627\u0645\u062A", Xc = "\u0627\u0644\u062A\u0631\u062C\u0645\u0629", Qc = "\u0627\u0644\u062A\u0639\u0644\u064A\u0642\u0627\u062A", eu = "\u0641\u0635\u0648\u0644", tu = "\u0623\u063A\u0644\u0642", ou = "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644", nu = "\u0627\u0644\u0623\u0648\u0635\u0627\u0641", au = "\u0627\u0644\u0646\u0635", su = "\u0623\u0628\u064A\u0636", iu = "\u0623\u0633\u0648\u062F", ru = "\u0623\u062D\u0645\u0631", lu = "\u0623\u062E\u0636\u0631", cu = "\u0623\u0632\u0631\u0642", uu = "\u0623\u0635\u0641\u0631", du = "\u0623\u0631\u062C\u0648\u0627\u0646\u064A", pu = "\u0623\u0632\u0631\u0642 \u0633\u0645\u0627\u0648\u064A", mu = "\u0627\u0644\u062E\u0644\u0641\u064A\u0629", fu = "\u0646\u0627\u0641\u0630\u0629", gu = "\u0634\u0641\u0627\u0641", hu = "\u0645\u0639\u062A\u0645", Du = "\u0644\u0627 \u0634\u064A\u0621", vu = "\u0628\u0627\u0631\u0632", yu = "\u0645\u0646\u062E\u0641\u0636", bu = "\u0645\u0646\u062A\u0638\u0645", wu = "\u0638\u0644 \u062E\u0644\u0641\u064A", ku = "Casual", Cu = "Script", xu = "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0636\u0628\u0637", Su = "\u062A\u0645", Eu = "\u0627\u0644\u0644\u0648\u0646", Fu = "\u0645\u0639\u062F\u0644 \u0627\u0644\u0634\u0641\u0627\u0641\u064A\u0629", B_ = { Play: Vc, Pause: Wc, "Current Time": "\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u062D\u0627\u0644\u064A", Duration: qc, "Remaining Time": "\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062A\u0628\u0642\u064A", "Stream Type": "\u0646\u0648\u0639 \u0627\u0644\u062A\u064A\u0627\u0631", LIVE: Hc, Loaded: Gc, Progress: Yc, Fullscreen: Kc, "Exit Fullscreen": "\u062A\u0639\u0637\u064A\u0644 \u0645\u0644\u0621 \u0627\u0644\u0634\u0627\u0634\u0629", Mute: Zc, Unmute: Jc, "Playback Rate": "\u0645\u0639\u062F\u0644 \u0627\u0644\u062A\u0634\u063A\u064A\u0644", Subtitles: Xc, "subtitles off": "\u0625\u064A\u0642\u0627\u0641 \u0627\u0644\u062A\u0631\u062C\u0645\u0629", Captions: Qc, "captions off": "\u0625\u064A\u0642\u0627\u0641 \u0627\u0644\u062A\u0639\u0644\u064A\u0642\u0627\u062A", Chapters: eu, "You aborted the media playback": "\u0644\u0642\u062F \u0623\u0644\u063A\u064A\u062A \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0641\u064A\u062F\u064A\u0648", "A network error caused the media download to fail part-way.": "\u062A\u0633\u0628\u0628 \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0634\u0628\u0643\u0629 \u0628\u0641\u0634\u0644 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0628\u0627\u0644\u0643\u0627\u0645\u0644.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0628\u0633\u0628\u0628 \u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0648\u0645 \u0623\u0648 \u0627\u0644\u0634\u0628\u0643\u0629 \u060C \u0623\u0648 \u0641\u0634\u0644 \u0628\u0633\u0628\u0628 \u0639\u062F\u0645 \u0625\u0645\u0643\u0627\u0646\u064A\u0629 \u0642\u0631\u0627\u0621\u0629 \u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0641\u064A\u062F\u064A\u0648.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0628\u0633\u0628\u0628 \u0645\u0634\u0643\u0644\u0629 \u0641\u0633\u0627\u062F \u0623\u0648 \u0644\u0623\u0646 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u064A\u0633\u062A\u062E\u062F\u0645 \u0645\u064A\u0632\u0627\u062A \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645\u0629 \u0645\u0646 \u0645\u062A\u0635\u0641\u062D\u0643.", "No compatible source was found for this media.": "\u0641\u0634\u0644 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0623\u064A \u0645\u0635\u062F\u0631 \u0645\u062A\u0648\u0627\u0641\u0642 \u0645\u0639 \u0647\u0630\u0627 \u0627\u0644\u0641\u064A\u062F\u064A\u0648.", "Play Video": "\u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0641\u064A\u062F\u064A\u0648", Close: tu, "Modal Window": "\u0646\u0627\u0641\u0630\u0629 \u0645\u0634\u0631\u0648\u0637\u0629", "This is a modal window": "\u0647\u0630\u0647 \u0646\u0627\u0641\u0630\u0629 \u0645\u0634\u0631\u0648\u0637\u0629", "This modal can be closed by pressing the Escape key or activating the close button.": "\u064A\u0645\u0643\u0646 \u063A\u0644\u0642 \u0647\u0630\u0647 \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0645\u0634\u0631\u0648\u0637\u0629 \u0639\u0646 \u0637\u0631\u064A\u0642 \u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 \u0632\u0631 \u0627\u0644\u062E\u0631\u0648\u062C \u0623\u0648 \u062A\u0641\u0639\u064A\u0644 \u0632\u0631 \u0627\u0644\u0625\u063A\u0644\u0627\u0642", ", opens captions settings dialog": ", \u062A\u0641\u062A\u062D \u0646\u0627\u0641\u0630\u0629  \u062E\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u062A\u0639\u0644\u064A\u0642\u0627\u062A", ", opens subtitles settings dialog": ", \u062A\u0641\u062A\u062D \u0646\u0627\u0641\u0630\u0629  \u062E\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u062A\u0631\u062C\u0645\u0629", ", selected": ", \u0645\u062E\u062A\u0627\u0631", "Audio Player": "\u0645\u0634\u063A\u0644 \u0627\u0644\u0635\u0648\u062A", "Video Player": "\u0645\u0634\u063A\u0644 \u0627\u0644\u0641\u064A\u062F\u064A\u0648", Replay: ou, "Seek to live, currently behind live": "\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u062B \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u060C \u0645\u062A\u0623\u062E\u0631 \u0639\u0646 \u0627\u0644\u0628\u062B \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u062D\u0627\u0644\u064A\u064B\u0627", "Seek to live, currently playing live": "\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u062B \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u060C \u0627\u0644\u0628\u062B \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0642\u064A\u062F \u0627\u0644\u062A\u0634\u063A\u064A\u0644 \u062D\u0627\u0644\u064A\u064B\u0627", "Progress Bar": "\u0634\u0631\u064A\u0637 \u0627\u0644\u062A\u0642\u062F\u0645", "progress bar timing: currentTime={1} duration={2}": "{1} \u0645\u0646 {2}", Descriptions: nu, "descriptions off": "\u0625\u062E\u0641\u0627\u0621 \u0627\u0644\u0623\u0648\u0635\u0627\u0641", "Audio Track": "\u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0635\u0648\u062A\u064A", "Volume Level": "\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0635\u0648\u062A", "The media is encrypted and we do not have the keys to decrypt it.": "\u0627\u0644\u0648\u0633\u0627\u0626\u0637 \u0645\u0634\u0641\u0631\u0629 \u0648\u0644\u064A\u0633 \u0644\u062F\u064A\u0646\u0627 \u0627\u0644\u0631\u0645\u0648\u0632 \u0627\u0644\u0644\u0627\u0632\u0645\u0629 \u0644\u0641\u0643 \u0634\u0641\u0631\u062A\u0647\u0627.", "Close Modal Dialog": "\u0625\u063A\u0644\u0627\u0642 \u0645\u0631\u0628\u0639 \u0627\u0644\u062D\u0648\u0627\u0631 \u0627\u0644\u0645\u0634\u0631\u0648\u0637", ", opens descriptions settings dialog": "\u060C \u064A\u0641\u062A\u062D \u0645\u0631\u0628\u0639 \u062D\u0648\u0627\u0631 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0623\u0648\u0635\u0627\u0641", "captions settings": "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0639\u0644\u064A\u0642\u0627\u062A \u0627\u0644\u062A\u0648\u0636\u064A\u062D\u064A\u0629", "subtitles settings": "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0631\u062C\u0645\u0627\u062A", "descriptions settings": "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0623\u0648\u0635\u0627\u0641", Text: au, White: su, Black: iu, Red: ru, Green: lu, Blue: cu, Yellow: uu, Magenta: du, Cyan: pu, Background: mu, Window: fu, Transparent: gu, "Semi-Transparent": "\u0646\u0635\u0641 \u0634\u0641\u0627\u0641", Opaque: hu, "Font Size": "\u062D\u062C\u0645 \u0627\u0644\u062E\u0637", "Text Edge Style": "\u0646\u0645\u0637 \u062D\u0648\u0627\u0641 \u0627\u0644\u0646\u0635", None: Du, Raised: vu, Depressed: yu, Uniform: bu, Dropshadow: wu, "Font Family": "\u0639\u0627\u0626\u0644\u0629 \u0627\u0644\u062E\u0637\u0648\u0637", "Proportional Sans-Serif": "Proportional Sans-Serif", "Monospace Sans-Serif": "Monospace Sans-Serif", "Proportional Serif": "Proportional Serif", "Monospace Serif": "Monospace Serif", Casual: ku, Script: Cu, "Small Caps": "Small Caps", Reset: xu, "restore all settings to the default values": "\u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0643\u0644 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0625\u0644\u0649 \u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629", Done: Su, "Caption Settings Dialog": "\u0645\u0631\u0628\u0639 \u062D\u0648\u0627\u0631 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0639\u0644\u064A\u0642\u0627\u062A \u0627\u0644\u062A\u0648\u0636\u064A\u062D\u064A\u0629", "Beginning of dialog window. Escape will cancel and close the window.": '\u0628\u062F\u0627\u064A\u0629 \u0646\u0627\u0641\u0630\u0629 \u0645\u0631\u0628\u0639 \u062D\u0648\u0627\u0631. \u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 \u0632\u0631 "Escape" \u0633\u064A\u0624\u062F\u064A \u0625\u0644\u0649 \u0627\u0644\u0625\u0644\u063A\u0627\u0621 \u0648\u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u0646\u0627\u0641\u0630\u0629.', "End of dialog window.": "\u0646\u0647\u0627\u064A\u0629 \u0646\u0627\u0641\u0630\u0629 \u0645\u0631\u0628\u0639 \u062D\u0648\u0627\u0631.", "{1} is loading.": "{1} \u0642\u064A\u062F \u0627\u0644\u062A\u062D\u0645\u064A\u0644.", "Exit Picture-in-Picture": "\u062E\u0631\u062C \u0645\u0646 \u0648\u0636\u0639 \u0635\u0648\u0631\u0629 \u062F\u0627\u062E\u0644 \u0635\u0648\u0631\u0629", "Picture-in-Picture": "\u0635\u0648\u0631\u0629 \u062F\u0627\u062E\u0644 \u0635\u0648\u0631\u0629", "No content": "\u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u062D\u062A\u0648\u0649", Color: Eu, Opacity: Fu, "Text Background": "\u062E\u0644\u0641\u064A\u0629 \u0627\u0644\u0646\u0635", "Caption Area Background": "\u062E\u0644\u0641\u064A\u0629 \u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u062A\u0633\u0645\u064A\u0629 \u0627\u0644\u062A\u0648\u0636\u064A\u062D\u064A\u0629" };
});
var _a = {};
h(_a, { Captions: () => Nu, Chapters: () => Iu, Duration: () => ju, Fullscreen: () => Mu, LIVE: () => Au, Loaded: () => Bu, Mute: () => zu, Pause: () => Pu, Play: () => Tu, Progress: () => Ru, Subtitles: () => Lu, Unmute: () => _u, default: () => R_ });
var Tu;
var Pu;
var ju;
var Au;
var Bu;
var Ru;
var Mu;
var zu;
var _u;
var Lu;
var Nu;
var Iu;
var R_;
var La = p(() => {
  "use strict";
  Tu = "Pusti", Pu = "Pauza", ju = "Vrijeme trajanja", Au = "U\u017DIVO", Bu = "U\u010Ditan", Ru = "Progres", Mu = "Puni ekran", zu = "Prigu\u0161en", _u = "Ne-prigu\u0161en", Lu = "Podnaslov", Nu = "Titlovi", Iu = "Poglavlja", R_ = { Play: Tu, Pause: Pu, "Current Time": "Trenutno vrijeme", Duration: ju, "Remaining Time": "Preostalo vrijeme", "Stream Type": "Na\u010Din strimovanja", LIVE: Au, Loaded: Bu, Progress: Ru, Fullscreen: Mu, "Exit Fullscreen": "Mali ekran", Mute: zu, Unmute: _u, "Playback Rate": "Stopa reprodukcije", Subtitles: Lu, "subtitles off": "Podnaslov deaktiviran", Captions: Nu, "captions off": "Titlovi deaktivirani", Chapters: Iu, "You aborted the media playback": "Isklju\u010Dili ste reprodukciju videa.", "A network error caused the media download to fail part-way.": "Video se prestao preuzimati zbog gre\u0161ke na mre\u017Ei.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Video se ne mo\u017Ee reproducirati zbog servera, gre\u0161ke u mre\u017Ei ili je format ne podr\u017Ean.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Reprodukcija videa je zaustavljenja zbog gre\u0161ke u formatu ili zbog verzije va\u0161eg pretra\u017Eiva\u010Da.", "No compatible source was found for this media.": "Nije na\u0111en nijedan kompatibilan izvor ovog videa." };
});
var Na = {};
h(Na, { Captions: () => Zu, Chapters: () => Ju, Duration: () => Uu, Fullscreen: () => Hu, LIVE: () => Vu, Loaded: () => Wu, Mute: () => Gu, Pause: () => Ou, Play: () => $u, Progress: () => qu, Subtitles: () => Ku, Unmute: () => Yu, default: () => M_ });
var $u;
var Ou;
var Uu;
var Vu;
var Wu;
var qu;
var Hu;
var Gu;
var Yu;
var Ku;
var Zu;
var Ju;
var M_;
var Ia = p(() => {
  "use strict";
  $u = "\u0412\u044A\u0437\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0436\u0434\u0430\u043D\u0435", Ou = "\u041F\u0430\u0443\u0437\u0430", Uu = "\u041F\u0440\u043E\u0434\u044A\u043B\u0436\u0438\u0442\u0435\u043B\u043D\u043E\u0441\u0442", Vu = "\u041D\u0410 \u0416\u0418\u0412\u041E", Wu = "\u0417\u0430\u0440\u0435\u0434\u0435\u043D\u043E", qu = "\u041F\u0440\u043E\u0433\u0440\u0435\u0441", Hu = "\u0426\u044F\u043B \u0435\u043A\u0440\u0430\u043D", Gu = "\u0411\u0435\u0437 \u0437\u0432\u0443\u043A", Yu = "\u0421\u044A\u0441 \u0437\u0432\u0443\u043A", Ku = "\u0421\u0443\u0431\u0442\u0438\u0442\u0440\u0438", Zu = "\u0410\u0443\u0434\u0438\u043E \u043D\u0430\u0434\u043F\u0438\u0441\u0438", Ju = "\u0413\u043B\u0430\u0432\u0438", M_ = { Play: $u, Pause: Ou, "Current Time": "\u0422\u0435\u043A\u0443\u0449\u043E \u0432\u0440\u0435\u043C\u0435", Duration: Uu, "Remaining Time": "\u041E\u0441\u0442\u0430\u0432\u0430\u0449\u043E \u0432\u0440\u0435\u043C\u0435", "Stream Type": "\u0422\u0438\u043F \u043D\u0430 \u043F\u043E\u0442\u043E\u043A\u0430", LIVE: Vu, Loaded: Wu, Progress: qu, Fullscreen: Hu, "Exit Fullscreen": "\u0421\u043F\u0438\u0440\u0430\u043D\u0435 \u043D\u0430 \u0446\u044F\u043B \u0435\u043A\u0440\u0430\u043D", Mute: Gu, Unmute: Yu, "Playback Rate": "\u0421\u043A\u043E\u0440\u043E\u0441\u0442 \u043D\u0430 \u0432\u044A\u0437\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0436\u0434\u0430\u043D\u0435", Subtitles: Ku, "subtitles off": "\u0421\u043F\u0440\u044F\u043D\u0438 \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u0438", Captions: Zu, "captions off": "\u0421\u043F\u0440\u044F\u043D\u0438 \u0430\u0443\u0434\u0438\u043E \u043D\u0430\u0434\u043F\u0438\u0441\u0438", Chapters: Ju, "You aborted the media playback": "\u0421\u043F\u0440\u044F\u0445\u0442\u0435 \u0432\u044A\u0437\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0436\u0434\u0430\u043D\u0435\u0442\u043E \u043D\u0430 \u0432\u0438\u0434\u0435\u043E\u0442\u043E", "A network error caused the media download to fail part-way.": "\u0413\u0440\u0435\u0448\u043A\u0430 \u0432 \u043C\u0440\u0435\u0436\u0430\u0442\u0430 \u043F\u0440\u043E\u0432\u0430\u043B\u0438 \u0438\u0437\u0442\u0435\u0433\u043B\u044F\u043D\u0435\u0442\u043E \u043D\u0430 \u0432\u0438\u0434\u0435\u043E\u0442\u043E.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\u0412\u0438\u0434\u0435\u043E\u0442\u043E \u043D\u0435 \u043C\u043E\u0436\u0435 \u0434\u0430 \u0431\u044A\u0434\u0435 \u0437\u0430\u0440\u0435\u0434\u0435\u043D\u043E \u0437\u0430\u0440\u0430\u0434\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C \u0441\u044A\u0441 \u0441\u044A\u0440\u0432\u044A\u0440\u0430 \u0438\u043B\u0438 \u043C\u0440\u0435\u0436\u0430\u0442\u0430 \u0438\u043B\u0438 \u0437\u0430\u0449\u043E\u0442\u043E \u0442\u043E\u0437\u0438 \u0444\u043E\u0440\u043C\u0430\u0442 \u043D\u0435 \u0435 \u043F\u043E\u0434\u0434\u044A\u0440\u0436\u0430\u043D.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\u0412\u044A\u0437\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0436\u0434\u0430\u043D\u0435\u0442\u043E \u043D\u0430 \u0432\u0438\u0434\u0435\u043E\u0442\u043E \u0431\u0435\u0448\u0435 \u043F\u0440\u0435\u043A\u044A\u0441\u043D\u0430\u0442\u043E \u0437\u0430\u0440\u0430\u0434\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C \u0441 \u0444\u0430\u0439\u043B\u0430 \u0438\u043B\u0438 \u0437\u0430\u0449\u043E\u0442\u043E \u0432\u0438\u0434\u0435\u043E\u0442\u043E \u0438\u0437\u043F\u043E\u043B\u0437\u0432\u0430 \u043E\u043F\u0446\u0438\u0438 \u043A\u043E\u0438\u0442\u043E \u0431\u0440\u0430\u0443\u0437\u044A\u0440\u044A\u0442 \u0412\u0438 \u043D\u0435 \u043F\u043E\u0434\u0434\u044A\u0440\u0436\u0430.", "No compatible source was found for this media.": "\u041D\u0435 \u0431\u0435\u0448\u0435 \u043D\u0430\u043C\u0435\u0440\u0435\u043D \u0441\u044A\u0432\u043C\u0435\u0441\u0442\u0438\u043C \u0438\u0437\u0442\u043E\u0447\u043D\u0438\u043A \u0437\u0430 \u0442\u043E\u0432\u0430 \u0432\u0438\u0434\u0435\u043E." };
});
var $a = {};
h($a, { Background: () => kd, Black: () => gd, Blue: () => vd, Captions: () => cd, Casual: () => Ad, Chapters: () => ud, Close: () => pd, Cyan: () => wd, Depressed: () => Td, Descriptions: () => dd, Done: () => Md, Dropshadow: () => jd, Duration: () => td, Fullscreen: () => sd, Green: () => Dd, LIVE: () => od, Loaded: () => nd, Magenta: () => bd, Mute: () => id, None: () => Ed, Opaque: () => Sd, Pause: () => Qu, Play: () => Xu, Progress: () => ad, Raised: () => Fd, Red: () => hd, Replay: () => ed, Reset: () => Rd, Script: () => Bd, Subtitles: () => ld, Text: () => md, Transparent: () => xd, Uniform: () => Pd, Unmute: () => rd, White: () => fd, Window: () => Cd, Yellow: () => yd, default: () => z_ });
var Xu;
var Qu;
var ed;
var td;
var od;
var nd;
var ad;
var sd;
var id;
var rd;
var ld;
var cd;
var ud;
var dd;
var pd;
var md;
var fd;
var gd;
var hd;
var Dd;
var vd;
var yd;
var bd;
var wd;
var kd;
var Cd;
var xd;
var Sd;
var Ed;
var Fd;
var Td;
var Pd;
var jd;
var Ad;
var Bd;
var Rd;
var Md;
var z_;
var Oa = p(() => {
  "use strict";
  Xu = "\u09AA\u09CD\u09B2\u09C7 \u0995\u09B0\u09C1\u09A8", Qu = "\u09AC\u09BF\u09B0\u09BE\u09AE", ed = "\u09B0\u09BF\u09AA\u09CD\u09B2\u09C7 \u0995\u09B0\u09C1\u09A8", td = "\u09AC\u09CD\u09AF\u09BE\u09AA\u09CD\u09A4\u09BF\u0995\u09BE\u09B2", od = "\u09B2\u09BE\u0987\u09AD", nd = "\u09B2\u09CB\u09A1 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7", ad = "\u09AA\u09CD\u09B0\u09CB\u0997\u09CD\u09B0\u09C7\u09B8", sd = "\u09AA\u09C2\u09B0\u09CD\u09A3 \u09B8\u09CD\u0995\u09CD\u09B0\u09C0\u09A8", id = "\u09AE\u09BF\u0989\u099F", rd = "\u0986\u09A8\u09AE\u09BF\u0989\u099F", ld = "\u09B8\u09BE\u09AC\u099F\u09BE\u0987\u099F\u09C7\u09B2", cd = "\u0995\u09CD\u09AF\u09BE\u09AA\u09B6\u09A8", ud = "\u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC", dd = "\u09AC\u09B0\u09CD\u09A3\u09A8\u09BE", pd = "\u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8", md = "\u099F\u09C7\u0995\u09CD\u09B8\u099F", fd = "\u09B8\u09BE\u09A6\u09BE", gd = "\u0995\u09BE\u09B2\u09CB", hd = "\u09B2\u09BE\u09B2", Dd = "\u09B8\u09AC\u09C1\u099C", vd = "\u09A8\u09C0\u09B2", yd = "\u09B9\u09B2\u09C1\u09A6", bd = "\u09AE\u09CD\u09AF\u09BE\u099C\u09C7\u09A8\u09CD\u099F\u09BE", wd = "\u09A8\u09C0\u09B2 \u09B8\u09AC\u09C1\u099C", kd = "\u09AA\u099F\u09AD\u09C2\u09AE\u09BF", Cd = "\u0989\u0987\u09A8\u09CD\u09A1\u09CB", xd = "\u09B8\u09CD\u09AC\u099A\u09CD\u099B", Sd = "\u0985\u09B8\u09CD\u09AC\u099A\u09CD\u099B", Ed = "\u0995\u09CB\u09A8\u09CB\u099F\u09BF\u0987 \u09A8\u09AF\u09BC", Fd = "\u09AC\u09BE\u09DC\u09BE\u09A8\u09CB \u09B9\u09DF\u09C7\u099B\u09C7", Td = "\u09A8\u09BE\u09AE\u09BE\u09A8\u09CB \u09B9\u09DF\u09C7\u099B\u09C7", Pd = "\u0987\u0989\u09A8\u09BF\u09AB\u09B0\u09CD\u09AE", jd = "\u09A1\u09CD\u09B0\u09AA\u09B6\u09CD\u09AF\u09BE\u09A1\u09CB", Ad = "\u0995\u09CD\u09AF\u09BE\u099C\u09C1\u09AF\u09BC\u09BE\u09B2", Bd = "\u09B8\u09CD\u0995\u09CD\u09B0\u09BF\u09AA\u09CD\u099F", Rd = "\u09B0\u09BF\u09B8\u09C7\u099F", Md = "\u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8", z_ = { "Audio Player": "\u0985\u09A1\u09BF\u0993 \u09AA\u09CD\u09B2\u09C7\u09AF\u09BC\u09BE\u09B0", "Video Player": "\u09AD\u09BF\u09A1\u09BF\u0993 \u09AA\u09CD\u09B2\u09C7\u09AF\u09BC\u09BE\u09B0", Play: Xu, Pause: Qu, Replay: ed, "Current Time": "\u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8 \u09B8\u09AE\u09AF\u09BC", Duration: td, "Remaining Time": "\u0985\u09AC\u09B6\u09BF\u09B7\u09CD\u099F \u09B8\u09AE\u09AF\u09BC", "Stream Type": "\u09B8\u09CD\u099F\u09CD\u09B0\u09BF\u09AE\u09C7\u09B0 \u09A7\u09B0\u09A8", LIVE: od, "Seek to live, currently behind live": "\u09B2\u09BE\u0987\u09AD \u09A6\u09C7\u0996\u09C1\u09A8, \u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8\u09C7 \u09B2\u09BE\u0987\u09AD\u09C7\u09B0 \u09AA\u09BF\u099B\u09A8\u09C7 \u0986\u099B\u09C7", "Seek to live, currently playing live": "\u09B2\u09BE\u0987\u09AD \u09A6\u09C7\u0996\u09C1\u09A8, \u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8\u09C7 \u09B2\u09BE\u0987\u09AD\u09C7 \u0986\u099B\u09C7", Loaded: nd, Progress: ad, "Progress Bar": "\u09AA\u09CD\u09B0\u09CB\u0997\u09CD\u09B0\u09C7\u09B8 \u09AC\u09BE\u09B0", "progress bar timing: currentTime={1} duration={2}": "{2} \u098F\u09B0 {1}", Fullscreen: sd, "Non-Fullscreen": "\u09AA\u09C2\u09B0\u09CD\u09A3 \u09B8\u09CD\u0995\u09CD\u09B0\u09C0\u09A8 \u09A5\u09C7\u0995\u09C7 \u09AA\u09CD\u09B0\u09B8\u09CD\u09A5\u09BE\u09A8 \u0995\u09B0\u09C1\u09A8", Mute: id, Unmute: rd, "Playback Rate": "\u09AA\u09CD\u09B2\u09C7\u09AC\u09CD\u09AF\u09BE\u0995 \u09B0\u09C7\u099F", Subtitles: ld, "subtitles off": "\u09B8\u09BE\u09AC\u099F\u09BE\u0987\u099F\u09C7\u09B2 \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8", Captions: cd, "captions off": "\u0995\u09CD\u09AF\u09BE\u09AA\u09B6\u09A8 \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8", Chapters: ud, Descriptions: dd, "descriptions off": "\u09AC\u09B0\u09CD\u09A3\u09A8\u09BE \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8", "Audio Track": "\u0985\u09A1\u09BF\u0993 \u0997\u09BE\u09A8", "Volume Level": "\u09AD\u09B2\u09BF\u0989\u09AE \u09B2\u09C7\u09AD\u09C7\u09B2", "You aborted the media playback": "\u0986\u09AA\u09A8\u09BF \u09AE\u09BF\u09A1\u09BF\u09AF\u09BC\u09BE \u09AA\u09CD\u09B2\u09C7\u09AC\u09CD\u09AF\u09BE\u0995 \u09AC\u09BE\u09A4\u09BF\u09B2 \u0995\u09B0\u09C7\u099B\u09C7\u09A8", "A network error caused the media download to fail part-way.": "\u098F\u0995\u099F\u09BF \u09A8\u09C7\u099F\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u0995 \u09A4\u09CD\u09B0\u09C1\u099F\u09BF\u09B0 \u0995\u09BE\u09B0\u09A3\u09C7 \u09AE\u09BF\u09A1\u09BF\u09AF\u09BC\u09BE \u09A1\u09BE\u0989\u09A8\u09B2\u09CB\u09A1 \u0986\u0982\u09B6\u09BF\u0995\u09AD\u09BE\u09AC\u09C7 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u09F7", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\u09AE\u09BF\u09A1\u09BF\u09AF\u09BC\u09BE \u09B2\u09CB\u09A1 \u0995\u09B0\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF, \u09B9\u09AF\u09BC \u09B8\u09BE\u09B0\u09CD\u09AD\u09BE\u09B0 \u09AC\u09BE \u09A8\u09C7\u099F\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u0995 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u0993\u09AF\u09BC\u09BE\u09B0 \u0995\u09BE\u09B0\u09A3\u09C7 \u09AC\u09BE \u09AB\u09B0\u09CD\u09AE\u09CD\u09AF\u09BE\u099F\u099F\u09BF \u09B8\u09AE\u09B0\u09CD\u09A5\u09BF\u09A4 \u09A8\u09AF\u09BC\u0964", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\u09AE\u09BF\u09A1\u09BF\u09AF\u09BC\u09BE \u09AA\u09CD\u09B2\u09C7\u09AC\u09CD\u09AF\u09BE\u0995 \u098F\u0995\u099F\u09BF \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE\u09B0 \u0995\u09BE\u09B0\u09A3\u09C7 \u09AC\u09BE \u09AE\u09BF\u09A1\u09BF\u09AF\u09BC\u09BE \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09BE \u09AC\u09C8\u09B6\u09BF\u09B7\u09CD\u099F\u09CD\u09AF\u0997\u09C1\u09B2\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 \u09AC\u09CD\u09B0\u09BE\u0989\u099C\u09BE\u09B0 \u09B8\u09AE\u09B0\u09CD\u09A5\u09A8 \u0995\u09B0\u09C7 \u09A8\u09BE \u09AC\u09B2\u09C7 \u09AC\u09BE\u09A4\u09BF\u09B2 \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u09F7", "No compatible source was found for this media.": "\u098F\u0987 \u09AE\u09BF\u09A1\u09BF\u09AF\u09BC\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u0995\u09CB\u09A8 \u09B8\u09BE\u09AE\u099E\u09CD\u099C\u09B8\u09CD\u09AF\u09AA\u09C2\u09B0\u09CD\u09A3 \u0989\u09CE\u09B8 \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF.", "The media is encrypted and we do not have the keys to decrypt it.": "\u09AE\u09BF\u09A1\u09BF\u09AF\u09BC\u09BE \u098F\u09A8\u0995\u09CD\u09B0\u09BF\u09AA\u09CD\u099F \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7 \u098F\u09AC\u0982 \u098F\u099F\u09BF \u09A1\u09BF\u0995\u09CD\u09B0\u09BF\u09AA\u09CD\u099F \u0995\u09B0\u09BE\u09B0 \u09B8\u09AE\u09BE\u09A7\u09BE\u09A8 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u0995\u09BE\u099B\u09C7 \u09A8\u09C7\u0987\u0964", "Play Video": "\u09AD\u09BF\u09A1\u09BF\u0993 \u09AA\u09CD\u09B2\u09C7 \u0995\u09B0\u09C1\u09A8", Close: pd, "Close Modal Dialog": "\u09AE\u09CB\u09A1\u09BE\u09B2 \u09A1\u09BE\u09AF\u09BC\u09BE\u09B2\u0997 \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09C1\u09A8", "Modal Window": "\u09AE\u09CB\u09A1\u09BE\u09B2 \u0989\u0987\u09A8\u09CD\u09A1\u09CB", "This is a modal window": "\u098F\u099F\u09BF \u098F\u0995\u099F\u09BF \u09AE\u09CB\u09A1\u09BE\u09B2 \u0989\u0987\u09A8\u09CD\u09A1\u09CB", "This modal can be closed by pressing the Escape key or activating the close button.": "Esc \u0995\u09C0 \u099A\u09C7\u09AA\u09C7 \u09AC\u09BE \u0995\u09CD\u09B2\u09CB\u099C \u09AC\u09BE\u099F\u09A8\u099F\u09BF \u09B8\u0995\u09CD\u09B0\u09BF\u09AF\u09BC \u0995\u09B0\u09C7 \u098F\u0987 \u09AE\u09A1\u09C7\u09B2\u099F\u09BF \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09BE \u09AF\u09C7\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u0964", ", opens captions settings dialog": ", \u0995\u09CD\u09AF\u09BE\u09AA\u09B6\u09A8 \u09B8\u09C7\u099F\u09BF\u0982\u09B8 \u09A1\u09BE\u09AF\u09BC\u09BE\u09B2\u0997 \u0996\u09CB\u09B2\u09C7", ", opens subtitles settings dialog": ", \u09B8\u09BE\u09AC\u099F\u09BE\u0987\u099F\u09C7\u09B2 \u09B8\u09C7\u099F\u09BF\u0982\u09B8 \u09A1\u09BE\u09AF\u09BC\u09BE\u09B2\u0997 \u0996\u09CB\u09B2\u09C7", ", opens descriptions settings dialog": ", \u09AC\u09B0\u09CD\u09A3\u09A8\u09BE \u09B8\u09C7\u099F\u09BF\u0982\u09B8 \u09A1\u09BE\u09AF\u09BC\u09BE\u09B2\u0997 \u0996\u09CB\u09B2\u09C7", ", selected": ", \u09A8\u09BF\u09B0\u09CD\u09AC\u09BE\u099A\u09BF\u09A4", "captions settings": "\u0995\u09CD\u09AF\u09BE\u09AA\u09B6\u09A8 \u09B8\u09C7\u099F\u09BF\u0982\u09B8", "subtitles settings": "\u09B8\u09BE\u09AC\u099F\u09BE\u0987\u099F\u09C7\u09B2 \u09B8\u09C7\u099F\u09BF\u0982\u09B8 ", "descriptions settings": "\u09AC\u09B0\u09CD\u09A3\u09A8\u09BE \u09B8\u09C7\u099F\u09BF\u0982\u09B8", Text: md, White: fd, Black: gd, Red: hd, Green: Dd, Blue: vd, Yellow: yd, Magenta: bd, Cyan: wd, Background: kd, Window: Cd, Transparent: xd, "Semi-Transparent": "\u0986\u09A7\u09BE-\u09B8\u09CD\u09AC\u099A\u09CD\u099B", Opaque: Sd, "Font Size": "\u0985\u0995\u09CD\u09B7\u09B0\u09C7\u09B0 \u0986\u0995\u09BE\u09B0", "Text Edge Style": "\u099F\u09C7\u0995\u09CD\u09B8\u099F \u098F\u099C \u09B8\u09CD\u099F\u09BE\u0987\u09B2", None: Ed, Raised: Fd, Depressed: Td, Uniform: Pd, Dropshadow: jd, "Font Family": "\u0985\u0995\u09CD\u09B7\u09B0\u09C7\u09B0 \u09AA\u09B0\u09BF\u09AC\u09BE\u09B0", "Proportional Sans-Serif": "\u09B8\u09AE\u09BE\u09A8\u09C1\u09AA\u09BE\u09A4\u09BF\u0995 \u09B8\u09BE\u09A8\u09B8-\u09B8\u09C7\u09B0\u09BF\u09AB", "Monospace Sans-Serif": "\u09AE\u09A8\u09CB\u09B8\u09CD\u09AA\u09C7\u09B8 \u09B8\u09BE\u09A8\u09B8-\u09B8\u09C7\u09B0\u09BF\u09AB", "Proportional Serif": "\u09B8\u09AE\u09BE\u09A8\u09C1\u09AA\u09BE\u09A4\u09BF\u0995 \u09B8\u09C7\u09B0\u09BF\u09AB", "Monospace Serif": "\u09AE\u09A8\u09CB\u09B8\u09CD\u09AA\u09C7\u09B8 \u09B8\u09C7\u09B0\u09BF\u09AB", Casual: Ad, Script: Bd, "Small Caps": "\u099B\u09CB\u099F \u0995\u09CD\u09AF\u09BE\u09AA\u09B8", Reset: Rd, "restore all settings to the default values": "\u09B8\u09AE\u09B8\u09CD\u09A4 \u09B8\u09C7\u099F\u09BF\u0982\u09B8 \u09A1\u09BF\u09AB\u09B2\u09CD\u099F \u09AE\u09BE\u09A8\u0997\u09C1\u09B2\u09BF\u09A4\u09C7 \u09AA\u09C1\u09A8\u09B0\u09C1\u09A6\u09CD\u09A7\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8", Done: Md, "Caption Settings Dialog": "\u0995\u09CD\u09AF\u09BE\u09AA\u09B6\u09A8 \u09B8\u09C7\u099F\u09BF\u0982\u09B8 \u09A1\u09BE\u09AF\u09BC\u09BE\u09B2\u0997", "Beginning of dialog window. Escape will cancel and close the window.": "\u09A1\u09BE\u09AF\u09BC\u09B2\u0997 \u0989\u0987\u09A8\u09CD\u09A1\u09CB\u09B0 \u09B6\u09C1\u09B0\u09C1\u0964 Esc \u0995\u09C0 \u09AC\u09BE\u09A4\u09BF\u09B2 \u0995\u09B0\u09AC\u09C7 \u098F\u09AC\u0982 \u0989\u0987\u09A8\u09CD\u09A1\u09CB \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09AC\u09C7\u0964", "End of dialog window.": "\u09A1\u09BE\u09AF\u09BC\u09BE\u09B2\u0997 \u0989\u0987\u09A8\u09CD\u09A1\u09CB\u09B0 \u09B6\u09C7\u09B7\u0964", "{1} is loading.": "{1} \u09B2\u09CB\u09A1 \u09B9\u099A\u09CD\u099B\u09C7.", "Exit Picture-in-Picture": "\u09AA\u09BF\u0995\u099A\u09BE\u09B0-\u0987\u09A8-\u09AA\u09BF\u0995\u099A\u09BE\u09B0 \u09A5\u09C7\u0995\u09C7 \u09AA\u09CD\u09B0\u09B8\u09CD\u09A5\u09BE\u09A8 \u0995\u09B0\u09C1\u09A8", "Picture-in-Picture": "\u09AA\u09BF\u0995\u099A\u09BE\u09B0-\u0987\u09A8-\u09AA\u09BF\u0995\u099A\u09BE\u09B0", "No content": "\u0995\u09CB\u09A8 \u09AC\u09BF\u09B7\u09AF\u09BC\u09AC\u09B8\u09CD\u09A4\u09C1 \u09A8\u09C7\u0987" };
});
var Ua = {};
h(Ua, { Captions: () => qd, Chapters: () => Hd, Duration: () => Ld, Fullscreen: () => Od, LIVE: () => Nd, Loaded: () => Id, Mute: () => Ud, Pause: () => _d, Play: () => zd, Progress: () => $d, Subtitles: () => Wd, Unmute: () => Vd, default: () => __ });
var zd;
var _d;
var Ld;
var Nd;
var Id;
var $d;
var Od;
var Ud;
var Vd;
var Wd;
var qd;
var Hd;
var __;
var Va = p(() => {
  "use strict";
  zd = "Reproducci\xF3", _d = "Pausa", Ld = "Durada total", Nd = "EN DIRECTE", Id = "Carregat", $d = "Progr\xE9s", Od = "Pantalla completa", Ud = "Silencia", Vd = "Amb so", Wd = "Subt\xEDtols", qd = "Llegendes", Hd = "Cap\xEDtols", __ = { Play: zd, Pause: _d, "Current Time": "Temps reprodu\xEFt", Duration: Ld, "Remaining Time": "Temps restant", "Stream Type": "Tipus de seq\xFC\xE8ncia", LIVE: Nd, Loaded: Id, Progress: $d, Fullscreen: Od, "Exit Fullscreen": "Pantalla no completa", Mute: Ud, Unmute: Vd, "Playback Rate": "Velocitat de reproducci\xF3", Subtitles: Wd, "subtitles off": "Subt\xEDtols desactivats", Captions: qd, "captions off": "Llegendes desactivades", Chapters: Hd, "You aborted the media playback": "Heu interromput la reproducci\xF3 del v\xEDdeo.", "A network error caused the media download to fail part-way.": "Un error de la xarxa ha interromput la baixada del v\xEDdeo.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "No s'ha pogut carregar el v\xEDdeo perqu\xE8 el servidor o la xarxa han fallat, o b\xE9 perqu\xE8 el seu format no \xE9s compatible.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "La reproducci\xF3 de v\xEDdeo s'ha interrumput per un problema de corrupci\xF3 de dades o b\xE9 perqu\xE8 el v\xEDdeo demanava funcions que el vostre navegador no ofereix.", "No compatible source was found for this media.": "No s'ha trobat cap font compatible amb el v\xEDdeo." };
});
var Wa = {};
h(Wa, { Background: () => Dp, Black: () => up, Blue: () => mp, Captions: () => ap, Casual: () => Ep, Chapters: () => sp, Close: () => rp, Cyan: () => hp, Depressed: () => Cp, Descriptions: () => ip, Done: () => Pp, Dropshadow: () => Sp, Duration: () => Zd, Fullscreen: () => ep, Green: () => pp, LIVE: () => Jd, Loaded: () => Xd, Magenta: () => gp, Mute: () => tp, None: () => wp, Opaque: () => bp, Pause: () => Yd, Play: () => Gd, Progress: () => Qd, Raised: () => kp, Red: () => dp, Replay: () => Kd, Reset: () => Tp, Script: () => Fp, Subtitles: () => np, Text: () => lp, Transparent: () => yp, Uniform: () => xp, Unmute: () => op, White: () => cp, Window: () => vp, Yellow: () => fp, default: () => L_ });
var Gd;
var Yd;
var Kd;
var Zd;
var Jd;
var Xd;
var Qd;
var ep;
var tp;
var op;
var np;
var ap;
var sp;
var ip;
var rp;
var lp;
var cp;
var up;
var dp;
var pp;
var mp;
var fp;
var gp;
var hp;
var Dp;
var vp;
var yp;
var bp;
var wp;
var kp;
var Cp;
var xp;
var Sp;
var Ep;
var Fp;
var Tp;
var Pp;
var L_;
var qa = p(() => {
  "use strict";
  Gd = "P\u0159ehr\xE1t", Yd = "Pozastavit", Kd = "P\u0159ehr\xE1t znovu", Zd = "Doba trv\xE1n\xED", Jd = "\u017DIV\u011A", Xd = "Na\u010Dteno", Qd = "Stav", ep = "Cel\xE1 obrazovka", tp = "Ztlumit", op = "Zru\u0161it ztlumen\xED", np = "Titulky", ap = "Popisky", sp = "Kapitoly", ip = "Popisy", rp = "Zav\u0159it", lp = "Titulky", cp = "B\xEDl\xE9", up = "\u010Cern\xE9", dp = "\u010Cerven\xE9", pp = "Zelen\xE9", mp = "Modr\xE9", fp = "\u017Dlut\xE9", gp = "Fialov\xE9", hp = "Azurov\xE9", Dp = "Pozad\xED titulk\u016F", vp = "Okno", yp = "Pr\u016Fhledn\xE9", bp = "Nepr\u016Fhledn\xE9", wp = "Bez okraje", kp = "Zv\xFD\u0161en\xFD", Cp = "Propadl\xFD", xp = "Rovnom\u011Brn\xFD", Sp = "St\xEDnovan\xFD", Ep = "Hrav\xE9", Fp = "Ru\u010Dn\u011B psan\xE9", Tp = "Obnovit", Pp = "Hotovo", L_ = { "Audio Player": "Audio P\u0159ehrava\u010D", "Video Player": "Video P\u0159ehrava\u010D", Play: Gd, Pause: Yd, Replay: Kd, "Current Time": "Aktu\xE1ln\xED \u010Das", Duration: Zd, "Remaining Time": "Zb\xFDvaj\xEDc\xED \u010Das", "Stream Type": "Typ streamu", LIVE: Jd, Loaded: Xd, Progress: Qd, "Progress Bar": "Ukazatel pr\u016Fb\u011Bhu", "progress bar timing: currentTime={1} duration={2}": "{1} z {2}", Fullscreen: ep, "Exit Fullscreen": "B\u011B\u017En\xE9 zobrazen\xED", Mute: tp, Unmute: op, "Playback Rate": "Rychlost p\u0159ehr\xE1v\xE1n\xED", Subtitles: np, "subtitles off": "Bez titulk\u016F", Captions: ap, "captions off": "Popisky vypnut\xE9", Chapters: sp, Descriptions: ip, "descriptions off": "Bez popis\u016F", "Audio Track": "Zvukov\xE1 stopa", "Volume Level": "Hlasitost", "You aborted the media playback": "P\u0159ehr\xE1v\xE1n\xED videa bylo p\u0159eru\u0161eno.", "A network error caused the media download to fail part-way.": "Video nemohlo b\xFDt na\u010Dteno kv\u016Fli chyb\u011B v s\xEDti.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Video nemohlo b\xFDt na\u010Dteno, bu\u010F kv\u016Fli chyb\u011B serveru, s\xEDt\u011B nebo proto, \u017Ee dan\xFD form\xE1t nen\xED podporov\xE1n.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "V\xE1\u0161 prohl\xED\u017Ee\u010D nepodporuje tento form\xE1t videa.", "No compatible source was found for this media.": "Nevalidn\xED zadan\xFD zdroj videa.", "The media is encrypted and we do not have the keys to decrypt it.": "Chyba p\u0159i de\u0161ifrov\xE1n\xED videa.", "Play Video": "P\u0159ehr\xE1t video", Close: rp, "Close Modal Dialog": "Zav\u0159\xEDt okno", "Modal Window": "Mod\xE1ln\xED okno", "This is a modal window": "Toto je mod\xE1ln\xED okno", "This modal can be closed by pressing the Escape key or activating the close button.": "Toto okno se d\xE1 zav\u0159\xEDt k\u0159\xED\u017Ekem nebo kl\xE1vesou Esc.", ", opens captions settings dialog": ", otev\u0159\xEDt okno pro nastaven\xED popisk\u016F", ", opens subtitles settings dialog": ", otev\u0159\xEDt okno pro nastaven\xED titulk\u016F", ", opens descriptions settings dialog": ", otev\u0159e okno pro nastaven\xED popisk\u016F pro nevidom\xE9", ", selected": ", vybr\xE1no", "captions settings": "nastaven\xED popisk\u016F", "subtitles settings": "nastaven\xED titulk\u016F", "descriptions settings": "nastaven\xED popisk\u016F pro nevidom\xE9", Text: lp, White: cp, Black: up, Red: dp, Green: pp, Blue: mp, Yellow: fp, Magenta: gp, Cyan: hp, Background: Dp, Window: vp, Transparent: yp, "Semi-Transparent": "Polopr\u016Fhledn\xE9", Opaque: bp, "Font Size": "Velikost p\xEDsma", "Text Edge Style": "Okraje p\xEDsma", None: wp, Raised: kp, Depressed: Cp, Uniform: xp, Dropshadow: Sp, "Font Family": "Rodina p\xEDsma", "Proportional Sans-Serif": "Proporcion\xE1ln\xED bezpatkov\xE9", "Monospace Sans-Serif": "Monospace bezpatkov\xE9", "Proportional Serif": "Proporcion\xE1ln\xED patkov\xE9", "Monospace Serif": "Monospace patkov\xE9", Casual: Ep, Script: Fp, "Small Caps": "Mal\xE9 kapit\xE1lky", Reset: Tp, "restore all settings to the default values": "Vr\xE1tit nastaven\xED do v\xFDchoz\xEDho stavu", Done: Pp, "Caption Settings Dialog": "Okno s nastaven\xEDm titulk\u016F", "Beginning of dialog window. Escape will cancel and close the window.": "Za\u010D\xE1tek dialogov\xE9ho okna. Kl\xE1vesa Esc okno zav\u0159e.", "End of dialog window.": "Konec dialogov\xE9ho okna.", "{1} is loading.": "{1} se na\u010D\xEDt\xE1." };
});
var Ha = {};
h(Ha, { Background: () => em, Black: () => Gp, Blue: () => Zp, Captions: () => Op, Casual: () => cm, Chapters: () => Up, Close: () => Wp, Cyan: () => Qp, Depressed: () => im, Descriptions: () => Vp, Done: () => pm, Dropshadow: () => lm, Duration: () => Rp, Fullscreen: () => Lp, Green: () => Kp, LIVE: () => Mp, Loaded: () => zp, Magenta: () => Xp, Mute: () => Np, None: () => am, Opaque: () => nm, Pause: () => Ap, Play: () => jp, Progress: () => _p, Raised: () => sm, Red: () => Yp, Replay: () => Bp, Reset: () => dm, Script: () => um, Subtitles: () => $p, Text: () => qp, Transparent: () => om, Uniform: () => rm, Unmute: () => Ip, White: () => Hp, Window: () => tm, Yellow: () => Jp, default: () => N_ });
var jp;
var Ap;
var Bp;
var Rp;
var Mp;
var zp;
var _p;
var Lp;
var Np;
var Ip;
var $p;
var Op;
var Up;
var Vp;
var Wp;
var qp;
var Hp;
var Gp;
var Yp;
var Kp;
var Zp;
var Jp;
var Xp;
var Qp;
var em;
var tm;
var om;
var nm;
var am;
var sm;
var im;
var rm;
var lm;
var cm;
var um;
var dm;
var pm;
var N_;
var Ga = p(() => {
  "use strict";
  jp = "Chwarae", Ap = "Oedi", Bp = "Ailchwarae", Rp = "Parhad", Mp = "YN FYW", zp = "Llwythwyd", _p = "Cynnydd", Lp = "Sgr\xEEn Lawn", Np = "Pylu", Ip = "Dad-bylu", $p = "Isdeitlau", Op = "Capsiynau", Up = "Penodau", Vp = "Disgrifiadau", Wp = "Cau", qp = "Testun", Hp = "Gwyn", Gp = "Du", Yp = "Coch", Kp = "Gwyrdd", Zp = "Glas", Jp = "Melyn", Xp = "Piws", Qp = "Cyan", em = "Cefndir", tm = "Ffenestr", om = "Tryloyw", nm = "Di-draidd", am = "Dim", sm = "Uwch", im = "Is", rm = "Unffurf", lm = "Cysgod cefn", cm = "Llawysgrif", um = "Sgript", dm = "Ailosod", pm = "Gorffenwyd", N_ = { "Audio Player": "Chwaraewr sain", "Video Player": "Chwaraewr fideo", Play: jp, Pause: Ap, Replay: Bp, "Current Time": "Amser Cyfredol", Duration: Rp, "Remaining Time": "Amser ar \xF4l", "Stream Type": "Math o Ffrwd", LIVE: Mp, Loaded: zp, Progress: _p, "Progress Bar": "Bar Cynnydd", "progress bar timing: currentTime={1} duration={2}": "{1} o {2}", Fullscreen: Lp, "Exit Fullscreen": "Ffenestr", Mute: Np, Unmute: Ip, "Playback Rate": "Cyfradd Chwarae", Subtitles: $p, "subtitles off": "Isdeitlau i ffwrdd", Captions: Op, "captions off": "Capsiynau i ffwrdd", Chapters: Up, Descriptions: Vp, "descriptions off": "disgrifiadau i ffwrdd", "Audio Track": "Trac Sain", "Volume Level": "Lefel Sain", "You aborted the media playback": "Atalwyd y fideo gennych", "A network error caused the media download to fail part-way.": "Mae gwall rhwydwaith wedi achosi methiant lawrlwytho.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Ni lwythodd y fideo, oherwydd methiant gweinydd neu rwydwaith, neu achos nid yw'r system yn cefnogi'r fformat.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Atalwyd y fideo oherwydd problem llygredd data neu oherwydd nid yw'ch porwr yn cefnogi nodweddion penodol o'r fideo.", "No compatible source was found for this media.": "Nid oedd modd canfod ffynhonnell cyt\xFBn am y fideo hwn.", "The media is encrypted and we do not have the keys to decrypt it.": "Mae'r fideo wedi ei amgryptio ac nid oes allweddion gennym.", "Play Video": "Chwarae Fideo", Close: Wp, "Close Modal Dialog": "Cau Blwch Deialog Moddol", "Modal Window": "Ffenestr Foddol", "This is a modal window": "Mae hon yn ffenestr foddol", "This modal can be closed by pressing the Escape key or activating the close button.": "Gallech chi gau'r ffenestr foddol hon trwy wasgu Escape neu glicio'r botwm cau.", ", opens captions settings dialog": ", yn agor gosodiadau capsiynau", ", opens subtitles settings dialog": ", yn agor gosodiadau isdeitlau", ", opens descriptions settings dialog": ", yn agor gosodiadau disgrifiadau", ", selected": ", detholwyd", "captions settings": "gosodiadau capsiynau", "subtitles settings": "gosodiadau isdeitlau", "descriptions settings": "gosodiadau disgrifiadau", Text: qp, White: Hp, Black: Gp, Red: Yp, Green: Kp, Blue: Zp, Yellow: Jp, Magenta: Xp, Cyan: Qp, Background: em, Window: tm, Transparent: om, "Semi-Transparent": "Hanner-dryloyw", Opaque: nm, "Font Size": "Maint y Ffont", "Text Edge Style": "Arddull Ymylon Testun", None: am, Raised: sm, Depressed: im, Uniform: rm, Dropshadow: lm, "Font Family": "Teulu y Ffont", "Proportional Sans-Serif": "Heb-Seriff Cyfraneddol", "Monospace Sans-Serif": "Heb-Seriff Unlled", "Proportional Serif": "Seriff Gyfraneddol", "Monospace Serif": "Seriff Unlled", Casual: cm, Script: um, "Small Caps": "Prif Lythyrennau Bychain", Reset: dm, "restore all settings to the default values": "Adfer yr holl osodiadau diofyn", Done: pm, "Caption Settings Dialog": "Blwch Gosodiadau Capsiynau", "Beginning of dialog window. Escape will cancel and close the window.": "Dechrau ffenestr deialog. Bydd Escape yn canslo a chau'r ffenestr.", "End of dialog window.": "Diwedd ffenestr deialog.", "{1} is loading.": "{1} yn llwytho." };
});
var Ya = {};
h(Ya, { Captions: () => Cm, Chapters: () => xm, Duration: () => gm, Fullscreen: () => ym, LIVE: () => hm, Loaded: () => Dm, Mute: () => bm, Pause: () => fm, Play: () => mm, Progress: () => vm, Subtitles: () => km, Unmute: () => wm, default: () => I_ });
var mm;
var fm;
var gm;
var hm;
var Dm;
var vm;
var ym;
var bm;
var wm;
var km;
var Cm;
var xm;
var I_;
var Ka = p(() => {
  "use strict";
  mm = "Afspil", fm = "Pause", gm = "Varighed", hm = "LIVE", Dm = "Indl\xE6st", vm = "Status", ym = "Fuldsk\xE6rm", bm = "Uden lyd", wm = "Med lyd", km = "Undertekster", Cm = "Undertekster for h\xF8reh\xE6mmede", xm = "Kapitler", I_ = { Play: mm, Pause: fm, "Current Time": "Aktuel tid", Duration: gm, "Remaining Time": "Resterende tid", "Stream Type": "Stream-type", LIVE: hm, Loaded: Dm, Progress: vm, Fullscreen: ym, "Exit Fullscreen": "Luk fuldsk\xE6rm", Mute: bm, Unmute: wm, "Playback Rate": "Afspilningsrate", Subtitles: km, "subtitles off": "Uden undertekster", Captions: Cm, "captions off": "Uden undertekster for h\xF8reh\xE6mmede", Chapters: xm, "You aborted the media playback": "Du afbr\xF8d videoafspilningen.", "A network error caused the media download to fail part-way.": "En netv\xE6rksfejl fik download af videoen til at fejle.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Videoen kunne ikke indl\xE6ses, enten fordi serveren eller netv\xE6rket fejlede, eller fordi formatet ikke er underst\xF8ttet.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Videoafspilningen blev afbrudt p\xE5 grund af \xF8delagte data eller fordi videoen benyttede faciliteter som din browser ikke underst\xF8tter.", "No compatible source was found for this media.": "Fandt ikke en kompatibel kilde for denne media." };
});
var Za = {};
h(Za, { Background: () => Km, Black: () => Um, Blue: () => qm, Captions: () => _m, Casual: () => af, Chapters: () => Lm, Close: () => Nm, Color: () => cf, Cyan: () => Ym, Depressed: () => tf, Descriptions: () => Im, Done: () => lf, Dropshadow: () => nf, Duration: () => Tm, Fullscreen: () => Bm, Green: () => Wm, LIVE: () => Pm, Loaded: () => jm, Magenta: () => Gm, Mute: () => Rm, None: () => Qm, Opacity: () => uf, Opaque: () => Xm, Pause: () => Em, Play: () => Sm, Progress: () => Am, Raised: () => ef, Red: () => Vm, Replay: () => Fm, Reset: () => rf, Script: () => sf, Subtitles: () => zm, Text: () => $m, Transparent: () => Jm, Uniform: () => of, Unmute: () => Mm, White: () => Om, Window: () => Zm, Yellow: () => Hm, default: () => $_ });
var Sm;
var Em;
var Fm;
var Tm;
var Pm;
var jm;
var Am;
var Bm;
var Rm;
var Mm;
var zm;
var _m;
var Lm;
var Nm;
var Im;
var $m;
var Om;
var Um;
var Vm;
var Wm;
var qm;
var Hm;
var Gm;
var Ym;
var Km;
var Zm;
var Jm;
var Xm;
var Qm;
var ef;
var tf;
var of;
var nf;
var af;
var sf;
var rf;
var lf;
var cf;
var uf;
var $_;
var Ja = p(() => {
  "use strict";
  Sm = "Wiedergabe", Em = "Pause", Fm = "Erneut abspielen", Tm = "Dauer", Pm = "LIVE", jm = "Geladen", Am = "Status", Bm = "Vollbild", Rm = "Stumm schalten", Mm = "Ton einschalten", zm = "Untertitel", _m = "Untertitel", Lm = "Kapitel", Nm = "Schlie\xDFen", Im = "Beschreibungen", $m = "Schrift", Om = "Wei\xDF", Um = "Schwarz", Vm = "Rot", Wm = "Gr\xFCn", qm = "Blau", Hm = "Gelb", Gm = "Magenta", Ym = "T\xFCrkis", Km = "Hintergrund", Zm = "Fenster", Jm = "Durchsichtig", Xm = "Undurchsichtig", Qm = "Kein", ef = "Erhoben", tf = "Gedr\xFCckt", of = "Uniform", nf = "Schlagschatten", af = "Zwanglos", sf = "Schreibschrift", rf = "Zur\xFCcksetzen", lf = "Fertig", cf = "Farbe", uf = "Deckkraft", $_ = { Play: Sm, Pause: Em, Replay: Fm, "Current Time": "Aktueller Zeitpunkt", Duration: Tm, "Remaining Time": "Verbleibende Zeit", "Stream Type": "Streamtyp", LIVE: Pm, Loaded: jm, Progress: Am, Fullscreen: Bm, "Exit Fullscreen": "Vollbildmodus beenden", Mute: Rm, Unmute: Mm, "Playback Rate": "Wiedergabegeschwindigkeit", Subtitles: zm, "subtitles off": "Untertitel aus", Captions: _m, "captions off": "Untertitel aus", Chapters: Lm, "You aborted the media playback": "Sie haben die Videowiedergabe abgebrochen.", "A network error caused the media download to fail part-way.": "Der Videodownload ist aufgrund eines Netzwerkfehlers fehlgeschlagen.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Das Video konnte nicht geladen werden, da entweder ein Server- oder Netzwerkfehler auftrat oder das Format nicht unterst\xFCtzt wird.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Die Videowiedergabe wurde entweder wegen eines Problems mit einem besch\xE4digten Video oder wegen verwendeten Funktionen, die vom Browser nicht unterst\xFCtzt werden, abgebrochen.", "No compatible source was found for this media.": "F\xFCr dieses Video wurde keine kompatible Quelle gefunden.", "Play Video": "Video abspielen", Close: Nm, "Modal Window": "Modales Fenster", "This is a modal window": "Dies ist ein modales Fenster", "This modal can be closed by pressing the Escape key or activating the close button.": 'Durch Dr\xFCcken der Esc-Taste bzw. Bet\xE4tigung der Schaltfl\xE4che "Schlie\xDFen" wird dieses modale Fenster geschlossen.', ", opens captions settings dialog": ", \xF6ffnet Einstellungen f\xFCr Untertitel", ", opens subtitles settings dialog": ", \xF6ffnet Einstellungen f\xFCr Untertitel", ", selected": ", ausgew\xE4hlt", "captions settings": "Untertiteleinstellungen", "subtitles settings": "Untertiteleinstellungen", "descriptions settings": "Einstellungen f\xFCr Beschreibungen", "Close Modal Dialog": "Modales Fenster schlie\xDFen", Descriptions: Im, "descriptions off": "Beschreibungen aus", "The media is encrypted and we do not have the keys to decrypt it.": "Die Entschl\xFCsselungsschl\xFCssel f\xFCr den verschl\xFCsselten Medieninhalt sind nicht verf\xFCgbar.", ", opens descriptions settings dialog": ", \xF6ffnet Einstellungen f\xFCr Beschreibungen", "Audio Track": "Tonspur", Text: $m, White: Om, Black: Um, Red: Vm, Green: Wm, Blue: qm, Yellow: Hm, Magenta: Gm, Cyan: Ym, Background: Km, Window: Zm, Transparent: Jm, "Semi-Transparent": "Halbdurchsichtig", Opaque: Xm, "Font Size": "Schriftgr\xF6\xDFe", "Text Edge Style": "Textkantenstil", None: Qm, Raised: ef, Depressed: tf, Uniform: of, Dropshadow: nf, "Font Family": "Schriftfamilie", "Proportional Sans-Serif": "Proportionale Sans-Serif", "Monospace Sans-Serif": "Monospace Sans-Serif", "Proportional Serif": "Proportionale Serif", "Monospace Serif": "Monospace Serif", Casual: af, Script: sf, "Small Caps": "Small-Caps", Reset: rf, "restore all settings to the default values": "Alle Einstellungen auf die Standardwerte zur\xFCcksetzen", Done: lf, "Caption Settings Dialog": "Einstellungsdialog f\xFCr Untertitel", "Beginning of dialog window. Escape will cancel and close the window.": "Anfang des Dialogfensters. Esc bricht ab und schlie\xDFt das Fenster.", "End of dialog window.": "Ende des Dialogfensters.", "Audio Player": "Audio-Player", "Video Player": "Video-Player", "Progress Bar": "Fortschrittsbalken", "progress bar timing: currentTime={1} duration={2}": "{1} von {2}", "Volume Level": "Lautst\xE4rke", "{1} is loading.": "{1} wird geladen.", "Seek to live, currently behind live": "Zur Live-\xDCbertragung wechseln. Aktuell wird es nicht live abgespielt.", "Seek to live, currently playing live": "Zur Live-\xDCbertragung wechseln. Es wird aktuell live abgespielt.", "Exit Picture-in-Picture": "Bild-im-Bild-Modus beenden", "Picture-in-Picture": "Bild-im-Bild-Modus", "No content": "Kein Inhalt", Color: cf, Opacity: uf, "Text Background": "Texthintergrund", "Caption Area Background": "Hintergrund des Untertitelbereichs", "Playing in Picture-in-Picture": "Wird im Bild-im-Bild-Modus wiedergegeben", "Skip forward {1} seconds": "{1} Sekunden vorw\xE4rts", "Skip backward {1} seconds": "{1} Sekunden zur\xFCck" };
});
var Xa = {};
h(Xa, { Captions: () => wf, Chapters: () => kf, Close: () => xf, Descriptions: () => Cf, Duration: () => mf, Fullscreen: () => Df, LIVE: () => ff, Loaded: () => gf, Mute: () => vf, Pause: () => pf, Play: () => df, Progress: () => hf, Subtitles: () => bf, Unmute: () => yf, default: () => O_ });
var df;
var pf;
var mf;
var ff;
var gf;
var hf;
var Df;
var vf;
var yf;
var bf;
var wf;
var kf;
var Cf;
var xf;
var O_;
var Qa = p(() => {
  "use strict";
  df = "A\u03BD\u03B1\u03C0\u03B1\u03C1\u03B1\u03B3\u03C9\u03B3\u03AE", pf = "\u03A0\u03B1\u03CD\u03C3\u03B7", mf = "\u03A3\u03C5\u03BD\u03BF\u03BB\u03B9\u03BA\u03CC\u03C2 \u03C7\u03C1\u03CC\u03BD\u03BF\u03C2", ff = "\u0396\u03A9\u039D\u03A4\u0391\u039D\u0391", gf = "\u03A6\u03CC\u03C1\u03C4\u03C9\u03C3\u03B7 \u03B5\u03C0\u03B9\u03C4\u03C5\u03C7\u03AE\u03C2", hf = "\u03A0\u03C1\u03CC\u03BF\u03B4\u03BF\u03C2", Df = "\u03A0\u03BB\u03AE\u03C1\u03B7\u03C2 \u03BF\u03B8\u03CC\u03BD\u03B7", vf = "\u03A3\u03AF\u03B3\u03B1\u03C3\u03B7", yf = "K\u03B1\u03C4\u03AC\u03C1\u03B3\u03B7\u03C3\u03B7 \u03C3\u03AF\u03B3\u03B1\u03C3\u03B7\u03C2", bf = "\u03A5\u03C0\u03CC\u03C4\u03B9\u03C4\u03BB\u03BF\u03B9", wf = "\u039B\u03B5\u03B6\u03AC\u03BD\u03C4\u03B5\u03C2", kf = "\u039A\u03B5\u03C6\u03AC\u03BB\u03B1\u03B9\u03B1", Cf = "\u03A0\u03B5\u03C1\u03B9\u03B3\u03C1\u03B1\u03C6\u03AD\u03C2", xf = "\u039A\u03BB\u03B5\u03AF\u03C3\u03B9\u03BC\u03BF", O_ = { Play: df, Pause: pf, "Current Time": "\u03A4\u03C1\u03AD\u03C7\u03C9\u03BD \u03C7\u03C1\u03CC\u03BD\u03BF\u03C2", Duration: mf, "Remaining Time": "\u03A5\u03C0\u03BF\u03BB\u03BF\u03B9\u03C0\u03CC\u03BC\u03B5\u03BD\u03BF\u03C2 \u03C7\u03C1\u03CC\u03BD\u03BF\u03C2", "Stream Type": "\u03A4\u03CD\u03C0\u03BF\u03C2 \u03C1\u03BF\u03AE\u03C2", LIVE: ff, Loaded: gf, Progress: hf, Fullscreen: Df, "Exit Fullscreen": "\u0388\u03BE\u03BF\u03B4\u03BF\u03C2 \u03B1\u03C0\u03CC \u03C0\u03BB\u03AE\u03C1\u03B7 \u03BF\u03B8\u03CC\u03BD\u03B7", Mute: vf, Unmute: yf, "Playback Rate": "\u03A1\u03C5\u03B8\u03BC\u03CC\u03C2 \u03B1\u03BD\u03B1\u03C0\u03B1\u03C1\u03B1\u03B3\u03C9\u03B3\u03AE\u03C2", Subtitles: bf, "subtitles off": "\u03B1\u03C0\u03CC\u03BA\u03C1\u03C5\u03C8\u03B7 \u03C5\u03C0\u03CC\u03C4\u03B9\u03C4\u03BB\u03C9\u03BD", Captions: wf, "captions off": "\u03B1\u03C0\u03CC\u03BA\u03C1\u03C5\u03C8\u03B7 \u03BB\u03B5\u03B6\u03AC\u03BD\u03C4\u03C9\u03BD", Chapters: kf, "Close Modal Dialog": "\u039A\u03BB\u03B5\u03AF\u03C3\u03B9\u03BC\u03BF \u03C0\u03B1\u03C1\u03B1\u03B8\u03CD\u03C1\u03BF\u03C5", Descriptions: Cf, "descriptions off": "\u03B1\u03C0\u03CC\u03BA\u03C1\u03C5\u03C8\u03B7 \u03C0\u03B5\u03C1\u03B9\u03B3\u03C1\u03B1\u03C6\u03CE\u03BD", "Audio Track": "\u03A1\u03BF\u03AE \u03AE\u03C7\u03BF\u03C5", "You aborted the media playback": "\u0391\u03BA\u03C5\u03C1\u03CE\u03C3\u03B1\u03C4\u03B5 \u03C4\u03B7\u03BD \u03B1\u03BD\u03B1\u03C0\u03B1\u03C1\u03B1\u03B3\u03C9\u03B3\u03AE", "A network error caused the media download to fail part-way.": "\u0388\u03BD\u03B1 \u03C3\u03C6\u03AC\u03BB\u03BC\u03B1 \u03B4\u03B9\u03BA\u03C4\u03CD\u03BF\u03C5 \u03C0\u03C1\u03BF\u03BA\u03AC\u03BB\u03B5\u03C3\u03B5 \u03C4\u03B7\u03BD \u03B1\u03C0\u03BF\u03C4\u03C5\u03C7\u03AF\u03B1 \u03BC\u03B5\u03C4\u03B1\u03C6\u03CC\u03C1\u03C4\u03C9\u03C3\u03B7\u03C2 \u03C4\u03BF\u03C5 \u03B1\u03C1\u03C7\u03B5\u03AF\u03BF\u03C5 \u03C0\u03C1\u03BF\u03C2 \u03B1\u03BD\u03B1\u03C0\u03B1\u03C1\u03B1\u03B3\u03C9\u03B3\u03AE.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\u03A4\u03BF \u03B1\u03C1\u03C7\u03B5\u03AF\u03BF \u03C0\u03C1\u03BF\u03C2 \u03B1\u03BD\u03B1\u03C0\u03B1\u03C1\u03B1\u03B3\u03C9\u03B3\u03AE \u03B4\u03B5\u03BD \u03AE\u03C4\u03B1\u03BD \u03B4\u03C5\u03BD\u03B1\u03C4\u03CC \u03BD\u03B1 \u03C6\u03BF\u03C1\u03C4\u03C9\u03B8\u03B5\u03AF \u03B5\u03AF\u03C4\u03B5 \u03B3\u03B9\u03B1\u03C4\u03AF \u03C5\u03C0\u03AE\u03C1\u03BE\u03B5 \u03C3\u03C6\u03AC\u03BB\u03BC\u03B1 \u03C3\u03C4\u03BF\u03BD \u03B4\u03B9\u03B1\u03BA\u03BF\u03BC\u03B9\u03C3\u03C4\u03AE \u03AE \u03C4\u03BF \u03B4\u03AF\u03BA\u03C4\u03C5\u03BF, \u03B5\u03AF\u03C4\u03B5 \u03B3\u03B9\u03B1\u03C4\u03AF \u03BF \u03C4\u03CD\u03C0\u03BF\u03C2 \u03C4\u03BF\u03C5 \u03B1\u03C1\u03C7\u03B5\u03AF\u03BF\u03C5 \u03B4\u03B5\u03BD \u03C5\u03C0\u03BF\u03C3\u03C4\u03B7\u03C1\u03AF\u03B6\u03B5\u03C4\u03B1\u03B9.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\u0397 \u03B1\u03BD\u03B1\u03C0\u03B1\u03C1\u03B1\u03B3\u03C9\u03B3\u03AE \u03B1\u03BA\u03C5\u03C1\u03CE\u03B8\u03B7\u03BA\u03B5 \u03B5\u03AF\u03C4\u03B5 \u03BB\u03CC\u03B3\u03C9 \u03BA\u03B1\u03C4\u03B5\u03C3\u03C4\u03C1\u03B1\u03BC\u03BC\u03AD\u03BD\u03BF\u03C5 \u03B1\u03C1\u03C7\u03B5\u03AF\u03BF\u03C5, \u03B5\u03AF\u03C4\u03B5 \u03B3\u03B9\u03B1\u03C4\u03AF \u03C4\u03BF \u03B1\u03C1\u03C7\u03B5\u03AF\u03BF \u03B1\u03C0\u03B1\u03B9\u03C4\u03B5\u03AF \u03BB\u03B5\u03B9\u03C4\u03BF\u03C5\u03C1\u03B3\u03AF\u03B5\u03C2 \u03C0\u03BF\u03C5 \u03B4\u03B5\u03BD \u03C5\u03C0\u03BF\u03C3\u03C4\u03B7\u03C1\u03AF\u03B6\u03BF\u03BD\u03C4\u03B1\u03B9 \u03B1\u03C0\u03CC \u03C4\u03BF \u03C0\u03C1\u03CC\u03B3\u03C1\u03B1\u03BC\u03BC\u03B1 \u03C0\u03B5\u03C1\u03B9\u03AE\u03B3\u03B7\u03C3\u03B7\u03C2 \u03C0\u03BF\u03C5 \u03C7\u03C1\u03B7\u03C3\u03B9\u03BC\u03BF\u03C0\u03BF\u03B9\u03B5\u03AF\u03C4\u03B5.", "No compatible source was found for this media.": "\u0394\u03B5\u03BD \u03B2\u03C1\u03AD\u03B8\u03B7\u03BA\u03B5 \u03C3\u03C5\u03BC\u03B2\u03B1\u03C4\u03AE \u03C0\u03B7\u03B3\u03AE \u03B1\u03BD\u03B1\u03C0\u03B1\u03C1\u03B1\u03B3\u03C9\u03B3\u03AE\u03C2 \u03B3\u03B9\u03B1 \u03C4\u03BF \u03C3\u03C5\u03B3\u03BA\u03B5\u03BA\u03C1\u03B9\u03BC\u03AD\u03BD\u03BF \u03B1\u03C1\u03C7\u03B5\u03AF\u03BF.", "The media is encrypted and we do not have the keys to decrypt it.": "\u03A4\u03BF \u03B1\u03C1\u03C7\u03B5\u03AF\u03BF \u03C0\u03C1\u03BF\u03C2 \u03B1\u03BD\u03B1\u03C0\u03B1\u03C1\u03B1\u03B3\u03C9\u03B3\u03AE \u03B5\u03AF\u03BD\u03B1\u03B9 \u03BA\u03C1\u03C5\u03C0\u03C4\u03BF\u03B3\u03C1\u03B1\u03C6\u03B7\u03BC\u03AD\u03BDo \u03BA\u03B1\u03B9 \u03B4\u03B5\u03BD \u03C5\u03C0\u03AC\u03C1\u03C7\u03BF\u03C5\u03BD \u03C4\u03B1 \u03B1\u03C0\u03B1\u03C1\u03B1\u03AF\u03C4\u03B7\u03C4\u03B1 \u03BA\u03BB\u03B5\u03B9\u03B4\u03B9\u03AC \u03B1\u03C0\u03BF\u03BA\u03C1\u03C5\u03C0\u03C4\u03BF\u03B3\u03C1\u03AC\u03C6\u03B7\u03C3\u03B7\u03C2.", "Play Video": "\u0391\u03BD\u03B1\u03C0\u03B1\u03C1\u03B1\u03B3\u03C9\u03B3\u03AE \u03B2\u03AF\u03BD\u03C4\u03B5\u03BF", Close: xf, "Modal Window": "A\u03BD\u03B1\u03B4\u03C5\u03CC\u03BC\u03B5\u03BD\u03BF \u03C0\u03B1\u03C1\u03AC\u03B8\u03C5\u03C1\u03BF", "This is a modal window": "\u03A4\u03BF \u03C0\u03B1\u03C1\u03CE\u03BD \u03B5\u03AF\u03BD\u03B1\u03B9 \u03AD\u03BD\u03B1 \u03B1\u03BD\u03B1\u03B4\u03C5\u03CC\u03BC\u03B5\u03BD\u03BF \u03C0\u03B1\u03C1\u03AC\u03B8\u03C5\u03C1\u03BF", "This modal can be closed by pressing the Escape key or activating the close button.": "\u0391\u03C5\u03C4\u03CC \u03C4\u03BF \u03C0\u03B1\u03C1\u03AC\u03B8\u03C5\u03C1\u03BF \u03BC\u03C0\u03BF\u03C1\u03B5\u03AF \u03BD\u03B1 \u03B5\u03BE\u03B1\u03C6\u03B1\u03BD\u03B9\u03C3\u03C4\u03B5\u03AF \u03C0\u03B1\u03C4\u03CE\u03BD\u03C4\u03B1\u03C2 \u03C4\u03BF \u03C0\u03BB\u03AE\u03BA\u03C4\u03C1\u03BF Escape \u03AE \u03C0\u03B1\u03C4\u03CE\u03BD\u03C4\u03B1\u03C2 \u03C4\u03BF \u03BA\u03BF\u03C5\u03BC\u03C0\u03AF \u03BA\u03BB\u03B5\u03B9\u03C3\u03AF\u03BC\u03B1\u03C4\u03BF\u03C2.", ", opens captions settings dialog": ", \u03B5\u03BC\u03C6\u03B1\u03BD\u03AF\u03B6\u03B5\u03B9 \u03C4\u03B9\u03C2 \u03C1\u03C5\u03B8\u03BC\u03AF\u03C3\u03B5\u03B9\u03C2 \u03B3\u03B9\u03B1 \u03C4\u03B9\u03C2 \u03BB\u03B5\u03B6\u03AC\u03BD\u03C4\u03B5\u03C2", ", opens subtitles settings dialog": ", \u03B5\u03BC\u03C6\u03B1\u03BD\u03AF\u03B6\u03B5\u03B9 \u03C4\u03B9\u03C2 \u03C1\u03C5\u03B8\u03BC\u03AF\u03C3\u03B5\u03B9\u03C2 \u03B3\u03B9\u03B1 \u03C4\u03BF\u03C5\u03C2 \u03C5\u03C0\u03CC\u03C4\u03B9\u03C4\u03BB\u03BF\u03C5\u03C2", ", opens descriptions settings dialog": ", \u03B5\u03BC\u03C6\u03B1\u03BD\u03AF\u03B6\u03B5\u03B9 \u03C4\u03B9\u03C2 \u03C1\u03C5\u03B8\u03BC\u03AF\u03C3\u03B5\u03B9\u03C2 \u03B3\u03B9\u03B1 \u03C4\u03B9\u03C2 \u03C0\u03B5\u03C1\u03B9\u03B3\u03C1\u03B1\u03C6\u03AD\u03C2", ", selected": ", \u03B5\u03C0\u03B9\u03BB\u03B5\u03B3\u03BC\u03AD\u03BD\u03BF" };
});
var es = {};
h(es, { Color: () => Sf, default: () => U_ });
var Sf;
var U_;
var ts = p(() => {
  "use strict";
  Sf = "Colour", U_ = { Color: Sf };
});
var os = {};
h(os, { Background: () => Zf, Black: () => Vf, Blue: () => Hf, Captions: () => Lf, Casual: () => sg, Chapters: () => Nf, Close: () => $f, Color: () => cg, Cyan: () => Kf, Depressed: () => og, Descriptions: () => If, Done: () => lg, Dropshadow: () => ag, Duration: () => Pf, Fullscreen: () => Rf, Green: () => qf, LIVE: () => jf, Loaded: () => Af, Magenta: () => Yf, Mute: () => Mf, None: () => eg, Opacity: () => ug, Opaque: () => Qf, Pause: () => Ff, Play: () => Ef, Progress: () => Bf, Raised: () => tg, Red: () => Wf, Replay: () => Tf, Reset: () => rg, Script: () => ig, Subtitles: () => _f, Text: () => Of, Transparent: () => Xf, Uniform: () => ng, Unmute: () => zf, White: () => Uf, Window: () => Jf, Yellow: () => Gf, default: () => V_ });
var Ef;
var Ff;
var Tf;
var Pf;
var jf;
var Af;
var Bf;
var Rf;
var Mf;
var zf;
var _f;
var Lf;
var Nf;
var If;
var $f;
var Of;
var Uf;
var Vf;
var Wf;
var qf;
var Hf;
var Gf;
var Yf;
var Kf;
var Zf;
var Jf;
var Xf;
var Qf;
var eg;
var tg;
var og;
var ng;
var ag;
var sg;
var ig;
var rg;
var lg;
var cg;
var ug;
var V_;
var ns = p(() => {
  "use strict";
  Ef = "Play", Ff = "Pause", Tf = "Replay", Pf = "Duration", jf = "LIVE", Af = "Loaded", Bf = "Progress", Rf = "Fullscreen", Mf = "Mute", zf = "Unmute", _f = "Subtitles", Lf = "Captions", Nf = "Chapters", If = "Descriptions", $f = "Close", Of = "Text", Uf = "White", Vf = "Black", Wf = "Red", qf = "Green", Hf = "Blue", Gf = "Yellow", Yf = "Magenta", Kf = "Cyan", Zf = "Background", Jf = "Window", Xf = "Transparent", Qf = "Opaque", eg = "None", tg = "Raised", og = "Depressed", ng = "Uniform", ag = "Dropshadow", sg = "Casual", ig = "Script", rg = "Reset", lg = "Done", cg = "Color", ug = "Opacity", V_ = { "Audio Player": "Audio Player", "Video Player": "Video Player", Play: Ef, Pause: Ff, Replay: Tf, "Current Time": "Current Time", Duration: Pf, "Remaining Time": "Remaining Time", "Stream Type": "Stream Type", LIVE: jf, "Seek to live, currently behind live": "Seek to live, currently behind live", "Seek to live, currently playing live": "Seek to live, currently playing live", Loaded: Af, Progress: Bf, "Progress Bar": "Progress Bar", "progress bar timing: currentTime={1} duration={2}": "{1} of {2}", Fullscreen: Rf, "Exit Fullscreen": "Exit Fullscreen", Mute: Mf, Unmute: zf, "Playback Rate": "Playback Rate", Subtitles: _f, "subtitles off": "subtitles off", Captions: Lf, "captions off": "captions off", Chapters: Nf, Descriptions: If, "descriptions off": "descriptions off", "Audio Track": "Audio Track", "Volume Level": "Volume Level", "You aborted the media playback": "You aborted the media playback", "A network error caused the media download to fail part-way.": "A network error caused the media download to fail part-way.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "The media could not be loaded, either because the server or network failed or because the format is not supported.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.", "No compatible source was found for this media.": "No compatible source was found for this media.", "The media is encrypted and we do not have the keys to decrypt it.": "The media is encrypted and we do not have the keys to decrypt it.", "Play Video": "Play Video", Close: $f, "Close Modal Dialog": "Close Modal Dialog", "Modal Window": "Modal Window", "This is a modal window": "This is a modal window", "This modal can be closed by pressing the Escape key or activating the close button.": "This modal can be closed by pressing the Escape key or activating the close button.", ", opens captions settings dialog": ", opens captions settings dialog", ", opens subtitles settings dialog": ", opens subtitles settings dialog", ", opens descriptions settings dialog": ", opens descriptions settings dialog", ", selected": ", selected", "captions settings": "captions settings", "subtitles settings": "subtitles settings", "descriptions settings": "descriptions settings", Text: Of, White: Uf, Black: Vf, Red: Wf, Green: qf, Blue: Hf, Yellow: Gf, Magenta: Yf, Cyan: Kf, Background: Zf, Window: Jf, Transparent: Xf, "Semi-Transparent": "Semi-Transparent", Opaque: Qf, "Font Size": "Font Size", "Text Edge Style": "Text Edge Style", None: eg, Raised: tg, Depressed: og, Uniform: ng, Dropshadow: ag, "Font Family": "Font Family", "Proportional Sans-Serif": "Proportional Sans-Serif", "Monospace Sans-Serif": "Monospace Sans-Serif", "Proportional Serif": "Proportional Serif", "Monospace Serif": "Monospace Serif", Casual: sg, Script: ig, "Small Caps": "Small Caps", Reset: rg, "restore all settings to the default values": "restore all settings to the default values", Done: lg, "Caption Settings Dialog": "Caption Settings Dialog", "Beginning of dialog window. Escape will cancel and close the window.": "Beginning of dialog window. Escape will cancel and close the window.", "End of dialog window.": "End of dialog window.", "{1} is loading.": "{1} is loading.", "Exit Picture-in-Picture": "Exit Picture-in-Picture", "Picture-in-Picture": "Picture-in-Picture", "No content": "No content", Color: cg, Opacity: ug, "Text Background": "Text Background", "Caption Area Background": "Caption Area Background", "Playing in Picture-in-Picture": "Playing in Picture-in-Picture", "Skip backward {1} seconds": "Skip backward {1} seconds", "Skip forward {1} seconds": "Skip forward {1} seconds" };
});
var as = {};
h(as, { Background: () => zg, Black: () => Tg, Blue: () => Ag, Captions: () => wg, Casual: () => Wg, Chapters: () => kg, Close: () => Sg, Color: () => Yg, Cyan: () => Mg, Depressed: () => Og, Descriptions: () => xg, Done: () => Gg, Dropshadow: () => Vg, Duration: () => mg, Fullscreen: () => Dg, Green: () => jg, LIVE: () => fg, Loaded: () => gg, Magenta: () => Rg, Mute: () => vg, None: () => Ig, Opacity: () => Kg, Opaque: () => Ng, Pause: () => pg, Play: () => dg, Progress: () => hg, Raised: () => $g, Red: () => Pg, Replay: () => Cg, Reset: () => Hg, Script: () => qg, Subtitles: () => bg, Text: () => Eg, Transparent: () => Lg, Uniform: () => Ug, Unmute: () => yg, White: () => Fg, Window: () => _g, Yellow: () => Bg, default: () => W_ });
var dg;
var pg;
var mg;
var fg;
var gg;
var hg;
var Dg;
var vg;
var yg;
var bg;
var wg;
var kg;
var Cg;
var xg;
var Sg;
var Eg;
var Fg;
var Tg;
var Pg;
var jg;
var Ag;
var Bg;
var Rg;
var Mg;
var zg;
var _g;
var Lg;
var Ng;
var Ig;
var $g;
var Og;
var Ug;
var Vg;
var Wg;
var qg;
var Hg;
var Gg;
var Yg;
var Kg;
var W_;
var ss = p(() => {
  "use strict";
  dg = "Reproducir", pg = "Pausa", mg = "Duraci\xF3n total", fg = "DIRECTO", gg = "Cargado", hg = "Progreso", Dg = "Pantalla completa", vg = "Desactivar el sonido", yg = "Activar el sonido", bg = "Subt\xEDtulos", wg = "Subt\xEDtulos especiales", kg = "Cap\xEDtulos", Cg = "Volver a reproducir", xg = "Descripciones", Sg = "Cerrar", Eg = "Texto", Fg = "Blanco", Tg = "Negro", Pg = "Rojo", jg = "Verde", Ag = "Azul", Bg = "Amarillo", Rg = "Magenta", Mg = "Cian", zg = "Fondo", _g = "Ventana", Lg = "Transparente", Ng = "Opaca", Ig = "Ninguno", $g = "En relieve", Og = "Hundido", Ug = "Uniforme", Vg = "Sombra paralela", Wg = "Informal", qg = "Cursiva", Hg = "Restablecer", Gg = "Listo", Yg = "Color", Kg = "Opacidad", W_ = { Play: dg, "Play Video": "Reproducir V\xEDdeo", Pause: pg, "Current Time": "Tiempo reproducido", Duration: mg, "Remaining Time": "Tiempo restante", "Stream Type": "Tipo de secuencia", LIVE: fg, Loaded: gg, Progress: hg, Fullscreen: Dg, "Exit Fullscreen": "Pantalla no completa", Mute: vg, Unmute: yg, "Playback Rate": "Velocidad de reproducci\xF3n", Subtitles: bg, "subtitles off": "Subt\xEDtulos desactivados", Captions: wg, "captions off": "Subt\xEDtulos especiales desactivados", Chapters: kg, "You aborted the media playback": "Ha interrumpido la reproducci\xF3n del v\xEDdeo.", "A network error caused the media download to fail part-way.": "Un error de red ha interrumpido la descarga del v\xEDdeo.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "No se ha podido cargar el v\xEDdeo debido a un fallo de red o del servidor o porque el formato es incompatible.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "La reproducci\xF3n de v\xEDdeo se ha interrumpido por un problema de corrupci\xF3n de datos o porque el v\xEDdeo precisa funciones que su navegador no ofrece.", "No compatible source was found for this media.": "No se ha encontrado ninguna fuente compatible con este v\xEDdeo.", "Audio Player": "Reproductor de audio", "Video Player": "Reproductor de video", Replay: Cg, "Seek to live, currently behind live": "Buscar en vivo, actualmente demorado con respecto a la transmisi\xF3n en vivo", "Seek to live, currently playing live": "Buscar en vivo, actualmente reproduciendo en vivo", "Progress Bar": "Barra de progreso", "progress bar timing: currentTime={1} duration={2}": "{1} de {2}", Descriptions: xg, "descriptions off": "descripciones desactivadas", "Audio Track": "Pista de audio", "Volume Level": "Nivel de volumen", "The media is encrypted and we do not have the keys to decrypt it.": "El material audiovisual est\xE1 cifrado y no tenemos las claves para descifrarlo.", Close: Sg, "Modal Window": "Ventana modal", "This is a modal window": "Esta es una ventana modal", "This modal can be closed by pressing the Escape key or activating the close button.": "Esta ventana modal puede cerrarse presionando la tecla Escape o activando el bot\xF3n de cierre.", ", opens captions settings dialog": ", abre el di\xE1logo de configuraci\xF3n de leyendas", ", opens subtitles settings dialog": ", abre el di\xE1logo de configuraci\xF3n de subt\xEDtulos", ", selected": ", seleccionado", "Close Modal Dialog": "Cierra cuadro de di\xE1logo modal", ", opens descriptions settings dialog": ", abre el di\xE1logo de configuraci\xF3n de las descripciones", "captions settings": "configuraci\xF3n de leyendas", "subtitles settings": "configuraci\xF3n de subt\xEDtulos", "descriptions settings": "configuraci\xF3n de descripciones", Text: Eg, White: Fg, Black: Tg, Red: Pg, Green: jg, Blue: Ag, Yellow: Bg, Magenta: Rg, Cyan: Mg, Background: zg, Window: _g, Transparent: Lg, "Semi-Transparent": "Semitransparente", Opaque: Ng, "Font Size": "Tama\xF1o de fuente", "Text Edge Style": "Estilo de borde del texto", None: Ig, Raised: $g, Depressed: Og, Uniform: Ug, Dropshadow: Vg, "Font Family": "Familia de fuente", "Proportional Sans-Serif": "Sans-Serif proporcional", "Monospace Sans-Serif": "Sans-Serif monoespacio", "Proportional Serif": "Serif proporcional", "Monospace Serif": "Serif monoespacio", Casual: Wg, Script: qg, "Small Caps": "Min\xFAsculas", Reset: Hg, "restore all settings to the default values": "restablece todas las configuraciones a los valores predeterminados", Done: Gg, "Caption Settings Dialog": "Di\xE1logo de configuraci\xF3n de leyendas", "Beginning of dialog window. Escape will cancel and close the window.": "Comienzo de la ventana de di\xE1logo. La tecla Escape cancelar\xE1 la operaci\xF3n y cerrar\xE1 la ventana.", "End of dialog window.": "Final de la ventana de di\xE1logo.", "{1} is loading.": "{1} se est\xE1 cargando.", "Exit Picture-in-Picture": "Salir de imagen sobre imagen", "Picture-in-Picture": "Imagen sobre imagen", "No content": "Sin contenido", Color: Yg, Opacity: Kg, "Text Background": "Fondo del texto", "Caption Area Background": "Fondo del \xE1rea de subt\xEDtulos" };
});
var is = {};
h(is, { Background: () => bh, Black: () => mh, Blue: () => hh, Captions: () => rh, Casual: () => Ph, Chapters: () => lh, Close: () => uh, Cyan: () => yh, Depressed: () => Eh, Descriptions: () => ch, Done: () => Bh, Dropshadow: () => Th, Duration: () => Qg, Fullscreen: () => nh, Green: () => gh, LIVE: () => eh, Loaded: () => th, Magenta: () => vh, Mute: () => ah, None: () => xh, Opaque: () => Ch, Pause: () => Jg, Play: () => Zg, Progress: () => oh, Raised: () => Sh, Red: () => fh, Replay: () => Xg, Reset: () => Ah, Script: () => jh, Subtitles: () => ih, Text: () => dh, Transparent: () => kh, Uniform: () => Fh, Unmute: () => sh, White: () => ph, Window: () => wh, Yellow: () => Dh, default: () => q_ });
var Zg;
var Jg;
var Xg;
var Qg;
var eh;
var th;
var oh;
var nh;
var ah;
var sh;
var ih;
var rh;
var lh;
var ch;
var uh;
var dh;
var ph;
var mh;
var fh;
var gh;
var hh;
var Dh;
var vh;
var yh;
var bh;
var wh;
var kh;
var Ch;
var xh;
var Sh;
var Eh;
var Fh;
var Th;
var Ph;
var jh;
var Ah;
var Bh;
var q_;
var rs = p(() => {
  "use strict";
  Zg = "Esita", Jg = "Paus", Xg = "Esita uuesti", Qg = "Kestus", eh = "OTSE", th = "Laaditud", oh = "Edenemine", nh = "T\xE4isekraan", ah = "Vaigista", sh = "L\xF5peta vaigistus", ih = "Subtiitrid", rh = "Pealdised", lh = "Peat\xFCkid", ch = "Kirjeldused", uh = "Sule", dh = "Tekst", ph = "Valge", mh = "Must", fh = "Punane", gh = "Roheline", hh = "Sinine", Dh = "Kollane", vh = "Magneta", yh = "Ts\xFCaan", bh = "Taust", wh = "Aken", kh = "L\xE4bipaistev", Ch = "L\xE4bipaistmatu", xh = "Puudub", Sh = "K\xF5rgem", Eh = "Madalam", Fh = "\xDChtlane", Th = "Langeva varjuga", Ph = "Sidumata kiri", jh = "K\xE4sikirjaline kiri", Ah = "L\xE4htesta", Bh = "Valmis", q_ = { "Audio Player": "Heliesitaja", "Video Player": "Videoesitaja", Play: Zg, Pause: Jg, Replay: Xg, "Current Time": "Praegune aeg", Duration: Qg, "Remaining Time": "J\xE4relej\xE4\xE4nud aeg", "Stream Type": "Voo t\xFC\xFCp", LIVE: eh, "Seek to live, currently behind live": "Mine \xFCle otseedastusle, praegu reaalajast taga", "Seek to live, currently playing live": "Mine \xFCle otseedastusle, praegu reaalajas ", Loaded: th, Progress: oh, "Progress Bar": "Edenemisriba ", "progress bar timing: currentTime={1} duration={2}": "{1} / {2}", Fullscreen: nh, "Exit Fullscreen": "V\xE4lju t\xE4isekraanist", Mute: ah, Unmute: sh, "Playback Rate": "Taasesituse kiirus", Subtitles: ih, "subtitles off": "subtiitrid v\xE4ljas", Captions: rh, "captions off": "pealdised v\xE4ljas", Chapters: lh, Descriptions: ch, "descriptions off": "kirjeldused v\xE4ljas", "Audio Track": "Helirada", "Volume Level": "Helitugevuse tase", "You aborted the media playback": "Katkestasid taasesituse", "A network error caused the media download to fail part-way.": "V\xF5rguvea t\xF5ttu nurjus meediumifaili allalaadimine poole pealt.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Seda meediumifaili ei \xF5nnestunud laadida, kuna serveris v\xF5i v\xF5rgus esines t\xF5rge v\xF5i kuna vormingut ei toetata.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Meediumifaili taasesitamine katkestati, kuna fail on rikutud v\xF5i see kasutab funktsiooni, mida sinu brauser ei toeta.", "No compatible source was found for this media.": "Ei leitud selle meediumifailiga \xFChilduvat allikat.", "The media is encrypted and we do not have the keys to decrypt it.": "See meediumifail on kr\xFCpteeritud ja meil pole dekr\xFCpteerimiseks vajalikku v\xF5tit.", "Play Video": "Esita video", Close: uh, "Close Modal Dialog": "Sule modaaldialoog", "Modal Window": "Modaalaken", "This is a modal window": "See on modaalaken", "This modal can be closed by pressing the Escape key or activating the close button.": "Saad selle modaalelemendi sulgeda, vajutades paoklahvi v\xF5i tehes sulgemisnupu aktiivseks.", ", opens captions settings dialog": ", avab pealdiste s\xE4tete dialoogi", ", opens subtitles settings dialog": ", avab subtiitrite s\xE4tete dialoogi", ", opens descriptions settings dialog": ", avab kirjelduste s\xE4tete dialoogi", ", selected": ", valitud", "captions settings": "pealdiste s\xE4tted", "subtitles settings": "subtiitrite s\xE4tted", "descriptions settings": "kirjelduste s\xE4tted", Text: dh, White: ph, Black: mh, Red: fh, Green: gh, Blue: hh, Yellow: Dh, Magenta: vh, Cyan: yh, Background: bh, Window: wh, Transparent: kh, "Semi-Transparent": "Pooll\xE4bipaistev", Opaque: Ch, "Font Size": "Fondi suurus", "Text Edge Style": "Tekstiserva stiil", None: xh, Raised: Sh, Depressed: Eh, Uniform: Fh, Dropshadow: Th, "Font Family": "Fondipere", "Proportional Sans-Serif": "Seriifideta proportsionaalkiri", "Monospace Sans-Serif": "Seriifideta p\xFCsisammkiri", "Proportional Serif": "Seriifidega proportsionaalkiri", "Monospace Serif": "Seriifidega p\xFCsisammkiri", Casual: Ph, Script: jh, "Small Caps": "Kapiteelkiri", Reset: Ah, "restore all settings to the default values": "taasta k\xF5igi s\xE4tete vaikev\xE4\xE4rtused", Done: Bh, "Caption Settings Dialog": "Pealdiste s\xE4tete dialoog", "Beginning of dialog window. Escape will cancel and close the window.": "Dialoogiakna algus. Paoklahv loobub aknast ja suleb selle.", "End of dialog window.": "Dialoogiakna l\xF5pp.", "{1} is loading.": "{1} laadimisel.", "Exit Picture-in-Picture": "V\xE4lju funktsioonist pilt pildis", "Picture-in-Picture": "Pilt pildis" };
});
var ls = {};
h(ls, { Background: () => nD, Black: () => Zh, Blue: () => Qh, Captions: () => Wh, Casual: () => pD, Chapters: () => qh, Close: () => Gh, Cyan: () => oD, Depressed: () => cD, Descriptions: () => Hh, Done: () => gD, Dropshadow: () => dD, Duration: () => _h, Fullscreen: () => $h, Green: () => Xh, LIVE: () => Lh, Loaded: () => Nh, Magenta: () => tD, Mute: () => Oh, None: () => rD, Opaque: () => iD, Pause: () => Mh, Play: () => Rh, Progress: () => Ih, Raised: () => lD, Red: () => Jh, Replay: () => zh, Reset: () => fD, Script: () => mD, Subtitles: () => Vh, Text: () => Yh, Transparent: () => sD, Uniform: () => uD, Unmute: () => Uh, White: () => Kh, Window: () => aD, Yellow: () => eD, default: () => H_ });
var Rh;
var Mh;
var zh;
var _h;
var Lh;
var Nh;
var Ih;
var $h;
var Oh;
var Uh;
var Vh;
var Wh;
var qh;
var Hh;
var Gh;
var Yh;
var Kh;
var Zh;
var Jh;
var Xh;
var Qh;
var eD;
var tD;
var oD;
var nD;
var aD;
var sD;
var iD;
var rD;
var lD;
var cD;
var uD;
var dD;
var pD;
var mD;
var fD;
var gD;
var H_;
var cs = p(() => {
  "use strict";
  Rh = "Hasi", Mh = "Gelditu", zh = "Berriz hasi", _h = "Iraupena", Lh = "ZUZENEAN", Nh = "Kargatuta", Ih = "Aurrerapena", $h = "Pantaila osoa", Oh = "Ixildu", Uh = "Soinua jarri", Vh = "Azpitituluak", Wh = "Oharrak", qh = "Kapituluak", Hh = "Deskribapenak", Gh = "Itxi", Yh = "Testua", Kh = "Zuria", Zh = "Beltza", Jh = "Gorria", Xh = "Berdea", Qh = "Urdina", eD = "Horia", tD = "Magenta", oD = "Cyan (urdina)", nD = "Atzeko planoa", aD = "Leihoa", sD = "Gardena", iD = "Opaku", rD = "Bat ere ez", lD = "Jasoa", cD = "Hondoratua", uD = "Uniformea", dD = "Itzalduna", pD = "Informala", mD = "Eskuz idatzitakoa", fD = "Berrezarri", gD = "Eginda", H_ = { "Audio Player": "Audio jogailua", "Video Player": "Bideo jogailua", Play: Rh, Pause: Mh, Replay: zh, "Current Time": "Uneko denbora", Duration: _h, "Remaining Time": "Gelditzen den denbora", "Stream Type": "Jario mota", LIVE: Lh, "Seek to live, currently behind live": "Zuzenekora joan, orain zuzenekoaren atzetik", "Seek to live, currently playing live": "Zuzenekora joan, orain zuzenean ari da", Loaded: Nh, Progress: Ih, "Progress Bar": "Aurrerapen barra", "progress bar timing: currentTime={1} duration={2}": "{1} / {2}", Fullscreen: $h, "Exit Fullscreen": "Irten pantaila osotik", Mute: Oh, Unmute: Uh, "Playback Rate": "Abiadura", Subtitles: Vh, "subtitles off": "azpitituluak kenduta", Captions: Wh, "captions off": "oharrak kenduta", Chapters: qh, Descriptions: Hh, "descriptions off": "deskribapenak kenduta", "Audio Track": "Audio pista", "Volume Level": "Bolumen maila", "You aborted the media playback": "Bertan behera utzi duzu", "A network error caused the media download to fail part-way.": "Sare errore batek deskargak huts egitea eragin du.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Media ezin izan da kargatu, zerbitzariak edo sareak huts egin duelako edo formatu horretako media erabili ezin delako.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Bertan behera gelditu da fitxategia ondo ez dagoelako edo zure nabigatzailean erabili ezin diren ezaugarriak dituelako.", "No compatible source was found for this media.": "Ez dago media honentzako iturburu bateragarririk.", "The media is encrypted and we do not have the keys to decrypt it.": "Media zifratuta dago eta ez ditugu beharrezko gakoak.", "Play Video": "Bideoa hasi", Close: Gh, "Close Modal Dialog": "Leihoa itxi", "Modal Window": "Leihoa", "This is a modal window": "Hau leiho modal bat da", "This modal can be closed by pressing the Escape key or activating the close button.": "Leiho modal hau zure teklatuko Escape tekla sakatuz edo ixteko botoia sakatuz itxi daiteke.", ", opens captions settings dialog": ", oharren ezarpenen leihoa irekitzen du", ", opens subtitles settings dialog": ", azpitituluen ezarpenen leihoa irekitzen du", ", opens descriptions settings dialog": ", deskribapenen ezarpenen leihoa irekitzen du", ", selected": ", aukeratuta", "captions settings": "oharren ezarpenak", "subtitles settings": "azpitituluen ezarpenak", "descriptions settings": "deskribapenen ezarpenak", Text: Yh, White: Kh, Black: Zh, Red: Jh, Green: Xh, Blue: Qh, Yellow: eD, Magenta: tD, Cyan: oD, Background: nD, Window: aD, Transparent: sD, "Semi-Transparent": "Erdi-gardena", Opaque: iD, "Font Size": "Letra-tamaina", "Text Edge Style": "Tesuaren etzen estiloa", None: rD, Raised: lD, Depressed: cD, Uniform: uD, Dropshadow: dD, "Font Family": "Letra-tipoa", "Proportional Sans-Serif": "Sans-Serif proportzionala", "Monospace Sans-Serif": "Tarte berdineko Sans-Serif", "Proportional Serif": "Serif proporzionala", "Monospace Serif": "Tarte berdineko Serif", Casual: pD, Script: mD, "Small Caps": "letra xeheak", Reset: fD, "restore all settings to the default values": "berrezarri ezarpen guztiak defektuzko balioetara", Done: gD, "Caption Settings Dialog": "Oharren ezarpenen leihoa", "Beginning of dialog window. Escape will cancel and close the window.": "Leihoaren hasiera. Escapeta teklak leihoa itxi egingo du.", "End of dialog window.": "Leihoaren amaiera.", "{1} is loading.": "{1} kargatzen ari da.", "Exit Picture-in-Picture": "Irten irudiz-irudiztik", "Picture-in-Picture": "Irudiz-irudi" };
});
var us = {};
h(us, { Background: () => $D, Black: () => RD, Blue: () => _D, Captions: () => FD, Casual: () => KD, Chapters: () => TD, Close: () => jD, Cyan: () => ID, Depressed: () => HD, Descriptions: () => PD, Done: () => XD, Dropshadow: () => YD, Duration: () => yD, Fullscreen: () => CD, Green: () => zD, LIVE: () => bD, Loaded: () => wD, Magenta: () => ND, Mute: () => xD, None: () => WD, Opaque: () => VD, Pause: () => DD, Play: () => hD, Progress: () => kD, Raised: () => qD, Red: () => MD, Replay: () => vD, Reset: () => JD, Script: () => ZD, Subtitles: () => ED, Text: () => AD, Transparent: () => UD, Uniform: () => GD, Unmute: () => SD, White: () => BD, Window: () => OD, Yellow: () => LD, default: () => G_ });
var hD;
var DD;
var vD;
var yD;
var bD;
var wD;
var kD;
var CD;
var xD;
var SD;
var ED;
var FD;
var TD;
var PD;
var jD;
var AD;
var BD;
var RD;
var MD;
var zD;
var _D;
var LD;
var ND;
var ID;
var $D;
var OD;
var UD;
var VD;
var WD;
var qD;
var HD;
var GD;
var YD;
var KD;
var ZD;
var JD;
var XD;
var G_;
var ds = p(() => {
  "use strict";
  hD = "\u067E\u062E\u0634", DD = "\u062A\u0648\u0642\u0641", vD = "\u067E\u062E\u0634 \u0645\u062C\u062F\u062F", yD = "\u0645\u062F\u062A", bD = "\u0632\u0646\u062F\u0647", wD = "\u0628\u0627\u0631\u06AF\u06CC\u0631\u06CC\u200C\u0634\u062F\u0647", kD = "\u067E\u06CC\u0634\u0631\u0641\u062A", CD = "\u062A\u0645\u0627\u0645\u200C\u0635\u0641\u062D\u0647", xD = "\u0628\u06CC\u200C\u0635\u062F\u0627", SD = "\u0635\u062F\u0627\u062F\u0627\u0631", ED = "\u0632\u06CC\u0631\u0646\u0648\u06CC\u0633\u200C\u0647\u0627", FD = "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A", TD = "\u0628\u062E\u0634\u200C\u0647\u0627", PD = "\u062A\u0648\u0635\u06CC\u0641\u0627\u062A", jD = "\u0628\u0633\u062A\u0646", AD = "\u0645\u062A\u0646", BD = "\u0633\u0641\u06CC\u062F", RD = "\u0633\u06CC\u0627\u0647", MD = "\u0642\u0631\u0645\u0632", zD = "\u0633\u0628\u0632", _D = "\u0622\u0628\u06CC", LD = "\u0632\u0631\u062F", ND = "\u0627\u0631\u063A\u0648\u0627\u0646\u06CC", ID = "\u0641\u06CC\u0631\u0648\u0632\u0647\u200C\u0627\u06CC", $D = "\u067E\u0633\u200C\u0632\u0645\u06CC\u0646\u0647", OD = "\u067E\u0646\u062C\u0631\u0647", UD = "\u0634\u0641\u0627\u0641", VD = "\u0645\u0627\u062A", WD = "\u0647\u06CC\u0686", qD = "\u0628\u0631\u062C\u0633\u062A\u0647", HD = "\u0641\u0631\u0648\u0631\u0641\u062A\u0647", GD = "\u06CC\u06A9\u0646\u0648\u0627\u062E\u062A", YD = "\u0633\u0627\u06CC\u0647\u200C\u062F\u0627\u0631", KD = "\u0641\u0627\u0646\u062A\u0632\u06CC", ZD = "\u062F\u0633\u062A\u200C\u062E\u0637", JD = "\u062A\u0646\u0638\u06CC\u0645 \u0645\u062C\u062F\u062F", XD = "\u0627\u0646\u062C\u0627\u0645", G_ = { "Audio Player": "\u067E\u062E\u0634\u200C\u06A9\u0646\u0646\u062F\u0647\u0654 \u0635\u0648\u062A", "Video Player": "\u067E\u062E\u0634\u200C\u06A9\u0646\u0646\u062F\u0647\u0654 \u0648\u06CC\u062F\u06CC\u0648", Play: hD, Pause: DD, Replay: vD, "Current Time": "\u0632\u0645\u0627\u0646 \u0641\u0639\u0644\u06CC", Duration: yD, "Remaining Time": "\u0632\u0645\u0627\u0646 \u0628\u0627\u0642\u06CC\u200C\u0645\u0627\u0646\u062F\u0647", "Stream Type": "\u0646\u0648\u0639 \u0627\u0633\u062A\u0631\u06CC\u0645", LIVE: bD, "Seek to live, currently behind live": "\u067E\u062E\u0634 \u0632\u0646\u062F\u0647\u060C \u0647\u0645\u200C\u0627\u06A9\u0646\u0648\u0646 \u0639\u0642\u0628\u200C\u062A\u0631 \u0627\u0632 \u067E\u062E\u0634 \u0632\u0646\u062F\u0647", "Seek to live, currently playing live": "\u067E\u062E\u0634 \u0632\u0646\u062F\u0647\u060C \u062F\u0631 \u062D\u0627\u0644 \u067E\u062E\u0634 \u0632\u0646\u062F\u0647", Loaded: wD, Progress: kD, "Progress Bar": "\u0646\u0648\u0627\u0631 \u067E\u06CC\u0634\u0631\u0641\u062A", "progress bar timing: currentTime={1} duration={2}": "{1} \u0627\u0632 {2}", Fullscreen: CD, "Exit Fullscreen": "\u063A\u06CC\u0631 \u062A\u0645\u0627\u0645\u200C\u0635\u0641\u062D\u0647", Mute: xD, Unmute: SD, "Playback Rate": "\u0633\u0631\u0639\u062A \u067E\u062E\u0634", Subtitles: ED, "subtitles off": "\u0628\u062F\u0648\u0646 \u0632\u06CC\u0631\u0646\u0648\u06CC\u0633", Captions: FD, "captions off": "\u0628\u062F\u0648\u0646 \u062A\u0648\u0636\u06CC\u062D\u0627\u062A", Chapters: TD, Descriptions: PD, "descriptions off": "\u0628\u062F\u0648\u0646 \u062A\u0648\u0635\u06CC\u0641\u0627\u062A", "Audio Track": "\u062A\u0631\u064E\u06A9 \u0635\u0648\u062A\u06CC", "Volume Level": "\u0633\u0637\u062D \u0635\u062F\u0627", "You aborted the media playback": "\u0634\u0645\u0627 \u067E\u062E\u0634 \u0631\u0633\u0627\u0646\u0647 \u0631\u0627 \u0642\u0637\u0639 \u0646\u0645\u0648\u062F\u06CC\u062F", "A network error caused the media download to fail part-way.": "\u0648\u0642\u0648\u0639 \u0645\u0634\u06A9\u0644\u06CC \u062F\u0631 \u0634\u0628\u06A9\u0647 \u0628\u0627\u0639\u062B \u0627\u062E\u062A\u0644\u0627\u0644 \u062F\u0631 \u062F\u0627\u0646\u0644\u0648\u062F \u0631\u0633\u0627\u0646\u0647 \u0634\u062F.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\u0631\u0633\u0627\u0646\u0647 \u0642\u0627\u0628\u0644 \u0628\u0627\u0631\u06AF\u06CC\u0631\u06CC \u0646\u06CC\u0633\u062A. \u0645\u0645\u06A9\u0646 \u0627\u0633\u062A \u0645\u0634\u06A9\u0644\u06CC \u062F\u0631 \u0634\u0628\u06A9\u0647 \u06CC\u0627 \u0633\u0631\u0648\u0631 \u0631\u062E \u062F\u0627\u062F\u0647 \u0628\u0627\u0634\u062F \u06CC\u0627 \u0642\u0627\u0644\u0628 \u0631\u0633\u0627\u0646\u0647 \u062F\u0631 \u062F\u0633\u062A\u06AF\u0627\u0647 \u0634\u0645\u0627 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC \u0646\u0634\u0648\u062F.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\u067E\u062E\u0634  \u0631\u0633\u0627\u0646\u0647 \u0628\u0647\u200C\u0639\u0644\u062A \u0627\u0634\u06A9\u0627\u0644 \u062F\u0631 \u0622\u0646 \u06CC\u0627 \u0639\u062F\u0645 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC \u0645\u0631\u0648\u0631\u06AF\u0631 \u0634\u0645\u0627 \u0642\u0637\u0639 \u0634\u062F.", "No compatible source was found for this media.": "\u0647\u06CC\u0686 \u0645\u0646\u0628\u0639 \u0633\u0627\u0632\u06AF\u0627\u0631\u06CC \u0628\u0631\u0627\u06CC \u067E\u062E\u0634 \u0627\u06CC\u0646 \u0631\u0633\u0627\u0646\u0647 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.", "The media is encrypted and we do not have the keys to decrypt it.": "\u0627\u06CC\u0646 \u0631\u0633\u0627\u0646\u0647 \u0631\u0645\u0632\u0646\u06AF\u0627\u0631\u06CC \u0634\u062F\u0647\u200C\u0627\u0633\u062A \u0648 \u06A9\u0644\u06CC\u062F\u0647\u0627\u06CC \u0631\u0645\u0632\u06AF\u0634\u0627\u06CC\u06CC \u0622\u0646 \u0645\u0648\u062C\u0648\u062F \u0646\u06CC\u0633\u062A.", "Play Video": "\u067E\u062E\u0634 \u0648\u06CC\u062F\u06CC\u0648", Close: jD, "Close Modal Dialog": "\u0628\u0633\u062A\u0646 \u067E\u0646\u062C\u0631\u0647", "Modal Window": "\u067E\u0646\u062C\u0631\u0647\u0654 \u0645\u062D\u0627\u0648\u0631\u0647", "This is a modal window": "\u0627\u06CC\u0646 \u067E\u0646\u062C\u0631\u0647 \u0642\u0627\u0628\u0644 \u0628\u0633\u062A\u0646 \u0627\u0633\u062A", "This modal can be closed by pressing the Escape key or activating the close button.": "\u0627\u06CC\u0646 \u067E\u0646\u062C\u0631\u0647 \u0628\u0627 \u06A9\u0644\u06CC\u062F Escape \u06CC\u0627 \u062F\u06A9\u0645\u0647\u0654 \u0628\u0633\u062A\u0646 \u0642\u0627\u0628\u0644 \u0628\u0633\u062A\u0647\u200C\u0634\u062F\u0646 \u0627\u0633\u062A.", ", opens captions settings dialog": "\u060C \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u062A\u0648\u0636\u06CC\u062C\u0627\u062A \u0631\u0627 \u0628\u0627\u0632 \u0645\u06CC\u200C\u06A9\u0646\u062F", ", opens subtitles settings dialog": "\u060C \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0632\u06CC\u0631\u0646\u0648\u06CC\u0633 \u0631\u0627 \u0628\u0627\u0632 \u0645\u06CC\u200C\u06A9\u0646\u062F", ", opens descriptions settings dialog": "\u060C \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u062A\u0648\u0635\u06CC\u0641\u0627\u062A \u0631\u0627 \u0628\u0627\u0632 \u0645\u06CC\u200C\u06A9\u0646\u062F", ", selected": "\u060C \u0627\u0646\u062A\u062E\u0627\u0628 \u0634\u062F", "captions settings": "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u062A\u0648\u0636\u06CC\u062D\u0627\u062A", "subtitles settings": "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0632\u06CC\u0631\u0646\u0648\u06CC\u0633", "descriptions settings": "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u062A\u0648\u0635\u06CC\u0641\u0627\u062A", Text: AD, White: BD, Black: RD, Red: MD, Green: zD, Blue: _D, Yellow: LD, Magenta: ND, Cyan: ID, Background: $D, Window: OD, Transparent: UD, "Semi-Transparent": "\u0646\u06CC\u0645\u0647\u200C\u0634\u0641\u0627\u0641", Opaque: VD, "Font Size": "\u0627\u0646\u062F\u0627\u0632\u0647\u0654 \u0642\u0644\u0645", "Text Edge Style": "\u0633\u0628\u06A9 \u0644\u0628\u0647\u0654 \u0645\u062A\u0646", None: WD, Raised: qD, Depressed: HD, Uniform: GD, Dropshadow: YD, "Font Family": "\u0646\u0648\u0639 \u0642\u0644\u0645", "Proportional Sans-Serif": "Sans-Serif \u0645\u062A\u0646\u0627\u0633\u0628", "Monospace Sans-Serif": "Sans-Serif \u0647\u0645\u200C\u0639\u0631\u0636", "Proportional Serif": "Serif \u0645\u062A\u0646\u0627\u0633\u0628", "Monospace Serif": "Serif \u0647\u0645\u200C\u0639\u0631\u0636", Casual: KD, Script: ZD, "Small Caps": "\u062D\u0631\u0648\u0641 \u0628\u0632\u0631\u06AF \u06A9\u0648\u0686\u06A9", Reset: JD, "restore all settings to the default values": "\u0628\u0627\u0632\u0646\u0634\u0627\u0646\u06CC \u0647\u0645\u0647\u0654 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0628\u0647 \u0645\u0642\u0627\u062F\u06CC\u0631 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636", Done: XD, "Caption Settings Dialog": "\u067E\u0646\u062C\u0631\u0647\u0654 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u062A\u0648\u0636\u06CC\u062D\u0627\u062A", "Beginning of dialog window. Escape will cancel and close the window.": "\u0634\u0631\u0648\u0639 \u067E\u0646\u062C\u0631\u0647\u0654 \u0645\u062D\u0627\u0648\u0631\u0647\u200C\u0627\u06CC. \u062F\u06A9\u0645\u0647\u0654 Escape \u0639\u0645\u0644\u06CC\u0627\u062A \u0631\u0627 \u0644\u063A\u0648 \u06A9\u0631\u062F\u0647 \u0648 \u067E\u0646\u062C\u0631\u0647 \u0631\u0627 \u0645\u06CC\u200C\u0628\u0646\u062F\u062F.", "End of dialog window.": "\u067E\u0627\u06CC\u0627\u0646 \u067E\u0646\u062C\u0631\u0647\u0654 \u0645\u062D\u0627\u0648\u0631\u0647\u200C\u0627\u06CC.", "{1} is loading.": "{1} \u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u06CC\u0631\u06CC \u0627\u0633\u062A.", "Exit Picture-in-Picture": "\u062E\u0631\u0648\u062C \u0627\u0632 \u062D\u0627\u0644\u062A \u062A\u0635\u0648\u06CC\u0631 \u062F\u0631 \u062A\u0635\u0648\u06CC\u0631", "Picture-in-Picture": "\u062A\u0635\u0648\u06CC\u0631 \u062F\u0631 \u062A\u0635\u0648\u06CC\u0631", "Skip forward {1} seconds": "{1} \u062B\u0627\u0646\u06CC\u0647 \u0628\u0639\u062F", "Skip backward {1} seconds": "{1} \u062B\u0627\u0646\u06CC\u0647 \u0642\u0628\u0644" };
});
var ps = {};
h(ps, { Captions: () => cv, Chapters: () => uv, Duration: () => tv, Fullscreen: () => sv, LIVE: () => ov, Loaded: () => nv, Mute: () => iv, Pause: () => ev, Play: () => QD, Progress: () => av, Subtitles: () => lv, Unmute: () => rv, default: () => Y_ });
var QD;
var ev;
var tv;
var ov;
var nv;
var av;
var sv;
var iv;
var rv;
var lv;
var cv;
var uv;
var Y_;
var ms = p(() => {
  "use strict";
  QD = "Toisto", ev = "Tauko", tv = "Kokonaisaika", ov = "LIVE", nv = "Ladattu", av = "Edistyminen", sv = "Koko n\xE4ytt\xF6", iv = "\xC4\xE4ni pois", rv = "\xC4\xE4ni p\xE4\xE4ll\xE4", lv = "Tekstitys", cv = "Tekstitys", uv = "Kappaleet", Y_ = { Play: QD, Pause: ev, "Current Time": "T\xE4m\xE4nhetkinen aika", Duration: tv, "Remaining Time": "J\xE4ljell\xE4 oleva aika", "Stream Type": "L\xE4hetystyyppi", LIVE: ov, Loaded: nv, Progress: av, Fullscreen: sv, "Exit Fullscreen": "Koko n\xE4ytt\xF6 pois", Mute: iv, Unmute: rv, "Playback Rate": "Toistonopeus", Subtitles: lv, "subtitles off": "Tekstitys pois", Captions: cv, "captions off": "Tekstitys pois", Chapters: uv, "You aborted the media playback": "Olet keskeytt\xE4nyt videotoiston.", "A network error caused the media download to fail part-way.": "Verkkovirhe keskeytti videon latauksen.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Videon lataus ei onnistunut joko palvelin- tai verkkovirheest\xE4 tai v\xE4\xE4r\xE4st\xE4 formaatista johtuen.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Videon toisto keskeytyi, koska media on vaurioitunut tai k\xE4ytt\xE4\xE4 k\xE4ytt\xE4\xE4 toimintoja, joita selaimesi ei tue.", "No compatible source was found for this media.": "T\xE4lle videolle ei l\xF6ytynyt yhteensopivaa l\xE4hdett\xE4." };
});
var fs = {};
h(fs, { Background: () => zv, Black: () => Tv, Blue: () => Av, Captions: () => kv, Casual: () => Wv, Chapters: () => Cv, Close: () => Sv, Color: () => Yv, Cyan: () => Mv, Depressed: () => Ov, Descriptions: () => xv, Done: () => Gv, Dropshadow: () => Vv, Duration: () => fv, Fullscreen: () => vv, Green: () => jv, LIVE: () => gv, Loaded: () => hv, Magenta: () => Rv, Mute: () => yv, None: () => Iv, Opacity: () => Kv, Opaque: () => Nv, Pause: () => pv, Play: () => dv, Progress: () => Dv, Raised: () => $v, Red: () => Pv, Replay: () => mv, Reset: () => Hv, Script: () => qv, Subtitles: () => wv, Text: () => Ev, Transparent: () => Lv, Uniform: () => Uv, Unmute: () => bv, White: () => Fv, Window: () => _v, Yellow: () => Bv, default: () => K_ });
var dv;
var pv;
var mv;
var fv;
var gv;
var hv;
var Dv;
var vv;
var yv;
var bv;
var wv;
var kv;
var Cv;
var xv;
var Sv;
var Ev;
var Fv;
var Tv;
var Pv;
var jv;
var Av;
var Bv;
var Rv;
var Mv;
var zv;
var _v;
var Lv;
var Nv;
var Iv;
var $v;
var Ov;
var Uv;
var Vv;
var Wv;
var qv;
var Hv;
var Gv;
var Yv;
var Kv;
var K_;
var gs = p(() => {
  "use strict";
  dv = "Lecture", pv = "Pause", mv = "Revoir", fv = "Dur\xE9e", gv = "EN DIRECT", hv = "Charg\xE9", Dv = "Progression", vv = "Plein \xE9cran", yv = "Mettre en sourdine", bv = "Activer le son", wv = "Sous-titres", kv = "Sous-titres transcrits", Cv = "Chapitres", xv = "Descriptions", Sv = "Fermer", Ev = "Texte", Fv = "Blanc", Tv = "Noir", Pv = "Rouge", jv = "Vert", Av = "Bleu", Bv = "Jaune", Rv = "Magenta", Mv = "Cyan", zv = "Arri\xE8re-plan", _v = "Fen\xEAtre", Lv = "Transparent", Nv = "Opaque", Iv = "Aucun", $v = "\xC9lev\xE9", Ov = "Enfonc\xE9", Uv = "Uniforme", Vv = "Ombre port\xE9e", Wv = "Manuscrite", qv = "Scripte", Hv = "R\xE9initialiser", Gv = "Termin\xE9", Yv = "Couleur", Kv = "Opacit\xE9", K_ = { "Audio Player": "Lecteur audio", "Video Player": "Lecteur vid\xE9o", Play: dv, Pause: pv, Replay: mv, "Current Time": "Temps actuel", Duration: fv, "Remaining Time": "Temps restant", "Stream Type": "Type de flux", LIVE: gv, "Seek to live, currently behind live": "Rechercher le direct, actuellement apr\xE8s le direct", "Seek to live, currently playing live": "Rechercher le direct, le direct actuellement en cours de lecture", Loaded: hv, Progress: Dv, "Progress Bar": "Barre de progression", "progress bar timing: currentTime={1} duration={2}": "{1} de {2}", Fullscreen: vv, "Exit Fullscreen": "Fen\xEAtr\xE9", Mute: yv, Unmute: bv, "Playback Rate": "Vitesse de lecture", Subtitles: wv, "subtitles off": "Sous-titres d\xE9sactiv\xE9s", Captions: kv, "captions off": "Sous-titres transcrits d\xE9sactiv\xE9s", Chapters: Cv, Descriptions: xv, "descriptions off": "descriptions d\xE9sactiv\xE9es", "Audio Track": "Piste audio", "Volume Level": "Niveau de volume", "You aborted the media playback": "Vous avez interrompu la lecture de la vid\xE9o.", "A network error caused the media download to fail part-way.": "Une erreur de r\xE9seau a interrompu le t\xE9l\xE9chargement de la vid\xE9o.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Cette vid\xE9o n'a pas pu \xEAtre charg\xE9e, soit parce que le serveur ou le r\xE9seau a \xE9chou\xE9 ou parce que le format n'est pas reconnu.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "La lecture de la vid\xE9o a \xE9t\xE9 interrompue \xE0 cause d'un probl\xE8me de corruption ou parce que la vid\xE9o utilise des fonctionnalit\xE9s non prises en charge par votre navigateur.", "No compatible source was found for this media.": "Aucune source compatible n'a \xE9t\xE9 trouv\xE9e pour cette vid\xE9o.", "The media is encrypted and we do not have the keys to decrypt it.": "Le m\xE9dia est chiffr\xE9 et nous n'avons pas les cl\xE9s pour le d\xE9chiffrer.", "Play Video": "Lire la vid\xE9o", Close: Sv, "Close Modal Dialog": "Fermer la bo\xEEte de dialogue modale", "Modal Window": "Fen\xEAtre modale", "This is a modal window": "Ceci est une fen\xEAtre modale", "This modal can be closed by pressing the Escape key or activating the close button.": "Ce modal peut \xEAtre ferm\xE9 en appuyant sur la touche \xC9chap ou activer le bouton de fermeture.", ", opens captions settings dialog": ", ouvrir les param\xE8tres des sous-titres transcrits", ", opens subtitles settings dialog": ", ouvrir les param\xE8tres des sous-titres", ", opens descriptions settings dialog": ", ouvrir les param\xE8tres des descriptions", ", selected": ", s\xE9lectionn\xE9", "captions settings": "Param\xE8tres des sous-titres transcrits", "subtitles settings": "Param\xE8tres des sous-titres", "descriptions settings": "Param\xE8tres des descriptions", Text: Ev, White: Fv, Black: Tv, Red: Pv, Green: jv, Blue: Av, Yellow: Bv, Magenta: Rv, Cyan: Mv, Background: zv, Window: _v, Transparent: Lv, "Semi-Transparent": "Semi-transparent", Opaque: Nv, "Font Size": "Taille des caract\xE8res", "Text Edge Style": "Style des contours du texte", None: Iv, Raised: $v, Depressed: Ov, Uniform: Uv, Dropshadow: Vv, "Font Family": "Famille de polices", "Proportional Sans-Serif": "Polices \xE0 chasse variable sans empattement (Proportional Sans-Serif)", "Monospace Sans-Serif": "Polices \xE0 chasse fixe sans empattement (Monospace Sans-Serif)", "Proportional Serif": "Polices \xE0 chasse variable avec empattement (Proportional Serif)", "Monospace Serif": "Polices \xE0 chasse fixe avec empattement (Monospace Serif)", Casual: Wv, Script: qv, "Small Caps": "Petites capitales", Reset: Hv, "restore all settings to the default values": "Restaurer tous les param\xE8tres aux valeurs par d\xE9faut", Done: Gv, "Caption Settings Dialog": "Bo\xEEte de dialogue des param\xE8tres des sous-titres transcrits", "Beginning of dialog window. Escape will cancel and close the window.": "D\xE9but de la fen\xEAtre de dialogue. La touche d'\xE9chappement annulera et fermera la fen\xEAtre.", "End of dialog window.": "Fin de la fen\xEAtre de dialogue.", "Exit Picture-in-Picture": "Quitter le mode image dans l'image", "Picture-in-Picture": "Image dans l'image", "{1} is loading.": "{1} en cours de chargement.", "No content": "Aucun contenu", Color: Yv, Opacity: Kv, "Text Background": "Arri\xE8re-plan du texte", "Caption Area Background": "Arri\xE8re-plan de la zone de sous-titre" };
});
var hs = {};
h(hs, { Background: () => by, Black: () => my, Blue: () => hy, Captions: () => ry, Casual: () => Py, Chapters: () => ly, Close: () => uy, Cyan: () => yy, Depressed: () => Ey, Descriptions: () => cy, Done: () => By, Dropshadow: () => Ty, Duration: () => Qv, Fullscreen: () => ny, Green: () => gy, LIVE: () => ey, Loaded: () => ty, Magenta: () => vy, Mute: () => ay, None: () => xy, Opaque: () => Cy, Pause: () => Jv, Play: () => Zv, Progress: () => oy, Raised: () => Sy, Red: () => fy, Replay: () => Xv, Reset: () => Ay, Script: () => jy, Subtitles: () => iy, Text: () => dy, Transparent: () => ky, Uniform: () => Fy, Unmute: () => sy, White: () => py, Window: () => wy, Yellow: () => Dy, default: () => Z_ });
var Zv;
var Jv;
var Xv;
var Qv;
var ey;
var ty;
var oy;
var ny;
var ay;
var sy;
var iy;
var ry;
var ly;
var cy;
var uy;
var dy;
var py;
var my;
var fy;
var gy;
var hy;
var Dy;
var vy;
var yy;
var by;
var wy;
var ky;
var Cy;
var xy;
var Sy;
var Ey;
var Fy;
var Ty;
var Py;
var jy;
var Ay;
var By;
var Z_;
var Ds = p(() => {
  "use strict";
  Zv = "Cluich", Jv = "Cuir \u2019na stad", Xv = "Cluich a-rithist", Qv = "Faide", ey = "BE\xD2", ty = "Air a luchdadh", oy = "Adhartas", ny = "L\xE0n-sgr\xECn", ay = "M\xF9ch", sy = "D\xEC-mh\xF9ch", iy = "Fo-thiotalan", ry = "Caipseanan", ly = "Caibideil", cy = "Tuairisgeulan", uy = "D\xF9in", dy = "Teacsa", py = "Geal", my = "Dubh", fy = "Dearg", gy = "Uaine", hy = "Gorm", Dy = "Buidhe", vy = "Magenta", yy = "Saidhean", by = "C\xF9laibh", wy = "Uinneag", ky = "Tr\xECd-shoilleir", Cy = "Tr\xECd-dhoilleir", xy = "Chan eil gin", Sy = "\xC0rdaichte", Ey = "Air a bhr\xF9thadh", Fy = "Cunbhalach", Ty = "Sg\xE0il", Py = "Fuasgailte", jy = "Sgriobt", Ay = "Ath-shuidhich", By = "Deiseil", Z_ = { "Audio Player": "Cluicheadair fuaime", "Video Player": "Cluicheadair video", Play: Zv, Pause: Jv, Replay: Xv, "Current Time": "An \xF9ine l\xE0ithreach", Duration: Qv, "Remaining Time": "An \xF9ine air fh\xE0gail", "Stream Type": "Se\xF2rsa an t-sruthaidh", LIVE: ey, "Seek to live, currently behind live": "A\u2019 sireadh sruth be\xF2 \u2019s air dheireadh", "Seek to live, currently playing live": "A\u2019 sireadh sruth be\xF2 \u2019s \u2018ga chluich", Loaded: ty, Progress: oy, "Progress Bar": "B\xE0r adhartais", "progress bar timing: currentTime={1} duration={2}": "{1} \xE0 {2}", Fullscreen: ny, "Exit Fullscreen": "F\xE0g modh l\xE0n-sgr\xECn", Mute: ay, Unmute: sy, "Playback Rate": "Reat na cluiche", Subtitles: iy, "subtitles off": "fo-thiotalan dheth", Captions: ry, "captions off": "caipseanan dheth", Chapters: ly, Descriptions: cy, "descriptions off": "tuairisgeulan dheth", "Audio Track": "Traca fuaime", "Volume Level": "\xC0irde na fuaime", "You aborted the media playback": "Sguir thu de chluich a\u2019 mheadhain", "A network error caused the media download to fail part-way.": "Cha deach leinn an c\xF2rr dhen mheadhan a luchdadh a-nuas ri linn mearachd l\xEConraidh.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Cha b\u2019 urrainn dhuinn am meadhan a luchdadh \u2013 dh\u2019fhaoidte gun do dh\u2019fh\xE0illig leis an fhrithealaiche no an l\xEConra no nach cuir sinn taic ris an fh\xF2rmat.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Sguir sinn de chluich a\u2019 mheadhain \u2013 dh\u2019fhaoidte gu bheil e coirbte no gu bheil gleus aig a\u2019 mheadhan nach cuir am brabhsair taic ris.", "No compatible source was found for this media.": "Cha ceach t\xF9s co-ch\xF2rdail a lorg airson a\u2019 mheadhain seo.", "The media is encrypted and we do not have the keys to decrypt it.": "Tha am meadhan crioptaichte \u2019s chan eil iuchair d\xEC-chrioptachaidh againn dha.", "Play Video": "Cluich video", Close: uy, "Close Modal Dialog": "D\xF9in an c\xF2mhradh", "Modal Window": "Uinneag m\xF2dach", "This is a modal window": "Seo uinneag m\xF2dach", "This modal can be closed by pressing the Escape key or activating the close button.": "\u2019S urrainn dhut seo a dh\xF9nadh leis an iuchair Escape no leis a\u2019 phutan d\xF9naidh.", ", opens captions settings dialog": ", fosglaidh e c\xF2mhradh nan roghainnean", ", opens subtitles settings dialog": ", fosglaidh e c\xF2mhradh nam fo-thiotalan", ", opens descriptions settings dialog": ", fosglaidh e c\xF2mhradh roghainnean nan tuairisgeulan", ", selected": ", air a thaghadh", "captions settings": "roghainnean nan caipseanan", "subtitles settings": "roghainnean nam fo-thiotalan", "descriptions settings": "roghainnean nan tuairisgeulan", Text: dy, White: py, Black: my, Red: fy, Green: gy, Blue: hy, Yellow: Dy, Magenta: vy, Cyan: yy, Background: by, Window: wy, Transparent: ky, "Semi-Transparent": "Leth-thr\xECd-shoilleir", Opaque: Cy, "Font Size": "Meud a\u2019 chrutha-chl\xF2", "Text Edge Style": "Stoidhle oir an teacsa", None: xy, Raised: Sy, Depressed: Ey, Uniform: Fy, Dropshadow: Ty, "Font Family": "Teaghlach a\u2019 chrutha-chl\xF2", "Proportional Sans-Serif": "Sans-serif co-r\xE8ireach", "Monospace Sans-Serif": "Sans-serif aon-leud", "Proportional Serif": "Serif co-r\xE8ireach", "Monospace Serif": "Serif aon-leud", Casual: Py, Script: jy, "Small Caps": "Ceann-litrichean beaga", Reset: Ay, "restore all settings to the default values": "till dhan a h-uile bun-roghainn", Done: By, "Caption Settings Dialog": "C\xF2mhradh roghainnean nan caipseanan", "Beginning of dialog window. Escape will cancel and close the window.": "Toiseach uinneag c\xF2mhraidh. Sguiridh Escape dheth \u2019s d\xF9inidh e an uinneag", "End of dialog window.": "Deireadh uinneag c\xF2mhraidh.", "{1} is loading.": "Tha {1} \u2019ga luchdadh." };
});
var vs = {};
h(vs, { Background: () => n0, Black: () => Zy, Blue: () => Qy, Captions: () => Wy, Casual: () => p0, Chapters: () => qy, Close: () => Gy, Cyan: () => o0, Depressed: () => c0, Descriptions: () => Hy, Done: () => g0, Dropshadow: () => d0, Duration: () => _y, Fullscreen: () => $y, Green: () => Xy, LIVE: () => Ly, Loaded: () => Ny, Magenta: () => t0, Mute: () => Oy, None: () => r0, Opaque: () => i0, Pause: () => My, Play: () => Ry, Progress: () => Iy, Raised: () => l0, Red: () => Jy, Replay: () => zy, Reset: () => f0, Script: () => m0, Subtitles: () => Vy, Text: () => Yy, Transparent: () => s0, Uniform: () => u0, Unmute: () => Uy, White: () => Ky, Window: () => a0, Yellow: () => e0, default: () => J_ });
var Ry;
var My;
var zy;
var _y;
var Ly;
var Ny;
var Iy;
var $y;
var Oy;
var Uy;
var Vy;
var Wy;
var qy;
var Hy;
var Gy;
var Yy;
var Ky;
var Zy;
var Jy;
var Xy;
var Qy;
var e0;
var t0;
var o0;
var n0;
var a0;
var s0;
var i0;
var r0;
var l0;
var c0;
var u0;
var d0;
var p0;
var m0;
var f0;
var g0;
var J_;
var ys = p(() => {
  "use strict";
  Ry = "Reproducir", My = "Pausa", zy = "Repetir", _y = "Duraci\xF3n", Ly = "EN DIRECTO", Ny = "Cargado", Iy = "Progresi\xF3n", $y = "Pantalla completa", Oy = "Silenciar", Uy = "Son activado", Vy = "Subt\xEDtulos", Wy = "Subt\xEDtulos para xordos", qy = "Cap\xEDtulos", Hy = "Descrici\xF3ns", Gy = "Pechar", Yy = "Texto", Ky = "Branco", Zy = "Negro", Jy = "Vermello", Xy = "Verde", Qy = "Azul", e0 = "Marelo", t0 = "Maxenta", o0 = "Cian", n0 = "Fondo", a0 = "Xanela", s0 = "Transparente", i0 = "Opaca", r0 = "Ning\xFAn", l0 = "\xC9rguida", c0 = "Ca\xEDda", u0 = "Uniforme", d0 = "Sombra ca\xEDda", p0 = "Manuscrito", m0 = "It\xE1lica", f0 = "Reiniciar", g0 = "Feito", J_ = { "Audio Player": "Reprodutor de son", "Video Player": "Reprodutor de v\xEDdeo", Play: Ry, Pause: My, Replay: zy, "Current Time": "Tempo reproducido", Duration: _y, "Remaining Time": "Tempo restante", "Stream Type": "Tipo de fluxo", LIVE: Ly, "Seek to live, currently behind live": "Buscando directo, actualmente tras en directo", "Seek to live, currently playing live": "Buscando directo, actualmente reproducindo en directo", Loaded: Ny, Progress: Iy, "Progress Bar": "Barra de progreso", "progress bar timing: currentTime={1} duration={2}": "{1} de {2}", Fullscreen: $y, "Exit Fullscreen": "Xanela", Mute: Oy, Unmute: Uy, "Playback Rate": "Velocidade de reproduci\xF3n", Subtitles: Vy, "subtitles off": "subt\xEDtulos desactivados", Captions: Wy, "captions off": "subt\xEDtulos para xordos desactivados", Chapters: qy, Descriptions: Hy, "descriptions off": "descrici\xF3ns desactivadas", "Audio Track": "Pista de son", "Volume Level": "Nivel do volume", "You aborted the media playback": "Vostede interrompeu a reproduci\xF3n do medio.", "A network error caused the media download to fail part-way.": "Un erro de rede interrompeu a descarga do medio.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Non foi pos\xEDbel cargar o medio por mor dun fallo de rede ou do servidor ou porque o formato non \xE9 compat\xEDbel.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Interrompeuse a reproduci\xF3n do medio por mor dun problema de estragamento dos datos ou porque o medio precisa funci\xF3ns que o seu navegador non ofrece.", "No compatible source was found for this media.": "Non se atopou ningunha orixe compat\xEDbel con este v\xEDdeo.", "The media is encrypted and we do not have the keys to decrypt it.": "O medio est\xE1 cifrado e non temos as chaves para descifralo .", "Play Video": "Reproducir v\xEDdeo", Close: Gy, "Close Modal Dialog": "Pechar a caixa de di\xE1logo modal", "Modal Window": "Xanela modal", "This is a modal window": "Esta \xE9 unha xanela modal", "This modal can be closed by pressing the Escape key or activating the close button.": "Este di\xE1logo modal p\xF3dese pechar premendo a tecla Escape ou activando o bot\xF3n de pechar.", ", opens captions settings dialog": ", abre o di\xE1logo de axustes dos subt\xEDtulos para xordos", ", opens subtitles settings dialog": ", abre o di\xE1logo de axustes dos subt\xEDtulos", ", opens descriptions settings dialog": ", abre o di\xE1logo de axustes das descrici\xF3ns", ", selected": ", s\xE9leccionado", "captions settings": "axustes dos subt\xEDtulos para xordos", "subtitles settings": "axustes dos subt\xEDtulos", "descriptions settings": "axustes das descrici\xF3ns", Text: Yy, White: Ky, Black: Zy, Red: Jy, Green: Xy, Blue: Qy, Yellow: e0, Magenta: t0, Cyan: o0, Background: n0, Window: a0, Transparent: s0, "Semi-Transparent": "Semi-transparente", Opaque: i0, "Font Size": "Tama\xF1o das letras", "Text Edge Style": "Estilo do bordos do texto", None: r0, Raised: l0, Depressed: c0, Uniform: u0, Dropshadow: d0, "Font Family": "Familia de letras", "Proportional Sans-Serif": "Sans-Serif proporcional", "Monospace Sans-Serif": "Sans-Serif monoespazo (caixa fixa)", "Proportional Serif": "Serif proporcional", "Monospace Serif": "Serif monoespazo (caixa fixa)", Casual: p0, Script: m0, "Small Caps": "Pequenas mai\xFAsculas", Reset: f0, "restore all settings to the default values": "restaurar todos os axustes aos valores predeterminados", Done: g0, "Caption Settings Dialog": "Di\xE1logo de axustes dos subt\xEDtulos para xordos", "Beginning of dialog window. Escape will cancel and close the window.": "Inicio da xanela de di\xE1logo. A tecla Escape cancelar\xE1 e pechar\xE1 a xanela.", "End of dialog window.": "Fin da xanela de di\xE1logo.", "{1} is loading.": "{1} est\xE1 a cargar." };
});
var bs = {};
h(bs, { Background: () => $0, Black: () => R0, Blue: () => _0, Captions: () => F0, Casual: () => K0, Chapters: () => T0, Close: () => j0, Cyan: () => I0, Depressed: () => H0, Descriptions: () => P0, Done: () => X0, Dropshadow: () => Y0, Duration: () => y0, Fullscreen: () => C0, Green: () => z0, LIVE: () => b0, Loaded: () => w0, Magenta: () => N0, Mute: () => x0, None: () => W0, Opaque: () => V0, Pause: () => D0, Play: () => h0, Progress: () => k0, Raised: () => q0, Red: () => M0, Replay: () => v0, Reset: () => J0, Script: () => Z0, Subtitles: () => E0, Text: () => A0, Transparent: () => U0, Uniform: () => G0, Unmute: () => S0, White: () => B0, Window: () => O0, Yellow: () => L0, default: () => X_ });
var h0;
var D0;
var v0;
var y0;
var b0;
var w0;
var k0;
var C0;
var x0;
var S0;
var E0;
var F0;
var T0;
var P0;
var j0;
var A0;
var B0;
var R0;
var M0;
var z0;
var _0;
var L0;
var N0;
var I0;
var $0;
var O0;
var U0;
var V0;
var W0;
var q0;
var H0;
var G0;
var Y0;
var K0;
var Z0;
var J0;
var X0;
var X_;
var ws = p(() => {
  "use strict";
  h0 = "\u05E0\u05B7\u05D2\u05BC\u05B5\u05DF", D0 = "\u05D4\u05E9\u05D4\u05D4", v0 = "\u05E0\u05B7\u05D2\u05BC\u05B5\u05DF \u05E9\u05D5\u05D1", y0 = "\u05D6\u05DE\u05DF \u05DB\u05D5\u05DC\u05DC", b0 = "\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D7\u05D9", w0 = "\u05E0\u05D8\u05E2\u05DF", k0 = "\u05D4\u05EA\u05E7\u05D3\u05DE\u05D5\u05EA", C0 = "\u05DE\u05E1\u05DA \u05DE\u05DC\u05D0", x0 = "\u05D4\u05E9\u05EA\u05E7", S0 = "\u05D1\u05D8\u05DC \u05D4\u05E9\u05EA\u05E7\u05D4", E0 = "\u05DB\u05EA\u05D5\u05D1\u05D9\u05D5\u05EA", F0 = "\u05DB\u05D9\u05EA\u05D5\u05D1\u05D9\u05DD", T0 = "\u05E4\u05E8\u05E7\u05D9\u05DD", P0 = "\u05EA\u05D9\u05D0\u05D5\u05E8\u05D9\u05DD", j0 = "\u05E1\u05B0\u05D2\u05D5\u05B9\u05E8", A0 = "\u05D8\u05E7\u05E1\u05D8", B0 = "\u05DC\u05D1\u05DF", R0 = "\u05E9\u05D7\u05D5\u05E8", M0 = "\u05D0\u05D3\u05D5\u05DD", z0 = "\u05D9\u05E8\u05D5\u05E7", _0 = "\u05DB\u05D7\u05D5\u05DC", L0 = "\u05E6\u05D4\u05D5\u05D1", N0 = "\u05DE\u05B7\u05D2\u05B6'\u05E0\u05D8\u05B8\u05D4", I0 = "\u05D8\u05D5\u05E8\u05E7\u05D9\u05D6", $0 = "\u05E8\u05E7\u05E2", O0 = "\u05D7\u05DC\u05D5\u05DF", U0 = "\u05E9\u05E7\u05D5\u05E3", V0 = "\u05D0\u05B8\u05D8\u05D5\u05BC\u05DD", W0 = "\u05DC\u05DC\u05D0", q0 = "\u05DE\u05D5\u05E8\u05DD", H0 = "\u05DE\u05D5\u05E8\u05D3", G0 = "\u05D0\u05D7\u05D9\u05D3", Y0 = "\u05D4\u05D8\u05DC\u05EA \u05E6\u05DC", K0 = "\u05D0\u05B7\u05D2\u05B8\u05D1\u05B4\u05D9", Z0 = "\u05EA\u05E1\u05E8\u05D9\u05D8", J0 = "\u05D0\u05B4\u05E4\u05BC\u05D5\u05BC\u05E1", X0 = "\u05D1\u05D5\u05E6\u05E2", X_ = { "Audio Player": "\u05E0\u05B7\u05D2\u05BC\u05B8\u05DF \u05E9\u05DE\u05E2", "Video Player": "\u05E0\u05B7\u05D2\u05BC\u05B8\u05DF \u05D5\u05D9\u05D3\u05D0\u05D5", Play: h0, Pause: D0, Replay: v0, "Current Time": "\u05D6\u05DE\u05DF \u05E0\u05D5\u05DB\u05D7\u05D9", Duration: y0, "Remaining Time": "\u05D6\u05DE\u05DF \u05E0\u05D5\u05EA\u05E8", "Stream Type": "\u05E1\u05D5\u05D2 Stream", LIVE: b0, Loaded: w0, Progress: k0, "Progress Bar": "\u05E1\u05E8\u05D2\u05DC \u05D4\u05EA\u05E7\u05D3\u05DE\u05D5\u05EA", "progress bar timing: currentTime={1} duration={2}": "{1} \u05DE\u05EA\u05D5\u05DA {2}", Fullscreen: C0, "Exit Fullscreen": "\u05DE\u05E1\u05DA \u05DC\u05D0 \u05DE\u05DC\u05D0", Mute: x0, Unmute: S0, "Playback Rate": "\u05E7\u05E6\u05D1 \u05E0\u05D9\u05D2\u05D5\u05DF", Subtitles: E0, "subtitles off": "\u05DB\u05EA\u05D5\u05D1\u05D9\u05D5\u05EA \u05DB\u05D1\u05D5\u05D9\u05D5\u05EA", Captions: F0, "captions off": "\u05DB\u05D9\u05EA\u05D5\u05D1\u05D9\u05DD \u05DB\u05D1\u05D5\u05D9\u05D9\u05DD", Chapters: T0, Descriptions: P0, "descriptions off": "\u05EA\u05D9\u05D0\u05D5\u05E8\u05D9\u05DD \u05DB\u05D1\u05D5\u05D9\u05D9\u05DD", "Audio Track": "\u05E8\u05E6\u05D5\u05E2\u05EA \u05E9\u05DE\u05E2", "Volume Level": "\u05E8\u05DE\u05EA \u05D5\u05D5\u05DC\u05D9\u05D5\u05DD", "You aborted the media playback": "\u05D1\u05D9\u05D8\u05DC\u05EA \u05D0\u05EA \u05D4\u05E9\u05DE\u05E2\u05EA \u05D4\u05DE\u05D3\u05D9\u05D4", "A network error caused the media download to fail part-way.": "\u05E9\u05D2\u05D9\u05D0\u05EA \u05E8\u05E9\u05EA \u05D2\u05E8\u05DE\u05D4 \u05DC\u05D4\u05D5\u05E8\u05D3\u05EA \u05D4\u05DE\u05D3\u05D9\u05D4 \u05DC\u05D4\u05D9\u05DB\u05E9\u05DC \u05D1\u05D0\u05DE\u05E6\u05E2.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D8\u05E2\u05D5\u05DF \u05D0\u05EA \u05D4\u05DE\u05D3\u05D9\u05D4, \u05D0\u05D5 \u05DE\u05DB\u05D9\u05D5\u05D5\u05DF \u05E9\u05D4\u05E8\u05E9\u05EA \u05D0\u05D5 \u05D4\u05E9\u05E8\u05EA \u05DB\u05E9\u05DC\u05D5 \u05D0\u05D5 \u05DE\u05DB\u05D9\u05D5\u05D5\u05DF \u05E9\u05D4\u05E4\u05D5\u05E8\u05DE\u05D8 \u05D0\u05D9\u05E0\u05D5 \u05E0\u05EA\u05DE\u05DA.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\u05D4\u05E9\u05DE\u05E2\u05EA \u05D4\u05DE\u05D3\u05D9\u05D4 \u05D1\u05D5\u05D8\u05DC\u05D4 \u05D1\u05E9\u05DC \u05D1\u05E2\u05D9\u05EA \u05D4\u05E9\u05D7\u05D8\u05EA \u05DE\u05D9\u05D3\u05E2 \u05D0\u05D5 \u05DE\u05DB\u05D9\u05D5\u05D5\u05DF \u05E9\u05D4\u05DE\u05D3\u05D9\u05D4 \u05E2\u05E9\u05EA\u05D4 \u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1\u05EA\u05DB\u05D5\u05E0\u05D5\u05EA \u05E9\u05D4\u05D3\u05E4\u05D3\u05E4\u05DF \u05E9\u05DC\u05DA \u05DC\u05D0 \u05EA\u05DE\u05DA \u05D1\u05D4\u05DF.", "No compatible source was found for this media.": "\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05DE\u05E7\u05D5\u05E8 \u05EA\u05D5\u05D0\u05DD \u05E2\u05D1\u05D5\u05E8 \u05DE\u05D3\u05D9\u05D4 \u05D6\u05D5.", "The media is encrypted and we do not have the keys to decrypt it.": "\u05D4\u05DE\u05D3\u05D9\u05D4 \u05DE\u05D5\u05E6\u05E4\u05E0\u05EA \u05D5\u05D0\u05D9\u05DF \u05D1\u05D9\u05D3\u05D9\u05E0\u05D5 \u05D0\u05EA \u05D4\u05DE\u05E4\u05EA\u05D7 \u05DB\u05D3\u05D9 \u05DC\u05E4\u05E2\u05E0\u05D7 \u05D0\u05D5\u05EA\u05D4.", "Play Video": "\u05E0\u05B7\u05D2\u05BC\u05B5\u05DF \u05D5\u05D9\u05D3\u05D0\u05D5", Close: j0, "Close Modal Dialog": "\u05E1\u05B0\u05D2\u05D5\u05B9\u05E8 \u05D3\u05D5-\u05E9\u05D9\u05D7 \u05DE\u05D5\u05D3\u05D0\u05DC\u05D9", "Modal Window": "\u05D7\u05DC\u05D5\u05DF \u05DE\u05D5\u05D3\u05D0\u05DC\u05D9", "This is a modal window": "\u05D6\u05D4\u05D5 \u05D7\u05DC\u05D5\u05DF \u05DE\u05D5\u05D3\u05D0\u05DC\u05D9", "This modal can be closed by pressing the Escape key or activating the close button.": '\u05E0\u05D9\u05EA\u05DF \u05DC\u05E1\u05D2\u05D5\u05E8 \u05D7\u05DC\u05D5\u05DF \u05DE\u05D5\u05D3\u05D0\u05DC\u05D9 \u05D6\u05D4 \u05E2"\u05D9 \u05DC\u05D7\u05D9\u05E6\u05D4 \u05E2\u05DC \u05DB\u05E4\u05EA\u05D5\u05E8 \u05D4-Escape \u05D0\u05D5 \u05D4\u05E4\u05E2\u05DC\u05EA \u05DB\u05E4\u05EA\u05D5\u05E8 \u05D4\u05E1\u05D2\u05D9\u05E8\u05D4.', ", opens captions settings dialog": ", \u05E4\u05D5\u05EA\u05D7 \u05D7\u05DC\u05D5\u05DF \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05DB\u05D9\u05EA\u05D5\u05D1\u05D9\u05DD", ", opens subtitles settings dialog": ", \u05E4\u05D5\u05EA\u05D7 \u05D7\u05DC\u05D5\u05DF \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05DB\u05EA\u05D5\u05D1\u05D9\u05D5\u05EA", ", opens descriptions settings dialog": ", \u05E4\u05D5\u05EA\u05D7 \u05D7\u05DC\u05D5\u05DF \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05EA\u05D9\u05D0\u05D5\u05E8\u05D9\u05DD", ", selected": ", \u05E0\u05D1\u05D7\u05E8/\u05D5", "captions settings": "\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05DB\u05D9\u05EA\u05D5\u05D1\u05D9\u05DD", "subtitles settings": "\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05DB\u05EA\u05D5\u05D1\u05D9\u05D5\u05EA", "descriptions settings": "\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05EA\u05D9\u05D0\u05D5\u05E8\u05D9\u05DD", Text: A0, White: B0, Black: R0, Red: M0, Green: z0, Blue: _0, Yellow: L0, Magenta: N0, Cyan: I0, Background: $0, Window: O0, Transparent: U0, "Semi-Transparent": "\u05E9\u05E7\u05D5\u05E3 \u05DC\u05DE\u05D7\u05E6\u05D4", Opaque: V0, "Font Size": "\u05D2\u05D5\u05D3\u05DC \u05D2\u05D5\u05E4\u05DF", "Text Edge Style": "\u05E1\u05D2\u05E0\u05D5\u05DF \u05E7\u05E6\u05D5\u05D5\u05EA \u05D8\u05E7\u05E1\u05D8", None: W0, Raised: q0, Depressed: H0, Uniform: G0, Dropshadow: Y0, "Font Family": "\u05DE\u05E9\u05E4\u05D7\u05EA \u05D2\u05D5\u05E4\u05DF", "Proportional Sans-Serif": "\u05E4\u05E8\u05D5\u05E4\u05D5\u05E8\u05E6\u05D9\u05D5\u05E0\u05D9 \u05D5\u05DC\u05DC\u05D0 \u05EA\u05D2\u05D9\u05D5\u05EA (Proportional Sans-Serif)", "Monospace Sans-Serif": "\u05D1\u05E8\u05D5\u05D7\u05D1 \u05D0\u05D7\u05D9\u05D3 \u05D5\u05DC\u05DC\u05D0 \u05EA\u05D2\u05D9\u05D5\u05EA (Monospace Sans-Serif)", "Proportional Serif": "\u05E4\u05E8\u05D5\u05E4\u05D5\u05E8\u05E6\u05D9\u05D5\u05E0\u05D9 \u05D5\u05E2\u05DD \u05EA\u05D2\u05D9\u05D5\u05EA (Proportional Serif)", "Monospace Serif": "\u05D1\u05E8\u05D5\u05D7\u05D1 \u05D0\u05D7\u05D9\u05D3 \u05D5\u05E2\u05DD \u05EA\u05D2\u05D9\u05D5\u05EA (Monospace Serif)", Casual: K0, Script: Z0, "Small Caps": "\u05D0\u05D5\u05EA\u05D9\u05D5\u05EA \u05E7\u05D8\u05E0\u05D5\u05EA", Reset: J0, "restore all settings to the default values": "\u05E9\u05D7\u05D6\u05E8 \u05D0\u05EA \u05DB\u05DC \u05D4\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05DC\u05E2\u05E8\u05DB\u05D9 \u05D1\u05E8\u05D9\u05E8\u05EA \u05D4\u05DE\u05D7\u05D3\u05DC", Done: X0, "Caption Settings Dialog": "\u05D3\u05D5-\u05E9\u05D9\u05D7 \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05DB\u05D9\u05EA\u05D5\u05D1\u05D9\u05DD", "Beginning of dialog window. Escape will cancel and close the window.": "\u05EA\u05D7\u05D9\u05DC\u05EA \u05D7\u05DC\u05D5\u05DF \u05D3\u05D5-\u05E9\u05D9\u05D7. Escape \u05D9\u05D1\u05D8\u05DC \u05D5\u05D9\u05E1\u05D2\u05D5\u05E8 \u05D0\u05EA \u05D4\u05D7\u05DC\u05D5\u05DF", "End of dialog window.": "\u05E1\u05D5\u05E3 \u05D7\u05DC\u05D5\u05DF \u05D3\u05D5-\u05E9\u05D9\u05D7." };
});
var ks = {};
h(ks, { Background: () => Cb, Black: () => hb, Blue: () => yb, Captions: () => ub, Casual: () => Bb, Chapters: () => db, Close: () => mb, Cyan: () => kb, Depressed: () => Pb, Descriptions: () => pb, Done: () => zb, Dropshadow: () => Ab, Duration: () => ob, Fullscreen: () => ib, Green: () => vb, LIVE: () => nb, Loaded: () => ab, Magenta: () => wb, Mute: () => rb, None: () => Fb, Opaque: () => Eb, Pause: () => eb, Play: () => Q0, Progress: () => sb, Raised: () => Tb, Red: () => Db, Replay: () => tb, Reset: () => Mb, Script: () => Rb, Subtitles: () => cb, Text: () => fb, Transparent: () => Sb, Uniform: () => jb, Unmute: () => lb, White: () => gb, Window: () => xb, Yellow: () => bb, default: () => Q_ });
var Q0;
var eb;
var tb;
var ob;
var nb;
var ab;
var sb;
var ib;
var rb;
var lb;
var cb;
var ub;
var db;
var pb;
var mb;
var fb;
var gb;
var hb;
var Db;
var vb;
var yb;
var bb;
var wb;
var kb;
var Cb;
var xb;
var Sb;
var Eb;
var Fb;
var Tb;
var Pb;
var jb;
var Ab;
var Bb;
var Rb;
var Mb;
var zb;
var Q_;
var Cs = p(() => {
  "use strict";
  Q0 = "\u091A\u0932\u093E\u090F\u0901", eb = "\u0930\u094B\u0915\u0947", tb = "\u092B\u093F\u0930 \u0938\u0947 \u091A\u0932\u093E\u090F\u0901", ob = "\u0905\u0935\u0927\u093F", nb = "\u0932\u093E\u0907\u0935", ab = "\u0932\u094B\u0921 \u0939\u0941\u0906", sb = "\u092A\u094D\u0930\u0917\u0924\u093F", ib = "\u092B\u093C\u0941\u0932 \u0938\u094D\u0915\u094D\u0930\u0940\u0928", rb = "\u092E\u094D\u092F\u0942\u091F \u0915\u0930\u0947\u0902", lb = "\u0905\u0928\u092E\u094D\u092F\u0942\u091F \u0915\u0930\u0947\u0902", cb = "\u0909\u092A\u0936\u0940\u0930\u094D\u0937\u0915", ub = "\u0915\u0948\u092A\u094D\u0936\u0928", db = "\u0905\u0927\u094D\u092F\u093E\u092F", pb = "\u0935\u093F\u0935\u0930\u0923", mb = "\u092C\u0902\u0926 \u0915\u0930\u0947", fb = "\u091F\u0947\u0915\u094D\u0938\u094D\u091F", gb = "\u0938\u092B\u0947\u0926", hb = "\u0915\u093E\u0932\u093E", Db = "\u0932\u093E\u0932", vb = "\u0939\u0930\u093E", yb = "\u0928\u0940\u0932\u093E", bb = "\u092A\u0940\u0932\u093E", wb = "\u092E\u0948\u091C\u0947\u0902\u091F\u093E", kb = "\u0938\u093F\u092F\u093E\u0928", Cb = "\u092C\u0948\u0915\u0917\u094D\u0930\u093E\u0909\u0902\u0921", xb = "\u0935\u093F\u0902\u0921\u094B", Sb = "\u092A\u093E\u0930\u0926\u0930\u094D\u0936\u0940", Eb = "\u0905\u092A\u093E\u0930\u0926\u0930\u094D\u0936\u0940", Fb = "\u0915\u094B\u0908 \u0928\u0939\u0940\u0902", Tb = "\u0909\u0920\u093E \u0939\u0941\u0906", Pb = "\u0909\u0926\u093E\u0938", jb = "\u0935\u0930\u094D\u0926\u0940", Ab = "\u092A\u0930\u091B\u093E\u0908", Bb = "\u0906\u0915\u0938\u094D\u092E\u093F\u0915", Rb = "\u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F", Mb = "\u0930\u0940\u0938\u0947\u091F \u0915\u0930\u0947\u0902", zb = "\u092A\u0942\u0930\u094D\u0923", Q_ = { "Audio Player": "\u0911\u0921\u093F\u092F\u094B \u092A\u094D\u0932\u0947\u092F\u0930", "Video Player": "\u0935\u0940\u0921\u093F\u092F\u094B \u092A\u094D\u0932\u0947\u092F\u0930", Play: Q0, Pause: eb, Replay: tb, "Current Time": "\u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u0938\u092E\u092F", Duration: ob, "Remaining Time": "\u0936\u0947\u0937 \u0938\u092E\u092F", "Stream Type": "\u0938\u094D\u091F\u094D\u0930\u0940\u092E \u092A\u094D\u0930\u0915\u093E\u0930", LIVE: nb, "Seek to live, currently behind live": "\u091B\u094B\u0921\u093C\u0915\u0930 \u0932\u093E\u0907\u0935 \u092A\u094D\u0930\u0938\u093E\u0930\u0923 \u092A\u0930 \u0906\u0917\u0947 \u092C\u0922\u093C\u0947\u0902, \u0905\u092D\u0940 \u0932\u093E\u0907\u0935 \u092A\u094D\u0930\u0938\u093E\u0930\u0923 \u0938\u0947 \u092A\u0940\u091B\u0947 \u0939\u0948\u0902", "Seek to live, currently playing live": "\u091B\u094B\u0921\u093C\u0915\u0930 \u0932\u093E\u0907\u0935 \u092A\u094D\u0930\u0938\u093E\u0930\u0923 \u092A\u0930 \u0906\u0917\u0947 \u092C\u0922\u093C\u0947\u0902, \u0905\u092D\u0940 \u0932\u093E\u0907\u0935 \u091A\u0932 \u0930\u0939\u093E \u0939\u0948", Loaded: ab, Progress: sb, "Progress Bar": "\u092A\u094D\u0930\u094B\u0917\u0947\u0938 \u092C\u093E\u0930", "progress bar timing: currentTime={1} duration={2}": "{2} \u092E\u0947\u0902 \u0938\u0947 {1}", Fullscreen: ib, "Exit Fullscreen": "\u095E\u0941\u0932 \u0938\u094D\u0915\u094D\u0930\u0940\u0928 \u0938\u0947 \u092C\u093E\u0939\u0930 \u0928\u093F\u0915\u0932\u0947\u0902", Mute: rb, Unmute: lb, "Playback Rate": "\u091A\u0932\u093E\u0928\u0947 \u0915\u0940 \u0926\u0930", Subtitles: cb, "subtitles off": "\u0909\u092A\u0936\u0940\u0930\u094D\u0937\u0915 \u092C\u0902\u0926", Captions: ub, "captions off": "\u0915\u0948\u092A\u094D\u0936\u0928 \u092C\u0902\u0926", Chapters: db, Descriptions: pb, "descriptions off": "\u0935\u093F\u0935\u0930\u0923 \u092C\u0902\u0926", "Audio Track": "\u0911\u0921\u093F\u092F\u094B \u091F\u094D\u0930\u0948\u0915", "Volume Level": "\u0935\u0949\u0932\u094D\u092F\u0942\u092E \u0938\u094D\u0924\u0930", "You aborted the media playback": "\u0906\u092A\u0928\u0947 \u092E\u0940\u0921\u093F\u092F\u093E \u092A\u094D\u0932\u0947\u092C\u0948\u0915 \u0915\u094B \u0930\u094B\u0915 \u0926\u093F\u092F\u093E", "A network error caused the media download to fail part-way.": "\u090F\u0915 \u0928\u0947\u091F\u0935\u0930\u094D\u0915 \u0924\u094D\u0930\u0941\u091F\u093F \u0915\u0947 \u0915\u093E\u0930\u0923 \u092E\u0940\u0921\u093F\u092F\u093E \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0906\u0902\u0936\u093F\u0915 \u0930\u0942\u092A \u0938\u0947 \u0935\u093F\u092B\u0932 \u0939\u094B \u0917\u092F\u093E\u0964", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\u092E\u0940\u0921\u093F\u092F\u093E \u0932\u094B\u0921 \u0928\u0939\u0940\u0902 \u0915\u093F\u092F\u093E \u091C\u093E \u0938\u0915\u093E, \u092F\u093E \u0924\u094B \u0938\u0930\u094D\u0935\u0930 \u092F\u093E \u0928\u0947\u091F\u0935\u0930\u094D\u0915 \u0935\u093F\u092B\u0932 \u0939\u094B\u0928\u0947 \u0915\u0947 \u0915\u093E\u0930\u0923 \u092F\u093E \u092A\u094D\u0930\u093E\u0930\u0942\u092A \u0938\u092E\u0930\u094D\u0925\u093F\u0924 \u0928\u0939\u0940\u0902 \u0939\u094B\u0928\u0947 \u0915\u0947 \u0915\u093E\u0930\u0923\u0964", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\u092E\u0940\u0921\u093F\u092F\u093E \u092A\u094D\u0932\u0947\u092C\u0948\u0915 \u0928\u093F\u0930\u0938\u094D\u0924 \u0915\u0930 \u0926\u093F\u092F\u093E \u0917\u092F\u093E, \u0915\u093E\u0930\u0923: \u0926\u0942\u0937\u0923 \u0915\u0940 \u0938\u092E\u0938\u094D\u092F\u093E \u092F\u093E \u092E\u0940\u0921\u093F\u092F\u093E \u0928\u0947 \u0909\u0928 \u0938\u0941\u0935\u093F\u0927\u093E\u0913\u0902 \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u093F\u092F\u093E \u0925\u093E \u091C\u093F\u0928\u0915\u093E \u0906\u092A\u0915\u0947 \u092C\u094D\u0930\u093E\u0909\u091C\u093C\u0930 \u0928\u0947 \u0938\u092E\u0930\u094D\u0925\u0928 \u0928\u0939\u0940\u0902 \u0915\u093F\u092F\u093E\u0964", "No compatible source was found for this media.": "\u0907\u0938 \u092E\u0940\u0921\u093F\u092F\u093E \u0915\u0947 \u0932\u093F\u090F \u0915\u094B\u0908 \u0905\u0928\u0941\u0915\u0942\u0932 \u0938\u094D\u0930\u094B\u0924 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E\u0964.", "The media is encrypted and we do not have the keys to decrypt it.": "\u092E\u0940\u0921\u093F\u092F\u093E \u090F\u0928\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F\u0947\u0921 \u0939\u0948 \u0914\u0930 \u0939\u092E\u093E\u0930\u0947 \u092A\u093E\u0938 \u0907\u0938\u0947 \u0921\u093F\u0915\u094D\u0930\u093F\u092A\u094D\u091F \u0915\u0930\u0928\u0947 \u0915\u0940 \u091A\u093E\u092C\u0940 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964", "Play Video": "\u0935\u0940\u0921\u093F\u092F\u094B \u091A\u0932\u093E\u090F\u0902", Close: mb, "Close Modal Dialog": "\u092E\u094B\u0921\u0932 \u0921\u093E\u092F\u0932\u0949\u0917 \u092C\u0902\u0926 \u0915\u0930\u0947\u0902", "Modal Window": "\u092E\u094B\u0921\u0932 \u0935\u093F\u0902\u0921\u094B", "This is a modal window": "\u092F\u0939 \u090F\u0915 \u092E\u094B\u0921\u0932 \u0935\u093F\u0902\u0921\u094B \u0939\u0948", "This modal can be closed by pressing the Escape key or activating the close button.": "\u0907\u0938 \u092E\u094B\u0921\u0932 \u0915\u094B \u090F\u0938\u094D\u0915\u0947\u092A \u0915\u0941\u0902\u091C\u0940 \u0926\u092C\u093E\u0915\u0930 \u092F\u093E \u092C\u0902\u0926 \u0915\u0930\u0947\u0902 \u092C\u091F\u0928 \u0915\u094B \u0938\u0915\u094D\u0930\u093F\u092F \u0915\u0930\u0915\u0947 \u092C\u0902\u0926 \u0915\u093F\u092F\u093E \u091C\u093E \u0938\u0915\u0924\u093E \u0939\u0948\u0964", ", opens captions settings dialog": ", \u0915\u0948\u092A\u094D\u0936\u0928 \u0938\u0947\u091F\u093F\u0902\u0917 \u0921\u093E\u092F\u0932\u0949\u0917 \u0916\u094B\u0932\u0924\u093E \u0939\u0948", ", opens subtitles settings dialog": ", \u0909\u092A\u0936\u0940\u0930\u094D\u0937\u0915 \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938 \u0938\u0902\u0935\u093E\u0926 \u0916\u094B\u0932\u0924\u093E \u0939\u0948", ", opens descriptions settings dialog": ", \u0935\u093F\u0935\u0930\u0923 \u0938\u0947\u091F\u093F\u0902\u0917 \u0938\u0902\u0935\u093E\u0926 \u0916\u094B\u0932\u0924\u093E \u0939\u0948", ", selected": ", \u091A\u0941\u0928\u093E \u0917\u092F\u093E", "captions settings": "\u0915\u0948\u092A\u094D\u0936\u0928 \u0938\u0947\u091F\u093F\u0902\u0917", "subtitles settings": "\u0909\u092A\u0936\u0940\u0930\u094D\u0937\u0915 \u0938\u0947\u091F\u093F\u0902\u0917", "descriptions settings": "\u0935\u093F\u0935\u0930\u0923 \u0938\u0947\u091F\u093F\u0902\u0917", Text: fb, White: gb, Black: hb, Red: Db, Green: vb, Blue: yb, Yellow: bb, Magenta: wb, Cyan: kb, Background: Cb, Window: xb, Transparent: Sb, "Semi-Transparent": "\u0905\u0930\u094D\u0926\u094D\u0927 \u092A\u093E\u0930\u0926\u0930\u094D\u0936\u0940", Opaque: Eb, "Font Size": "\u092B\u093C\u0949\u0928\u094D\u091F \u0906\u0915\u093E\u0930", "Text Edge Style": "\u091F\u0947\u0915\u094D\u0938\u094D\u091F \u090F\u091C \u0938\u094D\u091F\u093E\u0907\u0932", None: Fb, Raised: Tb, Depressed: Pb, Uniform: jb, Dropshadow: Ab, "Font Family": "\u092B\u0949\u0923\u094D\u091F \u092A\u0930\u093F\u0935\u093E\u0930", "Proportional Sans-Serif": "\u092A\u094D\u0930\u094B\u092A\u094B\u0930\u0936\u0928\u0932 \u0938\u093E\u0901\u0938-\u0938\u0947\u0930\u093F\u092B", "Monospace Sans-Serif": "\u092E\u094B\u0928\u094B\u0938\u094D\u092A\u093E\u0938 \u0938\u093E\u0901\u0938-\u0938\u0947\u0930\u093F\u092B", "Proportional Serif": "\u092A\u094D\u0930\u094B\u092A\u094B\u0930\u0936\u0928\u0932 \u0938\u0947\u0930\u093F\u092B", "Monospace Serif": "\u092E\u094B\u0928\u094B\u0938\u094D\u092A\u093E\u0938 \u0938\u0947\u0930\u093F\u092B", Casual: Bb, Script: Rb, "Small Caps": "\u091B\u094B\u091F\u0947 \u0905\u0915\u094D\u0937\u0930", Reset: Mb, "restore all settings to the default values": "\u0938\u092D\u0940 \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938 \u0915\u094B \u0921\u093F\u092B\u093C\u0949\u0932\u094D\u091F \u092E\u093E\u0928\u094B\u0902 \u092A\u0930 \u092A\u0941\u0928\u0930\u094D\u0938\u094D\u0925\u093E\u092A\u093F\u0924 \u0915\u0930\u0947\u0902", Done: zb, "Caption Settings Dialog": "\u0915\u0948\u092A\u094D\u0936\u0928 \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938 \u0921\u093E\u092F\u0932\u0949\u0917", "Beginning of dialog window. Escape will cancel and close the window.": "\u0921\u093E\u092F\u0932\u0949\u0917 \u0935\u093F\u0902\u0921\u094B \u0915\u0940 \u0936\u0941\u0930\u0941\u0906\u0924\u0964 \u090F\u0938\u094D\u0915\u0947\u092A \u0935\u093F\u0902\u0921\u094B \u0915\u094B \u0930\u0926\u094D\u0926 \u0914\u0930 \u092C\u0902\u0926 \u0915\u0930 \u0926\u0947\u0917\u093E\u0964", "End of dialog window.": "\u0938\u0902\u0935\u093E\u0926 \u0935\u093F\u0902\u0921\u094B \u0915\u093E \u0905\u0902\u0924\u0964", "{1} is loading.": "{1} \u0932\u094B\u0921 \u0939\u094B \u0930\u0939\u093E \u0939\u0948\u0964", "Exit Picture-in-Picture": "\u092A\u093F\u0915\u094D\u091A\u0930-\u0907\u0928-\u092A\u093F\u0915\u094D\u091A\u0930 \u0938\u0947 \u092C\u093E\u0939\u0930 \u0928\u093F\u0915\u0932\u0947\u0902", "Picture-in-Picture": "\u092A\u093F\u0915\u094D\u091A\u0930-\u0907\u0928-\u092A\u093F\u0915\u094D\u091A\u0930" };
});
var xs = {};
h(xs, { Captions: () => Hb, Chapters: () => Gb, Duration: () => Nb, Fullscreen: () => Ub, LIVE: () => Ib, Loaded: () => $b, Mute: () => Vb, Pause: () => Lb, Play: () => _b, Progress: () => Ob, Subtitles: () => qb, Unmute: () => Wb, default: () => eL });
var _b;
var Lb;
var Nb;
var Ib;
var $b;
var Ob;
var Ub;
var Vb;
var Wb;
var qb;
var Hb;
var Gb;
var eL;
var Ss = p(() => {
  "use strict";
  _b = "Pusti", Lb = "Pauza", Nb = "Vrijeme trajanja", Ib = "U\u017DIVO", $b = "U\u010Ditan", Ob = "Progres", Ub = "Puni ekran", Vb = "Prigu\u0161en", Wb = "Ne-prigu\u0161en", qb = "Podnaslov", Hb = "Titlovi", Gb = "Poglavlja", eL = { Play: _b, Pause: Lb, "Current Time": "Trenutno vrijeme", Duration: Nb, "Remaining Time": "Preostalo vrijeme", "Stream Type": "Na\u010Din strimovanja", LIVE: Ib, Loaded: $b, Progress: Ob, Fullscreen: Ub, "Exit Fullscreen": "Mali ekran", Mute: Vb, Unmute: Wb, "Playback Rate": "Stopa reprodukcije", Subtitles: qb, "subtitles off": "Podnaslov deaktiviran", Captions: Hb, "captions off": "Titlovi deaktivirani", Chapters: Gb, "You aborted the media playback": "Isklju\u010Dili ste reprodukciju videa.", "A network error caused the media download to fail part-way.": "Video se prestao preuzimati zbog gre\u0161ke na mre\u017Ei.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Video se ne mo\u017Ee reproducirati zbog servera, gre\u0161ke u mre\u017Ei ili je format ne podr\u017Ean.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Reprodukcija videa je zaustavljenja zbog gre\u0161ke u formatu ili zbog verzije va\u0161eg pretra\u017Eiva\u010Da.", "No compatible source was found for this media.": "Nije na\u0111en nijedan kompatibilan izvor ovog videa." };
});
var Es = {};
h(Es, { Background: () => h1, Black: () => d1, Blue: () => f1, Captions: () => a1, Casual: () => E1, Chapters: () => s1, Close: () => l1, Cyan: () => k1, Depressed: () => j1, Descriptions: () => r1, Done: () => b1, Dropshadow: () => C1, Duration: () => Zb, Fullscreen: () => e1, Green: () => m1, LIVE: () => Jb, Loaded: () => Xb, Magenta: () => x1, Mute: () => t1, None: () => T1, Opaque: () => y1, Pause: () => Kb, Play: () => Yb, Progress: () => Qb, Raised: () => P1, Red: () => p1, Replay: () => i1, Reset: () => w1, Script: () => S1, Subtitles: () => n1, Text: () => c1, Transparent: () => v1, Uniform: () => F1, Unmute: () => o1, White: () => u1, Window: () => D1, Yellow: () => g1, default: () => tL });
var Yb;
var Kb;
var Zb;
var Jb;
var Xb;
var Qb;
var e1;
var t1;
var o1;
var n1;
var a1;
var s1;
var i1;
var r1;
var l1;
var c1;
var u1;
var d1;
var p1;
var m1;
var f1;
var g1;
var h1;
var D1;
var v1;
var y1;
var b1;
var w1;
var k1;
var C1;
var x1;
var S1;
var E1;
var F1;
var T1;
var P1;
var j1;
var tL;
var Fs = p(() => {
  "use strict";
  Yb = "Lej\xE1tsz\xE1s", Kb = "Sz\xFCnet", Zb = "Hossz", Jb = "\xC9L\u0150", Xb = "Bet\xF6ltve", Qb = "\xC1llapot", e1 = "Teljes k\xE9perny\u0151", t1 = "N\xE9m\xEDt\xE1s", o1 = "N\xE9m\xEDt\xE1s kikapcsolva", n1 = "Feliratok", a1 = "Magyar\xE1z\xF3 sz\xF6veg", s1 = "Fejezetek", i1 = "Visszaj\xE1tsz\xE1s", r1 = "Le\xEDr\xE1sok", l1 = "Bez\xE1r\xE1s", c1 = "Sz\xF6veg", u1 = "Feh\xE9r", d1 = "Fekete", p1 = "Piros", m1 = "Z\xF6ld", f1 = "K\xE9k", g1 = "S\xE1rga", h1 = "H\xE1tt\xE9r", D1 = "Ablak", v1 = "\xC1tl\xE1tsz\xF3", y1 = "\xC1ttetsz\u0151", b1 = "K\xE9sz", w1 = "Vissza\xE1ll\xEDt\xE1s", k1 = "Ci\xE1n", C1 = "\xC1rny\xE9k", x1 = "Lila", S1 = "Script", E1 = "Casual", F1 = "Uniform", T1 = "Egyik sem", P1 = "Emelt", j1 = "Nyomott", tL = { Play: Yb, Pause: Kb, "Current Time": "Aktu\xE1lis id\u0151pont", Duration: Zb, "Remaining Time": "H\xE1tral\xE9v\u0151 id\u0151", "Stream Type": "Adatfolyam t\xEDpusa", LIVE: Jb, Loaded: Xb, Progress: Qb, Fullscreen: e1, "Exit Fullscreen": "Norm\xE1l m\xE9ret", Mute: t1, Unmute: o1, "Playback Rate": "Lej\xE1tsz\xE1si sebess\xE9g", Subtitles: n1, "subtitles off": "Feliratok kikapcsolva", Captions: a1, "captions off": "Magyar\xE1z\xF3 sz\xF6veg kikapcsolva", Chapters: s1, "You aborted the media playback": "Le\xE1ll\xEDtotta a lej\xE1tsz\xE1st", "A network error caused the media download to fail part-way.": "H\xE1l\xF3zati hiba miatt a vide\xF3 r\xE9szlegesen t\xF6lt\u0151d\xF6tt le.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "A vide\xF3 nem t\xF6lthet\u0151 be h\xE1l\xF3zati vagy kiszolg\xE1l\xF3i hiba miatt, vagy a form\xE1tuma nem t\xE1mogatott.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "A lej\xE1tsz\xE1s adats\xE9r\xFCl\xE9s miatt le\xE1llt, vagy a vide\xF3 egyes tulajdons\xE1gait a b\xF6ng\xE9sz\u0151je nem t\xE1mogatja.", "No compatible source was found for this media.": "Nincs kompatibilis forr\xE1s ehhez a vide\xF3hoz.", "Audio Player": "Audio lej\xE1tsz\xF3", "Video Player": "Vide\xF3 lej\xE1tsz\xF3", Replay: i1, Descriptions: r1, "descriptions off": "le\xEDr\xE1sok kikapcsolva", "Audio Track": "Hangs\xE1v", "Volume Level": "Hanger\u0151", "Play Video": "Vide\xF3 lej\xE1tsz\xE1sa", Close: l1, Text: c1, White: u1, Black: d1, Red: p1, Green: m1, Blue: f1, Yellow: g1, Background: h1, Window: D1, Transparent: v1, "Semi-Transparent": "F\xE9lig \xE1tl\xE1tsz\xF3", Opaque: y1, "Font Size": "Bet\u0171m\xE9ret", "Font Family": "Bet\u0171t\xEDpus", Done: b1, "Picture-in-Picture": "K\xE9p a k\xE9pben", "Exit Picture-in-Picture": "Kil\xE9p\xE9s k\xE9p a k\xE9pben m\xF3db\xF3l", "{1} is loading.": "{1} bet\xF6lt\xE9se.", Reset: w1, "restore all settings to the default values": "\xF6sszes be\xE1ll\xEDt\xE1s vissza\xE1ll\xEDt\xE1sa az alap\xE9rtelmezett \xE9rt\xE9kekre", "The media is encrypted and we do not have the keys to decrypt it.": "A m\xE9dia titkos\xEDtva van \xE9s nincsenek kulcsok a visszafejt\xE9shez.", "Close Modal Dialog": "Felugr\xF3 ablak bez\xE1r\xE1sa", "Modal Window": "Felugr\xF3 ablak", "This modal can be closed by pressing the Escape key or activating the close button.": "Ezt a felugr\xF3 ablakot az Escape gomb megnyom\xE1s\xE1val vagy a bez\xE1r\xF3 gomb aktiv\xE1l\xE1s\xE1val lehet bez\xE1rni.", ", selected": ", kiv\xE1lasztva", "descriptions settings": "le\xEDr\xE1sok be\xE1ll\xEDt\xE1sa", "Text Edge Style": "Sz\xF6veg\xE9l st\xEDlus", "This is a modal window": "Ez egy felugr\xF3 ablak", Cyan: k1, Dropshadow: C1, "End of dialog window.": "P\xE1rbesz\xE9dablak v\xE9ge.", "Progress Bar": "Folyamatjelz\u0151 s\xE1v", "Beginning of dialog window. Escape will cancel and close the window.": "P\xE1rbesz\xE9dablak eleje. Az Escape gomb befejezi \xE9s bez\xE1rja az ablakot.", "Caption Settings Dialog": "Feliratbe\xE1ll\xEDt\xE1sok p\xE1rbesz\xE9dablak", ", opens descriptions settings dialog": ", megnyitja a le\xEDr\xE1sok be\xE1ll\xEDt\xE1sainak p\xE1rbesz\xE9dablakj\xE1t", ", opens captions settings dialog": ", megnyitja a magyar\xE1z\xF3 sz\xF6vegek be\xE1ll\xEDt\xE1sainak p\xE1rbesz\xE9dablakj\xE1t", ", opens subtitles settings dialog": ", megnyitja a feliratok be\xE1ll\xEDt\xE1sainak p\xE1rbesz\xE9dablakj\xE1t", "Seek to live, currently behind live": "\xC9l\u0151 ad\xE1shoz teker\xE9s, jelenleg az \xE9l\u0151 ad\xE1s m\xF6g\xF6tt van", "Seek to live, currently playing live": "\xC9l\u0151 ad\xE1shoz teker\xE9s, jelenleg az \xE9l\u0151 ad\xE1sn\xE1l van", "progress bar timing: currentTime={1} duration={2}": "{1} / {2}", Magenta: x1, Script: S1, Casual: E1, "Monospace Serif": "Monospace Serif", "Monospace Sans-Serif": "Monospace Sans-Serif", "Proportional Sans-Serif": "Proportional Sans-Serif", "Proportional Serif": "Proportional Serif", Uniform: F1, "Small Caps": "Kiskapit\xE1lis", None: T1, "captions settings": "magyar\xE1z\xF3 sz\xF6vegek be\xE1ll\xEDt\xE1sai", "subtitles settings": "feliratok be\xE1ll\xEDt\xE1sai", Raised: P1, Depressed: j1 };
});
var Ts = {};
h(Ts, { Background: () => t2, Black: () => Y1, Blue: () => J1, Captions: () => U1, Chapters: () => V1, Close: () => q1, Color: () => u2, Cyan: () => e2, Descriptions: () => W1, Done: () => c2, Dropshadow: () => r2, Duration: () => M1, Fullscreen: () => N1, Green: () => Z1, LIVE: () => z1, Loaded: () => _1, Magenta: () => Q1, Mute: () => I1, None: () => s2, Opacity: () => d2, Opaque: () => a2, Pause: () => B1, Play: () => A1, Progress: () => L1, Red: () => K1, Replay: () => R1, Reset: () => l2, Subtitles: () => O1, Text: () => H1, Transparent: () => n2, Uniform: () => i2, Unmute: () => $1, White: () => G1, Window: () => o2, Yellow: () => X1, default: () => oL });
var A1;
var B1;
var R1;
var M1;
var z1;
var _1;
var L1;
var N1;
var I1;
var $1;
var O1;
var U1;
var V1;
var W1;
var q1;
var H1;
var G1;
var Y1;
var K1;
var Z1;
var J1;
var X1;
var Q1;
var e2;
var t2;
var o2;
var n2;
var a2;
var s2;
var i2;
var r2;
var l2;
var c2;
var u2;
var d2;
var oL;
var Ps = p(() => {
  "use strict";
  A1 = "Play", B1 = "Pausa", R1 = "Replay", M1 = "Durata", z1 = "LIVE", _1 = "Caricato", L1 = "Stato", N1 = "Schermo intero", I1 = "Disattivare l\u2019audio", $1 = "Attivare l\u2019audio", O1 = "Sottotitoli", U1 = "Sottotitoli non udenti", V1 = "Capitolo", W1 = "Descrizioni", q1 = "Chiudi", H1 = "Testo", G1 = "Bianco", Y1 = "Nero", K1 = "Rosso", Z1 = "Verde", J1 = "Blu", X1 = "Giallo", Q1 = "Magenta", e2 = "Ciano", t2 = "Sfondo", o2 = "Finestra", n2 = "Trasparente", a2 = "Opaco", s2 = "Nessuno", i2 = "Uniforme", r2 = "Ombreggiatura", l2 = "Reinizializza", c2 = "Operazione completata", u2 = "Colore", d2 = "Opacit\xE0", oL = { "Audio Player": "Lettore audio", "Video Player": "Lettore video", Play: A1, Pause: B1, Replay: R1, "Current Time": "Orario attuale", Duration: M1, "Remaining Time": "Tempo rimanente", "Stream Type": "Tipo del Streaming", LIVE: z1, Loaded: _1, Progress: L1, "Progress Bar": "Barra di avanzamento", "progress bar timing: currentTime={1} duration={2}": "{1} di {2}", Fullscreen: N1, "Exit Fullscreen": "Chiudi Schermo intero", Mute: I1, Unmute: $1, "Playback Rate": "Tasso di riproduzione", Subtitles: O1, "subtitles off": "Senza sottotitoli", Captions: U1, "captions off": "Senza sottotitoli non udenti", Chapters: V1, Descriptions: W1, "descriptions off": "Descrizioni disattivate", "Audio Track": "Traccia audio", "Volume Level": "Livello del volume", "You aborted the media playback": "La riproduzione del filmato \xE8 stata interrotta.", "A network error caused the media download to fail part-way.": "Il download del filmato \xE8 stato interrotto a causa di un problema rete.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Il filmato non pu\xF2 essere caricato a causa di un errore nel server o nella rete o perch\xE9 il formato non viene supportato.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "La riproduzione del filmato \xE8 stata interrotta a causa di un file danneggiato o per l\u2019utilizzo di impostazioni non supportate dal browser.", "No compatible source was found for this media.": "Non ci sono fonti compatibili per questo filmato.", "The media is encrypted and we do not have the keys to decrypt it.": "Il contenuto multimediale \xE8 criptato e non disponiamo delle chiavi per decifrarlo.", "Play Video": "Riproduci il video", Close: q1, "Close Modal Dialog": "Chiudi la finestra di dialogo", "Modal Window": "Finestra di dialogo", "This is a modal window": "Questa \xE8 una finestra di dialogo", "This modal can be closed by pressing the Escape key or activating the close button.": "Questa finestra di dialogo pu\xF2 essere chiusa premendo sul tasto Esc o attivando il pulsante di chiusura.", ", opens captions settings dialog": ", aprire i parametri della trascrizione dei sottotitoli", ", opens subtitles settings dialog": ", aprire i parametri dei sottotitoli", ", opens descriptions settings dialog": ", aprire i parametri delle descrizioni", ", selected": ", selezionato", "captions settings": "Parametri della trascrizione dei sottotitoli", "subtitles settings": "Parametri dei sottotitoli", "descriptions settings": "Parametri delle descrizioni", Text: H1, White: G1, Black: Y1, Red: K1, Green: Z1, Blue: J1, Yellow: X1, Magenta: Q1, Cyan: e2, Background: t2, Window: o2, Transparent: n2, "Semi-Transparent": "Semi-Trasparente", Opaque: a2, "Font Size": "Dimensione dei caratteri", "Text Edge Style": "Stile dei bordi del testo", None: s2, Uniform: i2, Dropshadow: r2, "Font Family": "Famiglia di caratteri", "Proportional Sans-Serif": "Sans-Serif proporzionale", "Monospace Sans-Serif": "Sans-Serif monospazio", "Proportional Serif": "Serif proporzionale", "Monospace Serif": "Serif monospazio", "Small Caps": "Maiuscoletto", Reset: l2, "restore all settings to the default values": "Ripristina i valori predefiniti per tutti i parametri", Done: c2, "Caption Settings Dialog": "Finestra di dialogo dei parametri della trascrizione dei sottotitoli", "Beginning of dialog window. Escape will cancel and close the window.": "Inizio della finestra di dialogo. Il tasto Esc annuller\xE0 l\u2019operazione e chiuder\xE0 la finestra.", "End of dialog window.": "Fine della finestra di dialogo.", "{1} is loading.": "{1} in fase di caricamento.", "Exit Picture-in-Picture": "Esci dalla modalit\xE0 Picture-in-Picture", "Picture-in-Picture": "Picture-in-Picture", Color: u2, Opacity: d2, "Text Background": "Sfondo del testo", "Caption Area Background": "Sfondo dell'area dei sottotitoli", "Skip forward {1} seconds": "Avanti di {1} secondi", "Skip backward {1} seconds": "Indietro di {1} secondi" };
});
var js = {};
h(js, { Background: () => _2, Black: () => P2, Blue: () => B2, Captions: () => C2, Casual: () => q2, Chapters: () => x2, Close: () => E2, Color: () => K2, Cyan: () => z2, Depressed: () => U2, Descriptions: () => S2, Done: () => Y2, Dropshadow: () => W2, Duration: () => g2, Fullscreen: () => y2, Green: () => A2, LIVE: () => h2, Loaded: () => D2, Magenta: () => M2, Mute: () => b2, None: () => $2, Opacity: () => Z2, Opaque: () => I2, Pause: () => m2, Play: () => p2, Progress: () => v2, Raised: () => O2, Red: () => j2, Replay: () => f2, Reset: () => G2, Script: () => H2, Subtitles: () => k2, Text: () => F2, Transparent: () => N2, Uniform: () => V2, Unmute: () => w2, White: () => T2, Window: () => L2, Yellow: () => R2, default: () => nL });
var p2;
var m2;
var f2;
var g2;
var h2;
var D2;
var v2;
var y2;
var b2;
var w2;
var k2;
var C2;
var x2;
var S2;
var E2;
var F2;
var T2;
var P2;
var j2;
var A2;
var B2;
var R2;
var M2;
var z2;
var _2;
var L2;
var N2;
var I2;
var $2;
var O2;
var U2;
var V2;
var W2;
var q2;
var H2;
var G2;
var Y2;
var K2;
var Z2;
var nL;
var As = p(() => {
  "use strict";
  p2 = "\u518D\u751F", m2 = "\u4E00\u6642\u505C\u6B62", f2 = "\u3082\u3046\u4E00\u5EA6\u898B\u308B", g2 = "\u9577\u3055", h2 = "\u30E9\u30A4\u30D6", D2 = "\u30ED\u30FC\u30C9\u6E08\u307F", v2 = "\u9032\u884C\u72B6\u6CC1", y2 = "\u30D5\u30EB\u30B9\u30AF\u30EA\u30FC\u30F3", b2 = "\u30DF\u30E5\u30FC\u30C8", w2 = "\u30B5\u30A6\u30F3\u30C9\u3092\u30AA\u30F3", k2 = "\u30B5\u30D6\u30BF\u30A4\u30C8\u30EB", C2 = "\u30AD\u30E3\u30D7\u30B7\u30E7\u30F3", x2 = "\u30C1\u30E3\u30D7\u30BF\u30FC", S2 = "\u30C7\u30A3\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3", E2 = "\u9589\u3058\u308B", F2 = "\u30C6\u30AD\u30B9\u30C8", T2 = "\u767D", P2 = "\u9ED2", j2 = "\u8D64", A2 = "\u7DD1", B2 = "\u9752", R2 = "\u9EC4", M2 = "\u8D64\u7D2B", z2 = "\u30B7\u30A2\u30F3", _2 = "\u80CC\u666F", L2 = "\u30A6\u30A3\u30F3\u30C9\u30A6", N2 = "\u900F\u660E", I2 = "\u4E0D\u900F\u660E", $2 = "\u306A\u3057", O2 = "\u6D6E\u304D\u51FA\u3057", U2 = "\u6D6E\u304D\u5F6B\u308A", V2 = "\u5747\u4E00", W2 = "\u5F71\u4ED8\u304D", q2 = "\u30AB\u30B8\u30E5\u30A2\u30EB", H2 = "\u30B9\u30AF\u30EA\u30D7\u30C8", G2 = "\u30EA\u30BB\u30C3\u30C8", Y2 = "\u7D42\u4E86", K2 = "\u8272", Z2 = "\u4E0D\u900F\u660E\u5EA6", nL = { "Audio Player": "\u30AA\u30FC\u30C7\u30A3\u30AA\u30D7\u30EC\u30A4\u30E4\u30FC", "Video Player": "\u30D3\u30C7\u30AA\u30D7\u30EC\u30A4\u30E4\u30FC", Play: p2, Pause: m2, Replay: f2, "Current Time": "\u73FE\u5728\u306E\u6642\u9593", Duration: g2, "Remaining Time": "\u6B8B\u308A\u306E\u6642\u9593", "Stream Type": "\u30B9\u30C8\u30EA\u30FC\u30E0\u306E\u7A2E\u985E", LIVE: h2, "Seek to live, currently behind live": "\u30E9\u30A4\u30D6\u307E\u3067\u518D\u751F\u4F4D\u7F6E\u3092\u6307\u5B9A\u3001\u73FE\u5728\u30E9\u30A4\u30D6\u304C\u9045\u308C\u3066\u3044\u307E\u3059\u3002", "Seek to live, currently playing live": "\u30E9\u30A4\u30D6\u307E\u3067\u518D\u751F\u4F4D\u7F6E\u3092\u6307\u5B9A\u3001\u73FE\u5728\u30E9\u30A4\u30D6\u4E2D\u3002", Loaded: D2, Progress: v2, "Progress Bar": "\u30B7\u30FC\u30AF\u30D0\u30FC", "progress bar timing: currentTime={1} duration={2}": "{2}\u306E{1}", Fullscreen: y2, "Exit Fullscreen": "\u30D5\u30EB\u30B9\u30AF\u30EA\u30FC\u30F3\u4EE5\u5916", Mute: b2, Unmute: w2, "Playback Rate": "\u518D\u751F\u30EC\u30FC\u30C8", Subtitles: k2, "subtitles off": "\u30B5\u30D6\u30BF\u30A4\u30C8\u30EB \u30AA\u30D5", Captions: C2, "captions off": "\u30AD\u30E3\u30D7\u30B7\u30E7\u30F3 \u30AA\u30D5", Chapters: x2, Descriptions: S2, "descriptions off": "\u30C7\u30A3\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\u30AA\u30D5", "Audio Track": "\u97F3\u58F0\u30C8\u30E9\u30C3\u30AF", "Volume Level": "\u30DC\u30EA\u30E5\u30FC\u30E0\u30EC\u30D9\u30EB", "You aborted the media playback": "\u52D5\u753B\u518D\u751F\u3092\u4E2D\u6B62\u3057\u307E\u3057\u305F", "A network error caused the media download to fail part-way.": "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF \u30A8\u30E9\u30FC\u306B\u3088\u308A\u52D5\u753B\u306E\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u304C\u9014\u4E2D\u3067\u5931\u6557\u3057\u307E\u3057\u305F", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\u30B5\u30FC\u30D0\u30FC\u307E\u305F\u306F\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u306E\u30A8\u30E9\u30FC\u3001\u307E\u305F\u306F\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u304C\u30B5\u30DD\u30FC\u30C8\u3055\u308C\u3066\u3044\u306A\u3044\u305F\u3081\u3001\u52D5\u753B\u3092\u30ED\u30FC\u30C9\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\u7834\u640D\u306E\u554F\u984C\u3001\u307E\u305F\u306F\u304A\u4F7F\u3044\u306E\u30D6\u30E9\u30A6\u30B6\u304C\u30B5\u30DD\u30FC\u30C8\u3057\u3066\u3044\u306A\u3044\u6A5F\u80FD\u304C\u52D5\u753B\u306B\u4F7F\u7528\u3055\u308C\u3066\u3044\u305F\u305F\u3081\u3001\u52D5\u753B\u306E\u518D\u751F\u304C\u4E2D\u6B62\u3055\u308C\u307E\u3057\u305F", "No compatible source was found for this media.": "\u3053\u306E\u52D5\u753B\u306B\u5BFE\u3057\u3066\u4E92\u63DB\u6027\u306E\u3042\u308B\u30BD\u30FC\u30B9\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F", "The media is encrypted and we do not have the keys to decrypt it.": "\u30E1\u30C7\u30A3\u30A2\u306F\u6697\u53F7\u5316\u3055\u308C\u3066\u304A\u308A\u3001\u89E3\u8AAD\u3059\u308B\u305F\u3081\u306E\u30AD\u30FC\u304C\u3042\u308A\u307E\u305B\u3093\u3002", "Play Video": "\u30D3\u30C7\u30AA\u3092\u518D\u751F\u3059\u308B", Close: E2, "Close Modal Dialog": "\u30C0\u30A4\u30A2\u30ED\u30B0\u30DC\u30C3\u30AF\u30B9\u3092\u9589\u3058\u308B", "Modal Window": "\u30C0\u30A4\u30A2\u30ED\u30B0\u30DC\u30C3\u30AF\u30B9", "This is a modal window": "\u3053\u308C\u306F\u30C0\u30A4\u30A2\u30ED\u30B0\u30DC\u30C3\u30AF\u30B9\u3067\u3059", "This modal can be closed by pressing the Escape key or activating the close button.": "\u3053\u306E\u30C0\u30A4\u30A2\u30ED\u30B0\u30DC\u30C3\u30AF\u30B9\u306F\u3001Esc\u30AD\u30FC\u3092\u62BC\u3059\u304B\u3001\u9589\u3058\u308B\u30DC\u30BF\u30F3\u3092\u62BC\u3057\u3066\u9589\u3058\u308B\u3053\u3068\u304C\u3067\u304D\u307E", ", opens captions settings dialog": ", \u66F8\u304D\u8D77\u3053\u3057\u5B57\u5E55\u306E\u8A2D\u5B9A\u3092\u958B\u304F", ", opens subtitles settings dialog": ", \u5B57\u5E55\u306E\u8A2D\u5B9A\u3092\u958B\u304F", ", opens descriptions settings dialog": ", \u30C7\u30A3\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\u306E\u8A2D\u5B9A\u3092\u958B\u304F", ", selected": ", \u9078\u629E\u6E08\u307F", "captions settings": "\u66F8\u304D\u8D77\u3053\u3057\u5B57\u5E55\u306E\u8A2D\u5B9A", "subtitles settings": "\u5B57\u5E55\u306E\u8A2D\u5B9A", "descriptions settings": "\u30C7\u30A3\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\u306E\u8A2D\u5B9A", Text: F2, White: T2, Black: P2, Red: j2, Green: A2, Blue: B2, Yellow: R2, Magenta: M2, Cyan: z2, Background: _2, Window: L2, Transparent: N2, "Semi-Transparent": "\u534A\u900F\u660E", Opaque: I2, "Font Size": "\u6587\u5B57\u30B5\u30A4\u30BA", "Text Edge Style": "\u30C6\u30AD\u30B9\u30C8\u306E\u30A2\u30A6\u30C8\u30E9\u30A4\u30F3\u306E\u30B9\u30BF\u30A4\u30EB", None: $2, Raised: O2, Depressed: U2, Uniform: V2, Dropshadow: W2, "Font Family": "\u30D5\u30A9\u30F3\u30C8\u306E\u7A2E\u985E", "Proportional Sans-Serif": "\u30BB\u30EA\u30D5\u306A\u3057\u53EF\u5909\u5E45\u30D5\u30A9\u30F3\u30C8", "Monospace Sans-Serif": "\u30BB\u30EA\u30D5\u306A\u3057\u7B49\u5E45\u30D5\u30A9\u30F3\u30C8", "Proportional Serif": "\u30BB\u30EA\u30D5\u3042\u308A\u53EF\u5909\u5E45\u30D5\u30A9\u30F3\u30C8", "Monospace Serif": "\u30BB\u30EA\u30D5\u3042\u308A\u7B49\u5E45\u30D5\u30A9\u30F3\u30C8", Casual: q2, Script: H2, "Small Caps": "\u30B9\u30E2\u30FC\u30EB\u30AD\u30E3\u30D4\u30BF\u30EB", Reset: G2, "restore all settings to the default values": "\u3059\u3079\u3066\u306E\u8A2D\u5B9A\u3092\u30C7\u30D5\u30A9\u30EB\u30C8\u5024\u306B\u623B\u3059", Done: Y2, "Caption Settings Dialog": "\u66F8\u304D\u8D77\u3053\u3057\u5B57\u5E55\u8A2D\u5B9A\u30C0\u30A4\u30A2\u30ED\u30B0", "Beginning of dialog window. Escape will cancel and close the window.": "\u30C0\u30A4\u30A2\u30ED\u30B0\u30DC\u30C3\u30AF\u30B9\u306E\u958B\u59CB\u3002Esc\u30AD\u30FC\u3067\u30AD\u30E3\u30F3\u30BB\u30EB\u3057\u3066\u30A6\u30A3\u30F3\u30C9\u30A6\u3092\u9589\u3058\u307E\u3059\u3002", "End of dialog window.": "\u30C0\u30A4\u30A2\u30ED\u30B0\u30DC\u30C3\u30AF\u30B9\u306E\u7D42\u4E86", "{1} is loading.": "{1}\u306F\u8AAD\u307F\u8FBC\u307F\u4E2D\u3067\u3059\u3002", "Exit Picture-in-Picture": "\u30D4\u30AF\u30C1\u30E3\u30FC\u30A4\u30F3\u30D4\u30AF\u30C1\u30E3\u30FC\u6A5F\u80FD\u306E\u7D42\u4E86", "Picture-in-Picture": "\u30D4\u30AF\u30C1\u30E3\u30FC\u30A4\u30F3\u30D4\u30AF\u30C1\u30E3\u30FC", "No content": "\u30B3\u30F3\u30C6\u30F3\u30C4\u306A\u3057", Color: K2, Opacity: Z2, "Text Background": "\u30C6\u30AD\u30B9\u30C8\u80CC\u666F", "Caption Area Background": "\u30AD\u30E3\u30D7\u30B7\u30E7\u30F3\u9818\u57DF\u80CC\u666F", "Skip forward {1} seconds": "{1}\u79D2\u9032\u3080", "Skip backward {1} seconds": "{1}\u79D2\u623B\u308B" };
});
var Bs = {};
h(Bs, { Background: () => ww, Black: () => fw, Blue: () => Dw, Captions: () => lw, Casual: () => jw, Chapters: () => cw, Close: () => dw, Color: () => Mw, Cyan: () => bw, Depressed: () => Fw, Descriptions: () => uw, Done: () => Rw, Dropshadow: () => Pw, Duration: () => ew, Fullscreen: () => aw, Green: () => hw, LIVE: () => tw, Loaded: () => ow, Magenta: () => yw, Mute: () => sw, None: () => Sw, Opacity: () => zw, Opaque: () => xw, Pause: () => X2, Play: () => J2, Progress: () => nw, Raised: () => Ew, Red: () => gw, Replay: () => Q2, Reset: () => Bw, Script: () => Aw, Subtitles: () => rw, Text: () => pw, Transparent: () => Cw, Uniform: () => Tw, Unmute: () => iw, White: () => mw, Window: () => kw, Yellow: () => vw, default: () => aL });
var J2;
var X2;
var Q2;
var ew;
var tw;
var ow;
var nw;
var aw;
var sw;
var iw;
var rw;
var lw;
var cw;
var uw;
var dw;
var pw;
var mw;
var fw;
var gw;
var hw;
var Dw;
var vw;
var yw;
var bw;
var ww;
var kw;
var Cw;
var xw;
var Sw;
var Ew;
var Fw;
var Tw;
var Pw;
var jw;
var Aw;
var Bw;
var Rw;
var Mw;
var zw;
var aL;
var Rs = p(() => {
  "use strict";
  J2 = "\uC7AC\uC0DD", X2 = "\uC77C\uC2DC\uC911\uC9C0", Q2 = "\uB2E4\uC2DC \uC7AC\uC0DD", ew = "\uC9C0\uC815 \uAE30\uAC04", tw = "\uB77C\uC774\uBE0C", ow = "\uB85C\uB4DC\uB428", nw = "\uC9C4\uD589", aw = "\uC804\uCCB4 \uD654\uBA74", sw = "\uC74C\uC18C\uAC70", iw = "\uC18C\uB9AC \uD65C\uC131\uD654\uD558\uAE30", rw = "\uC11C\uBE0C\uD0C0\uC774\uD2C0", lw = "\uC790\uB9C9", cw = "\uCC55\uD130", uw = "\uC81C\uD488 \uC124\uBA85", dw = "\uB2EB\uAE30", pw = "\uD14D\uC2A4\uD2B8", mw = "\uD654\uC774\uD2B8", fw = "\uBE14\uB799", gw = "\uB808\uB4DC", hw = "\uADF8\uB9B0", Dw = "\uBE14\uB8E8", vw = "\uC610\uB85C\uC6B0", yw = "\uB9C8\uC820\uD0C0", bw = "\uC528\uC5C9", ww = "\uBC30\uACBD", kw = "\uCC3D", Cw = "\uD22C\uBA85", xw = "\uBD88\uD22C\uBA85", Sw = "\uC5C6\uC74C", Ew = "\uAE00\uC790 \uC704\uCE58 \uC62C\uB9BC", Fw = "\uAE00\uC790 \uC704\uCE58 \uB0B4\uB9BC", Tw = "\uADE0\uC77C", Pw = "\uADF8\uB9BC\uC790 \uD6A8\uACFC \uB123\uAE30", jw = "\uCE90\uC8FC\uC5BC", Aw = "\uC2A4\uD06C\uB9BD\uD2B8", Bw = "\uB9AC\uC14B", Rw = "\uC644\uB8CC", Mw = "\uC0C9\uC0C1", zw = "\uD22C\uBA85\uB3C4", aL = { "Audio Player": "\uC624\uB514\uC624 \uD50C\uB808\uC774\uC5B4", "Video Player": "\uBE44\uB514\uC624 \uD50C\uB808\uC774\uC5B4", Play: J2, Pause: X2, Replay: Q2, "Current Time": "\uD604\uC7AC \uC2DC\uAC04", Duration: ew, "Remaining Time": "\uB0A8\uC740 \uC2DC\uAC04", "Stream Type": "\uC2A4\uD2B8\uB9AC\uBC0D \uC720\uD615", LIVE: tw, "Seek to live, currently behind live": "Seek to Live, \uD604\uC7AC \uC0DD\uC911\uACC4\uBCF4\uB2E4 \uB4A4\uCC98\uC9D0", "Seek to live, currently playing live": "Seek to Live, \uD604\uC7AC \uC0DD\uC911\uACC4 \uC2A4\uD2B8\uB9AC\uBC0D \uC911", Loaded: ow, Progress: nw, "Progress Bar": "\uC9C4\uD589 \uD45C\uC2DC\uC904", "progress bar timing: currentTime={1} duration={2}": "{2} \uC911 {1}", Fullscreen: aw, "Exit Fullscreen": "\uC804\uCCB4 \uD654\uBA74 \uD574\uC81C", Mute: sw, Unmute: iw, "Playback Rate": "\uC7AC\uC0DD \uC18D\uB3C4", Subtitles: rw, "subtitles off": "\uC11C\uBE0C\uD0C0\uC774\uD2C0 \uB044\uAE30", Captions: lw, "captions off": "\uC790\uB9C9 \uB044\uAE30", Chapters: cw, Descriptions: uw, "descriptions off": "\uC81C\uD488 \uC124\uBA85 \uB044\uAE30", "Audio Track": "\uC624\uB514\uC624 \uD2B8\uB799", "Volume Level": "\uBCFC\uB968 \uB808\uBCA8", "You aborted the media playback": "\uBE44\uB514\uC624 \uC7AC\uC0DD\uC744 \uCDE8\uC18C\uD588\uC2B5\uB2C8\uB2E4.", "A network error caused the media download to fail part-way.": "\uB124\uD2B8\uC6CC\uD06C \uC624\uB958\uB85C \uC778\uD558\uC5EC \uBE44\uB514\uC624 \uC77C\uBD80\uB97C \uB2E4\uC6B4\uB85C\uB4DC\uD558\uC9C0 \uBABB \uD588\uC2B5\uB2C8\uB2E4.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\uBE44\uB514\uC624\uB97C \uB85C\uB4DC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC11C\uBC84 \uD639\uC740 \uB124\uD2B8\uC6CC\uD06C \uC624\uB958 \uB54C\uBB38\uC774\uAC70\uB098 \uC9C0\uC6D0\uB418\uC9C0 \uC54A\uB294 \uD615\uC2DD \uB54C\uBB38\uC77C \uC218 \uC788\uC2B5\uB2C8\uB2E4.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\uBE44\uB514\uC624 \uC7AC\uC0DD\uC774 \uCDE8\uC18C\uB410\uC2B5\uB2C8\uB2E4. \uBE44\uB514\uC624\uAC00 \uC190\uC0C1\uB418\uC5C8\uAC70\uB098 \uBE44\uB514\uC624\uAC00 \uC0AC\uC6A9\uD558\uB294 \uAE30\uB2A5\uC744 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uAC83 \uAC19\uC2B5\uB2C8\uB2E4.", "No compatible source was found for this media.": "\uBE44\uB514\uC624\uC5D0 \uD638\uD658\uB418\uC9C0 \uC54A\uB294 \uC18C\uC2A4\uAC00 \uC788\uC2B5\uB2C8\uB2E4.", "The media is encrypted and we do not have the keys to decrypt it.": "\uBBF8\uB514\uC5B4\uB294 \uC554\uD638\uD654\uB418\uC5B4 \uC788\uC73C\uBA70 \uC774\uB97C \uD574\uB3C5\uD560 \uD0A4\uB97C \uAC16\uACE0 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", "Play Video": "\uC601\uC0C1 \uC7AC\uC0DD", Close: dw, "Close Modal Dialog": "\uB300\uD654 \uC0C1\uC790 \uB2EB\uAE30", "Modal Window": "\uBAA8\uB2EC \uCC3D", "This is a modal window": "\uBAA8\uB2EC \uCC3D\uC785\uB2C8\uB2E4", "This modal can be closed by pressing the Escape key or activating the close button.": "\uC774 \uBAA8\uB2EC\uC740 Esc \uD0A4\uB97C \uB204\uB974\uAC70\uB098 \uB2EB\uAE30 \uBC84\uD2BC\uC744 \uD65C\uC131\uD654\uD558\uC5EC \uB2EB\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", ", opens captions settings dialog": ", \uCEA1\uC158 \uC124\uC815 \uB300\uD654 \uC0C1\uC790\uAC00 \uC5F4\uB9BD\uB2C8\uB2E4", ", opens subtitles settings dialog": ", \uC790\uB9C9 \uC124\uC815 \uB300\uD654 \uC0C1\uC790\uAC00 \uC5F4\uB9BD\uB2C8\uB2E4", ", opens descriptions settings dialog": ", \uC124\uBA85 \uC124\uC815 \uB300\uD654 \uC0C1\uC790\uAC00 \uC5F4\uB9BD\uB2C8\uB2E4", ", selected": ", \uC120\uD0DD\uB428", "captions settings": "\uCEA1\uC158 \uC124\uC815", "subtitles settings": "\uC790\uB9C9 \uC124\uC815", "descriptions settings": "\uC124\uBA85 \uC124\uC815", Text: pw, White: mw, Black: fw, Red: gw, Green: hw, Blue: Dw, Yellow: vw, Magenta: yw, Cyan: bw, Background: ww, Window: kw, Transparent: Cw, "Semi-Transparent": "\uBC18\uD22C\uBA85", Opaque: xw, "Font Size": "\uD3F0\uD2B8 \uD06C\uAE30", "Text Edge Style": "\uD14D\uC2A4\uD2B8 \uAC00\uC7A5\uC790\uB9AC \uC2A4\uD0C0\uC77C", None: Sw, Raised: Ew, Depressed: Fw, Uniform: Tw, Dropshadow: Pw, "Font Family": "\uD3F0\uD2B8 \uBAA8\uC74C", "Proportional Sans-Serif": "\uBE44\uB840 \uC0B0\uC138\uB9AC\uD504\uCCB4", "Monospace Sans-Serif": "\uACE0\uC815\uD3ED \uC0B0\uC138\uB9AC\uD504\uCCB4", "Proportional Serif": "\uBE44\uB840 \uC138\uB9AC\uD504\uCCB4", "Monospace Serif": "\uACE0\uC815\uD3ED \uC138\uB9AC\uD504\uCCB4", Casual: jw, Script: Aw, "Small Caps": "\uC18C\uBB38\uC790", Reset: Bw, "restore all settings to the default values": "\uBAA8\uB4E0 \uC124\uC815\uC744 \uAE30\uBCF8\uAC12\uC73C\uB85C \uBCF5\uC6D0", Done: Rw, "Caption Settings Dialog": "\uCEA1\uC158 \uC124\uC815 \uB300\uD654 \uC0C1\uC790", "Beginning of dialog window. Escape will cancel and close the window.": "\uB300\uD654\uCC3D \uC2DC\uC791. Esc \uD0A4\uB97C \uB204\uB974\uBA74 \uCDE8\uC18C\uB418\uACE0 \uCC3D\uC774 \uB2EB\uD799\uB2C8\uB2E4.", "End of dialog window.": "\uB300\uD654\uCC3D \uC885\uB8CC", "{1} is loading.": "{1}\uC774(\uAC00) \uB85C\uB529 \uC911\uC785\uB2C8\uB2E4.", "Exit Picture-in-Picture": "Picture-in-Picture \uC885\uB8CC", "Picture-in-Picture": "Picture-in-Picture", "No content": "\uCF58\uD150\uCE20 \uC5C6\uC74C", Color: Mw, Opacity: zw, "Text Background": "\uD14D\uC2A4\uD2B8 \uBC30\uACBD", "Caption Area Background": "\uC790\uB9C9 \uBC30\uACBD" };
});
var Ms = {};
h(Ms, { Background: () => ik, Black: () => Qw, Blue: () => ok, Captions: () => Gw, Casual: () => gk, Chapters: () => Yw, Close: () => Zw, Cyan: () => sk, Depressed: () => pk, Descriptions: () => Kw, Done: () => vk, Dropshadow: () => fk, Duration: () => Iw, Fullscreen: () => Vw, Green: () => tk, LIVE: () => $w, Loaded: () => Ow, Magenta: () => ak, Mute: () => Ww, None: () => uk, Opaque: () => ck, Pause: () => Lw, Play: () => _w, Progress: () => Uw, Raised: () => dk, Red: () => ek, Replay: () => Nw, Reset: () => Dk, Script: () => hk, Subtitles: () => Hw, Text: () => Jw, Transparent: () => lk, Uniform: () => mk, Unmute: () => qw, White: () => Xw, Window: () => rk, Yellow: () => nk, default: () => sL });
var _w;
var Lw;
var Nw;
var Iw;
var $w;
var Ow;
var Uw;
var Vw;
var Ww;
var qw;
var Hw;
var Gw;
var Yw;
var Kw;
var Zw;
var Jw;
var Xw;
var Qw;
var ek;
var tk;
var ok;
var nk;
var ak;
var sk;
var ik;
var rk;
var lk;
var ck;
var uk;
var dk;
var pk;
var mk;
var fk;
var gk;
var hk;
var Dk;
var vk;
var sL;
var zs = p(() => {
  "use strict";
  _w = "Atska\u0146ot", Lw = "Pauz\u0113t", Nw = "Atk\u0101rtot", Iw = "Ilgums", $w = "LIVE", Ow = "Iel\u0101d\u0113ts", Uw = "Progress", Vw = "Pilnekr\u0101na re\u017E\u012Bms", Ww = "Izsl\u0113gt ska\u0146u", qw = "Iesl\u0113gt ska\u0146u", Hw = "Subtitri", Gw = "Paraksti", Yw = "Temati", Kw = "Apraksti", Zw = "Aizv\u0113rt", Jw = "Teksts", Xw = "Balts", Qw = "Melns", ek = "Sarkans", tk = "Za\u013C\u0161", ok = "Zils", nk = "Dzeltens", ak = "Purpursarkana", sk = "Ci\u0101na", ik = "Fons", rk = "Logs", lk = "Caursp\u012Bd\u012Bgs", ck = "Necaursp\u012Bd\u012Bgs", uk = "Neviens", dk = "Izvirz\u012Bts", pk = "Samazin\u0101ts", mk = "Vienm\u0113r\u012Bgs", fk = "\u0112nots", gk = "Casual", hk = "Script", Dk = "Atiestat\u012Bt", vk = "Gatavs", sL = { "Audio Player": "Audio atska\u0146ot\u0101js", "Video Player": "Video atska\u0146ot\u0101js", Play: _w, Pause: Lw, Replay: Nw, "Current Time": "Eso\u0161ais laiks", Duration: Iw, "Remaining Time": "Atliku\u0161ais laiks", "Stream Type": "Straumes veids", LIVE: $w, "Seek to live, currently behind live": "P\u0101riet uz tie\u0161raidi", "Seek to live, currently playing live": "P\u0101riet uz tie\u0161raidi", Loaded: Ow, Progress: Uw, "Progress Bar": "Progresa josla", "progress bar timing: currentTime={1} duration={2}": "{1} no {2}", Fullscreen: Vw, "Exit Fullscreen": "Iziet no pilnekr\u0101na re\u017E\u012Bma", Mute: Ww, Unmute: qw, "Playback Rate": "Atska\u0146o\u0161anas \u0101trums", Subtitles: Hw, "subtitles off": "Izsl\u0113gt subtitrus", Captions: Gw, "captions off": "Izsl\u0113gt parakstus", Chapters: Yw, Descriptions: Kw, "descriptions off": "Izsl\u0113gt aprakstus", "Audio Track": "Audio celi\u0146\u0161", "Volume Level": "Ska\u013Cums", "You aborted the media playback": "Atska\u0146o\u0161ana atcelta", "A network error caused the media download to fail part-way.": "T\u012Bkla k\u013C\u016Bdas d\u0113\u013C, multivides lejupiel\u0101de neizdev\u0101s.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Neizdev\u0101s iel\u0101d\u0113t multividi, iesp\u0113jams severa, vai t\u012Bkla k\u013C\u016Bmes d\u0113\u013C, vai neatbalst\u012Bta form\u0101ta d\u0113\u013C.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Atska\u0146o\u0161ana tika p\u0101rtraukta t\u012Bkla k\u013C\u016Bmes d\u0113\u013C vai p\u0101rl\u016Bkprogrammas iesp\u0113ju tr\u016Bkuma d\u0113\u013C.", "No compatible source was found for this media.": "Netika atrasts atbilsto\u0161s multivides avots.", "The media is encrypted and we do not have the keys to decrypt it.": "Multividi nevar atska\u0146ot, jo tas ir kript\u0113ts un nav pieejama dekript\u0113\u0161anas atsl\u0113ga.", "Play Video": "Atska\u0146ot video", Close: Zw, "Close Modal Dialog": "Aizv\u0113rt logu", "Modal Window": "Logs", "This is a modal window": "Logs", "This modal can be closed by pressing the Escape key or activating the close button.": "\u0160o logu var aizv\u0113rt, nospie\u017Eot uz aizv\u0113r\u0161anas pogas vai tausti\u0146a ESC.", ", opens captions settings dialog": ", atv\u0113rs parakstu logu", ", opens subtitles settings dialog": ", atv\u0113rs subtitru logu", ", opens descriptions settings dialog": ", atv\u0113rs aprakstu logu", ", selected": ", izv\u0113l\u0113ts", "captions settings": "parakstu iestat\u012Bjumi", "subtitles settings": "subtitru iestat\u012Bjumi", "descriptions settings": "aprakstu iestat\u012Bjumi", Text: Jw, White: Xw, Black: Qw, Red: ek, Green: tk, Blue: ok, Yellow: nk, Magenta: ak, Cyan: sk, Background: ik, Window: rk, Transparent: lk, "Semi-Transparent": "Da\u013C\u0113ji caursp\u012Bd\u012Bgs", Opaque: ck, "Font Size": "\u0160rifta izm\u0113rs", "Text Edge Style": "Teksta \u0113nas stils", None: uk, Raised: dk, Depressed: pk, Uniform: mk, Dropshadow: fk, "Font Family": "\u0160rifts", "Proportional Sans-Serif": "Proportional Sans-Serif", "Monospace Sans-Serif": "Monospace Sans-Serif", "Proportional Serif": "Proportional Serif", "Monospace Serif": "Monospace Serif", Casual: gk, Script: hk, "Small Caps": "Small Caps", Reset: Dk, "restore all settings to the default values": "atiestat\u012Bt iestat\u012Bjumu uz noklus\u0113jumu", Done: vk, "Caption Settings Dialog": "Parakstu iestat\u012Bjumi", "Beginning of dialog window. Escape will cancel and close the window.": "Paraksta iestat\u012Bjumu s\u0101kums. Lai aizv\u0113rtu, spiediet ESC tausti\u0146u.", "End of dialog window.": "Parakstu iestat\u012Bjumu loga beigas", "{1} is loading.": "{1} iel\u0101d\u0113.", "Exit Picture-in-Picture": "Iziet no Att\u0113ls att\u0113l\u0101", "Picture-in-Picture": "Att\u0113ls att\u0113l\u0101", "Skip forward {1} seconds": "P\u0101rt\u012Bt uz priek\u0161u {1} sekundes", "Skip backward {1} seconds": "P\u0101rt\u012Bt atpaka\u013C {1} sekundes" };
});
var _s = {};
h(_s, { Background: () => Vk, Black: () => _k, Blue: () => Ik, Captions: () => jk, Casual: () => Xk, Chapters: () => Ak, Close: () => Rk, Cyan: () => Uk, Depressed: () => Kk, Descriptions: () => Bk, Done: () => t3, Dropshadow: () => Jk, Duration: () => kk, Fullscreen: () => Ek, Green: () => Nk, LIVE: () => Ck, Loaded: () => xk, Magenta: () => Ok, Mute: () => Fk, None: () => Gk, Opaque: () => Hk, Pause: () => bk, Play: () => yk, Progress: () => Sk, Raised: () => Yk, Red: () => Lk, Replay: () => wk, Reset: () => e3, Script: () => Qk, Subtitles: () => Pk, Text: () => Mk, Transparent: () => qk, Uniform: () => Zk, Unmute: () => Tk, White: () => zk, Window: () => Wk, Yellow: () => $k, default: () => iL });
var yk;
var bk;
var wk;
var kk;
var Ck;
var xk;
var Sk;
var Ek;
var Fk;
var Tk;
var Pk;
var jk;
var Ak;
var Bk;
var Rk;
var Mk;
var zk;
var _k;
var Lk;
var Nk;
var Ik;
var $k;
var Ok;
var Uk;
var Vk;
var Wk;
var qk;
var Hk;
var Gk;
var Yk;
var Kk;
var Zk;
var Jk;
var Xk;
var Qk;
var e3;
var t3;
var iL;
var Ls = p(() => {
  "use strict";
  yk = "Spill", bk = "Pause", wk = "Spill om igjen", kk = "Varighet", Ck = "DIREKTE", xk = "Lastet inn", Sk = "Framdrift", Ek = "Fullskjerm", Fk = "Lyd av", Tk = "Lyd p\xE5", Pk = "Teksting p\xE5", jk = "Teksting for h\xF8rselshemmede p\xE5", Ak = "Kapitler", Bk = "Beskrivelser", Rk = "Lukk", Mk = "Tekst", zk = "Hvit", _k = "Svart", Lk = "R\xF8d", Nk = "Gr\xF8nn", Ik = "Bl\xE5", $k = "Gul", Ok = "Magenta", Uk = "Turkis", Vk = "Bakgrunn", Wk = "Vindu", qk = "Gjennomsiktig", Hk = "Ugjennomsiktig", Gk = "Ingen", Yk = "Uthevet", Kk = "Nedtrykt", Zk = "Enkel", Jk = "Skygge", Xk = "Uformell", Qk = "Skr\xE5skrift", e3 = "Tilbakestill", t3 = "Ferdig", iL = { "Audio Player": "Lydspiller", "Video Player": "Videospiller", Play: yk, Pause: bk, Replay: wk, "Current Time": "Aktuell tid", Duration: kk, "Remaining Time": "Gjenst\xE5ende tid", "Stream Type": "Type str\xF8m", LIVE: Ck, "Seek to live, currently behind live": "Hopp til live, spiller tidligere i sendingen n\xE5", "Seek to live, currently playing live": "Hopp til live, spiller live n\xE5", Loaded: xk, Progress: Sk, "Progress Bar": "Framdriftsviser", "progress bar timing: currentTime={1} duration={2}": "{1} av {2}", Fullscreen: Ek, "Exit Fullscreen": "Lukk fullskjerm", Mute: Fk, Unmute: Tk, "Playback Rate": "Avspillingshastighet", Subtitles: Pk, "subtitles off": "Teksting av", Captions: jk, "captions off": "Teksting for h\xF8rselshemmede av", Chapters: Ak, Descriptions: Bk, "descriptions off": "beskrivelser av", "Audio Track": "Lydspor", "Volume Level": "Volumniv\xE5", "You aborted the media playback": "Du avbr\xF8t avspillingen.", "A network error caused the media download to fail part-way.": "En nettverksfeil avbr\xF8t nedlasting av videoen.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Videoen kunne ikke lastes ned, p\xE5 grunn av nettverksfeil eller serverfeil, eller fordi formatet ikke er st\xF8ttet.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Videoavspillingen ble avbrudt p\xE5 grunn av \xF8delagte data eller fordi videoen ville gj\xF8re noe som nettleseren din ikke har st\xF8tte for.", "No compatible source was found for this media.": "Fant ikke en kompatibel kilde for dette mediainnholdet.", "The media is encrypted and we do not have the keys to decrypt it.": "Mediefilen er kryptert og vi mangler n\xF8kler for \xE5 dekryptere den.", "Play Video": "Spill av video", Close: Rk, "Close Modal Dialog": "Lukk dialogvinduet", "Modal Window": "Dialogvindu", "This is a modal window": "Dette er et dialogvindu", "This modal can be closed by pressing the Escape key or activating the close button.": "Vinduet kan lukkes ved \xE5 trykke p\xE5 Escape-tasten eller lukkeknappen.", ", opens captions settings dialog": ", \xE5pner innstillinger for teksting for h\xF8rselshemmede", ", opens subtitles settings dialog": ", \xE5pner innstillinger for teksting", ", opens descriptions settings dialog": ", \xE5pner innstillinger for beskrivelser", ", selected": ", valgt", "captions settings": "innstillinger for teksting", "subtitles settings": "innstillinger for teksting", "descriptions settings": "innstillinger for beskrivelser", Text: Mk, White: zk, Black: _k, Red: Lk, Green: Nk, Blue: Ik, Yellow: $k, Magenta: Ok, Cyan: Uk, Background: Vk, Window: Wk, Transparent: qk, "Semi-Transparent": "Delvis gjennomsiktig", Opaque: Hk, "Font Size": "Tekstst\xF8rrelse", "Text Edge Style": "Tekstkant", None: Gk, Raised: Yk, Depressed: Kk, Uniform: Zk, Dropshadow: Jk, "Font Family": "Skrifttype", "Proportional Sans-Serif": "Proporsjonal skrift uten seriffer", "Monospace Sans-Serif": "Fastbreddeskrift uten seriffer", "Proportional Serif": "Proporsjonal skrift med seriffer", "Monospace Serif": "Fastbreddeskrift med seriffer", Casual: Xk, Script: Qk, "Small Caps": "Kapit\xE9ler", Reset: e3, "restore all settings to the default values": "tilbakestill alle innstillinger til standardverdiene", Done: t3, "Caption Settings Dialog": "Innstillingsvindu for teksting for h\xF8rselshemmede", "Beginning of dialog window. Escape will cancel and close the window.": "Begynnelse p\xE5 dialogvindu. Trykk Escape for \xE5 avbryte og lukke vinduet.", "End of dialog window.": "Avslutning p\xE5 dialogvindu.", "{1} is loading.": "{1} laster." };
});
var Ns = {};
h(Ns, { Background: () => E3, Black: () => y3, Blue: () => k3, Captions: () => m3, Casual: () => z3, Chapters: () => f3, Close: () => h3, Color: () => I3, Cyan: () => S3, Depressed: () => B3, Descriptions: () => g3, Done: () => N3, Dropshadow: () => M3, Duration: () => s3, Fullscreen: () => c3, Green: () => w3, LIVE: () => i3, Loaded: () => r3, Magenta: () => x3, Mute: () => u3, None: () => j3, Opacity: () => $3, Opaque: () => P3, Pause: () => n3, Play: () => o3, Progress: () => l3, Raised: () => A3, Red: () => b3, Replay: () => a3, Reset: () => L3, Script: () => _3, Subtitles: () => p3, Text: () => D3, Transparent: () => T3, Uniform: () => R3, Unmute: () => d3, White: () => v3, Window: () => F3, Yellow: () => C3, default: () => rL });
var o3;
var n3;
var a3;
var s3;
var i3;
var r3;
var l3;
var c3;
var u3;
var d3;
var p3;
var m3;
var f3;
var g3;
var h3;
var D3;
var v3;
var y3;
var b3;
var w3;
var k3;
var C3;
var x3;
var S3;
var E3;
var F3;
var T3;
var P3;
var j3;
var A3;
var B3;
var R3;
var M3;
var z3;
var _3;
var L3;
var N3;
var I3;
var $3;
var rL;
var Is = p(() => {
  "use strict";
  o3 = "Afspelen", n3 = "Pauzeren", a3 = "Opnieuw afspelen", s3 = "Tijdsduur", i3 = "LIVE", r3 = "Geladen", l3 = "Voortgang", c3 = "Volledig scherm", u3 = "Dempen", d3 = "Dempen uit", p3 = "Ondertiteling", m3 = "Ondertiteling (CC)", f3 = "Hoofdstukken", g3 = "Beschrijvingen", h3 = "Sluiten", D3 = "Tekst", v3 = "Wit", y3 = "Zwart", b3 = "Rood", w3 = "Groen", k3 = "Blauw", C3 = "Geel", x3 = "Magenta", S3 = "Cyaan", E3 = "Achtergrond", F3 = "Venster", T3 = "Transparant", P3 = "Ondoorzichtig", j3 = "Geen", A3 = "Verhoogd", B3 = "Ingedrukt", R3 = "Uniform", M3 = "Schaduw", z3 = "Informeel", _3 = "Script", L3 = "Herstellen", N3 = "Gereed", I3 = "Kleur", $3 = "Transparantie", rL = { "Audio Player": "Audiospeler", "Video Player": "Videospeler", Play: o3, Pause: n3, Replay: a3, "Current Time": "Huidige tijd", Duration: s3, "Remaining Time": "Resterende tijd", "Stream Type": "Streamtype", LIVE: i3, "Seek to live, currently behind live": "Zoek naar live, momenteel achter op live", "Seek to live, currently playing live": "Zoek naar live, momenteel live", Loaded: r3, Progress: l3, "Progress Bar": "Voortgangsbalk", "progress bar timing: currentTime={1} duration={2}": "{1} van {2}", Fullscreen: c3, "Exit Fullscreen": "Volledig scherm uit", Mute: u3, Unmute: d3, "Playback Rate": "Afspeelsnelheid", Subtitles: p3, "subtitles off": "ondertiteling uit", Captions: m3, "captions off": "ondertiteling (CC) uit", Chapters: f3, Descriptions: g3, "descriptions off": "beschrijvingen uit", "Audio Track": "Audiospoor", "Volume Level": "Volume", "You aborted the media playback": "U heeft het afspelen van de media afgebroken", "A network error caused the media download to fail part-way.": "Een netwerkfout heeft ervoor gezorgd dat het downloaden van de media is mislukt.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "De media kon niet worden geladen, doordat de server of het netwerk faalde of doordat het formaat niet wordt ondersteund.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Het afspelen van de media werd afgebroken vanwege een corruptieprobleem of omdat de uw browser de gebruikte mediafuncties niet ondersteund.", "No compatible source was found for this media.": "Er is geen geschikte bron gevonden voor dit medium.", "The media is encrypted and we do not have the keys to decrypt it.": "De media is gecodeerd en we hebben niet de sleutels om het te decoderen.", "Play Video": "Video afspelen", Close: h3, "Close Modal Dialog": "Extra venster sluiten", "Modal Window": "Extra venster", "This is a modal window": "Dit is een extra venster", "This modal can be closed by pressing the Escape key or activating the close button.": "Dit venster kan worden gesloten door op de Escape-toets te drukken of door de sluit-knop te activeren.", ", opens captions settings dialog": ", opent instellingen venster voor ondertitelingen", ", opens subtitles settings dialog": ", opent instellingen venster voor ondertitelingen", ", opens descriptions settings dialog": ", opent instellingen venster voor beschrijvingen", ", selected": ", geselecteerd", "captions settings": "ondertiteling instellingen", "subtitles settings": "ondertiteling instellingen", "descriptions settings": "beschrijvingen instellingen", Text: D3, White: v3, Black: y3, Red: b3, Green: w3, Blue: k3, Yellow: C3, Magenta: x3, Cyan: S3, Background: E3, Window: F3, Transparent: T3, "Semi-Transparent": "Semi-transparant", Opaque: P3, "Font Size": "Lettergrootte", "Text Edge Style": "Stijl tekstrand", None: j3, Raised: A3, Depressed: B3, Uniform: R3, Dropshadow: M3, "Font Family": "Lettertype", "Proportional Sans-Serif": "Proportioneel sans-serif", "Monospace Sans-Serif": "Monospace sans-serif", "Proportional Serif": "Proportioneel serif", "Monospace Serif": "Monospace serif", Casual: z3, Script: _3, "Small Caps": "Kleine Hoofdletters", Reset: L3, "restore all settings to the default values": "alle instellingen herstellen naar de standaardwaarden", Done: N3, "Caption Settings Dialog": "Venster voor bijschriften-instellingen", "Beginning of dialog window. Escape will cancel and close the window.": "Begin van dialoogvenster. Escape zal annuleren en het venster sluiten.", "End of dialog window.": "Einde van dialoogvenster.", "{1} is loading.": "{1} wordt geladen.", "Exit Picture-in-Picture": "Picture-in-Picture uit", "Picture-in-Picture": "Picture-in-Picture", "No content": "Geen inhoud", Color: I3, Opacity: $3, "Text Background": "Tekst Achtergrond", "Caption Area Background": "Achtergrond voor Ondertiteling", "Skip forward {1} seconds": "{1} seconden vooruit", "Skip backward {1} seconds": "{1} seconden terug" };
});
var $s = {};
h($s, { Background: () => dC, Black: () => aC, Blue: () => rC, Captions: () => X3, Casual: () => bC, Chapters: () => Q3, Close: () => tC, Cyan: () => uC, Depressed: () => DC, Descriptions: () => eC, Done: () => CC, Dropshadow: () => yC, Duration: () => W3, Fullscreen: () => Y3, Green: () => iC, LIVE: () => q3, Loaded: () => H3, Magenta: () => cC, Mute: () => K3, None: () => gC, Opaque: () => fC, Pause: () => U3, Play: () => O3, Progress: () => G3, Raised: () => hC, Red: () => sC, Replay: () => V3, Reset: () => kC, Script: () => wC, Subtitles: () => J3, Text: () => oC, Transparent: () => mC, Uniform: () => vC, Unmute: () => Z3, White: () => nC, Window: () => pC, Yellow: () => lC, default: () => lL });
var O3;
var U3;
var V3;
var W3;
var q3;
var H3;
var G3;
var Y3;
var K3;
var Z3;
var J3;
var X3;
var Q3;
var eC;
var tC;
var oC;
var nC;
var aC;
var sC;
var iC;
var rC;
var lC;
var cC;
var uC;
var dC;
var pC;
var mC;
var fC;
var gC;
var hC;
var DC;
var vC;
var yC;
var bC;
var wC;
var kC;
var CC;
var lL;
var Os = p(() => {
  "use strict";
  O3 = "Spel", U3 = "Pause", V3 = "Spel om att", W3 = "Varigheit", q3 = "DIREKTE", H3 = "Lasta inn", G3 = "Framdrift", Y3 = "Fullskjerm", K3 = "Lyd av", Z3 = "Lyd p\xE5", J3 = "Teksting p\xE5", X3 = "Teksting for h\xF8yrselshemma p\xE5", Q3 = "Kapitel", eC = "Beskrivingar", tC = "Lukk", oC = "Tekst", nC = "Kvit", aC = "Svart", sC = "Raud", iC = "Gr\xF8n", rC = "Bl\xE5", lC = "Gul", cC = "Magenta", uC = "Turkis", dC = "Bakgrunn", pC = "Vindauge", mC = "Gjennomsiktig", fC = "Ugjennomsiktig", gC = "Ingen", hC = "Utheva", DC = "Nedtrykt", vC = "Enkel", yC = "Skugge", bC = "Uformell", wC = "Skr\xE5skrift", kC = "Tilbakestell", CC = "Ferdig", lL = { "Audio Player": "Lydspelar", "Video Player": "Videospelar", Play: O3, Pause: U3, Replay: V3, "Current Time": "Aktuell tid", Duration: W3, "Remaining Time": "Tid attende", "Stream Type": "Type straum", LIVE: q3, "Seek to live, currently behind live": "Hopp til live, spelar tidlegare i sendinga no", "Seek to live, currently playing live": "Hopp til live, speler live no", Loaded: H3, Progress: G3, "Progress Bar": "Framdriftsvisar", "progress bar timing: currentTime={1} duration={2}": "{1} av {2}", Fullscreen: Y3, "Exit Fullscreen": "Stenga fullskjerm", Mute: K3, Unmute: Z3, "Playback Rate": "Avspelingshastigheit", Subtitles: J3, "subtitles off": "Teksting av", Captions: X3, "captions off": "Teksting for h\xF8yrselshemma av", Chapters: Q3, Descriptions: eC, "descriptions off": "beskrivingar av", "Audio Track": "Lydspor", "Volume Level": "Volumniv\xE5", "You aborted the media playback": "Du avbraut avspelinga.", "A network error caused the media download to fail part-way.": "Ein nettverksfeil avbraut nedlasting av videoen.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Videoen kunne ikkje lastas ned, p\xE5 grunn av ein nettverksfeil eller serverfeil, eller av di formatet ikkje er stoda.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Videoavspelinga blei broten p\xE5 grunn av \xF8ydelagde data eller av di videoen ville gjera noe som nettlesaren din ikkje stodar.", "No compatible source was found for this media.": "Fant ikke en kompatibel kilde for dette mediainnholdet.", "The media is encrypted and we do not have the keys to decrypt it.": "Mediefila er kryptert og vi manglar nyklar for \xE5 dekryptere ho.", "Play Video": "Spel av video", Close: tC, "Close Modal Dialog": "Lukk dialogvindauge", "Modal Window": "Dialogvindauge", "This is a modal window": "Dette er eit dialogvindauge", "This modal can be closed by pressing the Escape key or activating the close button.": "Vindauget kan lukkast ved \xE5 trykke p\xE5 Escape-tasten eller lukkeknappen.", ", opens captions settings dialog": ", opnar innstillingar for teksting for h\xF8yrselshemma", ", opens subtitles settings dialog": ", opnar innstillingar for teksting", ", opens descriptions settings dialog": ", opnar innstillingar for beskrivingar", ", selected": ", vald", "captions settings": "innstillingar for teksting", "subtitles settings": "innstillingar for teksting", "descriptions settings": "innstillingar for skildringar", Text: oC, White: nC, Black: aC, Red: sC, Green: iC, Blue: rC, Yellow: lC, Magenta: cC, Cyan: uC, Background: dC, Window: pC, Transparent: mC, "Semi-Transparent": "Delvis gjennomsiktig", Opaque: fC, "Font Size": "Tekststorleik", "Text Edge Style": "Tekstkant", None: gC, Raised: hC, Depressed: DC, Uniform: vC, Dropshadow: yC, "Font Family": "Skrifttype", "Proportional Sans-Serif": "Proporsjonal skrift utan seriffar", "Monospace Sans-Serif": "Fastbreddeskrift utan seriffar", "Proportional Serif": "Proporsjonal skrift med seriffar", "Monospace Serif": "Fastbreddeskrift med seriffar", Casual: bC, Script: wC, "Small Caps": "Kapit\xE9ler", Reset: kC, "restore all settings to the default values": "tilbakestell alle innstillingar til standardverdiane", Done: CC, "Caption Settings Dialog": "Innstillingsvindauge for teksting for h\xF8yrselshemma", "Beginning of dialog window. Escape will cancel and close the window.": "Byrjing p\xE5 dialogvindauge. Trykk Escape for \xE5 avbryte og lukke vindauget.", "End of dialog window.": "Avslutning p\xE5 dialogvindauge.", "{1} is loading.": "{1} lastar." };
});
var Us = {};
h(Us, { Background: () => YC, Black: () => OC, Blue: () => WC, Captions: () => zC, Casual: () => nx, Chapters: () => _C, Close: () => NC, Cyan: () => GC, Depressed: () => ex, Descriptions: () => LC, Done: () => ix, Dropshadow: () => ox, Duration: () => FC, Fullscreen: () => AC, Green: () => VC, LIVE: () => TC, Loaded: () => PC, Magenta: () => HC, Mute: () => BC, None: () => XC, Opaque: () => JC, Pause: () => SC, Play: () => xC, Progress: () => jC, Raised: () => QC, Red: () => UC, Replay: () => EC, Reset: () => sx, Script: () => ax, Subtitles: () => MC, Text: () => IC, Transparent: () => ZC, Uniform: () => tx, Unmute: () => RC, White: () => $C, Window: () => KC, Yellow: () => qC, default: () => cL });
var xC;
var SC;
var EC;
var FC;
var TC;
var PC;
var jC;
var AC;
var BC;
var RC;
var MC;
var zC;
var _C;
var LC;
var NC;
var IC;
var $C;
var OC;
var UC;
var VC;
var WC;
var qC;
var HC;
var GC;
var YC;
var KC;
var ZC;
var JC;
var XC;
var QC;
var ex;
var tx;
var ox;
var nx;
var ax;
var sx;
var ix;
var cL;
var Vs = p(() => {
  "use strict";
  xC = "Lectura", SC = "Pausa", EC = "Tornar legir", FC = "Durada", TC = "DIR\xC8CTE", PC = "Cargat", jC = "Progression", AC = "Ecran compl\xE8t", BC = "Copar lo son", RC = "Restablir lo son", MC = "Sost\xEDtols", zC = "Legendas", _C = "Cap\xEDtols", LC = "Descripcions", NC = "Tampar", IC = "T\xE8xte", $C = "Blanc", OC = "Negre", UC = "Roge", VC = "Verd", WC = "Blau", qC = "Jaune", HC = "Magenta", GC = "Cian", YC = "R\xE8ireplan", KC = "Fen\xE8stra", ZC = "Transparent", JC = "Opac", XC = "Cap", QC = "Naut", ex = "Enfonsat", tx = "Unif\xF2rme", ox = "Ombrat", nx = "Manuscrita", ax = "Script", sx = "Re\xEFnicializar", ix = "Acabat", cL = { "Audio Player": "Lector \xE0udio", "Video Player": "Lector vid\xE8o", Play: xC, Pause: SC, Replay: EC, "Current Time": "Durada passada", Duration: FC, "Remaining Time": "Temps restant", "Stream Type": "Tipe de difusion", LIVE: TC, "Seek to live, currently behind live": "Trapar lo dir\xE8cte, actualament darri\xE8r lo dir\xE8cte", "Seek to live, currently playing live": "Trapar lo dir\xE8cte, actualament lo dir\xE8cte es en lectura", Loaded: PC, Progress: jC, "Progress Bar": "Barra de progression", "progress bar timing: currentTime={1} duration={2}": "{1} sus {2}", Fullscreen: AC, "Exit Fullscreen": "Pas en ecran compl\xE8t", Mute: BC, Unmute: RC, "Playback Rate": "Velocitat de lectura", Subtitles: MC, "subtitles off": "Sost\xEDtols desactivats", Captions: zC, "captions off": "Legendas desactivadas", Chapters: _C, Descriptions: LC, "descriptions off": "descripcions desactivadas", "Audio Track": "Pista \xE0udio", "Volume Level": "Niv\xE8l del volum", "You aborted the media playback": "Av\xE8tz copat la lectura del m\xE8dia.", "A network error caused the media download to fail part-way.": "Una error de ret a provocat un frac\xE0s del telecargament.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Lo m\xE8dia a pas pogut \xE8sser cargat, si\xE1 perque lo servidor o lo ret a fracassat si\xE1 perque lo format es pas compatible.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "La lectura del m\xE8dia es copada a causa d\u2019un probl\xE8ma de corrupcion o perque lo m\xE8dia utiliza de foncionalitats pas suportadas pel navigador.", "No compatible source was found for this media.": "Cap de font compatiblas pas trobada per aqueste m\xE8dia.", "The media is encrypted and we do not have the keys to decrypt it.": "Lo m\xE8dia es chifrat e av\xE8m pas las claus per lo deschifrar.", "Play Video": "Legir la vid\xE8o", Close: NC, "Close Modal Dialog": "Tampar la fen\xE8stra", "Modal Window": "Fen\xE8stra", "This is a modal window": "Aqu\xF2 es una fen\xE8stra", "This modal can be closed by pressing the Escape key or activating the close button.": "Aquesta fen\xE8stra p\xF2t \xE8sser tampada en quichar Escapar sul clavi\xE8r o en activar lo boton de tampadura.", ", opens captions settings dialog": ", dobr\xEDs la fen\xE8stra de param\xE8tres de legendas", ", opens subtitles settings dialog": ", dobr\xEDs la fen\xE8stra de param\xE8tres de sost\xEDtols", ", opens descriptions settings dialog": ", dobr\xEDs la fen\xE8stra de param\xE8tres de descripcions", ", selected": ", seleccionat", "captions settings": "param\xE8tres de legendas", "subtitles settings": "param\xE8tres de sost\xEDtols", "descriptions settings": "param\xE8tres de descripcions", Text: IC, White: $C, Black: OC, Red: UC, Green: VC, Blue: WC, Yellow: qC, Magenta: HC, Cyan: GC, Background: YC, Window: KC, Transparent: ZC, "Semi-Transparent": "Semitransparent", Opaque: JC, "Font Size": "Talha de la polissa", "Text Edge Style": "Estil dels contorns del t\xE8xte", None: XC, Raised: QC, Depressed: ex, Uniform: tx, Dropshadow: ox, "Font Family": "Familha de polissa", "Proportional Sans-Serif": "Sans-Serif proporcionala", "Monospace Sans-Serif": "Monospace Sans-Serif", "Proportional Serif": "Serif proporcionala", "Monospace Serif": "Serif proporcionala", Casual: nx, Script: ax, "Small Caps": "Pichonas majusculas", Reset: sx, "restore all settings to the default values": "O restablir tot a las valors per defaut", Done: ix, "Caption Settings Dialog": "Fen\xE8stra de param\xE8tres de legenda", "Beginning of dialog window. Escape will cancel and close the window.": "Debuta de la fen\xE8stra. Escapar anullar\xE0 e tampar\xE0 la fen\xE8stra", "End of dialog window.": "Fin de la fen\xE8stra.", "{1} is loading.": "{1} es a cargar.", "Exit Picture-in-Picture": "Sortir de la vid\xE8o incrustada", "Picture-in-Picture": "Vid\xE8o incrustada", "No content": "Cap de contengut" };
});
var Ws = {};
h(Ws, { Background: () => Ax, Black: () => xx, Blue: () => Fx, Captions: () => vx, Casual: () => $x, Chapters: () => yx, Close: () => wx, Cyan: () => jx, Depressed: () => Lx, Descriptions: () => bx, Done: () => Vx, Dropshadow: () => Ix, Duration: () => ux, Fullscreen: () => fx, Green: () => Ex, LIVE: () => dx, Loaded: () => px, Magenta: () => Px, Mute: () => gx, None: () => zx, Opaque: () => Mx, Pause: () => lx, Play: () => rx, Progress: () => mx, Raised: () => _x, Red: () => Sx, Replay: () => cx, Reset: () => Ux, Script: () => Ox, Subtitles: () => Dx, Text: () => kx, Transparent: () => Rx, Uniform: () => Nx, Unmute: () => hx, White: () => Cx, Window: () => Bx, Yellow: () => Tx, default: () => uL });
var rx;
var lx;
var cx;
var ux;
var dx;
var px;
var mx;
var fx;
var gx;
var hx;
var Dx;
var vx;
var yx;
var bx;
var wx;
var kx;
var Cx;
var xx;
var Sx;
var Ex;
var Fx;
var Tx;
var Px;
var jx;
var Ax;
var Bx;
var Rx;
var Mx;
var zx;
var _x;
var Lx;
var Nx;
var Ix;
var $x;
var Ox;
var Ux;
var Vx;
var uL;
var qs = p(() => {
  "use strict";
  rx = "Odtw\xF3rz", lx = "Wstrzymaj", cx = "Odtw\xF3rz ponownie", ux = "Czas trwania", dx = "NA \u017BYWO", px = "Za\u0142adowany", mx = "Status", fx = "Pe\u0142ny ekran", gx = "Wycisz", hx = "Wy\u0142\u0105cz wyciszenie", Dx = "Napisy", vx = "Transkrypcja", yx = "Rozdzia\u0142y", bx = "Opisy", wx = "Zamknij", kx = "Tekst", Cx = "Bia\u0142y", xx = "Czarny", Sx = "Czerwony", Ex = "Zielony", Fx = "Niebieski", Tx = "\u017B\xF3\u0142ty", Px = "Karmazynowy", jx = "Cyjanowy", Ax = "T\u0142o", Bx = "Okno", Rx = "Przezroczysty", Mx = "Nieprzezroczysty", zx = "Brak", _x = "Podniesiony", Lx = "Obni\u017Cony", Nx = "R\xF3wnomierny", Ix = "Cie\u0144", $x = "Casual", Ox = "Script", Ux = "Ustawienia domy\u015Blne", Vx = "Gotowe", uL = { "Audio Player": "Odtwarzacz audio", "Video Player": "Odtwarzacz wideo", Play: rx, Pause: lx, Replay: cx, "Current Time": "Aktualny czas", Duration: ux, "Remaining Time": "Pozosta\u0142y czas", "Stream Type": "Typ strumienia", LIVE: dx, "Seek to live, currently behind live": "Przejd\u017A do transmisji na \u017Cywo, obecnie trwa odtwarzanie z archiwum", "Seek to live, currently playing live": "Przejd\u017C do transmisji na \u017Cywo, obecnie trwa odtwarzanie na \u017Cywo", Loaded: px, Progress: mx, "Progress Bar": "Pasek post\u0119pu", "progress bar timing: currentTime={1} duration={2}": "{1} z {2}", Fullscreen: fx, "Exit Fullscreen": "Pe\u0142ny ekran niedost\u0119pny", Mute: gx, Unmute: hx, "Playback Rate": "Pr\u0119dko\u015B\u0107 odtwarzania", Subtitles: Dx, "subtitles off": "Napisy wy\u0142\u0105czone", Captions: vx, "captions off": "Transkrypcja wy\u0142\u0105czona", Chapters: yx, Descriptions: bx, "descriptions off": "Opisy wy\u0142\u0105czone", "Audio Track": "\u015Acie\u017Cka audio", "Volume Level": "Poziom g\u0142o\u015Bno\u015Bci", "You aborted the media playback": "Odtwarzanie zosta\u0142o przerwane", "A network error caused the media download to fail part-way.": "B\u0142\u0105d sieci spowodowa\u0142 cz\u0119\u015Bciowe niepowodzenie pobierania materia\u0142u wideo.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Materia\u0142 wideo nie mo\u017Ce zosta\u0107 za\u0142adowany, poniewa\u017C wyst\u0105pi\u0142 problem z serwerem lub sieci\u0105 albo format materia\u0142u wideo nie jest obs\u0142ugiwany", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Odtwarzanie materia\u0142u wideo zosta\u0142o przerwane z powodu uszkodzonego pliku wideo lub z powodu u\u017Cycia funkcji multimedi\xF3w nieobs\u0142ugiwanych przez Twoj\u0105 przegl\u0105dark\u0119.", "No compatible source was found for this media.": "Nie znaleziono kompatybilnego \u017Ar\xF3d\u0142a dla tego typu materia\u0142u wideo.", "The media is encrypted and we do not have the keys to decrypt it.": "Materia\u0142 jest zaszyfrowany, a nie mamy kluczy do jego odszyfrowania.", "Play Video": "Odtw\xF3rz wideo", Close: wx, "Close Modal Dialog": "Zamknij okno modalne", "Modal Window": "Okno modalne", "This is a modal window": "To jest okno modalne", "This modal can be closed by pressing the Escape key or activating the close button.": "To okno modalne mo\u017Cesz zamkn\u0105\u0107, naciskaj\u0105c klawisz Escape albo wybieraj\u0105c przycisk Zamknij.", ", opens captions settings dialog": ", otwiera okno dialogowe ustawie\u0144 transkrypcji", ", opens subtitles settings dialog": ", otwiera okno dialogowe napis\xF3w", ", opens descriptions settings dialog": ", otwiera okno dialogowe opis\xF3w", ", selected": ", zaznaczone", "captions settings": "ustawienia transkrypcji", "subtitles settings": "ustawienia napis\xF3w", "descriptions settings": "ustawienia opis\xF3w", Text: kx, White: Cx, Black: xx, Red: Sx, Green: Ex, Blue: Fx, Yellow: Tx, Magenta: Px, Cyan: jx, Background: Ax, Window: Bx, Transparent: Rx, "Semi-Transparent": "P\xF3\u0142przezroczysty", Opaque: Mx, "Font Size": "Rozmiar czcionki", "Text Edge Style": "Styl kraw\u0119dzi tekstu", None: zx, Raised: _x, Depressed: Lx, Uniform: Nx, Dropshadow: Ix, "Font Family": "Kr\xF3j czcionki", "Proportional Sans-Serif": "Bezszeryfowa, proporcjonalna", "Monospace Sans-Serif": "Bezszeryfowa, sta\u0142a odleg\u0142o\u015B\u0107 znak\xF3w", "Proportional Serif": "Szeryfowa, proporcjonalna", "Monospace Serif": "Szeryfowa, sta\u0142a odleg\u0142o\u015B\u0107 znak\xF3w", Casual: $x, Script: Ox, "Small Caps": "Kapitaliki", Reset: Ux, "restore all settings to the default values": "zresetuj wszystkie ustawienia do domy\u015Blnych warto\u015Bci", Done: Vx, "Caption Settings Dialog": "Okno dialogowe ustawie\u0144 transkrypcji", "Beginning of dialog window. Escape will cancel and close the window.": "Pocz\u0105tek okna dialogowego. Klawisz Escape anuluje i zamyka okno.", "End of dialog window.": "Koniec okna dialogowego.", "{1} is loading.": "Wczytywanie pliku {1}.", "Exit Picture-in-Picture": "Wyjd\u017A z trybu obraz w obrazie", "Picture-in-Picture": "Obraz w obrazie", "No content": "Brak zawarto\u015Bci" };
});
var Hs = {};
h(Hs, { Background: () => fS, Black: () => rS, Blue: () => uS, Captions: () => tS, Casual: () => CS, Chapters: () => oS, Close: () => aS, Cyan: () => mS, Depressed: () => bS, Descriptions: () => nS, Done: () => ES, Dropshadow: () => kS, Duration: () => Gx, Fullscreen: () => Jx, Green: () => cS, LIVE: () => Yx, Loaded: () => Kx, Magenta: () => pS, Mute: () => Xx, None: () => vS, Opaque: () => DS, Pause: () => qx, Play: () => Wx, Progress: () => Zx, Raised: () => yS, Red: () => lS, Replay: () => Hx, Reset: () => SS, Script: () => xS, Subtitles: () => eS, Text: () => sS, Transparent: () => hS, Uniform: () => wS, Unmute: () => Qx, White: () => iS, Window: () => gS, Yellow: () => dS, default: () => dL });
var Wx;
var qx;
var Hx;
var Gx;
var Yx;
var Kx;
var Zx;
var Jx;
var Xx;
var Qx;
var eS;
var tS;
var oS;
var nS;
var aS;
var sS;
var iS;
var rS;
var lS;
var cS;
var uS;
var dS;
var pS;
var mS;
var fS;
var gS;
var hS;
var DS;
var vS;
var yS;
var bS;
var wS;
var kS;
var CS;
var xS;
var SS;
var ES;
var dL;
var Gs = p(() => {
  "use strict";
  Wx = "Tocar", qx = "Pausar", Hx = "Tocar novamente", Gx = "Dura\xE7\xE3o", Yx = "AO VIVO", Kx = "Carregado", Zx = "Progresso", Jx = "Tela Cheia", Xx = "Mudo", Qx = "Ativar o som", eS = "Legendas", tS = "Anota\xE7\xF5es", oS = "Cap\xEDtulos", nS = "Descri\xE7\xF5es", aS = "Fechar", sS = "Texto", iS = "Branco", rS = "Preto", lS = "Vermelho", cS = "Verde", uS = "Azul", dS = "Amarelo", pS = "Magenta", mS = "Ciano", fS = "Plano-de-Fundo", gS = "Janela", hS = "Transparente", DS = "Opaco", vS = "Nenhum", yS = "Elevado", bS = "Acachapado", wS = "Uniforme", kS = "Sombra de proje\xE7\xE3o", CS = "Casual", xS = "Script", SS = "Redefinir", ES = "Salvar", dL = { "Audio Player": "Reprodutor de \xE1udio", "Video Player": "Reprodutor de v\xEDdeo", Play: Wx, Pause: qx, Replay: Hx, "Current Time": "Tempo", Duration: Gx, "Remaining Time": "Tempo Restante", "Stream Type": "Tipo de Stream", LIVE: Yx, Loaded: Kx, Progress: Zx, "Progress Bar": "Barra de progresso", "progress bar timing: currentTime={1} duration={2}": "{1} de {2}", Fullscreen: Jx, "Exit Fullscreen": "Tela Normal", Mute: Xx, Unmute: Qx, "Playback Rate": "Velocidade", Subtitles: eS, "subtitles off": "Sem Legendas", Captions: tS, "captions off": "Sem Anota\xE7\xF5es", Chapters: oS, Descriptions: nS, "descriptions off": "sem descri\xE7\xF5es", "Audio Track": "Faixa de \xE1udio", "Volume Level": "N\xEDvel de volume", "You aborted the media playback": "Voc\xEA parou a execu\xE7\xE3o do v\xEDdeo.", "A network error caused the media download to fail part-way.": "Um erro na rede causou falha durante o download da m\xEDdia.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "A m\xEDdia n\xE3o pode ser carregada, por uma falha de rede ou servidor ou o formato n\xE3o \xE9 suportado.", "No compatible source was found for this media.": "Nenhuma fonte foi encontrada para esta m\xEDdia.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "A reprodu\xE7\xE3o foi interrompida devido \xE0 um problema de m\xEDdia corrompida ou porque a m\xEDdia utiliza fun\xE7\xF5es que seu navegador n\xE3o suporta.", "The media is encrypted and we do not have the keys to decrypt it.": "A m\xEDdia est\xE1 criptografada e n\xE3o temos as chaves para descriptografar.", "Play Video": "Tocar V\xEDdeo", Close: aS, "Close Modal Dialog": "Fechar Di\xE1logo Modal", "Modal Window": "Janela Modal", "This is a modal window": "Isso \xE9 uma janela-modal", "This modal can be closed by pressing the Escape key or activating the close button.": "Esta janela pode ser fechada pressionando a tecla de Escape.", ", opens captions settings dialog": ", abre as configura\xE7\xF5es de legendas de coment\xE1rios", ", opens subtitles settings dialog": ", abre as configura\xE7\xF5es de legendas", ", opens descriptions settings dialog": ", abre as configura\xE7\xF5es", ", selected": ", selecionada", "captions settings": "configura\xE7\xF5es de legendas de coment\xE1rios", "subtitles settings": "configura\xE7\xF5es de legendas", "descriptions settings": "configura\xE7\xF5es das descri\xE7\xF5es", Text: sS, White: iS, Black: rS, Red: lS, Green: cS, Blue: uS, Yellow: dS, Magenta: pS, Cyan: mS, Background: fS, Window: gS, Transparent: hS, "Semi-Transparent": "Semi-Transparente", Opaque: DS, "Font Size": "Tamanho da Fonte", "Text Edge Style": "Estilo da Borda", None: vS, Raised: yS, Depressed: bS, Uniform: wS, Dropshadow: kS, "Font Family": "Fam\xEDlia da Fonte", "Proportional Sans-Serif": "Sans-Serif(Sem serifa) Proporcional", "Monospace Sans-Serif": "Sans-Serif(Sem serifa) Monoespa\xE7ada", "Proportional Serif": "Serifa Proporcional", "Monospace Serif": "Serifa Monoespa\xE7ada", Casual: CS, Script: xS, "Small Caps": "Mai\xFAsculas Pequenas", Reset: SS, "restore all settings to the default values": "restaurar todas as configura\xE7\xF5es aos valores padr\xE3o", Done: ES, "Caption Settings Dialog": "Ca\xEDxa-de-Di\xE1logo das configura\xE7\xF5es de Legendas", "Beginning of dialog window. Escape will cancel and close the window.": "Iniciando a Janela-de-Di\xE1logo. Pressionar Escape ir\xE1 cancelar e fechar a janela.", "End of dialog window.": "Fim da Janela-de-Di\xE1logo", "{1} is loading.": "{1} est\xE1 carregando.", "Exit Picture-in-Picture": "Sair de Picture-in-Picture", "Picture-in-Picture": "Picture-in-Picture" };
});
var Ys = {};
h(Ys, { Captions: () => NS, Chapters: () => IS, Close: () => OS, Descriptions: () => $S, Duration: () => jS, Fullscreen: () => MS, LIVE: () => AS, Loaded: () => BS, Mute: () => zS, Pause: () => TS, Play: () => FS, Progress: () => RS, Replay: () => PS, Subtitles: () => LS, Unmute: () => _S, default: () => pL });
var FS;
var TS;
var PS;
var jS;
var AS;
var BS;
var RS;
var MS;
var zS;
var _S;
var LS;
var NS;
var IS;
var $S;
var OS;
var pL;
var Ks = p(() => {
  "use strict";
  FS = "Reproduzir", TS = "Parar", PS = "Reiniciar", jS = "Dura\xE7\xE3o", AS = "EM DIRETO", BS = "Carregado", RS = "Progresso", MS = "Ecr\xE3 inteiro", zS = "Desativar som", _S = "Ativar som", LS = "Legendas", NS = "Anota\xE7\xF5es", IS = "Cap\xEDtulos", $S = "Descri\xE7\xF5es", OS = "Fechar", pL = { Play: FS, Pause: TS, Replay: PS, "Current Time": "Tempo Atual", Duration: jS, "Remaining Time": "Tempo Restante", "Stream Type": "Tipo de Stream", LIVE: AS, Loaded: BS, Progress: RS, Fullscreen: MS, "Exit Fullscreen": "Ecr\xE3 normal", Mute: zS, Unmute: _S, "Playback Rate": "Velocidade de reprodu\xE7\xE3o", Subtitles: LS, "subtitles off": "desativar legendas", Captions: NS, "captions off": "desativar anota\xE7\xF5es", Chapters: IS, "Close Modal Dialog": "Fechar Janela Modal", Descriptions: $S, "descriptions off": "desativar descri\xE7\xF5es", "Audio Track": "Faixa \xC1udio", "You aborted the media playback": "Parou a reprodu\xE7\xE3o do v\xEDdeo.", "A network error caused the media download to fail part-way.": "Um erro na rede fez o v\xEDdeo falhar parcialmente.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "O v\xEDdeo n\xE3o pode ser carregado, ou porque houve um problema na rede ou no servidor, ou porque formato do v\xEDdeo n\xE3o \xE9 compat\xEDvel.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "A reprodu\xE7\xE3o foi interrompida por um problema com o v\xEDdeo ou porque o formato n\xE3o \xE9 compat\xEDvel com o seu navegador.", "No compatible source was found for this media.": "N\xE3o foi encontrada uma fonte de v\xEDdeo compat\xEDvel.", "The media is encrypted and we do not have the keys to decrypt it.": "O v\xEDdeo est\xE1 encriptado e n\xE3o h\xE1 uma chave para o desencriptar.", "Play Video": "Reproduzir V\xEDdeo", Close: OS, "Modal Window": "Janela Modal", "This is a modal window": "Isto \xE9 uma janela modal", "This modal can be closed by pressing the Escape key or activating the close button.": "Esta modal pode ser fechada pressionando a tecla ESC ou ativando o bot\xE3o de fechar.", ", opens captions settings dialog": ", abre janela com defini\xE7\xF5es de legendas", ", opens subtitles settings dialog": ", abre janela com defini\xE7\xF5es de legendas", ", opens descriptions settings dialog": ", abre janela com defini\xE7\xF5es de descri\xE7\xF5es", ", selected": ", seleccionado" };
});
var Zs = {};
h(Zs, { Background: () => p8, Black: () => s8, Blue: () => l8, Captions: () => QS, Casual: () => w8, Chapters: () => e8, Close: () => o8, Cyan: () => d8, Depressed: () => v8, Descriptions: () => t8, Done: () => x8, Dropshadow: () => b8, Duration: () => qS, Fullscreen: () => KS, Green: () => r8, LIVE: () => HS, Loaded: () => GS, Magenta: () => u8, Mute: () => ZS, None: () => h8, Opaque: () => g8, Pause: () => VS, Play: () => US, Progress: () => YS, Raised: () => D8, Red: () => i8, Replay: () => WS, Reset: () => C8, Script: () => k8, Subtitles: () => XS, Text: () => n8, Transparent: () => f8, Uniform: () => y8, Unmute: () => JS, White: () => a8, Window: () => m8, Yellow: () => c8, default: () => mL });
var US;
var VS;
var WS;
var qS;
var HS;
var GS;
var YS;
var KS;
var ZS;
var JS;
var XS;
var QS;
var e8;
var t8;
var o8;
var n8;
var a8;
var s8;
var i8;
var r8;
var l8;
var c8;
var u8;
var d8;
var p8;
var m8;
var f8;
var g8;
var h8;
var D8;
var v8;
var y8;
var b8;
var w8;
var k8;
var C8;
var x8;
var mL;
var Js = p(() => {
  "use strict";
  US = "Pies\u0103", VS = "Pauz\u0103", WS = "Reluare", qS = "Durat\u0103", HS = "\xCEN DIRECT", GS = "\xCEnc\u0103rcat", YS = "Progres", KS = "Ecran complet", ZS = "Suprimare sunet", JS = "Activare sunet", XS = "Subtitr\u0103ri", QS = "Indica\u021Bii scrise", e8 = "Capitole", t8 = "Descrieri", o8 = "\xCEnchidere", n8 = "Text", a8 = "Alb", s8 = "Negru", i8 = "Ro\u0219u", r8 = "Verde", l8 = "Albastru", c8 = "Galben", u8 = "Magenta", d8 = "Cyan", p8 = "Fundal", m8 = "Fereastr\u0103", f8 = "Transparent", g8 = "Opac", h8 = "F\u0103r\u0103", D8 = "Ridicat", v8 = "Ap\u0103sat", y8 = "Uniform\u0103", b8 = "Umbr\u0103", w8 = "Informal", k8 = "Script", C8 = "Resetare", x8 = "Terminat", mL = { "Audio Player": "Player audio", "Video Player": "Player video", Play: US, Pause: VS, Replay: WS, "Current Time": "Ora curent\u0103", Duration: qS, "Remaining Time": "Timp r\u0103mas", "Stream Type": "Tip flux", LIVE: HS, "Seek to live, currently behind live": "C\u0103utare \xEEn direct; \xEEn prezent, sunte\u021Bi \xEEn urm\u0103", "Seek to live, currently playing live": "C\u0103utare \xEEn direct; \xEEn prezent, se red\u0103 \xEEn direct", Loaded: GS, Progress: YS, "Progress Bar": "Bar\u0103 de progres", "progress bar timing: currentTime={1} duration={2}": "{1} din {2}", Fullscreen: KS, "Exit Fullscreen": "Ecran par\u021Bial", Mute: ZS, Unmute: JS, "Playback Rate": "Rat\u0103 de redare", Subtitles: XS, "subtitles off": "subtitr\u0103ri dezactivate", Captions: QS, "captions off": "indica\u021Bii scrise dezactivate", Chapters: e8, Descriptions: t8, "descriptions off": "descrieri dezactivate", "Audio Track": "Pist\u0103 audio", "Volume Level": "Nivel volum", "You aborted the media playback": "A\u021Bi abandonat redarea media", "A network error caused the media download to fail part-way.": "O eroare de re\u021Bea a provocat e\u0219ecul desc\u0103rc\u0103rii con\u021Binutului media \xEEn timpul procesului.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Con\u021Binutul media nu a putut fi \xEEnc\u0103rcat, fie pentru c\u0103 serverul sau re\u021Beaua a e\u0219uat, fie pentru c\u0103 formatul nu este acceptat.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Redarea media a fost \xEEntrerupt\u0103 din cauza con\u021Binutului corupt sau din cauza faptului c\u0103 acest con\u021Binut media folose\u0219te func\u021Bii pe care browserul dvs. nu le accept\u0103.", "No compatible source was found for this media.": "Nu au fost g\u0103site surse compatibile pentru acest con\u021Binut media.", "The media is encrypted and we do not have the keys to decrypt it.": "Con\u021Binutul media este criptat\u0103 \u0219i nu avem cheile pentru decriptare.", "Play Video": "Redare video", Close: o8, "Close Modal Dialog": "\xCEnchidere dialog modal", "Modal Window": "Fereastr\u0103 modal\u0103", "This is a modal window": "Aceasta este o fereastr\u0103 modal\u0103", "This modal can be closed by pressing the Escape key or activating the close button.": "Aceast\u0103 fereastr\u0103 modal\u0103 poate fi \xEEnchis\u0103 cu tasta Escape sau butonul de \xEEnchidere.", ", opens captions settings dialog": ", deschide dialogul de set\u0103ri pentru indica\u021Bii scrise", ", opens subtitles settings dialog": ", deschide dialogul de set\u0103ri pentru subtitr\u0103ri", ", opens descriptions settings dialog": ", deschide dialogul de set\u0103ri pentru descrieri", ", selected": ", selectat", "captions settings": "set\u0103ri indica\u021Bii scrise", "subtitles settings": "set\u0103ri subtitr\u0103ri", "descriptions settings": "set\u0103ri descrieri", Text: n8, White: a8, Black: s8, Red: i8, Green: r8, Blue: l8, Yellow: c8, Magenta: u8, Cyan: d8, Background: p8, Window: m8, Transparent: f8, "Semi-Transparent": "Semitransparent", Opaque: g8, "Font Size": "M\u0103rime font", "Text Edge Style": "Stil margine text", None: h8, Raised: D8, Depressed: v8, Uniform: y8, Dropshadow: b8, "Font Family": "Familie fonturi", "Proportional Sans-Serif": "Sans-serif propor\u021Bional", "Monospace Sans-Serif": "Sans-serif monospa\u021Biu", "Proportional Serif": "Serif propor\u021Bional", "Monospace Serif": "Serif monospa\u021Biu", Casual: w8, Script: k8, "Small Caps": "Majuscule mici", Reset: C8, "restore all settings to the default values": "readuce\u021Bi toate set\u0103rile la valorile implicite", Done: x8, "Caption Settings Dialog": "Dialog set\u0103ri indica\u021Bii scrise", "Beginning of dialog window. Escape will cancel and close the window.": "\xCEnceputul ferestrei de dialog. Tasta Escape va anula \u0219i va \xEEnchide fereastra.", "End of dialog window.": "Sf\xE2r\u0219itul ferestrei de dialog.", "{1} is loading.": "{1} se \xEEncarc\u0103.", "Exit Picture-in-Picture": "\xCEnchidere imagine \xEEn imagine", "Picture-in-Picture": "Imagine \xEEn imagine" };
});
var Xs = {};
h(Xs, { Background: () => K8, Black: () => U8, Blue: () => q8, Captions: () => _8, Casual: () => aE, Chapters: () => L8, Close: () => I8, Cyan: () => Y8, Depressed: () => tE, Descriptions: () => N8, Done: () => rE, Dropshadow: () => nE, Duration: () => T8, Fullscreen: () => B8, Green: () => W8, LIVE: () => P8, Loaded: () => j8, Magenta: () => G8, Mute: () => R8, None: () => Q8, Opaque: () => X8, Pause: () => E8, Play: () => S8, Progress: () => A8, Raised: () => eE, Red: () => V8, Replay: () => F8, Reset: () => iE, Script: () => sE, Subtitles: () => z8, Text: () => $8, Transparent: () => J8, Uniform: () => oE, Unmute: () => M8, White: () => O8, Window: () => Z8, Yellow: () => H8, default: () => fL });
var S8;
var E8;
var F8;
var T8;
var P8;
var j8;
var A8;
var B8;
var R8;
var M8;
var z8;
var _8;
var L8;
var N8;
var I8;
var $8;
var O8;
var U8;
var V8;
var W8;
var q8;
var H8;
var G8;
var Y8;
var K8;
var Z8;
var J8;
var X8;
var Q8;
var eE;
var tE;
var oE;
var nE;
var aE;
var sE;
var iE;
var rE;
var fL;
var Qs = p(() => {
  "use strict";
  S8 = "\u0412\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0441\u0442\u0438", E8 = "\u041F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C", F8 = "\u0412\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0441\u0442\u0438 \u0441\u043D\u043E\u0432\u0430", T8 = "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C", P8 = "\u041F\u0420\u042F\u041C\u041E\u0419 \u042D\u0424\u0418\u0420", j8 = "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430", A8 = "\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441", B8 = "\u041F\u043E\u043B\u043D\u043E\u044D\u043A\u0440\u0430\u043D\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C", R8 = "\u0411\u0435\u0437 \u0437\u0432\u0443\u043A\u0430", M8 = "\u0421\u043E \u0437\u0432\u0443\u043A\u043E\u043C", z8 = "\u0421\u0443\u0431\u0442\u0438\u0442\u0440\u044B", _8 = "\u041F\u043E\u0434\u043F\u0438\u0441\u0438", L8 = "\u0413\u043B\u0430\u0432\u044B", N8 = "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u044F", I8 = "\u0417\u0430\u043A\u0440\u044B\u0442\u044C", $8 = "\u0422\u0435\u043A\u0441\u0442", O8 = "\u0411\u0435\u043B\u044B\u0439", U8 = "\u0427\u0435\u0440\u043D\u044B\u0439", V8 = "\u041A\u0440\u0430\u0441\u043D\u044B\u0439", W8 = "\u0417\u0435\u043B\u0435\u043D\u044B\u0439", q8 = "\u0421\u0438\u043D\u0438\u0439", H8 = "\u0416\u0435\u043B\u0442\u044B\u0439", G8 = "\u041F\u0443\u0440\u043F\u0443\u0440\u043D\u044B\u0439", Y8 = "\u0413\u043E\u043B\u0443\u0431\u043E\u0439", K8 = "\u0424\u043E\u043D", Z8 = "\u041E\u043A\u043D\u043E", J8 = "\u041F\u0440\u043E\u0437\u0440\u0430\u0447\u043D\u044B\u0439", X8 = "\u041F\u0440\u043E\u0437\u0440\u0430\u0447\u043D\u043E\u0441\u0442\u044C", Q8 = "\u041D\u0438\u0447\u0435\u0433\u043E", eE = "\u041F\u043E\u0434\u043D\u044F\u0442\u044B\u0439", tE = "\u041F\u043E\u043D\u0438\u0436\u0435\u043D\u043D\u044B\u0439", oE = "\u041E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u0439", nE = "\u0422\u0435\u043D\u044C", aE = "\u041A\u0430\u0437\u0443\u0430\u043B\u044C\u043D\u044B\u0439", sE = "\u0420\u0443\u043A\u043E\u043F\u0438\u0441\u043D\u044B\u0439", iE = "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C", rE = "\u0413\u043E\u0442\u043E\u0432\u043E", fL = { "Audio Player": "\u0410\u0443\u0434\u0438\u043E\u043F\u043B\u0435\u0435\u0440", "Video Player": "\u0412\u0438\u0434\u0435\u043E\u043F\u043B\u0435\u0435\u0440", Play: S8, Pause: E8, Replay: F8, "Current Time": "\u0422\u0435\u043A\u0443\u0449\u0435\u0435 \u0432\u0440\u0435\u043C\u044F", Duration: T8, "Remaining Time": "\u041E\u0441\u0442\u0430\u0432\u0448\u0435\u0435\u0441\u044F \u0432\u0440\u0435\u043C\u044F", "Stream Type": "\u0422\u0438\u043F \u043F\u043E\u0442\u043E\u043A\u0430", LIVE: P8, "Seek to live, currently behind live": "\u041F\u0435\u0440\u0435\u0445\u043E\u0434 \u043A \u043F\u0440\u044F\u043C\u043E\u043C\u0443 \u044D\u0444\u0438\u0440\u0443 (\u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u0438\u0434\u0451\u0442 \u0441 \u043E\u0442\u0441\u0442\u0430\u0432\u0430\u043D\u0438\u0435\u043C)", "Seek to live, currently playing live": "\u041F\u0435\u0440\u0435\u0445\u043E\u0434 \u043A \u043F\u0440\u044F\u043C\u043E\u043C\u0443 \u044D\u0444\u0438\u0440\u0443 (\u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u0438\u0434\u0451\u0442 \u0431\u0435\u0437 \u043E\u0442\u0441\u0442\u0430\u0432\u0430\u043D\u0438\u044F)", Loaded: j8, Progress: A8, "Progress Bar": "\u0418\u043D\u0434\u0438\u043A\u0430\u0442\u043E\u0440 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438", "progress bar timing: currentTime={1} duration={2}": "{1} \u0438\u0437 {2}", Fullscreen: B8, "Exit Fullscreen": "\u041D\u0435\u043F\u043E\u043B\u043D\u043E\u044D\u043A\u0440\u0430\u043D\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C", Mute: R8, Unmute: M8, "Playback Rate": "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u044F", Subtitles: z8, "subtitles off": "\u0421\u0443\u0431\u0442\u0438\u0442\u0440\u044B \u0432\u044B\u043A\u043B.", Captions: _8, "captions off": "\u041F\u043E\u0434\u043F\u0438\u0441\u0438 \u0432\u044B\u043A\u043B.", Chapters: L8, Descriptions: N8, "descriptions off": "\u041E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F", "Audio Track": "\u0417\u0432\u0443\u043A\u043E\u0432\u0430\u044F \u0434\u043E\u0440\u043E\u0436\u043A\u0430", "Volume Level": "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0433\u0440\u043E\u043C\u043A\u043E\u0441\u0442\u0438", "You aborted the media playback": "\u0412\u044B \u043F\u0440\u0435\u0440\u0432\u0430\u043B\u0438 \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u0432\u0438\u0434\u0435\u043E", "A network error caused the media download to fail part-way.": "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438 \u0432\u044B\u0437\u0432\u0430\u043B\u0430 \u0441\u0431\u043E\u0439 \u0432\u043E \u0432\u0440\u0435\u043C\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0432\u0438\u0434\u0435\u043E \u0438\u0437-\u0437\u0430 \u0441\u0435\u0442\u0435\u0432\u043E\u0433\u043E \u0438\u043B\u0438 \u0441\u0435\u0440\u0432\u0435\u0440\u043D\u043E\u0433\u043E \u0441\u0431\u043E\u044F \u043B\u0438\u0431\u043E \u043D\u0435\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u043E\u0433\u043E \u0444\u043E\u0440\u043C\u0430\u0442\u0430 \u0432\u0438\u0434\u0435\u043E.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\u0412\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u043F\u0440\u0435\u0440\u0432\u0430\u043D\u043E \u0438\u0437-\u0437\u0430 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u044F \u043B\u0438\u0431\u043E \u0432 \u0441\u0432\u044F\u0437\u0438 \u0441 \u0442\u0435\u043C, \u0447\u0442\u043E \u0432\u0438\u0434\u0435\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442 \u0444\u0443\u043D\u043A\u0446\u0438\u0438, \u043D\u0435\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u044B\u0435 \u0432\u0430\u0448\u0438\u043C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043E\u043C.", "No compatible source was found for this media.": "\u0421\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u044B\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0432\u0438\u0434\u0435\u043E \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442.", "The media is encrypted and we do not have the keys to decrypt it.": "\u0412\u0438\u0434\u0435\u043E \u0437\u0430\u0448\u0438\u0444\u0440\u043E\u0432\u0430\u043D\u043E, \u0430 \u0443 \u043D\u0430\u0441 \u043D\u0435\u0442 \u043A\u043B\u044E\u0447\u0435\u0439 \u0434\u043B\u044F \u0435\u0433\u043E \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0438.", "Play Video": "\u0412\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0441\u0442\u0438 \u0432\u0438\u0434\u0435\u043E", Close: I8, "Close Modal Dialog": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043C\u043E\u0434\u0430\u043B\u044C\u043D\u043E\u0435 \u043E\u043A\u043D\u043E", "Modal Window": "\u041C\u043E\u0434\u0430\u043B\u044C\u043D\u043E\u0435 \u043E\u043A\u043D\u043E", "This is a modal window": "\u042D\u0442\u043E \u043C\u043E\u0434\u0430\u043B\u044C\u043D\u043E\u0435 \u043E\u043A\u043D\u043E", "This modal can be closed by pressing the Escape key or activating the close button.": "\u041C\u043E\u0434\u0430\u043B\u044C\u043D\u043E\u0435 \u043E\u043A\u043D\u043E \u043C\u043E\u0436\u043D\u043E \u0437\u0430\u043A\u0440\u044B\u0442\u044C \u043D\u0430\u0436\u0430\u0432 Esc \u0438\u043B\u0438 \u043A\u043D\u043E\u043F\u043A\u0443 \u0437\u0430\u043A\u0440\u044B\u0442\u0438\u044F \u043E\u043A\u043D\u0430.", ", opens captions settings dialog": ", \u043E\u0442\u043A\u0440\u043E\u0435\u0442\u0441\u044F \u0434\u0438\u0430\u043B\u043E\u0433 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u0435\u0439", ", opens subtitles settings dialog": ", \u043E\u0442\u043A\u0440\u043E\u0435\u0442\u0441\u044F \u0434\u0438\u0430\u043B\u043E\u0433 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u043E\u0432", ", opens descriptions settings dialog": ", \u043E\u0442\u043A\u0440\u043E\u0435\u0442\u0441\u044F \u0434\u0438\u0430\u043B\u043E\u0433 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0439", ", selected": ", \u0432\u044B\u0431\u0440\u0430\u043D\u043E", "captions settings": "\u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u0435\u0439", "subtitles settings": "\u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u043E\u0432", "descriptions settings": "\u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0439", Text: $8, White: O8, Black: U8, Red: V8, Green: W8, Blue: q8, Yellow: H8, Magenta: G8, Cyan: Y8, Background: K8, Window: Z8, Transparent: J8, "Semi-Transparent": "\u041F\u043E\u043B\u0443\u043F\u0440\u043E\u0437\u0440\u0430\u0447\u043D\u044B\u0439", Opaque: X8, "Font Size": "\u0420\u0430\u0437\u043C\u0435\u0440 \u0448\u0440\u0438\u0444\u0442\u0430", "Text Edge Style": "\u0421\u0442\u0438\u043B\u044C \u043A\u0440\u0430\u044F \u0442\u0435\u043A\u0441\u0442\u0430", None: Q8, Raised: eE, Depressed: tE, Uniform: oE, Dropshadow: nE, "Font Family": "\u0428\u0440\u0438\u0444\u0442", "Proportional Sans-Serif": "\u041F\u0440\u043E\u043F\u043E\u0440\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u0431\u0435\u0437 \u0437\u0430\u0441\u0435\u0447\u0435\u043A", "Monospace Sans-Serif": "\u041C\u043E\u043D\u043E\u0448\u0438\u0440\u0438\u043D\u043D\u044B\u0439 \u0431\u0435\u0437 \u0437\u0430\u0441\u0435\u0447\u0435\u043A", "Proportional Serif": "\u041F\u0440\u043E\u043F\u043E\u0440\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u0441 \u0437\u0430\u0441\u0435\u0447\u043A\u0430\u043C\u0438", "Monospace Serif": "\u041C\u043E\u043D\u043E\u0448\u0438\u0440\u0438\u043D\u043D\u044B\u0439 \u0441 \u0437\u0430\u0441\u0435\u0447\u043A\u0430\u043C\u0438", Casual: aE, Script: sE, "Small Caps": "\u041A\u0430\u043F\u0438\u0442\u0435\u043B\u044C", Reset: iE, "restore all settings to the default values": "\u0441\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0432\u0441\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043D\u0430 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E", Done: rE, "Caption Settings Dialog": "\u0414\u0438\u0430\u043B\u043E\u0433 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A \u043F\u043E\u0434\u043F\u0438\u0441\u0438", "Beginning of dialog window. Escape will cancel and close the window.": "\u041D\u0430\u0447\u0430\u043B\u043E \u0434\u0438\u0430\u043B\u043E\u0433\u043E\u0432\u043E\u0433\u043E \u043E\u043A\u043D\u0430. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 Escape \u0434\u043B\u044F \u043E\u0442\u043C\u0435\u043D\u044B \u0438 \u0437\u0430\u043A\u0440\u044B\u0442\u0438\u044F \u043E\u043A\u043D\u0430", "End of dialog window.": "\u041A\u043E\u043D\u0435\u0446 \u0434\u0438\u0430\u043B\u043E\u0433\u043E\u0432\u043E\u0433\u043E \u043E\u043A\u043D\u0430.", "{1} is loading.": "{1} \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442\u0441\u044F.", "Exit Picture-in-Picture": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443 \u0432 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0435", "Picture-in-Picture": "\u041A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 \u0432 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0435", "Skip forward {1} seconds": "\u041D\u0430 {1} \u0441\u0435\u043A\u0443\u043D\u0434 \u0432\u043F\u0435\u0440\u0435\u0434", "Skip backward {1} seconds": "\u041D\u0430 {1} \u0441\u0435\u043A\u0443\u043D\u0434 \u043D\u0430\u0437\u0430\u0434" };
});
var ei = {};
h(ei, { Background: () => BE, Black: () => SE, Blue: () => TE, Captions: () => yE, Casual: () => OE, Chapters: () => bE, Close: () => kE, Cyan: () => AE, Depressed: () => NE, Descriptions: () => wE, Done: () => WE, Dropshadow: () => $E, Duration: () => dE, Fullscreen: () => gE, Green: () => FE, LIVE: () => pE, Loaded: () => mE, Magenta: () => jE, Mute: () => hE, None: () => _E, Opaque: () => zE, Pause: () => cE, Play: () => lE, Progress: () => fE, Raised: () => LE, Red: () => EE, Replay: () => uE, Reset: () => VE, Script: () => UE, Subtitles: () => vE, Text: () => CE, Transparent: () => ME, Uniform: () => IE, Unmute: () => DE, White: () => xE, Window: () => RE, Yellow: () => PE, default: () => gL });
var lE;
var cE;
var uE;
var dE;
var pE;
var mE;
var fE;
var gE;
var hE;
var DE;
var vE;
var yE;
var bE;
var wE;
var kE;
var CE;
var xE;
var SE;
var EE;
var FE;
var TE;
var PE;
var jE;
var AE;
var BE;
var RE;
var ME;
var zE;
var _E;
var LE;
var NE;
var IE;
var $E;
var OE;
var UE;
var VE;
var WE;
var gL;
var ti = p(() => {
  "use strict";
  lE = "Prehra\u0165", cE = "Pozastavi\u0165", uE = "Prehra\u0165 znova", dE = "\u010Cas trvania", pE = "NA\u017DIVO", mE = "Na\u010D\xEDtan\xE9", fE = "Priebeh", gE = "Re\u017Eim celej obrazovky", hE = "Stlmi\u0165", DE = "Zru\u0161i\u0165 stlmenie", vE = "Titulky", yE = "Popisky", bE = "Kapitoly", wE = "Opisy", kE = "Zatvori\u0165", CE = "Text", xE = "Biela", SE = "\u010Cierna", EE = "\u010Cerven\xE1", FE = "Zelen\xE1", TE = "Modr\xE1", PE = "\u017Dlt\xE1", jE = "Ru\u017Eov\xE1", AE = "Tyrkysov\xE1", BE = "Pozadie", RE = "Okno", ME = "Priesvitn\xE9", zE = "Pln\xE9", _E = "\u017Diadne", LE = "Zv\xFD\u0161en\xE9", NE = "Zn\xED\u017Een\xE9", IE = "Pravideln\xE9", $E = "S tie\u0148om", OE = "Be\u017En\xE9", UE = "P\xEDsan\xE9", VE = "Resetova\u0165", WE = "Hotovo", gL = { "Audio Player": "Zvukov\xFD prehr\xE1va\u010D", "Video Player": "Video prehr\xE1va\u010D", Play: lE, Pause: cE, Replay: uE, "Current Time": "Aktu\xE1lny \u010Das", Duration: dE, "Remaining Time": "Zost\xE1vaj\xFAci \u010Das", "Stream Type": "Typ stopy", LIVE: pE, Loaded: mE, Progress: fE, "Progress Bar": "Ukazovate\u013E priebehu", "progress bar timing: currentTime={1} duration={2}": "\u010Dasovanie ukazovate\u013Ea priebehu: currentTime={1} duration={2}", Fullscreen: gE, "Exit Fullscreen": "Re\u017Eim norm\xE1lnej obrazovky", Mute: hE, Unmute: DE, "Playback Rate": "R\xFDchlos\u0165 prehr\xE1vania", Subtitles: vE, "subtitles off": "titulky vypnut\xE9", Captions: yE, "captions off": "popisky vypnut\xE9", Chapters: bE, Descriptions: wE, "descriptions off": "opisy vypnut\xE9", "Audio Track": "Zvukov\xE1 stopa", "Volume Level": "\xDArove\u0148 hlasitosti", "You aborted the media playback": "Preru\u0161ili ste prehr\xE1vanie", "A network error caused the media download to fail part-way.": "S\u0165ahovanie s\xFAboru bolo zru\u0161en\xE9 pre chybu na sieti.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "S\xFAbor sa nepodarilo na\u010D\xEDta\u0165 pre chybu servera, sie\u0165ov\xE9ho pripojenia, alebo je form\xE1t s\xFAboru nepodporovan\xFD.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Prehr\xE1vanie s\xFAboru bolo preru\u0161en\xE9 pre po\u0161koden\xE9 d\xE1ta, alebo s\xFAbor pou\u017E\xEDva vlastnosti, ktor\xE9 v\xE1\u0161 prehliada\u010D nepodporuje.", "No compatible source was found for this media.": "Nebol n\xE1jden\xFD \u017Eiaden kompatibiln\xFD zdroj pre tento s\xFAbor.", "The media is encrypted and we do not have the keys to decrypt it.": "S\xFAbor je za\u0161ifrovan\xFD a nie je k dispoz\xEDcii k\u013E\xFA\u010D na roz\u0161ifrovanie.", "Play Video": "Prehra\u0165 video", Close: kE, "Close Modal Dialog": "Zatvori\u0165 mod\xE1lne okno", "Modal Window": "Mod\xE1lne okno", "This is a modal window": "Toto je mod\xE1lne okno", "This modal can be closed by pressing the Escape key or activating the close button.": "Toto mod\xE1lne okno je mo\u017En\xE9 zatvori\u0165 stla\u010Den\xEDm kl\xE1vesy Escape, alebo aktivovan\xEDm tla\u010Didla na zatvorenie.", ", opens captions settings dialog": ", otvor\xED okno nastaven\xED popiskov", ", opens subtitles settings dialog": ", otvor\xED okno nastaven\xED titulkov", ", opens descriptions settings dialog": ", otvor\xED okno nastaven\xED opisov", ", selected": ", ozna\u010Den\xE9", "captions settings": "nastavenia popiskov", "subtitles settings": "nastavenia titulkov", "descriptions settings": "nastavenia opisov", Text: CE, White: xE, Black: SE, Red: EE, Green: FE, Blue: TE, Yellow: PE, Magenta: jE, Cyan: AE, Background: BE, Window: RE, Transparent: ME, "Semi-Transparent": "Polopriesvitn\xE9", Opaque: zE, "Font Size": "Ve\u013Ekos\u0165 p\xEDsma", "Text Edge Style": "Typ okrajov p\xEDsma", None: _E, Raised: LE, Depressed: NE, Uniform: IE, Dropshadow: $E, "Font Family": "Typ p\xEDsma", "Proportional Sans-Serif": "Propor\u010Dn\xE9 bezp\xE4tkov\xE9", "Monospace Sans-Serif": "Pravideln\xE9, bezp\xE4tkov\xE9", "Proportional Serif": "Propor\u010Dn\xE9 p\xE4tkov\xE9", "Monospace Serif": "Pravideln\xE9 p\xE4tkov\xE9", Casual: OE, Script: UE, "Small Caps": "Mal\xE9 kapit\xE1lky", Reset: VE, "restore all settings to the default values": "v\u0161etky nastavenia na z\xE1kladn\xE9 hodnoty", Done: WE, "Caption Settings Dialog": "Okno nastaven\xED popiskov", "Beginning of dialog window. Escape will cancel and close the window.": "Za\u010Diatok okna. Kl\xE1vesa Escape zru\u0161\xED a zavrie okno.", "End of dialog window.": "Koniec okna.", "{1} is loading.": "{1} sa na\u010D\xEDta." };
});
var oi = {};
h(oi, { Background: () => g4, Black: () => l4, Blue: () => d4, Captions: () => o4, Chapters: () => n4, Close: () => s4, Cyan: () => f4, Depressed: () => w4, Descriptions: () => a4, Done: () => S4, Dropshadow: () => C4, Duration: () => YE, Fullscreen: () => XE, Green: () => u4, LIVE: () => KE, Loaded: () => ZE, Magenta: () => m4, Mute: () => QE, None: () => y4, Opaque: () => v4, Pause: () => HE, Play: () => qE, Progress: () => JE, Raised: () => b4, Red: () => c4, Replay: () => GE, Reset: () => x4, Subtitles: () => t4, Text: () => i4, Transparent: () => D4, Uniform: () => k4, Unmute: () => e4, White: () => r4, Window: () => h4, Yellow: () => p4, default: () => hL });
var qE;
var HE;
var GE;
var YE;
var KE;
var ZE;
var JE;
var XE;
var QE;
var e4;
var t4;
var o4;
var n4;
var a4;
var s4;
var i4;
var r4;
var l4;
var c4;
var u4;
var d4;
var p4;
var m4;
var f4;
var g4;
var h4;
var D4;
var v4;
var y4;
var b4;
var w4;
var k4;
var C4;
var x4;
var S4;
var hL;
var ni = p(() => {
  "use strict";
  qE = "Predvajaj", HE = "Za\u010Dasno ustavi", GE = "Predvajaj ponovno", YE = "Trajanje", KE = "V \u017DIVO", ZE = "Nalo\u017Eeno", JE = "Napredek", XE = "Celozaslonski prikaz", QE = "Izklju\u010Di zvok", e4 = "Vklju\u010Di zvok", t4 = "Podnapisi", o4 = "Zvo\u010Dni zapis", n4 = "Poglavja", a4 = "Opisi", s4 = "Zapri", i4 = "Tekst", r4 = "Bela", l4 = "\u010Crna", c4 = "Rde\u010Da", u4 = "Zelena", d4 = "Modra", p4 = "Rumena", m4 = "Magenta", f4 = "Cian", g4 = "Ozadje", h4 = "Okno", D4 = "Prozorno", v4 = "Neprozorno", y4 = "Brez", b4 = "Dvignjeno", w4 = "Vtisnjeno", k4 = "Enakomerno", C4 = "S senco", x4 = "Ponastavi", S4 = "Kon\u010Dano", hL = { "Audio Player": "Avdio predvajalnik", "Video Player": "Video predvajalnik", Play: qE, Pause: HE, Replay: GE, "Current Time": "Trenutni \u010Das", Duration: YE, "Remaining Time": "Preostali \u010Das", "Stream Type": "Vrsta podatkovnega toka", LIVE: KE, "Seek to live, currently behind live": "Spremljaj v \u017Eivo (trenutno v zaostanku)", "Seek to live, currently playing live": "Spremljaj v \u017Eivo (trenutno v \u017Eivo)", Loaded: ZE, Progress: JE, "Progress Bar": "Vrstica napredka", "progress bar timing: currentTime={1} duration={2}": "{1} od {2}", Fullscreen: XE, "Exit Fullscreen": "Prikaz na delu zaslona", Mute: QE, Unmute: e4, "Playback Rate": "Hitrost predvajanja", Subtitles: t4, "subtitles off": "podnapisi izklopljeni", Captions: o4, "captions off": "zvo\u010Dni zapis izklopljen", Chapters: n4, Descriptions: a4, "descriptions off": "opisi izklopljeni", "Audio Track": "Zvo\u010Dni posnetek", "Volume Level": "Raven glasnosti", "You aborted the media playback": "Prekinili ste predvajanje.", "A network error caused the media download to fail part-way.": "Prenos multimedijske datoteke ni uspel zaradi napake v omre\u017Eju.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Multimedijske datoteke ni bilo mogo\u010De nalo\u017Eiti zaradi napake na stre\u017Eniku oziroma omre\u017Eju ali ker ta oblika ni podprta.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Predvajanje datoteke je bilo prekinjeno zaradi napak v datoteki ali ker uporablja funkcije, ki jih brskalnik ne podpira.", "No compatible source was found for this media.": "Za to datoteko ni bil najden noben zdru\u017Eljiv vir.", "The media is encrypted and we do not have the keys to decrypt it.": "Datoteka je \u0161ifrirana in predvajalnik nima klju\u010Dev za njeno de\u0161ifriranje.", "Play Video": "Predvajaj", Close: s4, "Close Modal Dialog": "Zapri modalno okno", "Modal Window": "Modalno okno", "This is a modal window": "To je modalno okno", "This modal can be closed by pressing the Escape key or activating the close button.": "To okno lahko zaprete s pritiskom na tipko Escape ali z aktiviranjem gumba za zapiranje.", ", opens captions settings dialog": ", odpre nastavitve za zvo\u010Dni zapis", ", opens subtitles settings dialog": ", odpre nastavitve za podnapise", ", opens descriptions settings dialog": ", odpre nastavitve za opis", ", selected": ", izbrano", "captions settings": "nastavitve zvo\u010Dnega zapisa", "subtitles settings": "nastavitve podnapisov", "descriptions settings": "nastavitve opisa", Text: i4, White: r4, Black: l4, Red: c4, Green: u4, Blue: d4, Yellow: p4, Magenta: m4, Cyan: f4, Background: g4, Window: h4, Transparent: D4, "Semi-Transparent": "Delno prozorno", Opaque: v4, "Font Size": "Velikost pisave", "Text Edge Style": "Slog roba besedila", None: y4, Raised: b4, Depressed: w4, Uniform: k4, Dropshadow: C4, "Font Family": "Dru\u017Eina pisave", "Small Caps": "Male \u010Drke", Reset: x4, "restore all settings to the default values": "obnovi vse nastavitve na privzete vrednosti", Done: S4, "Caption Settings Dialog": "Pogovorno okno za nastavitve zvo\u010Dnega zapisa", "Beginning of dialog window. Escape will cancel and close the window.": "Za\u010Detek pogovornega okna. Escape bo preklical in zaprl okno.", "End of dialog window.": "Konec pogovornega okna.", "{1} is loading.": "{1} se nalaga.", "Exit Picture-in-Picture": "Izhod iz slike v sliki", "Picture-in-Picture": "Slika v sliki" };
});
var ai = {};
h(ai, { Captions: () => _4, Chapters: () => L4, Duration: () => T4, Fullscreen: () => B4, LIVE: () => P4, Loaded: () => j4, Mute: () => R4, Pause: () => F4, Play: () => E4, Progress: () => A4, Subtitles: () => z4, Unmute: () => M4, default: () => DL });
var E4;
var F4;
var T4;
var P4;
var j4;
var A4;
var B4;
var R4;
var M4;
var z4;
var _4;
var L4;
var DL;
var si = p(() => {
  "use strict";
  E4 = "Pusti", F4 = "Pauza", T4 = "Vreme trajanja", P4 = "U\u017DIVO", j4 = "U\u010Ditan", A4 = "Progres", B4 = "Pun ekran", R4 = "Prigu\u0161en", M4 = "Ne-prigu\u0161en", z4 = "Podnaslov", _4 = "Titlovi", L4 = "Poglavlja", DL = { Play: E4, Pause: F4, "Current Time": "Trenutno vreme", Duration: T4, "Remaining Time": "Preostalo vreme", "Stream Type": "Na\u010Din strimovanja", LIVE: P4, Loaded: j4, Progress: A4, Fullscreen: B4, "Exit Fullscreen": "Mali ekran", Mute: R4, Unmute: M4, "Playback Rate": "Stopa reprodukcije", Subtitles: z4, "subtitles off": "Podnaslov deaktiviran", Captions: _4, "captions off": "Titlovi deaktivirani", Chapters: L4, "You aborted the media playback": "Isklju\u010Dili ste reprodukciju videa.", "A network error caused the media download to fail part-way.": "Video se prestao preuzimati zbog gre\u0161ke na mre\u017Ei.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Video se ne mo\u017Ee reproducirati zbog servera, gre\u0161ke u mre\u017Ei ili format nije podr\u017Ean.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Reprodukcija videa je zaustavljenja zbog gre\u0161ke u formatu ili zbog verzije va\u0161eg pretra\u017Eiva\u010Da.", "No compatible source was found for this media.": "Nije na\u0111en nijedan kompatibilan izvor ovog videa." };
});
var ii = {};
h(ii, { Background: () => N4, Black: () => I4, Blue: () => $4, Captions: () => O4, Casual: () => U4, Chapters: () => V4, Close: () => W4, Cyan: () => q4, Depressed: () => H4, Descriptions: () => G4, Done: () => Y4, Dropshadow: () => K4, Duration: () => Z4, Fullscreen: () => J4, Green: () => X4, LIVE: () => Q4, Loaded: () => e6, Magenta: () => t6, Mute: () => o6, None: () => n6, Opaque: () => a6, Pause: () => s6, Play: () => i6, Progress: () => r6, Raised: () => l6, Red: () => c6, Replay: () => u6, Reset: () => d6, Script: () => p6, Subtitles: () => m6, Text: () => f6, Transparent: () => g6, Uniform: () => h6, Unmute: () => D6, White: () => v6, Window: () => y6, Yellow: () => b6, default: () => vL });
var N4;
var I4;
var $4;
var O4;
var U4;
var V4;
var W4;
var q4;
var H4;
var G4;
var Y4;
var K4;
var Z4;
var J4;
var X4;
var Q4;
var e6;
var t6;
var o6;
var n6;
var a6;
var s6;
var i6;
var r6;
var l6;
var c6;
var u6;
var d6;
var p6;
var m6;
var f6;
var g6;
var h6;
var D6;
var v6;
var y6;
var b6;
var vL;
var ri = p(() => {
  "use strict";
  N4 = "Bakgrund", I4 = "Svart", $4 = "Bl\xE5", O4 = "Text p\xE5", U4 = "Casual", V4 = "Kapitel", W4 = "St\xE4ng", q4 = "Cyan", H4 = "Deprimerad", G4 = "Beskrivningar", Y4 = "Klar", K4 = "DropSkugga", Z4 = "Total tid", J4 = "Fullsk\xE4rm", X4 = "Gr\xF6n", Q4 = "LIVE", e6 = "Laddad", t6 = "Magenta", o6 = "Ljud av", n6 = "Ingen", a6 = "Opak", s6 = "Pausa", i6 = "Spela", r6 = "F\xF6rlopp", l6 = "Raised", c6 = "R\xF6d", u6 = "Spela upp igen", d6 = "\xC5terst\xE4ll", p6 = "Manus", m6 = "Text p\xE5", f6 = "Text", g6 = "Transparent", h6 = "Uniform", D6 = "Ljud p\xE5", v6 = "Vit", y6 = "F\xF6nster", b6 = "Gul", vL = { ", opens captions settings dialog": ", \xF6ppnar dialogruta f\xF6r textning", ", opens descriptions settings dialog": ", \xF6ppnar dialogruta f\xF6r inst\xE4llningar", ", opens subtitles settings dialog": ", \xF6ppnar dialogruta f\xF6r undertexter", ", selected": ", vald", "A network error caused the media download to fail part-way.": "Ett n\xE4tverksfel gjorde att nedladdningen av videon avbr\xF6ts.", "Audio Player": "Ljudspelare", "Audio Track": "Ljudsp\xE5r", Background: N4, "Beginning of dialog window. Escape will cancel and close the window.": "B\xF6rjan av dialogf\xF6nster. Escape avbryter och st\xE4nger f\xF6nstret.", Black: I4, Blue: $4, "Caption Settings Dialog": "Dialogruta f\xF6r textningsinst\xE4llningar", Captions: O4, Casual: U4, Chapters: V4, Close: W4, "Close Modal Dialog": "St\xE4ng dialogruta", "Current Time": "Aktuell tid", Cyan: q4, Depressed: H4, Descriptions: G4, Done: Y4, Dropshadow: K4, Duration: Z4, "End of dialog window.": "Slutet av dialogf\xF6nster.", "Font Family": "Typsnittsfamilj", "Font Size": "Textstorlek", Fullscreen: J4, Green: X4, LIVE: Q4, Loaded: e6, Magenta: t6, "Modal Window": "dialogruta", "Monospace Sans-Serif": "Monospace Sans-Serif", "Monospace Serif": "Monospace Serif", Mute: o6, "No compatible source was found for this media.": "Det gick inte att hitta n\xE5gon kompatibel k\xE4lla f\xF6r den h\xE4r videon.", "Exit Fullscreen": "Ej fullsk\xE4rm", None: n6, Opaque: a6, Pause: s6, Play: i6, "Play Video": "Spela upp video", "Playback Rate": "Uppspelningshastighet", Progress: r6, "Progress Bar": "f\xF6rloppsm\xE4tare", "Proportional Sans-Serif": "Proportionell Sans-Serif", "Proportional Serif": "Proportionell Serif", Raised: l6, Red: c6, "Remaining Time": "\xC5terst\xE5ende tid", Replay: u6, Reset: d6, Script: p6, "Seek to live, currently behind live": "\xC5terg\xE5 till live, uppspelningen \xE4r inte live", "Seek to live, currently playing live": "\xC5terg\xE5 till live, uppspelningen \xE4r live", "Semi-Transparent": "Semi-transparent", "Small Caps": "Small-Caps", "Stream Type": "Str\xF6mningstyp", Subtitles: m6, Text: f6, "Text Edge Style": "Textkantstil", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Det gick inte att ladda videon, antingen p\xE5 grund av ett server- eller n\xE4tverksfel, eller f\xF6r att formatet inte st\xF6ds.", "The media is encrypted and we do not have the keys to decrypt it.": "Mediat \xE4r krypterat och vi har inte nycklarna f\xF6r att dekryptera det.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Uppspelningen avbr\xF6ts p\xE5 grund av att videon \xE4r skadad, eller ocks\xE5 f\xF6r att videon anv\xE4nder funktioner som din webbl\xE4sare inte st\xF6der.", "This is a modal window": "Det h\xE4r \xE4r ett dialogruta", "This modal can be closed by pressing the Escape key or activating the close button.": "Den h\xE4r dialogrutan kan st\xE4ngas genom att trycka p\xE5 Escape-tangenten eller st\xE4ng knappen.", Transparent: g6, Uniform: h6, Unmute: D6, "Video Player": "Videospelare", "Volume Level": "Volymniv\xE5", White: v6, Window: y6, Yellow: b6, "You aborted the media playback": "Du har avbrutit videouppspelningen.", "captions off": "Text av", "captions settings": "textningsinst\xE4llningar", "descriptions off": "beskrivningar av", "descriptions settings": "beskrivningsinst\xE4llningar", "progress bar timing: currentTime={1} duration={2}": "{1} av {2}", "restore all settings to the default values": "\xE5terst\xE4ll alla inst\xE4llningar till standardv\xE4rden", "subtitles off": "Text av", "subtitles settings": "undertextsinst\xE4llningar", "{1} is loading.": "{1} laddar." };
});
var li = {};
h(li, { Background: () => q6, Black: () => N6, Blue: () => O6, Captions: () => B6, Casual: () => eF, Chapters: () => R6, Close: () => z6, Cyan: () => W6, Depressed: () => J6, Descriptions: () => M6, Done: () => nF, Dropshadow: () => Q6, Duration: () => x6, Fullscreen: () => T6, Green: () => $6, LIVE: () => S6, Loaded: () => E6, Magenta: () => V6, Mute: () => P6, None: () => K6, Opaque: () => Y6, Pause: () => k6, Play: () => w6, Progress: () => F6, Raised: () => Z6, Red: () => I6, Replay: () => C6, Reset: () => oF, Script: () => tF, Subtitles: () => A6, Text: () => _6, Transparent: () => G6, Uniform: () => X6, Unmute: () => j6, White: () => L6, Window: () => H6, Yellow: () => U6, default: () => yL });
var w6;
var k6;
var C6;
var x6;
var S6;
var E6;
var F6;
var T6;
var P6;
var j6;
var A6;
var B6;
var R6;
var M6;
var z6;
var _6;
var L6;
var N6;
var I6;
var $6;
var O6;
var U6;
var V6;
var W6;
var q6;
var H6;
var G6;
var Y6;
var K6;
var Z6;
var J6;
var X6;
var Q6;
var eF;
var tF;
var oF;
var nF;
var yL;
var ci = p(() => {
  "use strict";
  w6 = "\u0C2A\u0C4D\u0C32\u0C47", k6 = "\u0C2A\u0C3E\u0C1C\u0C4D", C6 = "\u0C30\u0C40\u0C2A\u0C4D\u0C32\u0C47", x6 = "\u0C35\u0C4D\u0C2F\u0C35\u0C27\u0C3F", S6 = "\u0C32\u0C48\u0C35\u0C4D", E6 = "\u0C32\u0C4B\u0C21\u0C4D \u0C1A\u0C47\u0C2F\u0C2C\u0C21\u0C3F\u0C02\u0C26\u0C3F", F6 = "\u0C2A\u0C41\u0C30\u0C4B\u0C17\u0C24\u0C3F", T6 = "\u0C2A\u0C42\u0C30\u0C4D\u0C24\u0C3F \u0C38\u0C4D\u0C15\u0C4D\u0C30\u0C40\u0C28\u0C4D", P6 = "\u0C2E\u0C4D\u0C2F\u0C42\u0C1F\u0C4D", j6 = "\u0C05\u0C28\u0C4D\u0C2E\u0C4D\u0C2F\u0C42\u0C1F\u0C4D \u0C1A\u0C47\u0C2F\u0C02\u0C21\u0C3F", A6 = "\u0C09\u0C2A\u0C36\u0C40\u0C30\u0C4D\u0C37\u0C3F\u0C15\u0C32\u0C41", B6 = "\u0C36\u0C40\u0C30\u0C4D\u0C37\u0C3F\u0C15\u0C32\u0C41", R6 = "\u0C05\u0C27\u0C4D\u0C2F\u0C3E\u0C2F\u0C3E\u0C32\u0C41", M6 = "\u0C35\u0C3F\u0C35\u0C30\u0C23\u0C32\u0C41", z6 = "\u0C2E\u0C42\u0C38\u0C3F\u0C35\u0C47\u0C2F\u0C02\u0C21\u0C3F", _6 = "\u0C35\u0C1A\u0C28\u0C02", L6 = "\u0C24\u0C46\u0C32\u0C41\u0C2A\u0C41", N6 = "\u0C28\u0C32\u0C41\u0C2A\u0C41", I6 = "\u0C0E\u0C30\u0C41\u0C2A\u0C41", $6 = "\u0C06\u0C15\u0C41\u0C2A\u0C1A\u0C4D\u0C1A", O6 = "\u0C28\u0C40\u0C32\u0C02", U6 = "\u0C2A\u0C38\u0C41\u0C2A\u0C41", V6 = "\u0C2E\u0C46\u0C1C\u0C46\u0C02\u0C1F\u0C3E", W6 = "\u0C38\u0C3F\u0C2F\u0C3E\u0C28\u0C4D", q6 = "\u0C28\u0C47\u0C2A\u0C27\u0C4D\u0C2F\u0C02", H6 = "\u0C15\u0C3F\u0C1F\u0C3F\u0C15\u0C40", G6 = "\u0C2A\u0C3E\u0C30\u0C26\u0C30\u0C4D\u0C36\u0C15", Y6 = "\u0C05\u0C2A\u0C3E\u0C30\u0C26\u0C30\u0C4D\u0C36\u0C15", K6 = "\u0C0F\u0C26\u0C40 \u0C32\u0C47\u0C26\u0C41", Z6 = "\u0C2A\u0C46\u0C02\u0C1A\u0C2C\u0C21\u0C3F\u0C02\u0C26\u0C3F", J6 = "\u0C05\u0C23\u0C17\u0C3E\u0C30\u0C3F\u0C28", X6 = "\u0C0F\u0C15\u0C30\u0C40\u0C24\u0C3F", Q6 = "\u0C21\u0C4D\u0C30\u0C3E\u0C2A\u0C4D\u200C\u0C37\u0C3E\u0C21\u0C4B", eF = "\u0C38\u0C3E\u0C27\u0C3E\u0C30\u0C23", tF = "\u0C38\u0C4D\u0C15\u0C4D\u0C30\u0C3F\u0C2A\u0C4D\u0C1F\u0C4D", oF = "\u0C30\u0C40\u0C38\u0C46\u0C1F\u0C4D \u0C1A\u0C47\u0C2F\u0C02\u0C21\u0C3F", nF = "\u0C2A\u0C42\u0C30\u0C4D\u0C24\u0C2F\u0C3F\u0C02\u0C26\u0C3F", yL = { "Audio Player": "\u0C06\u0C21\u0C3F\u0C2F\u0C4B \u0C2A\u0C4D\u0C32\u0C47\u0C2F\u0C30\u0C4D", "Video Player": "\u0C35\u0C40\u0C21\u0C3F\u0C2F\u0C4B \u0C2A\u0C4D\u0C32\u0C47\u0C2F\u0C30\u0C4D", Play: w6, Pause: k6, Replay: C6, "Current Time": "\u0C2A\u0C4D\u0C30\u0C38\u0C4D\u0C24\u0C41\u0C24 \u0C38\u0C2E\u0C2F\u0C02", Duration: x6, "Remaining Time": "\u0C2E\u0C3F\u0C17\u0C3F\u0C32\u0C3F\u0C28 \u0C38\u0C2E\u0C2F\u0C02", "Stream Type": "\u0C38\u0C4D\u0C1F\u0C4D\u0C30\u0C40\u0C2E\u0C4D \u0C30\u0C15\u0C02", LIVE: S6, "Seek to live, currently behind live": "\u0C2A\u0C4D\u0C30\u0C24\u0C4D\u0C2F\u0C15\u0C4D\u0C37 \u0C2A\u0C4D\u0C30\u0C38\u0C3E\u0C30\u0C3E\u0C28\u0C3F\u0C15\u0C3F \u0C35\u0C46\u0C33\u0C4D\u0C33\u0C02\u0C21\u0C3F, \u0C2A\u0C4D\u0C30\u0C38\u0C4D\u0C24\u0C41\u0C24\u0C02 \u0C2A\u0C4D\u0C30\u0C24\u0C4D\u0C2F\u0C15\u0C4D\u0C37 \u0C2A\u0C4D\u0C30\u0C38\u0C3E\u0C30\u0C3E\u0C28\u0C3F\u0C15\u0C3F \u0C35\u0C46\u0C28\u0C41\u0C15\u0C2C\u0C21\u0C3F \u0C09\u0C02\u0C26\u0C3F", "Seek to live, currently playing live": "\u0C2A\u0C4D\u0C30\u0C24\u0C4D\u0C2F\u0C15\u0C4D\u0C37 \u0C2A\u0C4D\u0C30\u0C38\u0C3E\u0C30\u0C3E\u0C28\u0C3F\u0C15\u0C3F \u0C35\u0C46\u0C33\u0C4D\u0C33\u0C02\u0C21\u0C3F, \u0C2A\u0C4D\u0C30\u0C38\u0C4D\u0C24\u0C41\u0C24\u0C02 \u0C2A\u0C4D\u0C30\u0C24\u0C4D\u0C2F\u0C15\u0C4D\u0C37 \u0C2A\u0C4D\u0C30\u0C38\u0C3E\u0C30\u0C02 \u0C05\u0C35\u0C41\u0C24\u0C4B\u0C02\u0C26\u0C3F", Loaded: E6, Progress: F6, "Progress Bar": "\u0C2A\u0C4D\u0C30\u0C4B\u0C17\u0C4D\u0C30\u0C46\u0C38\u0C4D \u0C2C\u0C3E\u0C30\u0C4D", "progress bar timing: currentTime={1} duration={2}": "{1} \u0C2F\u0C4A\u0C15\u0C4D\u0C15 {2}", Fullscreen: T6, "Exit Fullscreen": "\u0C2A\u0C42\u0C30\u0C4D\u0C24\u0C3F \u0C38\u0C4D\u0C15\u0C4D\u0C30\u0C40\u0C28\u0C4D \u0C28\u0C41\u0C02\u0C21\u0C3F \u0C28\u0C3F\u0C37\u0C4D\u0C15\u0C4D\u0C30\u0C2E\u0C3F\u0C02\u0C1A\u0C02\u0C21\u0C3F", Mute: P6, Unmute: j6, "Playback Rate": "\u0C2A\u0C4D\u0C32\u0C47\u0C2C\u0C4D\u0C2F\u0C3E\u0C15\u0C4D \u0C30\u0C47\u0C1F\u0C4D", Subtitles: A6, "subtitles off": "\u0C09\u0C2A\u0C36\u0C40\u0C30\u0C4D\u0C37\u0C3F\u0C15\u0C32\u0C41 \u0C06\u0C2B\u0C4D \u0C1A\u0C47\u0C2F\u0C02\u0C21\u0C3F", Captions: B6, "captions off": "\u0C36\u0C40\u0C30\u0C4D\u0C37\u0C3F\u0C15\u0C32\u0C41 \u0C06\u0C2B\u0C4D \u0C1A\u0C47\u0C2F\u0C02\u0C21\u0C3F", Chapters: R6, Descriptions: M6, "descriptions off": "\u0C35\u0C3F\u0C35\u0C30\u0C23\u0C32\u0C41 \u0C06\u0C2B\u0C4D \u0C1A\u0C47\u0C2F\u0C02\u0C21\u0C3F", "Audio Track": "\u0C06\u0C21\u0C3F\u0C2F\u0C4B \u0C1F\u0C4D\u0C30\u0C3E\u0C15\u0C4D", "Volume Level": "\u0C35\u0C3E\u0C32\u0C4D\u0C2F\u0C42\u0C2E\u0C4D \u0C38\u0C4D\u0C25\u0C3E\u0C2F\u0C3F", "You aborted the media playback": "\u0C2E\u0C40\u0C30\u0C41 \u0C2E\u0C40\u0C21\u0C3F\u0C2F\u0C3E \u0C2A\u0C4D\u0C32\u0C47\u0C2C\u0C4D\u0C2F\u0C3E\u0C15\u0C4D\u200C\u0C28\u0C41 \u0C30\u0C26\u0C4D\u0C26\u0C41 \u0C1A\u0C47\u0C36\u0C3E\u0C30\u0C41", "A network error caused the media download to fail part-way.": "\u0C28\u0C46\u0C1F\u0C4D\u200C\u0C35\u0C30\u0C4D\u0C15\u0C4D \u0C32\u0C4B\u0C2A\u0C02 \u0C35\u0C32\u0C28 \u0C2E\u0C40\u0C21\u0C3F\u0C2F\u0C3E \u0C21\u0C4C\u0C28\u0C4D\u200C\u0C32\u0C4B\u0C21\u0C4D \u0C35\u0C3F\u0C2B\u0C32\u0C2E\u0C48\u0C02\u0C26\u0C3F.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\u0C38\u0C30\u0C4D\u0C35\u0C30\u0C4D \u0C32\u0C47\u0C26\u0C3E \u0C28\u0C46\u0C1F\u0C4D\u200C\u0C35\u0C30\u0C4D\u0C15\u0C4D \u0C35\u0C3F\u0C2B\u0C32\u0C2E\u0C48\u0C28\u0C02\u0C26\u0C41\u0C28 \u0C32\u0C47\u0C26\u0C3E \u0C2B\u0C3E\u0C30\u0C4D\u0C2E\u0C3E\u0C1F\u0C4D\u200C\u0C15\u0C41 \u0C2E\u0C26\u0C4D\u0C26\u0C24\u0C41 \u0C32\u0C47\u0C28\u0C02\u0C26\u0C41\u0C28 \u0C2E\u0C40\u0C21\u0C3F\u0C2F\u0C3E\u0C28\u0C41 \u0C32\u0C4B\u0C21\u0C4D \u0C1A\u0C47\u0C2F\u0C21\u0C02 \u0C38\u0C3E\u0C27\u0C4D\u0C2F\u0C02 \u0C15\u0C3E\u0C32\u0C47\u0C26\u0C41.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\u0C05\u0C35\u0C3F\u0C28\u0C40\u0C24\u0C3F \u0C38\u0C2E\u0C38\u0C4D\u0C2F \u0C15\u0C3E\u0C30\u0C23\u0C02\u0C17\u0C3E \u0C32\u0C47\u0C26\u0C3E \u0C2E\u0C40 \u0C2C\u0C4D\u0C30\u0C4C\u0C1C\u0C30\u0C4D \u0C2E\u0C26\u0C4D\u0C26\u0C24\u0C41 \u0C07\u0C35\u0C4D\u0C35\u0C28\u0C3F \u0C32\u0C15\u0C4D\u0C37\u0C23\u0C3E\u0C32\u0C28\u0C41 \u0C2E\u0C40\u0C21\u0C3F\u0C2F\u0C3E \u0C09\u0C2A\u0C2F\u0C4B\u0C17\u0C3F\u0C02\u0C1A\u0C3F\u0C28\u0C02\u0C26\u0C41\u0C28 \u0C2E\u0C40\u0C21\u0C3F\u0C2F\u0C3E \u0C2A\u0C4D\u0C32\u0C47\u0C2C\u0C4D\u0C2F\u0C3E\u0C15\u0C4D \u0C28\u0C3F\u0C32\u0C3F\u0C2A\u0C3F\u0C35\u0C47\u0C2F\u0C2C\u0C21\u0C3F\u0C02\u0C26\u0C3F.", "No compatible source was found for this media.": "\u0C08 \u0C2E\u0C40\u0C21\u0C3F\u0C2F\u0C3E\u0C15\u0C41 \u0C05\u0C28\u0C41\u0C15\u0C42\u0C32\u0C2E\u0C48\u0C28 \u0C2E\u0C42\u0C32\u0C02 \u0C15\u0C28\u0C41\u0C17\u0C4A\u0C28\u0C2C\u0C21\u0C32\u0C47\u0C26\u0C41.", "The media is encrypted and we do not have the keys to decrypt it.": "\u0C2E\u0C40\u0C21\u0C3F\u0C2F\u0C3E \u0C17\u0C41\u0C2A\u0C4D\u0C24\u0C40\u0C15\u0C30\u0C3F\u0C02\u0C1A\u0C2C\u0C21\u0C3F\u0C02\u0C26\u0C3F \u0C2E\u0C30\u0C3F\u0C2F\u0C41 \u0C26\u0C3E\u0C28\u0C3F\u0C28\u0C3F \u0C21\u0C40\u0C15\u0C4D\u0C30\u0C3F\u0C2A\u0C4D\u0C1F\u0C4D \u0C1A\u0C47\u0C2F\u0C21\u0C3E\u0C28\u0C3F\u0C15\u0C3F \u0C2E\u0C3E\u0C15\u0C41 \u0C15\u0C40\u0C32\u0C41 \u0C32\u0C47\u0C35\u0C41.", "Play Video": "\u0C35\u0C40\u0C21\u0C3F\u0C2F\u0C4B \u0C2A\u0C4D\u0C32\u0C47 \u0C1A\u0C47\u0C2F\u0C02\u0C21\u0C3F", Close: z6, "Close Modal Dialog": "\u0C2E\u0C4B\u0C21\u0C32\u0C4D \u0C21\u0C48\u0C32\u0C3E\u0C17\u0C4D\u200C\u0C28\u0C41 \u0C2E\u0C42\u0C38\u0C3F\u0C35\u0C47\u0C2F\u0C02\u0C21\u0C3F", "Modal Window": "\u0C2E\u0C4B\u0C21\u0C32\u0C4D \u0C35\u0C3F\u0C02\u0C21\u0C4B", "This is a modal window": "\u0C07\u0C26\u0C3F \u0C2E\u0C4B\u0C21\u0C32\u0C4D \u0C35\u0C3F\u0C02\u0C21\u0C4B", "This modal can be closed by pressing the Escape key or activating the close button.": "\u0C0E\u0C38\u0C4D\u0C15\u0C47\u0C2A\u0C4D \u0C15\u0C40\u0C28\u0C3F \u0C28\u0C4A\u0C15\u0C4D\u0C15\u0C21\u0C02 \u0C26\u0C4D\u0C35\u0C3E\u0C30\u0C3E \u0C32\u0C47\u0C26\u0C3E \u0C15\u0C4D\u0C32\u0C4B\u0C1C\u0C4D \u0C2C\u0C1F\u0C28\u0C4D\u200C\u0C28\u0C41 \u0C2F\u0C3E\u0C15\u0C4D\u0C1F\u0C3F\u0C35\u0C47\u0C1F\u0C4D \u0C1A\u0C47\u0C2F\u0C21\u0C02 \u0C26\u0C4D\u0C35\u0C3E\u0C30\u0C3E \u0C08 \u0C2E\u0C4B\u0C21\u0C32\u0C4D\u200C\u0C28\u0C41 \u0C2E\u0C42\u0C38\u0C3F\u0C35\u0C47\u0C2F\u0C35\u0C1A\u0C4D\u0C1A\u0C41.", ", opens captions settings dialog": ", \u0C36\u0C40\u0C30\u0C4D\u0C37\u0C3F\u0C15\u0C32 \u0C38\u0C46\u0C1F\u0C4D\u0C1F\u0C3F\u0C02\u0C17\u0C4D\u200C\u0C32 \u0C21\u0C48\u0C32\u0C3E\u0C17\u0C4D\u200C\u0C28\u0C41 \u0C24\u0C46\u0C30\u0C41\u0C38\u0C4D\u0C24\u0C41\u0C02\u0C26\u0C3F", ", opens subtitles settings dialog": ", \u0C09\u0C2A\u0C36\u0C40\u0C30\u0C4D\u0C37\u0C3F\u0C15\u0C32 \u0C38\u0C46\u0C1F\u0C4D\u0C1F\u0C3F\u0C02\u0C17\u0C41\u0C32 \u0C21\u0C48\u0C32\u0C3E\u0C17\u0C4D\u200C\u0C28\u0C41 \u0C24\u0C46\u0C30\u0C41\u0C38\u0C4D\u0C24\u0C41\u0C02\u0C26\u0C3F", ", opens descriptions settings dialog": ", \u0C35\u0C3F\u0C35\u0C30\u0C23\u0C32 \u0C38\u0C46\u0C1F\u0C4D\u0C1F\u0C3F\u0C02\u0C17\u0C41\u0C32 \u0C21\u0C48\u0C32\u0C3E\u0C17\u0C4D\u200C\u0C28\u0C41 \u0C24\u0C46\u0C30\u0C41\u0C38\u0C4D\u0C24\u0C41\u0C02\u0C26\u0C3F", ", selected": ", \u0C0E\u0C02\u0C1A\u0C41\u0C15\u0C4B\u0C2C\u0C21\u0C3F\u0C02\u0C26\u0C3F", "captions settings": "\u0C36\u0C40\u0C30\u0C4D\u0C37\u0C3F\u0C15\u0C32 \u0C38\u0C46\u0C1F\u0C4D\u0C1F\u0C3F\u0C02\u0C17\u0C41\u0C32\u0C41", "subtitles settings": "\u0C09\u0C2A\u0C36\u0C40\u0C30\u0C4D\u0C37\u0C3F\u0C15\u0C32 \u0C38\u0C46\u0C1F\u0C4D\u0C1F\u0C3F\u0C02\u0C17\u0C41\u0C32\u0C41", "descriptions settings": "\u0C35\u0C3F\u0C35\u0C30\u0C23\u0C32 \u0C38\u0C46\u0C1F\u0C4D\u0C1F\u0C3F\u0C02\u0C17\u0C41\u0C32\u0C41", Text: _6, White: L6, Black: N6, Red: I6, Green: $6, Blue: O6, Yellow: U6, Magenta: V6, Cyan: W6, Background: q6, Window: H6, Transparent: G6, "Semi-Transparent": "\u0C38\u0C46\u0C2E\u0C40-\u0C2A\u0C3E\u0C30\u0C26\u0C30\u0C4D\u0C36\u0C15", Opaque: Y6, "Font Size": "\u0C2B\u0C3E\u0C02\u0C1F\u0C4D \u0C2A\u0C30\u0C3F\u0C2E\u0C3E\u0C23\u0C02", "Text Edge Style": "\u0C1F\u0C46\u0C15\u0C4D\u0C38\u0C4D\u0C1F\u0C4D \u0C0E\u0C21\u0C4D\u0C1C\u0C4D \u0C36\u0C48\u0C32\u0C3F", None: K6, Raised: Z6, Depressed: J6, Uniform: X6, Dropshadow: Q6, "Font Family": "\u0C2B\u0C3E\u0C02\u0C1F\u0C4D \u0C15\u0C41\u0C1F\u0C41\u0C02\u0C2C\u0C02", "Proportional Sans-Serif": "\u0C2A\u0C4D\u0C30\u0C4A\u0C2A\u0C4B\u0C30\u0C4D\u0C37\u0C28\u0C4D \u0C38\u0C3E\u0C28\u0C4D\u0C38\u0C4D-\u0C38\u0C46\u0C30\u0C3F\u0C2B\u0C4D", "Monospace Sans-Serif": "\u0C2E\u0C4B\u0C28\u0C4B\u0C38\u0C4D\u0C2A\u0C47\u0C38\u0C4D \u0C38\u0C3E\u0C28\u0C4D\u0C38\u0C4D-\u0C38\u0C46\u0C30\u0C3F\u0C2B\u0C4D", "Proportional Serif": "\u0C2A\u0C4D\u0C30\u0C4A\u0C2A\u0C4B\u0C30\u0C4D\u0C37\u0C28\u0C4D \u0C38\u0C46\u0C30\u0C3F\u0C2B\u0C4D", "Monospace Serif": "\u0C2E\u0C4B\u0C28\u0C4B\u0C38\u0C4D\u0C2A\u0C47\u0C38\u0C4D \u0C38\u0C46\u0C30\u0C3F\u0C2B\u0C4D", Casual: eF, Script: tF, "Small Caps": "\u0C1A\u0C3F\u0C28\u0C4D\u0C28 \u0C15\u0C4D\u0C2F\u0C3E\u0C2A\u0C4D\u0C38\u0C4D", Reset: oF, "restore all settings to the default values": "\u0C05\u0C28\u0C4D\u0C28\u0C3F \u0C38\u0C46\u0C1F\u0C4D\u0C1F\u0C3F\u0C02\u0C17\u0C41\u0C32\u0C28\u0C41 \u0C21\u0C3F\u0C2B\u0C3E\u0C32\u0C4D\u0C1F\u0C4D \u0C35\u0C3F\u0C32\u0C41\u0C35\u0C32\u0C15\u0C41 \u0C2A\u0C41\u0C28\u0C30\u0C41\u0C26\u0C4D\u0C27\u0C30\u0C3F\u0C02\u0C1A\u0C02\u0C21\u0C3F", Done: nF, "Caption Settings Dialog": "\u0C36\u0C40\u0C30\u0C4D\u0C37\u0C3F\u0C15 \u0C38\u0C46\u0C1F\u0C4D\u0C1F\u0C3F\u0C02\u0C17\u0C4D\u200C\u0C32 \u0C21\u0C48\u0C32\u0C3E\u0C17\u0C4D", "Beginning of dialog window. Escape will cancel and close the window.": "\u0C21\u0C48\u0C32\u0C3E\u0C17\u0C4D \u0C35\u0C3F\u0C02\u0C21\u0C4B \u0C2A\u0C4D\u0C30\u0C3E\u0C30\u0C02\u0C2D\u0C02. \u0C0E\u0C38\u0C4D\u0C15\u0C47\u0C2A\u0C4D \u0C35\u0C3F\u0C02\u0C21\u0C4B\u0C28\u0C41 \u0C30\u0C26\u0C4D\u0C26\u0C41 \u0C1A\u0C47\u0C38\u0C4D\u0C24\u0C41\u0C02\u0C26\u0C3F \u0C2E\u0C30\u0C3F\u0C2F\u0C41 \u0C2E\u0C42\u0C38\u0C3F\u0C35\u0C47\u0C38\u0C4D\u0C24\u0C41\u0C02\u0C26\u0C3F.", "End of dialog window.": "\u0C21\u0C48\u0C32\u0C3E\u0C17\u0C4D \u0C35\u0C3F\u0C02\u0C21\u0C4B \u0C2E\u0C41\u0C17\u0C3F\u0C02\u0C2A\u0C41.", "{1} is loading.": "{1} \u0C32\u0C4B\u0C21\u0C4D \u0C05\u0C35\u0C41\u0C24\u0C4B\u0C02\u0C26\u0C3F.", "Exit Picture-in-Picture": "\u0C2A\u0C3F\u0C15\u0C4D\u0C1A\u0C30\u0C4D-\u0C07\u0C28\u0C4D-\u0C2A\u0C3F\u0C15\u0C4D\u0C1A\u0C30\u0C4D \u0C28\u0C41\u0C02\u0C21\u0C3F \u0C28\u0C3F\u0C37\u0C4D\u0C15\u0C4D\u0C30\u0C2E\u0C3F\u0C02\u0C1A\u0C02\u0C21\u0C3F", "Picture-in-Picture": "\u0C2A\u0C3F\u0C15\u0C4D\u0C1A\u0C30\u0C4D-\u0C07\u0C28\u0C4D-\u0C2A\u0C3F\u0C15\u0C4D\u0C1A\u0C30\u0C4D" };
});
var ui = {};
h(ui, { Background: () => TF, Black: () => wF, Blue: () => xF, Captions: () => gF, Casual: () => LF, Chapters: () => hF, Close: () => vF, Cyan: () => FF, Depressed: () => MF, Descriptions: () => DF, Done: () => $F, Dropshadow: () => _F, Duration: () => rF, Fullscreen: () => dF, Green: () => CF, LIVE: () => lF, Loaded: () => cF, Magenta: () => EF, Mute: () => pF, None: () => BF, Opaque: () => AF, Pause: () => sF, Play: () => aF, Progress: () => uF, Raised: () => RF, Red: () => kF, Replay: () => iF, Reset: () => IF, Script: () => NF, Subtitles: () => fF, Text: () => yF, Transparent: () => jF, Uniform: () => zF, Unmute: () => mF, White: () => bF, Window: () => PF, Yellow: () => SF, default: () => bL });
var aF;
var sF;
var iF;
var rF;
var lF;
var cF;
var uF;
var dF;
var pF;
var mF;
var fF;
var gF;
var hF;
var DF;
var vF;
var yF;
var bF;
var wF;
var kF;
var CF;
var xF;
var SF;
var EF;
var FF;
var TF;
var PF;
var jF;
var AF;
var BF;
var RF;
var MF;
var zF;
var _F;
var LF;
var NF;
var IF;
var $F;
var bL;
var di = p(() => {
  "use strict";
  aF = "\u0E40\u0E25\u0E48\u0E19", sF = "\u0E2B\u0E22\u0E38\u0E14\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27", iF = "\u0E40\u0E25\u0E48\u0E19\u0E0B\u0E49\u0E33", rF = "\u0E23\u0E30\u0E22\u0E30\u0E40\u0E27\u0E25\u0E32", lF = "\u0E16\u0E48\u0E32\u0E22\u0E17\u0E2D\u0E14\u0E2A\u0E14", cF = "\u0E42\u0E2B\u0E25\u0E14\u0E41\u0E25\u0E49\u0E27", uF = "\u0E04\u0E27\u0E32\u0E21\u0E04\u0E37\u0E1A\u0E2B\u0E19\u0E49\u0E32", dF = "\u0E41\u0E1A\u0E1A\u0E40\u0E15\u0E47\u0E21\u0E2B\u0E19\u0E49\u0E32\u0E08\u0E2D", pF = "\u0E1B\u0E34\u0E14\u0E40\u0E2A\u0E35\u0E22\u0E07", mF = "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E01\u0E32\u0E23\u0E1B\u0E34\u0E14\u0E40\u0E2A\u0E35\u0E22\u0E07", fF = "\u0E04\u0E33\u0E1A\u0E23\u0E23\u0E22\u0E32\u0E22", gF = "\u0E04\u0E33\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22\u0E20\u0E32\u0E1E", hF = "\u0E1A\u0E17", DF = "\u0E04\u0E33\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22", vF = "\u0E1B\u0E34\u0E14", yF = "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21", bF = "\u0E2A\u0E35\u0E02\u0E32\u0E27", wF = "\u0E2A\u0E35\u0E14\u0E33", kF = "\u0E2A\u0E35\u0E41\u0E14\u0E07", CF = "\u0E2A\u0E35\u0E40\u0E02\u0E35\u0E22\u0E27", xF = "\u0E2A\u0E35\u0E19\u0E49\u0E33\u0E40\u0E07\u0E34\u0E19", SF = "\u0E2A\u0E35\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E07", EF = "\u0E2A\u0E35\u0E21\u0E48\u0E27\u0E07\u0E41\u0E14\u0E07", FF = "\u0E2A\u0E35\u0E19\u0E49\u0E33\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E21\u0E40\u0E02\u0E35\u0E22\u0E27", TF = "\u0E1E\u0E37\u0E49\u0E19\u0E2B\u0E25\u0E31\u0E07", PF = "\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07", jF = "\u0E42\u0E1B\u0E23\u0E48\u0E07\u0E43\u0E2A", AF = "\u0E17\u0E36\u0E1A", BF = "\u0E44\u0E21\u0E48\u0E21\u0E35", RF = "\u0E22\u0E01\u0E02\u0E36\u0E49\u0E19", MF = "\u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E2D\u0E2D\u0E01", zF = "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A", _F = "\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E07\u0E32", LF = "\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23", NF = "\u0E2A\u0E04\u0E23\u0E34\u0E1B\u0E15\u0E4C", IF = "\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15", $F = "\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E34\u0E49\u0E19", bL = { "Audio Player": "\u0E42\u0E1B\u0E23\u0E41\u0E01\u0E23\u0E21\u0E40\u0E25\u0E48\u0E19\u0E40\u0E2A\u0E35\u0E22\u0E07", "Video Player": "\u0E42\u0E1B\u0E23\u0E41\u0E01\u0E23\u0E21\u0E40\u0E25\u0E48\u0E19\u0E27\u0E34\u0E14\u0E35\u0E42\u0E2D", Play: aF, Pause: sF, Replay: iF, "Current Time": "\u0E40\u0E27\u0E25\u0E32\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19", Duration: rF, "Remaining Time": "\u0E40\u0E27\u0E25\u0E32\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E25\u0E37\u0E2D", "Stream Type": "\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E02\u0E2D\u0E07\u0E2A\u0E15\u0E23\u0E35\u0E21", LIVE: lF, "Seek to live, currently behind live": "\u0E2B\u0E32\u0E42\u0E2D\u0E01\u0E32\u0E2A\u0E17\u0E35\u0E48\u0E08\u0E30\u0E16\u0E48\u0E32\u0E22\u0E17\u0E2D\u0E14\u0E2A\u0E14 \u0E01\u0E33\u0E25\u0E31\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E40\u0E1A\u0E37\u0E49\u0E2D\u0E07\u0E2B\u0E25\u0E31\u0E07\u0E01\u0E32\u0E23\u0E16\u0E48\u0E32\u0E22\u0E17\u0E2D\u0E14\u0E2A\u0E14\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49", "Seek to live, currently playing live": "\u0E2B\u0E32\u0E42\u0E2D\u0E01\u0E32\u0E2A\u0E17\u0E35\u0E48\u0E08\u0E30\u0E16\u0E48\u0E32\u0E22\u0E17\u0E2D\u0E14\u0E2A\u0E14 \u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E25\u0E48\u0E19\u0E41\u0E1A\u0E1A\u0E2A\u0E14\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49", Loaded: cF, Progress: uF, "Progress Bar": "\u0E41\u0E16\u0E1A\u0E41\u0E2A\u0E14\u0E07\u0E04\u0E27\u0E32\u0E21\u0E04\u0E37\u0E1A\u0E2B\u0E19\u0E49\u0E32", "progress bar timing: currentTime={1} duration={2}": "{1} \u0E02\u0E2D\u0E07 {2}", Fullscreen: dF, "Exit Fullscreen": "\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E41\u0E1A\u0E1A\u0E40\u0E15\u0E47\u0E21\u0E2B\u0E19\u0E49\u0E32\u0E08\u0E2D", Mute: pF, Unmute: mF, "Playback Rate": "\u0E2D\u0E31\u0E15\u0E23\u0E32\u0E01\u0E32\u0E23\u0E40\u0E25\u0E48\u0E19", Subtitles: fF, "subtitles off": "\u0E1B\u0E34\u0E14\u0E04\u0E33\u0E1A\u0E23\u0E23\u0E22\u0E32\u0E22", Captions: gF, "captions off": "\u0E1B\u0E34\u0E14\u0E04\u0E33\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22\u0E20\u0E32\u0E1E", Chapters: hF, Descriptions: DF, "descriptions off": "\u0E1B\u0E34\u0E14\u0E04\u0E33\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22", "Audio Track": "\u0E41\u0E17\u0E23\u0E47\u0E01\u0E40\u0E2A\u0E35\u0E22\u0E07", "Volume Level": "\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E40\u0E2A\u0E35\u0E22\u0E07", "You aborted the media playback": "\u0E04\u0E38\u0E13\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E01\u0E32\u0E23\u0E40\u0E25\u0E48\u0E19\u0E2A\u0E37\u0E48\u0E2D\u0E41\u0E25\u0E49\u0E27", "A network error caused the media download to fail part-way.": "\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E02\u0E2D\u0E07\u0E40\u0E04\u0E23\u0E37\u0E2D\u0E02\u0E48\u0E32\u0E22\u0E17\u0E33\u0E43\u0E2B\u0E49\u0E01\u0E32\u0E23\u0E14\u0E32\u0E27\u0E19\u0E4C\u0E42\u0E2B\u0E25\u0E14\u0E2A\u0E37\u0E48\u0E2D\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E40\u0E1B\u0E47\u0E19\u0E1A\u0E32\u0E07\u0E2A\u0E48\u0E27\u0E19", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E42\u0E2B\u0E25\u0E14\u0E2A\u0E37\u0E48\u0E2D\u0E44\u0E14\u0E49 \u0E42\u0E14\u0E22\u0E2D\u0E32\u0E08\u0E40\u0E1B\u0E47\u0E19\u0E40\u0E1E\u0E23\u0E32\u0E30\u0E40\u0E0B\u0E34\u0E23\u0E4C\u0E1F\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E04\u0E23\u0E37\u0E2D\u0E02\u0E48\u0E32\u0E22\u0E25\u0E49\u0E21\u0E40\u0E2B\u0E25\u0E27 \u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E1E\u0E23\u0E32\u0E30\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\u0E01\u0E32\u0E23\u0E40\u0E25\u0E48\u0E19\u0E2A\u0E37\u0E48\u0E2D\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E1B\u0E31\u0E0D\u0E2B\u0E32\u0E40\u0E01\u0E35\u0E48\u0E22\u0E27\u0E01\u0E31\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E40\u0E2A\u0E35\u0E22\u0E2B\u0E32\u0E22 \u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E2A\u0E37\u0E48\u0E2D\u0E43\u0E0A\u0E49\u0E1F\u0E35\u0E40\u0E08\u0E2D\u0E23\u0E4C\u0E17\u0E35\u0E48\u0E40\u0E1A\u0E23\u0E32\u0E27\u0E4C\u0E40\u0E0B\u0E2D\u0E23\u0E4C\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A", "No compatible source was found for this media.": "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E17\u0E35\u0E48\u0E40\u0E02\u0E49\u0E32\u0E01\u0E31\u0E19\u0E44\u0E14\u0E49\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E2A\u0E37\u0E48\u0E2D\u0E19\u0E35\u0E49", "The media is encrypted and we do not have the keys to decrypt it.": "\u0E2A\u0E37\u0E48\u0E2D\u0E16\u0E39\u0E01\u0E40\u0E02\u0E49\u0E32\u0E23\u0E2B\u0E31\u0E2A\u0E25\u0E31\u0E1A\u0E41\u0E25\u0E49\u0E27 \u0E41\u0E25\u0E30\u0E40\u0E23\u0E32\u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E35\u0E22\u0E4C\u0E17\u0E35\u0E48\u0E08\u0E30\u0E16\u0E2D\u0E14\u0E23\u0E2B\u0E31\u0E2A\u0E25\u0E31\u0E1A\u0E14\u0E31\u0E07\u0E01\u0E25\u0E48\u0E32\u0E27", "Play Video": "\u0E40\u0E25\u0E48\u0E19\u0E27\u0E34\u0E14\u0E35\u0E42\u0E2D", Close: vF, "Close Modal Dialog": "\u0E1B\u0E34\u0E14\u0E01\u0E25\u0E48\u0E2D\u0E07\u0E42\u0E15\u0E49\u0E15\u0E2D\u0E1A\u0E42\u0E21\u0E14\u0E2D\u0E25", "Modal Window": "\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07\u0E42\u0E21\u0E14\u0E2D\u0E25", "This is a modal window": "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49\u0E40\u0E1B\u0E47\u0E19\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07\u0E42\u0E21\u0E14\u0E2D\u0E25", "This modal can be closed by pressing the Escape key or activating the close button.": "\u0E04\u0E38\u0E13\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1B\u0E34\u0E14\u0E42\u0E21\u0E14\u0E2D\u0E25\u0E19\u0E35\u0E49\u0E42\u0E14\u0E22\u0E01\u0E14\u0E1B\u0E38\u0E48\u0E21 Escape \u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E1B\u0E38\u0E48\u0E21\u0E1B\u0E34\u0E14", ", opens captions settings dialog": ", \u0E40\u0E1B\u0E34\u0E14\u0E01\u0E25\u0E48\u0E2D\u0E07\u0E42\u0E15\u0E49\u0E15\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E04\u0E33\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22\u0E20\u0E32\u0E1E", ", opens subtitles settings dialog": ", \u0E40\u0E1B\u0E34\u0E14\u0E01\u0E25\u0E48\u0E2D\u0E07\u0E42\u0E15\u0E49\u0E15\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E04\u0E33\u0E1A\u0E23\u0E23\u0E22\u0E32\u0E22", ", opens descriptions settings dialog": ", \u0E40\u0E1B\u0E34\u0E14\u0E01\u0E25\u0E48\u0E2D\u0E07\u0E42\u0E15\u0E49\u0E15\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E04\u0E33\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22", ", selected": ", \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E41\u0E25\u0E49\u0E27", "captions settings": "\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E04\u0E33\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22\u0E20\u0E32\u0E1E", "subtitles settings": "\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E04\u0E33\u0E1A\u0E23\u0E23\u0E22\u0E32\u0E22", "descriptions settings": "\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E04\u0E33\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22", Text: yF, White: bF, Black: wF, Red: kF, Green: CF, Blue: xF, Yellow: SF, Magenta: EF, Cyan: FF, Background: TF, Window: PF, Transparent: jF, "Semi-Transparent": "\u0E01\u0E36\u0E48\u0E07\u0E42\u0E1B\u0E23\u0E48\u0E07\u0E43\u0E2A", Opaque: AF, "Font Size": "\u0E02\u0E19\u0E32\u0E14\u0E41\u0E1A\u0E1A\u0E2D\u0E31\u0E01\u0E29\u0E23", "Text Edge Style": "\u0E25\u0E31\u0E01\u0E29\u0E13\u0E30\u0E02\u0E2D\u0E1A\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21", None: BF, Raised: RF, Depressed: MF, Uniform: zF, Dropshadow: _F, "Font Family": "\u0E15\u0E23\u0E30\u0E01\u0E39\u0E25\u0E41\u0E1A\u0E1A\u0E2D\u0E31\u0E01\u0E29\u0E23", "Proportional Sans-Serif": "Sans-Serif \u0E15\u0E32\u0E21\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19", "Monospace Sans-Serif": "Sans-Serif \u0E0A\u0E48\u0E2D\u0E07\u0E27\u0E48\u0E32\u0E07\u0E40\u0E14\u0E35\u0E48\u0E22\u0E27", "Proportional Serif": "Serif \u0E15\u0E32\u0E21\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19", "Monospace Serif": "Serif \u0E0A\u0E48\u0E2D\u0E07\u0E27\u0E48\u0E32\u0E07\u0E40\u0E14\u0E35\u0E48\u0E22\u0E27", Casual: LF, Script: NF, "Small Caps": "\u0E15\u0E31\u0E27\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E43\u0E2B\u0E0D\u0E48\u0E02\u0E19\u0E32\u0E14\u0E40\u0E25\u0E47\u0E01", Reset: IF, "restore all settings to the default values": "\u0E04\u0E37\u0E19\u0E04\u0E48\u0E32\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E17\u0E49\u0E49\u0E07\u0E2B\u0E21\u0E14\u0E43\u0E2B\u0E49\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E48\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19", Done: $F, "Caption Settings Dialog": "\u0E01\u0E25\u0E48\u0E2D\u0E07\u0E42\u0E15\u0E49\u0E15\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E04\u0E33\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22\u0E20\u0E32\u0E1E", "Beginning of dialog window. Escape will cancel and close the window.": "\u0E01\u0E32\u0E23\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07\u0E01\u0E25\u0E48\u0E2D\u0E07\u0E42\u0E15\u0E49\u0E15\u0E2D\u0E1A Escape \u0E08\u0E30\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E41\u0E25\u0E30\u0E1B\u0E34\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07", "End of dialog window.": "\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07\u0E01\u0E25\u0E48\u0E2D\u0E07\u0E42\u0E15\u0E49\u0E15\u0E2D\u0E1A", "{1} is loading.": "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14 {1}", "Exit Picture-in-Picture": "\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E01\u0E32\u0E23\u0E40\u0E25\u0E48\u0E19\u0E20\u0E32\u0E1E\u0E04\u0E27\u0E1A\u0E04\u0E39\u0E48", "Picture-in-Picture": "\u0E01\u0E32\u0E23\u0E40\u0E25\u0E48\u0E19\u0E20\u0E32\u0E1E\u0E04\u0E27\u0E1A\u0E04\u0E39\u0E48" };
});
var pi = {};
h(pi, { Background: () => d7, Black: () => a7, Blue: () => r7, Captions: () => XF, Casual: () => b7, Chapters: () => QF, Close: () => t7, Cyan: () => u7, Depressed: () => D7, Descriptions: () => e7, Done: () => C7, Dropshadow: () => y7, Duration: () => WF, Fullscreen: () => YF, Green: () => i7, LIVE: () => qF, Loaded: () => HF, Magenta: () => c7, Mute: () => KF, None: () => g7, Opaque: () => f7, Pause: () => UF, Play: () => OF, Progress: () => GF, Raised: () => h7, Red: () => s7, Replay: () => VF, Reset: () => k7, Script: () => w7, Subtitles: () => JF, Text: () => o7, Transparent: () => m7, Uniform: () => v7, Unmute: () => ZF, White: () => n7, Window: () => p7, Yellow: () => l7, default: () => wL });
var OF;
var UF;
var VF;
var WF;
var qF;
var HF;
var GF;
var YF;
var KF;
var ZF;
var JF;
var XF;
var QF;
var e7;
var t7;
var o7;
var n7;
var a7;
var s7;
var i7;
var r7;
var l7;
var c7;
var u7;
var d7;
var p7;
var m7;
var f7;
var g7;
var h7;
var D7;
var v7;
var y7;
var b7;
var w7;
var k7;
var C7;
var wL;
var mi = p(() => {
  "use strict";
  OF = "Oynat", UF = "Duraklat", VF = "Yeniden Oynat", WF = "Toplam S\xFCre", qF = "CANLI", HF = "Y\xFCklendi", GF = "Y\xFCkleniyor", YF = "Tam Ekran", KF = "Sessiz", ZF = "Sesi A\xE7", JF = "Altyaz\u0131lar", XF = "Altyaz\u0131lar", QF = "B\xF6l\xFCmler", e7 = "A\xE7\u0131klamalar", t7 = "Kapat", o7 = "Metin", n7 = "Beyaz", a7 = "Siyah", s7 = "K\u0131rm\u0131z\u0131", i7 = "Ye\u015Fil", r7 = "Mavi", l7 = "Sar\u0131", c7 = "Macenta", u7 = "A\xE7\u0131k Mavi (Camg\xF6be\u011Fi)", d7 = "Arka plan", p7 = "Pencere", m7 = "Saydam", f7 = "Mat", g7 = "Hi\xE7biri", h7 = "Kabar\u0131k", D7 = "Yass\u0131", v7 = "D\xFCz", y7 = "G\xF6lgeli", b7 = "G\xFCndelik", w7 = "El Yaz\u0131s\u0131", k7 = "S\u0131f\u0131rla", C7 = "Tamam", wL = { "Audio Player": "Ses Oynat\u0131c\u0131s\u0131", "Video Player": "Video Oynat\u0131c\u0131s\u0131", Play: OF, Pause: UF, Replay: VF, "Current Time": "S\xFCre", Duration: WF, "Remaining Time": "Kalan S\xFCre", "Stream Type": "Yay\u0131n Tipi", LIVE: qF, "Seek to live, currently behind live": "Canl\u0131ya git, \u015Fu anda canl\u0131n\u0131n gerisinde", "Seek to live, currently playing live": "Canl\u0131ya git, \u015Fu anda canl\u0131 oynuyor", Loaded: HF, Progress: GF, "Progress Bar": "\u0130lerleme \xC7ubu\u011Fu", "progress bar timing: currentTime={1} duration={2}": "{1}/{2}", Fullscreen: YF, "Exit Fullscreen": "Tam Ekrandan \xC7\u0131k", Mute: KF, Unmute: ZF, "Playback Rate": "Oynatma H\u0131z\u0131", Subtitles: JF, "subtitles off": "Altyaz\u0131 Kapal\u0131", Captions: XF, "captions off": "Altyaz\u0131 Kapal\u0131", Chapters: QF, "Close Modal Dialog": "Etkile\u015Fim Penceresini Kapat", Descriptions: e7, "descriptions off": "a\xE7\u0131klamalar kapal\u0131", "Audio Track": "Ses Par\xE7as\u0131", "Volume Level": "Ses D\xFCzeyi", "You aborted the media playback": "Medyay\u0131 oynatmay\u0131 iptal ettiniz", "A network error caused the media download to fail part-way.": "Medya indirme i\u015Fleminin k\u0131smen ba\u015Far\u0131s\u0131z olmas\u0131na neden olan bir a\u011F sorunu olu\u015Ftu.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Sunucu veya a\u011F hatas\u0131ndan ya da bi\xE7im desteklenmedi\u011Finden medya y\xFCklenemedi.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Medya oynatma, bir bozulma sorunu nedeniyle veya medya, taray\u0131c\u0131n\u0131z\u0131n desteklemedi\u011Fi \xF6zellikleri kulland\u0131\u011F\u0131 i\xE7in durduruldu.", "No compatible source was found for this media.": "Bu medya i\xE7in uyumlu bir kaynak bulunamad\u0131.", "The media is encrypted and we do not have the keys to decrypt it.": "Medya, \u015Fifrelenmi\u015F bir kaynaktan geliyor ve oynatmak i\xE7in gerekli anahtar bulunamad\u0131.", "Play Video": "Videoyu Oynat", Close: t7, "Modal Window": "Etkile\u015Fim Penceresi", "This is a modal window": "Bu bir etkile\u015Fim penceresidir", "This modal can be closed by pressing the Escape key or activating the close button.": "Bu etkile\u015Fim penceresi ESC tu\u015Funa basarak ya da kapat butonuna t\u0131klanarak kapat\u0131labilir.", ", opens captions settings dialog": ", altyaz\u0131 ayarlar\u0131 men\xFCs\xFCn\xFC a\xE7ar", ", opens subtitles settings dialog": ", altyaz\u0131 ayarlar\u0131 men\xFCs\xFCn\xFC a\xE7ar", ", opens descriptions settings dialog": ", a\xE7\u0131klama ayarlar\u0131 men\xFCs\xFCn\xFC a\xE7ar", ", selected": ", se\xE7ildi", "captions settings": "altyaz\u0131 ayarlar\u0131", "subtitles settings": "altyaz\u0131 ayarlar\u0131", "descriptions settings": "a\xE7\u0131klama ayarlar\u0131", Text: o7, White: n7, Black: a7, Red: s7, Green: i7, Blue: r7, Yellow: l7, Magenta: c7, Cyan: u7, Background: d7, Window: p7, Transparent: m7, "Semi-Transparent": "Yar\u0131-Saydam", Opaque: f7, "Font Size": "Metin Boyutu", "Text Edge Style": "Metin Kenar Stili", None: g7, Raised: h7, Depressed: D7, Uniform: v7, Dropshadow: y7, "Font Family": "Yaz\u0131 Tipi", "Proportional Sans-Serif": "Orant\u0131l\u0131 Sans-Serif", "Monospace Sans-Serif": "E\u015Faral\u0131kl\u0131 Sans-Serif", "Proportional Serif": "Orant\u0131l\u0131 Serif", "Monospace Serif": "E\u015Faral\u0131kl\u0131 Serif", Casual: b7, Script: w7, "Small Caps": "K\xFC\xE7\xFCk Boyutlu B\xFCy\xFCk Harfli", Reset: k7, "restore all settings to the default values": "t\xFCm ayarlar\u0131 varsay\u0131lan de\u011Ferlere geri y\xFCkler", Done: C7, "Caption Settings Dialog": "Altyaz\u0131 Ayarlar\u0131 Men\xFCs\xFC", "Beginning of dialog window. Escape will cancel and close the window.": "Etkile\u015Fim penceresinin ba\u015Flang\u0131c\u0131. ESC tu\u015Fu i\u015Flemi iptal edip pencereyi kapatacakt\u0131r.", "End of dialog window.": "Etkile\u015Fim penceresinin sonu.", "{1} is loading.": "{1} y\xFCkleniyor.", "Exit Picture-in-Picture": "Mini oynat\u0131c\u0131dan \xE7\u0131k", "Picture-in-Picture": "Mini oynat\u0131c\u0131", "No content": "\u0130\xE7erik yok" };
});
var fi = {};
h(fi, { Background: () => Y7, Black: () => O7, Blue: () => W7, Captions: () => z7, Casual: () => n5, Chapters: () => _7, Close: () => N7, Cyan: () => G7, Depressed: () => e5, Descriptions: () => L7, Done: () => i5, Dropshadow: () => o5, Duration: () => F7, Fullscreen: () => A7, Green: () => V7, LIVE: () => T7, Loaded: () => P7, Magenta: () => H7, Mute: () => B7, None: () => X7, Opaque: () => J7, Pause: () => S7, Play: () => x7, Progress: () => j7, Raised: () => Q7, Red: () => U7, Replay: () => E7, Reset: () => s5, Script: () => a5, Subtitles: () => M7, Text: () => I7, Transparent: () => Z7, Uniform: () => t5, Unmute: () => R7, White: () => $7, Window: () => K7, Yellow: () => q7, default: () => kL });
var x7;
var S7;
var E7;
var F7;
var T7;
var P7;
var j7;
var A7;
var B7;
var R7;
var M7;
var z7;
var _7;
var L7;
var N7;
var I7;
var $7;
var O7;
var U7;
var V7;
var W7;
var q7;
var H7;
var G7;
var Y7;
var K7;
var Z7;
var J7;
var X7;
var Q7;
var e5;
var t5;
var o5;
var n5;
var a5;
var s5;
var i5;
var kL;
var gi = p(() => {
  "use strict";
  x7 = "\u0412\u0456\u0434\u0442\u0432\u043E\u0440\u0438\u0442\u0438", S7 = "\u041F\u0440\u0438\u0437\u0443\u043F\u0438\u043D\u0438\u0442\u0438", E7 = "\u0412\u0456\u0434\u0442\u0432\u043E\u0440\u0438\u0442\u0438 \u0437\u043D\u043E\u0432\u0443", F7 = "\u0422\u0440\u0438\u0432\u0430\u043B\u0456\u0441\u0442\u044C", T7 = "\u041D\u0410\u0416\u0418\u0412\u041E", P7 = "\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F", j7 = "\u041F\u0440\u043E\u0433\u0440\u0435\u0441", A7 = "\u041F\u043E\u0432\u043D\u043E\u0435\u043A\u0440\u0430\u043D\u043D\u0438\u0439 \u0440\u0435\u0436\u0438\u043C", B7 = "\u0411\u0435\u0437 \u0437\u0432\u0443\u043A\u0443", R7 = "\u0417\u0456 \u0437\u0432\u0443\u043A\u043E\u043C", M7 = "\u0421\u0443\u0431\u0442\u0438\u0442\u0440\u0438", z7 = "\u041F\u0456\u0434\u043F\u0438\u0441\u0438", _7 = "\u0420\u043E\u0437\u0434\u0456\u043B\u0438", L7 = "\u041E\u043F\u0438\u0441\u0438", N7 = "\u0417\u0430\u043A\u0440\u0438\u0442\u0438", I7 = "\u0422\u0435\u043A\u0441\u0442", $7 = "\u0411\u0456\u043B\u0438\u0439", O7 = "\u0427\u043E\u0440\u043D\u0438\u0439", U7 = "\u0427\u0435\u0440\u0432\u043E\u043D\u0438\u0439", V7 = "\u0417\u0435\u043B\u0435\u043D\u0438\u0439", W7 = "\u0421\u0438\u043D\u0456\u0439", q7 = "\u0416\u043E\u0432\u0442\u0438\u0439", H7 = "\u041F\u0443\u0440\u043F\u0443\u0440\u043D\u0438\u0439", G7 = "\u0411\u043B\u0430\u043A\u0438\u0442\u043D\u0438\u0439", Y7 = "\u0424\u043E\u043D", K7 = "\u0412\u0456\u043A\u043D\u043E", Z7 = "\u041F\u0440\u043E\u0437\u043E\u0440\u0438\u0439", J7 = "\u041F\u0440\u043E\u0437\u043E\u0440\u0456\u0441\u0442\u044C", X7 = "\u041D\u0456\u0447\u043E\u0433\u043E", Q7 = "\u041F\u0456\u0434\u043D\u044F\u0442\u0438\u0439", e5 = "\u0417\u043D\u0438\u0436\u0435\u043D\u0438\u0439", t5 = "\u041E\u0434\u043D\u0430\u043A\u043E\u0432\u0438\u0439", o5 = "\u0422\u0456\u043D\u044C", n5 = "\u0412\u0438\u043F\u0430\u0434\u043A\u043E\u0432\u0438\u0439", a5 = "\u041F\u0438\u0441\u0435\u043C\u043D\u0438\u0439", s5 = "\u0421\u043A\u0438\u043D\u0443\u0442\u0438", i5 = "\u0413\u043E\u0442\u043E\u0432\u043E", kL = { "Audio Player": "\u0410\u0443\u0434\u0456\u043E\u043F\u0440\u043E\u0433\u0440\u0430\u0432\u0430\u0447", "Video Player": "\u0412\u0456\u0434\u0435\u043E\u043F\u0440\u043E\u0433\u0440\u0430\u0432\u0430\u0447", Play: x7, Pause: S7, Replay: E7, "Current Time": "\u041F\u043E\u0442\u043E\u0447\u043D\u0438\u0439 \u0447\u0430\u0441", Duration: F7, "Remaining Time": "\u0427\u0430\u0441, \u0449\u043E \u0437\u0430\u043B\u0438\u0448\u0438\u0432\u0441\u044F", "Stream Type": "\u0422\u0438\u043F \u043F\u043E\u0442\u043E\u043A\u0443", LIVE: T7, Loaded: P7, Progress: j7, "Progress Bar": "\u0406\u043D\u0434\u0438\u043A\u0430\u0442\u043E\u0440 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F", "progress bar timing: currentTime={1} duration={2}": "{1} \u0437 {2}", Fullscreen: A7, "Exit Fullscreen": "\u041D\u0435\u043F\u043E\u0432\u043D\u043E\u0435\u043A\u0440\u0430\u043D\u043D\u0438\u0439 \u0440\u0435\u0436\u0438\u043C", Mute: B7, Unmute: R7, "Playback Rate": "\u0428\u0432\u0438\u0434\u043A\u0456\u0441\u0442\u044C \u0432\u0456\u0434\u0442\u0432\u043E\u0440\u0435\u043D\u043D\u044F", Subtitles: M7, "subtitles off": "\u0411\u0435\u0437 \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u0456\u0432", Captions: z7, "captions off": "\u0411\u0435\u0437 \u043F\u0456\u0434\u043F\u0438\u0441\u0456\u0432", Chapters: _7, "Close Modal Dialog": "\u0417\u0430\u043A\u0440\u0438\u0442\u0438 \u043C\u043E\u0434\u0430\u043B\u044C\u043D\u0438\u0439 \u0434\u0456\u0430\u043B\u043E\u0433", Descriptions: L7, "descriptions off": "\u0411\u0435\u0437 \u043E\u043F\u0438\u0441\u0456\u0432", "Audio Track": "\u0410\u0443\u0434\u0456\u043E\u0434\u043E\u0440\u0456\u0436\u043A\u0430", "Volume Level": "\u0420\u0456\u0432\u0435\u043D\u044C \u0433\u0443\u0447\u043D\u043E\u0441\u0442\u0456", "You aborted the media playback": "\u0412\u0438 \u043F\u0440\u0438\u043F\u0438\u043D\u0438\u043B\u0438 \u0432\u0456\u0434\u0442\u0432\u043E\u0440\u0435\u043D\u043D\u044F \u0432\u0456\u0434\u0435\u043E", "A network error caused the media download to fail part-way.": "\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u043C\u0435\u0440\u0435\u0436\u0456 \u0432\u0438\u043A\u043B\u0438\u043A\u0430\u043B\u0430 \u0437\u0431\u0456\u0439 \u043F\u0456\u0434 \u0447\u0430\u0441 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u0432\u0456\u0434\u0435\u043E.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\u041D\u0435\u043C\u043E\u0436\u043B\u0438\u0432\u043E \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0432\u0456\u0434\u0435\u043E \u0447\u0435\u0440\u0435\u0437 \u043C\u0435\u0440\u0435\u0436\u0435\u0432\u0438\u0439 \u0447\u0438 \u0441\u0435\u0440\u0432\u0435\u0440\u043D\u0438\u0439 \u0437\u0431\u0456\u0439 \u0430\u0431\u043E \u0444\u043E\u0440\u043C\u0430\u0442 \u043D\u0435 \u043F\u0456\u0434\u0442\u0440\u0438\u043C\u0443\u0454\u0442\u044C\u0441\u044F.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\u0412\u0456\u0434\u0442\u0432\u043E\u0440\u0435\u043D\u043D\u044F \u0432\u0456\u0434\u0435\u043E \u0431\u0443\u043B\u043E \u043F\u0440\u0438\u043F\u0438\u043D\u0435\u043D\u043E \u0447\u0435\u0440\u0435\u0437 \u043F\u043E\u0448\u043A\u043E\u0434\u0436\u0435\u043D\u043D\u044F \u0430\u0431\u043E \u0443 \u0437\u0432'\u044F\u0437\u043A\u0443 \u0437 \u0442\u0438\u043C, \u0449\u043E \u0432\u0456\u0434\u0435\u043E \u0432\u0438\u043A\u043E\u0440\u0438\u0441\u0442\u043E\u0432\u0443\u0454 \u0444\u0443\u043D\u043A\u0446\u0456\u0457, \u044F\u043A\u0456 \u043D\u0435 \u043F\u0456\u0434\u0442\u0440\u0438\u043C\u0443\u044E\u0442\u044C\u0441\u044F \u0432\u0430\u0448\u0438\u043C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043E\u043C.", "No compatible source was found for this media.": "\u0421\u0443\u043C\u0456\u0441\u043D\u0456 \u0434\u0436\u0435\u0440\u0435\u043B\u0430 \u0434\u043B\u044F \u0446\u044C\u043E\u0433\u043E \u0432\u0456\u0434\u0435\u043E \u0432\u0456\u0434\u0441\u0443\u0442\u043D\u0456.", "The media is encrypted and we do not have the keys to decrypt it.": "\u0412\u0456\u0434\u0435\u043E \u0432 \u0437\u0430\u0448\u0438\u0444\u0440\u043E\u0432\u0430\u043D\u043E\u043C\u0443 \u0432\u0438\u0433\u043B\u044F\u0434\u0456, \u0456 \u043C\u0438 \u043D\u0435 \u043C\u0430\u0454\u043C\u043E \u043A\u043B\u044E\u0447\u0456 \u0434\u043B\u044F \u0440\u043E\u0437\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0438.", "Play Video": "\u0412\u0456\u0434\u0442\u0432\u043E\u0440\u0438\u0442\u0438 \u0432\u0456\u0434\u0435\u043E", Close: N7, "Modal Window": "\u041C\u043E\u0434\u0430\u043B\u044C\u043D\u0435 \u0432\u0456\u043A\u043D\u043E", "This is a modal window": "\u0426\u0435 \u043C\u043E\u0434\u0430\u043B\u044C\u043D\u0435 \u0432\u0456\u043A\u043D\u043E.", "This modal can be closed by pressing the Escape key or activating the close button.": "\u041C\u043E\u0434\u0430\u043B\u044C\u043D\u0435 \u0432\u0456\u043A\u043D\u043E \u043C\u043E\u0436\u043D\u0430 \u0437\u0430\u043A\u0440\u0438\u0442\u0438, \u043D\u0430\u0442\u0438\u0441\u043D\u0443\u0432\u0448\u0438 \u043A\u043B\u0430\u0432\u0456\u0448\u0443 Esc \u0430\u0431\u043E \u043A\u043D\u043E\u043F\u043A\u0443 \u0437\u0430\u043A\u0440\u0438\u0442\u0442\u044F \u0432\u0456\u043A\u043D\u0430.", ", opens captions settings dialog": ", \u0432\u0456\u0434\u043A\u0440\u0438\u0454\u0442\u044C\u0441\u044F \u0434\u0456\u0430\u043B\u043E\u0433\u043E\u0432\u0435 \u0432\u0456\u043A\u043D\u043E \u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F \u043F\u0456\u0434\u043F\u0438\u0441\u0456\u0432", ", opens subtitles settings dialog": ", \u0432\u0456\u0434\u043A\u0440\u0438\u0454\u0442\u044C\u0441\u044F \u0434\u0456\u0430\u043B\u043E\u0433\u043E\u0432\u0435 \u0432\u0456\u043A\u043D\u043E \u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u0456\u0432", ", opens descriptions settings dialog": ", \u0432\u0456\u0434\u043A\u0440\u0438\u0454\u0442\u044C\u0441\u044F \u0434\u0456\u0430\u043B\u043E\u0433\u043E\u0432\u0435 \u0432\u0456\u043A\u043D\u043E \u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F \u043E\u043F\u0438\u0441\u0456\u0432", ", selected": ", \u043E\u0431\u0440\u0430\u043D\u0438\u0439", "captions settings": "\u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F \u043F\u0456\u0434\u043F\u0438\u0441\u0456\u0432", "subtitles settings": "\u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F \u0441\u0443\u0431\u0442\u0438\u0442\u0440\u0456\u0432", "descriptions settings": "\u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F \u043E\u043F\u0438\u0441\u0456\u0432", Text: I7, White: $7, Black: O7, Red: U7, Green: V7, Blue: W7, Yellow: q7, Magenta: H7, Cyan: G7, Background: Y7, Window: K7, Transparent: Z7, "Semi-Transparent": "\u041D\u0430\u043F\u0456\u0432\u043F\u0440\u043E\u0437\u043E\u0440\u0438\u0439", Opaque: J7, "Font Size": "\u0420\u043E\u0437\u043C\u0456\u0440 \u0448\u0440\u0438\u0444\u0442\u0443", "Text Edge Style": "\u0421\u0442\u0438\u043B\u044C \u043A\u0440\u0430\u044E \u0442\u0435\u043A\u0441\u0442\u0443", None: X7, Raised: Q7, Depressed: e5, Uniform: t5, Dropshadow: o5, "Font Family": "\u0428\u0440\u0438\u0444\u0442", "Proportional Sans-Serif": "\u041F\u0440\u043E\u043F\u043E\u0440\u0446\u0456\u0439\u043D\u0438\u0439 \u0431\u0435\u0437 \u0437\u0430\u0441\u0456\u0447\u043E\u043A", "Monospace Sans-Serif": "\u041C\u043E\u043D\u043E\u0448\u0438\u0440\u0438\u043D\u043D\u0438\u0439 \u0431\u0435\u0437 \u0437\u0430\u0441\u0456\u0447\u043E\u043A", "Proportional Serif": "\u041F\u0440\u043E\u043F\u043E\u0440\u0446\u0456\u0439\u043D\u0438\u0439 \u0456\u0437 \u0437\u0430\u0441\u0456\u0447\u043A\u0430\u043C\u0438", "Monospace Serif": "\u041C\u043E\u043D\u043E\u0448\u0438\u0440\u0438\u043D\u043D\u0438\u0439 \u0456\u0437 \u0437\u0430\u0441\u0456\u0447\u043A\u0430\u043C\u0438", Casual: n5, Script: a5, "Small Caps": "\u041C\u0430\u043B\u0456 \u043F\u0440\u043E\u043F\u0438\u0441\u043D\u0456", Reset: s5, "restore all settings to the default values": "\u0441\u043A\u0438\u043D\u0443\u0442\u0438 \u0432\u0441\u0456 \u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F \u0437\u0430 \u0437\u0430\u043C\u043E\u0432\u0447\u0443\u0432\u0430\u043D\u043D\u044F\u043C", Done: i5, "Caption Settings Dialog": "\u0414\u0456\u0430\u043B\u043E\u0433 \u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u044C \u043F\u0456\u0434\u043F\u0438\u0441\u0443", "Beginning of dialog window. Escape will cancel and close the window.": "\u041F\u043E\u0447\u0430\u0442\u043E\u043A \u0434\u0456\u0430\u043B\u043E\u0433\u043E\u0432\u0433\u043E \u0432\u0456\u043A\u043D\u0430. \u041A\u043D\u043E\u043F\u043A\u0430 Escape \u0437\u0430\u043A\u0440\u0438\u0454 \u0430\u0431\u043E \u0441\u043A\u0430\u0441\u0443\u0454 \u0432\u0456\u043A\u043D\u043E", "End of dialog window.": "\u041A\u0456\u043D\u0435\u0446\u044C \u0434\u0456\u0430\u043B\u043E\u0433\u043E\u0432\u043E\u0433\u043E \u0432\u0456\u043A\u043D\u0430.", "{1} is loading.": "{1} \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0443\u0454\u0442\u044C\u0441\u044F." };
});
var hi = {};
h(hi, { Background: () => A5, Black: () => x5, Blue: () => F5, Captions: () => v5, Casual: () => $5, Chapters: () => y5, Close: () => w5, Cyan: () => j5, Depressed: () => L5, Descriptions: () => b5, Done: () => V5, Dropshadow: () => I5, Duration: () => u5, Fullscreen: () => f5, Green: () => E5, LIVE: () => d5, Loaded: () => p5, Magenta: () => P5, Mute: () => g5, None: () => z5, Opaque: () => M5, Pause: () => l5, Play: () => r5, Progress: () => m5, Raised: () => _5, Red: () => S5, Replay: () => c5, Reset: () => U5, Script: () => O5, Subtitles: () => D5, Text: () => k5, Transparent: () => R5, Uniform: () => N5, Unmute: () => h5, White: () => C5, Window: () => B5, Yellow: () => T5, default: () => CL });
var r5;
var l5;
var c5;
var u5;
var d5;
var p5;
var m5;
var f5;
var g5;
var h5;
var D5;
var v5;
var y5;
var b5;
var w5;
var k5;
var C5;
var x5;
var S5;
var E5;
var F5;
var T5;
var P5;
var j5;
var A5;
var B5;
var R5;
var M5;
var z5;
var _5;
var L5;
var N5;
var I5;
var $5;
var O5;
var U5;
var V5;
var CL;
var Di = p(() => {
  "use strict";
  r5 = "Ph\xE1t", l5 = "T\u1EA1m d\u1EEBng", c5 = "Ph\xE1t l\u1EA1i", u5 = "\u0110\u1ED9 d\xE0i", d5 = "TR\u1EF0C TI\u1EBEP", p5 = "\u0110\xE3 t\u1EA3i", m5 = "Ti\u1EBFn tr\xECnh", f5 = "To\xE0n m\xE0n h\xECnh", g5 = "T\u1EAFt ti\u1EBFng", h5 = "B\u1EADt \xE2m thanh", D5 = "Ph\u1EE5 \u0111\u1EC1", v5 = "Ch\xFA th\xEDch", y5 = "Ch\u01B0\u01A1ng", b5 = "M\xF4 t\u1EA3", w5 = "\u0110\xF3ng", k5 = "V\u0103n b\u1EA3n", C5 = "Tr\u1EAFng", x5 = "\u0110en", S5 = "\u0110\u1ECF", E5 = "Xanh l\xE1 c\xE2y", F5 = "Xanh da tr\u1EDDi", T5 = "V\xE0ng", P5 = "\u0110\u1ECF t\u01B0\u01A1i", j5 = "Lam", A5 = "N\u1EC1n", B5 = "C\u1EEDa s\u1ED5", R5 = "Trong su\u1ED1t", M5 = "M\u1EDD", z5 = "None", _5 = "Raised", L5 = "Depressed", N5 = "Uniform", I5 = "Dropshadow", $5 = "Casual", O5 = "Script", U5 = "\u0110\u1EB7t l\u1EA1i", V5 = "Xong", CL = { "Audio Player": "Tr\xECnh ph\xE1t Audio", "Video Player": "Tr\xECnh ph\xE1t Video", Play: r5, Pause: l5, Replay: c5, "Current Time": "Th\u1EDDi gian hi\u1EC7n t\u1EA1i", Duration: u5, "Remaining Time": "Th\u1EDDi gian c\xF2n l\u1EA1i", "Stream Type": "Ki\u1EC3u Stream", LIVE: d5, Loaded: p5, Progress: m5, "Progress Bar": "Thanh ti\u1EBFn tr\xECnh", "progress bar timing: currentTime={1} duration={2}": "{1} c\u1EE7a {2}", Fullscreen: f5, "Exit Fullscreen": "Tho\xE1t to\xE0n m\xE0n h\xECnh", Mute: g5, Unmute: h5, "Playback Rate": "T\u1EC9 l\u1EC7 ph\xE1t l\u1EA1i", Subtitles: D5, "subtitles off": "t\u1EAFt ph\u1EE5 \u0111\u1EC1", Captions: v5, "captions off": "t\u1EAFt ch\xFA th\xEDch", Chapters: y5, Descriptions: b5, "descriptions off": "t\u1EAFt m\xF4 t\u1EA3", "Audio Track": "Track \xE2m thanh", "Volume Level": "M\u1EE9c \xE2m l\u01B0\u1EE3ng", "You aborted the media playback": "B\u1EA1n \u0111\xE3 h\u1EE7y vi\u1EC7c ph\xE1t l\u1EA1i media.", "A network error caused the media download to fail part-way.": "M\u1ED9t l\u1ED7i m\u1EA1ng d\u1EABn \u0111\u1EBFn vi\u1EC7c t\u1EA3i media b\u1ECB l\u1ED7i.", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "Video kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c, m\u1EA1ng hay server c\xF3 l\u1ED7i ho\u1EB7c \u0111\u1ECBnh d\u1EA1ng kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3.", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "Ph\xE1t media \u0111\xE3 b\u1ECB h\u1EE7y do m\u1ED9t sai l\u1ED7i ho\u1EB7c media s\u1EED d\u1EE5ng nh\u1EEFng t\xEDnh n\u0103ng tr\xECnh duy\u1EC7t kh\xF4ng h\u1ED7 tr\u1EE3.", "No compatible source was found for this media.": "Kh\xF4ng c\xF3 ngu\u1ED3n t\u01B0\u01A1ng th\xEDch cho media n\xE0y.", "The media is encrypted and we do not have the keys to decrypt it.": "Media \u0111\xE3 \u0111\u01B0\u1EE3c m\xE3 h\xF3a v\xE0 ch\xFAng t\xF4i kh\xF4ng c\xF3 \u0111\u1EC3 gi\u1EA3i m\xE3 n\xF3.", "Play Video": "Ph\xE1t Video", Close: w5, "Close Modal Dialog": "\u0110\xF3ng c\u1EEDa s\u1ED5", "Modal Window": "C\u1EEDa s\u1ED5", "This is a modal window": "\u0110\xE2y l\xE0 m\u1ED9t c\u1EEDa s\u1ED5", "This modal can be closed by pressing the Escape key or activating the close button.": "C\u1EEDa s\u1ED5 n\xE0y c\xF3 th\u1EC3 tho\xE1t b\u1EB1ng vi\u1EC7c nh\u1EA5n ph\xEDm Esc ho\u1EB7c k\xEDch ho\u1EA1t n\xFAt \u0111\xF3ng.", ", opens captions settings dialog": ", m\u1EDF h\u1ED9p tho\u1EA1i c\xE0i \u0111\u1EB7t ch\xFA th\xEDch", ", opens subtitles settings dialog": ", m\u1EDF h\u1ED9p tho\u1EA1i c\xE0i \u0111\u1EB7t ph\u1EE5 \u0111\u1EC1", ", opens descriptions settings dialog": ", m\u1EDF h\u1ED9p tho\u1EA1i c\xE0i \u0111\u1EB7t m\xF4 t\u1EA3", ", selected": ", \u0111\xE3 ch\u1ECDn", "captions settings": "c\xE0i \u0111\u1EB7t ch\xFA th\xEDch", "subtitles settings": "c\xE0i \u0111\u1EB7t ph\u1EE5 \u0111\u1EC1", "descriptions settings": "c\xE0i \u0111\u1EB7t m\xF4 t\u1EA3", Text: k5, White: C5, Black: x5, Red: S5, Green: E5, Blue: F5, Yellow: T5, Magenta: P5, Cyan: j5, Background: A5, Window: B5, Transparent: R5, "Semi-Transparent": "B\xE1n trong su\u1ED1t", Opaque: M5, "Font Size": "K\xEDch c\u1EE1 ph\xF4ng ch\u1EEF", "Text Edge Style": "D\u1EA1ng vi\u1EC1n v\u0103n b\u1EA3n", None: z5, Raised: _5, Depressed: L5, Uniform: N5, Dropshadow: I5, "Font Family": "Ph\xF4ng ch\u1EEF", "Proportional Sans-Serif": "Proportional Sans-Serif", "Monospace Sans-Serif": "Monospace Sans-Serif", "Proportional Serif": "Proportional Serif", "Monospace Serif": "Monospace Serif", Casual: $5, Script: O5, "Small Caps": "Small Caps", Reset: U5, "restore all settings to the default values": "kh\xF4i ph\u1EE5c l\u1EA1i t\u1EA5t c\u1EA3 c\xE1c c\xE0i \u0111\u1EB7t v\u1EC1 gi\xE1 tr\u1ECB m\u1EB7c \u0111\u1ECBnh", Done: V5, "Caption Settings Dialog": "H\u1ED9p tho\u1EA1i c\xE0i \u0111\u1EB7t ch\xFA th\xEDch", "Beginning of dialog window. Escape will cancel and close the window.": "B\u1EAFt \u0111\u1EA7u c\u1EEDa s\u1ED5 h\u1ED9p tho\u1EA1i. Esc s\u1EBD tho\xE1t v\xE0 \u0111\xF3ng c\u1EEDa s\u1ED5.", "End of dialog window.": "K\u1EBFt th\xFAc c\u1EEDa s\u1ED5 h\u1ED9p tho\u1EA1i." };
});
var vi = {};
h(vi, { Background: () => fT, Black: () => rT, Blue: () => uT, Captions: () => eT, Casual: () => CT, Chapters: () => tT, Close: () => nT, Color: () => FT, Cyan: () => mT, Depressed: () => bT, Descriptions: () => oT, Done: () => ET, Dropshadow: () => kT, Duration: () => H5, Fullscreen: () => Z5, Green: () => cT, LIVE: () => G5, Loaded: () => Y5, Magenta: () => pT, Mute: () => J5, None: () => vT, Opacity: () => TT, Opaque: () => DT, Pause: () => q5, Play: () => W5, Progress: () => K5, Raised: () => yT, Red: () => lT, Replay: () => aT, Reset: () => ST, Script: () => xT, Subtitles: () => Q5, Text: () => sT, Transparent: () => hT, Uniform: () => wT, Unmute: () => X5, White: () => iT, Window: () => gT, Yellow: () => dT, default: () => xL });
var W5;
var q5;
var H5;
var G5;
var Y5;
var K5;
var Z5;
var J5;
var X5;
var Q5;
var eT;
var tT;
var oT;
var nT;
var aT;
var sT;
var iT;
var rT;
var lT;
var cT;
var uT;
var dT;
var pT;
var mT;
var fT;
var gT;
var hT;
var DT;
var vT;
var yT;
var bT;
var wT;
var kT;
var CT;
var xT;
var ST;
var ET;
var FT;
var TT;
var xL;
var yi = p(() => {
  "use strict";
  W5 = "\u64AD\u653E", q5 = "\u6682\u505C", H5 = "\u65F6\u957F", G5 = "\u76F4\u64AD", Y5 = "\u52A0\u8F7D\u5B8C\u6210", K5 = "\u8FDB\u5EA6", Z5 = "\u5168\u5C4F", J5 = "\u9759\u97F3", X5 = "\u5F00\u542F\u97F3\u6548", Q5 = "\u5B57\u5E55", eT = "\u5185\u5D4C\u5B57\u5E55", tT = "\u8282\u76EE\u6BB5\u843D", oT = "\u63CF\u8FF0", nT = "\u5173\u95ED", aT = "\u91CD\u65B0\u64AD\u653E", sT = "\u6587\u5B57", iT = "\u767D", rT = "\u9ED1", lT = "\u7EA2", cT = "\u7EFF", uT = "\u84DD", dT = "\u9EC4", pT = "\u7D2B\u7EA2", mT = "\u9752", fT = "\u80CC\u666F", gT = "\u7A97\u53E3", hT = "\u900F\u660E", DT = "\u4E0D\u900F\u660E", vT = "\u65E0", yT = "\u6D6E\u96D5", bT = "\u538B\u4F4E", wT = "\u5747\u5300", kT = "\u4E0B\u9634\u5F71", CT = "\u8212\u9002", xT = "\u624B\u5199\u4F53", ST = "\u91CD\u7F6E", ET = "\u5B8C\u6210", FT = "\u989C\u8272", TT = "\u4E0D\u900F\u660E\u5EA6", xL = { Play: W5, Pause: q5, "Current Time": "\u5F53\u524D\u65F6\u95F4", Duration: H5, "Remaining Time": "\u5269\u4F59\u65F6\u95F4", "Stream Type": "\u5A92\u4F53\u6D41\u7C7B\u578B", LIVE: G5, Loaded: Y5, Progress: K5, Fullscreen: Z5, "Exit Fullscreen": "\u9000\u51FA\u5168\u5C4F", "Picture-in-Picture": "\u753B\u4E2D\u753B", "Exit Picture-in-Picture": "\u9000\u51FA\u753B\u4E2D\u753B", Mute: J5, Unmute: X5, "Playback Rate": "\u64AD\u653E\u901F\u5EA6", Subtitles: Q5, "subtitles off": "\u5173\u95ED\u5B57\u5E55", Captions: eT, "captions off": "\u5173\u95ED\u5185\u5D4C\u5B57\u5E55", Chapters: tT, "Close Modal Dialog": "\u5173\u95ED\u5F39\u7A97", Descriptions: oT, "descriptions off": "\u5173\u95ED\u63CF\u8FF0", "Audio Track": "\u97F3\u8F68", "You aborted the media playback": "\u89C6\u9891\u64AD\u653E\u88AB\u7EC8\u6B62", "A network error caused the media download to fail part-way.": "\u7F51\u7EDC\u9519\u8BEF\u5BFC\u81F4\u89C6\u9891\u4E0B\u8F7D\u4E2D\u9014\u5931\u8D25\u3002", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\u89C6\u9891\u56E0\u683C\u5F0F\u4E0D\u652F\u6301\u6216\u8005\u670D\u52A1\u5668\u6216\u7F51\u7EDC\u7684\u95EE\u9898\u65E0\u6CD5\u52A0\u8F7D\u3002", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\u7531\u4E8E\u89C6\u9891\u6587\u4EF6\u635F\u574F\u6216\u662F\u8BE5\u89C6\u9891\u4F7F\u7528\u4E86\u4F60\u7684\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u7684\u529F\u80FD\uFF0C\u64AD\u653E\u7EC8\u6B62\u3002", "No compatible source was found for this media.": "\u65E0\u6CD5\u627E\u5230\u6B64\u89C6\u9891\u517C\u5BB9\u7684\u6E90\u3002", "The media is encrypted and we do not have the keys to decrypt it.": "\u89C6\u9891\u5DF2\u52A0\u5BC6\uFF0C\u65E0\u6CD5\u89E3\u5BC6\u3002", "Play Video": "\u64AD\u653E\u89C6\u9891", Close: nT, "Modal Window": "\u5F39\u7A97", "This is a modal window": "\u8FD9\u662F\u4E00\u4E2A\u5F39\u7A97", "This modal can be closed by pressing the Escape key or activating the close button.": "\u53EF\u4EE5\u6309ESC\u6309\u952E\u6216\u542F\u7528\u5173\u95ED\u6309\u94AE\u6765\u5173\u95ED\u6B64\u5F39\u7A97\u3002", ", opens captions settings dialog": ", \u5F00\u542F\u6807\u9898\u8BBE\u7F6E\u5F39\u7A97", ", opens subtitles settings dialog": ", \u5F00\u542F\u5B57\u5E55\u8BBE\u7F6E\u5F39\u7A97", ", opens descriptions settings dialog": ", \u5F00\u542F\u63CF\u8FF0\u8BBE\u7F6E\u5F39\u7A97", ", selected": ", \u9009\u62E9", "captions settings": "\u5B57\u5E55\u8BBE\u5B9A", "Audio Player": "\u97F3\u9891\u64AD\u653E\u5668", "Video Player": "\u89C6\u9891\u64AD\u653E\u5668", Replay: aT, "Progress Bar": "\u8FDB\u5EA6\u6761", "Volume Level": "\u97F3\u91CF", "subtitles settings": "\u5B57\u5E55\u8BBE\u5B9A", "descriptions settings": "\u63CF\u8FF0\u8BBE\u5B9A", Text: sT, White: iT, Black: rT, Red: lT, Green: cT, Blue: uT, Yellow: dT, Magenta: pT, Cyan: mT, Background: fT, Window: gT, Transparent: hT, "Semi-Transparent": "\u534A\u900F\u660E", Opaque: DT, "Font Size": "\u5B57\u4F53\u5C3A\u5BF8", "Text Edge Style": "\u5B57\u4F53\u8FB9\u7F18\u6837\u5F0F", None: vT, Raised: yT, Depressed: bT, Uniform: wT, Dropshadow: kT, "Font Family": "\u5B57\u4F53\u5E93", "Proportional Sans-Serif": "\u6BD4\u4F8B\u65E0\u7EC6\u4F53", "Monospace Sans-Serif": "\u5355\u95F4\u9694\u65E0\u7EC6\u4F53", "Proportional Serif": "\u6BD4\u4F8B\u7EC6\u4F53", "Monospace Serif": "\u5355\u95F4\u9694\u7EC6\u4F53", Casual: CT, Script: xT, "Small Caps": "\u5C0F\u578B\u5927\u5199\u5B57\u4F53", Reset: ST, "restore all settings to the default values": "\u6062\u590D\u5168\u90E8\u8BBE\u5B9A\u81F3\u9884\u8BBE\u503C", Done: ET, "Caption Settings Dialog": "\u5B57\u5E55\u8BBE\u5B9A\u7A97\u53E3", "Beginning of dialog window. Escape will cancel and close the window.": "\u6253\u5F00\u5BF9\u8BDD\u7A97\u53E3\u3002Escape\u952E\u5C06\u53D6\u6D88\u5E76\u5173\u95ED\u5BF9\u8BDD\u7A97\u53E3", "End of dialog window.": "\u7ED3\u675F\u5BF9\u8BDD\u7A97\u53E3", "Seek to live, currently behind live": "\u5C1D\u8BD5\u76F4\u64AD\uFF0C\u5F53\u524D\u4E3A\u5EF6\u65F6\u64AD\u653E", "Seek to live, currently playing live": "\u5C1D\u8BD5\u76F4\u64AD\uFF0C\u5F53\u524D\u4E3A\u5B9E\u65F6\u64AD\u653E", "progress bar timing: currentTime={1} duration={2}": "{1}/{2}", "{1} is loading.": "\u6B63\u5728\u52A0\u8F7D {1}\u3002", "No content": "\u65E0\u5185\u5BB9", Color: FT, Opacity: TT, "Text Background": "\u6587\u672C\u80CC\u666F", "Caption Area Background": "\u5B57\u5E55\u533A\u57DF\u80CC\u666F", "Skip forward {1} seconds": "\u5FEB\u8FDB {1} \u79D2", "Skip backward {1} seconds": "\u5FEB\u9000 {1} \u79D2" };
});
var bi = {};
h(bi, { Background: () => QT, Black: () => HT, Blue: () => KT, Captions: () => IT, Casual: () => lP, Chapters: () => $T, Close: () => UT, Color: () => pP, Cyan: () => XT, Depressed: () => sP, Descriptions: () => OT, Done: () => dP, Dropshadow: () => rP, Duration: () => AT, Fullscreen: () => zT, Green: () => YT, LIVE: () => BT, Loaded: () => RT, Magenta: () => JT, Mute: () => _T, None: () => nP, Opacity: () => mP, Opaque: () => oP, Pause: () => jT, Play: () => PT, Progress: () => MT, Raised: () => aP, Red: () => GT, Replay: () => VT, Reset: () => uP, Script: () => cP, Subtitles: () => NT, Text: () => WT, Transparent: () => tP, Uniform: () => iP, Unmute: () => LT, White: () => qT, Window: () => eP, Yellow: () => ZT, default: () => SL });
var PT;
var jT;
var AT;
var BT;
var RT;
var MT;
var zT;
var _T;
var LT;
var NT;
var IT;
var $T;
var OT;
var UT;
var VT;
var WT;
var qT;
var HT;
var GT;
var YT;
var KT;
var ZT;
var JT;
var XT;
var QT;
var eP;
var tP;
var oP;
var nP;
var aP;
var sP;
var iP;
var rP;
var lP;
var cP;
var uP;
var dP;
var pP;
var mP;
var SL;
var wi = p(() => {
  "use strict";
  PT = "\u64AD\u653E", jT = "\u6682\u505C", AT = "\u65F6\u957F", BT = "\u76F4\u64AD", RT = "\u52A0\u8F7D\u5B8C\u6210", MT = "\u8FDB\u5EA6", zT = "\u5168\u5C4F", _T = "\u9759\u97F3", LT = "\u5F00\u542F\u97F3\u6548", NT = "\u5B57\u5E55", IT = "\u5185\u5D4C\u5B57\u5E55", $T = "\u8282\u76EE\u6BB5\u843D", OT = "\u63CF\u8FF0", UT = "\u5173\u95ED", VT = "\u91CD\u65B0\u64AD\u653E", WT = "\u6587\u5B57", qT = "\u767D", HT = "\u9ED1", GT = "\u7EA2", YT = "\u7EFF", KT = "\u84DD", ZT = "\u9EC4", JT = "\u7D2B\u7EA2", XT = "\u9752", QT = "\u80CC\u666F", eP = "\u7A97\u53E3", tP = "\u900F\u660E", oP = "\u4E0D\u900F\u660E", nP = "\u65E0", aP = "\u6D6E\u96D5", sP = "\u538B\u4F4E", iP = "\u5747\u5300", rP = "\u4E0B\u9634\u5F71", lP = "\u8212\u9002", cP = "\u624B\u5199\u4F53", uP = "\u91CD\u7F6E", dP = "\u5B8C\u6210", pP = "\u989C\u8272", mP = "\u4E0D\u900F\u660E\u5EA6", SL = { Play: PT, Pause: jT, "Current Time": "\u5F53\u524D\u65F6\u95F4", Duration: AT, "Remaining Time": "\u5269\u4F59\u65F6\u95F4", "Stream Type": "\u5A92\u4F53\u6D41\u7C7B\u578B", LIVE: BT, Loaded: RT, Progress: MT, Fullscreen: zT, "Exit Fullscreen": "\u9000\u51FA\u5168\u5C4F", "Picture-in-Picture": "\u753B\u4E2D\u753B", "Exit Picture-in-Picture": "\u9000\u51FA\u753B\u4E2D\u753B", Mute: _T, Unmute: LT, "Playback Rate": "\u64AD\u653E\u901F\u5EA6", Subtitles: NT, "subtitles off": "\u5173\u95ED\u5B57\u5E55", Captions: IT, "captions off": "\u5173\u95ED\u5185\u5D4C\u5B57\u5E55", Chapters: $T, "Close Modal Dialog": "\u5173\u95ED\u5F39\u7A97", Descriptions: OT, "descriptions off": "\u5173\u95ED\u63CF\u8FF0", "Audio Track": "\u97F3\u8F68", "You aborted the media playback": "\u89C6\u9891\u64AD\u653E\u88AB\u7EC8\u6B62", "A network error caused the media download to fail part-way.": "\u7F51\u7EDC\u9519\u8BEF\u5BFC\u81F4\u89C6\u9891\u4E0B\u8F7D\u4E2D\u9014\u5931\u8D25\u3002", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\u89C6\u9891\u56E0\u683C\u5F0F\u4E0D\u652F\u6301\u6216\u8005\u670D\u52A1\u5668\u6216\u7F51\u7EDC\u7684\u95EE\u9898\u65E0\u6CD5\u52A0\u8F7D\u3002", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\u7531\u4E8E\u89C6\u9891\u6587\u4EF6\u635F\u574F\u6216\u662F\u8BE5\u89C6\u9891\u4F7F\u7528\u4E86\u4F60\u7684\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u7684\u529F\u80FD\uFF0C\u64AD\u653E\u7EC8\u6B62\u3002", "No compatible source was found for this media.": "\u65E0\u6CD5\u627E\u5230\u6B64\u89C6\u9891\u517C\u5BB9\u7684\u6E90\u3002", "The media is encrypted and we do not have the keys to decrypt it.": "\u89C6\u9891\u5DF2\u52A0\u5BC6\uFF0C\u65E0\u6CD5\u89E3\u5BC6\u3002", "Play Video": "\u64AD\u653E\u89C6\u9891", Close: UT, "Modal Window": "\u5F39\u7A97", "This is a modal window": "\u8FD9\u662F\u4E00\u4E2A\u5F39\u7A97", "This modal can be closed by pressing the Escape key or activating the close button.": "\u53EF\u4EE5\u6309ESC\u6309\u952E\u6216\u542F\u7528\u5173\u95ED\u6309\u94AE\u6765\u5173\u95ED\u6B64\u5F39\u7A97\u3002", ", opens captions settings dialog": ", \u5F00\u542F\u6807\u9898\u8BBE\u7F6E\u5F39\u7A97", ", opens subtitles settings dialog": ", \u5F00\u542F\u5B57\u5E55\u8BBE\u7F6E\u5F39\u7A97", ", opens descriptions settings dialog": ", \u5F00\u542F\u63CF\u8FF0\u8BBE\u7F6E\u5F39\u7A97", ", selected": ", \u9009\u62E9", "captions settings": "\u5B57\u5E55\u8BBE\u5B9A", "Audio Player": "\u97F3\u9891\u64AD\u653E\u5668", "Video Player": "\u89C6\u9891\u64AD\u653E\u5668", Replay: VT, "Progress Bar": "\u8FDB\u5EA6\u6761", "Volume Level": "\u97F3\u91CF", "subtitles settings": "\u5B57\u5E55\u8BBE\u5B9A", "descriptions settings": "\u63CF\u8FF0\u8BBE\u5B9A", Text: WT, White: qT, Black: HT, Red: GT, Green: YT, Blue: KT, Yellow: ZT, Magenta: JT, Cyan: XT, Background: QT, Window: eP, Transparent: tP, "Semi-Transparent": "\u534A\u900F\u660E", Opaque: oP, "Font Size": "\u5B57\u4F53\u5C3A\u5BF8", "Text Edge Style": "\u5B57\u4F53\u8FB9\u7F18\u6837\u5F0F", None: nP, Raised: aP, Depressed: sP, Uniform: iP, Dropshadow: rP, "Font Family": "\u5B57\u4F53\u5E93", "Proportional Sans-Serif": "\u6BD4\u4F8B\u65E0\u7EC6\u4F53", "Monospace Sans-Serif": "\u5355\u95F4\u9694\u65E0\u7EC6\u4F53", "Proportional Serif": "\u6BD4\u4F8B\u7EC6\u4F53", "Monospace Serif": "\u5355\u95F4\u9694\u7EC6\u4F53", Casual: lP, Script: cP, "Small Caps": "\u5C0F\u578B\u5927\u5199\u5B57\u4F53", Reset: uP, "restore all settings to the default values": "\u6062\u590D\u5168\u90E8\u8BBE\u5B9A\u81F3\u9884\u8BBE\u503C", Done: dP, "Caption Settings Dialog": "\u5B57\u5E55\u8BBE\u5B9A\u7A97\u53E3", "Beginning of dialog window. Escape will cancel and close the window.": "\u6253\u5F00\u5BF9\u8BDD\u7A97\u53E3\u3002Escape\u952E\u5C06\u53D6\u6D88\u5E76\u5173\u95ED\u5BF9\u8BDD\u7A97\u53E3", "End of dialog window.": "\u7ED3\u675F\u5BF9\u8BDD\u7A97\u53E3", "Seek to live, currently behind live": "\u5C1D\u8BD5\u76F4\u64AD\uFF0C\u5F53\u524D\u4E3A\u5EF6\u65F6\u64AD\u653E", "Seek to live, currently playing live": "\u5C1D\u8BD5\u76F4\u64AD\uFF0C\u5F53\u524D\u4E3A\u5B9E\u65F6\u64AD\u653E", "progress bar timing: currentTime={1} duration={2}": "{1}/{2}", "{1} is loading.": "\u6B63\u5728\u52A0\u8F7D {1}\u3002", "No content": "\u65E0\u5185\u5BB9", Color: pP, Opacity: mP, "Text Background": "\u6587\u672C\u80CC\u666F", "Caption Area Background": "\u5B57\u5E55\u533A\u57DF\u80CC\u666F", "Skip forward {1} seconds": "\u5FEB\u8FDB {1} \u79D2", "Skip backward {1} seconds": "\u5FEB\u9000 {1} \u79D2" };
});
var ki = {};
h(ki, { Background: () => NP, Black: () => AP, Blue: () => MP, Captions: () => xP, Casual: () => GP, Chapters: () => SP, Close: () => FP, Color: () => JP, Cyan: () => LP, Depressed: () => WP, Descriptions: () => EP, Done: () => ZP, Dropshadow: () => HP, Duration: () => hP, Fullscreen: () => bP, Green: () => RP, LIVE: () => DP, Loaded: () => vP, Magenta: () => _P, Mute: () => wP, None: () => UP, Opacity: () => XP, Opaque: () => OP, Pause: () => gP, Play: () => fP, Progress: () => yP, Raised: () => VP, Red: () => BP, Replay: () => TP, Reset: () => KP, Script: () => YP, Subtitles: () => CP, Text: () => PP, Transparent: () => $P, Uniform: () => qP, Unmute: () => kP, White: () => jP, Window: () => IP, Yellow: () => zP, default: () => EL });
var fP;
var gP;
var hP;
var DP;
var vP;
var yP;
var bP;
var wP;
var kP;
var CP;
var xP;
var SP;
var EP;
var FP;
var TP;
var PP;
var jP;
var AP;
var BP;
var RP;
var MP;
var zP;
var _P;
var LP;
var NP;
var IP;
var $P;
var OP;
var UP;
var VP;
var WP;
var qP;
var HP;
var GP;
var YP;
var KP;
var ZP;
var JP;
var XP;
var EL;
var Ci = p(() => {
  "use strict";
  fP = "\u64AD\u653E", gP = "\u66AB\u505C", hP = "\u7E3D\u5171\u6642\u9593", DP = "\u76F4\u64AD", vP = "\u8F09\u5165\u5B8C\u7562", yP = "\u9032\u5EA6", bP = "\u5168\u87A2\u5E55", wP = "\u975C\u97F3", kP = "\u958B\u555F\u97F3\u6548", CP = "\u5B57\u5E55", xP = "\u5167\u5D4C\u5B57\u5E55", SP = "\u7AE0\u7BC0", EP = "\u63CF\u8FF0", FP = "\u95DC\u9589", TP = "\u91CD\u64AD", PP = "\u6587\u5B57", jP = "\u767D", AP = "\u9ED1", BP = "\u7D05", RP = "\u7DA0", MP = "\u85CD", zP = "\u9EC3", _P = "\u7D2B\u7D05", LP = "\u9752", NP = "\u80CC\u666F", IP = "\u8996\u7A97", $P = "\u900F\u660E", OP = "\u4E0D\u900F\u660E", UP = "\u7121", VP = "\u6D6E\u96D5", WP = "\u58D3\u4F4E", qP = "\u5747\u52FB", HP = "\u4E0B\u9670\u5F71", GP = "\u8F15\u4FBF\u7684", YP = "\u624B\u5BEB\u9AD4", KP = "\u91CD\u7F6E", ZP = "\u5B8C\u6210", JP = "\u984F\u8272", XP = "\u4E0D\u900F\u660E\u5EA6", EL = { Play: fP, Pause: gP, "Current Time": "\u76EE\u524D\u6642\u9593", Duration: hP, "Remaining Time": "\u5269\u9918\u6642\u9593", "Stream Type": "\u4E32\u6D41\u985E\u578B", LIVE: DP, Loaded: vP, Progress: yP, Fullscreen: bP, "Exit Fullscreen": "\u9000\u51FA\u5168\u87A2\u5E55", "Picture-in-Picture": "\u5B50\u6BCD\u756B\u9762", "Exit Picture-in-Picture": "\u9000\u51FA\u5B50\u6BCD\u756B\u9762", Mute: wP, Unmute: kP, "Playback Rate": " \u64AD\u653E\u901F\u7387", Subtitles: CP, "subtitles off": "\u95DC\u9589\u5B57\u5E55", Captions: xP, "captions off": "\u95DC\u9589\u5167\u5D4C\u5B57\u5E55", Chapters: SP, "Close Modal Dialog": "\u95DC\u9589\u5C0D\u8A71\u6846", Descriptions: EP, "descriptions off": "\u95DC\u9589\u63CF\u8FF0", "Audio Track": "\u97F3\u8ECC", "You aborted the media playback": "\u5F71\u7247\u64AD\u653E\u5DF2\u7D42\u6B62", "A network error caused the media download to fail part-way.": "\u7DB2\u8DEF\u932F\u8AA4\u5C0E\u81F4\u5F71\u7247\u4E0B\u8F09\u5931\u6557\u3002", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\u56E0\u683C\u5F0F\u4E0D\u652F\u63F4\u3001\u4F3A\u670D\u5668\u6216\u7DB2\u8DEF\u7684\u554F\u984C\u7121\u6CD5\u8F09\u5165\u5A92\u9AD4\u3002", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\u7531\u65BC\u5F71\u7247\u6A94\u6848\u640D\u6BC0\u6216\u662F\u8A72\u5F71\u7247\u4F7F\u7528\u4E86\u60A8\u7684\u700F\u89BD\u5668\u4E0D\u652F\u63F4\u7684\u529F\u80FD\uFF0C\u5DF2\u7D42\u6B62\u64AD\u653E\u5A92\u9AD4\u3002", "No compatible source was found for this media.": "\u7121\u6CD5\u627E\u5230\u76F8\u5BB9\u6B64\u5A92\u9AD4\u7684\u4F86\u6E90\u3002", "The media is encrypted and we do not have the keys to decrypt it.": "\u5A92\u9AD4\u5DF2\u52A0\u5BC6\uFF0C\u7121\u6CD5\u89E3\u5BC6\u3002", "Play Video": "\u64AD\u653E\u5F71\u7247", Close: FP, "Modal Window": "\u5F37\u5236\u56DE\u61C9\u8996\u7A97", "This is a modal window": "\u6B64\u70BA\u5F37\u5236\u56DE\u61C9\u8996\u7A97", "This modal can be closed by pressing the Escape key or activating the close button.": "\u53EF\u4EE5\u6309ESC\u6309\u9375\u6216\u95DC\u9589\u6309\u9215\u4F86\u95DC\u9589\u6B64\u8996\u7A97\u3002", ", opens captions settings dialog": ", \u958B\u555F\u6A19\u984C\u8A2D\u5B9A\u5C0D\u8A71\u6846", ", opens subtitles settings dialog": ", \u958B\u555F\u5B57\u5E55\u8A2D\u5B9A\u5C0D\u8A71\u6846", ", opens descriptions settings dialog": ", \u958B\u555F\u63CF\u8FF0\u8A2D\u5B9A\u5C0D\u8A71\u6846", ", selected": ", \u9078\u64C7", "captions settings": "\u5B57\u5E55\u8A2D\u5B9A", "Audio Player": "\u97F3\u8A0A\u64AD\u653E\u5668", "Video Player": "\u8996\u8A0A\u64AD\u653E\u5668", Replay: TP, "Progress Bar": "\u9032\u5EA6\u5217", "Volume Level": "\u97F3\u91CF", "subtitles settings": "\u5B57\u5E55\u8A2D\u5B9A", "descriptions settings": "\u63CF\u8FF0\u8A2D\u5B9A", Text: PP, White: jP, Black: AP, Red: BP, Green: RP, Blue: MP, Yellow: zP, Magenta: _P, Cyan: LP, Background: NP, Window: IP, Transparent: $P, "Semi-Transparent": "\u534A\u900F\u660E", Opaque: OP, "Font Size": "\u5B57\u578B\u5C3A\u5BF8", "Text Edge Style": "\u5B57\u578B\u908A\u7DE3\u6A23\u5F0F", None: UP, Raised: VP, Depressed: WP, Uniform: qP, Dropshadow: HP, "Font Family": "\u5B57\u578B\u7CFB\u5217", "Proportional Sans-Serif": "\u8ABF\u548C\u9593\u8DDD\u7121\u896F\u7DDA\u5B57\u578B", "Monospace Sans-Serif": "\u7B49\u5BEC\u7121\u896F\u7DDA\u5B57\u578B", "Proportional Serif": "\u8ABF\u548C\u9593\u8DDD\u896F\u7DDA\u5B57\u578B", "Monospace Serif": "\u7B49\u5BEC\u896F\u7DDA\u5B57\u578B", Casual: GP, Script: YP, "Small Caps": "\u5C0F\u578B\u5927\u5BEB\u5B57\u9AD4", Reset: KP, "restore all settings to the default values": "\u6062\u5FA9\u5168\u90E8\u8A2D\u5B9A\u81F3\u9810\u8A2D\u503C", Done: ZP, "Caption Settings Dialog": "\u5B57\u5E55\u8A2D\u5B9A\u5C0D\u8A71\u6846", "Beginning of dialog window. Escape will cancel and close the window.": "\u958B\u59CB\u5C0D\u8A71\u8996\u7A97\u3002\u96E2\u958B\u6703\u53D6\u6D88\u4E26\u95DC\u9589\u8996\u7A97", "End of dialog window.": "\u7D50\u675F\u5C0D\u8A71\u8996\u7A97", "Seek to live, currently behind live": "\u5FEB\u8F49\u81F3\u76F4\u64AD\uFF0C\u76EE\u524D\u70BA\u7A0D\u65E9\u756B\u9762", "Seek to live, currently playing live": "\u5FEB\u8F49\u81F3\u76F4\u64AD\uFF0C\u76EE\u524D\u70BA\u73FE\u5834\u756B\u9762", "progress bar timing: currentTime={1} duration={2}": "{1}/{2}", "{1} is loading.": "{1} \u6B63\u5728\u8F09\u5165\u3002", "No content": "\u7121\u5167\u5BB9", Color: JP, Opacity: XP, "Text Background": "\u6587\u5B57\u80CC\u666F", "Caption Area Background": "\u5B57\u5E55\u5340\u57DF\u80CC\u666F", "Skip forward {1} seconds": "\u5FEB\u8F49 {1} \u79D2", "Skip backward {1} seconds": "\u5012\u8F49 {1} \u79D2" };
});
var xi = {};
h(xi, { Background: () => Cj, Black: () => hj, Blue: () => yj, Captions: () => cj, Casual: () => Bj, Chapters: () => uj, Close: () => pj, Color: () => _j, Cyan: () => kj, Depressed: () => Pj, Descriptions: () => dj, Done: () => zj, Dropshadow: () => Aj, Duration: () => tj, Fullscreen: () => sj, Green: () => vj, LIVE: () => oj, Loaded: () => nj, Magenta: () => wj, Mute: () => ij, None: () => Fj, Opacity: () => Lj, Opaque: () => Ej, Pause: () => ej, Play: () => QP, Progress: () => aj, Raised: () => Tj, Red: () => Dj, Replay: () => mj, Reset: () => Mj, Script: () => Rj, Subtitles: () => lj, Text: () => fj, Transparent: () => Sj, Uniform: () => jj, Unmute: () => rj, White: () => gj, Window: () => xj, Yellow: () => bj, default: () => FL });
var QP;
var ej;
var tj;
var oj;
var nj;
var aj;
var sj;
var ij;
var rj;
var lj;
var cj;
var uj;
var dj;
var pj;
var mj;
var fj;
var gj;
var hj;
var Dj;
var vj;
var yj;
var bj;
var wj;
var kj;
var Cj;
var xj;
var Sj;
var Ej;
var Fj;
var Tj;
var Pj;
var jj;
var Aj;
var Bj;
var Rj;
var Mj;
var zj;
var _j;
var Lj;
var FL;
var Si = p(() => {
  "use strict";
  QP = "\u64AD\u653E", ej = "\u66AB\u505C", tj = "\u7E3D\u5171\u6642\u9593", oj = "\u76F4\u64AD", nj = "\u8F09\u5165\u5B8C\u7562", aj = "\u9032\u5EA6", sj = "\u5168\u87A2\u5E55", ij = "\u975C\u97F3", rj = "\u958B\u555F\u97F3\u6548", lj = "\u5B57\u5E55", cj = "\u5167\u5D4C\u5B57\u5E55", uj = "\u7AE0\u7BC0", dj = "\u63CF\u8FF0", pj = "\u95DC\u9589", mj = "\u91CD\u64AD", fj = "\u6587\u5B57", gj = "\u767D", hj = "\u9ED1", Dj = "\u7D05", vj = "\u7DA0", yj = "\u85CD", bj = "\u9EC3", wj = "\u7D2B\u7D05", kj = "\u9752", Cj = "\u80CC\u666F", xj = "\u8996\u7A97", Sj = "\u900F\u660E", Ej = "\u4E0D\u900F\u660E", Fj = "\u7121", Tj = "\u6D6E\u96D5", Pj = "\u58D3\u4F4E", jj = "\u5747\u52FB", Aj = "\u4E0B\u9670\u5F71", Bj = "\u8F15\u4FBF\u7684", Rj = "\u624B\u5BEB\u9AD4", Mj = "\u91CD\u7F6E", zj = "\u5B8C\u6210", _j = "\u984F\u8272", Lj = "\u4E0D\u900F\u660E\u5EA6", FL = { Play: QP, Pause: ej, "Current Time": "\u76EE\u524D\u6642\u9593", Duration: tj, "Remaining Time": "\u5269\u9918\u6642\u9593", "Stream Type": "\u4E32\u6D41\u985E\u578B", LIVE: oj, Loaded: nj, Progress: aj, Fullscreen: sj, "Exit Fullscreen": "\u9000\u51FA\u5168\u87A2\u5E55", "Picture-in-Picture": "\u5B50\u6BCD\u756B\u9762", "Exit Picture-in-Picture": "\u9000\u51FA\u5B50\u6BCD\u756B\u9762", Mute: ij, Unmute: rj, "Playback Rate": " \u64AD\u653E\u901F\u7387", Subtitles: lj, "subtitles off": "\u95DC\u9589\u5B57\u5E55", Captions: cj, "captions off": "\u95DC\u9589\u5167\u5D4C\u5B57\u5E55", Chapters: uj, "Close Modal Dialog": "\u95DC\u9589\u5C0D\u8A71\u6846", Descriptions: dj, "descriptions off": "\u95DC\u9589\u63CF\u8FF0", "Audio Track": "\u97F3\u8ECC", "You aborted the media playback": "\u5F71\u7247\u64AD\u653E\u5DF2\u7D42\u6B62", "A network error caused the media download to fail part-way.": "\u7DB2\u8DEF\u932F\u8AA4\u5C0E\u81F4\u5F71\u7247\u4E0B\u8F09\u5931\u6557\u3002", "The media could not be loaded, either because the server or network failed or because the format is not supported.": "\u56E0\u683C\u5F0F\u4E0D\u652F\u63F4\u3001\u4F3A\u670D\u5668\u6216\u7DB2\u8DEF\u7684\u554F\u984C\u7121\u6CD5\u8F09\u5165\u5A92\u9AD4\u3002", "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "\u7531\u65BC\u5F71\u7247\u6A94\u6848\u640D\u6BC0\u6216\u662F\u8A72\u5F71\u7247\u4F7F\u7528\u4E86\u60A8\u7684\u700F\u89BD\u5668\u4E0D\u652F\u63F4\u7684\u529F\u80FD\uFF0C\u5DF2\u7D42\u6B62\u64AD\u653E\u5A92\u9AD4\u3002", "No compatible source was found for this media.": "\u7121\u6CD5\u627E\u5230\u76F8\u5BB9\u6B64\u5A92\u9AD4\u7684\u4F86\u6E90\u3002", "The media is encrypted and we do not have the keys to decrypt it.": "\u5A92\u9AD4\u5DF2\u52A0\u5BC6\uFF0C\u7121\u6CD5\u89E3\u5BC6\u3002", "Play Video": "\u64AD\u653E\u5F71\u7247", Close: pj, "Modal Window": "\u5F37\u5236\u56DE\u61C9\u8996\u7A97", "This is a modal window": "\u6B64\u70BA\u5F37\u5236\u56DE\u61C9\u8996\u7A97", "This modal can be closed by pressing the Escape key or activating the close button.": "\u53EF\u4EE5\u6309ESC\u6309\u9375\u6216\u95DC\u9589\u6309\u9215\u4F86\u95DC\u9589\u6B64\u8996\u7A97\u3002", ", opens captions settings dialog": ", \u958B\u555F\u6A19\u984C\u8A2D\u5B9A\u5C0D\u8A71\u6846", ", opens subtitles settings dialog": ", \u958B\u555F\u5B57\u5E55\u8A2D\u5B9A\u5C0D\u8A71\u6846", ", opens descriptions settings dialog": ", \u958B\u555F\u63CF\u8FF0\u8A2D\u5B9A\u5C0D\u8A71\u6846", ", selected": ", \u9078\u64C7", "captions settings": "\u5B57\u5E55\u8A2D\u5B9A", "Audio Player": "\u97F3\u8A0A\u64AD\u653E\u5668", "Video Player": "\u8996\u8A0A\u64AD\u653E\u5668", Replay: mj, "Progress Bar": "\u9032\u5EA6\u5217", "Volume Level": "\u97F3\u91CF", "subtitles settings": "\u5B57\u5E55\u8A2D\u5B9A", "descriptions settings": "\u63CF\u8FF0\u8A2D\u5B9A", Text: fj, White: gj, Black: hj, Red: Dj, Green: vj, Blue: yj, Yellow: bj, Magenta: wj, Cyan: kj, Background: Cj, Window: xj, Transparent: Sj, "Semi-Transparent": "\u534A\u900F\u660E", Opaque: Ej, "Font Size": "\u5B57\u578B\u5C3A\u5BF8", "Text Edge Style": "\u5B57\u578B\u908A\u7DE3\u6A23\u5F0F", None: Fj, Raised: Tj, Depressed: Pj, Uniform: jj, Dropshadow: Aj, "Font Family": "\u5B57\u578B\u7CFB\u5217", "Proportional Sans-Serif": "\u8ABF\u548C\u9593\u8DDD\u7121\u896F\u7DDA\u5B57\u578B", "Monospace Sans-Serif": "\u7B49\u5BEC\u7121\u896F\u7DDA\u5B57\u578B", "Proportional Serif": "\u8ABF\u548C\u9593\u8DDD\u896F\u7DDA\u5B57\u578B", "Monospace Serif": "\u7B49\u5BEC\u896F\u7DDA\u5B57\u578B", Casual: Bj, Script: Rj, "Small Caps": "\u5C0F\u578B\u5927\u5BEB\u5B57\u9AD4", Reset: Mj, "restore all settings to the default values": "\u6062\u5FA9\u5168\u90E8\u8A2D\u5B9A\u81F3\u9810\u8A2D\u503C", Done: zj, "Caption Settings Dialog": "\u5B57\u5E55\u8A2D\u5B9A\u5C0D\u8A71\u6846", "Beginning of dialog window. Escape will cancel and close the window.": "\u958B\u59CB\u5C0D\u8A71\u8996\u7A97\u3002\u96E2\u958B\u6703\u53D6\u6D88\u4E26\u95DC\u9589\u8996\u7A97", "End of dialog window.": "\u7D50\u675F\u5C0D\u8A71\u8996\u7A97", "Seek to live, currently behind live": "\u5FEB\u8F49\u81F3\u76F4\u64AD\uFF0C\u76EE\u524D\u70BA\u7A0D\u65E9\u756B\u9762", "Seek to live, currently playing live": "\u5FEB\u8F49\u81F3\u76F4\u64AD\uFF0C\u76EE\u524D\u70BA\u73FE\u5834\u756B\u9762", "progress bar timing: currentTime={1} duration={2}": "{1}/{2}", "{1} is loading.": "{1} \u6B63\u5728\u8F09\u5165\u3002", "No content": "\u7121\u5167\u5BB9", Color: _j, Opacity: Lj, "Text Background": "\u6587\u5B57\u80CC\u666F", "Caption Area Background": "\u5B57\u5E55\u5340\u57DF\u80CC\u666F", "Skip forward {1} seconds": "\u5FEB\u8F49 {1} \u79D2", "Skip backward {1} seconds": "\u5012\u8F49 {1} \u79D2" };
});
var Fi = {};
h(Fi, { a: () => HL, i: () => UL });
function Nj(e) {
  return R(TL, _(), `rounded-full h-8 w-8 inline-grid place-content-center text-center flex-shrink-0 bg-neutral-400 dark:bg-neutral-600 text-white sm:w-12 sm:h-12 hover:bg-primary/70 hover:transition hover:scale-110 active:scale-95 ${e.vid.chapter === e.currentVid.chapter ? "bg-neutral-800 dark:bg-neutral-900 transform scale-120  transition-colors duration-200" : ""}`, f(Number(e.vid.chapter)));
}
function Ij(e) {
  return S(fe, { get when() {
    return e.currentVid;
  }, get children() {
    return R(PL, _(), f(S(ut, { get each() {
      return ht();
    }, children: (t) => R(jL, _(), f(S(Nj, { get currentVid() {
      return e.currentVid;
    }, vid: t, onClick: (n) => e.chapterButtonOnClick(n) }))) })));
  } });
}
function $j(e) {
  return R(AL, _(), f(e.text()));
}
async function Oj(e, t) {
  try {
    let o = `${e}/api/getPlaylist?playlist=${t}`, a = await fetch(o);
    if (a.ok)
      return a.json();
  } catch (n) {
    console.error(n);
    return;
  }
}
function Uj(e) {
  ze(e.initialData.chap), Wo(e.initialData.vids), ka(e.userPreferences?.playbackSpeed || "1"), Da(e.vids);
  let [t] = To(), [n, o] = q(true), [a, s] = q(), [i, r] = q(), l = 5, u, c, d = "downloadData";
  return R(LL, _(), `overflow-x-hidden ${f(Sa, true)} w-full sm:rounded-lg`, `text-surface w-12 h-12 md:w-20 md:h-20 bg-gray-200/40 grid place-content-center rounded-full hover:text-primary hover:bg-primary/10 absolute left-4 top-1/2 -translate-y-1/2 z-30 ${(!Yt().prev || $()?.currentTime() == 0) && "hidden"}`, f(S(No, {})), f(S(Lo, { classNames: "w-16 h-16 text-primary" })), f(S(fe, { get when() {
    return i();
  }, get children() {
    return R(RL, _(), f(String(i())));
  } })), f(S(fe, { get when() {
    return a();
  }, get children() {
    return R(ML, _(), f(String(a())));
  } })), `text-surface w-12 h-12 md:w-20 md:h-20 bg-gray-200/40 grid place-content-center rounded-full hover:text-primary hover:bg-primary/10 absolute right-4 top-1/2 -translate-y-1/2 z-30 ${(!Yt().next || $()?.currentTime() == 0) && "hidden"}`, f(S(Io, {})), V("value", f(e.userPreferences?.playbackSpeed, true) || "1", false), f(S($o, {})), f(wa()), V("action", f(BL, true), false), V("name", f(d, true), false), V("value", f(JSON.stringify([Kt()?.[0]]), true), false), V("value", f("true", true), false), f(S(Oo, { classNames: "hover:text-primary" })), f(S(fe, { get when() {
    return n();
  }, get children() {
    return R(zL, _(), f(S(Uo, {})));
  } })), f(S(Ij, { showChapSliderButtons: n, chapterButtonOnClick: (g) => {
    Ht(g);
  }, currentVid: ve })), f(S(fe, { get when() {
    return n();
  }, get children() {
    return R(_L, _(), f(S(Vo, {})));
  } })), `${f(qt, true)} sm:py-4`, f(Ho(ve?.localizedBookName || ve.book)), f(xa(e.playlist)), `${f(qt, true)} py-2 bg-primary dark:bg-surface/05 text-base rounded-tr-xl rounded-tl-xl  scrollbar-hide min-h-200px`, f(t("bibleSelection", void 0, "Bible Selection")), f(t("chooseABook", void 0, "Choose a book of the bible to watch here.")), "position:absolute;inset:0;pointer-events:none;height:100%", f(S(ut, { get each() {
    return Object.entries(e.vids);
  }, children: ([g, k], D) => R(NL, _(), `inline-flex gap-2 items-center hover:text-surface hover:font-bold hover:underline ${ve.custom_fields?.book?.toUpperCase() === g.toUpperCase() ? "underline font-bold" : ""}`, f(D()) + 1, f(Ho(k.find((v) => !!v.localizedBookName)?.localizedBookName || g))) })));
}
function Ei(e) {
  return S(Zt, { get locale() {
    return e.locale;
  }, get initialDict() {
    return e.initialDict;
  }, get children() {
    return S(Uj, { get initialData() {
      return e.initialData;
    }, get playlist() {
      return e.playlist;
    }, get userPreferences() {
      return e.userPreferences;
    }, get vids() {
      return e.vids;
    }, get videojsInitalDict() {
      return e.videojsInitalDict;
    }, get playerEnv() {
      return e.playerEnv;
    } });
  } });
}
var TL;
var PL;
var jL;
var AL;
var BL;
var RL;
var ML;
var zL;
var _L;
var LL;
var NL;
var IL;
var Vj;
var $L;
var OL;
var UL;
var VL;
var Wj;
var WL;
var qL;
var HL;
var Ti = p(() => {
  "use strict";
  Xe();
  Z();
  G();
  on();
  mt();
  Me();
  ra();
  bc();
  kc();
  TL = ["<button", ' class="', '">', "</button>"];
  y(Nj, "@astrojs/solid-js");
  PL = ["<ul", ' data-js="chapterButtonTrack" class="flex flex-nowrap gap-3 items-start content-start px-2 py-4 overflow-x-auto scrollbar-hide list-none scroll-smooth motion-reduce:scroll-auto w-full">', "</ul>"], jL = ["<li", ">", "</li>"];
  y(Ij, "@astrojs/solid-js");
  AL = ["<span", ' data-role="chapLabelTextHolder" class="chapLabelTextHolder">', "</span>"];
  y($j, "@astrojs/solid-js");
  BL = "sw-handle-saving";
  RL = ["<div", ' id="seekRippleBackward" class="absolute w-1/4 top-0 left-0 bottom-0 grid place-content-center rounded-[0%_100%_100%_0%_/_50%_50%_50%_50%] z-40 capitalize font-bold text-base pointer-events-none seekRipple">', "</div>"], ML = ["<div", ' id="seekRippleForward" class="absolute w-1/4 top-0 right-0 bottom-0 seekRipple grid place-content-center capitalize font-bold text-base z-40 rounded-[100%_0%_0%_100%_/_50%_50%_50%_50%] pointer-events-none">', "</div>"], zL = ["<button", ' class="pr-3 text-2xl">', "</button>"], _L = ["<button", ' class="pl-3 text-2xl">', "</button>"], LL = ["<div", ' class="', '"><div data-title="VideoPlayer" class="w-full mx-auto aspect-12/9 sm:aspect-video relative sm:rounded-lg sm:overflow-hidden"><button data-title="chapBack" class="', '">', '</button><div id="PLAYER" class="w-full h-full grid place-content-center">', "</div><!--#-->", "<!--/--><!--#-->", '<!--/--><button data-title="chapNext" class="', '">', '</button></div><div data-title="VideoSupplmental" class="py-2 px-2"><div data-title="videoControl" class="flex gap-2"><span class="inline-flex gap-1 items-center"><input type="range" class="speedRange appearance-none bg-transparent cursor-pointer w-60 " min=".25" max="5" step=".25"', '><span class="inline-block h-5 w-5">', '</span><span class="inline-block ml-2">', '</span></span><div data-title="downloadCurrentVid" class="relative ml-auto"><form', ' method="post"', '><input type="hidden" name="swPayload"', '><input type="hidden" name="swDownloadDevice"', '><button type="submit" class="">', '</button></form></div></div><div class="flex"><!--#-->', '<!--/--><div class="overflow-x-auto scrollbar-hide flex w-full" data-title="ChaptersNav">', "</div><!--#-->", '<!--/--></div><div data-title="BookAndPlaylistName" class="', '"><h1 class="font-bold"> <!--#-->', "<!--/--></h1><p>", '</p></div></div><div data-title="BookNav" class="', '"><h2 class="text-white dark:text-neutral-200 font-bold">', '</h2><p class="text-white dark:text-neutral-200">', '</p><div class="relative h-full sm:h-auto "><div style="', '" class="y-scroll-gradient sm:hidden"></div><ul class="max-h-300px overflow-y-auto scrollbar-hide pt-8 pb-36 sm:max-h-[50vh] list-none">', "</ul></div></div></div>"], NL = ["<li", ' class="text-neutral-100 dark:text-neutral-200 py-1 w-full border-y border-base md:text-lg md:py-2"><button class="', '"><span class="bg-base text-primary dark:text-primary rounded-full p-4 h-0 w-0 inline-grid place-content-center">', "</span><!--#-->", "<!--/--></button></li>"];
  y(Uj, "@astrojs/solid-js");
  y(Ei, "@astrojs/solid-js");
  IL = ke(), Vj = we(async (e, t, n) => {
    let o = e.createAstro(IL, t, n);
    o.self = Vj;
    let a = o.url.origin;
    (a.includes("dot-web.pages.dev") || a.includes("127.0.0.1") || a.includes("localhost")) && (a = "benin");
    let s = Object.keys(me).find((b) => a.toLowerCase().includes(b.toLowerCase()));
    if (!s || !me[s])
      return o.redirect("404");
    let r = me[s].playlist;
    if (!r)
      return o.redirect("404");
    let l = Je(o.request), u = await Ze(Object.assign({ "../i18n/en.ts": () => Promise.resolve().then(() => (Ro(), Bo)), "../i18n/fr.ts": () => Promise.resolve().then(() => (zo(), Mo)), "../i18n/index.ts": () => Promise.resolve().then(() => (Xe(), tn)).then((b) => b.K) }), `../i18n/${l}.ts`), c = { [l]: u.default }, d;
    try {
      d = (await Ze(Object.assign({ "../../node_modules/video.js/dist/lang/ar.json": () => Promise.resolve().then(() => (za(), Ma)), "../../node_modules/video.js/dist/lang/ba.json": () => Promise.resolve().then(() => (La(), _a)), "../../node_modules/video.js/dist/lang/bg.json": () => Promise.resolve().then(() => (Ia(), Na)), "../../node_modules/video.js/dist/lang/bn.json": () => Promise.resolve().then(() => (Oa(), $a)), "../../node_modules/video.js/dist/lang/ca.json": () => Promise.resolve().then(() => (Va(), Ua)), "../../node_modules/video.js/dist/lang/cs.json": () => Promise.resolve().then(() => (qa(), Wa)), "../../node_modules/video.js/dist/lang/cy.json": () => Promise.resolve().then(() => (Ga(), Ha)), "../../node_modules/video.js/dist/lang/da.json": () => Promise.resolve().then(() => (Ka(), Ya)), "../../node_modules/video.js/dist/lang/de.json": () => Promise.resolve().then(() => (Ja(), Za)), "../../node_modules/video.js/dist/lang/el.json": () => Promise.resolve().then(() => (Qa(), Xa)), "../../node_modules/video.js/dist/lang/en-GB.json": () => Promise.resolve().then(() => (ts(), es)), "../../node_modules/video.js/dist/lang/en.json": () => Promise.resolve().then(() => (ns(), os)), "../../node_modules/video.js/dist/lang/es.json": () => Promise.resolve().then(() => (ss(), as)), "../../node_modules/video.js/dist/lang/et.json": () => Promise.resolve().then(() => (rs(), is)), "../../node_modules/video.js/dist/lang/eu.json": () => Promise.resolve().then(() => (cs(), ls)), "../../node_modules/video.js/dist/lang/fa.json": () => Promise.resolve().then(() => (ds(), us)), "../../node_modules/video.js/dist/lang/fi.json": () => Promise.resolve().then(() => (ms(), ps)), "../../node_modules/video.js/dist/lang/fr.json": () => Promise.resolve().then(() => (gs(), fs)), "../../node_modules/video.js/dist/lang/gd.json": () => Promise.resolve().then(() => (Ds(), hs)), "../../node_modules/video.js/dist/lang/gl.json": () => Promise.resolve().then(() => (ys(), vs)), "../../node_modules/video.js/dist/lang/he.json": () => Promise.resolve().then(() => (ws(), bs)), "../../node_modules/video.js/dist/lang/hi.json": () => Promise.resolve().then(() => (Cs(), ks)), "../../node_modules/video.js/dist/lang/hr.json": () => Promise.resolve().then(() => (Ss(), xs)), "../../node_modules/video.js/dist/lang/hu.json": () => Promise.resolve().then(() => (Fs(), Es)), "../../node_modules/video.js/dist/lang/it.json": () => Promise.resolve().then(() => (Ps(), Ts)), "../../node_modules/video.js/dist/lang/ja.json": () => Promise.resolve().then(() => (As(), js)), "../../node_modules/video.js/dist/lang/ko.json": () => Promise.resolve().then(() => (Rs(), Bs)), "../../node_modules/video.js/dist/lang/lv.json": () => Promise.resolve().then(() => (zs(), Ms)), "../../node_modules/video.js/dist/lang/nb.json": () => Promise.resolve().then(() => (Ls(), _s)), "../../node_modules/video.js/dist/lang/nl.json": () => Promise.resolve().then(() => (Is(), Ns)), "../../node_modules/video.js/dist/lang/nn.json": () => Promise.resolve().then(() => (Os(), $s)), "../../node_modules/video.js/dist/lang/oc.json": () => Promise.resolve().then(() => (Vs(), Us)), "../../node_modules/video.js/dist/lang/pl.json": () => Promise.resolve().then(() => (qs(), Ws)), "../../node_modules/video.js/dist/lang/pt-BR.json": () => Promise.resolve().then(() => (Gs(), Hs)), "../../node_modules/video.js/dist/lang/pt-PT.json": () => Promise.resolve().then(() => (Ks(), Ys)), "../../node_modules/video.js/dist/lang/ro.json": () => Promise.resolve().then(() => (Js(), Zs)), "../../node_modules/video.js/dist/lang/ru.json": () => Promise.resolve().then(() => (Qs(), Xs)), "../../node_modules/video.js/dist/lang/sk.json": () => Promise.resolve().then(() => (ti(), ei)), "../../node_modules/video.js/dist/lang/sl.json": () => Promise.resolve().then(() => (ni(), oi)), "../../node_modules/video.js/dist/lang/sr.json": () => Promise.resolve().then(() => (si(), ai)), "../../node_modules/video.js/dist/lang/sv.json": () => Promise.resolve().then(() => (ri(), ii)), "../../node_modules/video.js/dist/lang/te.json": () => Promise.resolve().then(() => (ci(), li)), "../../node_modules/video.js/dist/lang/th.json": () => Promise.resolve().then(() => (di(), ui)), "../../node_modules/video.js/dist/lang/tr.json": () => Promise.resolve().then(() => (mi(), pi)), "../../node_modules/video.js/dist/lang/uk.json": () => Promise.resolve().then(() => (gi(), fi)), "../../node_modules/video.js/dist/lang/vi.json": () => Promise.resolve().then(() => (Di(), hi)), "../../node_modules/video.js/dist/lang/zh-CN.json": () => Promise.resolve().then(() => (yi(), vi)), "../../node_modules/video.js/dist/lang/zh-Hans.json": () => Promise.resolve().then(() => (wi(), bi)), "../../node_modules/video.js/dist/lang/zh-Hant.json": () => Promise.resolve().then(() => (Ci(), ki)), "../../node_modules/video.js/dist/lang/zh-TW.json": () => Promise.resolve().then(() => (Si(), xi)) }), `../../node_modules/video.js/dist/lang/${l}.json`)).default;
    } catch (b) {
      console.error({ error: b });
    }
    let g = Wt(o), k = await Oj(o.url.origin, r);
    if (!k)
      return o.redirect("404");
    let D = k.videos;
    if (!D || !D.length)
      return new Response(null, { status: 404 });
    let { sortedVids: v, filteredByMatchingReferenceId: C } = Yo(D), E = Go(v, "book");
    C.notMatching?.length && (E.other = C.notMatching);
    let P = E[Object.keys(E)[0]], j = P[0], x = { vids: P, chap: j, verseRouting: void 0 };
    o.response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, must-revalidate");
    let H = { accountId: "", playerId: "" };
    {
      let b = qo(o.request);
      H.accountId = b.env.ACCOUNT_ID, H.playerId = b.env.PLAYER_ID;
    }
    return !H.accountId || !H.playerId ? o.redirect("404") : J`${ne(e, "Layout", Fe, { title: `DOT ${r}` }, { default: (b) => J`
  ${Ce()}<div class="grid grid-rows-[auto_auto_1fr] overflow-y-auto">
      ${ne(b, "AppWrapper", Ei, { "client:load": true, userPreferences: g, initialData: x, playlist: r, vids: E, locale: l, initialDict: c, videojsInitalDict: d, playerEnv: H, "client:component-hydration": "load", "client:component-path": "@components/AppWrapper", "client:component-export": "AppWrapper" })}
 </div> 
` })}`;
  }, "/Users/willkelly/Documents/Work/Code/DotWeb/src/pages/index.astro", void 0), $L = "/Users/willkelly/Documents/Work/Code/DotWeb/src/pages/index.astro", OL = "", UL = Object.freeze(Object.defineProperty({ __proto__: null, default: Vj, file: $L, url: OL }, Symbol.toStringTag, { value: "Module" })), VL = ke(), Wj = we(async (e, t, n) => {
    let o = e.createAstro(VL, t, n);
    o.self = Wj;
    let a = o.url.origin;
    (a.includes("dot-web.pages.dev") || a.includes("127.0.0.1") || a.includes("localhost")) && (a = "benin");
    let s = Object.keys(me).find((W) => a.toLowerCase().includes(W.toLowerCase()));
    if (!s || !me[s])
      return o.redirect("404");
    let r = me[s].playlist, { bookChap: l } = o.params;
    if (!r)
      return o.redirect("404");
    let u = Je(o.request), c = await Ze(Object.assign({ "../../i18n/en.ts": () => Promise.resolve().then(() => (Ro(), Bo)), "../../i18n/fr.ts": () => Promise.resolve().then(() => (zo(), Mo)), "../../i18n/index.ts": () => Promise.resolve().then(() => (Xe(), tn)).then((W) => W.K) }), `../../i18n/${u}.ts`), d = { [u]: c.default }, g;
    try {
      g = (await Ze(Object.assign({ "../../../node_modules/video.js/dist/lang/ar.json": () => Promise.resolve().then(() => (za(), Ma)), "../../../node_modules/video.js/dist/lang/ba.json": () => Promise.resolve().then(() => (La(), _a)), "../../../node_modules/video.js/dist/lang/bg.json": () => Promise.resolve().then(() => (Ia(), Na)), "../../../node_modules/video.js/dist/lang/bn.json": () => Promise.resolve().then(() => (Oa(), $a)), "../../../node_modules/video.js/dist/lang/ca.json": () => Promise.resolve().then(() => (Va(), Ua)), "../../../node_modules/video.js/dist/lang/cs.json": () => Promise.resolve().then(() => (qa(), Wa)), "../../../node_modules/video.js/dist/lang/cy.json": () => Promise.resolve().then(() => (Ga(), Ha)), "../../../node_modules/video.js/dist/lang/da.json": () => Promise.resolve().then(() => (Ka(), Ya)), "../../../node_modules/video.js/dist/lang/de.json": () => Promise.resolve().then(() => (Ja(), Za)), "../../../node_modules/video.js/dist/lang/el.json": () => Promise.resolve().then(() => (Qa(), Xa)), "../../../node_modules/video.js/dist/lang/en-GB.json": () => Promise.resolve().then(() => (ts(), es)), "../../../node_modules/video.js/dist/lang/en.json": () => Promise.resolve().then(() => (ns(), os)), "../../../node_modules/video.js/dist/lang/es.json": () => Promise.resolve().then(() => (ss(), as)), "../../../node_modules/video.js/dist/lang/et.json": () => Promise.resolve().then(() => (rs(), is)), "../../../node_modules/video.js/dist/lang/eu.json": () => Promise.resolve().then(() => (cs(), ls)), "../../../node_modules/video.js/dist/lang/fa.json": () => Promise.resolve().then(() => (ds(), us)), "../../../node_modules/video.js/dist/lang/fi.json": () => Promise.resolve().then(() => (ms(), ps)), "../../../node_modules/video.js/dist/lang/fr.json": () => Promise.resolve().then(() => (gs(), fs)), "../../../node_modules/video.js/dist/lang/gd.json": () => Promise.resolve().then(() => (Ds(), hs)), "../../../node_modules/video.js/dist/lang/gl.json": () => Promise.resolve().then(() => (ys(), vs)), "../../../node_modules/video.js/dist/lang/he.json": () => Promise.resolve().then(() => (ws(), bs)), "../../../node_modules/video.js/dist/lang/hi.json": () => Promise.resolve().then(() => (Cs(), ks)), "../../../node_modules/video.js/dist/lang/hr.json": () => Promise.resolve().then(() => (Ss(), xs)), "../../../node_modules/video.js/dist/lang/hu.json": () => Promise.resolve().then(() => (Fs(), Es)), "../../../node_modules/video.js/dist/lang/it.json": () => Promise.resolve().then(() => (Ps(), Ts)), "../../../node_modules/video.js/dist/lang/ja.json": () => Promise.resolve().then(() => (As(), js)), "../../../node_modules/video.js/dist/lang/ko.json": () => Promise.resolve().then(() => (Rs(), Bs)), "../../../node_modules/video.js/dist/lang/lv.json": () => Promise.resolve().then(() => (zs(), Ms)), "../../../node_modules/video.js/dist/lang/nb.json": () => Promise.resolve().then(() => (Ls(), _s)), "../../../node_modules/video.js/dist/lang/nl.json": () => Promise.resolve().then(() => (Is(), Ns)), "../../../node_modules/video.js/dist/lang/nn.json": () => Promise.resolve().then(() => (Os(), $s)), "../../../node_modules/video.js/dist/lang/oc.json": () => Promise.resolve().then(() => (Vs(), Us)), "../../../node_modules/video.js/dist/lang/pl.json": () => Promise.resolve().then(() => (qs(), Ws)), "../../../node_modules/video.js/dist/lang/pt-BR.json": () => Promise.resolve().then(() => (Gs(), Hs)), "../../../node_modules/video.js/dist/lang/pt-PT.json": () => Promise.resolve().then(() => (Ks(), Ys)), "../../../node_modules/video.js/dist/lang/ro.json": () => Promise.resolve().then(() => (Js(), Zs)), "../../../node_modules/video.js/dist/lang/ru.json": () => Promise.resolve().then(() => (Qs(), Xs)), "../../../node_modules/video.js/dist/lang/sk.json": () => Promise.resolve().then(() => (ti(), ei)), "../../../node_modules/video.js/dist/lang/sl.json": () => Promise.resolve().then(() => (ni(), oi)), "../../../node_modules/video.js/dist/lang/sr.json": () => Promise.resolve().then(() => (si(), ai)), "../../../node_modules/video.js/dist/lang/sv.json": () => Promise.resolve().then(() => (ri(), ii)), "../../../node_modules/video.js/dist/lang/te.json": () => Promise.resolve().then(() => (ci(), li)), "../../../node_modules/video.js/dist/lang/th.json": () => Promise.resolve().then(() => (di(), ui)), "../../../node_modules/video.js/dist/lang/tr.json": () => Promise.resolve().then(() => (mi(), pi)), "../../../node_modules/video.js/dist/lang/uk.json": () => Promise.resolve().then(() => (gi(), fi)), "../../../node_modules/video.js/dist/lang/vi.json": () => Promise.resolve().then(() => (Di(), hi)), "../../../node_modules/video.js/dist/lang/zh-CN.json": () => Promise.resolve().then(() => (yi(), vi)), "../../../node_modules/video.js/dist/lang/zh-Hans.json": () => Promise.resolve().then(() => (wi(), bi)), "../../../node_modules/video.js/dist/lang/zh-Hant.json": () => Promise.resolve().then(() => (Ci(), ki)), "../../../node_modules/video.js/dist/lang/zh-TW.json": () => Promise.resolve().then(() => (Si(), xi)) }), `../../../node_modules/video.js/dist/lang/${u}.json`)).default;
    } catch (W) {
      console.error({ error: W });
    }
    let k = Wt(o), D = await Oj(o.url.origin, r);
    if (!D)
      return o.redirect("404");
    let v = D.videos;
    if (!v || !v.length)
      return new Response(null, { status: 404 });
    let { sortedVids: C, filteredByMatchingReferenceId: E } = Yo(v), P = Go(C, "book");
    E.notMatching?.length && (P.other = E.notMatching);
    let j = /^([\d\w]+)(?:\.)?(\d+)?(?:\.)?(\d+)?/i, x = l && l.match(j), H = x && x?.[1]?.toUpperCase(), b = x && Number(x?.[2]), M = x && x?.[3] || void 0, K = H && P[H] ? P[H] : P[Object.keys(P)[0]], Pe = K.findIndex((W) => Number(W.chapter) == Number(b)), F = Pe > -1 ? K[Pe] : K[0], O = { vids: K, chap: F, verseRouting: M };
    o.response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, must-revalidate");
    let I = { accountId: "", playerId: "" };
    {
      let W = qo(o.request);
      I.accountId = W.env.ACCOUNT_ID, I.playerId = W.env.PLAYER_ID;
    }
    return !I.accountId || !I.playerId ? o.redirect("404") : J`${ne(e, "Layout", Fe, { title: r }, { default: (W) => J`
  ${Ce()}<div class="grid grid-rows-[auto_auto_1fr] overflow-y-auto">
      ${ne(W, "AppWrapper", Ei, { "client:load": true, userPreferences: k, initialData: O, playlist: r, vids: P, locale: u, initialDict: d, videojsInitalDict: g, playerEnv: I, "client:component-hydration": "load", "client:component-path": "@components/AppWrapper", "client:component-export": "AppWrapper" })}
 </div> 
` })}`;
  }, "/Users/willkelly/Documents/Work/Code/DotWeb/src/pages/[bookChap]/index.astro", void 0), WL = "/Users/willkelly/Documents/Work/Code/DotWeb/src/pages/[bookChap]/index.astro", qL = "/[bookChap]", HL = Object.freeze(Object.defineProperty({ __proto__: null, default: Wj, file: WL, url: qL }, Symbol.toStringTag, { value: "Module" }));
});
var qj = {};
h(qj, { onRequest: () => Ee, page: () => GL, renderers: () => ge });
var DO;
var bO;
var GL;
var Hj = p(() => {
  "use strict";
  Ke();
  ft();
  Z();
  G();
  DO = A(X(), 1);
  Q();
  ee();
  bO = A(te(), 1);
  oe();
  GL = () => Promise.resolve().then(() => (Ti(), Fi)).then((e) => e.i);
});
var Xj = {};
h(Xj, { Content: () => Jj, compiledContent: () => ZL, default: () => Jj, file: () => Kj, frontmatter: () => Yj, getHeadings: () => JL, images: () => Pi, rawContent: () => KL, url: () => Zj });
function YL(e) {
  return e.replaceAll(/__ASTRO_IMAGE_="(.+)"/gm, (t, n) => de({ src: Pi[n].src, ...Pi[n].attributes }));
}
function KL() {
  return `# Licence

Another!
Traduction en langue des signes du B\xE9nin \xA92023 La Bible en Toutes Langues Communaut\xE9 de Missions.
Publi\xE9 sous une licence internationale Creative Commons Attribution-Share Alike 4.0.

La traduction est bas\xE9e sur la Bible Louis Segond 1910 du domaine public, disponible sur  [https://bibleineverylanguage.org](https://bibleineverylanguage.org)
Pour en savoir plus sur la licence Creative Commons, visitez le site https://creativecommons.org/licenses/by-sa/4.0/deed.fr.
[https://creativecommons.org/licenses/by-sa/4.0/deed.fr](https://creativecommons.org/licenses/by-sa/4.0/deed.fr)
`;
}
function ZL() {
  return Gj;
}
function JL() {
  return [{ depth: 1, slug: "licence", text: "Licence" }];
}
async function Jj() {
  let { layout: e, ...t } = Yj;
  return t.file = Kj, t.url = Zj, pe(ue, { "set:html": Gj });
}
var EO;
var PO;
var Pi;
var Gj;
var Yj;
var Kj;
var Zj;
var Qj = p(() => {
  "use strict";
  Z();
  G();
  EO = A(X(), 1);
  Q();
  ee();
  PO = A(te(), 1);
  oe();
  Pi = {};
  Gj = YL(`<h1 id="licence">Licence</h1>
<p>Another!
Traduction en langue des signes du B\xE9nin \xA92023 La Bible en Toutes Langues Communaut\xE9 de Missions.
Publi\xE9 sous une licence internationale Creative Commons Attribution-Share Alike 4.0.</p>
<p>La traduction est bas\xE9e sur la Bible Louis Segond 1910 du domaine public, disponible sur  <a href="https://bibleineverylanguage.org">https://bibleineverylanguage.org</a>
Pour en savoir plus sur la licence Creative Commons, visitez le site <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr">https://creativecommons.org/licenses/by-sa/4.0/deed.fr</a>.
<a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr">https://creativecommons.org/licenses/by-sa/4.0/deed.fr</a></p>`), Yj = {}, Kj = "/Users/willkelly/Documents/Work/Code/DotWeb/src/licenses/another.md", Zj = void 0;
  Jj[Symbol.for("astro.needsHeadRendering")] = true;
});
var sA = {};
h(sA, { Content: () => aA, compiledContent: () => eN, default: () => aA, file: () => oA, frontmatter: () => tA, getHeadings: () => tN, images: () => ji, rawContent: () => QL, url: () => nA });
function XL(e) {
  return e.replaceAll(/__ASTRO_IMAGE_="(.+)"/gm, (t, n) => de({ src: ji[n].src, ...ji[n].attributes }));
}
function QL() {
  return `# Licence
Traduction en langue des signes du B\xE9nin \xA92023 La Bible en Toutes Langues Communaut\xE9 de Missions.
Publi\xE9 sous une licence internationale Creative Commons Attribution-Share Alike 4.0.

La traduction est bas\xE9e sur la Bible Louis Segond 1910 du domaine public, disponible sur [https://bibleineverylanguage.org](https://bibleineverylanguage.org)
Pour en savoir plus sur la licence Creative Commons, visitez le site [https://creativecommons.org/licenses/by-sa/4.0/deed.fr](https://creativecommons.org/licenses/by-sa/4.0/deed.fr)
`;
}
function eN() {
  return eA;
}
function tN() {
  return [{ depth: 1, slug: "licence", text: "Licence" }];
}
async function aA() {
  let { layout: e, ...t } = tA;
  return t.file = oA, t.url = nA, pe(ue, { "set:html": eA });
}
var RO;
var _O;
var ji;
var eA;
var tA;
var oA;
var nA;
var iA = p(() => {
  "use strict";
  Z();
  G();
  RO = A(X(), 1);
  Q();
  ee();
  _O = A(te(), 1);
  oe();
  ji = {};
  eA = XL(`<h1 id="licence">Licence</h1>
<p>Traduction en langue des signes du B\xE9nin \xA92023 La Bible en Toutes Langues Communaut\xE9 de Missions.
Publi\xE9 sous une licence internationale Creative Commons Attribution-Share Alike 4.0.</p>
<p>La traduction est bas\xE9e sur la Bible Louis Segond 1910 du domaine public, disponible sur <a href="https://bibleineverylanguage.org">https://bibleineverylanguage.org</a>
Pour en savoir plus sur la licence Creative Commons, visitez le site <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr">https://creativecommons.org/licenses/by-sa/4.0/deed.fr</a></p>`), tA = {}, oA = "/Users/willkelly/Documents/Work/Code/DotWeb/src/licenses/benin.md", nA = void 0;
  aA[Symbol.for("astro.needsHeadRendering")] = true;
});
var pA = {};
h(pA, { Content: () => dA, compiledContent: () => aN, default: () => dA, file: () => cA, frontmatter: () => lA, getHeadings: () => sN, images: () => Ai, rawContent: () => nN, url: () => uA });
function oN(e) {
  return e.replaceAll(/__ASTRO_IMAGE_="(.+)"/gm, (t, n) => de({ src: Ai[n].src, ...Ai[n].attributes }));
}
function nN() {
  return `# Langue des signes de C\xF4te d'Ivoire Nouveau Testament
\xA92023 La Bible en Toutes Langues Communaut\xE9 de Missions.
Publi\xE9 sous une licence internationale Creative Commons Attribution-Share Alike 4.0.

La traduction est bas\xE9e sur la Bible Louis Segond 1910 du domaine public, disponible sur  [https://bibleineverylanguage.org](https://bibleineverylanguage.org). 
Pour en savoir plus sur la licence Creative Commons, visitez le site [https://creativecommons.org/licenses/by-sa/4.0/deed.fr](https://creativecommons.org/licenses/by-sa/4.0/deed.fr)`;
}
function aN() {
  return rA;
}
function sN() {
  return [{ depth: 1, slug: "langue-des-signes-de-c\xF4te-divoire-nouveau-testament", text: "Langue des signes de C\xF4te d\u2019Ivoire Nouveau Testament" }];
}
async function dA() {
  let { layout: e, ...t } = lA;
  return t.file = cA, t.url = uA, pe(ue, { "set:html": rA });
}
var $O;
var VO;
var Ai;
var rA;
var lA;
var cA;
var uA;
var mA = p(() => {
  "use strict";
  Z();
  G();
  $O = A(X(), 1);
  Q();
  ee();
  VO = A(te(), 1);
  oe();
  Ai = {};
  rA = oN(`<h1 id="langue-des-signes-de-c\xF4te-divoire-nouveau-testament">Langue des signes de C\xF4te d\u2019Ivoire Nouveau Testament</h1>
<p>\xA92023 La Bible en Toutes Langues Communaut\xE9 de Missions.
Publi\xE9 sous une licence internationale Creative Commons Attribution-Share Alike 4.0.</p>
<p>La traduction est bas\xE9e sur la Bible Louis Segond 1910 du domaine public, disponible sur  <a href="https://bibleineverylanguage.org">https://bibleineverylanguage.org</a>.
Pour en savoir plus sur la licence Creative Commons, visitez le site <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr">https://creativecommons.org/licenses/by-sa/4.0/deed.fr</a></p>`), lA = {}, cA = "/Users/willkelly/Documents/Work/Code/DotWeb/src/licenses/cotdivoir.md", uA = void 0;
  dA[Symbol.for("astro.needsHeadRendering")] = true;
});
var yA = {};
h(yA, { Content: () => vA, compiledContent: () => lN, default: () => vA, file: () => hA, frontmatter: () => gA, getHeadings: () => cN, images: () => Bi, rawContent: () => rN, url: () => DA });
function iN(e) {
  return e.replaceAll(/__ASTRO_IMAGE_="(.+)"/gm, (t, n) => de({ src: Bi[n].src, ...Bi[n].attributes }));
}
function rN() {
  return `# Ghanaian Sign Language New Testament
\xA92023 Bible in Every Language Missions Community
Released under a Creative Commons Attribution-Share Alike 4.0 International License.

This translation is based on the English Unlocked Literal Bible by Wycliffe Associates, CC BY-SA 4.0, available at [https://bibleineverylanguage.org/translations](https://bibleineverylanguage.org/translations).
For more information about the Creative Commons License visit [https://creativecommons.org/licenses/by-sa/4.0/](https://creativecommons.org/licenses/by-sa/4.0/).`;
}
function lN() {
  return fA;
}
function cN() {
  return [{ depth: 1, slug: "ghanaian-sign-language-new-testament", text: "Ghanaian Sign Language New Testament" }];
}
async function vA() {
  let { layout: e, ...t } = gA;
  return t.file = hA, t.url = DA, pe(ue, { "set:html": fA });
}
var GO;
var ZO;
var Bi;
var fA;
var gA;
var hA;
var DA;
var bA = p(() => {
  "use strict";
  Z();
  G();
  GO = A(X(), 1);
  Q();
  ee();
  ZO = A(te(), 1);
  oe();
  Bi = {};
  fA = iN(`<h1 id="ghanaian-sign-language-new-testament">Ghanaian Sign Language New Testament</h1>
<p>\xA92023 Bible in Every Language Missions Community
Released under a Creative Commons Attribution-Share Alike 4.0 International License.</p>
<p>This translation is based on the English Unlocked Literal Bible by Wycliffe Associates, CC BY-SA 4.0, available at <a href="https://bibleineverylanguage.org/translations">https://bibleineverylanguage.org/translations</a>.
For more information about the Creative Commons License visit <a href="https://creativecommons.org/licenses/by-sa/4.0/">https://creativecommons.org/licenses/by-sa/4.0/</a>.</p>`), gA = {}, hA = "/Users/willkelly/Documents/Work/Code/DotWeb/src/licenses/ghana.md", DA = void 0;
  vA[Symbol.for("astro.needsHeadRendering")] = true;
});
var EA = {};
h(EA, { Content: () => SA, compiledContent: () => pN, default: () => SA, file: () => CA, frontmatter: () => kA, getHeadings: () => mN, images: () => Ri, rawContent: () => dN, url: () => xA });
function uN(e) {
  return e.replaceAll(/__ASTRO_IMAGE_="(.+)"/gm, (t, n) => de({ src: Ri[n].src, ...Ri[n].attributes }));
}
function dN() {
  return `# Malawian Sign Language New Testament
\xA92023 Bible in Every Language Missions Community
Released under a Creative Commons Attribution-Share Alike 4.0 International License.

This translation is based on the English Unlocked Literal Bible by Wycliffe Associates, CC BY-SA 4.0, available at [https://bibleineverylanguage.org/translations](https://bibleineverylanguage.org/translations).
For more information about the Creative Commons License visit [https://creativecommons.org/licenses/by-sa/4.0/](https://creativecommons.org/licenses/by-sa/4.0/).`;
}
function pN() {
  return wA;
}
function mN() {
  return [{ depth: 1, slug: "malawian-sign-language-new-testament", text: "Malawian Sign Language New Testament" }];
}
async function SA() {
  let { layout: e, ...t } = kA;
  return t.file = CA, t.url = xA, pe(ue, { "set:html": wA });
}
var eU;
var nU;
var Ri;
var wA;
var kA;
var CA;
var xA;
var FA = p(() => {
  "use strict";
  Z();
  G();
  eU = A(X(), 1);
  Q();
  ee();
  nU = A(te(), 1);
  oe();
  Ri = {};
  wA = uN(`<h1 id="malawian-sign-language-new-testament">Malawian Sign Language New Testament</h1>
<p>\xA92023 Bible in Every Language Missions Community
Released under a Creative Commons Attribution-Share Alike 4.0 International License.</p>
<p>This translation is based on the English Unlocked Literal Bible by Wycliffe Associates, CC BY-SA 4.0, available at <a href="https://bibleineverylanguage.org/translations">https://bibleineverylanguage.org/translations</a>.
For more information about the Creative Commons License visit <a href="https://creativecommons.org/licenses/by-sa/4.0/">https://creativecommons.org/licenses/by-sa/4.0/</a>.</p>`), kA = {}, CA = "/Users/willkelly/Documents/Work/Code/DotWeb/src/licenses/malawi.md", xA = void 0;
  SA[Symbol.for("astro.needsHeadRendering")] = true;
});
var RA = {};
h(RA, { Content: () => BA, compiledContent: () => hN, default: () => BA, file: () => jA, frontmatter: () => PA, getHeadings: () => DN, images: () => Mi, rawContent: () => gN, url: () => AA });
function fN(e) {
  return e.replaceAll(/__ASTRO_IMAGE_="(.+)"/gm, (t, n) => de({ src: Mi[n].src, ...Mi[n].attributes }));
}
function gN() {
  return `# Langue des signes du Togo Nouveau Testament 
\xA92023 La Bible en Toutes Langues Communaut\xE9 de Missions.
Publi\xE9 sous une licence internationale Creative Commons Attribution-Share Alike 4.0.

La traduction est bas\xE9e sur la Bible Louis Segond 1910 du domaine public, disponible sur [https://bibleineverylanguage.org](https://bibleineverylanguage.org)
Pour en savoir plus sur la licence Creative Commons, visitez le site [https://creativecommons.org/licenses/by-sa/4.0/deed.fr](https://creativecommons.org/licenses/by-sa/4.0/deed.fr)`;
}
function hN() {
  return TA;
}
function DN() {
  return [{ depth: 1, slug: "langue-des-signes-du-togo-nouveau-testament", text: "Langue des signes du Togo Nouveau Testament" }];
}
async function BA() {
  let { layout: e, ...t } = PA;
  return t.file = jA, t.url = AA, pe(ue, { "set:html": TA });
}
var rU;
var uU;
var Mi;
var TA;
var PA;
var jA;
var AA;
var MA = p(() => {
  "use strict";
  Z();
  G();
  rU = A(X(), 1);
  Q();
  ee();
  uU = A(te(), 1);
  oe();
  Mi = {};
  TA = fN(`<h1 id="langue-des-signes-du-togo-nouveau-testament">Langue des signes du Togo Nouveau Testament</h1>
<p>\xA92023 La Bible en Toutes Langues Communaut\xE9 de Missions.
Publi\xE9 sous une licence internationale Creative Commons Attribution-Share Alike 4.0.</p>
<p>La traduction est bas\xE9e sur la Bible Louis Segond 1910 du domaine public, disponible sur <a href="https://bibleineverylanguage.org">https://bibleineverylanguage.org</a>
Pour en savoir plus sur la licence Creative Commons, visitez le site <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr">https://creativecommons.org/licenses/by-sa/4.0/deed.fr</a></p>`), PA = {}, jA = "/Users/willkelly/Documents/Work/Code/DotWeb/src/licenses/togo.md", AA = void 0;
  BA[Symbol.for("astro.needsHeadRendering")] = true;
});
var _A = {};
h(_A, { default: () => zA, file: () => yN, url: () => bN });
var hU;
var yU;
var vN;
var zA;
var yN;
var bN;
var LA = p(() => {
  "use strict";
  Z();
  G();
  Xe();
  on();
  hU = A(X(), 1);
  Q();
  ee();
  yU = A(te(), 1);
  oe();
  vN = ke(), zA = we(async (e, t, n) => {
    let o = e.createAstro(vN, t, n);
    o.self = zA;
    let a = await o.glob(Object.assign({ "../licenses/another.md": () => Promise.resolve().then(() => (Qj(), Xj)), "../licenses/benin.md": () => Promise.resolve().then(() => (iA(), sA)), "../licenses/cotdivoir.md": () => Promise.resolve().then(() => (mA(), pA)), "../licenses/ghana.md": () => Promise.resolve().then(() => (bA(), yA)), "../licenses/malawi.md": () => Promise.resolve().then(() => (FA(), EA)), "../licenses/togo.md": () => Promise.resolve().then(() => (MA(), RA)) }), () => "../licenses/*.md"), s = o.url.origin;
    s.includes("dot-web.pages.dev") && (s = "benin");
    let i = Object.keys(me).find((c) => s.toLowerCase().includes(c.toLowerCase()));
    if (!i)
      return o.redirect("404");
    let r = me[i];
    if (!r || !r.license)
      return o.redirect("404");
    let l = a.find((c) => c.file.toLowerCase().includes(r.license.toLowerCase())), u = l ? l.Content : "couldn't find that";
    return J`${ne(e, "Layout", Fe, { title: "license" }, { default: (c) => J`
	${Ce()}<div class="max-w-prose mx-auto p-4 licenseContainer text-xl leading-loose">
		${ne(c, "Content", u, {})}
	</div>
` })}`;
  }, "/Users/willkelly/Documents/Work/Code/DotWeb/src/pages/license.astro", void 0), yN = "/Users/willkelly/Documents/Work/Code/DotWeb/src/pages/license.astro", bN = "/license";
});
var NA = {};
h(NA, { onRequest: () => Ee, page: () => wN, renderers: () => ge });
var CU;
var EU;
var wN;
var IA = p(() => {
  "use strict";
  Ke();
  ft();
  Z();
  G();
  CU = A(X(), 1);
  Q();
  ee();
  EU = A(te(), 1);
  oe();
  wN = () => Promise.resolve().then(() => (LA(), _A));
});
var $A = {};
h($A, { onRequest: () => Ee, page: () => kN, renderers: () => ge });
var BU;
var zU;
var kN;
var OA = p(() => {
  "use strict";
  Ke();
  ft();
  Z();
  G();
  BU = A(X(), 1);
  Q();
  ee();
  zU = A(te(), 1);
  oe();
  kN = () => Promise.resolve().then(() => (on(), yc)).then((e) => e.a);
});
var UA = {};
h(UA, { onRequest: () => Ee, page: () => CN, renderers: () => ge });
var OU;
var WU;
var CN;
var VA = p(() => {
  "use strict";
  Ke();
  ft();
  Z();
  G();
  OU = A(X(), 1);
  Q();
  ee();
  WU = A(te(), 1);
  oe();
  CN = () => Promise.resolve().then(() => (Xe(), tn)).then((e) => e.M);
});
var WA = {};
h(WA, { onRequest: () => Ee, page: () => xN, renderers: () => ge });
var ZU;
var QU;
var xN;
var qA = p(() => {
  "use strict";
  Ke();
  ft();
  Z();
  G();
  ZU = A(X(), 1);
  Q();
  ee();
  QU = A(te(), 1);
  oe();
  xN = () => Promise.resolve().then(() => (Ti(), Fi)).then((e) => e.a);
});
Z();
Ke();
var sV = A(te(), 1);
var iV = A(X(), 1);
ee();
Q();
G();
oe();
var SN = typeof process == "object" && Object.prototype.toString.call(process) === "[object process]";
function EN() {
  return new Proxy({}, { get: (e, t) => {
    console.warn(`Unable to access \`import.meta\0.env.${t.toString()}\` on initialization as the Cloudflare platform only provides the environment variables per request. Please move the environment variable access inside a function that's only called after a request has been received.`);
  } });
}
SN || (process.env = EN());
function YA(e) {
  let t = new uo(e);
  return { onRequest: async ({ request: o, next: a, ...s }) => {
    process.env = s.env;
    let { pathname: i } = new URL(o.url);
    if (e.assets.has(i))
      return s.env.ASSETS.fetch(o);
    let r = t.match(o, { matchNotFound: true });
    if (r) {
      Reflect.set(o, Symbol.for("astro.clientAddress"), o.headers.get("cf-connecting-ip")), Reflect.set(o, Symbol.for("runtime"), { ...s, waitUntil: (u) => {
        s.waitUntil(u);
      }, name: "cloudflare", next: a, caches, cf: o.cf });
      let l = await t.render(o, r);
      if (t.setCookieHeaders)
        for (let u of t.setCookieHeaders(l))
          l.headers.append("Set-Cookie", u);
      return l;
    }
    return new Response(null, { status: 404, statusText: "Not found" });
  }, manifest: e };
}
var HA = Object.freeze(Object.defineProperty({ __proto__: null, createExports: YA }, Symbol.toStringTag, { value: "Module" }));
var FN = () => Promise.resolve().then(() => (Hj(), qj));
var TN = () => Promise.resolve().then(() => (IA(), NA));
var PN = () => Promise.resolve().then(() => (OA(), $A));
var jN = () => Promise.resolve().then(() => (VA(), UA));
var AN = () => Promise.resolve().then(() => (qA(), WA));
var BN = /* @__PURE__ */ new Map([["src/pages/index.astro", FN], ["src/pages/license.astro", TN], ["src/pages/about.astro", PN], ["src/pages/404.astro", jN], ["src/pages/[bookChap]/index.astro", AN]]);
var KA = Object.assign(el({ adapterName: "@astrojs/cloudflare", routes: [{ file: "", links: [], scripts: [{ type: "external", value: "/_astro/hoisted.8356ea11.js" }], styles: [{ type: "external", src: "/_astro/404.ebd4f98a.css" }], routeData: { route: "/", type: "page", pattern: "^\\/$", segments: [], params: [], component: "src/pages/index.astro", pathname: "/", prerender: false, _meta: { trailingSlash: "ignore" } } }, { file: "", links: [], scripts: [{ type: "external", value: "/_astro/hoisted.8356ea11.js" }], styles: [{ type: "external", src: "/_astro/404.ebd4f98a.css" }], routeData: { route: "/license", type: "page", pattern: "^\\/license\\/?$", segments: [[{ content: "license", dynamic: false, spread: false }]], params: [], component: "src/pages/license.astro", pathname: "/license", prerender: false, _meta: { trailingSlash: "ignore" } } }, { file: "", links: [], scripts: [{ type: "external", value: "/_astro/hoisted.8356ea11.js" }], styles: [{ type: "external", src: "/_astro/404.ebd4f98a.css" }, { type: "external", src: "/_astro/about.ee3f5e84.css" }], routeData: { route: "/about", type: "page", pattern: "^\\/about\\/?$", segments: [[{ content: "about", dynamic: false, spread: false }]], params: [], component: "src/pages/about.astro", pathname: "/about", prerender: false, _meta: { trailingSlash: "ignore" } } }, { file: "", links: [], scripts: [{ type: "external", value: "/_astro/hoisted.8356ea11.js" }], styles: [{ type: "external", src: "/_astro/404.ebd4f98a.css" }], routeData: { route: "/404", type: "page", pattern: "^\\/404\\/?$", segments: [[{ content: "404", dynamic: false, spread: false }]], params: [], component: "src/pages/404.astro", pathname: "/404", prerender: false, _meta: { trailingSlash: "ignore" } } }, { file: "", links: [], scripts: [{ type: "external", value: "/_astro/hoisted.8356ea11.js" }], styles: [{ type: "external", src: "/_astro/404.ebd4f98a.css" }], routeData: { route: "/[bookchap]", type: "page", pattern: "^\\/([^/]+?)\\/?$", segments: [[{ content: "bookChap", dynamic: true, spread: false }]], params: ["bookChap"], component: "src/pages/[bookChap]/index.astro", prerender: false, _meta: { trailingSlash: "ignore" } } }], base: "/", compressHTML: false, markdown: { drafts: false, syntaxHighlight: "shiki", shikiConfig: { langs: [], theme: "github-dark", wrap: false }, remarkPlugins: [], rehypePlugins: [], remarkRehype: {}, gfm: true, smartypants: true }, componentMetadata: [["/Users/willkelly/Documents/Work/Code/DotWeb/src/pages/404.astro", { propagation: "none", containsHead: true }], ["/Users/willkelly/Documents/Work/Code/DotWeb/src/pages/[bookChap]/index.astro", { propagation: "none", containsHead: true }], ["/Users/willkelly/Documents/Work/Code/DotWeb/src/pages/about.astro", { propagation: "none", containsHead: true }], ["/Users/willkelly/Documents/Work/Code/DotWeb/src/pages/index.astro", { propagation: "none", containsHead: true }], ["/Users/willkelly/Documents/Work/Code/DotWeb/src/pages/license.astro", { propagation: "none", containsHead: true }]], renderers: [], clientDirectives: [["idle", '(()=>{var i=t=>{let e=async()=>{await(await t())()};"requestIdleCallback"in window?window.requestIdleCallback(e):setTimeout(e,200)};(self.Astro||(self.Astro={})).idle=i;window.dispatchEvent(new Event("astro:idle"));})();'], ["load", '(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event("astro:load"));})();'], ["media", '(()=>{var s=(i,t)=>{let a=async()=>{await(await i())()};if(t.value){let e=matchMedia(t.value);e.matches?a():e.addEventListener("change",a,{once:!0})}};(self.Astro||(self.Astro={})).media=s;window.dispatchEvent(new Event("astro:media"));})();'], ["only", '(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event("astro:only"));})();'], ["visible", '(()=>{var r=(i,c,n)=>{let s=async()=>{await(await i())()},t=new IntersectionObserver(e=>{for(let o of e)if(o.isIntersecting){t.disconnect(),s();break}});for(let e of n.children)t.observe(e)};(self.Astro||(self.Astro={})).visible=r;window.dispatchEvent(new Event("astro:visible"));})();']], entryModules: { "\0@astrojs-ssr-virtual-entry": "_@astrojs-ssr-virtual-entry.mjs", "\0@astro-renderers": "renderers.mjs", "\0empty-middleware": "_empty-middleware.mjs", "/src/pages/license.astro": "chunks/pages/license.astro.795d2b27.mjs", "\0@astro-page:src/pages/index@_@astro": "chunks/index@_@astro.0a6227a1.mjs", "\0@astro-page:src/pages/license@_@astro": "chunks/license@_@astro.903aa61f.mjs", "\0@astro-page:src/pages/about@_@astro": "chunks/about@_@astro.a4dc1e15.mjs", "\0@astro-page:src/pages/404@_@astro": "chunks/404@_@astro.95617a1a.mjs", "\0@astro-page:src/pages/[bookChap]/index@_@astro": "chunks/index@_@astro.7119d41f.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/src/i18n/en.ts": "chunks/en.df01b204.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/src/i18n/fr.ts": "chunks/fr.c2527eed.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/ar.json": "chunks/ar.b1b06b3e.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/ba.json": "chunks/ba.53da8616.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/bg.json": "chunks/bg.223731e4.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/bn.json": "chunks/bn.50fc6e32.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/ca.json": "chunks/ca.3762397b.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/cs.json": "chunks/cs.c1411653.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/cy.json": "chunks/cy.091a83f9.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/da.json": "chunks/da.4cfe933f.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/de.json": "chunks/de.d7726d18.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/el.json": "chunks/el.fa710423.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/en-GB.json": "chunks/en-GB.d08269c0.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/en.json": "chunks/en.2a20a841.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/es.json": "chunks/es.1b76676c.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/et.json": "chunks/et.29cf77f4.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/eu.json": "chunks/eu.36d59d52.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/fa.json": "chunks/fa.d7057d68.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/fi.json": "chunks/fi.81932283.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/fr.json": "chunks/fr.97f90d2a.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/gd.json": "chunks/gd.cced5e53.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/gl.json": "chunks/gl.24a4f0ee.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/he.json": "chunks/he.0da632d3.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/hi.json": "chunks/hi.9b9ce6f2.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/hr.json": "chunks/hr.a8ee246b.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/hu.json": "chunks/hu.af753e65.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/it.json": "chunks/it.df47b857.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/ja.json": "chunks/ja.a69d223c.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/ko.json": "chunks/ko.67c36c38.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/lv.json": "chunks/lv.c65e39ac.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/nb.json": "chunks/nb.1801f9ad.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/nl.json": "chunks/nl.8a86d1e7.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/nn.json": "chunks/nn.113da1a4.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/oc.json": "chunks/oc.7ab8f77a.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/pl.json": "chunks/pl.e13ef262.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/pt-BR.json": "chunks/pt-BR.4baa0584.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/pt-PT.json": "chunks/pt-PT.dd69fe6c.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/ro.json": "chunks/ro.70e8fa50.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/ru.json": "chunks/ru.2f473365.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/sk.json": "chunks/sk.dff11040.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/sl.json": "chunks/sl.8efcf2db.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/sr.json": "chunks/sr.d55459b7.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/sv.json": "chunks/sv.8086ee0f.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/te.json": "chunks/te.f826d93d.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/th.json": "chunks/th.68524b66.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/tr.json": "chunks/tr.bbb3482b.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/uk.json": "chunks/uk.9054779c.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/vi.json": "chunks/vi.0befd8ec.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/zh-CN.json": "chunks/zh-CN.fbf95888.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/zh-Hans.json": "chunks/zh-Hans.dde33a14.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/zh-Hant.json": "chunks/zh-Hant.eeb8b993.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/video.js@8.3.0/node_modules/video.js/dist/lang/zh-TW.json": "chunks/zh-TW.00c19365.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/src/licenses/another.md": "chunks/another.dff07d81.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/src/licenses/benin.md": "chunks/benin.086aaf83.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/src/licenses/cotdivoir.md": "chunks/cotdivoir.771f848c.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/src/licenses/ghana.md": "chunks/ghana.f0612b82.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/src/licenses/malawi.md": "chunks/malawi.a6f181cd.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/src/licenses/togo.md": "chunks/togo.c8a525f9.mjs", "/Users/willkelly/Documents/Work/Code/DotWeb/src/images/Benin-example.jpg": "chunks/Benin-example.8428732c.mjs", "@astrojs/solid-js/client.js": "_astro/client.eebb3450.js", "/astro/hoisted.js?q=0": "_astro/hoisted.8356ea11.js", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/workbox-window@7.0.0/node_modules/workbox-window/build/workbox-window.prod.es5.mjs": "_astro/workbox-window.prod.es5.a7b12eab.js", "@components/AppWrapper": "_astro/AppWrapper.a7c1df1b.js", "/Users/willkelly/Documents/Work/Code/DotWeb/node_modules/.pnpm/@brightcove+player-loader@1.8.0/node_modules/@brightcove/player-loader/dist/brightcove-player-loader.es.js": "_astro/brightcove-player-loader.es.af10c460.js", "@components/Header": "_astro/Header.a6abf841.js", "astro:scripts/before-hydration.js": "" }, assets: ["/_astro/Benin-example.bbd5e4ae.jpg", "/_astro/about.ee3f5e84.css", "/_astro/404.ebd4f98a.css", "/_headers", "/manifest.webmanifest", "/sw.js", "/$server_build/_empty-middleware.mjs", "/$server_build/manifest.webmanifest", "/$server_build/registerSW.js", "/$server_build/renderers.mjs", "/_astro/APG4HSEJ.68a62b30.js", "/_astro/AppWrapper.a7c1df1b.js", "/_astro/Header.a6abf841.js", "/_astro/brightcove-player-loader.es.af10c460.js", "/_astro/client.eebb3450.js", "/_astro/hoisted.8356ea11.js", "/_astro/preload-helper.cf010ec4.js", "/_astro/web.eb29b53f.js", "/_astro/workbox-window.prod.es5.a7b12eab.js", "/icons/android-chrome-192x192.png", "/icons/android-chrome-384x384.png", "/icons/apple-touch-icon.png", "/icons/browserconfig.xml", "/icons/favicon-16x16.png", "/icons/favicon-32x32.png", "/icons/favicon.ico", "/icons/mstile-150x150.png", "/icons/safari-pinned-tab.svg", "/icons/site.webmanifest", "/images/Benin-example.jpg", "/$server_build/_astro/404.ebd4f98a.css", "/$server_build/_astro/Benin-example.bbd5e4ae.jpg", "/$server_build/_astro/about.ee3f5e84.css", "/fonts/montserrat/Montserrat-Bold.woff", "/fonts/montserrat/Montserrat-Bold.woff2", "/fonts/montserrat/Montserrat-Regular.woff", "/fonts/montserrat/Montserrat-Regular.woff2", "/$server_build/chunks/404@_@astro.95617a1a.mjs", "/$server_build/chunks/Benin-example.8428732c.mjs", "/$server_build/chunks/about@_@astro.a4dc1e15.mjs", "/$server_build/chunks/another.dff07d81.mjs", "/$server_build/chunks/ar.b1b06b3e.mjs", "/$server_build/chunks/astro.6db23af5.mjs", "/$server_build/chunks/ba.53da8616.mjs", "/$server_build/chunks/benin.086aaf83.mjs", "/$server_build/chunks/bg.223731e4.mjs", "/$server_build/chunks/bn.50fc6e32.mjs", "/$server_build/chunks/ca.3762397b.mjs", "/$server_build/chunks/cotdivoir.771f848c.mjs", "/$server_build/chunks/cs.c1411653.mjs", "/$server_build/chunks/cy.091a83f9.mjs", "/$server_build/chunks/da.4cfe933f.mjs", "/$server_build/chunks/de.d7726d18.mjs", "/$server_build/chunks/el.fa710423.mjs", "/$server_build/chunks/en-GB.d08269c0.mjs", "/$server_build/chunks/en.2a20a841.mjs", "/$server_build/chunks/en.df01b204.mjs", "/$server_build/chunks/es.1b76676c.mjs", "/$server_build/chunks/et.29cf77f4.mjs", "/$server_build/chunks/eu.36d59d52.mjs", "/$server_build/chunks/fa.d7057d68.mjs", "/$server_build/chunks/fi.81932283.mjs", "/$server_build/chunks/fr.97f90d2a.mjs", "/$server_build/chunks/fr.c2527eed.mjs", "/$server_build/chunks/gd.cced5e53.mjs", "/$server_build/chunks/ghana.f0612b82.mjs", "/$server_build/chunks/gl.24a4f0ee.mjs", "/$server_build/chunks/he.0da632d3.mjs", "/$server_build/chunks/hi.9b9ce6f2.mjs", "/$server_build/chunks/hr.a8ee246b.mjs", "/$server_build/chunks/hu.af753e65.mjs", "/$server_build/chunks/index@_@astro.0a6227a1.mjs", "/$server_build/chunks/index@_@astro.7119d41f.mjs", "/$server_build/chunks/it.df47b857.mjs", "/$server_build/chunks/ja.a69d223c.mjs", "/$server_build/chunks/ko.67c36c38.mjs", "/$server_build/chunks/license@_@astro.903aa61f.mjs", "/$server_build/chunks/lv.c65e39ac.mjs", "/$server_build/chunks/malawi.a6f181cd.mjs", "/$server_build/chunks/nb.1801f9ad.mjs", "/$server_build/chunks/nl.8a86d1e7.mjs", "/$server_build/chunks/nn.113da1a4.mjs", "/$server_build/chunks/oc.7ab8f77a.mjs", "/$server_build/chunks/pl.e13ef262.mjs", "/$server_build/chunks/pt-BR.4baa0584.mjs", "/$server_build/chunks/pt-PT.dd69fe6c.mjs", "/$server_build/chunks/ro.70e8fa50.mjs", "/$server_build/chunks/ru.2f473365.mjs", "/$server_build/chunks/sk.dff11040.mjs", "/$server_build/chunks/sl.8efcf2db.mjs", "/$server_build/chunks/sr.d55459b7.mjs", "/$server_build/chunks/sv.8086ee0f.mjs", "/$server_build/chunks/te.f826d93d.mjs", "/$server_build/chunks/th.68524b66.mjs", "/$server_build/chunks/togo.c8a525f9.mjs", "/$server_build/chunks/tr.bbb3482b.mjs", "/$server_build/chunks/uk.9054779c.mjs", "/$server_build/chunks/vi.0befd8ec.mjs", "/$server_build/chunks/zh-CN.fbf95888.mjs", "/$server_build/chunks/zh-Hans.dde33a14.mjs", "/$server_build/chunks/zh-Hant.eeb8b993.mjs", "/$server_build/chunks/zh-TW.00c19365.mjs", "/$server_build/chunks/pages/404.astro.42cd58d8.mjs", "/$server_build/chunks/pages/about.astro.d7bf95cd.mjs", "/$server_build/chunks/pages/index.astro.5595be1f.mjs", "/$server_build/chunks/pages/license.astro.795d2b27.mjs"] }), { pageMap: BN, renderers: ge });
var RN = void 0;
var ZA = YA(KA);
var dV = ZA.onRequest;
var pV = ZA.manifest;
var GA = "start";
GA in HA && HA[GA](KA, RN);

// ../.wrangler/tmp/pages-B0FAVB/functionsRoutes-0.5705218867060398.mjs
var routes = [
  {
    routePath: "/api/getId",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/getPlaylist",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/:path*",
    mountPath: "/",
    method: "",
    middlewares: [],
    modules: [dV]
  }
];

// ../node_modules/.pnpm/wrangler@3.15.0/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}

// ../node_modules/.pnpm/path-to-regexp@6.2.1/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a2 = options.prefixes, prefixes = _a2 === void 0 ? "./" : _a2;
  var defaultPattern = "[^".concat(escapeString(options.delimiter || "/#?"), "]+?");
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  };
  var mustConsume = function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a3 = tokens[i], nextType = _a3.type, index = _a3.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  };
  var consumeText = function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  };
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || defaultPattern,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
function match(str, options) {
  var keys = [];
  var re2 = pathToRegexp(str, keys, options);
  return regexpToFunction(re2, keys, options);
}
function regexpToFunction(re2, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a2 = options.decode, decode = _a2 === void 0 ? function(x) {
    return x;
  } : _a2;
  return function(pathname) {
    var m9 = re2.exec(pathname);
    if (!m9)
      return false;
    var path = m9[0], index = m9.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = function(i10) {
      if (m9[i10] === void 0)
        return "continue";
      var key = keys[i10 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m9[i10].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m9[i10], key);
      }
    };
    for (var i = 1; i < m9.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a2 = options.strict, strict = _a2 === void 0 ? false : _a2, _b2 = options.start, start = _b2 === void 0 ? true : _b2, _c2 = options.end, end = _c2 === void 0 ? true : _c2, _d2 = options.encode, encode = _d2 === void 0 ? function(x) {
    return x;
  } : _d2, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f2 = options.endsWith, endsWith = _f2 === void 0 ? "" : _f2;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i2 = 0, tokens_1 = tokens; _i2 < tokens_1.length; _i2++) {
    var token = tokens_1[_i2];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            route += "((?:".concat(token.pattern, ")").concat(token.modifier, ")");
          } else {
            route += "(".concat(token.pattern, ")").concat(token.modifier);
          }
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}

// ../node_modules/.pnpm/wrangler@3.15.0/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: () => {
            isFailOpen = true;
          }
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    };
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = (response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
);

// ../node_modules/.pnpm/wrangler@3.15.0/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
var jsonError = async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
};
var middleware_miniflare3_json_error_default = jsonError;
var wrap = void 0;

// ../.wrangler/tmp/bundle-xvc1Uq/middleware-insertion-facade.js
var envWrappers = [wrap].filter(Boolean);
var facade = {
  ...pages_template_worker_default,
  envWrappers,
  middleware: [
    middleware_miniflare3_json_error_default,
    ...pages_template_worker_default.middleware ? pages_template_worker_default.middleware : []
  ].filter(Boolean)
};
var middleware_insertion_facade_default = facade;

// ../.wrangler/tmp/bundle-xvc1Uq/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
var __facade_modules_fetch__ = function(request, env, ctx) {
  if (middleware_insertion_facade_default.fetch === void 0)
    throw new Error("Handler does not export a fetch() function.");
  return middleware_insertion_facade_default.fetch(request, env, ctx);
};
function getMaskedEnv(rawEnv) {
  let env = rawEnv;
  if (middleware_insertion_facade_default.envWrappers && middleware_insertion_facade_default.envWrappers.length > 0) {
    for (const wrapFn of middleware_insertion_facade_default.envWrappers) {
      env = wrapFn(env);
    }
  }
  return env;
}
var registeredMiddleware = false;
var facade2 = {
  ...middleware_insertion_facade_default.tail && {
    tail: maskHandlerEnv(middleware_insertion_facade_default.tail)
  },
  ...middleware_insertion_facade_default.trace && {
    trace: maskHandlerEnv(middleware_insertion_facade_default.trace)
  },
  ...middleware_insertion_facade_default.scheduled && {
    scheduled: maskHandlerEnv(middleware_insertion_facade_default.scheduled)
  },
  ...middleware_insertion_facade_default.queue && {
    queue: maskHandlerEnv(middleware_insertion_facade_default.queue)
  },
  ...middleware_insertion_facade_default.test && {
    test: maskHandlerEnv(middleware_insertion_facade_default.test)
  },
  ...middleware_insertion_facade_default.email && {
    email: maskHandlerEnv(middleware_insertion_facade_default.email)
  },
  fetch(request, rawEnv, ctx) {
    const env = getMaskedEnv(rawEnv);
    if (middleware_insertion_facade_default.middleware && middleware_insertion_facade_default.middleware.length > 0) {
      if (!registeredMiddleware) {
        registeredMiddleware = true;
        for (const middleware of middleware_insertion_facade_default.middleware) {
          __facade_register__(middleware);
        }
      }
      const __facade_modules_dispatch__ = function(type, init) {
        if (type === "scheduled" && middleware_insertion_facade_default.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return middleware_insertion_facade_default.scheduled(controller, env, ctx);
        }
      };
      return __facade_invoke__(
        request,
        env,
        ctx,
        __facade_modules_dispatch__,
        __facade_modules_fetch__
      );
    } else {
      return __facade_modules_fetch__(request, env, ctx);
    }
  }
};
function maskHandlerEnv(handler) {
  return (data, env, ctx) => handler(data, getMaskedEnv(env), ctx);
}
var middleware_loader_entry_default = facade2;
export {
  middleware_loader_entry_default as default
};
/**
 * shortdash - https://github.com/bibig/node-shorthash
 *
 * @license
 *
 * (The MIT License)
 *
 * Copyright (c) 2013 Bibig <bibig@me.com>
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */
/*!
 * Portions of this file are based on code from ariakit.
 * MIT Licensed, Copyright (c) Diego Haz.
 *
 * Credits to the ariakit team:
 * https://github.com/ariakit/ariakit/blob/8a13899ff807bbf39f3d89d2d5964042ba4d5287/packages/ariakit-react-utils/src/hooks.ts
 */
/*!
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/a13802d8be6f83af1450e56f7a88527b10d9cadf/packages/@react-stately/toggle/src/useToggleState.ts
 */
/*!
 * Portions of this file are based on code from ariakit
 * MIT Licensed, Copyright (c) Diego Haz.
 *
 * Credits to the ariakit team:
 * https://github.com/hope-ui/hope-ui/blob/54125b130195f37161dbeeea0c21dc3b198bc3ac/packages/core/src/button/is-button.ts
 */
/*! Bundled license information:

cookie/index.js:
  (*!
   * cookie
   * Copyright(c) 2012-2014 Roman Shtylman
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

@brightcove/player-loader/dist/brightcove-player-loader.es.js:
  (*! @name @brightcove/player-loader @version 1.8.0 @license Apache-2.0 *)
  (*! @name @brightcove/player-url @version 1.2.0 @license Apache-2.0 *)
*/
//# sourceMappingURL=functionsWorker-0.7250311838429451.mjs.map
