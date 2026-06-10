export function buildSrcdoc(html: string, css: string, js: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;
}
