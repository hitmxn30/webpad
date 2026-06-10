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

export function buildSrcdoc(html: string, css: string, js: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${css}</style></head><body>${html}<script>${CONSOLE_INTERCEPT}<\/script><script>${js}<\/script></body></html>`;
}
