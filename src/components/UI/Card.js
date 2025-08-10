import React from 'react';
import './Card.css';

const Card = ({ 
  children, 
  className = '', 
  padding = 'default',
  hover = false,
  shadow = 'default'
}) => {
  const cardClasses = [
    'card',
    `card-padding-${padding}`,
    `card-shadow-${shadow}`,
    hover ? 'card-hover' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses}>
      {children}
    </div>
  );
};

export default Card;
