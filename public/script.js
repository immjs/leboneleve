// get page origin
const origin = new URL(location.href).origin;

const els = document.querySelectorAll('#refresh, .navbar-interactibles');

for (let el of els) {
  let latestClickTime;
  let fstart = () => {
    el.classList.add('clicked');
    latestClickTime = Date.now();
  };
  let fend = () => {
    setTimeout(() => {
      el.classList.remove('clicked');
    }, 200 - (Date.now() - latestClickTime))
  }
  el.addEventListener('mousedown', fstart);
  el.addEventListener('touchstart', fstart);
  el.addEventListener('mouseup', fend);
  el.addEventListener('touchend', fend);
}

const iframe = document.querySelector('#portal');

const uriInput = document.querySelector('#uri');

if (location.hash !== '') {
  console.log(location.hash)
  iframe.src = `${origin}/portal?url=${encodeURIComponent(location.hash.replace('#', ''))}`;
}

uriInput
  .addEventListener('keydown', (event) => {
    if (event.code === 'Enter') {
      event.target.blur();
      let uri = uriInput.value;
      if (!uri.match(/^(https?|ftp):\/\/[^. \/]+(\.[^. \/]+)+(\/[^\/]*)*$/)) {
        if (uri.match(/^[^. \/]+(\.[^. \/]+)+(\/[^\/]*)*$/))
          uri = `https://${uri}`;
        else
          uri = `https://google.com/search?q=${encodeURIComponent(uri)}`;
      }
      iframe.src = uri;
    }
  });

navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data.type === 'SET_URL') iframe.src = event.data.url;
});

let prevvie = null;

const onRedirect = () => {
  let url;
  try {
    url = iframe.contentWindow.location.href;
  } catch (err) {
    console.log(err);
    url = iframe.src;
  }
  console.log({ url, origin });
  if (!url.startsWith(`${origin}/portal`)) {
    const currentURL = new URL(iframe.src);
    
    if (url.startsWith(`${origin}/`)) {
      const currentPortaledURL = new URL(decodeURIComponent(currentURL.searchParams.get('url')));
  
      console.log(currentPortaledURL)

      const portaledOrigin = `${currentPortaledURL.origin}/`;
      url =
        url
          .replace(
            `${origin}/`,
            portaledOrigin || prevvie,
          )
    }
    console.log("HEYYYYYYY!", `${origin}/portal?url=${encodeURIComponent(url)}`)
    return (iframe.src = `${origin}/portal?url=${encodeURIComponent(url)}`, onRedirect());
  }
  const extracted = decodeURIComponent(url.match(/(?<=\?url=).+$/g)[0])
  location.hash = extracted;
  uriInput.value = extracted;

  prevvie = `${new URL(extracted).origin}/`;
  
  console.log('Not dead yet')
}

iframe
  .addEventListener('load', onRedirect)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', {scope: '/'})
    .then((reg) => {
      // registration worked
      console.log('Registration succeeded. Scope is ' + reg.scope);
    })
    .catch((error) => {
      // registration failed
      console.log('Registration failed with ' + error);
    });
}

document.querySelector('#refresh')
  .addEventListener('click', () => {
    iframe.contentWindow.location.reload();
  });

if ('share' in navigator) {
  document.querySelector('#share').style.display = 'block';
  document.querySelector('#share')
    .addEventListener('click', () => {
      const shareData = {
        url: 'https://developer.mozilla.org'
      }
    
      const btn = document.querySelector(document.querySelector('#share'));
      const resultPara = document.querySelector('#share');
    
      // Share must be triggered by "user activation"
      btn.addEventListener('click', async () => {
        try {
          await navigator.share(shareData)
          resultPara.textContent = 'MDN shared successfully'
        } catch(err) {
          resultPara.textContent = 'Error: ' + err
        }
      });
    });
}
