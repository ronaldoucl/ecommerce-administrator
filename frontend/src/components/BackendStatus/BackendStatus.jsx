import { useEffect, useState } from 'react';
import healthService from '../../services/healthService';
import styles from './BackendStatus.module.css';

/**
 * TEMPORARY backend connectivity indicator (Sprint 1 / S1-SHARED-04).
 *
 * Calls GET /api/health through the service layer (base URL from VITE_API_URL)
 * to confirm the deployed frontend can reach the deployed backend, and shows
 * the result as a colored dot + label: OK / ERROR (neutral while checking).
 *
 * This is a temporary end-to-end check and will be removed after Sprint 1
 * (delete this component and the block that renders it in Storefront.jsx).
 */
function BackendStatus() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'ok' | 'error'

  useEffect(() => {
    let active = true;

    healthService
      .check()
      .then((data) => {
        if (!active) return;
        console.log('[BackendStatus] backend responded:', data);
        setStatus('ok');
      })
      .catch((err) => {
        if (!active) return;
        // Errors arrive already normalized to { message } by the api interceptor.
        console.error('[BackendStatus] backend error:', err.message);
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  const label =
    status === 'checking' ? 'Checking…' : status === 'ok' ? 'OK' : 'ERROR';

  return (
    <span className={styles.wrap} role="status" aria-live="polite">
      <span className={`${styles.dot} ${styles[status]}`} aria-hidden="true" />
      Backend status: {label}
    </span>
  );
}

export default BackendStatus;
