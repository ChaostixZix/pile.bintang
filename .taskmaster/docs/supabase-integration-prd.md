# PileBintang Supabase Integration - Product Requirements Document

**Version:** 1.0.0  
**Date:** January 2025  
**Status:** Planning  

## Executive Summary

PileBintang will integrate with Supabase to provide cloud synchronization, multi-device access, real-time collaboration, and enhanced data persistence for the journaling application. This integration maintains the current offline-first experience while adding cloud capabilities.

## Problem Statement

Currently, PileBintang stores all journal data locally using the file system. This creates limitations:
- No cross-device synchronization
- Risk of data loss if device fails
- No collaboration features
- Limited search capabilities across large datasets
- No user authentication system
- Attachments consume local storage

## Goals & Objectives

### Primary Goals
1. **Cloud Synchronization**: Seamlessly sync journal data across multiple devices
2. **Data Security**: Ensure journal data is securely stored and backed up
3. **Multi-user Support**: Enable user accounts and authentication
4. **Real-time Collaboration**: Allow sharing and collaborative editing of piles
5. **Enhanced Storage**: Move attachments to cloud storage with CDN benefits

### Success Metrics
- 99.9% uptime for cloud sync
- <2 second sync latency for new entries
- Zero data loss during migration
- 95% user satisfaction with sync experience
- Support for offline-first usage patterns

## User Stories

### Core User Stories

**As a user, I want to:**
- Access my journals from any device with automatic sync
- Never lose my journal data even if my device breaks
- Share specific piles with trusted friends/family
- Collaborate on shared journals in real-time
- Have my images stored securely in the cloud
- Sign in with my Google/email account
- Work offline and sync when connection returns
- Search across all my historical entries efficiently

### Advanced User Stories

**As a power user, I want to:**
- Export my data from Supabase at any time
- Control which piles are synced vs local-only
- See version history of edited entries
- Manage sharing permissions granularly
- Access my data via API for personal tools

## Technical Requirements

### Database Schema

#### Core Tables
```sql
-- Users and authentication
users (id, email, created_at, updated_at)
user_profiles (user_id, display_name, preferences, ai_settings)

-- Pile management
piles (id, user_id, name, theme, settings, created_at, updated_at, is_shared)
pile_members (pile_id, user_id, role, permissions, invited_at)

-- Journal content
posts (id, pile_id, user_id, path, name, content, frontmatter, created_at, updated_at)
post_replies (id, parent_post_id, post_id, order_index, created_at)
post_tags (post_id, tag, created_at)
post_highlights (post_id, text, color, position, created_at)

-- File attachments
attachments (id, post_id, user_id, filename, file_path, file_size, mime_type, created_at)
```

#### Indexes and Performance
- Full-text search index on post content
- Composite indexes for user_id + created_at queries
- Pile-specific queries optimized
- Real-time subscriptions for collaborative features

### Authentication System

#### Supported Auth Methods
- Email/Password (Supabase Auth)
- Google OAuth integration
- Magic link authentication
- Guest mode (local-only, no sync)

#### Security Requirements
- Row Level Security (RLS) policies
- User data isolation
- Encrypted API keys storage
- Secure file upload permissions

### Real-time Features

#### Live Synchronization
- Real-time post creation/editing
- Live cursor positions for collaborative editing
- Presence indicators (who's online)
- Conflict resolution for simultaneous edits

#### Subscription Patterns
```javascript
// Subscribe to pile changes
supabase
  .channel(`pile:${pileId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'posts',
    filter: `pile_id=eq.${pileId}`
  }, payload => {
    // Handle real-time updates
  })
  .subscribe()
```

### File Storage Integration

#### Supabase Storage Buckets
- `pile-attachments`: User uploaded images and files
- `user-avatars`: Profile pictures
- `exports`: Generated data exports

#### Storage Policies
- Users can only access their own files
- Shared pile members can access shared attachments
- CDN integration for fast image delivery
- Automatic image optimization and resizing

## Architecture & Integration

### Current Architecture Preservation
- Maintain Electron main/renderer process separation
- Keep existing IPC patterns
- Preserve offline-first functionality
- Maintain current file operation APIs

### New Supabase Layer
```
┌─────────────────┐
│ Renderer Process │
│ (React Frontend) │
└─────────┬───────┘
          │ IPC
┌─────────▼───────┐
│  Main Process   │
│ ┌─────────────┐ │
│ │ File System │ │  ← Existing
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │  Supabase   │ │  ← New
│ │  Client     │ │
│ └─────────────┘ │
└─────────────────┘
```

### Hybrid Data Strategy
- **Primary Storage**: Supabase (when online)
- **Local Cache**: SQLite/File system backup
- **Conflict Resolution**: Last-write-wins with merge options
- **Offline Queue**: Pending operations when offline

## Data Migration Strategy

### Phase 1: Parallel Systems
- Implement Supabase alongside existing file system
- Add "Enable Cloud Sync" toggle in settings
- Users can opt-in to migration
- Maintain full backward compatibility

### Phase 2: Migration Tools
- Export existing piles to Supabase format
- Batch upload with progress indicators  
- Verify data integrity post-migration
- Rollback capabilities if issues occur

### Phase 3: Hybrid Mode
- Sync new entries to both systems
- Gradually deprecate local-only storage
- Maintain offline fallback indefinitely

### Migration UI Flow
```
1. Settings > Cloud Sync > "Enable Supabase Sync"
2. Create account / Sign in
3. "Migrate Existing Piles" wizard
4. Select piles to upload (with size estimates)
5. Progress bar with detailed status
6. Verification step comparing local vs cloud
7. "Migration Complete" with next steps
```

## User Experience Requirements

### Onboarding Flow
1. **First Launch**: Option to "Try Offline" or "Sign Up for Sync"
2. **Account Creation**: Streamlined signup with email verification
3. **Migration Wizard**: Guided process for existing users
4. **Sync Settings**: Granular control over what syncs

### Sync Status Indicators
- **Sync Status**: Visual indicators in sidebar (synced, syncing, offline)
- **Conflict Resolution**: UI for resolving editing conflicts
- **Storage Usage**: Display cloud storage consumption
- **Connection Status**: Clear offline/online state

### Collaboration Features
- **Pile Sharing**: Generate shareable links with permission levels
- **Live Collaboration**: Real-time editing with user cursors
- **Member Management**: Invite/remove collaborators
- **Activity Feed**: See who made what changes when

## Security & Privacy

### Data Encryption
- **In Transit**: TLS 1.3 for all API communications
- **At Rest**: Supabase built-in encryption
- **Local Cache**: Encrypted SQLite database
- **API Keys**: Secure storage in Electron store

### Privacy Controls
- **Data Ownership**: Users maintain full control of their data
- **Export Rights**: Complete data export functionality
- **Deletion Rights**: Permanent data deletion options
- **Sharing Controls**: Granular pile-level permissions

### Compliance Considerations  
- GDPR compliance for EU users
- Data residency options
- Audit logging for enterprise features
- Privacy policy updates

## Performance Requirements

### Sync Performance
- **Initial Sync**: <30 seconds for 1000 entries
- **Incremental Sync**: <2 seconds for single entry
- **Offline Buffer**: 10,000 pending operations
- **File Upload**: Progress indicators for >1MB files

### Database Performance
- **Query Response**: <500ms for timeline loads
- **Search Performance**: <1 second full-text search
- **Real-time Latency**: <100ms for collaborative editing
- **Concurrent Users**: Support 100+ simultaneous users per pile

## Implementation Phases

### Phase 1: Foundation (4 weeks)
- Set up Supabase project and database schema
- Implement authentication system
- Create basic sync infrastructure
- Add settings UI for cloud features

### Phase 2: Core Sync (6 weeks)
- Implement post synchronization
- Add conflict resolution
- Create migration tools
- Build offline queue system

### Phase 3: Collaboration (4 weeks)
- Real-time editing features
- Pile sharing functionality
- Member management UI
- Activity feeds and notifications

### Phase 4: Storage & Polish (3 weeks)
- File storage integration
- Performance optimizations
- Error handling and recovery
- Beta user testing and feedback

### Phase 5: Launch (2 weeks)
- Production deployment
- User documentation
- Support systems
- Monitoring and analytics

## Risk Assessment

### Technical Risks
- **Data Loss**: Mitigation through comprehensive backup strategies
- **Sync Conflicts**: Robust conflict resolution algorithms
- **Performance**: Load testing and optimization
- **Security**: Penetration testing and security audits

### Business Risks
- **User Adoption**: Gradual rollout with opt-in migration
- **Cost Scaling**: Monitor Supabase usage and optimize queries
- **Vendor Lock-in**: Maintain data export capabilities
- **Privacy Concerns**: Transparent privacy controls and policies

## Success Criteria

### Technical Success
- ✅ Zero data loss during migration
- ✅ <1% sync failure rate  
- ✅ 99.9% uptime for cloud features
- ✅ Offline-first functionality preserved

### User Success
- ✅ 80% of users enable cloud sync within 30 days
- ✅ 90% user satisfaction with sync experience
- ✅ <5% support tickets related to sync issues
- ✅ 50% growth in daily active users due to multi-device access

## Future Considerations

### Advanced Features
- **AI Enhancement**: Cloud-based AI processing for better performance
- **Advanced Search**: Semantic search across journal history
- **Analytics**: Personal insights and journaling patterns
- **Integrations**: Connect with other productivity apps
- **Mobile Apps**: iOS/Android apps sharing the same backend

### Scalability Plans
- **Database Scaling**: Read replicas and connection pooling
- **File Storage**: CDN integration and optimization
- **Global Distribution**: Multi-region deployment options
- **Enterprise Features**: Team management and admin controls

---

## Conclusion

This Supabase integration will transform PileBintang from a local-only journaling app into a powerful, cloud-enabled platform while preserving the privacy and offline-first experience users love. The phased approach ensures existing users can migrate safely while new capabilities attract additional users seeking modern, connected journaling solutions.