// ============================================================================
// LOAN 360 - ADMIN PORTAL MODULE
// ============================================================================
// Handles admin metrics aggregation, Chart.js visual display,
// review of loan applications (approval/rejection with remarks),
// and automatic monthly payment schedule generation upon approval.
// ============================================================================

let loanStatusChartInstance = null;

/**
 * Fetches all loan applications along with applicant profile information.
 * 
 * @returns {Promise<Array>} Array of loan applications with profile details
 */
async function fetchAllApplications() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('loan_applications')
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        phone,
        address,
        monthly_income,
        employment
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching loan applications:', error);
    return [];
  }
  return data || [];
}

/**
 * Calculates admin dashboard metrics:
 * - Total applications
 * - Pending applications
 * - Approved applications
 * - Rejected applications
 * - Total collected amount (₹ from paid installments)
 * - Total overdue installments count
 * 
 * @returns {Promise<object>} Aggregated metrics object
 */
async function fetchAdminMetrics() {
  const supabase = getSupabase();
  if (!supabase) return null;

  // 1. Fetch loans status counts
  const { data: loans, error: loansErr } = await supabase
    .from('loan_applications')
    .select('id, status, amount, monthly_emi');

  if (loansErr) {
    console.error('Error fetching loans for metrics:', loansErr);
    return null;
  }

  const totalApplications = loans.length;
  const pendingCount = loans.filter(l => l.status === 'pending').length;
  const approvedCount = loans.filter(l => l.status === 'approved').length;
  const rejectedCount = loans.filter(l => l.status === 'rejected').length;

  // 2. Fetch payments to compute collected amount and overdue count
  const { data: payments, error: payErr } = await supabase
    .from('payments')
    .select('id, amount, status, due_date');

  let totalCollected = 0;
  let overdueCount = 0;

  if (payments && !payErr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    payments.forEach(p => {
      if (p.status === 'paid') {
        totalCollected += parseFloat(p.amount) || 0;
      } else {
        const dueDate = new Date(p.due_date);
        dueDate.setHours(0, 0, 0, 0);
        if (today > dueDate) {
          overdueCount++;
        }
      }
    });
  }

  return {
    totalApplications,
    pendingCount,
    approvedCount,
    rejectedCount,
    totalCollected: parseFloat(totalCollected.toFixed(2)),
    overdueCount
  };
}

/**
 * Generates and saves one monthly payment row per tenure month in the 'payments' table.
 * 
 * @param {object} loan - The approved loan object
 * @returns {Promise<Array>} Inserted payment rows
 */
async function generatePaymentsSchedule(loan) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Service unavailable. Please try again later.');

  const tenure = parseInt(loan.tenure_months, 10);
  const emi = parseFloat(loan.monthly_emi);
  const startDate = loan.approved_at || new Date().toISOString();
  const dueDates = generateInstallmentDueDates(startDate, tenure);

  const paymentRows = dueDates.map((dateStr, index) => ({
    loan_id: loan.id,
    user_id: loan.user_id,
    installment_number: index + 1,
    due_date: dateStr,
    amount: emi,
    status: 'pending'
  }));

  const { data, error } = await supabase
    .from('payments')
    .insert(paymentRows)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Updates a loan application's status to 'approved' or 'rejected' with remarks.
 * If approved, automatically triggers generation of monthly EMI payment schedule.
 * 
 * @param {string} loanId - UUID of loan application
 * @param {string} newStatus - 'approved' or 'rejected'
 * @param {string} remarks - Loan reviewer remarks
 * @returns {Promise<object>} Updated loan application
 */
async function processLoanDecision(loanId, newStatus, remarks) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Service unavailable. Please try again later.');

  const now = new Date().toISOString();
  const updatePayload = {
    status: newStatus,
    remarks: remarks || '',
    approved_at: newStatus === 'approved' ? now : null
  };

  // 1. Update loan application status
  const { data: updatedLoan, error } = await supabase
    .from('loan_applications')
    .update(updatePayload)
    .eq('id', loanId)
    .select()
    .single();

  if (error) throw error;

  // 2. If approved, generate monthly payments schedule
  if (newStatus === 'approved') {
    // Check if payments already exist to prevent duplicates
    const { data: existingPayments } = await supabase
      .from('payments')
      .select('id')
      .eq('loan_id', loanId)
      .limit(1);

    if (!existingPayments || existingPayments.length === 0) {
      await generatePaymentsSchedule(updatedLoan);
    }
  }

  return updatedLoan;
}

/**
 * Initializes or updates the Chart.js chart displaying loan application metrics.
 * 
 * @param {string} canvasId - HTML canvas element ID
 * @param {object} metrics - Aggregated metrics object
 */
function renderLoanChart(canvasId, metrics) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (loanStatusChartInstance) {
    loanStatusChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  loanStatusChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pending Review', 'Approved', 'Rejected'],
      datasets: [{
        data: [metrics.pendingCount, metrics.approvedCount, metrics.rejectedCount],
        backgroundColor: [
          '#f59e0b', // Amber for Pending
          '#10b981', // Emerald for Approved
          '#ef4444'  // Red for Rejected
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 14,
            padding: 18,
            font: { family: 'Inter', size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const count = context.raw || 0;
              const total = metrics.totalApplications || 1;
              const pct = ((count / total) * 100).toFixed(1);
              return ` ${context.label}: ${count} (${pct}%)`;
            }
          }
        }
      },
      cutout: '68%'
    }
  });
}
