import styles from './Button.module.css';

// Our button. Renders a real <button> normally, but `as` lets it be something
// else (as={Link}, as="a") so a link can look like a button without putting a
// link inside a button.
//
// variant: primary | secondary | ghost | danger
function Button({ as: Component = 'button', variant = 'primary', type, className = '', children, ...rest }) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ');

  // Only a real <button> takes `type`, and we default it to "button" so it does
  // not accidentally submit a form.
  const typeProp = Component === 'button' ? { type: type || 'button' } : {};

  return (
    <Component className={classes} {...typeProp} {...rest}>
      {children}
    </Component>
  );
}

export default Button;
