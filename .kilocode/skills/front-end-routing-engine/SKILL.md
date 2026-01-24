---
name: front-end-routing-engine
description: Manages client-side routing, navigation flows, and URL state management for seamless user experiences in the OutreachGlobal platform
---

# Front-End Routing Engine

## Overview
Enhances the existing routing system in `apps/front/` to provide robust client-side routing, navigation flows, and URL state management. Builds upon the current Next.js App Router structure to ensure smooth user transitions, proper history management, and deep linking support across all features and tenant contexts.

## Key Features
- Tenant-scoped routing with multi-tenant isolation
- Protected routes with authentication guards
- Dynamic route parameters and query string management
- Nested routing for complex UI hierarchies
- Performance optimization with code splitting and preloading
- Accessibility-compliant navigation patterns
- SEO-friendly URL structures

## Implementation Steps

### 1. Enhance Route Guards
Update `apps/front/src/components/auth/ProtectedRoute.tsx` to include tenant validation:

```typescript
--- a/apps/front/src/components/auth/ProtectedRoute.tsx
+++ b/apps/front/src/components/auth/ProtectedRoute.tsx
@@ -1,15 +1,25 @@
 import { useAuth } from '@/hooks/useAuth';
 import { useRouter } from 'next/navigation';
 import { useEffect } from 'react';
+import { useTenant } from '@/hooks/useTenant';
 
 const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const { user, loading } = useAuth();
+  const { tenantId, tenantLoading } = useTenant();
   const router = useRouter();
 
   useEffect(() => {
-    if (!loading && !user) {
-      router.push('/login');
+    if (!loading && !tenantLoading) {
+      if (!user) {
+        router.push('/login');
+      } else if (!tenantId) {
+        router.push('/tenant-selection');
+      }
     }
-  }, [user, loading, router]);
+  }, [user, loading, tenantId, tenantLoading, router]);
 
   if (loading || tenantLoading) return <LoadingSpinner />;
   if (!user || !tenantId) return null;
```

### 2. Implement Tenant-Scoped Navigation
Create `apps/front/src/services/navigationService.ts`:

```typescript
--- /dev/null
+++ b/apps/front/src/services/navigationService.ts
import { useRouter } from 'next/navigation';
import { useTenant } from '@/hooks/useTenant';

export const useNavigation = () => {
  const router = useRouter();
  const { tenantId } = useTenant();

  const navigateToCampaign = (campaignId: string) => {
    router.push(`/${tenantId}/campaigns/${campaignId}`);
  };

  const navigateToLeads = (filters?: Record<string, string>) => {
    const query = filters ? new URLSearchParams(filters) : '';
    router.push(`/${tenantId}/leads${query ? `?${query}` : ''}`);
  };

  const replaceToDashboard = () => {
    router.replace(`/${tenantId}/dashboard`);
  };

  return {
    navigateToCampaign,
    navigateToLeads,
    replaceToDashboard
  };
};
```

### 3. Add Route Preloading
Enhance `apps/front/src/components/common/Link.tsx`:

```typescript
--- a/apps/front/src/components/common/Link.tsx
+++ b/apps/front/src/components/common/Link.tsx
 import NextLink from 'next/link';
 import { useRouter } from 'next/navigation';
+import { useTenant } from '@/hooks/useTenant';
 
 interface LinkProps {
   href: string;
   children: React.ReactNode;
   preload?: boolean;
+  tenantScoped?: boolean;
 }
 
 export const Link: React.FC<LinkProps> = ({
   href,
   children,
   preload = false,
+  tenantScoped = false
 }) => {
+  const { tenantId } = useTenant();
+  const fullHref = tenantScoped ? `/${tenantId}${href}` : href;
+
   const handleMouseEnter = () => {
     if (preload) {
       router.prefetch(fullHref);
     }
   };
 
   return (
-    <NextLink href={href} onMouseEnter={handleMouseEnter}>
+    <NextLink href={fullHref} onMouseEnter={handleMouseEnter}>
       {children}
     </NextLink>
   );
 };
```

### 4. Implement Breadcrumb Navigation
Create `apps/front/src/components/navigation/Breadcrumbs.tsx`:

```typescript
--- /dev/null
+++ b/apps/front/src/components/navigation/Breadcrumbs.tsx
import { usePathname } from 'next/navigation';
import { Link } from '@/components/common/Link';
import { useTenant } from '@/hooks/useTenant';

export const Breadcrumbs = () => {
  const pathname = usePathname();
  const { tenantId } = useTenant();
  
  // Remove tenant prefix for breadcrumb calculation
  const pathWithoutTenant = pathname.replace(`/${tenantId}`, '') || '/';
  const segments = pathWithoutTenant.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        <li>
          <Link href="/dashboard" tenantScoped>Home</Link>
        </li>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join('/')}`;
          const isLast = index === segments.length - 1;
          
          return (
            <li key={segment}>
              {isLast ? (
                <span>{segment}</span>
              ) : (
                <Link href={href} tenantScoped>{segment}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
```

## Dependencies
- `authentication-authorization-handler` - for route protection
- `state-management-coordinator` - for URL state synchronization
- `ui-component-library` - for navigation UI components
- `responsive-design-validator` - for mobile navigation patterns

## Testing
- Unit tests for navigation service functions
- Integration tests for route guards and tenant validation
- E2E tests for navigation flows and deep linking
- Accessibility tests for keyboard navigation and screen readers

## Notes
- All routes must include tenant context for multi-tenant isolation
- Implement lazy loading for route components to optimize bundle size
- Use Next.js App Router conventions for file-based routing
- Ensure proper error boundaries for route-level error handling
- Maintain backward compatibility with existing routing patterns