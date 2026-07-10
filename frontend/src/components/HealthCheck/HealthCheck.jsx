import { useEffect, useState } from 'react';
import healthService from '../../services/healthService';
import Card from '../Card/Card';

/**
 * TEMPORARY component (S1-RON-02).
 *
 * Calls GET /api/health through the service layer and renders the result so
 * you can confirm the frontend is talking to the configured backend. It also
 * logs the outcome to the browser console.
 *
 * REMOVE once the connection is verified: delete this folder and the block that
 * renders <HealthCheck /> in src/pages/Storefront.jsx.
 */
function HealthCheck() {
  const [state, setState] = useState({ status: 'loading', detail: null });

  useEffect(() => {
    let active = true;

    healthService
      .check()
      .then((data) => {
        if (!active) return;
        console.log('[HealthCheck] backend responded:', data);
        setState({ status: 'ok', detail: JSON.stringify(data) });
      })
      .catch((err) => {
        if (!active) return;
        // Errors arrive already normalized to { message } by the api interceptor.
        console.error('[HealthCheck] backend error:', err.message);
        setState({ status: 'error', detail: err.message });
      });

    return () => {
      active = false;
    };
  }, []);

  const label =
    state.status === 'loading'
      ? 'Checking backend…'
      : state.status === 'ok'
        ? `Backend reachable ✓  (${state.detail})`
        : `Backend error ✗  (${state.detail})`;

  return (
    <Card title="Backend health (temporary)">
      <p style={{ margin: 0 }} data-testid="health-status">
        {label}
      </p>
    </Card>
  );
}

export default HealthCheck;
