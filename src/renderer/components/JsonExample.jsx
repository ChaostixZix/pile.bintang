/**
 * Example component demonstrating Gemini JSON API usage with error handling
 * This is a reference implementation for using structured AI responses
 */

import React, { useState } from 'react';
import { generateStructuredResponse, createErrorToast } from '../utils/jsonHelper';
import { useToastsContext } from '../context/ToastsContext';

const JsonExample = () => {
  const [prompt, setPrompt] = useState('');
  const [template, setTemplate] = useState('summary');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addNotification } = useToastsContext();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await generateStructuredResponse(
        prompt,
        template,
        (error) => {
          // Show error toast notification
          const toast = createErrorToast(error);
          addNotification(toast);
        }
      );

      setResult(response);

      // Show warning if fallback values were used
      if (response.parseWarning) {
        addNotification({
          id: `parse-warning-${Date.now()}`,
          type: 'warning',
          message: 'AI response was incomplete, some default values were used',
          dismissTime: 6000
        });
      }
    } catch (error) {
      console.error('JSON generation failed:', error);
      addNotification({
        id: `json-error-${Date.now()}`,
        type: 'error',
        message: 'Failed to generate structured response',
        dismissTime: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h3>Gemini JSON API Example</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          Template:
          <select 
            value={template} 
            onChange={(e) => setTemplate(e.target.value)}
            style={{ marginLeft: '10px' }}
          >
            <option value="summary">Summary</option>
            <option value="metadata">Metadata</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>
          Prompt:
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter text to analyze..."
            style={{ 
              width: '100%', 
              height: '100px', 
              marginTop: '10px',
              padding: '10px' 
            }}
          />
        </label>
      </div>

      <button 
        onClick={handleGenerate} 
        disabled={loading || !prompt.trim()}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Generating...' : 'Generate JSON'}
      </button>

      {result && (
        <div style={{ marginTop: '20px' }}>
          <h4>Result:</h4>
          <div style={{
            backgroundColor: result.success ? '#f8f9fa' : '#ffe6e6',
            padding: '15px',
            borderRadius: '4px',
            border: `1px solid ${result.success ? '#dee2e6' : '#ffcccc'}`
          }}>
            <div>
              <strong>Success:</strong> {result.success ? 'Yes' : 'No'}
            </div>
            
            {result.parseWarning && (
              <div style={{ color: '#ff6600', marginTop: '5px' }}>
                <strong>Warning:</strong> {result.parseWarning.message}
              </div>
            )}
            
            <div style={{ marginTop: '10px' }}>
              <strong>Data:</strong>
              <pre style={{ 
                backgroundColor: '#f1f3f4', 
                padding: '10px', 
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px'
              }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonExample;