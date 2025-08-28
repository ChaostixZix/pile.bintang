import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './OAuthCallback.module.scss';

function OAuthCallback() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setStatus('Processing OAuth callback...');
        
        // Check if we have OAuth parameters in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const code = urlParams.get('code') || hashParams.get('code');
        const error = urlParams.get('error') || hashParams.get('error');
        const accessToken = hashParams.get('access_token');
        
        console.log('OAuth callback params:', {
          hasCode: !!code,
          hasError: !!error,
          hasAccessToken: !!accessToken,
          url: window.location.href
        });
        
        if (error) {
          console.error('OAuth error in callback:', error);
          setStatus('Authentication failed: ' + error);
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }
        
        if (code || accessToken) {
          setStatus('Exchanging authorization code for session...');
          
          // Let Supabase handle the callback - it should detect the URL automatically
          const { supabase } = await import('../../lib/supabase');
          
          // Trigger session detection
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          console.log('Session detection result:', { sessionData, sessionError });
          
          if (!sessionData?.session && code) {
            // If session detection failed, try manual code exchange
            console.log('Manual code exchange attempt...');
            const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (exchangeError) {
              console.error('Code exchange failed:', exchangeError);
              setStatus('Authentication failed: ' + exchangeError.message);
              setTimeout(() => navigate('/auth'), 3000);
              return;
            }
            
            console.log('Manual code exchange successful:', exchangeData);
          }
          
          // Wait a moment for auth state to propagate
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Check if we now have a user
        if (user) {
          setStatus('Authentication successful! Redirecting...');
          
          // Check for stored return URL
          const returnUrl = await window.electron?.store?.get('oauth_return_url');
          const destination = returnUrl || '/';
          
          // Clear the stored return URL
          if (returnUrl) {
            await window.electron?.store?.delete('oauth_return_url');
          }
          
          setTimeout(() => navigate(destination), 1500);
        } else if (!loading) {
          // Give it a bit more time if still loading
          setTimeout(async () => {
            const currentUser = await import('../../lib/supabase').then(m => m.supabase.auth.getUser());
            if (currentUser.data?.user) {
              setStatus('Authentication successful! Redirecting...');
              const returnUrl = await window.electron?.store?.get('oauth_return_url');
              const destination = returnUrl || '/';
              if (returnUrl) {
                await window.electron?.store?.delete('oauth_return_url');
              }
              navigate(destination);
            } else {
              setStatus('Authentication failed. Redirecting...');
              setTimeout(() => navigate('/auth'), 2000);
            }
          }, 2000);
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('Authentication failed: ' + error.message);
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    handleCallback();
  }, [user, loading, navigate]);

  return (
    <div className={styles.callbackContainer}>
      <div className={styles.backdrop} />
      <motion.div
        className={styles.content}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <div className={styles.spinner}>
          <div className={styles.dot1} />
          <div className={styles.dot2} />
          <div className={styles.dot3} />
        </div>
        <h2 className={styles.title}>Almost there...</h2>
        <p className={styles.status}>{status}</p>
      </motion.div>
    </div>
  );
}

export default OAuthCallback;
