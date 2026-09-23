import type { HTMLAttributes, ReactNode } from 'react';
import './Card.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'interactive';
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Card({
  variant,
  hoverable,
  padding = 'md',
  className,
  children,
  ...rest
}: CardProps) {
  const resolvedVariant = variant || (hoverable ? 'interactive' : 'default');

  return (
    <div
      className={`bezent-card bezent-card--${resolvedVariant} ${hoverable ? 'bezent-card--hoverable' : ''} bezent-card--padding-${padding} ${className || ''}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bezent-card__header ${className || ''}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`bezent-card__title ${className || ''}`.trim()} {...rest}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`bezent-card__desc ${className || ''}`.trim()} {...rest}>
      {children}
    </p>
  );
}

export function CardIcon({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bezent-card__icon ${className || ''}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bezent-card__body ${className || ''}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bezent-card__footer ${className || ''}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export default Card;
