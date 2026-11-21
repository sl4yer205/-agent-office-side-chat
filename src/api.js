// Thin wrappers over the HQ API.
// Works against both backends: the local Node server (server/server.js, no key)
// and the Vercel Functions deployment (api/*.js), where every call must carry
// the office key in the "x-hq-key" header. The key is asked once (only when
// the server answers 401) and kept in localStorage, so it survives closing
// the tab/browser — no re-prompt on every visit. Also migrates any key left
// in sessionStorage by older builds.
function getKey() {
  try {
    return (
      localStorage.getItem('hq-key') ||
      sessionStorage.getItem('hq-key') ||
      ''
    );
  } catch {
    return '';
  }
}

function setKey(k) {
  try {
    if (k) {
      localStorage.setItem('hq-key', k);
      sessionStorage.removeItem('hq-key');
    } else {
      localStorage.removeItem('hq-key');
      sessionStorage.removeItem('hq-key');
    }
  } catch {}
}

async function req(path, options, retried) {
  const headers = { ...(options && options.headers ? options.headers : {}) };
  const key = getKey();
  if (key) headers['x-hq-key'] = key;
  const res = await fetch(path, { ...options, headers });
  if (res.status === 401 && !retried) {
    const entered = window.prompt('Office này có khoá — nhập mật khẩu office:');
    if (entered) {
      setKey(entered);
      return req(path, options, true);
    }
    setKey('');
    throw new Error('401');
  }
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const j = await res.json();
      if (j && j.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export function getState() {
  return req('/api/state');
}

export function sendMessage(chatId, text) {
  return req('/api/send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, text }),
  });
}

export function createBot({ name, purpose, color }) {
  return req('/api/create-bot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, purpose, color }),
  });
}
