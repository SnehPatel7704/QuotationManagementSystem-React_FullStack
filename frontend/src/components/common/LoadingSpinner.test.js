import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner Component', () => {
  test('renders spinner with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders with custom text', () => {
    render(<LoadingSpinner text="Please wait..." />);
    
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  test('renders without text when not provided', () => {
    render(<LoadingSpinner />);
    
    // Should only have the sr-only "Loading..." text
    const loadingText = screen.getByText('Loading...');
    expect(loadingText).toHaveClass('sr-only');
  });

  test('applies small size class', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('h-4', 'w-4', 'border-2');
  });

  test('applies medium size class (default)', () => {
    const { container } = render(<LoadingSpinner size="md" />);
    
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('h-8', 'w-8', 'border-2');
  });

  test('applies large size class', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('h-12', 'w-12');
  });

  test('applies extra large size class', () => {
    const { container } = render(<LoadingSpinner size="xl" />);
    
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('h-16', 'w-16', 'border-4');
  });

  test('applies primary color class (default)', () => {
    const { container } = render(<LoadingSpinner color="primary" />);
    
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('border-primary-600');
  });

  test('applies white color class', () => {
    const { container } = render(<LoadingSpinner color="white" />);
    
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('border-white');
  });

  test('applies gray color class', () => {
    const { container } = render(<LoadingSpinner color="gray" />);
    
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('border-gray-600');
  });

  test('renders as full screen overlay when fullScreen is true', () => {
    const { container } = render(<LoadingSpinner fullScreen />);
    
    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('z-50');
  });

  test('does not render full screen overlay by default', () => {
    const { container } = render(<LoadingSpinner />);
    
    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).not.toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-spinner" />);
    
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('custom-spinner');
  });

  test('has animate-spin class for animation', () => {
    const { container } = render(<LoadingSpinner />);
    
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('animate-spin');
  });

  test('renders with all custom props combined', () => {
    const { container } = render(
      <LoadingSpinner
        size="lg"
        color="white"
        text="Loading data..."
        className="my-custom-class"
      />
    );
    
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toHaveClass('h-12', 'w-12', 'border-white', 'my-custom-class');
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  test('full screen spinner with text', () => {
    render(<LoadingSpinner fullScreen text="Processing your request..." />);
    
    expect(screen.getByText('Processing your request...')).toBeInTheDocument();
    const overlay = document.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();
  });
});
