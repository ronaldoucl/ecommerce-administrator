import { useEffect, useState } from 'react';
import healthService from '../../services/healthService';
import styles from './BackendStatus.module.css';

/**
 * Permanent backend connectivity indicator, rendered in the footer.
 *
 * Calls GET /api/health through the service layer (base URL from
 * VITE_API_URL) and shows the result as a colored dot + label:
 *   - checking  → neutral
 *   - ok        → the backend responded
 *   - error     → the backend is unreachable / errored
 */
function BackendStatus() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'ok' | 'error'

  useEffect(() => {
    let active = true;

    healthService
      .check()
      .then(() => {
        if (active) setStatus('ok');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  const label =
    status === 'checking' ? 'Checking…' : status === 'ok' ? 'OK' : 'Unavailable';

  return (
    <span className={styles.wrap} role="status" aria-live="polite">
      <span className={`${styles.dot} ${styles[status]}`} aria-hidden="true" />
      Backend status: {label}
    </span>
  );
}

export default BackendStatus;
