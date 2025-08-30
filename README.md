# PileBintang - Comprehensive Project Description

## Project Overview

This project is made by Bintang but it is forked from UdaraJay/Pile repository project

## Technology Stack

### Core Technologies
- **Application Framework**: Electron 33.2.0 (Cross-platform desktop app)
- **Frontend Library**: React 19.0.0 with React DOM
- **Type System**: TypeScript 5.2.2
- **Build System**: Webpack 5.88.2 with custom ERB (Electron React Boilerplate) configuration
- **Styling**: SCSS with CSS Modules
- **State Management**: React Context API (no Redux)

### UI & UX Libraries
- **Rich Text Editor**: TipTap 2.10.2 (ProseMirror-based)
  - Extensions: Character Count, Link, Placeholder, Typography
  - Markdown serialization and deserialization
- **Animations**: Framer Motion 11.2.4 (smooth page transitions and UI interactions)
- **UI Components**: Radix UI primitives
  - Alert Dialog, Dialog, Dropdown Menu, Switch, Tabs
- **Virtualization**: 
  - @tanstack/react-virtual 3.0.1 (for large lists)
  - react-virtuoso 4.12.1 (timeline and posts)
- **Routing**: React Router DOM 6.23.1

### AI Integration
- **Primary AI Provider**: Google Gemini 2.5 Pro (@google/generative-ai 0.24.1)
  - Streaming text generation
  - JSON mode for structured responses
  - Context-aware conversations
- **Local AI Provider**: Ollama integration (for privacy-focused users)
- **HTTP Client**: Axios 1.6.8 (for API requests)

### Data & File Management
- **Markdown Processing**: gray-matter 4.0.3 (frontmatter + content)
- **File Operations**: Node.js fs with glob 11.0.0 pattern matching
- **Search**: Lunr.js 2.3.9 (full-text search indexing)
- **Date/Time**: Luxon 3.3.0 (DateTime manipulation)
- **Settings Storage**: electron-settings 4.0.4 (persistent app configuration)

### Development Tools
- **Linting**: ESLint 8.49.0 with Airbnb config
- **Testing**: Jest 29.7.0 with Testing Library
- **Hot Reload**: React Refresh + Webpack Dev Server
- **Package Builder**: electron-builder 24.13.3
- **Process Monitor**: electronmon 2.0.2 (development file watching)

## Application Architecture

### Electron Multi-Process Architecture

```mermaid
graph TB
    Main[Main Process - Node.js] --> IPC[IPC Bridge]
    IPC --> Renderer[Renderer Process - React]
    
    Main --> FileSystem[File System Operations]
    Main --> AI[AI Integration - Gemini/Ollama]
    Main --> Settings[Settings & Storage]
    Main --> Security[Security & Encryption]
    
    Renderer --> UI[React UI Components]
    Renderer --> Context[Context Providers]
    Renderer --> Hooks[Custom Hooks]
    
    FileSystem --> Piles[Pile Management]
    FileSystem --> Journal[Journal Entries]
    FileSystem --> Media[Media Attachments]
```

### Security Model
- **Context Isolation**: Enabled - Renderer process isolated from Node.js APIs
- **Node Integration**: Disabled in renderer process
- **Preload Script**: Secure contextBridge APIs for IPC communication
- **Content Security Policy**: Strict CSP headers
- **API Key Storage**: Encrypted using electron-settings
- **File Access**: Limited to user-selected directories

### File Structure Organization

```
Pile Directory/
├── piles.json                 # Pile configuration and metadata
├── YYYY/                      # Year-based organization
│   ├── MMM/                   # Month abbreviation (Jan, Feb, etc.)
│   │   ├── YYMMDD-HHMMSS.md   # Journal entries with timestamp
│   │   ├── media/             # File attachments for entries
│   │   │   ├── images/
│   │   │   ├── documents/
│   │   │   └── audio/
│   │   └── metadata.json      # Month metadata (optional)
│   └── ...
├── tags.json                  # Tag definitions and relationships
├── highlights.json            # Saved highlights across entries
├── links.json                 # Internal and external links
└── search-index.json          # Cached search index
```

### Journal Entry Format (Markdown + Frontmatter)

```markdown
---
title: "Daily Reflection"
date: "2024-01-15T14:30:00Z"
tags: ["reflection", "goals", "work"]
mood: "positive"
weather: "sunny"
location: "home"
attachments: ["media/images/photo1.jpg"]
ai_summary: "User reflected on daily accomplishments and set goals for tomorrow"
---

# Today's Thoughts

Your journal content goes here in **markdown** format.

## Goals for Tomorrow
- [ ] Complete project documentation
- [ ] Review code changes
- [ ] Plan team meeting

The AI can respond to your thoughts here, providing insights and encouragement.
```

## Core Features & Components

### 1. Pile Management System

**Purpose**: Organize journals into separate workspaces ("piles") for different life areas, projects, or time periods.

**Key Components**:
- **Pile Creation Wizard** (`src/renderer/pages/CreatePile/`)
  - Name input and validation
  - Directory selection dialog
  - Theme selection
  - Initial configuration setup
- **Pile Selection Interface** (`src/renderer/pages/Home/`)
  - Grid/list view of available piles
  - Recent activity indicators
  - Quick actions (open, delete, settings)
- **Pile Context Provider** (`src/renderer/context/PilesContext.js`)
  - Current pile state management
  - Pile creation, deletion, updating
  - Theme and preference synchronization

**Technical Implementation**:
```javascript
// Pile structure in piles.json
{
  "piles": [
    {
      "id": "uuid-v4",
      "name": "Personal Journal",
      "path": "/Users/username/Documents/Personal",
      "theme": "default",
      "created": "2024-01-01T00:00:00Z",
      "lastAccessed": "2024-01-15T14:30:00Z",
      "aiProvider": "gemini",
      "aiPrompt": "Custom AI personality...",
      "settings": {
        "autoSave": true,
        "spellCheck": true,
        "wordWrap": true
      }
    }
  ]
}
```

### 2. Rich Text Editor System

**Purpose**: Provide a modern, extensible writing experience with markdown support and real-time AI integration.

**Key Components**:
- **TipTap Editor** (`src/renderer/pages/Pile/Editor/`)
  - ProseMirror-based rich text editing
  - Markdown serialization/deserialization
  - Custom extensions for journaling workflow
- **AI Integration** - Inline AI assistance during writing
- **File Attachments** - Drag & drop media integration
- **Auto-save** - Continuous saving to prevent data loss

**Editor Extensions & Features**:
```javascript
// TipTap extensions used
const extensions = [
  StarterKit,              // Basic rich text features
  Typography,              // Smart quotes, em dashes
  Link,                    // URL link handling
  Placeholder,             // Placeholder text
  CharacterCount,          // Word/character counting
  CustomSubmit,            // AI trigger on Cmd/Ctrl+Enter
  DragDrop,               // File upload handling
  AutoSave,               // Continuous saving
]
```

**File Upload & Media Management**:
- Drag & drop file uploads
- Automatic file organization by type (images, documents, audio)
- Thumbnail generation for images
- File size limits and validation
- Attachment metadata in frontmatter

### 3. AI Integration System

**Purpose**: Provide intelligent writing assistance, reflection prompts, and conversational journaling support.

**Supported AI Providers**:

#### Google Gemini 2.5 Pro Integration
- **Model**: `gemini-2.5-flash` (default) or `gemini-2.5-pro`
- **Features**:
  - Streaming text generation (token-by-token)
  - JSON mode for structured responses
  - Context-aware conversations
  - Large context window (up to 1M tokens)
- **API Integration**: `@google/generative-ai` SDK
- **Security**: API keys encrypted in electron-settings

#### Ollama (Local AI) Integration
- **Purpose**: Privacy-focused local AI processing
- **Supported Models**: Any Ollama-compatible model (Llama 2, Code Llama, etc.)
- **Connection**: HTTP API to local Ollama server
- **Advantages**: No data leaves device, no API costs, offline capability

**AI Context System**:
```javascript
// AI context building for conversations
const aiContext = {
  systemPrompt: "Custom AI personality for this pile",
  recentEntries: "Last 10 journal entries for context",
  currentEntry: "Current journal content being written",
  userPreferences: "Writing style, tone preferences",
  conversationHistory: "Previous AI interactions"
}
```

**AI Features**:
- **Inline Suggestions**: AI responds to journal entries in real-time
- **Conversation Mode**: Dedicated chat interface for reflection
- **Summaries**: AI-generated entry summaries and insights
- **Mood Analysis**: Sentiment analysis and mood tracking
- **Writing Prompts**: AI-suggested topics and questions

### 4. Search & Organization System

**Purpose**: Help users find, categorize, and navigate their journal entries effectively.

**Search Implementation**:
- **Full-Text Search**: Lunr.js indexing of all journal content
- **Tag-based Filtering**: Hierarchical tag system with autocomplete
- **Date Range Filtering**: Calendar-based date selection
- **Content Type Filtering**: Text, images, attachments, AI responses
- **Advanced Search**: Boolean operators, phrase matching, field-specific search

**Tagging System**:
```javascript
// Tag structure in tags.json
{
  "tags": [
    {
      "id": "work",
      "name": "Work",
      "color": "#3B82F6",
      "parent": null,
      "children": ["meetings", "projects", "goals"],
      "count": 45,
      "created": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Timeline Navigation**:
- **Chronological View**: Time-based entry browsing
- **Calendar Integration**: Month/week/day views
- **Activity Heatmaps**: Writing activity visualization
- **Streak Tracking**: Daily writing habit tracking

### 5. Highlights & Links System

**Purpose**: Preserve important insights and create connections between journal entries.

**Highlights System**:
- **Text Selection**: Click and drag to highlight important passages
- **Color Coding**: Different highlight colors for categorization
- **Cross-Entry Highlights**: View all highlights across journal entries
- **Export Capabilities**: Export highlights as markdown or PDF

**Links System**:
- **Internal Links**: Link between journal entries using `[[entry-title]]` syntax
- **External Links**: Web URLs with automatic preview generation
- **Backlinks**: Show which entries link to current entry
- **Link Graph**: Visual representation of entry connections

## Detailed Technical Implementation Flow

### Application Bootstrap & Initialization Flow

This section provides the detailed technical implementation flow that developers need to understand to recreate PileBintang. Each flow diagram shows the exact component interactions, data flow, and system integrations.

```mermaid
flowchart TD
    A[Electron App Launch] --> B[main.ts Initialization]
    B --> C[Setup Piles Folder ~/Piles]
    C --> D[Register IPC Handlers]
    D --> E[Create Browser Window]
    E --> F[Load preload.ts]
    F --> G[Setup contextBridge APIs]
    G --> H[Load React Renderer]
    
    H --> I[App.jsx Route Setup]
    I --> J[Initialize Context Providers]
    J --> K{Context Provider Chain}
    
    K --> L[PilesContextProvider]
    K --> M[ToastsContextProvider]
    K --> N[IndexContextProvider]
    K --> O[TimelineContextProvider]
    K --> P[AIContextProvider]
    K --> Q[TagsContextProvider]
    K --> R[HighlightsContextProvider]
    K --> S[LinksContextProvider]
    
    L --> T[Load piles.json config]
    T --> U[Parse existing piles]
    U --> V[Router Navigation]
    
    V --> W{Route Decision}
    W -->|/| X[Home Page]
    W -->|/pile/:name| Y[Pile Interface]
    W -->|/create-pile| Z[Create Pile Wizard]
    
    subgraph "IPC Handlers Registration"
        D --> D1[file.ts - File Operations]
        D --> D2[keys.ts - API Key Management]
        D --> D3[store.ts - Settings Storage]
        D --> D4[gemini.ts - AI Integration]
        D --> D5[tags.ts - Tag Management]
        D --> D6[highlights.ts - Highlight System]
        D --> D7[links.ts - Link Management]
        D --> D8[index.ts - Search Indexing]
    end
    
    subgraph "Security Model"
        F --> F1[Context Isolation: ON]
        F --> F2[Node Integration: OFF]
        F --> F3[Preload Script Only]
        G --> G1[window.electron APIs]
        G --> G2[IPC Communication Only]
    end
```

### Component Hierarchy & Data Flow

```mermaid
flowchart TD
    A[App.jsx - Root Router] --> B[Context Provider Stack]
    
    B --> C[PilesContextProvider]
    C --> C1[currentPile state]
    C --> C2[piles array]
    C --> C3[theme management]
    
    B --> D[AIContextProvider]
    D --> D1[AI provider selection]
    D --> D2[API key handling]
    D --> D3[completion streaming]
    
    B --> E[IndexContextProvider]
    E --> E1[Lunr.js search index]
    E --> E2[file watching]
    E --> E3[index rebuilding]
    
    C --> F{Route Components}
    F --> G[Home Component]
    F --> H[Pile Component]
    F --> I[CreatePile Component]
    
    G --> G1[Pile List Display]
    G --> G2[Delete Pile Actions]
    G --> G3[Open Pile Folder]
    
    H --> J[PileLayout Component]
    J --> K[Layout Structure]
    K --> L[Header with Navigation]
    K --> M[Sidebar with Timeline]
    K --> N[Main Content Area]
    K --> O[Settings Modal]
    K --> P[Search Interface]
    K --> Q[Chat Interface]
    
    M --> M1[Timeline/Sidebar Component]
    M1 --> M2[Virtualized Post List]
    M1 --> M3[Date Navigation]
    M1 --> M4[Filter Controls]
    
    N --> N1[Posts Component]
    N1 --> N2[Editor Component]
    N2 --> N3[TipTap Rich Text Editor]
    N3 --> N4[AI Integration]
    N3 --> N5[File Attachments]
    N3 --> N6[Tag System]
    N3 --> N7[Auto-save]
    
    subgraph "Data Sources"
        C2 --> DS1[piles.json config file]
        E1 --> DS2[Markdown files in ~/Piles]
        D2 --> DS3[Encrypted electron-store]
        N7 --> DS4[File system writes via IPC]
    end
```

### File System & IPC Communication Flow

```mermaid
flowchart TD
    A[Renderer Process Action] --> B[window.electron API Call]
    B --> C[preload.ts contextBridge]
    C --> D[IPC Message to Main Process]
    D --> E[Handler Registration in ipc.ts]
    E --> F{Handler Router}
    
    F --> G[file.ts Handler]
    F --> H[store.ts Handler]
    F --> I[gemini.ts Handler]
    F --> J[Other Handlers...]
    
    G --> G1[File Operations]
    G1 --> G2[Read Markdown Files]
    G1 --> G3[Write Journal Entries]
    G1 --> G4[Create Directories]
    G1 --> G5[File Watching]
    
    H --> H1[Settings Management]
    H1 --> H2[Read electron-store]
    H1 --> H3[Write encrypted data]
    H1 --> H4[API key storage]
    
    I --> I1[AI Integration]
    I1 --> I2[Gemini API calls]
    I1 --> I3[Stream responses]
    I1 --> I4[Context building]
    
    subgraph "File Structure Operations"
        G2 --> FS1[~/Piles/YYYY/MMM/YYMMDD-HHMMSS.md]
        G3 --> FS2[Gray-matter frontmatter]
        G3 --> FS3[Markdown content]
        G4 --> FS4[Media attachments folder]
    end
    
    subgraph "Security Boundaries"
        A --> SEC1[Renderer: No file access]
        D --> SEC2[IPC: Validated messages only]
        G1 --> SEC3[Main: Full file system access]
    end
    
    G1 --> K[Return to Renderer]
    H1 --> K
    I1 --> K
    K --> L[Update React State]
    L --> M[Re-render Components]
```

### Editor & AI Integration Technical Flow

```mermaid
flowchart TD
    A[User Opens Editor] --> B[TipTap Editor Initialize]
    B --> C[Load Extensions]
    C --> D[Editor Extensions Setup]
    
    D --> D1[StarterKit - Basic rich text]
    D --> D2[Typography - Smart quotes]
    D --> D3[Link - URL handling]
    D --> D4[Character Count]
    D --> D5[Custom Submit Extension]
    
    B --> E[Load Existing Content]
    E --> F[Parse Markdown via gray-matter]
    F --> G[Extract frontmatter]
    F --> H[Render content in editor]
    
    G --> G1[title, date, tags]
    G --> G2[Custom metadata]
    
    I[User Types Content] --> J[Auto-save Timer]
    J --> K[Serialize to Markdown]
    K --> L[IPC: Save File]
    L --> M[Write to File System]
    
    N[User Triggers AI] --> O[Build Context]
    O --> P[Collect Recent Entries]
    P --> Q[Format Prompt]
    Q --> R[IPC: AI Request]
    R --> S[Gemini API Call]
    S --> T[Stream Response]
    T --> U[Update Editor]
    
    subgraph "AI Context Building"
        P --> P1[Get last 5 entries]
        P --> P2[Extract text content]
        P --> P3[Add current entry]
        P --> P4[Apply AI prompt template]
    end
    
    subgraph "Auto-save Process"
        J --> AS1[Debounced save - 1 second]
        AS1 --> AS2[Serialize editor content]
        AS2 --> AS3[Generate timestamp filename]
        AS3 --> AS4[Write via file.ts handler]
    end
    
    subgraph "File Attachments"
        V[Drag & Drop Files] --> W[File Upload Handler]
        W --> X[Copy to media folder]
        X --> Y[Insert markdown link]
        Y --> Z[Update editor content]
    end
```

### Search & Indexing System Flow

```mermaid
flowchart TD
    A[App Initialization] --> B[IndexContext Setup]
    B --> C[Initialize Lunr.js]
    C --> D[Scan Pile Directory]
    D --> E[Read All Markdown Files]
    E --> F[Parse Content & Metadata]
    F --> G[Build Search Index]
    
    G --> G1[Index title field]
    G --> G2[Index content field]
    G --> G3[Index tags field]
    G --> G4[Index date field]
    
    H[File Watcher Events] --> I{File Change Type}
    I -->|Created| J[Add to Index]
    I -->|Modified| K[Update Index Entry]
    I -->|Deleted| L[Remove from Index]
    
    M[User Search Query] --> N[Search Interface]
    N --> O[Query Lunr Index]
    O --> P[Score & Rank Results]
    P --> Q[Filter by Date/Tags]
    Q --> R[Display Results]
    
    R --> S[Result Click]
    S --> T[Navigate to Entry]
    T --> U[Highlight Search Terms]
    
    subgraph "Index Structure"
        G --> IDX1[Document ID: file path]
        G --> IDX2[Fields: title, content, tags, date]
        G --> IDX3[Stemming & Stop Words]
        G --> IDX4[Boost title field 10x]
    end
    
    subgraph "Advanced Search"
        N --> ADV1[Tag Filters]
        N --> ADV2[Date Range]
        N --> ADV3[Full Text Query]
        ADV1 --> O
        ADV2 --> Q
        ADV3 --> O
    end
```

### Theme & Settings Management Flow

```mermaid
flowchart TD
    A[Settings Access] --> B[Settings Modal Open]
    B --> C[Load Current Settings]
    C --> D[electron-store Read]
    D --> E[Display Settings UI]
    
    E --> F{Setting Category}
    F --> G[AI Configuration]
    F --> H[Pile Settings]
    F --> I[Editor Preferences]
    F --> J[Theme Selection]
    
    G --> G1[Provider Selection: Gemini/Ollama]
    G --> G2[API Key Input]
    G --> G3[Model Selection]
    G --> G4[Custom Prompt]
    
    H --> H1[Pile Name]
    H --> H2[Default Theme]
    H --> H3[Auto-save Settings]
    
    I --> I1[Font Size]
    I --> I2[Editor Width]
    I --> I3[Typing Sounds]
    
    J --> J1[Theme Selection]
    J1 --> J2[light, blue, purple, yellow, green]
    J2 --> J3[Apply CSS Variables]
    J3 --> J4[Update Component Styles]
    
    K[Save Settings] --> L[Validate Input]
    L --> M[IPC: Store Settings]
    M --> N[electron-store Write]
    N --> O[Update Context State]
    O --> P[Re-render UI]
    
    subgraph "Theme System"
        J3 --> TH1[CSS Custom Properties]
        TH1 --> TH2[--primary-color]
        TH1 --> TH3[--secondary-color]
        J4 --> TH4[Component className]
        TH4 --> TH5[{theme}Theme CSS class]
    end
    
    subgraph "Security"
        G2 --> SEC1[Encrypt API Keys]
        SEC1 --> SEC2[electron-store encryption]
        M --> SEC3[Secure IPC channel]
    end
```

## User Flow Diagrams

### 1. Application Launch & Pile Selection

```mermaid
flowchart TD
    A[App Launch] --> B{Existing Piles?}
    B -->|Yes| C[Show Home Page with Pile List]
    B -->|No| D[Show Welcome Screen]
    
    C --> E[Select Existing Pile]
    C --> F[Create New Pile]
    D --> F
    
    E --> G[Open Pile Interface]
    F --> H[Pile Creation Wizard]
    
    H --> I[Enter Pile Name]
    I --> J[Select Directory]
    J --> K[Choose Theme]
    K --> L[Configure AI Settings]
    L --> M[Create Pile & Open Interface]
    M --> G
    
    G --> N[Journal Writing Interface]
```

### Chat System Implementation Flow

```mermaid
flowchart TD
    A[Click Chat Tab] --> B[Chat Component Mount]
    B --> C[Load Chat Context]
    C --> D[Initialize Conversation]
    D --> E[Load Recent Entries for Context]
    
    E --> F[Format Entry Context]
    F --> G[Display Chat Interface]
    G --> H[User Input Message]
    H --> I[Send Message to AI]
    
    I --> J[Build Full Context]
    J --> K[Recent entries + chat history + new message]
    K --> L[IPC: AI Chat Request]
    L --> M[Gemini Stream API]
    M --> N[Receive Streamed Response]
    N --> O[Token-by-token Display]
    O --> P[Complete Response]
    P --> Q[Save Chat History]
    
    subgraph "Context Building for Chat"
        J --> CB1[Last 5 journal entries]
        J --> CB2[Previous chat messages]
        J --> CB3[Current user message]
        J --> CB4[AI system prompt]
        CB1 --> CB5[Formatted context string]
        CB2 --> CB5
        CB3 --> CB5
        CB4 --> CB5
    end
    
    subgraph "Streaming Implementation"
        M --> ST1[Server-Sent Events]
        ST1 --> ST2[Token chunks]
        ST2 --> ST3[React state updates]
        ST3 --> ST4[Smooth text animation]
    end
```

### Real-time Features & File Watching

```mermaid
flowchart TD
    A[App Startup] --> B[Setup File Watchers]
    B --> C[Watch Pile Directory]
    C --> D[fs.watch on ~/Piles/**/*.md]
    
    D --> E{File System Event}
    E -->|File Created| F[New Entry Detected]
    E -->|File Modified| G[Entry Updated]
    E -->|File Deleted| H[Entry Removed]
    
    F --> I[Re-scan Directory]
    G --> I
    H --> I
    
    I --> J[Update Search Index]
    J --> K[Update Timeline Context]
    K --> L[Refresh UI Components]
    
    L --> M[Timeline Sidebar Update]
    L --> N[Posts List Refresh]
    L --> O[Search Results Update]
    
    subgraph "Concurrent Access Handling"
        I --> CA1[File Lock Checking]
        CA1 --> CA2[Retry on Lock]
        CA2 --> CA3[Debounced Updates]
    end
    
    subgraph "Performance Optimization"
        J --> PO1[Incremental Index Updates]
        K --> PO2[Virtual List Re-render]
        L --> PO3[React.memo Components]
    end
```

### Authentication & API Key Management

```mermaid
flowchart TD
    A[First App Launch] --> B[Check Stored Keys]
    B --> C{Keys Exist?}
    C -->|No| D[Show Setup Wizard]
    C -->|Yes| E[Decrypt Keys]
    
    D --> F[API Key Input Form]
    F --> G[Key Validation]
    G --> H{Valid Key?}
    H -->|No| I[Show Error Message]
    H -->|Yes| J[Encrypt & Store Key]
    
    I --> F
    J --> K[Initialize AI Provider]
    E --> K
    
    K --> L[Test API Connection]
    L --> M{Connection OK?}
    M -->|No| N[Fallback to Mock AI]
    M -->|Yes| O[Enable AI Features]
    
    subgraph "Encryption Process"
        J --> EN1[Generate Encryption Key]
        EN1 --> EN2[Encrypt API Key]
        EN2 --> EN3[Store in electron-store]
        EN3 --> EN4[Clear Memory]
    end
    
    subgraph "Security Measures"
        EN2 --> SEC1[AES-256 Encryption]
        EN4 --> SEC2[No Plain Text Storage]
        K --> SEC3[Keys Never in Renderer]
        SEC3 --> SEC4[IPC Only Communication]
    end
```

### Database-less Architecture Implementation

```mermaid
flowchart TD
    A[File-based Storage] --> B[Directory Structure]
    B --> C[~/Piles/YYYY/MMM/]
    C --> D[Timestamp-based Files]
    D --> E[YYMMDD-HHMMSS.md]
    
    E --> F[Gray-matter Format]
    F --> G[Frontmatter Section]
    F --> H[Markdown Content]
    
    G --> G1[title: "Entry Title"]
    G --> G2[date: "2024-01-15T10:30:00"]
    G --> G3[tags: ["work", "reflection"]]
    G --> G4[Custom metadata...]
    
    H --> H1[# Markdown Content]
    H --> H2[Rich text with links]
    H --> H3[![Image](path/to/image)]
    
    I[Read Operations] --> J[Glob Pattern Matching]
    J --> K[**/*.md file discovery]
    K --> L[Parallel File Reading]
    L --> M[Gray-matter Parsing]
    M --> N[In-memory Object]
    
    O[Write Operations] --> P[Generate Filename]
    P --> Q[Serialize to Gray-matter]
    Q --> R[Atomic File Write]
    R --> S[Trigger File Watcher]
    
    subgraph "Performance Strategies"
        L --> PS1[Stream Processing]
        M --> PS2[LRU Cache for Parsed Files]
        N --> PS3[Lazy Loading]
        J --> PS4[Directory-level Indexing]
    end
    
    subgraph "Data Consistency"
        R --> DC1[Temporary File Write]
        DC1 --> DC2[Atomic Rename]
        DC2 --> DC3[Backup on Conflicts]
    end
```

### 2. Journal Writing & AI Interaction Flow

```mermaid
flowchart TD
    A[Open Journal Interface] --> B[Load Recent Entries]
    B --> C[Display Timeline Sidebar]
    C --> D[Show Editor]
    
    D --> E{User Action}
    E -->|Start Writing| F[Begin New Entry]
    E -->|Select Existing| G[Load Existing Entry]
    E -->|Search| H[Open Search Interface]
    
    F --> I[Auto-generate Timestamp]
    I --> J[Create Entry File]
    J --> K[Begin Writing in Editor]
    
    G --> K
    
    K --> L{AI Interaction?}
    L -->|Ctrl+Enter| M[Trigger AI Response]
    L -->|Continue Writing| N[Auto-save Progress]
    L -->|Add Media| O[File Upload Dialog]
    
    M --> P[Send Context to AI]
    P --> Q[Stream AI Response]
    Q --> R[Display AI Response in Entry]
    R --> N
    
    O --> S[Process & Store Files]
    S --> T[Add Attachment Links]
    T --> N
    
    N --> U[Update Search Index]
    U --> V[Save Entry to File]
```

### 3. AI Chat & Conversation Flow

```mermaid
flowchart TD
    A[Click Chat Tab] --> B[Load Chat Interface]
    B --> C[Initialize AI Context]
    C --> D[Load Recent Entries for Context]
    D --> E[Display Chat History]
    
    E --> F[User Types Message]
    F --> G[Send Message]
    G --> H[Add User Message to Chat]
    H --> I[Build AI Context]
    
    I --> J[Recent Entries Context]
    I --> K[Current Conversation History]
    I --> L[User Preferences & AI Prompt]
    
    J --> M[Send to AI Provider]
    K --> M
    L --> M
    
    M --> N{AI Provider?}
    N -->|Gemini| O[Google Gemini API]
    N -->|Ollama| P[Local Ollama Server]
    
    O --> Q[Stream Response Tokens]
    P --> Q
    
    Q --> R[Display Streaming Response]
    R --> S[Add AI Response to Chat]
    S --> T[Save Conversation]
    
    T --> U{Continue Chat?}
    U -->|Yes| F
    U -->|No| V[Return to Journal]
```

### 4. Search & Organization Flow

```mermaid
flowchart TD
    A[Open Search Interface] --> B{Search Type}
    
    B -->|Full Text| C[Enter Search Query]
    B -->|Tags| D[Select Tag Filters]
    B -->|Date Range| E[Select Date Range]
    B -->|Advanced| F[Advanced Search Form]
    
    C --> G[Query Lunr.js Index]
    D --> H[Filter by Selected Tags]
    E --> I[Filter by Date Range]
    F --> J[Combine Multiple Filters]
    
    G --> K[Display Search Results]
    H --> K
    I --> K
    J --> K
    
    K --> L[Result List with Snippets]
    L --> M{User Action}
    
    M -->|Click Result| N[Open Entry]
    M -->|Refine Search| O[Modify Search Criteria]
    M -->|Add Tag| P[Tag Management Interface]
    M -->|Create Highlight| Q[Highlight Selected Text]
    
    N --> R[Display Entry in Editor]
    O --> C
    P --> S[Create/Edit/Delete Tags]
    Q --> T[Save Highlight to Database]
    
    S --> U[Update Tag System]
    T --> V[Update Entry Metadata]
    U --> K
    V --> K
```

### 5. Settings & Configuration Flow

```mermaid
flowchart TD
    A[Open Settings] --> B[Settings Categories]
    
    B --> C[AI Configuration]
    B --> D[Pile Settings]
    B --> E[Editor Preferences]
    B --> F[Import/Export]
    
    C --> G{AI Provider Selection}
    G -->|Gemini| H[Enter Gemini API Key]
    G -->|Ollama| I[Configure Ollama URL]
    G -->|Mock| J[Enable Testing Mode]
    
    H --> K[Test API Connection]
    I --> L[Test Ollama Connection]
    J --> M[Use Mock Responses]
    
    K --> N{Connection Success?}
    L --> N
    N -->|Yes| O[Save AI Configuration]
    N -->|No| P[Show Error Message]
    
    D --> Q[Pile-specific Settings]
    Q --> R[Theme Selection]
    Q --> S[AI Prompt Customization]
    Q --> T[Auto-save Preferences]
    
    E --> U[Editor Configuration]
    U --> V[Font Family & Size]
    U --> W[Spell Check Settings]
    U --> X[Markdown Preferences]
    
    F --> Y[Data Import/Export]
    Y --> Z[Export to ZIP]
    Y --> AA[Import from Other Apps]
    
    O --> BB[Apply Settings]
    R --> BB
    S --> BB
    T --> BB
    V --> BB
    W --> BB
    X --> BB
    Z --> BB
    AA --> BB
    
    BB --> CC[Restart Required?]
    CC -->|Yes| DD[Prompt App Restart]
    CC -->|No| EE[Settings Applied]
```

## Technical Implementation Details

### IPC (Inter-Process Communication) Architecture

**Preload Script** (`src/main/preload.ts`):
```typescript
// Secure API exposure to renderer
contextBridge.exposeInMainWorld('electron', {
  ipc: {
    sendMessage: (channel: string, ...args: any[]) => 
      ipcRenderer.send(channel, ...args),
    invoke: (channel: string, ...args: any[]) => 
      ipcRenderer.invoke(channel, ...args),
    on: (channel: string, callback: (...args: any[]) => void) =>
      ipcRenderer.on(channel, (_, ...args) => callback(...args)),
    removeAllListeners: (channel: string) =>
      ipcRenderer.removeAllListeners(channel)
  }
})
```

**IPC Handlers** (`src/main/handlers/`):
- **file.ts**: File operations, pile management, entry CRUD
- **gemini.ts**: AI integration, streaming responses
- **keys.ts**: Encrypted API key storage and retrieval
- **store.ts**: Application settings and preferences
- **tags.ts**: Tag management and relationships
- **highlights.ts**: Highlight storage and retrieval
- **links.ts**: Link processing and backlink generation

### State Management (React Context)

**Context Providers**:
1. **PilesContext**: Current pile, pile list, pile operations
2. **AIContext**: AI provider, API keys, generation functions
3. **IndexContext**: Search index, full-text search capabilities
4. **TagsContext**: Tag list, tag operations, filtering
5. **TimelineContext**: Entry timeline, date navigation
6. **HighlightsContext**: Highlight management across entries
7. **LinksContext**: Internal/external link management
8. **ToastsContext**: Notification system for user feedback

### Custom Hooks

**Key Hooks** (`src/renderer/hooks/`):
- **useElectronStore**: Interface with electron-settings
- **useChat**: AI conversation management
- **useGeminiStream**: Streaming AI responses
- **useSearch**: Full-text search functionality
- **useTimeline**: Timeline navigation and date filtering
- **useFileUpload**: Drag & drop file handling

### Build & Development Configuration

**Development Workflow**:
```bash
# Development commands
npm install --legacy-peer-deps    # Install dependencies
npm start                        # Start dev server with hot reload
npm run start:main               # Start main process with watching
npm run start:renderer           # Start renderer dev server

# Build commands
npm run build                    # Production build (main + renderer)
npm run package                  # Create distributable packages
npm run release                  # Build and publish to GitHub

# Code quality
npm run lint                     # ESLint code analysis
npm run lint:fix                 # Auto-fix linting issues
npm test                         # Run Jest test suite
```

**Webpack Configuration**:
- **Main Process**: TypeScript compilation, Node.js target
- **Renderer Process**: React, SCSS, CSS Modules, hot reload
- **Preload Script**: Secure IPC bridge compilation
- **Development DLL**: Faster rebuilds for development dependencies

**Electron Builder Configuration**:
- **macOS**: Universal binary (ARM64 + x64), notarization, DMG packaging
- **Windows**: NSIS installer, both x64 and ia32 architectures
- **Linux**: AppImage format for broad compatibility
- **Auto-updater**: GitHub releases integration for automatic updates

## Platform-Specific Features

### macOS
- **Traffic Light Positioning**: Custom titlebar with native window controls
- **Vibrancy Effects**: Transparent window backgrounds with system blur
- **Dock Integration**: Badge counts, progress indicators
- **Menu Bar Integration**: Native menu structure
- **Notification Center**: System notifications for AI responses

### Windows
- **Custom Frame**: Consistent UI across Windows versions
- **Taskbar Integration**: Progress indicators, jump lists
- **Windows Store Compatibility**: Prepared for store distribution
- **File Association**: Register for .md and custom file types

### Linux
- **AppImage Distribution**: Single-file executable for all distros
- **Desktop Integration**: .desktop file creation, icon installation
- **File Manager Integration**: Context menu actions for journal files
- **Wayland Compatibility**: Support for modern Linux desktop environments

## Migration Considerations

### For Web-Based Implementation
- **Replace Electron**: Use Progressive Web App (PWA) with File System Access API
- **File Storage**: IndexedDB or Origin Private File System API
- **AI Integration**: Direct API calls with CORS proxy for Gemini
- **Security**: Web-based encryption for API keys using Web Crypto API

### For Native Mobile (React Native/Flutter)
- **File System**: Platform-specific file management APIs
- **Rich Text Editor**: Platform-appropriate rich text components
- **AI Integration**: HTTP API calls with platform-specific networking
- **Synchronization**: Add cloud sync capabilities for mobile use

### For Desktop (Tauri/Qt/GTK)
- **Rust Backend**: Tauri with Rust for system integration
- **Native UI**: Platform-specific UI frameworks instead of web technologies
- **Performance**: Potentially better performance with native compilation
- **Bundle Size**: Smaller distribution packages compared to Electron

### For Server-Based Implementation
- **Backend**: Node.js/Python/Go API server with database storage
- **Frontend**: React SPA or server-rendered pages
- **Multi-user**: Add user authentication and isolation
- **Real-time**: WebSocket connections for real-time AI streaming

## Dependencies & Licensing

### Critical Dependencies
- **Electron**: MIT License - Core application framework
- **React**: MIT License - UI library
- **TipTap**: MIT License - Rich text editor
- **@google/generative-ai**: Apache 2.0 - AI integration
- **gray-matter**: MIT License - Markdown frontmatter parsing
- **lunr**: MIT License - Full-text search

### Development Dependencies
- **TypeScript**: Apache 2.0 - Type system
- **Webpack**: MIT License - Build system
- **Jest**: MIT License - Testing framework
- **ESLint**: MIT License - Code linting
- **electron-builder**: MIT License - App packaging

All dependencies are compatible with MIT licensing and commercial use.

## Conclusion

PileBintang represents a sophisticated desktop journaling application that combines modern web technologies with powerful AI integration. This technical specification provides the foundation for recreating the application in different technology stacks while maintaining its core functionality and user experience.

The application's strength lies in its thoughtful architecture separating concerns between file management, AI integration, and user interface, making it adaptable to various platforms and technologies while preserving the essential journaling workflow that makes it valuable to users.
