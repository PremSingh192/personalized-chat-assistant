import pdfParse from 'pdf-parse';

export const extractPDFText = async (buffer: Buffer): Promise<string> => {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
};

export const isPDFFile = (filename: string): boolean => {
  return filename.toLowerCase().endsWith('.pdf');
};
