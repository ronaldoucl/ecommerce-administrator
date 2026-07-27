import Card from '../../components/Card/Card';

/**
 * Admin settings page. Empty-state placeholder until Sprint 4, when store
 * configuration (store info, preferences, branding) will be implemented here.
 */
function Settings() {
  return (
    <section>
      <h1>Settings</h1>
      <p>Manage store configuration.</p>

      <Card>
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <p style={{ fontWeight: 'var(--font-weight-medium)' }}>Coming in Sprint 4</p>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
            Store information, preferences and branding options will live here.
          </p>
        </div>
      </Card>
    </section>
  );
}

export default Settings;
