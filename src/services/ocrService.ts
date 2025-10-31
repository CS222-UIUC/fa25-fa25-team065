import Tesseract from 'tesseract.js';

export type OCRProgressCallback = (progress: number) => void;

export class OCRService {
  static async extractText(
    file: File,
    onProgress?: OCRProgressCallback
  ): Promise<string> {
    try {
      const result = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text' && onProgress) {
              onProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      return result.data.text;
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error('Failed to extract text from image');
    }
  }
}