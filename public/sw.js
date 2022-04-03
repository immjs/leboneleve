// get service worker origin
const origin = new URL(location.href).origin;

function isValidURL(url) {
  try {
    new URL(url)
    return true;
  } catch (err) {
    return false;
  }
}

function parseCookies(cookies) {
  const [nv, ...cookiesArray] = cookies.split(';');
  const cookiesObject = {
    name: nv.split('=')[0].trim(),
    value: nv.split('=')[1].trim(),
  };
  cookiesArray.forEach(cookie => {
    const cookieKeyValue = cookie.split('=');
    cookiesObject[cookieKeyValue[0].trim()] = cookieKeyValue[1]?.trim() || true;
  });
  return cookiesObject;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

self.addEventListener('fetch', (event) => {
  if (event.request.url.startsWith(`${origin}/portal`)) return;
  event
    .respondWith((async () => {
      let requestURL = event.request.url;
      let windowPortalURL = '';
      let windowClient;
      try {
        windowClient = await event.srcElement.clients.get(event.clientId)
        const windowURL = new URL(windowClient.url);
        windowPortalURL = new URL(decodeURIComponent(windowURL.searchParams.get('url'))).origin;
      } catch (err) {
      }

      if (windowPortalURL && windowPortalURL !== 'null') {
        // map eventid to url for permanent access
        await cookieStore.set({
          name: `GOD_FORBID_YOURE_READING_THIS${event.clientId}`,
          value: windowPortalURL,
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        });
      } else {
        // get url from cookie
        let windowPortalURLObj = await cookieStore.get(`GOD_FORBID_YOURE_READING_THIS${event.clientId}`);

        if (isValidURL(windowPortalURLObj)) {
          windowPortalURL = new URL(windowPortalURLObj).origin;
        }
      }
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      const tops = clients.filter((client) => client.frameType === 'top-level');
      const focusedTop = tops.find((top) => top.focused);

      if (typeof windowPortalURL !== 'string') {
        if (!focusedTop) return;

        const topURL = new URL(focusedTop.url);
        const prevvieURL = new URL(topURL.hash.replace('#', ''));
        const prevvieOrigin = prevvieURL.origin;
        windowPortalURL = prevvieOrigin;
      }

      console.log(windowPortalURL)

      if (!windowPortalURL.endsWith('/')) windowPortalURL = `${windowPortalURL}/`
      if (requestURL.startsWith(`${origin}/`)) {
        requestURL = requestURL.replace(`${origin}/`, windowPortalURL);
      }

      console.log(event.resultingClientId, event)

      if (event.resultingClientId) {
        if (!focusedTop) return;
        focusedTop.postMessage({ type: 'SET_URL', url: requestURL });
      }

      if (windowPortalURL === '' || windowClient?.frameType === 'top-level') return;


      /* const newRequestURL = `${origin}/portal?url=${encodeURIComponent(requestURL)}`;

      const ownHeaders = Object.fromEntries(event.request.headers)
      console.log(ownHeaders)
      
      if (
        ownHeaders['content-type']
        && ownHeaders['content-type'].startsWith('application/json')
      ) ownHeaders['content-type'] = ownHeaders['content-type'].replace('application/json', 'application/isjson');
      
      return fetch(newRequestURL, {
        method: event.request.method,
        body: event.bodyUsed ? await event.request.blob() : undefined,
        headers: ownHeaders,
      }) */
      // Force the browser to go through a redirect
      const ownHeaders = Object.fromEntries(event.request.headers)
      
      if (
        ownHeaders['content-type']
        && ownHeaders['content-type'].startsWith('application/json')
      ) ownHeaders['content-type'] = ownHeaders['content-type'].replace('application/json', 'application/isjson');

      // Get our cookies ourselves
      const cookies = await cookieStore.getAll();
      
      // Parse'n'Filter our cookie paths
      const cookiePaths = cookies.filter((cookie) => {
        if (cookie.name.startsWith('GOD_FORBID_YOURE_READING_THIS')) return false;
        console.log({ cookie })
      });

      return fetch(`${origin}/portal?url=${encodeURIComponent(requestURL)}&origin=${origin}`, {
        method: event.request.method,
        body: event.bodyUsed ? await event.request.blob() : undefined,
        headers: ownHeaders,
      })
        .then(async (response) => {
          const setCookie = response.headers.get('stck-sw');
          if (setCookie) {
            const setCookieParsed = parseCookies(setCookie);
            
            const frameDomain = new URL(origin).hostname;
            if (!setCookieParsed.domain) {
              setCookieParsed.domain = frameDomain;
            }
            if (setCookieParsed.domain.startsWith('.')) {
              setCookieParsed.domain = setCookieParsed.domain.substring(1);
            }
            if (!setCookieParsed.path) {
              setCookieParsed.path = '/';
            }
            setCookieParsed.path = `/${setCookieParsed.Secure ? 'https' : 'http'}/${encodeURIComponent(setCookieParsed.domain)}/${encodeURIComponent(setCookieParsed.path)}`;
            setCookieParsed.domain = frameDomain;
            setCookieParsed.Secure = false;
            if (typeof setCookieParsed.expires === 'string') {
              setCookieParsed.expires = new Date(setCookieParsed.expires);
            }
            if (setCookieParsed.maxAge) {
              setCookieParsed.expires = new Date(Date.now() + setCookieParsed.maxAge * 1000);
            }
            console.log({ setCookieParsed })
            await cookieStore.set(setCookieParsed);
          }

          return response;
        });
    })());
});
