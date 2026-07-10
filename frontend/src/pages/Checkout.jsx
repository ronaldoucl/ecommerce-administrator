import { Link } from 'react-router-dom';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';

/**
 * Checkout page. Placeholder content for S1-RON-01; the checkout form and
 * order submission are implemented in a future ticket.
 */
function Checkout() {
  return (
    <section>
      <h1>Checkout</h1>
      <p>Enter your shipping and payment details. This is a placeholder page.</p>

      <Card title="Checkout form">
        <p>The checkout form will be implemented here.</p>
        <Link to="/confirmation">
          <Button>Place order</Button>
        </Link>
      </Card>
    </section>
  );
}

export default Checkout;
