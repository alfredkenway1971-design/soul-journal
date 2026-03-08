

# Super Admin Dashboard & Subscription System

## Overview
Add a super admin role system where only `amer.niyonzima@gmail.com` can access an admin dashboard showing all users, business metrics, and manage user access. Integrate Stripe for monthly/annual subscription payments.

## Database Changes

### 1. User Roles Table (security definer pattern)
```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Security definer function to check roles
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) ...

-- RLS: only admins can read all, users can read own
```

### 2. Subscriptions Table
```sql
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_type text DEFAULT 'free', -- 'free', 'monthly', 'annual'
  status text DEFAULT 'inactive', -- 'active', 'inactive', 'cancelled', 'trial'
  current_period_start timestamptz,
  current_period_end timestamptz,
  is_manual_grant boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 3. Seed Admin Role
Insert admin role for `amer.niyonzima@gmail.com` user (id: `378226e8-bea1-486b-8ae3-8be63deec389` from auth logs).

## Frontend Changes

### Admin Dashboard Page (`/admin`)
- **Users tab**: Table of all users (email, display name, signup date, subscription status, last active)
- **Revenue tab**: Charts showing MRR, total subscribers, monthly vs annual split, churn
- **Manual Grant**: Button to grant/revoke free access to specific users by email

### Settings Page Update
- Conditionally show "Admin Dashboard" link only when the logged-in user has the `admin` role (checked via `has_role` function)

### Auth Context Update
- Add `isAdmin` boolean to AuthContext by querying `user_roles` table on login

### Routing
- Add `/admin` protected route that checks admin role before rendering
- Redirect non-admins to home if they try to access `/admin`

## Stripe Integration
- Enable Stripe via the Stripe tool
- Create subscription products/prices (monthly + annual) — pricing TBD per user request
- Add paywall logic: check `subscriptions` table for active status before allowing full app access

## Security
- Admin check uses server-side `has_role` security definer function (no client-side hacks)
- RLS on `user_roles`: users can read own role, admins can read all
- RLS on `subscriptions`: users can read own, admins can read all
- Admin-only edge function for listing all users/profiles

