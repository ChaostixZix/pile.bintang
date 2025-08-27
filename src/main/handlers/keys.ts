import { ipcMain } from 'electron';
import { getKey, setKey, deleteKey } from '../utils/store';
import { initializeGemini } from '../ai/gemini';

ipcMain.handle('get-ai-key', async () => {
  return getKey();
});

ipcMain.handle('set-ai-key', async (_, secretKey) => {
  const result = await setKey(secretKey);
  if (result) {
    // Reinitialize Gemini with the new key
    await initializeGemini();
  }
  return result;
});

ipcMain.handle('delete-ai-key', async () => {
  return deleteKey();
});
