import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';

/**
 * Admin products management page. Placeholder content for S1-RON-01.
 */
function Products() {
  return (
    <section>
      <h1>Products</h1>
      <p>Create, edit and remove products. This is a placeholder page.</p>

      <Card title="Product list">
        <p>The product table with CRUD actions will be implemented here.</p>
        <Button>Add product</Button>
      </Card>
    </section>
  );
}

export default Products;
