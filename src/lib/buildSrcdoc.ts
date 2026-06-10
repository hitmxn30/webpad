import { type ProjectFile } from "./types";

const CONSOLE_INTERCEPT = `
(function(){
  var send = function(level, args){
    try {
      var safe = Array.prototype.slice.call(args).map(function(a){
        if (a instanceof Error) return { __error: true, name: a.name, message: a.message, stack: a.stack };
        try { JSON.stringify(a); return a; } catch(e) { return String(a); }
      });
      window.parent.postMessage({ type: 'console', level: level, args: safe }, '*');
    } catch(e) {}
  };
  var origLog = console.log, origWarn = console.warn, origError = console.error;
  console.log = function(){ send('log', arguments); origLog.apply(console, arguments); };
  console.warn = function(){ send('warn', arguments); origWarn.apply(console, arguments); };
  console.error = function(){ send('error', arguments); origError.apply(console, arguments); };
  window.addEventListener('error', function(e){
    send('error', [e.message + (e.filename ? ' (' + e.filename + ':' + e.lineno + ':' + e.colno + ')' : '')]);
  });
  window.addEventListener('unhandledrejection', function(e){
    var reason = e.reason;
    send('error', ['Unhandled promise rejection: ' + (reason && reason.message ? reason.message : String(reason))]);
  });
})();
`;

export function buildSrcdoc(files: ProjectFile[]): string {
  const htmlFile  = files.find(f => f.language === "html");
  const cssFiles  = files.filter(f => f.language === "css");
  const jsFiles   = files.filter(f => f.language === "javascript");

  const styleTags  = cssFiles.map(f => `<style>${f.content}</style>`).join("");
  const bodyHtml   = htmlFile?.content ?? "";
  // Each JS file is its own <script> block; <\/script> escape prevents srcdoc breakage
  const scriptTags = jsFiles.map(f => `<script>${f.content}<\/script>`).join("");

  return (
    `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${styleTags}</head>` +
    `<body><script>${CONSOLE_INTERCEPT}<\/script>${bodyHtml}${scriptTags}</body></html>`
  );
}
