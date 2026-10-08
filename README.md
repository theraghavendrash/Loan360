# Loan 360 - Simple Loan Management System

A clean, beginner-friendly Loan Management System web application built with **plain HTML, CSS (Bootstrap 5 via CDN), vanilla JavaScript**, **Chart.js**, and **Supabase** for database and authentication.

---

## 📁 Project Structure

```text
Loan MG/
├── index.html            # Landing page: Login, Borrower Registration & Supabase Setup
├── customer.html         # Borrower Portal: Profile, Apply for Loan, EMI Schedule & Pay
├── admin.html            # Admin Console: Portfolio KPIs (₹), Chart.js Analytics, Decision Queue
├── schema.sql            # Supabase database schema, RLS policies, trigger & seed function
├── css/
│   └── style.css         # Modern styling enhancements and badge themes
└── js/
    ├── supabaseClient.js # Supabase client initialization (Anon key only)
    ├── emiCalculator.js  # Amortization math, monthly EMI formula, overdue checks
    ├── auth.js           # Auth operations, session guards, and role redirection
    ├── customer.js       # Borrower profile, loan submissions, payment actions in ₹
    └── admin.js          # Admin approvals, remarks, schedule generation, Chart.js in ₹
```

---

## 🚀 Setup & Installation (3 Steps)

### Step 1: Run the Database Schema in Supabase
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open the **SQL Editor** on the left menu.
3. Copy the entire contents of [`schema.sql`](schema.sql) and click **Run**.
   - This creates `profiles`, `loan_applications`, and `payments` tables.
   - It sets up secure Row Level Security (RLS) policies and the trigger that automatically creates borrower profiles (`role = 'customer'`).
   - Prevents normal users from escalating their role to `admin`.

> **Tip for Instant Testing**: In your Supabase Dashboard under **Authentication > Providers > Email**, you can uncheck **"Confirm email"** so you can log in immediately upon registration without email verification links.

---

### Step 2: Configure Supabase Credentials
Your credentials have already been configured in [`js/supabaseClient.js`](js/supabaseClient.js):
```javascript
const SUPABASE_CONFIG = {
  url: window.SUPABASE_URL || 'https://mgsnboigqmuzrykeahff.supabase.co',
  anonKey: window.SUPABASE_ANON_KEY || 'sb_publishable_l-Bmlr8QC8VclhL98Ay5yQ_Mn8YQ8fR'
};
```
*(You can also update them in the browser anytime via the "Supabase Setup" button on `index.html`).*

---

### Step 3: Run the Web App
Open terminal in this directory and run:
```bash
python -m http.server 3000
```
Then visit: `http://localhost:3000`

---

## 👑 How to Create an Admin User

Borrower accounts are registered directly through the website UI. To create an Admin:
1. Register a user in the UI on `http://localhost:3000/index.html` (e.g. `admin@loan360.com`).
2. Go to your **Supabase Dashboard > SQL Editor** and run:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@loan360.com');
   ```
3. That user is now an Admin! When they log in on `index.html`, they will be automatically redirected to `admin.html`.

---

## 🧪 Updated Step-by-Step Testing Checklist

1. **Borrower Registration (No Admin Option in Form)**:
   - Visit `http://localhost:3000/index.html` and click **"Register as Borrower"**.
   - Notice that the form has **no Role dropdown** — it strictly registers a **Borrower**.
   - Register an account: e.g. `rahul@example.com` (Password: `password123`).
   - Confirm you are logged in and redirected to `customer.html` as a Borrower.

2. **Create and Log In as Admin (via SQL)**:
   - Register a second user: e.g. `admin@loan360.com`.
   - In Supabase SQL Editor, run:
     ```sql
     UPDATE public.profiles
     SET role = 'admin'
     WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@loan360.com');
     ```
   - Log in with `admin@loan360.com` on `index.html` $\rightarrow$ redirected directly to `admin.html`.

3. **Borrower Profile (in ₹)**:
   - As borrower `rahul@example.com`, open the **"My Profile"** tab.
   - Fill in Phone (`+91 98765 43210`), Address (`Flat 402, MG Road, Bengaluru`), Monthly Income (`₹75,000`), Employment (`Salaried (Private / MNC)`).
   - Click **"Save Profile Details"**.

4. **Loan Application & Live EMI Preview (in ₹ at 10% APR)**:
   - Switch to the **"Apply For Loan"** tab.
   - Enter Amount: `₹2,00,000` and Tenure: `12 Months`.
   - Watch the live preview box immediately compute:
     - **Estimated Monthly EMI**: `₹17,583.19`
     - **Total Interest**: `₹10,998.28`
     - **Total Payable Amount**: `₹2,10,998.28`
   - Enter Purpose (`Home Renovation`) and click **"Submit Loan Application"**.
   - The loan appears under **"My Loans & Repayments"** as **Pending Approval**.

5. **Admin Loan Review & Automatic Schedule Generation**:
   - Log in as the Admin on `admin.html`.
   - In the **Loan Applications Review Queue**, see Rahul's application for `₹2,00,000`.
   - Click **"View Profile"** to check salary and address.
   - Click **"Approve"**, write remarks (`"KYC and income slips verified. Approved."`), and confirm.
   - The loan status updates to **Approved**.
   - Supabase automatically receives 12 monthly rows in the `payments` table with calculated dates.

6. **Borrower EMI Repayment in ₹**:
   - Return to the Borrower dashboard and click **"Refresh"**.
   - Click **"View EMI Schedule & Pay"** on the approved loan.
   - Review the month-by-month table with amounts formatted in `₹`.
   - Click **"Pay Now"** on Installment #1.
   - The installment updates to **Paid** with payment date recorded.

7. **Admin Dashboard in ₹ with Chart.js**:
   - Go to `admin.html`.
   - Inspect the KPI cards:
     - **Total Applications**
     - **Pending Review**
     - **Approved**
     - **Total Collected (₹)** (displays `₹17,583.19` formatted in Indian style `en-IN`)
     - **Overdue EMIs**
   - View the doughnut chart illustrating application distribution.

8. **Seed Demo Data (Optional Instant Fill)**:
   - In Supabase SQL Editor, run:
     ```sql
     SELECT public.seed_demo_loan_data((SELECT id FROM public.profiles WHERE role = 'customer' LIMIT 1));
     ```
   - Refresh both borrower and admin pages to see pre-populated Indian Rupee loans, overdue installments, and paid history!
