import styles from './Card.module.css';

/**
 * Reusable surface container used to group related content.
 *
 * @param {object} props
 * @param {string} [props.title] - Optional heading rendered at the top of the card.
 * @param {React.ReactNode} props.children - Card body content.
 */
function Card({ title, className = '', children, ...rest }) {
  const classes = [styles.card, className].filter(Boolean).join(' ');

  return (
    <div className={classes} {...rest}>
      {title && <h3 className={styles.title}>{title}</h3>}
      {children}
    </div>
  );
}

export default Card;
