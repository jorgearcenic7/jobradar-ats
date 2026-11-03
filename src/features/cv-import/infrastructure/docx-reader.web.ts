import { docxHtmlToText } from '../domain/docx-html-to-text';
import { CvReadError, type CvReaders } from '../domain/readers';

type Mammoth = Pick<typeof import('mammoth'), 'convertToHtml' | 'images'>;

/**
 * Reads a DOCX with mammoth. Its HTML output keeps line breaks that the raw text output
 * loses, and it is only turned into plain text: never shown or run as HTML.
 */
export function createDocxReader(
  load: () => Promise<Mammoth> = () => import('mammoth'),
): Pick<CvReaders, 'readDocx'> {
  return {
    async readDocx(bytes: Uint8Array) {
      const mammoth = await load();
      const arrayBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      let html: string;
      try {
        const result = await mammoth.convertToHtml(
          // The browser build of mammoth reads `arrayBuffer`; its Node build, used by
          // Jest, reads `buffer`. Both are the same bytes, with no extra copy.
          { arrayBuffer, buffer: bytes } as { arrayBuffer: ArrayBuffer },
          // Images are not read: no base64 copies of pictures in the document.
          { convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: '' })) },
        );
        html = result.value;
      } catch (error) {
        throw new CvReadError('corrupt', { cause: error });
      }
      return docxHtmlToText(html);
    },
  };
}
