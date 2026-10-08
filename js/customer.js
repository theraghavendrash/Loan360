// ============================================================================
// LOAN 360 - BORROWER PORTAL MODULE
// ============================================================================
// Handles borrower profile updates, live loan application EMI preview & submission,
// viewing loan history, and repayment installment schedule with 'Pay' action.
// ============================================================================

/**
 * Loads and populates customer profile form with existing database records.
 * 
 * @param {string} userId - UUID of logged-in customer
 */
async function loadCustomerProfile(userId) {
  const profile = await getUserProfile(userId);
  if (!profile) return;

  const phoneInput = document.getElementById('profilePhone');
  const addressInput = document.getElementById('profileAddress');
  const incomeInput = document.getElementById('profileIncome');
  const employmentInput = document.getElementById('profileEmployment');
  const nameDisplay = document.getElementById('customerNameDisplay');
  const emailDisplay = document.getElementById('customerEmailDisplay');

  if (phoneInput) phoneInput.value = profile.phone || '';
  if (addressInput) addressInput.value = profile.address || '';
  if (incomeInput) incomeInput.value = profile.monthly_income || '';
  if (employmentInput) employmentInput.value = profile.employment || 'Salaried (Private / MNC)';
  if (nameDisplay) nameDisplay.textContent = profile.full_name || 'Borrower';
}

/**
 * Saves customer personal & financial details into the 'profiles' table.
 * 
 * @param {string} userId - UUID of customer
 * @param {object} profileData - Object containing phone, address, monthly_income, employment
 * @returns {Promise<object>} Supabase update result
 */
async function updateCustomerProfile(userId, profileData) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Service unavailable. Please try again later.');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      phone: profileData.phone,
      address: profileData.address,
      monthly_income: parseFloat(profileData.monthly_income) || 0,
      employment: profileData.employment,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Calculates and updates the real-time EMI preview box in the loan application form.
 * Uses a fixed 10% annual interest rate and formats figures in Indian Rupees (₹).
 */
function updateLiveEMIPreview() {
  const amount = parseFloat(document.getElementById('loanAmount').value) || 0;
  const tenure = parseInt(document.getElementById('loanTenure').value, 10) || 0;
  const annualRate = 10; // Fixed 10% annual interest rate

  const emiDisplay = document.getElementById('previewEMI');
  const totalDisplay = document.getElementById('previewTotal');
  const interestDisplay = document.getElementById('previewInterest');

  if (amount <= 0 || tenure <= 0) {
    if (emiDisplay) emiDisplay.textContent = '₹0.00';
    if (totalDisplay) totalDisplay.textContent = '₹0.00';
    if (interestDisplay) interestDisplay.textContent = '₹0.00';
    return;
  }

  const emi = calculateMonthlyEMI(amount, annualRate, tenure);
  const totalPayable = calculateTotalPayment(emi, tenure);
  const totalInterest = calculateTotalInterest(totalPayable, amount);

  if (emiDisplay) emiDisplay.textContent = `₹${emi.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (totalDisplay) totalDisplay.textContent = `₹${totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (interestDisplay) interestDisplay.textContent = `₹${totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Submits a new loan application to Supabase with computed EMI and fixed 10% rate.
 * 
 * @param {string} userId - UUID of customer
 * @param {object} application - { amount, tenure_months, purpose }
 * @returns {Promise<object>} Inserted loan record
 */
async function submitLoanApplication(userId, application) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Service unavailable. Please try again later.');

  const annualRate = 10;
  const emi = calculateMonthlyEMI(application.amount, annualRate, application.tenure_months);
  const totalPayable = calculateTotalPayment(emi, application.tenure_months);

  const { data, error } = await supabase
    .from('loan_applications')
    .insert([
      {
        user_id: userId,
        amount: application.amount,
        tenure_months: application.tenure_months,
        interest_rate: annualRate,
        purpose: application.purpose,
        monthly_emi: emi,
        total_payable: totalPayable,
        status: 'pending'
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetches all loan applications submitted by the customer.
 * 
 * @param {string} userId - UUID of customer
 * @returns {Promise<Array>} List of loan applications
 */
async function fetchCustomerLoans(userId) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customer loans:', error);
    return [];
  }
  return data || [];
}

/**
 * Fetches the repayment schedule payments for a specific loan.
 * 
 * @param {string} loanId - UUID of loan application
 * @returns {Promise<Array>} List of payment installments
 */
async function fetchLoanPayments(loanId) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('loan_id', loanId)
    .order('installment_number', { ascending: true });

  if (error) {
    console.error('Error fetching loan payments:', error);
    return [];
  }
  return data || [];
}

/**
 * Marks an individual installment as paid with current timestamp.
 * 
 * @param {string} paymentId - UUID of payment record
 * @returns {Promise<object>} Updated payment record
 */
async function markPaymentAsPaid(paymentId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Service unavailable. Please try again later.');

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString()
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
