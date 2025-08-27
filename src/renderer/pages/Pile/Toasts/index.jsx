import { useToastsContext } from 'renderer/context/ToastsContext';
import Logo from 'renderer/pages/Home/logo';
import { AnimatePresence } from 'framer-motion';
import Toast from './Toast';
import styles from './Toasts.module.scss';

export default function Toasts() {
  const { notifications, addNotification } = useToastsContext();

  const renderNotifications = () => {
    if (notifications.length === 0) return;

    return notifications.map((n, i) => {
      if (i == 0) {
        return <Toast key={n.id} notification={n} />;
      }
    });
  };

  return (
    <div className={styles.container}>
      <AnimatePresence mode="wait">{renderNotifications()}</AnimatePresence>
    </div>
  );
}
