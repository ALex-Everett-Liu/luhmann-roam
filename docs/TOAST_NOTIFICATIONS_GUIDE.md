# Toast Notifications Guide: Replacing `alert()` in Electron Apps

## 🚨 Critical Issue: Why `alert()` is Dangerous in Electron

### The Windows Focus Bug

**This is a notorious bug in Electron that has existed for years**, affecting all Electron applications on Windows. When you use `alert()`, `confirm()`, or `prompt()`, you trigger a focus loss bug that can make your application unusable.

### What Happens

1. **Synchronous Blocking**: `alert()`, `confirm()`, and `prompt()` are **synchronous** and **blocking** - they freeze JavaScript execution until the user clicks a button.

2. **Native Dialog**: Electron uses Chromium, which creates a native Windows system dialog when these functions are called.

3. **Focus Loss**: When the native dialog closes on Windows, Chromium's focus state machine fails to reset properly. The OS thinks focus is restored, but Chromium's internal input state thinks the window is still in the background.

4. **Result**: The window stops accepting keyboard and mouse input, making your application effectively broken until restart.

### Why Nobody Warns You

- In pure web development, `alert()` is ugly but safe
- In Electron, it's a desktop app running on an OS - synchronous blocking operations are problematic by design
- Combined with Windows-specific focus management bugs, this creates a critical issue

## ✅ Solution: Use `showToast()` Instead

### Why `showToast()` is Better

1. ✅ **Non-blocking**: Asynchronous, doesn't freeze the UI
2. ✅ **No focus issues**: Uses DOM manipulation, not native dialogs
3. ✅ **Better UX**: Modern, styled notifications that don't interrupt workflow
4. ✅ **Auto-dismiss**: Automatically disappears after a few seconds
5. ✅ **Stackable**: Multiple notifications can appear simultaneously
6. ✅ **Customizable**: Supports different types (success, error, warning, info)

## 📖 How to Use `showToast()`

### Basic Usage

```javascript
// Simple success message
showToast('Operation completed successfully', 'success');

// Error message
showToast('Failed to save changes', 'error');

// Warning message
showToast('This action cannot be undone', 'warning');

// Info message (default)
showToast('Settings saved', 'info');
// or simply:
showToast('Settings saved');
```

### Available Types

- `'success'` - Green, checkmark icon
- `'error'` - Red, exclamation icon
- `'warning'` - Yellow/orange, warning icon
- `'info'` - Blue, info icon (default)

### Custom Duration

```javascript
// Show for 5 seconds instead of default 3 seconds
showToast('This message stays longer', 'info', 5000);

// Show for 1 second (quick notification)
showToast('Quick update', 'success', 1000);
```

## 🔄 Migration Guide: Replacing `alert()`

### Pattern 1: Simple Information Messages

**❌ Before:**
```javascript
alert('Settings saved successfully');
```

**✅ After:**
```javascript
showToast('Settings saved successfully', 'success');
```

### Pattern 2: Error Messages

**❌ Before:**
```javascript
alert('Failed to load data. Please try again.');
```

**✅ After:**
```javascript
showToast('Failed to load data. Please try again.', 'error');
```

### Pattern 3: Multi-line Messages

**❌ Before:**
```javascript
alert(
  'API is not responding.\n\n' +
  'Please make sure the server is running.\n\n' +
  `Error: ${error.message}`
);
```

**✅ After:**
```javascript
showToast(
  `API is not responding. Please make sure the server is running. Error: ${error.message}`,
  'error',
  5000 // Longer duration for error messages
);
```

**Note**: For complex multi-line messages, consider using a custom modal dialog instead of toast.

## 🔄 Migration Guide: Replacing `confirm()`

### Pattern 1: Simple Confirmation

**❌ Before:**
```javascript
if (confirm('Are you sure you want to delete this item?')) {
  deleteItem();
}
```

**✅ After:**

You have two options:

**Option A: Use a custom modal dialog** (recommended for critical actions)
```javascript
// Create a custom confirmation modal
function showConfirmDialog(message, onConfirm, onCancel) {
  // Implementation depends on your UI framework
  // This is just a placeholder example
  const confirmed = window.confirm(message); // Temporary fallback
  if (confirmed) onConfirm();
  else if (onCancel) onCancel();
}

// Usage
showConfirmDialog(
  'Are you sure you want to delete this item?',
  () => deleteItem(),
  () => showToast('Deletion cancelled', 'info')
);
```

**Option B: Use a toast with undo** (for non-critical actions)
```javascript
deleteItem();
showToast('Item deleted', 'success', 5000);
// Provide an undo button in the UI if needed
```

### Pattern 2: Destructive Actions

**❌ Before:**
```javascript
if (confirm('Delete this node and all its children? This cannot be undone.')) {
  deleteNode(nodeId);
}
```

**✅ After:**

For critical destructive actions, use a proper modal dialog component, not a toast. Toasts are for **notifications**, not **confirmations**.

## 🚫 When NOT to Use `showToast()`

### Use Custom Modals For:

1. **Critical confirmations** (delete, overwrite, etc.)
2. **User input** (forms, text input)
3. **Complex multi-step dialogs**
4. **Actions that require immediate user decision**

### Use `showToast()` For:

1. ✅ Success/error notifications
2. ✅ Status updates
3. ✅ Non-critical information
4. ✅ Feedback after actions

## 📋 Implementation Checklist

When refactoring code that uses `alert()`, `confirm()`, or `prompt()`:

- [ ] Identify the purpose: notification or confirmation?
- [ ] If notification → replace with `showToast()`
- [ ] If confirmation → implement custom modal dialog
- [ ] Choose appropriate toast type (success/error/warning/info)
- [ ] Set appropriate duration (default 3000ms is usually fine)
- [ ] Test on Windows to ensure no focus issues
- [ ] Verify accessibility (screen readers, keyboard navigation)

## 🎯 Best Practices

### 1. Choose the Right Type

```javascript
// ✅ Good
showToast('File uploaded successfully', 'success');
showToast('Invalid file format', 'error');
showToast('Low disk space', 'warning');
showToast('Processing your request', 'info');

// ❌ Bad - wrong type
showToast('File uploaded successfully', 'error'); // Should be 'success'
```

### 2. Keep Messages Concise

```javascript
// ✅ Good - clear and concise
showToast('Settings saved', 'success');

// ❌ Bad - too verbose for a toast
showToast('Your settings have been successfully saved to the database and will be applied immediately. Thank you for using our application.', 'success');
```

### 3. Use Appropriate Duration

```javascript
// ✅ Good - longer for important errors
showToast('Failed to connect to server', 'error', 5000);

// ✅ Good - shorter for quick success
showToast('Copied to clipboard', 'success', 2000);

// ✅ Good - default for most cases
showToast('Operation completed', 'success');
```

### 4. Don't Overuse Toasts

```javascript
// ❌ Bad - too many toasts
for (let i = 0; i < 100; i++) {
  showToast(`Processing item ${i}`, 'info');
}

// ✅ Good - show summary toast
processItems();
showToast('Processed 100 items', 'success');
```

### 5. Handle Errors Properly

```javascript
// ✅ Good - show error toast
try {
  await saveData();
  showToast('Data saved', 'success');
} catch (error) {
  console.error('Save failed:', error);
  showToast(`Failed to save: ${error.message}`, 'error', 5000);
}
```

## 🔍 Finding `alert()` Usage in Your Codebase

### Search Commands

```bash
# Find all alert() calls
grep -r "alert\s*(" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"

# Find all confirm() calls
grep -r "confirm\s*(" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"

# Find all prompt() calls
grep -r "prompt\s*(" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"
```

### Common Patterns to Look For

1. **Simple alerts**: `alert('message')`
2. **Error alerts**: `alert('Error: ' + error.message)`
3. **Success alerts**: `alert('Success!')`
4. **Confirmations**: `if (confirm('...')) { ... }`
5. **User input**: `const input = prompt('Enter value:')`

## 📝 Code Examples

### Example 1: File Upload Feedback

**❌ Before:**
```javascript
async function uploadFile(file) {
  try {
    await uploadToServer(file);
    alert('File uploaded successfully!');
  } catch (error) {
    alert('Upload failed: ' + error.message);
  }
}
```

**✅ After:**
```javascript
async function uploadFile(file) {
  try {
    await uploadToServer(file);
    showToast('File uploaded successfully', 'success');
  } catch (error) {
    showToast(`Upload failed: ${error.message}`, 'error', 5000);
  }
}
```

### Example 2: API Error Handling

**❌ Before:**
```javascript
async function loadData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      alert('Failed to load data. Status: ' + response.status);
      return;
    }
    const data = await response.json();
    // process data
  } catch (error) {
    alert('Error: ' + error.message);
  }
}
```

**✅ After:**
```javascript
async function loadData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      showToast(`Failed to load data (Status: ${response.status})`, 'error');
      return;
    }
    const data = await response.json();
    // process data
    showToast('Data loaded successfully', 'success');
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error', 5000);
  }
}
```

### Example 3: Form Validation

**❌ Before:**
```javascript
function validateForm() {
  if (!email.value) {
    alert('Please enter your email');
    return false;
  }
  if (!password.value) {
    alert('Please enter your password');
    return false;
  }
  return true;
}
```

**✅ After:**
```javascript
function validateForm() {
  if (!email.value) {
    showToast('Please enter your email', 'warning');
    email.focus();
    return false;
  }
  if (!password.value) {
    showToast('Please enter your password', 'warning');
    password.focus();
    return false;
  }
  return true;
}
```

## 🛠️ Implementation Reference

### Current Implementation

The `showToast()` function is implemented as follows:

```javascript
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${getToastIcon(type)}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, duration);
}

function getToastIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}
```

### Required HTML Structure

```html
<div id="toastContainer" class="toast-container"></div>
```

### Required CSS

The toast container and toast styles should be defined in your CSS. See `plugins/image-viewer/styles.css` for reference implementation.

## 🎓 Summary

1. **Never use `alert()`, `confirm()`, or `prompt()` in Electron apps** - they cause focus bugs on Windows
2. **Use `showToast()` for notifications** - success, error, warning, info messages
3. **Use custom modals for confirmations** - critical actions that need user decision
4. **Keep messages concise** - toasts are for quick feedback, not essays
5. **Choose appropriate types and durations** - match the importance of the message

## 📚 Additional Resources

- [Electron Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Toast Notification Patterns](https://www.nngroup.com/articles/toast-notifications/)

---

**Remember**: Every `alert()` you replace makes your Electron app more stable and user-friendly. Take the time to refactor properly - your users (especially on Windows) will thank you!

