import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorMessage from './ErrorMessage';

describe('ErrorMessage Component', () => {
  test('does not render when no message or details provided', () => {
    const { container } = render(<ErrorMessage message="" />);
    expect(container.firstChild).toBeNull();
  });

  test('renders with message', () => {
    render(<ErrorMessage message="An error occurred" />);
    
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  test('renders with title and message', () => {
    render(
      <ErrorMessage
        title="Error"
        message="Something went wrong"
      />
    );
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  test('renders with details array', () => {
    const details = [
      'Field "email" is required',
      'Field "password" must be at least 8 characters',
    ];

    render(<ErrorMessage message="Validation failed" details={details} />);
    
    expect(screen.getByText('Validation failed')).toBeInTheDocument();
    expect(screen.getByText('Field "email" is required')).toBeInTheDocument();
    expect(screen.getByText('Field "password" must be at least 8 characters')).toBeInTheDocument();
  });

  test('renders only details without message', () => {
    const details = ['Error 1', 'Error 2'];

    render(<ErrorMessage details={details} />);
    
    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.getByText('Error 2')).toBeInTheDocument();
  });

  test('renders dismiss button when onDismiss is provided', () => {
    const mockOnDismiss = jest.fn();

    render(
      <ErrorMessage
        message="Error message"
        onDismiss={mockOnDismiss}
      />
    );
    
    const dismissButton = screen.getByLabelText('Dismiss');
    expect(dismissButton).toBeInTheDocument();
  });

  test('calls onDismiss when dismiss button is clicked', () => {
    const mockOnDismiss = jest.fn();

    render(
      <ErrorMessage
        message="Error message"
        onDismiss={mockOnDismiss}
      />
    );
    
    const dismissButton = screen.getByLabelText('Dismiss');
    fireEvent.click(dismissButton);
    
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  test('does not render dismiss button when onDismiss is not provided', () => {
    render(<ErrorMessage message="Error message" />);
    
    expect(screen.queryByLabelText('Dismiss')).not.toBeInTheDocument();
  });

  test('applies error variant styling (default)', () => {
    const { container } = render(
      <ErrorMessage message="Error" variant="error" />
    );
    
    const alertDiv = container.querySelector('.bg-red-50');
    expect(alertDiv).toBeInTheDocument();
  });

  test('applies warning variant styling', () => {
    const { container } = render(
      <ErrorMessage message="Warning" variant="warning" />
    );
    
    const alertDiv = container.querySelector('.bg-yellow-50');
    expect(alertDiv).toBeInTheDocument();
  });

  test('applies info variant styling', () => {
    const { container } = render(
      <ErrorMessage message="Info" variant="info" />
    );
    
    const alertDiv = container.querySelector('.bg-blue-50');
    expect(alertDiv).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(
      <ErrorMessage
        message="Error"
        className="my-custom-class"
      />
    );
    
    const alertDiv = container.querySelector('.my-custom-class');
    expect(alertDiv).toBeInTheDocument();
  });

  test('renders alert icon', () => {
    const { container } = render(<ErrorMessage message="Error" />);
    
    // Check for icon container
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  test('has proper role attribute', () => {
    render(<ErrorMessage message="Error occurred" />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  test('renders multiple details as list items', () => {
    const details = ['Error 1', 'Error 2', 'Error 3'];

    const { container } = render(
      <ErrorMessage message="Multiple errors" details={details} />
    );
    
    const listItems = container.querySelectorAll('li');
    expect(listItems).toHaveLength(3);
  });

  test('renders with all props combined', () => {
    const mockOnDismiss = jest.fn();
    const details = ['Detail 1', 'Detail 2'];

    render(
      <ErrorMessage
        title="Validation Error"
        message="Please fix the following issues:"
        details={details}
        variant="warning"
        onDismiss={mockOnDismiss}
        className="custom-error"
      />
    );
    
    expect(screen.getByText('Validation Error')).toBeInTheDocument();
    expect(screen.getByText('Please fix the following issues:')).toBeInTheDocument();
    expect(screen.getByText('Detail 1')).toBeInTheDocument();
    expect(screen.getByText('Detail 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
  });

  test('error variant has correct text colors', () => {
    const { container } = render(
      <ErrorMessage
        title="Error Title"
        message="Error message"
        variant="error"
      />
    );
    
    const title = screen.getByText('Error Title');
    expect(title).toHaveClass('text-red-800');
  });

  test('warning variant has correct text colors', () => {
    const { container } = render(
      <ErrorMessage
        title="Warning Title"
        message="Warning message"
        variant="warning"
      />
    );
    
    const title = screen.getByText('Warning Title');
    expect(title).toHaveClass('text-yellow-800');
  });

  test('info variant has correct text colors', () => {
    const { container } = render(
      <ErrorMessage
        title="Info Title"
        message="Info message"
        variant="info"
      />
    );
    
    const title = screen.getByText('Info Title');
    expect(title).toHaveClass('text-blue-800');
  });
});
