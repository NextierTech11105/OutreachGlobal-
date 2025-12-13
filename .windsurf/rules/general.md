---
trigger: always_on
---

## Backend
- The backend application is in apps/api.
- the backend application used nestjs, drizzle-orm, postgresql, apollo graphql.

## Frontend
- The frontend application is in apps/front.
- The frontend application used nextjs, typescript, tailwindcss, shadcn.
- data fetching are using apollo graphql

### Frontend General Code Style & Formatting
- Follow the Google Style Guide for code formatting.
- Use kebab for React component file names (e.g., user-card.tsx).
- Prefer named exports for components.

### Project Structure & Architecture
- Follow Next.js patterns and use the App Router.
- Correctly determine when to use server vs. client components in Next.js.

### Styling & UI
- Use Tailwind CSS for styling.
- Use Shadcn UI for components.
- if you cant resolve lint issues just skip it.

### State Management & Logic
- use zustand for global state management
- use zod for validation, must create within packages/dto
