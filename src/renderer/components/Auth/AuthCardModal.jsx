import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthForm from './AuthForm';
import createStyles from 'renderer/pages/CreatePile/CreatePile.module.scss';
import styles from './AuthCardModal.module.scss';

export default function AuthCardModal({ open, mode = 'signin', onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            className={styles.cardWrap}
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <div className={createStyles.card}>
              <AuthForm embedded initialMode={mode === 'signup'} onSuccess={onClose} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

