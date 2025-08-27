import '@testing-library/jest-dom';
import { json, stream } from '../main/ai/gemini';
jest.mock('@google/generative-ai');

// Mock getKey to return null so env var is used
jest.mock('../main/utils/store', () => ({
  getKey: jest.fn().mockResolvedValue(null),
}));

describe('Gemini AI helpers', () => {
  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('json() returns parsed structured data', async () => {
    const data = await json('Summarize this');
    expect(data).toMatchObject({
      title: expect.any(String),
      summary: expect.any(String),
      keyThemes: expect.any(Array),
      mood: expect.any(String),
      confidence: expect.any(Number),
    });
  });

  it('stream() yields text chunks', async () => {
    const chunks: string[] = [];
    for await (const part of stream('Say hello')) {
      chunks.push(part);
    }
    expect(chunks.join('')).toBe('Hello World');
  });
});
