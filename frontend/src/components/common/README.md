# Shared Form Components

This directory contains reusable form components that provide consistent styling, validation, and user experience across the application.

## Components

### FormInput

A reusable form input component with label, validation, and error display.

**Props:**
- `label` (string): The label text for the input
- `name` (string, required): The name attribute for the input
- `type` (string): The input type (text, email, password, number, date, etc.) - default: 'text'
- `value` (string|number, required): The current value of the input
- `onChange` (function, required): Handler function for value changes
- `error` (string): Error message to display (if any)
- `required` (boolean): Whether the field is required - default: false
- `placeholder` (string): Placeholder text
- `disabled` (boolean): Whether the input is disabled - default: false
- `icon` (ReactNode): Optional icon to display before the label
- `className` (string): Additional CSS classes for the input
- Additional props are passed through to the input element

**Example:**
```jsx
import { FormInput } from '../../components/common';
import { FiMail } from 'react-icons/fi';

function MyForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  return (
    <FormInput
      label="Email Address"
      name="email"
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      error={error}
      required
      placeholder="Enter your email"
      icon={<FiMail />}
    />
  );
}
```

---

### LoadingSpinner

A reusable loading spinner component with customizable size, color, and display options.

**Props:**
- `size` (string): Size of the spinner - 'sm', 'md', 'lg', 'xl' - default: 'md'
- `color` (string): Color variant - 'primary', 'white', 'gray' - default: 'primary'
- `text` (string): Optional loading text to display below spinner
- `fullScreen` (boolean): Whether to display as full-screen overlay - default: false
- `className` (string): Additional CSS classes

**Example:**
```jsx
import { LoadingSpinner } from '../../components/common';

function MyComponent() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading data..." />;
  }

  // Or as full-screen overlay
  return (
    <div>
      {loading && <LoadingSpinner fullScreen text="Processing..." />}
      {/* Your content */}
    </div>
  );
}
```

---

### ConfirmDialog

A reusable confirmation dialog modal component for confirming destructive or important actions.

**Props:**
- `isOpen` (boolean, required): Whether the dialog is open
- `onClose` (function, required): Handler for closing the dialog
- `onConfirm` (function, required): Handler for confirming the action
- `title` (string): Dialog title - default: 'Confirm Action'
- `message` (string): Dialog message/description - default: 'Are you sure you want to proceed?'
- `confirmText` (string): Text for the confirm button - default: 'Confirm'
- `cancelText` (string): Text for the cancel button - default: 'Cancel'
- `variant` (string): Visual variant - 'danger', 'warning', 'info' - default: 'warning'
- `loading` (boolean): Whether the confirm action is in progress - default: false
- `children` (ReactNode): Optional custom content to display in the dialog body

**Example:**
```jsx
import { ConfirmDialog } from '../../components/common';

function MyComponent() {
  const [showDialog, setShowDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteItem();
      setShowDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <button onClick={() => setShowDialog(true)}>Delete</button>
      
      <ConfirmDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onConfirm={handleDelete}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />
    </>
  );
}
```

**With Custom Content:**
```jsx
<ConfirmDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  onConfirm={handleReject}
  title="Reject Quotation"
  variant="warning"
>
  <div>
    <p className="text-sm text-gray-500 mb-3">
      Please provide a reason for rejection:
    </p>
    <textarea
      value={reason}
      onChange={(e) => setReason(e.target.value)}
      className="input"
      rows="4"
      placeholder="Enter rejection reason..."
    />
  </div>
</ConfirmDialog>
```

---

### ErrorMessage

A reusable error message component for displaying errors, warnings, and informational messages.

**Props:**
- `message` (string): The error message to display
- `title` (string): Optional title for the error
- `onDismiss` (function): Optional handler for dismissing the error
- `variant` (string): Visual variant - 'error', 'warning', 'info' - default: 'error'
- `className` (string): Additional CSS classes
- `details` (Array<string>): Optional array of detailed error messages

**Example:**
```jsx
import { ErrorMessage } from '../../components/common';

function MyForm() {
  const [error, setError] = useState('');

  return (
    <form>
      {error && (
        <ErrorMessage
          message={error}
          onDismiss={() => setError('')}
          variant="error"
        />
      )}
      {/* Form fields */}
    </form>
  );
}
```

**With Details:**
```jsx
<ErrorMessage
  title="Validation Failed"
  message="Please fix the following errors:"
  variant="error"
  details={[
    'Email is required',
    'Password must be at least 8 characters',
    'Phone number is invalid'
  ]}
  onDismiss={() => setErrors([])}
/>
```

**As Warning:**
```jsx
<ErrorMessage
  title="Warning"
  message="This quotation has not been approved yet."
  variant="warning"
/>
```

**As Info:**
```jsx
<ErrorMessage
  title="Information"
  message="Your changes have been saved as a draft."
  variant="info"
/>
```

---

## Usage Tips

1. **Import from index**: Use the barrel export for cleaner imports:
   ```jsx
   import { FormInput, LoadingSpinner, ConfirmDialog, ErrorMessage } from '../../components/common';
   ```

2. **Consistent Styling**: All components use Tailwind CSS classes and support dark mode automatically.

3. **Accessibility**: All components include proper ARIA attributes and keyboard navigation support.

4. **Form Validation**: Use `FormInput` with error messages for inline validation feedback.

5. **Loading States**: Use `LoadingSpinner` during async operations to provide user feedback.

6. **Confirmations**: Always use `ConfirmDialog` for destructive actions (delete, reject, etc.).

7. **Error Handling**: Use `ErrorMessage` to display API errors, validation errors, or user notifications.

## Testing

All components have comprehensive unit tests. Run tests with:
```bash
npm test -- --testPathPattern="components/common"
```

## Requirements

These components satisfy the following requirements:
- **Requirement 10.1**: Form validation and error handling
- **Requirement 10.2**: Inline validation errors
- **Requirement 18.1**: Loading states and indicators
- **Requirement 11.1-11.6**: Confirmation dialogs for destructive actions
