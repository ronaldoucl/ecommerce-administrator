import { useParams, Link } from 'react-router-dom';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';

/**
 * Public product detail page. Reads the product id from the route params.
 * Placeholder content for S1-RON-01.
 */
function ProductDetail() {
  const { id } = useParams();

  return (
    <section>
      <h1>Product detail</h1>
      <p>Showing placeholder details for product #{id}.</p>

      <Card title={`Product #${id}`}>
        <p>Description, price and images will be loaded from the API later.</p>
        <Link to="/cart">
          <Button>Add to cart</Button>
        </Link>
      </Card>
    </section>
  );
}

export default ProductDetail;
