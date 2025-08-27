# PileBintang - AI Architectural Analysis Prompt

You are an AI assistant analyzing the PileBintang application, a sophisticated Electron-based desktop journaling app with AI integration. This document serves as a comprehensive architectural guide to help you understand the codebase structure, data flow, and implementation details.

![Pile app screenshot](./assets/cover.png)

## Application Architecture Overview

**PileBintang** is a cross-platform desktop application built with modern web technologies, following a two-process Electron architecture:

### Core Technologies Stack
- **Runtime**: Electron (v33.2.0) for cross-platform desktop deployment
- **Frontend**: React 19 with TypeScript/JavaScript for UI components
- **State Management**: React Context API for application state
- **Text Editor**: TipTap editor for rich text journaling
- **AI Integration**: Google Gemini 2.5 Pro (via @google/generative-ai) and Ollama for local AI processing
- **Animation**: Framer Motion for smooth UI transitions
- **Build System**: Webpack with TypeScript compilation
- **Data Storage**: File-based markdown storage with frontmatter metadata

### Architectural Patterns
1. **Multi-Process Architecture**: Electron's main process (Node.js) + renderer process (React)
2. **IPC Communication**: Secure Inter-Process Communication between main and renderer
3. **Context-Based State Management**: Multiple React contexts for feature isolation
4. **File-System Based Storage**: Local markdown files with timestamp-based organization
5. **Component Composition**: Modular React components with clear separation of concerns

## Directory Structure and File Functions

### `/src/main/` - Main Process (Node.js/Electron Backend)

#### Core Files:
- **`main.ts`**: Application entry point
  - Manages BrowserWindow lifecycle
  - Handles app events (ready, activate, close)
  - Sets up window properties (frame, transparency, titlebar)
  - Registers protocol handlers for local file access
  - Initializes auto-updater functionality

- **`preload.ts`**: Security bridge between main and renderer processes
  - Exposes safe APIs to renderer via `contextBridge`
  - Provides file system operations (read, write, mkdir, etc.)
  - Handles path operations and platform detection
  - Manages electron-store settings integration

- **`ipc.ts`**: IPC handler registration hub
  - Imports and registers all feature-specific handlers
  - Centralizes IPC communication setup

#### `/src/main/handlers/` - Feature-Specific IPC Handlers:
- **`file.ts`**: File operations and pile management
  - Handles file CRUD operations
  - Manages pile folder creation and organization
  - Processes file attachments and media uploads
  - Implements gray-matter parsing for markdown frontmatter

- **`keys.ts`**: API key management for AI services
  - Secure storage/retrieval of Gemini API keys
  - Handles encryption/decryption of sensitive data

- **`store.ts`**: Electron-store integration for persistent settings
- **`tags.ts`**: Tag system backend operations
- **`highlights.ts`**: Text highlighting system backend
- **`index.ts`**: Search indexing and full-text search functionality
- **`links.ts`**: Link extraction and management

#### `/src/main/utils/` - Utility Functions:
- **`pileHelper.ts`**: Core pile management utilities
- **`autoUpdates.ts`**: Automatic update functionality

### `/src/renderer/` - Renderer Process (React Frontend)

#### Core Application Files:
- **`index.tsx`**: Application bootstrap
  - Creates React root
  - Sets up MemoryRouter for routing
  - Handles platform-specific styling

- **`App.jsx`**: Main application component
  - Defines route structure and navigation
  - Wraps application in context providers
  - Manages page transitions with Framer Motion

#### `/src/renderer/pages/` - Application Views:

- **`Home/`**: Landing page and pile selection
  - Lists existing piles
  - Provides pile creation interface
  - Handles pile deletion and management

- **`CreatePile/`**: New pile creation wizard
  - Directory selection interface
  - Pile naming and configuration

- **`Pile/`**: Main journaling interface
  - **`index.tsx`**: Main pile view wrapper
  - **`Layout.jsx`**: Pile-specific layout with sidebar
  - **`Posts/`**: Post listing and thread management
  - **`Editor/`**: Rich text editor component with AI integration
  - **`Chat/`**: AI chat interface for journal queries
  - **`Search/`**: Full-text search functionality
  - **`Settings/`**: Pile-specific settings and AI configuration
  - **`Sidebar/`**: Navigation and pile information
  - **`Highlights/`**: Text highlighting system
  - **`Toasts/`**: Notification system

#### `/src/renderer/context/` - State Management:

- **`PilesContext.js`**: Core pile management state
  - Manages list of available piles
  - Handles pile creation, deletion, updates
  - Provides current pile context
  - Manages theme system

- **`AIContext.js`**: AI integration state and operations
  - Manages Gemini and Ollama connections
  - Handles API key storage and validation
  - Provides AI completion functionality
  - Manages AI model selection and configuration

- **`ToastsContext.js`**: Notification system state
- **`TagsContext.js`**: Tag management state
- **`TimelineContext.js`**: Timeline view state
- **`HighlightsContext.js`**: Text highlighting state
- **`LinksContext.js`**: Link management state
- **`IndexContext.js`**: Search index state
- **`AutoUpdateContext.js`**: Auto-update status management

#### `/src/renderer/utils/` - Frontend Utilities:
- **`fileOperations.js`**: File system operation helpers
  - Post format definitions
  - File path generation utilities
  - Markdown file operations

- **`debounce.js`**: Performance optimization utilities

## Data Flow and Application Logic

### 1. Application Initialization Flow
```
main.ts starts → setupPilesFolder() → createWindow() → 
App.jsx loads → PilesContext initializes → 
getConfig() reads piles.json → Home page renders pile list
```

### 2. Pile Creation Flow
```
User clicks "Create new pile" → CreatePile page → 
Directory selection dialog → Pile name input → 
createPile() in PilesContext → File system operations → 
Config update → Navigation to new pile
```

### 3. Post Creation Flow
```
User types in Editor → TipTap editor captures content → 
handleSubmit() triggers → File path generation → 
Markdown file creation with frontmatter → 
Post list refresh → UI update
```

### 4. AI Integration Flow
```
User clicks "reflect" → AI context preparation → 
Thread context gathering → Gemini/Ollama API call → 
Streaming response handling → Token-by-token insertion → 
AI response saved as new post
```

### 5. File Storage Organization
```
Pile Directory/
├── YYYY/
│   ├── MMM/
│   │   ├── YYMMDD-HHMMSS.md (journal entries)
│   │   └── media/ (attachments)
│   └── ...
└── ...
```

## Key Components Deep Dive

### TipTap Editor Integration (`/src/renderer/pages/Pile/Editor/`)
- Rich text editing with markdown serialization
- Drag-and-drop file upload support
- Real-time content synchronization
- AI response streaming integration
- Custom extensions for submit behavior

### AI Context System (`/src/renderer/context/AIContext.js`)
- Dual provider support (Gemini + Ollama)
- Secure API key management
- Context preparation for AI conversations
- Streaming response handling
- Model selection and configuration

### File Management System
- Timestamp-based file naming
- Automatic directory structure creation
- Markdown frontmatter for metadata
- Media file organization and linking

### Search and Indexing
- Full-text search across all posts
- Tag-based filtering
- Timeline-based navigation
- Highlight preservation

## Development Workflow

### Build Commands
- `npm start`: Development server with hot reload
- `npm run build`: Production build
- `npm run package`: Create distributable packages
- `npm run lint`: Code linting with ESLint

### Testing
- Jest for unit testing
- Testing Library for React components
- Electron-specific testing setup

### Development Environment Setup
1. Install dependencies: `npm install --legacy-peer-deps`
2. Start development: `npm start`
3. The app runs in development mode with hot reload enabled

## Security Considerations

### IPC Security
- `contextBridge` isolates main and renderer processes
- No direct Node.js access in renderer
- Whitelisted APIs only

### Data Security
- API keys stored in electron-store with encryption
- Local file system access only
- No data transmission to external servers (except AI APIs)

## Platform-Specific Features

### macOS
- Custom titlebar with traffic light positioning
- Vibrancy effects for window background
- Native window behavior and dock integration

### Windows
- Custom window frame handling
- Windows-specific file system operations

### Linux
- AppImage distribution format
- Cross-platform file system compatibility

## Extension Points for AI Assistants

When working with this codebase:

1. **Adding New Features**: Extend existing contexts or create new ones
2. **AI Improvements**: Modify `AIContext.js` for new AI providers
3. **UI Components**: Follow the existing component structure in `/pages/`
4. **File Operations**: Use utilities in `fileOperations.js`
5. **IPC Communication**: Add handlers in `/main/handlers/`

This architecture provides a solid foundation for a feature-rich journaling application with AI integration while maintaining security, performance, and cross-platform compatibility.
