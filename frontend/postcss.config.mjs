// #region agent log
try { fetch('http://127.0.0.1:7242/ingest/85c686ba-827f-4b62-bbe5-eeb8b5ac9e8f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'frontend/postcss.config.mjs',message:'PostCSS config loaded (frontend)',data:{hypothesisId:'H4'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{}); } catch(_) {}
// #endregion

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {},
};

export default config;
