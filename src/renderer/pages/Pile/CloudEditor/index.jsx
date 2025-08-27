import { useCallback, useState, useEffect, useRef, memo } from 'react';
import { Extension } from '@tiptap/core';
import { useEditor, EditorContent } from '@tiptap/react';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { DiscIcon, PhotoIcon, TrashIcon, TagIcon } from 'renderer/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import useCloudPost from 'renderer/hooks/useCloudPost';
import { useToastsContext } from 'renderer/context/ToastsContext';
import { useSyncContext } from 'renderer/context/SyncContext';
import { useCloudPostsContext } from 'renderer/context/CloudPostsContext';
import CursorOverlay from 'renderer/components/CursorOverlay';
import styles from '../Editor/Editor.module.scss';
import cloudStyles from './CloudEditor.module.scss';

const CloudEditor = memo(
  ({
    postId = null,
    editable = false,
    closeReply = () => {},
    setEditable = () => {},
    reloadParentPost,
    searchTerm = null,
  }) => {
    const {
      post,
      savePost,
      addTag,
      removeTag,
      setContent,
      resetPost,
      deletePost,
      loading,
      error,
      isNew,
    } = useCloudPost(postId);

    const { addNotification, removeNotification } = useToastsContext();
    const { cursorPositions, broadcastCursor, isRealtimeConnected } = useCloudPostsContext();

    const [editor, setEditor] = useState(null);
    const [focused, setFocused] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [showTagInput, setShowTagInput] = useState(false);
    const tagInputRef = useRef(null);
    const editorContainerRef = useRef(null);

    const EnterSubmitExtension = Extension.create({
      name: 'EnterSubmitExtension',
      addCommands() {
        return {
          triggerSubmit:
            () =>
            ({ state, dispatch }) => {
              const event = new CustomEvent('submit');
              document.dispatchEvent(event);
              return true;
            },
        };
      },

      addKeyboardShortcuts() {
        return {
          Enter: ({ editor }) => {
            editor.commands.triggerSubmit();
            return true;
          },
        };
      },
    });

    const editorInstance = useEditor({
      extensions: [
        StarterKit,
        Typography,
        CharacterCount,
        Link.configure({
          openOnClick: false,
        }),
        Placeholder.configure({
          placeholder: 'What are you thinking about?',
          showOnlyWhenEditable: true,
        }),
        EnterSubmitExtension,
      ],
      content: post.content,
      editable,
      onUpdate: ({ editor }) => {
        setContent(editor.getHTML());
      },
      onFocus: () => {
        setFocused(true);
      },
      onBlur: () => {
        setFocused(false);
      },
    });

    useEffect(() => {
      setEditor(editorInstance);
      return () => {
        if (editorInstance) {
          editorInstance.destroy();
        }
      };
    }, [editorInstance]);

    useEffect(() => {
      if (editor && post.content !== editor.getHTML()) {
        editor.commands.setContent(post.content);
      }
    }, [post.content, editor]);

    // Handle submit on Enter key
    useEffect(() => {
      const handleSubmit = async () => {
        if (editor && editable && post.content.trim()) {
          await handleSavePost();
        }
      };

      document.addEventListener('submit', handleSubmit);
      return () => {
        document.removeEventListener('submit', handleSubmit);
      };
    }, [editor, editable, post.content]);

    const handleSavePost = useCallback(async () => {
      if (!post.content.trim()) return;

      setSaving(true);
      try {
        const savedPost = await savePost();

        if (savedPost && isNew) {
          // Reset editor after creating new post
          resetPost();
          editor?.commands.clearContent();

          addNotification({
            id: Date.now(),
            message: 'Post saved to cloud',
            type: 'success',
          });
        } else if (savedPost) {
          addNotification({
            id: Date.now(),
            message: 'Post updated',
            type: 'success',
          });
        }
      } catch (err) {
        console.error('Error saving cloud post:', err);
        addNotification({
          id: Date.now(),
          message: 'Failed to save post',
          type: 'error',
        });
      } finally {
        setSaving(false);
      }
    }, [post.content, savePost, isNew, resetPost, editor, addNotification]);

    const handleDeletePost = useCallback(async () => {
      if (window.confirm('Delete this post? This cannot be undone.')) {
        try {
          await deletePost();
          addNotification({
            id: Date.now(),
            message: 'Post deleted',
            type: 'success',
          });
        } catch (err) {
          console.error('Error deleting post:', err);
          addNotification({
            id: Date.now(),
            message: 'Failed to delete post',
            type: 'error',
          });
        }
      }
    }, [deletePost, addNotification]);

    const handleTagSubmit = useCallback(
      (e) => {
        e.preventDefault();
        if (tagInput.trim()) {
          addTag(tagInput.trim());
          setTagInput('');
          setShowTagInput(false);
        }
      },
      [tagInput, addTag],
    );

    const handleTagInputKeyDown = useCallback((e) => {
      if (e.key === 'Escape') {
        setShowTagInput(false);
        setTagInput('');
      }
    }, []);

    if (loading) {
      return (
        <div className={styles.editor}>
          <div className={cloudStyles.loading}>Loading...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.editor}>
          <div className={cloudStyles.error}>Error: {error}</div>
        </div>
      );
    }

    // Cursor tracking functionality
    const handleCursorMove = useCallback((event) => {
      if (!isRealtimeConnected || !broadcastCursor || !editorContainerRef.current) {
        return;
      }

      const rect = editorContainerRef.current.getBoundingClientRect();
      const position = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      // Get selection if available
      let selection = null;
      if (editor && editor.state.selection) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          // There's a text selection
          selection = {
            from,
            to,
            text: editor.state.doc.textBetween(from, to)
          };
        }
      }

      // Throttled cursor broadcasting
      clearTimeout(window.cursorBroadcastTimeout);
      window.cursorBroadcastTimeout = setTimeout(() => {
        broadcastCursor(position, selection);
      }, 50); // 50ms throttle
    }, [isRealtimeConnected, broadcastCursor, editor]);

    // Add cursor tracking to editor
    useEffect(() => {
      const container = editorContainerRef.current;
      if (container && isRealtimeConnected) {
        container.addEventListener('mousemove', handleCursorMove);
        container.addEventListener('click', handleCursorMove);
        
        return () => {
          container.removeEventListener('mousemove', handleCursorMove);
          container.removeEventListener('click', handleCursorMove);
          clearTimeout(window.cursorBroadcastTimeout);
        };
      }
    }, [handleCursorMove, isRealtimeConnected]);

    return (
      <div className={`${styles.editor} ${focused ? styles.focused : ''}`}>
        <div 
          ref={editorContainerRef}
          className={styles.content}
          style={{ position: 'relative' }}
        >
          <EditorContent editor={editor} />

          {/* Cursor overlay for collaborative editing */}
          {isRealtimeConnected && (
            <CursorOverlay cursorPositions={cursorPositions} />
          )}

          {/* Character count for new posts */}
          {editable && editor && (
            <div className={styles.characterCount}>
              {editor.storage.characterCount.characters()} characters
            </div>
          )}

          {/* Error display */}
          {error && <div className={cloudStyles.errorMessage}>⚠️ {error}</div>}
        </div>

        {/* Actions */}
        {editable && (
          <div className={styles.actions}>
            <div className={styles.left}>
              <button
                className={styles.tagButton}
                onClick={() => setShowTagInput(true)}
                title="Add tag"
              >
                <TagIcon />
              </button>
            </div>

            <div className={styles.right}>
              {!isNew && (
                <button
                  className={styles.deleteButton}
                  onClick={handleDeletePost}
                  title="Delete post"
                >
                  <TrashIcon />
                </button>
              )}

              {saving ? (
                <div className={cloudStyles.saving}>Saving...</div>
              ) : (
                <button
                  className={styles.saveButton}
                  onClick={handleSavePost}
                  disabled={!post.content.trim()}
                  title="Save to cloud"
                >
                  <DiscIcon />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {post.data.tags && post.data.tags.length > 0 && (
          <div className={styles.tags}>
            {post.data.tags.map((tag, index) => (
              <span
                key={index}
                className={styles.tag}
                onClick={() => editable && removeTag(tag)}
              >
                {tag}
                {editable && <span className={styles.removeTag}>×</span>}
              </span>
            ))}
          </div>
        )}

        {/* Tag input */}
        {showTagInput && (
          <form onSubmit={handleTagSubmit} className={styles.tagInputForm}>
            <input
              ref={tagInputRef}
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              onBlur={() => {
                setShowTagInput(false);
                setTagInput('');
              }}
              placeholder="Enter tag..."
              autoFocus
              className={styles.tagInput}
            />
          </form>
        )}

        {/* Cloud indicator */}
        <div className={cloudStyles.cloudIndicator}>☁️ Cloud Post</div>
      </div>
    );
  },
);

export default CloudEditor;
