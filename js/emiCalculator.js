// ============================================================================
// EMI CALCULATOR HELPER
// ============================================================================
// Provides standard mathematical formulas for calculating monthly loan EMIs,
// total payable amounts, total interest, and installment due dates.
// ============================================================================

/**
 * Calculates the monthly Equated Monthly Installment (EMI).
 * Formula: EMI = [P x r x (1 + r)^n] / [(1 + r)^n - 1]
 * where:
 *   P = Principal loan amount
 *   r = Monthly interest rate (Annual Rate / 12 / 100)
 *   n = Number of monthly installments (tenure)
 * 
 * @param {number} principal - Loan principal amount
 * @param {number} annualRate - Annual interest rate in percent (e.g., 10 for 10%)
 * @param {number} tenureMonths - Total tenure in months
 * @returns {number} Monthly EMI rounded to 2 decimal places
 */
function calculateMonthlyEMI(principal, annualRate, tenureMonths) {
  const P = parseFloat(principal);
  const R = parseFloat(annualRate);
  const N = parseInt(tenureMonths, 10);

  if (isNaN(P) || isNaN(R) || isNaN(N) || P <= 0 || N <= 0) {
    return 0;
  }

  // Monthly interest rate
  const monthlyRate = (R / 12) / 100;

  if (monthlyRate === 0) {
    return parseFloat((P / N).toFixed(2));
  }

  // (1 + r)^n
  const compoundFactor = Math.pow(1 + monthlyRate, N);

  // EMI formula
  const emi = (P * monthlyRate * compoundFactor) / (compoundFactor - 1);
  return parseFloat(emi.toFixed(2));
}

/**
 * Calculates the total repayment amount over the complete tenure.
 * 
 * @param {number} monthlyEMI - Monthly EMI amount
 * @param {number} tenureMonths - Total number of months
 * @returns {number} Total payable amount rounded to 2 decimal places
 */
function calculateTotalPayment(monthlyEMI, tenureMonths) {
  const emi = parseFloat(monthlyEMI) || 0;
  const n = parseInt(tenureMonths, 10) || 0;
  return parseFloat((emi * n).toFixed(2));
}

/**
 * Calculates total interest incurred over the tenure.
 * 
 * @param {number} totalPayment - Total payable amount
 * @param {number} principal - Principal loan amount
 * @returns {number} Total interest rounded to 2 decimal places
 */
function calculateTotalInterest(totalPayment, principal) {
  const total = parseFloat(totalPayment) || 0;
  const p = parseFloat(principal) || 0;
  return parseFloat(Math.max(0, total - p).toFixed(2));
}

/**
 * Generates an array of future due dates for monthly installments.
 * Starts 1 month after the approval/start date.
 * 
 * @param {Date|string} startDate - Reference start date (e.g., approval date)
 * @param {number} tenureMonths - Number of monthly installments
 * @returns {string[]} Array of ISO date strings (YYYY-MM-DD)
 */
function generateInstallmentDueDates(startDate, tenureMonths) {
  const dates = [];
  const start = startDate ? new Date(startDate) : new Date();

  for (let i = 1; i <= tenureMonths; i++) {
    const dueDate = new Date(start.getTime());
    dueDate.setMonth(dueDate.getMonth() + i);
    // Format YYYY-MM-DD
    const isoString = dueDate.toISOString().split('T')[0];
    dates.push(isoString);
  }

  return dates;
}

/**
 * Checks if an installment is past due date and still unpaid.
 * 
 * @param {string} dueDateString - Due date string in YYYY-MM-DD format
 * @param {string} status - Payment status ('pending' or 'paid')
 * @returns {boolean} True if the payment is overdue
 */
function isPaymentOverdue(dueDateString, status) {
  if (status === 'paid') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(dueDateString);
  dueDate.setHours(0, 0, 0, 0);

  return today > dueDate;
}
