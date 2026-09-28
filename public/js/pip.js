// Picture-in-Picture: keep an eye on Clawd while working elsewhere.
// Chrome/Edge move the live game into an always-on-top window (Document PiP);
// other browsers get a video stream of the canvas.

const hasDocPip = () => 'documentPictureInPicture' in window;
const hasVideoPip = () => 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;

// Timer-driven frames for the video fallback, when the page is hidden.
const timerFrames = { requestAnimationFrame: cb => setTimeout(() => cb(performance.now()), 33) };

export const pipSupported = () => hasDocPip() || hasVideoPip();

export function createPip({ crt, game, onKey, onChange }) {
  let win = null;       // Document PiP window
  let video = null;     // fallback <video>
  let placeholder = null;
  let bar = null;

  let docPipBroken = false;
  const isOpen = () => !!win || (!!video && document.pictureInPictureElement === video);

  async function openDocument() {
    const canvas = crt.querySelector('canvas');
    const ratio = canvas.height / canvas.width;
    win = await window.documentPictureInPicture.requestWindow({ width: 480, height: Math.round(480 * ratio) + 44 });
    for (const node of document.querySelectorAll('link[rel="stylesheet"], style')) {
      win.document.head.appendChild(node.cloneNode(true));
    }
    win.document.title = 'Crab Quest';
    win.document.body.className = 'pip-body';
    bar = win.document.createElement('div');
    bar.className = 'pip-bar';
    bar.innerHTML = '<span class="status-pill" data-status>—</span><span class="pip-line" data-line></span><span class="pip-lvl" data-lvl></span>';

    placeholder = document.createElement('div');
    placeholder.className = 'win pip-placeholder';
    placeholder.innerHTML = '<p>Clawd is adventuring in the Picture-in-Picture window.</p><button class="btn small" type="button">⧉ BRING BACK</button>';
    placeholder.querySelector('button').onclick = close;
    crt.replaceWith(placeholder);
    win.document.body.append(bar, crt);

    game.setFrameSource(win);
    win.document.addEventListener('keydown', onKey);
    win.addEventListener('pagehide', () => {
      placeholder.replaceWith(crt);
      game.setFrameSource(window);
      win = null;
      bar = null;
      onChange(false);
    });
    onChange(true);
  }

  // The video is prepared ahead of time: requestPictureInPicture must run
  // straight from the click, with no await in between.
  function prepareVideo() {
    if (video || !hasVideoPip()) return;
    video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = crt.querySelector('canvas').captureStream(30);
    video.play().catch(() => {});
    // A hidden page stops animation frames; keep drawing on a timer instead.
    const sync = () => game.setFrameSource(document.pictureInPictureElement === video && document.hidden ? timerFrames : window);
    document.addEventListener('visibilitychange', sync);
    video.addEventListener('enterpictureinpicture', () => onChange(true));
    video.addEventListener('leavepictureinpicture', () => { game.setFrameSource(window); onChange(false); });
  }

  function openVideo() {
    prepareVideo();
    return video.requestPictureInPicture();
  }

  function close() {
    if (win) win.close();
    else if (document.pictureInPictureElement) document.exitPictureInPicture();
  }

  if (!hasDocPip()) prepareVideo();

  return {
    get open() { return isOpen(); },
    async toggle() {
      if (isOpen()) return close();
      // Some embedded browsers expose Document PiP but can't open windows:
      // fall back to the video stream.
      if (hasDocPip() && !docPipBroken) {
        try { return await openDocument(); } catch (err) {
          win = null;
          docPipBroken = true;
          console.warn('Document PiP unavailable, using video:', err.message);
          // The click was spent on the failed attempt; the next one opens the video.
          prepareVideo();
          if (hasVideoPip()) onChange(false, 'retry');
          return;
        }
      }
      try { await openVideo(); } catch (err) { console.warn('Picture-in-Picture failed:', err.message); }
    },
    // Permission prompt inside the PiP window (Document PiP only).
    showPermission(request, decide) {
      if (!win) return;
      let box = win.document.querySelector('.pip-perm');
      if (!request) { if (box) box.remove(); return; }
      if (!box) {
        box = win.document.createElement('div');
        box.className = 'pip-perm';
        bar.after(box);
      }
      box.innerHTML = '<span></span><button class="btn allow" type="button">ALLOW</button><button class="btn deny" type="button">DENY</button>';
      box.querySelector('span').textContent = `${request.tool}: ${request.detail}`;
      box.querySelector('.allow').onclick = () => decide('allow');
      box.querySelector('.deny').onclick = () => decide('deny');
    },
    // Status strip shown on top of the PiP window.
    update({ status, statusText, line, level }) {
      if (!bar) return;
      const pill = bar.querySelector('[data-status]');
      pill.className = `status-pill ${status || ''}`;
      pill.textContent = statusText || '—';
      if (line != null) bar.querySelector('[data-line]').textContent = line;
      if (level != null) bar.querySelector('[data-lvl]').textContent = level;
    },
    close,
  };
}
