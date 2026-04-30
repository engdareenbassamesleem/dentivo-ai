// Shim to prevent formdata-polyfill from monkeypatching global.fetch
const win = typeof window !== 'undefined' ? window : {} as any;
export const FormData = win.FormData;
export const Blob = win.Blob;
export const File = win.File;
export default win.FormData;
