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
import { postFormat } from 'renderer/utils/fileOperations';
import { useParams } from 'react-router-dom';
import usePost from 'renderer/hooks/usePost';
import { useAIContext } from 'renderer/context/AIContext';
import useThread from 'renderer/hooks/useThread';
import { useToastsContext } from 'renderer/context/ToastsContext';
import { useDebug } from 'renderer/context/DebugContext';
import Attachments from './Attachments';
import TagList from './TagList';
import TagButton from './TagButton';
import styles from './Editor.module.scss';
import ProseMirrorStyles from './ProseMirror.scss';
import LinkPreviews from './LinkPreviews';

// Escape special characters
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const highlightTerms = (text, term) => {
  if (!term.trim()) return text;
  const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
  return text.replace(regex, `<span class="${styles.highlight}">$1</span>`);
};

const Editor = memo(
  ({
    postPath = null,
    editable = false,
    parentPostPath = null,
    isAI = false,
    isThinkDeeper = false,
    isReply = false,
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
      attachToPost,
      detachFromPost,
      setContent,
      resetPost,
      deletePost,
    } = usePost(postPath, { isReply, parentPostPath, reloadParentPost, isAI });
    const { getThread } = useThread();
    const { ai, prompt, model, generateCompletion, prepareCompletionContext } =
      useAIContext();
    const { addNotification, removeNotification } = useToastsContext();
    const { showAIStatus, hideAIStatus } = useDebug();

    const isNew = !postPath;

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

    const handleFile = (file) => {
      if (file && file.type.indexOf('image') === 0) {
        const fileName = file.name; // Retrieve the filename
        const fileExtension = fileName.split('.').pop(); // Extract the file extension
        // Handle the image file here (e.g., upload, display, etc.)
        const reader = new FileReader();
        reader.onload = () => {
          const imageData = reader.result;
          attachToPost(imageData, fileExtension);
        };
        reader.readAsDataURL(file);
      }
    };

    const handleDataTransferItem = (item) => {
      const file = item.getAsFile();
      if (file) {
        handleFile(file);
      }
    };

    const editor = useEditor({
      extensions: [
        StarterKit,
        Typography,
        Link,
        Placeholder.configure({
          placeholder: isAI ? 'AI is thinking...' : 'What are you thinking?',
        }),
        CharacterCount.configure({
          limit: 10000,
        }),
        EnterSubmitExtension,
      ],
      editorProps: {
        handlePaste(view, event, slice) {
          const items = Array.from(event.clipboardData?.items || []);
          let imageHandled = false; // flag to track if an image was handled

          if (items) {
            items.forEach((item) => {
              // Check if the item type is an image
              if (item.type && item.type.indexOf('image') === 0) {
                handleDataTransferItem(item);
                imageHandled = true;
              }
            });
          }
          return imageHandled;
        },
        handleDrop(view, event, slice, moved) {
          const imageHandled = false; // flag to track if an image was handled
          if (
            !moved &&
            event.dataTransfer &&
            event.dataTransfer.files &&
            event.dataTransfer.files[0]
          ) {
            // if dropping external files
            const files = Array.from(event.dataTransfer.files);
            files.forEach(handleFile);
            return imageHandled; // handled
          }
          return imageHandled; // not handled use default behaviour
        },
      },
      autofocus: true,
      editable,
      content: post?.content || '',
      onUpdate: ({ editor }) => {
        setContent(editor.getHTML());
      },
    });

    const elRef = useRef();
    const [deleteStep, setDeleteStep] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isAIResponding, setIsAiResponding] = useState(false);
    const [canCancelAI, setCanCancelAI] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [prevDragPos, setPrevDragPos] = useState(0);

    const handleMouseDown = (e) => {
      setIsDragging(true);
      setPrevDragPos(e.clientX);
    };

    const handleMouseMove = (e) => {
      if (isDragging && elRef.current) {
        const delta = e.clientX - prevDragPos;
        elRef.current.scrollLeft -= delta;
        setPrevDragPos(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    useEffect(() => {
      if (!editor) return;
      generateAiResponse();
    }, [editor, isAI]);

    const handleSubmit = useCallback(async () => {
      await savePost();
      if (isNew) {
        resetPost();
        closeReply();
        return;
      }

      closeReply();
      setEditable(false);
    }, [editor, isNew, post]);

    // Listen for the 'submit' event and call handleSubmit when it's triggered
    useEffect(() => {
      const handleEvent = () => {
        if (editor?.isFocused) {
          handleSubmit();
        }
      };

      document.addEventListener('submit', handleEvent);

      return () => {
        document.removeEventListener('submit', handleEvent);
      };
    }, [handleSubmit, editor]);

    // This has to ensure that it only calls the AI generate function
    // on entries added for the AI that are empty.
    const generateAiResponse = useCallback(async () => {
      console.log('📝 [Editor] generateAiResponse called', {
        hasEditor: !!editor,
        isAIResponding,
        isAI,
        hasContent: editor?.state.doc.textContent.length > 0,
        parentPostPath
      });

      if (
        !editor ||
        isAIResponding ||
        !isAI ||
        editor.state.doc.textContent.length !== 0
      ) {
        console.log('📝 [Editor] Skipping AI response due to conditions');
        return;
      }

      console.log('📝 [Editor] Starting AI response generation...');
      setEditable(false);
      setIsAiResponding(true);
      setCanCancelAI(true);
      setAiError(null);

      // Show debug notification
      showAIStatus('loading', `AI is thinking with ${model}...`);

      try {
        console.log('📝 [Editor] Getting thread for:', parentPostPath);
        const thread = await getThread(parentPostPath);
        console.log('📝 [Editor] Thread retrieved:', thread?.length, 'posts');
        
        const context = prepareCompletionContext(thread, isThinkDeeper);
        console.log('📝 [Editor] Context prepared:', context?.length, 'messages', isThinkDeeper ? '(Think Deeper mode)' : '');

        if (context.length === 0) {
          throw new Error('No context available for AI response');
        }

        let tokenCount = 0;
        let streamCompleted = false;
        
        // Set up a hard timeout as failsafe
        const failsafeTimeout = setTimeout(() => {
          if (!streamCompleted) {
            console.error('📝 [Editor] Failsafe timeout triggered - AI response taking too long');
            const timeoutError = 'AI response timed out. The model might be overloaded. Try a different model.';
            setAiError(timeoutError);
            setIsAiResponding(false);
            setCanCancelAI(false);
            showAIStatus('error', timeoutError);
            streamCompleted = true;
          }
        }, 60000); // 60 second hard timeout

        try {
          await generateCompletion(
            context, 
            (token) => {
              if (streamCompleted) return; // Ignore tokens after completion
              tokenCount++;
              console.log('📝 [Editor] Received token', tokenCount, ':', token.substring(0, 50));
              editor.commands.insertContent(token);
            },
            {
              timeout: 45000, // 45 second timeout
              onStart: () => {
                console.log('📝 [Editor] AI stream started callback');
              },
              onError: (error) => {
                if (streamCompleted) return;
                streamCompleted = true;
                clearTimeout(failsafeTimeout);
                
                console.error('📝 [Editor] AI error callback:', error.message);
                const errorMessage = error.message || 'AI request failed';
                setAiError(errorMessage);
                setIsAiResponding(false);
                setCanCancelAI(false);
                // Show error in debug notification
                showAIStatus('error', errorMessage);
              }
            }
          );
          
          // Clear the failsafe timeout since we completed successfully
          streamCompleted = true;
          clearTimeout(failsafeTimeout);
        } catch (error) {
          streamCompleted = true;
          clearTimeout(failsafeTimeout);
          throw error; // Re-throw to be caught by outer catch
        }
        
        console.log('📝 [Editor] AI completion finished, total tokens:', tokenCount);
        // Show success and hide after a moment
        showAIStatus('success', `AI response completed (${tokenCount} tokens)`);
        setTimeout(() => hideAIStatus(), 2000);
      } catch (error) {
        console.error('📝 [Editor] AI generation failed:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        setAiError(errorMessage);
        // Show error in debug notification
        showAIStatus('error', errorMessage);
      } finally {
        console.log('📝 [Editor] Finally block - aiError:', aiError);
        // Only clean up local state if no error occurred
        if (!aiError) {
          console.log('📝 [Editor] Cleaning up - no error');
          setIsAiResponding(false);
          setCanCancelAI(false);
        }
      }
    }, [
      editor,
      isAI,
      generateCompletion,
      prepareCompletionContext,
      getThread,
      parentPostPath,
      isAIResponding,
      aiError,
    ]);

    const cancelAiResponse = useCallback(() => {
      if (canCancelAI || isAIResponding) {
        console.log('📝 [Editor] Cancelling AI response');
        setIsAiResponding(false);
        setCanCancelAI(false);
        setAiError(null);
        setEditable(true); // Re-enable editing
        hideAIStatus(); // Hide debug notification
      }
    }, [canCancelAI, isAIResponding, hideAIStatus]);

    const retryAiResponse = useCallback(() => {
      console.log('📝 [Editor] Retrying AI response');
      setRetryCount(prev => prev + 1);
      setAiError(null);
      hideAIStatus(); // Hide current error state
      generateAiResponse();
    }, [generateAiResponse, hideAIStatus]);

    useEffect(() => {
      if (editor) {
        if (!post) return;
        if (post?.content != editor.getHTML()) {
          editor.commands.setContent(post.content);
        }
      }
    }, [post, editor]);

    const triggerAttachment = () => attachToPost();

    useEffect(() => {
      if (editor) {
        editor.setEditable(editable);
      }
      setDeleteStep(0);
    }, [editable]);

    const handleOnDelete = useCallback(async () => {
      if (deleteStep == 0) {
        setDeleteStep(1);
        return;
      }

      await deletePost();
    }, [deleteStep]);

    const isBig = useCallback(() => {
      return editor?.storage.characterCount.characters() < 280;
    }, [editor]);

    const renderPostButton = () => {
      if (isAI) return 'Save AI response';
      if (isReply) return 'Reply';
      if (isNew) return 'Post';

      return 'Update';
    };

    if (!post) return;

    let previewContent = post.content;
    if (searchTerm && !editable) {
      previewContent = highlightTerms(post.content, searchTerm);
    }

    return (
      <div className={`${styles.frame} ${isNew && styles.isNew}`} style={{ position: 'relative' }}>
        {editable ? (
          <EditorContent
            key="new"
            className={`${styles.editor} ${isBig() && styles.editorBig} ${
              isAIResponding && styles.responding
            }`}
            editor={editor}
          />
        ) : (
          <div className={styles.uneditable}>
            <div
              key="uneditable"
              className={`${styles.editor} ${isBig() && styles.editorBig}`}
              dangerouslySetInnerHTML={{ __html: previewContent }}
            />
          </div>
        )}


        <LinkPreviews post={post} />

        <div
          className={`${styles.media} ${
            post?.data?.attachments.length > 0 ? styles.open : ''
          }`}
        >
          <div
            className={`${styles.scroll} ${isNew && styles.new}`}
            ref={elRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className={styles.container}>
              <Attachments
                post={post}
                editable={editable}
                onRemoveAttachment={detachFromPost}
              />
            </div>
          </div>
        </div>

        {editable && (
          <div className={styles.footer}>
            <div className={styles.left}>
              <button className={styles.button} onClick={triggerAttachment}>
                <PhotoIcon className={styles.icon} />
              </button>
            </div>
            <div className={styles.right}>
              {isReply && (
                <button className={styles.deleteButton} onClick={closeReply}>
                  Close
                </button>
              )}

              {!isNew && (
                <button
                  className={styles.deleteButton}
                  onClick={handleOnDelete}
                >
                  {deleteStep == 0 ? 'Delete' : 'Click again to confirm'}
                </button>
              )}
              <button
                tabIndex="0"
                className={styles.button}
                onClick={handleSubmit}
              >
                {renderPostButton()}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default Editor;
