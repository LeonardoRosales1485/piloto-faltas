declare module 'html-to-docx' {
  const HTMLtoDOCX: (html: string, header: string | null, options?: Record<string, unknown>, footer?: string) => Promise<Buffer | Blob>;
  export default HTMLtoDOCX;
}
