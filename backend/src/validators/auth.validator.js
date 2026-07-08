// Validation for auth payloads.

// Returns true when the login body carries a non-empty email and password.
export function isValidLoginBody(body) {
  return (
    !!body &&
    typeof body.email === 'string' &&
    body.email.trim() !== '' &&
    typeof body.password === 'string' &&
    body.password !== ''
  );
}
