import { Link } from 'react-router-dom';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';

/**
 * Shopping cart page. Placeholder content for S1-RON-01; cart state will be
 * provided by CartContext in a future ticket.
 */
function Cart() {
  return (
    <section>
      <h1>Cart</h1>
      <p>Your cart is empty. This is a placeholder page.</p>

      <Card title="Order summary">
        <p>Cart items and totals will appear here.</p>
        <Link to="/checkout">
          <Button>Proceed to checkout</Button>
        </Link>
      </Card>
    </section>
  );
}

export default Cart;
