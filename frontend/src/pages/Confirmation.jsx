import { Link } from 'react-router-dom';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';

/**
 * Order confirmation page shown after a successful checkout.
 * Placeholder content for S1-RON-01.
 */
function Confirmation() {
  return (
    <section>
      <h1>Order confirmed</h1>
      <p>Thank you for your purchase! This is a placeholder page.</p>

      <Card title="What's next?">
        <p>Your order number and details will be shown here.</p>
        <Link to="/">
          <Button variant="secondary">Continue shopping</Button>
        </Link>
      </Card>
    </section>
  );
}

export default Confirmation;
