import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FormInput from './FormInput';
import { FiUser } from 'react-icons/fi';

describe('FormInput Component', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  test('renders input with label', () => {
    render(
      <FormInput
        label="Username"
        name="username"
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('renders input without label', () => {
    render(
      <FormInput
        name="username"
        value=""
        onChange={mockOnChange}
        placeholder="Enter username"
      />
    );

    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
  });

  test('displays required asterisk when required prop is true', () => {
    render(
      <FormInput
        label="Email"
        name="email"
        value=""
        onChange={mockOnChange}
        required
      />
    );

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  test('renders with icon', () => {
    const { container } = render(
      <FormInput
        label="Username"
        name="username"
        value=""
        onChange={mockOnChange}
        icon={<FiUser data-testid="user-icon" />}
      />
    );

    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
  });

  test('handles value changes', () => {
    render(
      <FormInput
        label="Username"
        name="username"
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'testuser' } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  test('displays error message when error prop is provided', () => {
    render(
      <FormInput
        label="Email"
        name="email"
        value=""
        onChange={mockOnChange}
        error="Email is required"
      />
    );

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  test('applies error styling when error is present', () => {
    render(
      <FormInput
        label="Email"
        name="email"
        value=""
        onChange={mockOnChange}
        error="Invalid email"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  test('renders disabled input', () => {
    render(
      <FormInput
        label="Username"
        name="username"
        value="disabled"
        onChange={mockOnChange}
        disabled
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  test('renders different input types', () => {
    const { rerender } = render(
      <FormInput
        label="Email"
        name="email"
        type="email"
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');

    rerender(
      <FormInput
        label="Password"
        name="password"
        type="password"
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  test('applies custom className', () => {
    render(
      <FormInput
        label="Username"
        name="username"
        value=""
        onChange={mockOnChange}
        className="custom-class"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  test('passes additional input props', () => {
    render(
      <FormInput
        label="Age"
        name="age"
        type="number"
        value=""
        onChange={mockOnChange}
        min="0"
        max="100"
      />
    );

    const input = screen.getByLabelText('Age');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
  });

  test('renders with placeholder', () => {
    render(
      <FormInput
        label="Username"
        name="username"
        value=""
        onChange={mockOnChange}
        placeholder="Enter your username"
      />
    );

    expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument();
  });

  test('clears error message when error prop is removed', () => {
    const { rerender } = render(
      <FormInput
        label="Email"
        name="email"
        value=""
        onChange={mockOnChange}
        error="Email is required"
      />
    );

    expect(screen.getByText('Email is required')).toBeInTheDocument();

    rerender(
      <FormInput
        label="Email"
        name="email"
        value="test@example.com"
        onChange={mockOnChange}
      />
    );

    expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
  });
});
