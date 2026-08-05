import styles from './Button.module.css';

/**
 * Reusable button.
 *
 * Polymorphic: renders a native <button> by default, but can render any other
 * element/component via the `as` prop (e.g. `as={Link}` or `as="a"`) so a
 * link can look like a button without nesting interactive elements.
 *
 * @param {object} props
 * @param {React.ElementType} [props.as='button'] - Element/component to render.
 * @param {'primary'|'secondary'|'ghost'|'danger'} [props.variant='primary'] - Visual style.
 * @param {'button'|'submit'|'reset'} [props.type] - Native button type (only when rendering a <button>).
 * @param {React.ReactNode} props.children - Button label / content.
 */
function Button({ as: Component = 'button', variant = 'primary', type, className = '', children, ...rest }) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ');

  // `type` only applies to a real <button>; default it to "button" there.
  const typeProp = Component === 'button' ? { type: type || 'button' } : {};

  return (
    <Component className={classes} {...typeProp} {...rest}>
      {children}
    </Component>
  );
}

export default Button;
