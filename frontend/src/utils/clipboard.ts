import { writeText } from 'clipboard-polyfill';

export async function copy(text: string): Promise<boolean> {
  try {
    await writeText(text);
    return true;
  } catch {
    return false;
  }
} 