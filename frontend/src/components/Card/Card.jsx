import styles from './Card.module.css';

// A white panel to group related content, with an optional heading.
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
