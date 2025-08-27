export class GoogleGenerativeAI {
  apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getGenerativeModel(_opts: { model: string; generationConfig?: any }) {
    return {
      async generateContentStream(_prompt: string) {
        async function* gen() {
          yield { text: () => 'Hello ' } as any;
          yield { text: () => 'World' } as any;
        }
        return { stream: gen() } as any;
      },
      async generateContent(_prompt: string) {
        return {
          response: {
            text: () =>
              JSON.stringify({
                title: 'Test Title',
                summary: 'Test Summary',
                keyThemes: ['alpha'],
                mood: 'neutral',
                confidence: 0.99,
              }),
          },
        } as any;
      },
    } as any;
  }
}

export default GoogleGenerativeAI;
