import React, { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { useAIContext } from 'renderer/context/AIContext';
import {
  usePilesContext,
  availableThemes,
} from 'renderer/context/PilesContext';
import { BoxOpenIcon } from 'renderer/icons';
import { useIndexContext } from 'renderer/context/IndexContext';
import styles from './AISettingTabs.module.scss';

export default function AISettingTabs({ APIkey, setCurrentKey }) {
  const {
    prompt,
    setPrompt,
    updateSettings,
    setBaseUrl,
    getKey,
    setKey,
    deleteKey,
    model,
    setModel,
    pileAIProvider,
    setPileAIProvider,
    useMockAI,
    setUseMockAI,
  } = useAIContext();

  const { currentTheme, setTheme } = usePilesContext();

  const handleTabChange = (newValue) => {
    setPileAIProvider(newValue);
  };

  const handleInputChange = (setter) => (e) => setter(e.target.value);

  const renderThemes = () => {
    return Object.entries(availableThemes).map(([theme, colors]) => (
      <button
        key={`theme-${theme}`}
        className={`${styles.theme} ${
          currentTheme === theme ? styles.current : ''
        }`}
        onClick={() => setTheme(theme)}
      >
        <div className={styles.color1} style={{ background: colors.primary }} />
      </button>
    ));
  };

  return (
    <Tabs.Root
      className={styles.tabsRoot}
      defaultValue="gemini"
      value={pileAIProvider}
      onValueChange={handleTabChange}
    >
      <Tabs.List className={styles.tabsList} aria-label="Manage your account">
        <Tabs.Trigger
          className={`${styles.tabsTrigger}`}
          value="gemini"
        >
          Gemini API
          <BoxOpenIcon className={styles.icon} />
        </Tabs.Trigger>
      </Tabs.List>



      <Tabs.Content className={styles.tabsContent} value="gemini">
        <div className={styles.providers}>
          <div className={styles.pitch}>
            Create an API key in your Google AI Studio account and paste it here
            to start using Gemini AI models in Pile.
          </div>

          <div className={styles.group}>
            <fieldset className={styles.fieldset}>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  checked={useMockAI}
                  onChange={(e) => setUseMockAI(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                Use Mock AI (for testing)
              </label>
            </fieldset>
            
            <fieldset className={styles.fieldset}>
              <label className={styles.label} htmlFor="gemini-model">
                Model
              </label>
              <select
                id="gemini-model"
                className={styles.input}
                onChange={handleInputChange(setModel)}
                value={model}
                disabled={useMockAI}
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash (Fast & Efficient - Recommended)</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro (Most Powerful with Thinking)</option>
                <option value="gemini-2.5-flash-lite-preview-06-17">gemini-2.5-flash-lite (Low Cost & High Speed)</option>
              </select>
            </fieldset>
          </div>
          <fieldset className={styles.fieldset}>
            <label className={styles.label} htmlFor="gemini-api-key">
              Gemini API key
            </label>
            <input
              id="gemini-api-key"
              className={styles.input}
              onChange={handleInputChange(setCurrentKey)}
              value={APIkey}
              placeholder="Paste a Gemini API key to enable AI reflections"
            />
          </fieldset>
          <div className={styles.disclaimer}>
            Get your free Gemini API key from Google AI Studio. Remember to
            monitor your usage and set up quotas as needed.
          </div>
        </div>
      </Tabs.Content>
    </Tabs.Root>
  );
}
