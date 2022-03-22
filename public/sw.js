// get service worker origin
const origin = new URL(location.href).origin;

self.addEventListener('fetch', (event) => {
  if (event.request.url.startsWith(`${origin}/portal`)) return;
  event
    .respondWith((async () => {
      let requestURL = event.request.url;
      let windowPortalURL = '';
      try {
        const windowClient = await event.srcElement.clients.get(event.clientId)
        const windowURL = new URL(windowClient.url);
        windowPortalURL = decodeURIComponent(windowURL.searchParams.get('url'));
      } catch (err) {
      }

      if (windowPortalURL && windowPortalURL !== 'null') {
        // map eventid to url for permanent access
        await cookieStore.set(event.clientId, windowPortalURL);
      } else {
        // get url from cookie
        windowPortalURL = await cookieStore.get(event.clientId);
      }
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      const tops = clients.filter((client) => client.frameType === 'top-level');
      const focusedTop = tops.find((top) => top.focused);

      if (typeof windowPortalURL !== 'string') {
        const topURL = new URL(focusedTop.url);
        const prevvieURL = new URL(topURL.hash.replace('#', ''));
        const prevvieOrigin = prevvieURL.origin;
        windowPortalURL = prevvieOrigin;
      }

      if (!windowPortalURL.endsWith('/')) windowPortalURL = `${windowPortalURL}/`
      if (requestURL.startsWith(`${origin}/`)) {
        requestURL = requestURL.replace(`${origin}/`, windowPortalURL);
      }
      console.log({ event, requestURL })

      if (event.resultingClientId) focusedTop.postMessage({ type: 'SET_URL', url: requestURL });


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
      console.log(ownHeaders)
      
      if (
        ownHeaders['content-type']
        && ownHeaders['content-type'].startsWith('application/json')
      ) ownHeaders['content-type'] = ownHeaders['content-type'].replace('application/json', 'application/isjson');

      return fetch(`${origin}/portal?url=${encodeURIComponent(requestURL)}&origin=${origin}`, {
        method: event.request.method,
        body: event.bodyUsed ? await event.request.blob() : undefined,
        headers: ownHeaders,
      });
    })());
});
