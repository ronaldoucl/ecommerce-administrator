import styles from './Button.module.css';

/**
 * Reusable button.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'} [props.variant='primary'] - Visual style.
 * @param {'button'|'submit'|'reset'} [props.type='button'] - Native button type.
 * @param {React.ReactNode} props.children - Button label / content.
 */
function Button({ variant = 'primary', type = 'button', className = '', children, ...rest }) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}

export default Button;
