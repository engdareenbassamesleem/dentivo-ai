const win = typeof window !== 'undefined' ? window : {} as any;
export const fetch = win.fetch;
export const Headers = win.Headers;
export const Request = win.Request;
export const Response = win.Response;
export default win.fetch;
