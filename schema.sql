-- ============================================================================
-- LOAN 360 - SUPABASE DATABASE SCHEMA
-- ============================================================================

-- 1. PROFILES TABLE
-- Stores profile details for Borrowers (role = 'customer') and Admins (role = 'admin')
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  monthly_income NUMERIC(12, 2) DEFAULT 0,
  employment TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LOAN_APPLICATIONS TABLE
-- Stores borrower loan requests, tenure, EMI, and admin approval status
CREATE TABLE IF NOT EXISTS public.loan_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  tenure_months INT NOT NULL,
  interest_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00, -- Fixed 10% annual interest
  purpose TEXT,
  monthly_emi NUMERIC(12, 2) NOT NULL,
  total_payable NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  remarks TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PAYMENTS TABLE
-- Stores monthly repayment installments (generated automatically on loan approval)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID REFERENCES public.loan_applications(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  installment_number INT NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current authenticated user has 'admin' role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
CREATE POLICY "Profiles select policy"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

-- Enforce: Regular users can only update their own profile and CANNOT escalate their role to 'admin'.
-- Only an existing admin can assign or modify the 'admin' role.
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR
    (auth.uid() = id AND role = 'customer')
  );

-- Enforce: Users can only insert their own profile with role = 'customer'
DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
CREATE POLICY "Profiles insert policy"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'customer');

-- LOAN_APPLICATIONS POLICIES
DROP POLICY IF EXISTS "Loans select policy" ON public.loan_applications;
CREATE POLICY "Loans select policy"
  ON public.loan_applications FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Loans insert policy" ON public.loan_applications;
CREATE POLICY "Loans insert policy"
  ON public.loan_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Loans update policy" ON public.loan_applications;
CREATE POLICY "Loans update policy"
  ON public.loan_applications FOR UPDATE
  USING (public.is_admin());

-- PAYMENTS POLICIES
DROP POLICY IF EXISTS "Payments select policy" ON public.payments;
CREATE POLICY "Payments select policy"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Payments insert policy" ON public.payments;
CREATE POLICY "Payments insert policy"
  ON public.payments FOR INSERT
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Payments update policy" ON public.payments;
CREATE POLICY "Payments update policy"
  ON public.payments FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());

-- ============================================================================
-- 5. TRIGGER: AUTOMATIC PROFILE CREATION ON USER SIGNUP
-- ============================================================================
-- Always forces role = 'customer' on account registration.
-- Role cannot be injected from the client browser.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Borrower'),
    'customer' -- Strictly create as borrower
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 6. HOW TO PROMOTE A USER TO ADMIN
-- ============================================================================
-- Run this query in Supabase SQL Editor replacing with your admin's email:
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'your-admin-email@example.com');
-- ============================================================================

-- ============================================================================
-- 7. DEMO SEED DATA HELPER (REALISTIC RUPEE AMOUNTS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.seed_demo_loan_data(target_customer_id UUID)
RETURNS VOID AS $$
DECLARE
  v_approved_loan_id UUID;
  v_pending_loan_id UUID;
BEGIN
  -- Insert an Approved Loan of ₹2,50,000 for 12 months at 10% APR (Monthly EMI = ₹21,979)
  INSERT INTO public.loan_applications (
    user_id, amount, tenure_months, interest_rate, purpose, monthly_emi, total_payable, status, remarks, approved_at
  ) VALUES (
    target_customer_id, 250000.00, 12, 10.00, 'Home Renovation & Painting', 21979.00, 263748.00, 'approved', 'KYC verified, salary slips verified. Approved.', NOW() - INTERVAL '2 months'
  ) RETURNING id INTO v_approved_loan_id;

  -- 1st installment: Paid 1 month ago (₹21,979)
  INSERT INTO public.payments (loan_id, user_id, installment_number, due_date, amount, status, paid_at)
  VALUES (v_approved_loan_id, target_customer_id, 1, (CURRENT_DATE - INTERVAL '1 month')::DATE, 21979.00, 'paid', NOW() - INTERVAL '25 days');

  -- 2nd installment: Overdue (due 5 days ago and unpaid) (₹21,979)
  INSERT INTO public.payments (loan_id, user_id, installment_number, due_date, amount, status)
  VALUES (v_approved_loan_id, target_customer_id, 2, (CURRENT_DATE - INTERVAL '5 days')::DATE, 21979.00, 'pending');

  -- 3rd to 12th installments: Future pending (₹21,979 each)
  FOR i IN 3..12 LOOP
    INSERT INTO public.payments (loan_id, user_id, installment_number, due_date, amount, status)
    VALUES (v_approved_loan_id, target_customer_id, i, (CURRENT_DATE + ((i - 2) * INTERVAL '1 month'))::DATE, 21979.00, 'pending');
  END LOOP;

  -- Insert a Pending Loan of ₹1,00,000 for 6 months at 10% APR (Monthly EMI = ₹17,156)
  INSERT INTO public.loan_applications (
    user_id, amount, tenure_months, interest_rate, purpose, monthly_emi, total_payable, status
  ) VALUES (
    target_customer_id, 100000.00, 6, 10.00, 'Medical Treatment and Hospital Expenses', 17156.00, 102936.00, 'pending'
  ) RETURNING id INTO v_pending_loan_id;

  -- Also set sample Indian address and income on profile if empty
  UPDATE public.profiles
  SET phone = COALESCE(NULLIF(phone, ''), '+91 98765 43210'),
      address = COALESCE(NULLIF(address, ''), 'Flat 402, Royal Residency, MG Road, Bengaluru, Karnataka - 560001'),
      monthly_income = CASE WHEN monthly_income = 0 OR monthly_income IS NULL THEN 75000.00 ELSE monthly_income END,
      employment = COALESCE(NULLIF(employment, ''), 'Salaried - Senior Software Engineer')
  WHERE id = target_customer_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
