// DOM Elements
const searchInput = document.getElementById('searchInput');
const timeFilter = document.getElementById('timeFilter');
const paymentsTableBody = document.getElementById('paymentsTableBody');
const pagination = document.getElementById('pagination');
const totalAmountElement = document.getElementById('totalAmount');
const pendingAmountElement = document.getElementById('pendingAmount');
const latePaymentsElement = document.getElementById('latePayments');
const bulkPaymentBtn = document.getElementById('bulkPayment');
const bulkPaymentModal = document.getElementById('bulkPaymentModal');
const closeModalBtn = document.querySelector('.close');
const cancelBulkPaymentBtn = document.getElementById('cancelBulkPayment');
const bulkPaymentForm = document.getElementById('bulkPaymentForm');

// Subscription Elements
const subscriptionPaymentBtn = document.getElementById('subscriptionPayment');
const subscriptionPaymentModal = document.getElementById('subscriptionPaymentModal');
const closeSubscriptionModalBtn = document.querySelector('.close-subscription');
const cancelSubscriptionPaymentBtn = document.getElementById('cancelSubscriptionPayment');
const subscriptionPaymentForm = document.getElementById('subscriptionPaymentForm');

// Pagination settings
let currentPage = 1;
const rowsPerPage = 10;
let filteredPayments = [];

// Data storage
let payments = [];
let residents = [];
let currentUser = {};
let communityData = {};
let subscriptionStatus = {};

// Subscription plans configuration
const subscriptionPlans = {
    basic: {
        name: 'Basic Plan',
        price: 999,
        features: ['Up to 50 residents', 'Basic payment tracking', 'Email support'],
        duration: 'monthly'
    },
    standard: {
        name: 'Standard Plan',
        price: 1999,
        features: ['Up to 200 residents', 'Advanced payment tracking', 'SMS notifications', 'Priority support'],
        duration: 'monthly'
    },
    premium: {
        name: 'Premium Plan',
        price: 2999,
        features: ['Unlimited residents', 'Full payment suite', 'SMS + Email notifications', 'Dedicated support', 'Analytics dashboard'],
        duration: 'monthly'
    }
};

// Loading state management
class LoadingManager {
    static show(element, text = 'Loading...') {
        if (element) {
            element.disabled = true;
            element.dataset.originalText = element.textContent;
            element.textContent = text;
        }
    }

    static hide(element) {
        if (element && element.dataset.originalText) {
            element.disabled = false;
            element.textContent = element.dataset.originalText;
            delete element.dataset.originalText;
        }
    }
}

// Error handling utility
class ErrorHandler {
    static show(message, type = 'error') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            max-width: 400px;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            background: ${type === 'error' ? '#f8d7da' : type === 'success' ? '#d4edda' : '#fff3cd'};
            border: 1px solid ${type === 'error' ? '#f5c6cb' : type === 'success' ? '#c3e6cb' : '#ffeaa7'};
            color: ${type === 'error' ? '#721c24' : type === 'success' ? '#155724' : '#856404'};
        `;
        
        alertDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="flex: 1;">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; font-size: 18px; cursor: pointer; color: #666;">×</button>
            </div>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// API utility with error handling
class ApiClient {
    static async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error for ${url}:`, error);
            throw error;
        }
    }

    static async get(url) {
        return this.request(url);
    }

    static async post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
}

// Initialize application
// In your initialization code:
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeApp();
        setupEventListeners();
        setupSubscriptionEventListeners();
        
        // Check subscription status periodically (every hour)
        setInterval(checkSubscriptionStatus, 3600000);
        
        // Initial check with a slight delay to allow UI to load
        setTimeout(checkSubscriptionStatus, 2000);
    } catch (error) {
        console.error('Failed to initialize app:', error);
        ErrorHandler.show('Failed to initialize application. Please refresh the page.');
    }
});

async function initializeApp() {
    const loadingPromises = [
        fetchPaymentsData(),
        fetchResidentsData(),
        fetchCurrentUser(),
        fetchCommunityData(),
        fetchSubscriptionStatus()
    ];

    await Promise.allSettled(loadingPromises);
}

function setupEventListeners() {
    // Search and filter functionality
    searchInput?.addEventListener('input', debounce(filterPayments, 300));
    timeFilter?.addEventListener('change', filterPayments);

    // Modal functionality
    bulkPaymentBtn?.addEventListener('click', openBulkPaymentModal);
    closeModalBtn?.addEventListener('click', closeBulkPaymentModal);
    cancelBulkPaymentBtn?.addEventListener('click', closeBulkPaymentModal);
    
    // Form submission
    bulkPaymentForm?.addEventListener('submit', handleBulkPaymentSubmit);

    // Close modal on outside click
    window.addEventListener('click', (event) => {
        if (event.target === bulkPaymentModal) {
            closeBulkPaymentModal();
        }
        if (event.target === subscriptionPaymentModal) {
            closeSubscriptionPaymentModal();
        }
    });
}

function setupSubscriptionEventListeners() {
    subscriptionPaymentBtn?.addEventListener('click', handleSubscriptionButtonClick);
    closeSubscriptionModalBtn?.addEventListener('click', closeSubscriptionPaymentModal);
    cancelSubscriptionPaymentBtn?.addEventListener('click', closeSubscriptionPaymentModal);
    subscriptionPaymentForm?.addEventListener('submit', handleSubscriptionPaymentSubmit);
}

// Handle subscription button click - show payment form only if expired
// Handle subscription button click - show payment form if expired or pending
function handleSubscriptionButtonClick() {
    // Show form for expired, pending, or if the modal isn't already open
    if (subscriptionStatus.isExpired || 
        (subscriptionStatus.community?.subscriptionStatus && 
         subscriptionStatus.community.subscriptionStatus.toLowerCase() === 'pending') ||
        !subscriptionPaymentModal.style.display || 
        subscriptionPaymentModal.style.display === 'none') {
        openSubscriptionPaymentModal();
    } else {
        showCurrentSubscriptionInfo();
    }
}


// Show current subscription information when not expired
function showCurrentSubscriptionInfo() {
    const infoDiv = document.createElement('div');
    infoDiv.className = 'subscription-info-modal';
    infoDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const currentPlan = subscriptionPlans[subscriptionStatus.community?.subscriptionPlan] || subscriptionPlans.basic;
    const statusColor = getSubscriptionStatusColor(subscriptionStatus.community?.subscriptionStatus);
    
    infoDiv.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 8px; max-width: 500px; width: 90%;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #333;">Current Subscription</h2>
                <button onclick="this.closest('.subscription-info-modal').remove()" 
                        style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #007bff;">${escapeHtml(currentPlan.name)}</h3>
                <div style="font-size: 1.5em; font-weight: bold; color: #28a745; margin-bottom: 15px;">
                    ₹${currentPlan.price.toLocaleString()}/${currentPlan.duration}
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong>Status:</strong> 
                    <span style="color: ${statusColor}; font-weight: bold; text-transform: capitalize;">
                        ${escapeHtml(subscriptionStatus.community?.subscriptionStatus || 'Unknown')}
                    </span>
                </div>
                
                ${subscriptionStatus.community?.planEndDate ? `
                <div style="margin-bottom: 15px;">
                    <strong>Expires:</strong> ${formatDate(subscriptionStatus.community.planEndDate)}
                    ${subscriptionStatus.isExpiringSoon ? 
                        '<span style="color: #ff6b6b; font-weight: bold;"> (Expiring Soon!)</span>' : ''}
                </div>
                ` : ''}
                
                
                
                <div>
                    <strong>Features:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        ${currentPlan.features.map(feature => `<li>${escapeHtml(feature)}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            <div style="text-align: center;">
                <button onclick="this.closest('.subscription-info-modal').remove()" 
                        style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(infoDiv);
}

function getSubscriptionStatusColor(status) {
    const colors = {
        'active': '#28a745',
        'expired': '#dc3545',
        'pending': '#ffc107',
        'cancelled': '#6c757d'
    };
    return colors[status?.toLowerCase()] || '#6c757d';
}

// Debounce utility for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Data fetching functions with improved error handling
async function fetchPaymentsData() {
    try {
        payments = await ApiClient.get('/manager/all-payments');
        filteredPayments = [...payments];
        
        // Apply default filter (this month)
        filterPaymentsByTime('all-time');
        
        updateDashboardStats();
        renderPaymentsTable();
    } catch (error) {
        ErrorHandler.show('Failed to load payments data. Please try again later.');
        payments = [];
        filteredPayments = [];
    }
}

async function fetchResidentsData() {
    try {
        residents = await ApiClient.get('/manager/residents');
    } catch (error) {
        ErrorHandler.show('Failed to load residents data.');
        residents = [];
    }
}

async function fetchCurrentUser() {
    try {
        currentUser = await ApiClient.get('/manager/currentcManager');
    } catch (error) {
        ErrorHandler.show('Failed to load user data.');
        currentUser = {};
    }
}

async function fetchCommunityData() {
    try {
        communityData = await ApiClient.get('/manager/community-details');
    } catch (error) {
        ErrorHandler.show('Failed to load community subscription data.');
        communityData = {};
    }
}

// In your fetchSubscriptionStatus function:
async function fetchSubscriptionStatus() {
    try {
        const response = await ApiClient.get('/manager/subscription-status');
        
        // Enhanced status processing
        if (response.success && response.community) {
            const planEndDate = new Date(response.community.planEndDate);
            const now = new Date();
            
            // Calculate days until expiry
            const daysUntilExpiry = Math.floor((planEndDate - now) / (1000 * 60 * 60 * 24));
            
            // Determine status flags
            response.isExpired = !response.community.planEndDate || 
                                response.community.subscriptionStatus === 'expired' || 
                                (response.community.subscriptionStatus === 'active' && now > planEndDate);
            
            response.isExpiringSoon = !response.isExpired && 
                                    response.community.subscriptionStatus === 'active' && 
                                    daysUntilExpiry <= 7 && 
                                    daysUntilExpiry >= 0;
            
            response.daysUntilExpiry = daysUntilExpiry;
        }
        
        subscriptionStatus = response;
        updateSubscriptionButton();
        return response;
    } catch (error) {
        console.error('Failed to load subscription status:', error);
        ErrorHandler.show('Failed to load subscription status. Please try again.');
        return {
            success: false,
            isExpired: true,
            isExpiringSoon: false
        };
    }
}
// Update subscription button text based on status
// Update the subscription button to be disabled when active
function updateSubscriptionButton() {
    if (subscriptionPaymentBtn && subscriptionStatus.success) {
        const status = subscriptionStatus.community?.subscriptionStatus?.toLowerCase();
        
        // Reset button state
        subscriptionPaymentBtn.disabled = false;
        subscriptionPaymentBtn.style.cursor = 'pointer';
        subscriptionPaymentBtn.style.opacity = '1';
        
        if (subscriptionStatus.isExpired) {
            subscriptionPaymentBtn.textContent = 'Subscription Payment';
            subscriptionPaymentBtn.style.background = '#dc3545';
            subscriptionPaymentBtn.style.color = 'white';
        } else if (status === 'pending') {
            subscriptionPaymentBtn.textContent = 'Complete Payment';
            subscriptionPaymentBtn.style.background = '#ffc107';
            subscriptionPaymentBtn.style.color = '#212529';
        } else if (status === 'active') {
            const daysLeft = subscriptionStatus.daysUntilExpiry || 0;
            
            // Disable the button when subscription is active
            subscriptionPaymentBtn.disabled = true;
            subscriptionPaymentBtn.style.cursor = 'not-allowed';
            subscriptionPaymentBtn.style.opacity = '0.7';
            
            if (subscriptionStatus.isExpiringSoon) {
                subscriptionPaymentBtn.textContent = `Active (${daysLeft} days left)`;
                subscriptionPaymentBtn.style.background = '#ffc107';
            } else {
                subscriptionPaymentBtn.textContent = `Active (${daysLeft} days left)`;
                subscriptionPaymentBtn.style.background = '#28a745';
            }
        } else {
            subscriptionPaymentBtn.textContent = 'View Subscription';
            subscriptionPaymentBtn.style.background = '#6c757d';
            subscriptionPaymentBtn.style.color = 'white';
        }
    }
}

// Modify the click handler to prevent action when disabled
function handleSubscriptionButtonClick() {
    // Check if button is disabled (active subscription)
    if (subscriptionPaymentBtn && subscriptionPaymentBtn.disabled) {
        return; // Do nothing if button is disabled
    }
    
    // Show form for expired, pending, or if the modal isn't already open
    if (subscriptionStatus.isExpired || 
        (subscriptionStatus.community?.subscriptionStatus && 
         subscriptionStatus.community.subscriptionStatus.toLowerCase() === 'pending') ||
        !subscriptionPaymentModal.style.display || 
        subscriptionPaymentModal.style.display === 'none') {
        openSubscriptionPaymentModal();
    } else {
        showCurrentSubscriptionInfo();
    }
}

// Filtering and search functions
function filterPayments() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const timeFilterValue = timeFilter.value;
    
    // First filter by time
    filterPaymentsByTime(timeFilterValue);
    
    // Then filter by search term
    if (searchTerm) {
        filteredPayments = filteredPayments.filter(payment => {
            const searchableFields = [
                payment.title?.toLowerCase() || '',
                payment.status?.toLowerCase() || '',
                payment.sender?.name?.toLowerCase() || '',
                payment.receiver?.name?.toLowerCase() || '',
                payment.sender?._id?.toLowerCase() || ''
            ];
            
            return searchableFields.some(field => field.includes(searchTerm));
        });
    }
    
    currentPage = 1;
    renderPaymentsTable();
    updateDashboardStats();
}

function filterPaymentsByTime(timeFilter) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    switch(timeFilter) {
        case 'this-month':
            filteredPayments = payments.filter(payment => {
                const paymentDate = new Date(payment.paymentDate);
                return paymentDate.getMonth() === currentMonth && 
                       paymentDate.getFullYear() === currentYear;
            });
            break;
        case 'last-month':
            filteredPayments = payments.filter(payment => {
                const paymentDate = new Date(payment.paymentDate);
                const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                const yearOfLastMonth = currentMonth === 0 ? currentYear - 1 : currentYear;
                return paymentDate.getMonth() === lastMonth && 
                       paymentDate.getFullYear() === yearOfLastMonth;
            });
            break;
        case 'all':
        default:
            filteredPayments = [...payments];
            break;
    }
}

// Rendering functions
function renderPaymentsTable() {
    if (!paymentsTableBody) return;
    
    paymentsTableBody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedPayments = filteredPayments.slice(startIndex, endIndex);
    
    if (paginatedPayments.length === 0) {
        paymentsTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="no-results" style="text-align: center; padding: 20px; color: #666;">
                    No payments found
                </td>
            </tr>
        `;
    } else {
        paginatedPayments.forEach(payment => {
            const row = createPaymentRow(payment);
            paymentsTableBody.appendChild(row);
        });
    }
    
    renderPagination();
}

function createPaymentRow(payment) {
    const paymentDeadline = formatDate(payment.paymentDeadline);
    const paymentDate = payment.paymentDate ? formatDate(payment.paymentDate) : '-';
    
    const statusClass = getStatusClass(payment.status);
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${escapeHtml(payment.title || '')}</td>
        <td>${escapeHtml(payment.sender?._id || '')}</td>
        <td>₹${(payment.amount || 0).toLocaleString()}</td>
        <td>${paymentDeadline}</td>
        <td>${paymentDate}</td>
        <td>${escapeHtml(payment.paymentMethod || '-')}</td>
        <td><span class="${statusClass}">${escapeHtml(payment.status || '')}</span></td>
        <td>${escapeHtml(payment.remarks || '-')}</td>
    `;
    
    return row;
}

function getStatusClass(status) {
    const statusLower = (status || '').toLowerCase();
    const statusClassMap = {
        'completed': 'status-completed',
        'pending': 'status-pending',
        'failed': 'status-failed',
        'late': 'status-late'
    };
    return statusClassMap[statusLower] || '';
}

function formatDate(dateString) {
    try {
        return new Date(dateString).toLocaleDateString();
    } catch {
        return '-';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderPagination() {
    if (!pagination) return;
    
    const totalPages = Math.ceil(filteredPayments.length / rowsPerPage);
    pagination.innerHTML = '';
    
    // Previous button
    const prevButton = createPaginationButton('&laquo; Previous', currentPage === 1, () => {
        currentPage--;
        renderPaymentsTable();
    });
    pagination.appendChild(prevButton);
    
    // Page numbers
    const maxButtons = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = createPaginationButton(i.toString(), false, () => {
            currentPage = i;
            renderPaymentsTable();
        }, i === currentPage);
        pagination.appendChild(pageButton);
    }
    
    // Next button
    const nextButton = createPaginationButton('Next &raquo;', currentPage === totalPages || totalPages === 0, () => {
        currentPage++;
        renderPaymentsTable();
    });
    pagination.appendChild(nextButton);
}

function createPaginationButton(text, disabled, clickHandler, isCurrent = false) {
    const button = document.createElement('button');
    button.innerHTML = text;
    button.classList.add('pagination-btn');
    button.disabled = disabled;
    
    if (isCurrent) {
        button.classList.add('current-page');
    } else if (!disabled) {
        button.addEventListener('click', clickHandler);
    }
    
    return button;
}

// Dashboard stats update
function updateDashboardStats() {
    const thisMonthPayments = payments.filter(payment => {
        const paymentDeadline = new Date(payment.paymentDeadline);
        const now = new Date();
        return paymentDeadline.getMonth() === now.getMonth() && 
               paymentDeadline.getFullYear() === now.getFullYear();
    });
    
    const totalAmount = thisMonthPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const pendingPayments = payments.filter(p => (p.status || '').toLowerCase() === 'pending');
    const pendingAmount = pendingPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const latePayments = payments.filter(p => (p.status || '').toLowerCase() === 'late').length;
    
    if (totalAmountElement) totalAmountElement.textContent = totalAmount.toLocaleString();
    if (pendingAmountElement) pendingAmountElement.textContent = pendingAmount.toLocaleString();
    if (latePaymentsElement) latePaymentsElement.textContent = latePayments;
}

// Modal functions
function openBulkPaymentModal() {
    if (bulkPaymentModal) {
        bulkPaymentModal.style.display = 'block';
        bulkPaymentForm?.reset();
    }
}

function closeBulkPaymentModal() {
    if (bulkPaymentModal) {
        bulkPaymentModal.style.display = 'none';
    }
}

function openSubscriptionPaymentModal() {
    if (subscriptionPaymentModal) {
        subscriptionPaymentModal.style.display = 'block';
        subscriptionPaymentForm?.reset();
        
        // Populate subscription details
        populateSubscriptionDetails();
        
        // Focus on the first input field
        const firstInput = subscriptionPaymentModal.querySelector('input, select');
        if (firstInput) {
            firstInput.focus();
        }
        
        // Add a class to body to prevent scrolling
        document.body.classList.add('modal-open');
    }
}

function closeSubscriptionPaymentModal() {
    if (subscriptionPaymentModal) {
        subscriptionPaymentModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

function closeSubscriptionPaymentModal() {
    if (subscriptionPaymentModal) {
        subscriptionPaymentModal.style.display = 'none';
    }
}




// Form submission handlers
async function handleBulkPaymentSubmit(event) {
    event.preventDefault();
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    LoadingManager.show(submitButton, 'Creating payments...');
    
    try {
        const title = document.getElementById('bulkPaymentTitle')?.value;
        const amount = parseFloat(document.getElementById('bulkPaymentAmount')?.value || 0);
        const remarks = document.getElementById('bulkPaymentRemarks')?.value;

        if (!title || amount <= 0) {
            throw new Error('Please fill in all required fields with valid values');
        }

        if (!residents || residents.length === 0) {
            throw new Error('No residents found. Please try again later.');
        }

        let successCount = 0;
        let failCount = 0;

        // Process each resident
        for (const resident of residents) {
            try {
                const paymentData = {
                    title,
                    senderId: resident._id,
                    receiverId: currentUser._id,
                    amount,
                    status: 'Pending',
                    paymentMethod: 'None',
                    remarks,
                    paymentDeadline: new Date().toISOString()
                };

                await ApiClient.post('/manager/payments', paymentData);
                console.log("frontend js")
                console.log(paymentData)
                successCount++;
            } catch (error) {
                console.error(`Error creating payment for ${resident.residentFirstname}:`, error);
                failCount++;
            }
        }

        const message = failCount > 0 
            ? `Created ${successCount} payments. ${failCount} failed.`
            : `Successfully created ${successCount} payment requests`;
            
        ErrorHandler.show(message, failCount > 0 ? 'warning' : 'success');
        closeBulkPaymentModal();
        await fetchPaymentsData(); // Refresh data
        
    } catch (error) {
        console.error('Bulk payment error:', error);
        ErrorHandler.show(error.message || 'Failed to create payments. Please try again.');
    } finally {
        LoadingManager.hide(submitButton);
    }
}

async function handleSubscriptionPaymentSubmit(event) {
    event.preventDefault();
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    LoadingManager.show(submitButton, 'Processing payment...');
    
    try {
        const paymentMethod = document.getElementById('paymentMethod')?.value;
        
        if (!paymentMethod) {
            throw new Error('Please select a payment method');
        }
        
        if (!subscriptionStatus.success || !subscriptionStatus.community) {
            throw new Error('Unable to load subscription details. Please refresh and try again.');
        }
        
        // Use the current plan from subscription status
        const selectedPlan = subscriptionStatus.community.subscriptionPlan || 'basic';
        const plan = subscriptionPlans[selectedPlan];
        
        if (!plan) {
            throw new Error('Invalid plan configuration');
        }
        
        const status = subscriptionStatus.community.subscriptionStatus?.toLowerCase();
        const isRenewal = subscriptionStatus.isExpired;
        const isPendingPayment = status === 'pending';
        
        const paymentData = {
            communityId: subscriptionStatus.community._id || communityData._id,
            subscriptionPlan: selectedPlan,
            amount: plan.price,
            paymentMethod,
            planDuration: plan.duration,
            transactionId: generateTransactionId(),
            paymentDate: new Date().toISOString(),
            isRenewal,
            isPendingPayment,
            paymentType: isPendingPayment ? 'pending_completion' : isRenewal ? 'renewal' : 'upgrade'
        };
        
        const result = await ApiClient.post('/manager/subscription-payment', paymentData);
        
        const successMessage = isPendingPayment 
            ? `Payment completed successfully! Your ${plan.name} subscription is now active.`
            : `Payment successful! Your ${plan.name} subscription ${isRenewal ? 'has been renewed' : 'is now active'}.`;
            
        ErrorHandler.show(successMessage, 'success');
        closeSubscriptionPaymentModal();
        
        // Refresh data
        await Promise.all([fetchCommunityData(), fetchSubscriptionStatus()]);
        showPaymentSuccessMessage(result);
        
    } catch (error) {
        console.error('Subscription payment error:', error);
        ErrorHandler.show(error.message || 'Payment failed. Please try again or contact support.');
    } finally {
        LoadingManager.hide(submitButton);
    }
}
// Check subscription status and show alerts
// In your checkSubscriptionStatus function:
async function checkSubscriptionStatus() {
    try {
        // Refresh subscription status from server
        await fetchSubscriptionStatus();
        
        if (!subscriptionStatus.success || !subscriptionStatus.community) {
            return;
        }
        
        // Remove existing alerts to avoid duplicates
        const existingAlerts = document.querySelectorAll('.subscription-alert');
        existingAlerts.forEach(alert => alert.remove());
        
        const status = subscriptionStatus.community.subscriptionStatus?.toLowerCase();
        
        if (subscriptionStatus.isExpired) {
            // Automatically open payment modal if subscription is expired
            openSubscriptionPaymentModal();
            
            showSubscriptionAlert(
                'Your subscription has expired. Please renew to continue using all features.',
                'error'
            );
        } else if (status === 'pending') {
            showSubscriptionAlert(
                'Your subscription payment is pending. Please complete the payment to activate your subscription.',
                'warning'
            );
        } else if (status === 'active') {
            const daysLeft = subscriptionStatus.daysUntilExpiry || 0;
            
            if (daysLeft > 0) {
                // Show positive alert for active subscription with days remaining
                showSubscriptionAlert(
                    `Your subscription is active. ${daysLeft} day(s) remaining until renewal.`,
                    'success'
                );
            }
            
            if (subscriptionStatus.isExpiringSoon) {
                showSubscriptionAlert(
                    `Your subscription expires in ${daysLeft} day(s). Please renew to avoid service interruption.`,
                    'warning'
                );
            }
        }
        
        // Update subscription button and dashboard
        updateSubscriptionButton();
        updateSubscriptionDashboard();
        
    } catch (error) {
        console.error('Error checking subscription status:', error);
    }
}

function showSubscriptionAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `subscription-alert alert-${type}`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: ${type === 'error' ? '#dc3545' : 
                    type === 'success' ? '#28a745' : '#ffc107'};
        color: white;
        padding: 15px;
        text-align: center;
        z-index: 1000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        animation: slideDown 0.3s ease-out;
    `;
    
    alertDiv.innerHTML = `
        <div class="alert-content" style="display: flex; justify-content: center; align-items: center; gap: 15px; max-width: 1200px; margin: 0 auto;">
            <span class="alert-message" style="flex: 1; text-align: center;">${escapeHtml(message)}</span>
            <button onclick="handleSubscriptionButtonClick()" 
                    style="background: white; 
                           color: ${type === 'error' ? '#dc3545' : 
                                   type === 'success' ? '#28a745' : '#ffc107'}; 
                           border: none; 
                           padding: 8px 16px; 
                           border-radius: 4px; 
                           cursor: pointer; 
                           font-weight: bold;">
                View Details
            </button>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 30px; height: 30px;">×</button>
        </div>
    `;
    
    document.body.insertBefore(alertDiv, document.body.firstChild);
    
    // Auto-hide after 10 seconds for success messages, 30 seconds for warnings
    const timeout = type === 'success' ? 10000 : 30000;
    
    if (type !== 'error') {
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.style.animation = 'slideDown 0.3s ease-out reverse';
                setTimeout(() => alertDiv.remove(), 300);
            }
        }, timeout);
    }
}

function generateTransactionId() {
    return 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Remaining code to complete the JavaScript functionality

// Complete the showPaymentSuccessMessage function from first document
function showPaymentSuccessMessage(paymentResult) {
    const successDiv = document.createElement('div');
    successDiv.className = 'payment-success-notification';
    successDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 1001;
        max-width: 500px;
        width: 90%;
        text-align: center;
    `;
    
    successDiv.innerHTML = `
        <div class="success-content">
            <div style="color: #28a745; font-size: 48px; margin-bottom: 20px;">✅</div>
            <h3 style="color: #28a745; margin-bottom: 20px;">Payment Successful!</h3>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 20px; text-align: left;">
                <p><strong>Transaction ID:</strong> ${escapeHtml(paymentResult.transactionId || 'N/A')}</p>
                <p><strong>Plan:</strong> ${escapeHtml(paymentResult.planName || 'N/A')}</p>
                <p><strong>Amount:</strong> ₹${(paymentResult.amount || 0).toLocaleString()}</p>
                <p><strong>Valid Until:</strong> ${paymentResult.planEndDate ? formatDate(paymentResult.planEndDate) : 'N/A'}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                Close
            </button>
        </div>
    `;
    
    document.body.appendChild(successDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (successDiv.parentElement) {
            successDiv.remove();
        }
    }, 10000);
}

// Plan change functionality
function changePlan(newPlan) {
    if (!subscriptionPlans[newPlan]) {
        ErrorHandler.show('Invalid plan selected', 'error');
        return;
    }
    
    const plan = subscriptionPlans[newPlan];
    const confirmMessage = `Are you sure you want to change to ${plan.name} (₹${plan.price.toLocaleString()}/${plan.duration})?`;
    
    if (confirm(confirmMessage)) {
        // Update community data temporarily for the payment process
        communityData.subscriptionPlan = newPlan;
        openSubscriptionPaymentModal();
    }
}

// Enhanced subscription dashboard update
function updateSubscriptionDashboard() {
    const currentPlanElement = document.getElementById('currentPlan');
    const planStatusElement = document.getElementById('planStatus');
    const planExpiryElement = document.getElementById('planExpiryDate');
    const planFeaturesElement = document.getElementById('planFeatures');
    
    if (subscriptionStatus.success && subscriptionStatus.community) {
        const currentPlan = subscriptionPlans[subscriptionStatus.community.subscriptionPlan] || subscriptionPlans.basic;
        
        if (currentPlanElement) {
            currentPlanElement.textContent = currentPlan.name;
        }
        
        if (planStatusElement) {
            planStatusElement.textContent = subscriptionStatus.community.subscriptionStatus || 'Unknown';
            planStatusElement.className = `status-${subscriptionStatus.community.subscriptionStatus}`;
            planStatusElement.style.color = getSubscriptionStatusColor(subscriptionStatus.community.subscriptionStatus);
        }
        
        if (planExpiryElement && subscriptionStatus.community.planEndDate) {
            const expiryDate = formatDate(subscriptionStatus.community.planEndDate);
            planExpiryElement.textContent = expiryDate;
            
            if (subscriptionStatus.isExpiringSoon) {
                planExpiryElement.style.color = '#ff6b6b';
                planExpiryElement.textContent += ' (Expiring Soon!)';
            } else if (subscriptionStatus.isExpired) {
                planExpiryElement.style.color = '#dc3545';
                planExpiryElement.textContent += ' (Expired)';
            }
        } else if (planExpiryElement) {
            planExpiryElement.textContent = 'Not Set';
        }
        
        if (planFeaturesElement) {
            planFeaturesElement.innerHTML = `
                <ul style="list-style: none; padding: 0;">
                    ${currentPlan.features.map(feature => `
                        <li style="padding: 5px 0; border-bottom: 1px solid #eee;">
                            <span style="color: #28a745;">✓</span> ${escapeHtml(feature)}
                        </li>
                    `).join('')}
                </ul>
            `;
        }
    }
}

// Enhanced payment method validation
function validatePaymentMethod(paymentMethod) {
    const validMethods = ['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet'];
    return validMethods.includes(paymentMethod);
}

// Enhanced bulk payment with better error handling
async function createBulkPaymentForResident(resident, paymentData) {
    try {
        const fullPaymentData = {
            ...paymentData,
            senderId: resident._id,
            receiverId: currentUser._id || communityData.managerId,
            paymentDeadline: paymentData.paymentDeadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        };
        
        const result = await ApiClient.post('/manager/payments', fullPaymentData);
        return { success: true, resident: resident.residentFirstname, result };
    } catch (error) {
        console.error(`Failed to create payment for ${resident.residentFirstname}:`, error);
        return { success: false, resident: resident.residentFirstname, error: error.message };
    }
}

// Enhanced bulk payment handler with progress tracking
async function handleBulkPaymentSubmit(event) {
    event.preventDefault();
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    const progressDiv = document.getElementById('bulkPaymentProgress');
    
    LoadingManager.show(submitButton, 'Creating payments...');
    
    try {
        const title = document.getElementById('bulkPaymentTitle')?.value?.trim();
        const amount = parseFloat(document.getElementById('bulkPaymentAmount')?.value || 0);
        const remarks = document.getElementById('bulkPaymentRemarks')?.value?.trim();
        const paymentDeadline = document.getElementById('bulkPaymentDeadline')?.value;

        // Validation
        if (!title || amount <= 0) {
            throw new Error('Please fill in all required fields with valid values');
        }

        if (!residents || residents.length === 0) {
            throw new Error('No residents found. Please try again later.');
        }

        const paymentData = {
            title,
            amount,
            status: 'Pending',
            paymentMethod: 'None',
            remarks: remarks || '',
            paymentDeadline: paymentDeadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        // Show progress if element exists
        if (progressDiv) {
            progressDiv.style.display = 'block';
            progressDiv.innerHTML = `
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="progress-text">Processing 0 of ${residents.length} residents...</div>
            `;
        }

        let successCount = 0;
        let failCount = 0;
        const failedResidents = [];

        // Process each resident with progress updates
        for (let i = 0; i < residents.length; i++) {
            const resident = residents[i];
            const result = await createBulkPaymentForResident(resident, paymentData);
            
            if (result.success) {
                successCount++;
            } else {
                failCount++;
                failedResidents.push(result);
            }
            
            // Update progress
            if (progressDiv) {
                const progress = ((i + 1) / residents.length) * 100;
                const progressFill = progressDiv.querySelector('.progress-fill');
                const progressText = progressDiv.querySelector('.progress-text');
                
                if (progressFill) progressFill.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `Processing ${i + 1} of ${residents.length} residents...`;
            }
        }

        // Hide progress
        if (progressDiv) {
            progressDiv.style.display = 'none';
        }

        // Show results
        let message;
        let messageType;
        
        if (failCount === 0) {
            message = `Successfully created ${successCount} payment requests`;
            messageType = 'success';
        } else if (successCount === 0) {
            message = `Failed to create any payment requests. Please check your connection and try again.`;
            messageType = 'error';
        } else {
            message = `Created ${successCount} payments successfully. ${failCount} failed.`;
            messageType = 'warning';
            
            // Log failed residents for debugging
            console.warn('Failed residents:', failedResidents);
        }
        
        ErrorHandler.show(message, messageType);
        closeBulkPaymentModal();
        await fetchPaymentsData(); // Refresh data
        
    } catch (error) {
        console.error('Bulk payment error:', error);
        ErrorHandler.show(error.message || 'Failed to create payments. Please try again.');
        
        // Hide progress on error
        if (progressDiv) {
            progressDiv.style.display = 'none';
        }
    } finally {
        LoadingManager.hide(submitButton);
    }
}

// Enhanced subscription status checker with better logic
// Enhanced subscription status checker with automatic modal opening
async function checkSubscriptionStatus() {
    try {
        // Refresh subscription status from server
        await fetchSubscriptionStatus();
        
        if (!subscriptionStatus.success || !subscriptionStatus.community) {
            return;
        }
        
        // Remove existing alerts to avoid duplicates
        const existingAlerts = document.querySelectorAll('.subscription-alert');
        existingAlerts.forEach(alert => alert.remove());
        
        const status = subscriptionStatus.community.subscriptionStatus?.toLowerCase();
        
        if (subscriptionStatus.isExpired) {
            // Automatically open payment modal if subscription is expired
            openSubscriptionPaymentModal();
            
            showSubscriptionAlert(
                'Your subscription has expired. Please renew to continue using all features.',
                'error'
            );
        } else if (status === 'pending') {
            showSubscriptionAlert(
                'Your subscription payment is pending. Please complete the payment to activate your subscription.',
                'warning'
            );
        } else if (subscriptionStatus.isExpiringSoon) {
            const days = subscriptionStatus.daysUntilExpiry || 0;
            showSubscriptionAlert(
                `Your subscription expires in ${days} day(s). Please renew to avoid service interruption.`,
                'warning'
            );
        }
        
        // Update subscription button and dashboard
        updateSubscriptionButton();
        updateSubscriptionDashboard();
        
    } catch (error) {
        console.error('Error checking subscription status:', error);
    }
}

// Enhanced subscription alert with better styling
function showSubscriptionAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `subscription-alert alert-${type}`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: ${type === 'error' ? '#dc3545' : '#ffc107'};
        color: white;
        padding: 15px;
        text-align: center;
        z-index: 1000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        animation: slideDown 0.3s ease-out;
    `;
    
    alertDiv.innerHTML = `
        <div class="alert-content" style="display: flex; justify-content: center; align-items: center; gap: 15px; max-width: 1200px; margin: 0 auto;">
            <span class="alert-message" style="flex: 1; text-align: center;">${escapeHtml(message)}</span>
            <button onclick="handleSubscriptionButtonClick()" 
                    style="background: white; color: ${type === 'error' ? '#dc3545' : '#ffc107'}; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                ${subscriptionStatus.isExpired ? 'Renew Now' : 'View Details'}
            </button>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 30px; height: 30px;">×</button>
        </div>
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { transform: translateY(-100%); }
            to { transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.insertBefore(alertDiv, document.body.firstChild);
    
    // Auto-hide after 30 seconds for warnings (not for errors)
    if (type === 'warning') {
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.style.animation = 'slideDown 0.3s ease-out reverse';
                setTimeout(() => alertDiv.remove(), 300);
            }
        }, 30000);
    }
}

// Utility function to format currency
function formatCurrency(amount) {
    return `₹${(amount || 0).toLocaleString('en-IN')}`;
}

// Utility function to calculate days between dates
function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round((date2 - date1) / oneDay);
}

// Enhanced date formatting with relative time
function formatDateWithRelative(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = daysBetween(now, date);
        
        const formattedDate = date.toLocaleDateString('en-IN');
        
        if (diffDays === 0) {
            return `${formattedDate} (Today)`;
        } else if (diffDays === 1) {
            return `${formattedDate} (Tomorrow)`;
        } else if (diffDays === -1) {
            return `${formattedDate} (Yesterday)`;
        } else if (diffDays > 0 && diffDays <= 7) {
            return `${formattedDate} (In ${diffDays} days)`;
        } else if (diffDays < 0 && diffDays >= -7) {
            return `${formattedDate} (${Math.abs(diffDays)} days ago)`;
        }
        
        return formattedDate;
    } catch {
        return 'Invalid Date';
    }
}

// Export enhanced utilities for global access
window.PaymentUtils = {
    formatCurrency,
    formatDateWithRelative,
    daysBetween,
    validatePaymentMethod,
    generateTransactionId
};

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    ErrorHandler.show('An unexpected error occurred. Please try again.');
});

// Initialize tooltips and other UI enhancements
function initializeUIEnhancements() {
    // Add loading states to all buttons
    const buttons = document.querySelectorAll('button[type="submit"]');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.form && !this.form.checkValidity()) {
                return;
            }
            LoadingManager.show(this);
        });
    });
    
    // Add form validation styling
    const inputs = document.querySelectorAll('input[required], select[required]');
    inputs.forEach(input => {
        input.addEventListener('invalid', function() {
            this.style.borderColor = '#dc3545';
            this.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
        });
        
        input.addEventListener('input', function() {
            if (this.validity.valid) {
                this.style.borderColor = '';
                this.style.boxShadow = '';
            }
        });
    });
}