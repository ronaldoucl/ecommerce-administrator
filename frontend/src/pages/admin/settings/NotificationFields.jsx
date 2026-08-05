import styles from '../Settings.module.css';

// The "email customers when their order status changes" switch.
//
// It stays disabled until the server says it can actually send email
// (emailConfigured), otherwise we would be promising emails that never arrive.
function NotificationFields({ form, setField, isSaving, emailConfigured }) {
  return (
    <fieldset className={styles.fieldset} disabled={isSaving}>
      <legend className={styles.legend}>Notifications</legend>

      <label className={styles.checkboxField} htmlFor="emailEnabled">
        <input
          id="emailEnabled"
          className={styles.checkbox}
          type="checkbox"
          checked={form.emailEnabled}
          onChange={(event) => setField('emailEnabled', event.target.checked)}
          disabled={!emailConfigured}
          aria-describedby="emailEnabled-hint"
        />
        Email customers when their order status changes
      </label>

      <span className={styles.hint} id="emailEnabled-hint">
        {emailConfigured
          ? 'The customer is notified on every status change. With this off the status change still happens — the customer is simply not emailed.'
          : 'Unavailable: the server has no email sender configured. Set BREVO_API_KEY and MAIL_FROM_EMAIL in the backend environment, then restart the backend.'}
      </span>
    </fieldset>
  );
}

export default NotificationFields;
