---
name: ui-component-library
description: Manages reusable UI components, buttons, navigation elements, ensuring consistency, accessibility, and maintainability across the OutreachGlobal platform
---

# UI Component Library

## Overview
Enhances the existing component library in `apps/front/src/components/` (334 components) to maintain a comprehensive, accessible, and consistent collection of reusable UI components including buttons, forms, navigation, modals, and interactive elements for the OutreachGlobal frontend.

## Key Features
- Centralized component registry with 334+ existing components
- Design system integration with consistent theming
- Accessibility-first component development
- Performance-optimized rendering patterns
- Comprehensive testing suite
- Storybook documentation integration
- Multi-tenant theming support

## Implementation Steps

### 1. Enhance Component Base Structure
Update `apps/front/src/components/common/BaseComponent.tsx`:

```typescript
--- a/apps/front/src/components/common/BaseComponent.tsx
+++ b/apps/front/src/components/common/BaseComponent.tsx
@@ -1,15 +1,25 @@
 import React, { useMemo, useCallback } from 'react';
 import { useTheme } from '@/hooks/useTheme';
 import { useTenant } from '@/hooks/useTenant';
+import { cn } from '@/lib/utils';
 
 interface BaseComponentProps {
   variant?: 'primary' | 'secondary' | 'danger';
   size?: 'sm' | 'md' | 'lg';
   disabled?: boolean;
   loading?: boolean;
   children?: React.ReactNode;
   className?: string;
 }
 
 export const BaseComponent: React.FC<BaseComponentProps> = React.memo(({
   variant = 'primary',
   size = 'md',
   disabled = false,
   loading = false,
   children,
   className,
   ...props
 }) => {
+  const { theme } = useTheme();
+  const { tenantId } = useTenant();
+
   const classes = useMemo(() => cn(
     'component',
     `component-${variant}`,
     `component-${size}`,
     `theme-${theme}`,
     `tenant-${tenantId}`,
     { 'component-disabled': disabled || loading },
     className
   ), [variant, size, theme, tenantId, disabled, loading, className]);
 
   return (
     <div className={classes} {...props}>
       {loading && <Spinner />}
       {children}
     </div>
   );
 });
```

### 2. Implement Button Component
Enhance `apps/front/src/components/ui/Button.tsx`:

```typescript
--- a/apps/front/src/components/ui/Button.tsx
+++ b/apps/front/src/components/ui/Button.tsx
@@ -1,25 +1,40 @@
 import React from 'react';
 import { BaseComponent } from '../common/BaseComponent';
+import { cn } from '@/lib/utils';
 
 interface ButtonProps extends BaseComponentProps {
   onClick?: () => void;
   type?: 'button' | 'submit' | 'reset';
+  fullWidth?: boolean;
+  icon?: React.ReactNode;
 }
 
 export const Button: React.FC<ButtonProps> = ({
   onClick,
   type = 'button',
+  fullWidth = false,
+  icon,
   children,
   ...props
 }) => {
+  const handleClick = useCallback(() => {
+    if (!props.disabled && !props.loading && onClick) {
+      onClick();
+    }
+  }, [onClick, props.disabled, props.loading]);
+
   return (
-    <button
-      type={type}
-      onClick={onClick}
-      disabled={props.disabled || props.loading}
-    >
-      {props.loading && <Spinner />}
-      {children}
-    </button>
+    <BaseComponent
+      as="button"
+      type={type}
+      onClick={handleClick}
+      className={cn('button', { 'button-full-width': fullWidth })}
+      {...props}
+    >
+      {icon && <span className="button-icon">{icon}</span>}
+      {children}
+    </BaseComponent>
   );
 };
```

### 3. Create Modal Component
Add `apps/front/src/components/ui/Modal.tsx`:

```typescript
--- /dev/null
+++ b/apps/front/src/components/ui/Modal.tsx
import React, { useEffect } from 'react';
import { BaseComponent } from '../common/BaseComponent';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content modal-${size}`} 
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
            ×
          </Button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};
```

### 4. Add Form Components
Create `apps/front/src/components/forms/Input.tsx`:

```typescript
--- /dev/null
+++ b/apps/front/src/components/forms/Input.tsx
import React, { forwardRef } from 'react';
import { BaseComponent } from '../common/BaseComponent';

interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required,
  ...props
}, ref) => {
  return (
    <BaseComponent className="input-wrapper">
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? 'input-error' : undefined}
        className="input"
        {...props}
      />
      {error && (
        <span id="input-error" className="input-error" role="alert">
          {error}
        </span>
      )}
    </BaseComponent>
  );
});
```

### 5. Implement Storybook Integration
Update `.storybook/main.ts`:

```typescript
--- a/.storybook/main.ts
+++ b/.storybook/main.ts
@@ -1,10 +1,15 @@
 import type { StorybookConfig } from '@storybook/nextjs';
 
 const config: StorybookConfig = {
   stories: [
     '../apps/front/src/components/**/*.stories.@(js|jsx|ts|tsx|mdx)',
+    '../apps/front/src/components/**/*.stories.mdx',
   ],
   addons: [
     '@storybook/addon-essentials',
+    '@storybook/addon-a11y',
+    '@storybook/addon-interactions',
+    '@storybook/addon-viewport',
   ],
   framework: {
     name: '@storybook/nextjs',
     options: {},
   },
 };
 
 export default config;
```

## Dependencies
- `front-end-routing-engine` - for navigation components
- `responsive-design-validator` - for layout testing
- `wireframe-to-code-converter` - for component generation
- `authentication-authorization-handler` - for secure component access
- `state-management-coordinator` - for component state

## Testing
- Unit tests for component props and rendering
- Integration tests for component interactions
- Visual regression tests with Storybook
- Accessibility tests with axe-core
- Performance tests for rendering speed

## Notes
- Build upon the existing 334 components in `src/components/`
- Ensure all components support multi-tenant theming
- Implement lazy loading for heavy components
- Use CSS-in-JS with Stitches for consistent styling
- Maintain backward compatibility with existing component APIs
- Generate automatic TypeScript definitions for all props