# PileBintang

A sophisticated cross-platform desktop journaling application with AI integration, built with Electron and React.

![PileBintang Screenshot](./assets/cover.png)

## ✨ Features

### 🤖 AI-Powered Journaling
- **Google Gemini 2.5 Pro Integration**: Advanced AI assistance for reflection, summarization, and content generation
- **Local AI Support**: Ollama integration for privacy-focused local AI processing
- **Streaming Responses**: Real-time AI interactions with token-by-token streaming
- **Context-Aware AI**: AI understands your journal history for personalized responses

### 📝 Rich Text Editing
- **TipTap Editor**: Modern, extensible rich text editor with markdown support
- **Drag & Drop**: Easy file uploads and media attachments
- **Auto-save**: Never lose your thoughts with automatic content saving
- **Markdown Export**: Full markdown compatibility with frontmatter metadata

### 🗂️ Smart Organization
- **Pile System**: Organize journals into separate "piles" for different topics
- **Timeline View**: Navigate through your entries chronologically
- **Tag System**: Categorize and filter entries with custom tags
- **Full-Text Search**: Find any entry instantly with powerful search
- **Highlights**: Mark and preserve important passages

### 🔒 Privacy & Security
- **Local Storage**: All data stored locally on your device
- **Encrypted API Keys**: Secure storage of AI service credentials
- **No Cloud Dependency**: Works completely offline (except for AI features)
- **Open Source**: Full transparency with MIT license

### 🎨 User Experience
- **Cross-Platform**: Native apps for macOS, Windows, and Linux
- **Dark/Light Themes**: Choose your preferred visual style
- **Responsive Design**: Optimized for different screen sizes
- **Smooth Animations**: Polished UI with Framer Motion

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18 or higher
- **npm** or **yarn** package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ChaostixZix/PileBintang.git
   cd PileBintang
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Build for production**
   ```bash
   npm run build
   npm run package
   ```

### AI Setup

#### Google Gemini Integration
1. Get your API key from [Google AI Studio](https://aistudio.google.com/)
2. In PileBintang settings, paste your Gemini API key
3. Select "Gemini" as your AI provider

#### Ollama (Local AI)
1. Install [Ollama](https://ollama.ai/) on your system
2. Pull a model: `ollama pull llama2`
3. In PileBintang settings, select "Ollama" as your AI provider

## 🛠️ Technology Stack

### Core Technologies
- **Electron 33.2.0** - Cross-platform desktop framework
- **React 19** - Modern UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **TipTap** - Extensible rich text editor
- **Framer Motion** - Smooth animations
- **Google Gemini 2.5 Pro** - Advanced AI integration
- **Ollama** - Local AI inference

### Development Tools
- **Webpack** - Module bundling and build system
- **ESLint** - Code linting and formatting
- **Jest** - Testing framework
- **Electron Builder** - App packaging and distribution

## 📁 Project Structure

### Main Process (`src/main/`)
- **`main.ts`** - Application entry point and window management
- **`preload.ts`** - Secure IPC bridge between main and renderer
- **`handlers/`** - Feature-specific IPC handlers
  - `file.ts` - File operations and pile management
  - `gemini.ts` - Gemini AI integration
  - `keys.ts` - Secure API key management
  - `store.ts` - Settings and preferences
- **`ai/gemini.ts`** - Google Gemini 2.5 Pro client implementation

### Renderer Process (`src/renderer/`)
- **`App.jsx`** - Main application component with routing
- **`pages/`** - Application views
  - `Home/` - Pile selection and management
  - `Pile/` - Main journaling interface
  - `CreatePile/` - Pile creation wizard
- **`context/`** - React Context providers
  - `PilesContext.js` - Pile management state
  - `AIContext.js` - AI integration state
- **`hooks/`** - Custom React hooks
  - `useGeminiStream.js` - Gemini streaming integration

## 🔧 Development Commands

### Building and Running
```bash
npm start                # Start development server
npm run build           # Production build
npm run package         # Create distributable packages
npm run release         # Build and publish to GitHub releases
```

### Code Quality
```bash
npm run lint            # Run ESLint
npm run lint:fix        # Fix linting issues automatically
npm test               # Run Jest tests
```

### Platform-Specific Development
```bash
npm run start:main      # Start main process with file watching
npm run start:renderer  # Start renderer dev server
npm run build:main      # Build main process only
npm run build:renderer  # Build renderer process only
```

## 🧩 Architecture Overview

PileBintang follows Electron's multi-process architecture with enhanced security:

### Security Model
- **Context Isolation**: Renderer process isolated from Node.js APIs
- **IPC Communication**: Secure communication via contextBridge
- **Content Security Policy**: Strict CSP headers for enhanced security
- **API Key Encryption**: Secure storage of sensitive credentials

### Data Organization
```
Pile Directory/
├── YYYY/
│   ├── MMM/
│   │   ├── YYMMDD-HHMMSS.md    # Journal entries
│   │   └── media/               # File attachments
│   └── ...
└── piles.json                   # Pile configuration
```

## 🆕 Recent Updates

### v1.0.0 - Gemini 2.5 Pro Migration
- **✅ Migrated to Google Gemini 2.5 Pro** from OpenAI for enhanced AI capabilities
- **🔒 Enhanced Security**: Implemented strict Content Security Policy and improved IPC validation
- **🚀 Streaming AI Responses**: Real-time token-by-token AI response rendering
- **📝 JSON Mode Support**: Structured AI responses for summaries and metadata
- **🧪 Comprehensive Testing**: Added Jest tests for AI functionality and streaming
- **🔧 Improved Developer Experience**: Better error handling and debugging tools

### Key Improvements
- **Performance**: Faster AI response times with optimized streaming
- **Reliability**: Better error handling and recovery mechanisms
- **Security**: Enhanced API key encryption and secure IPC communication
- **Compatibility**: Maintained Ollama support for local AI processing
- **Testing**: Full test coverage for critical AI functionality

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with proper tests
4. **Run the test suite**: `npm test`
5. **Lint your code**: `npm run lint:fix`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to the branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style and patterns
- Add tests for new functionality
- Update documentation for significant changes
- Ensure all tests pass before submitting
- Use TypeScript for type safety

## 📋 Requirements

### System Requirements
- **Operating System**: macOS 10.14+, Windows 10+, or Linux (Ubuntu 18.04+)
- **Node.js**: Version 18 or higher
- **Memory**: 512MB RAM minimum, 1GB recommended
- **Storage**: 100MB for application, additional space for journal data

### Optional Requirements
- **Internet Connection**: Required for Gemini AI features
- **Ollama**: For local AI processing (privacy-focused option)

## 🛡️ Privacy & Security

PileBintang is designed with privacy in mind:

- **Local Data Storage**: All journal entries are stored locally on your device
- **No Cloud Sync**: Your data never leaves your device (except for AI API calls)
- **Encrypted Credentials**: API keys are encrypted using industry-standard methods
- **Open Source**: Full transparency - inspect the code yourself
- **Minimal Permissions**: App only accesses files you explicitly grant access to

## 🐛 Known Issues & Limitations

- **Large Files**: Very large journal entries (>1MB) may affect performance
- **AI Rate Limits**: Gemini API has usage limits (see Google's pricing)
- **File Conflicts**: Concurrent editing of the same file is not yet supported

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ChaostixZix/PileBintang/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ChaostixZix/PileBintang/discussions)
- **Documentation**: Check the `docs/` folder for detailed guides

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🙏 Acknowledgments

- **Electron Team** for the amazing cross-platform framework
- **TipTap** for the excellent rich text editor
- **Google** for the Gemini AI API
- **Ollama** for local AI inference capabilities
- **React Team** for the robust UI library

---

**Built with ❤️ for digital journaling enthusiasts**

*PileBintang - Where thoughts meet intelligence*
