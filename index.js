const fastify = require('fastify');
const fetch = require('node-fetch');
const path = require('path');

const app = fastify();

app.register(require('fastify-cors'), {
  origin: true,
});

app.addContentTypeParser('*', (req, body, done) => {
    done(null, req)
})

app.register(require('fastify-static'), {
  root: path.join(__dirname, 'public'),
});

// Fool browser with redirect
app.all('/fool', (req, reply) => {
  // Get our origin
  const origin = req.query.origin;

  // Get the url from the query string
  const url = req.query.url;
  // Redirect to our portal
  reply.redirect(`${origin}/portal?url=${encodeURIComponent(url)}`);
});

app.all('/portal', async (request, reply) => {
  let url = request.query.url;

  if (url.startsWith('/')) {
    console.log(request.query.origin);
  }

  const customHeaders = { ...request.headers };

  if (request.headers.referer) {
    try {
      const refererOuterUrl = new URL(request.headers.referer);
  
      console.log(refererOuterUrl)
      const refererUrl = new URL(
        decodeURIComponent(
          refererOuterUrl
            .searchParams
            .get('url')
        ),
      );

      customHeaders.referer = refererUrl.href;
    } catch (err) {
      customHeaders.referer = new URL(url).origin;
    }
  }
  customHeaders.host = new URL(url).host;

  if (
    customHeaders['content-type']
    && customHeaders['content-type'].startsWith('application/isjson')
  ) customHeaders['content-type'] = customHeaders['content-type'].replace('application/isjson', 'application/json');
  
  const requestToRemote = await fetch(url, {
    method: request.method,
    headers: customHeaders,
    redirect: 'manual',
    body: request.body,
  });

  console.log([...requestToRemote.headers.entries()]);
  reply.code(requestToRemote.status)
    
  for (let [key, value] of requestToRemote.headers.entries()) {
    if (`content-encoding
x-frame-options
content-length
access-control-allow-origin
set-cookie`.split('\n').includes(key)) continue;
    if (key === 'location') value = `/portal?url=${encodeURIComponent(value)}`;
    console.log(key, value)
    // reply.raw.setHeader(key, value)
    reply.header(key, value)
  }

  // Map cookies to service-worker-accessible header
  const cookiesSetTo = requestToRemote.headers.get('set-cookie');
  if (cookiesSetTo) {
    reply.header('stck-sw', cookiesSetTo);
  }

  // console.log(requestToRemote.status, body)

  /* requestToRemote.body.on('readable', () => {
    while (true) {
      let chunk = requestToRemote.body.read();
      if (chunk === null) break;

      console.log('sending chunk')
      reply.raw.write(chunk)
    }
  });

  requestToRemote.body.on('end', () => {
    console.log('ending')
    reply.raw.end()
  }); */
  reply.send(await requestToRemote.buffer())
});

app.listen(
  8080,
  '0.0.0.0',
  () => console.log('Lets do this!'),
);
