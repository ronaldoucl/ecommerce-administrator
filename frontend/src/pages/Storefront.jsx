import { Link } from 'react-router-dom';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';

/**
 * Public landing page listing products. Placeholder content for S1-RON-01;
 * real product data is wired in a later ticket.
 */
function Storefront() {
  return (
    <section>
      <h1>Storefront</h1>
      <p>Browse our catalog. This is a placeholder page.</p>

      <Card title="Sample product">
        <p>Product details will be loaded from the API in a future ticket.</p>
        <Link to="/product/1">
          <Button>View product</Button>
        </Link>
      </Card>
    </section>
  );
}

export default Storefront;
