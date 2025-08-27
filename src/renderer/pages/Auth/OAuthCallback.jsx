import React, { useEffect, useState } from 'react';
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
        // Give some time for auth state to update
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (user) {
          setStatus('Authentication successful! Redirecting...');
          // Redirect to home page after successful auth
          setTimeout(() => {
            navigate('/');
          }, 1500);
        } else if (!loading) {
          setStatus('Authentication failed. Redirecting...');
          setTimeout(() => {
            navigate('/auth');
          }, 2000);
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('Authentication failed. Redirecting...');
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      }
    };

    handleCallback();
  }, [user, loading, navigate]);

  return (
    <div className={styles.callbackContainer}>
      <div className={styles.content}>
        <div className={styles.spinner}>
          <div className={styles.dot1} />
          <div className={styles.dot2} />
          <div className={styles.dot3} />
        </div>
        <h2 className={styles.title}>Almost there...</h2>
        <p className={styles.status}>{status}</p>
      </div>
    </div>
  );
}

export default OAuthCallback;
