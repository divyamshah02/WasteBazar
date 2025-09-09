/**
 * Buyer Profile Script for WasteBazar
 * Handles buyer profile page functionality and API integration
 */

// Global variables
let csrf_token = null;
let userDetailsApiUrl = null;
let requirementsApiUrl = null;
let buyerDetailApiUrl = "/user-api/buyer-detail-api/";
let currentUserId = null;
let buyerData = null;

/**
 * Main function to initialize buyer profile app
 */
async function BuyerProfileApp(csrf_token_param, userDetailsApiUrl_param, requirementsApiUrl_param) {
    try {
        csrf_token = csrf_token_param;
        userDetailsApiUrl = userDetailsApiUrl_param;
        requirementsApiUrl = requirementsApiUrl_param;
        // purchasesApiUrl = purchasesApiUrl_param;

        console.log('🚀 Buyer Profile App initialized');

        // Initialize the app
        await initializeApp();
    } catch (error) {
        console.error('❌ Failed to initialize Buyer Profile App:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        // Get current user ID from localStorage
        getCurrentUserId();

        // Set up tab functionality
        setupTabs();

        // Initialize logout button
        initializeSimpleLogout();

        // Set up field highlighting removal listeners
        setupFieldHighlightingListeners();

        // Load all data
        await loadAllData();

    } catch (error) {
        console.error('❌ Error during initialization:', error);
        showError('Error loading data. Please try again.');
    }
}

function getCurrentUserId() {
    currentUserId = localStorage.getItem('user_id');

    // Check if user is logged in
    if (!currentUserId) {
        console.log('❌ No user ID found in localStorage');
        showError('Please login to access your profile.');
        setTimeout(() => {
            window.location.href = '/login/';
        }, 2000);
        return;
    }

    console.log('👤 Current user ID:', currentUserId);
}

/**
 * Load all data from APIs
 */
async function loadAllData() {
    try {
        // Load buyer profile first
        await loadBuyerProfile();

        // Load requirements
        await loadRequirements();


    } catch (error) {
        console.error('❌ Error loading data:', error);
        showError('Error loading profile data.');
    }
}

async function loadBuyerProfile() {
    try {
        console.log('📥 Loading buyer profile...');

        const [success, response] = await callApi('GET', `${buyerDetailApiUrl}${currentUserId}/`, null, csrf_token);

        if (success && response.success) {
            buyerData = response.data;
            console.log('✅ Buyer profile loaded:', buyerData);
            // Render profile data
            renderProfileData();

        } else {
            console.error('❌ Failed to load buyer profile:', response.error);
            showError(response.error || 'Failed to load profile');
        }
    } catch (error) {
        console.error('❌ Error loading buyer profile:', error);
        showError('Network error. Please try again.');
    }
}

/**
 * Render profile data in HTML elements
 */
function renderProfileData() {
    if (!buyerData) return;

    const userDetails = buyerData.user_details;
    const corporateDetails = buyerData.corporate_details;
    const walletDetails = buyerData.wallet_details;

    // Update profile header
    updateProfileHeader(userDetails, corporateDetails);



    // Update contact information
    updateContactInfo(userDetails, corporateDetails);

    // Update settings information
    updateSettingsInfo(userDetails, corporateDetails);

    // Update wallet information
    updateWalletInfo(walletDetails);

    // Update verification status (only for corporate users)
    if (userDetails.role === 'buyer_corporate') {
        updateVerificationStatus(userDetails, corporateDetails);
    }
}

/**
 * Update profile header elements
 */
function updateProfileHeader(userDetails, corporateDetails) {
    const profileNameEl = document.getElementById('profileName');
    const profileLocationEl = document.getElementById('profileLocation');

    const isIndividual = userDetails.role === 'buyer_individual';
    const displayName = userDetails.name || 'Buyer';

    // Update elements if they exist
    if (profileNameEl) profileNameEl.textContent = displayName;

    // Update profile badges
    const profileInfo = document.querySelector('.profile-info .profile-details');
    if (profileInfo) {
        const companyName = corporateDetails && corporateDetails.company_name ? corporateDetails.company_name : '';

        // Update badges section
        const badgesSection = profileInfo.querySelector('.profile-badges');
        if (badgesSection) {
            let verificationBadge = '';
            if (!isIndividual && corporateDetails) {
                if (corporateDetails.is_approved) {
                    verificationBadge = '<span class="profile-badge"><i class="fas fa-check-circle me-1"></i>Verified</span>';
                }
            }

            badgesSection.innerHTML = `
                <span class="profile-badge">
                    <i class="fas fa-${isIndividual ? 'user' : 'building'} me-1"></i>${isIndividual ? 'Individual' : 'Corporate'}
                </span>
                ${verificationBadge}
            `;
        }

        // Add company name if corporate
        const existingCompanyP = profileInfo.querySelector('.company-name');
        if (companyName && !isIndividual) {
            if (!existingCompanyP) {
                const companyP = document.createElement('p');
                companyP.className = 'mb-2 text-white-50 company-name';
                companyP.textContent = companyName;
                profileInfo.insertBefore(companyP, badgesSection);
            } else {
                existingCompanyP.textContent = companyName;
            }
        } else if (existingCompanyP) {
            existingCompanyP.remove();
        }
    }

    // Update location
    if (profileLocationEl && corporateDetails && corporateDetails.address) {
        profileLocationEl.textContent = corporateDetails.address;
    }
}

/**
 * Update contact information in sidebar
 */
function updateContactInfo(userDetails, corporateDetails) {
    // Determine if user is corporate
    const isCorporate = userDetails.role === 'buyer_corporate';

    // Update contact info card title and content based on user type
    const contactInfoTitleText = document.getElementById('contactInfoTitleText');
    const contactInfoIcon = document.getElementById('contactInfoIcon');
    const companyNameLabel = document.getElementById('companyNameLabel');
    const companyNameValue = document.getElementById('companyNameValue');
    const companyNameIcon = document.getElementById('companyNameIcon');

    if (isCorporate) {
        // Corporate user - show company information
        if (contactInfoTitleText) contactInfoTitleText.textContent = 'Company Information';
        if (contactInfoIcon) {
            contactInfoIcon.className = 'fas fa-building';
        }
        if (companyNameLabel) companyNameLabel.textContent = 'Company Name';
        if (companyNameIcon) companyNameIcon.className = 'fas fa-building';
        if (companyNameValue) {
            companyNameValue.textContent = (corporateDetails && corporateDetails.company_name)
                ? corporateDetails.company_name
                : 'Not provided';
        }
    } else {
        // Individual user - show buyer information
        if (contactInfoTitleText) contactInfoTitleText.textContent = 'Buyer Information';
        if (contactInfoIcon) {
            contactInfoIcon.className = 'fas fa-user';
        }
        if (companyNameLabel) companyNameLabel.textContent = 'Buyer Name';
        if (companyNameIcon) companyNameIcon.className = 'fas fa-user';
        if (companyNameValue) {
            companyNameValue.textContent = userDetails.name || 'Not provided';
        }
    }

    // Update email (common for both)
    const companyCard = document.querySelector('#contactInfoCard');
    if (companyCard) {
        const contactItems = companyCard.querySelectorAll('.contact-item');

        // Update email (second contact item)
        if (contactItems[1]) {
            const valueEl = contactItems[1].querySelector('.contact-value');
            if (valueEl) valueEl.textContent = userDetails.email || 'Not provided';
        }

        // Update address (third contact item if exists)
        if (contactItems[2]) {
            const valueEl = contactItems[2].querySelector('.contact-value');
            if (valueEl) {
                if (isCorporate && corporateDetails && corporateDetails.address) {
                    valueEl.textContent = corporateDetails.address;
                } else if (!isCorporate && userDetails.addressline1) {
                    // For individual users, show their address
                    let address = userDetails.addressline1;
                    if (userDetails.addressline2) address += ', ' + userDetails.addressline2;
                    if (userDetails.city) address += ', ' + userDetails.city;
                    if (userDetails.state) address += ', ' + userDetails.state;
                    if (userDetails.address_pincode) address += ' - ' + userDetails.address_pincode;
                    valueEl.textContent = address;
                } else {
                    valueEl.textContent = 'Not provided';
                }
            }
        }
    }

    console.log(`✅ Updated contact info for ${isCorporate ? 'corporate' : 'individual'} user`);
}

/**
 * Update settings information
 */
function updateSettingsInfo(userDetails, corporateDetails) {
    // Update profile information fields with values and placeholders
    const fullNameEl = document.getElementById('fullName');
    const emailEl = document.getElementById('email');
    const phoneEl = document.getElementById('phone');
    const userTypeEl = document.getElementById('userType');
    const addressEl = document.getElementById('address');

    if (fullNameEl) {
        fullNameEl.value = userDetails.name || '';
        fullNameEl.placeholder = userDetails.name || 'Enter your full name';
    }
    if (emailEl) {
        emailEl.value = userDetails.email || '';
        emailEl.placeholder = userDetails.email || 'Enter your email address';
    }
    if (phoneEl) {
        phoneEl.value = userDetails.contact_number || '';
        phoneEl.placeholder = userDetails.contact_number || 'Enter your phone number';
    }
    if (userTypeEl) {
        userTypeEl.value = userDetails.role || 'buyer_individual';
    }
    if (addressEl) {
        addressEl.value = userDetails.address || '';
        addressEl.placeholder = userDetails.address || 'Enter your address';
    }

    // Update new address fields with values and placeholders
    const addressLine1El = document.getElementById('addressline1');
    const addressLine2El = document.getElementById('addressline2');
    const cityEl = document.getElementById('cityname');
    const stateEl = document.getElementById('statename');
    const pincodeEl = document.getElementById('addresspincode');

    if (addressLine1El) {
        addressLine1El.value = userDetails.addressline1 || '';
        addressLine1El.placeholder = userDetails.addressline1 || 'Enter address line 1';
    }
    if (addressLine2El) {
        addressLine2El.value = userDetails.addressline2 || '';
        addressLine2El.placeholder = userDetails.addressline2 || 'Enter address line 2 (optional)';
    }
    if (cityEl) {
        cityEl.value = userDetails.city || '';
        cityEl.placeholder = userDetails.city || 'Enter city name';
    }
    if (stateEl) {
        stateEl.value = userDetails.state || '';
        stateEl.placeholder = userDetails.state || 'Enter state name';
    }
    if (pincodeEl) {
        pincodeEl.value = userDetails.address_pincode || '';
        pincodeEl.placeholder = userDetails.address_pincode || 'Enter pincode';
    }

    // Update ID fields based on available data
    const idSelectEl = document.getElementById('individualIdSelect');
    const panNumberEl = document.getElementById('panNumber');
    const aadharNumberEl = document.getElementById('individualAadharNumber');

    if (userDetails.pan_number) {
        if (idSelectEl) idSelectEl.value = 'pan';
        if (panNumberEl) {
            panNumberEl.value = userDetails.pan_number;
            panNumberEl.placeholder = userDetails.pan_number || 'Enter PAN number';
        }
        toggleIdFields('pan');
    } else if (userDetails.aadhar_number) {
        if (idSelectEl) idSelectEl.value = 'aadhar';
        if (aadharNumberEl) {
            aadharNumberEl.value = userDetails.aadhar_number;
            aadharNumberEl.placeholder = userDetails.aadhar_number || 'Enter Aadhar number';
        }
        toggleIdFields('aadhar');
    } else {
        // Default to PAN if no ID data available
        if (idSelectEl) idSelectEl.value = 'pan';
        if (panNumberEl) panNumberEl.placeholder = 'Enter PAN number';
        if (aadharNumberEl) aadharNumberEl.placeholder = 'Enter Aadhar number';
        toggleIdFields('pan');
    }

    // Show/hide individual fields based on user type
    const individualFields = document.getElementById('individualFields');
    const isCorporate = userDetails.role === 'buyer_corporate';

    if (individualFields) {
        if (isCorporate) {
            individualFields.style.display = 'none';
        } else {
            individualFields.style.display = 'block';
        }
    }

    // Show/hide and populate company information card
    const companyInfoCard = document.getElementById('companyInfoCard');

    if (companyInfoCard) {
        if (isCorporate && corporateDetails && !corporateDetails.message) {
            companyInfoCard.style.display = 'block';
            updateCompanySettings(corporateDetails);
        } else {
            companyInfoCard.style.display = 'none';
        }
    }

    // Set address from corporate details if available (backward compatibility)
    if (addressEl && corporateDetails && corporateDetails.address) {
        addressEl.value = corporateDetails.address;
    }

    // Set up PAN validation for individual and corporate PAN fields
    setupPanValidation('panNumber');           // Individual PAN field
    setupPanValidation('companyPanNumber');    // Company PAN field

    // Update profile completion status
    updateProfileCompletion(userDetails, corporateDetails);
}

/**
 * Update company settings information
 */
function updateCompanySettings(corporateDetails) {
    console.log('🏢 Updating company settings with:', corporateDetails);

    // Update basic company information
    const companyNameEl = document.getElementById('companyName');
    if (companyNameEl) {
        companyNameEl.value = corporateDetails.company_name || '';
        companyNameEl.placeholder = corporateDetails.company_name || 'Enter company name';
    }

    // Handle company ID type selection and fields
    const companyIdSelectEl = document.getElementById('companyIdSelect');
    const companyPanEl = document.getElementById('companyPanNumber');
    const companyCinEl = document.getElementById('companyCinNumber');
    const gstNumberEl = document.getElementById('gstNumber');

    // Determine which ID type to show based on available data
    if (corporateDetails.pan_number) {
        if (companyIdSelectEl) companyIdSelectEl.value = 'pan';
        if (companyPanEl) {
            companyPanEl.value = corporateDetails.pan_number;
            companyPanEl.placeholder = corporateDetails.pan_number || 'Enter PAN number';
        }
        toggleCompanyIdFields('pan');
    } else if (corporateDetails.cin_number) {
        if (companyIdSelectEl) companyIdSelectEl.value = 'cin';
        if (companyCinEl) {
            companyCinEl.value = corporateDetails.cin_number;
            companyCinEl.placeholder = corporateDetails.cin_number || 'Enter CIN number';
        }
        toggleCompanyIdFields('cin');
    } else {
        // Default to PAN if no ID data available
        if (companyIdSelectEl) companyIdSelectEl.value = 'pan';
        if (companyPanEl) companyPanEl.placeholder = 'Enter PAN number';
        if (companyCinEl) companyCinEl.placeholder = 'Enter CIN number';
        toggleCompanyIdFields('pan');
    }

    if (gstNumberEl) {
        gstNumberEl.value = corporateDetails.gst_number || '';
        gstNumberEl.placeholder = corporateDetails.gst_number || 'Enter GST number';
    }

    // Update company address
    const addressLine1El = document.getElementById('companyAddressLine1');
    const addressLine2El = document.getElementById('companyAddressLine2');
    const companyCityEl = document.getElementById('companyCity');
    const companyStateEl = document.getElementById('companyState');
    const companyPincodeEl = document.getElementById('companyPincode');

    if (addressLine1El) {
        addressLine1El.value = corporateDetails.addressline1 || '';
        addressLine1El.placeholder = corporateDetails.addressline1 || 'Enter address line 1';
    }
    if (addressLine2El) {
        addressLine2El.value = corporateDetails.addressline2 || '';
        addressLine2El.placeholder = corporateDetails.addressline2 || 'Enter address line 2 (optional)';
    }
    if (companyCityEl) {
        companyCityEl.value = corporateDetails.city || '';
        companyCityEl.placeholder = corporateDetails.city || 'Enter city';
    }
    if (companyStateEl) {
        companyStateEl.value = corporateDetails.state || '';
        companyStateEl.placeholder = corporateDetails.state || 'Enter state';
    }
    if (companyPincodeEl) {
        companyPincodeEl.value = corporateDetails.address_pincode || '';
        companyPincodeEl.placeholder = corporateDetails.address_pincode || 'Enter pincode';
    }
}

/**
 * Update wallet information
 */
function updateWalletInfo(walletDetails) {
    if (walletDetails && !walletDetails.message) {
        const freeCredits = walletDetails.free_credits || 0;
        const paidCredits = walletDetails.paid_credits || 0;
        const totalCredits = freeCredits + paidCredits;

        // Update wallet details using specific IDs
        const freeCreditsEl = document.getElementById('freecredits');
        const paidCreditsEl = document.getElementById('paidcredits');
        const totalCreditsEl = document.getElementById('totalcredits');

        if (freeCreditsEl) freeCreditsEl.textContent = freeCredits;
        if (paidCreditsEl) paidCreditsEl.textContent = paidCredits;
        if (totalCreditsEl) totalCreditsEl.textContent = totalCredits;

        // Update reset date if available
        if (walletDetails.free_credit_reset_date) {
            const resetEl = document.querySelector('.wallet-item:last-child small');
            if (resetEl) {
                resetEl.innerHTML = `<i class="fas fa-clock me-1"></i>Credits reset on: ${formatDate(walletDetails.free_credit_reset_date)}`;
            }
        }

        // Update stats card
        const totalSpentEl = document.getElementById('totalSpent');
        if (totalSpentEl) totalSpentEl.textContent = totalCredits;

        // Add low credit warning if needed
        addCreditWarning(totalCredits);

        // Update post requirement button state
        updatePostRequirementButton(totalCredits);

    } else {
        console.log('⚠️ No wallet found for user');
        // Set default values using IDs
        const freeCreditsEl = document.getElementById('freecredits');
        const paidCreditsEl = document.getElementById('paidcredits');
        const totalCreditsEl = document.getElementById('totalcredits');
        const totalSpentEl = document.getElementById('totalSpent');

        if (freeCreditsEl) freeCreditsEl.textContent = '0';
        if (paidCreditsEl) paidCreditsEl.textContent = '0';
        if (totalCreditsEl) totalCreditsEl.textContent = '0';
        if (totalSpentEl) totalSpentEl.textContent = '0';

        // Add low credit warning for zero credits
        addCreditWarning(0);

        // Update post requirement button state for zero credits
        updatePostRequirementButton(0);
    }
}

/**
 * Add credit warning to wallet section if credits are low
 */
function addCreditWarning(totalCredits) {
    // Remove existing warning first
    const existingWarning = document.querySelector('.credit-warning');
    if (existingWarning) {
        existingWarning.remove();
    }

    if (totalCredits <= 1) {
        const walletDetails = document.querySelector('.wallet-details');
        if (walletDetails) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'credit-warning alert alert-warning mt-2 mb-0 p-2';
            warningDiv.style.fontSize = '0.85rem';
            warningDiv.innerHTML = `
                <i class="fas fa-exclamation-triangle me-1"></i>
                <strong>Low Credits!</strong><br>
                You need more than 1 credit to post requirements.
            `;
            walletDetails.appendChild(warningDiv);
        }
    }
}

/**
 * Update the "Post New Requirement" button state based on available credits
 */
function updatePostRequirementButton(totalCredits) {
    const postRequirementBtn = document.querySelector('button[onclick="postNewRequirement()"]');

    if (postRequirementBtn) {
        if (totalCredits <= 1) {
            // Disable button and update styling
            postRequirementBtn.disabled = true;
            postRequirementBtn.classList.add('disabled');
            postRequirementBtn.innerHTML = '<i class="fas fa-plus me-2 post-requirement-btn"></i>Insufficient Credits';
            postRequirementBtn.title = 'You need more than 1 credit to post a requirement';
            postRequirementBtn.style.opacity = '0.6';
            postRequirementBtn.style.cursor = 'not-allowed';
        } else {
            // Enable button and restore styling
            postRequirementBtn.disabled = false;
            postRequirementBtn.classList.add('post-requirement-btn');
            postRequirementBtn.classList.remove('disabled');
            postRequirementBtn.innerHTML = '<i class="fas fa-plus me-2"></i>Post New Requirement';
            postRequirementBtn.title = '';
            postRequirementBtn.style.opacity = '1';
            postRequirementBtn.style.cursor = 'pointer';
        }
    }
}

async function loadRequirements() {
    try {
        console.log('📋 Loading requirements...');

        if (!requirementsApiUrl) {
            console.log('⚠️ Requirements API URL not provided');
            renderRequirements([]);
            return;
        }

        const [success, response] = await callApi('GET', `${requirementsApiUrl}${currentUserId}/`, null, csrf_token);

        if (success && response.success) {
            const requirements = response.data || [];
            console.log('✅ Requirements loaded:', requirements);

            renderRequirements(requirements);
            updateRequirementsStats(requirements);
        } else {
            console.error('❌ Failed to load requirements:', response.error);
            renderRequirements([]);
        }
    } catch (error) {
        console.error('❌ Error loading requirements:', error);
        renderRequirements([]);
    }
}

/**
 * Render requirements in the requirements tab
 */
function renderRequirements(requirements) {
    const container = document.getElementById('requirementsList');
    if (!container) return;

    if (!requirements || requirements.length === 0) {
        // Check credit status for empty state
        let buttonHtml = '';
        let messageHtml = '<p class="text-muted">Start by posting your first requirement!</p>';

        if (buyerData && buyerData.wallet_details && !buyerData.wallet_details.message) {
            const freeCredits = buyerData.wallet_details.free_credits || 0;
            const paidCredits = buyerData.wallet_details.paid_credits || 0;
            const totalCredits = freeCredits + paidCredits;

            if (totalCredits <= 1) {
                messageHtml = `
                    <p class="text-muted">You need more than 1 credit to post requirements.</p>
                    <p class="text-info">Current credits: ${totalCredits}</p>
                `;
                buttonHtml = `
                    <button class="btn btn-secondary" disabled title="Insufficient credits">
                        <i class="fas fa-plus me-2"></i>Need More Credits
                    </button>
                    <br><br>
                    <button class="btn btn-primary">
                        <i class="fas fa-wallet me-2"></i>Buy Credits
                    </button>
                `;
            } else {
                buttonHtml = `
                    <button class="btn btn-primary post-requirement-btn" onclick="postNewRequirement()">
                        <i class="fas fa-plus me-2"></i>Post First Requirement
                    </button>
                `;
            }
        } else {
            buttonHtml = `
                <button class="btn btn-primary post-requirement-btn" onclick="postNewRequirement()">
                    <i class="fas fa-plus me-2"></i>Post First Requirement
                </button>
            `;
        }

        container.innerHTML = `
            <div class="empty-state text-center py-5">
                <div class="empty-icon mb-3">
                    <i class="fas fa-list-alt fa-3x text-muted"></i>
                </div>
                <h4>No Requirements Yet</h4>
                ${messageHtml}
              
            </div>
        `;
        return;
    }

    container.innerHTML = requirements.map(requirement => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h5 class="card-title mb-1">${requirement.title || requirement.category || 'Requirement'}</h5>
                        <small class="text-muted">#${requirement.requirement_id}</small>
                    </div>
                    <span class="badge bg-${getStatusBadgeColor(requirement.status)}">${getStatusLabel(requirement.status)}</span>
                </div>
                
                <div class="row mb-3">
                    <div class="col-md-6">
                        <i class="fas fa-weight-hanging me-2 text-primary"></i>
                        <strong>${requirement.quantity} ${requirement.unit || 'kg'}</strong>
                    </div>
                    <div class="col-md-6">
                        <i class="fas fa-map-marker-alt me-2 text-primary"></i>
                        ${requirement.city_location || 'Not specified'}${requirement.state_location ? ', ' + requirement.state_location : ''}
                    </div>
                </div>
                
                <p class="card-text">${requirement.description || 'No description available'}</p>
                
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>Created: ${formatDate(requirement.created_at)} | 
                            <i class="fas fa-clock me-1"></i>Valid until: ${formatDate(requirement.valid_until)}
                        </small>
                    </div>
                    <div class="requirement-actions">
                        <button class="btn-action btn-edit" onclick="editRequirement('${requirement.requirement_id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-action btn-pause" onclick="pauseRequirement('${requirement.requirement_id}')">
                            <i class="fas fa-pause"></i> Mark Fulfilled
                        </button>
                        <button class="btn-action btn-details" onclick="viewRequirementDetails('${requirement.requirement_id}')">
                            <i class="fas fa-eye"></i> Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Update requirements statistics
 */
function updateRequirementsStats(requirements) {
    const totalRequirementsEl = document.getElementById('totalRequirements');
    const activeRequirementsEl = document.getElementById('activeRequirements');
    const completedDealsEl = document.getElementById('completedDeals');

    const totalRequirements = requirements.length;
    const activeRequirements = requirements.filter(r => r.status === 'active' || r.status === 'approved').length;
    const completedDeals = requirements.filter(r => r.status === 'completed').length;

    if (totalRequirementsEl) totalRequirementsEl.textContent = totalRequirements;
    if (activeRequirementsEl) activeRequirementsEl.textContent = activeRequirements;
    if (completedDealsEl) completedDealsEl.textContent = completedDeals;
}



/**
 * Render purchase history in the history tab
 */
function renderPurchaseHistory(purchases) {
    const container = document.getElementById('purchaseHistory');
    if (!container) return;

    if (!purchases || purchases.length === 0) {
        container.innerHTML = `
            <div class="empty-state text-center py-5">
                <div class="empty-icon mb-3">
                    <i class="fas fa-history fa-3x text-muted"></i>
                </div>
                <h4>No Purchase History</h4>
                <p class="text-muted">Your purchase history will appear here once you start buying.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = purchases.map(purchase => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h5 class="card-title mb-1">${purchase.item_name || purchase.title || 'Purchase'}</h5>
                        <small class="text-muted">Enquiry ID: #${purchase.purchase_id}</small>
                    </div>
                    <span class="badge bg-${getStatusBadgeColor(purchase.status)}">${getStatusLabel(purchase.status)}</span>
                </div>
                
                <div class="row mb-3">
                    <div class="col-md-3">
                        <strong>Seller:</strong><br>
                        <span class="text-muted">${purchase.seller_name || 'Not available'}</span>
                    </div>
                    <div class="col-md-3">
                        <strong>Quantity:</strong><br>
                        <span class="text-muted">${purchase.quantity} ${purchase.unit || 'kg'}</span>
                    </div>
                    <div class="col-md-3">
                        <strong>Price:</strong><br>
                        <span class="text-muted">₹${purchase.price}/${purchase.unit || 'kg'}</span>
                    </div>
                    <div class="col-md-3">
                        <strong>Total:</strong><br>
                        <span class="text-success fw-bold">₹${purchase.total_amount || (purchase.quantity * purchase.price)}</span>
                    </div>
                </div>
                
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <i class="fas fa-map-marker-alt me-2 text-primary"></i>
                        <span class="text-muted">${purchase.location || 'Location not specified'}</span>
                        <span class="mx-2">|</span>
                        <i class="fas fa-calendar me-2 text-primary"></i>
                        <span class="text-muted">${formatDate(purchase.purchase_date || purchase.created_at)}</span>
                    </div>
                    
                </div>
                
                ${purchase.comment ? `
                    <div class="purchase-comment mt-3">
                        <div class="comment-icon">
                           <i class="fas fa-comment-alt text-white"></i>
                        </div>
                        <div class="comment-content mt-1">
                            <span class="comment-label">Note: </span>
                            <span class="comment-text">${purchase.comment}</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button-home');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetTab = this.dataset.tab;

            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            this.classList.add('active');

            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            console.log(`📑 Switched to ${targetTab} tab`);
        });
    });
}

/**
 * Utility functions
 */
function getStatusBadgeColor(status) {
    const colors = {
        'active': 'success',
        'approved': 'success',
        'pending': 'warning',
        'under_review': 'info',
        'rejected': 'danger',
        'inactive': 'secondary',
        'completed': 'success',
        'cancelled': 'danger'
    };
    return colors[status] || 'secondary';
}

function getStatusLabel(status) {
    const labels = {
        'active': 'Active',
        'approved': 'Approved',
        'pending': 'Pending Review',
        'under_review': 'Under Review',
        'rejected': 'Rejected',
        'inactive': 'Inactive',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
    };
    return labels[status] || status;
}



function formatDate(dateString) {
    if (!dateString) return 'Not set';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showError(message) {
    console.error('Error:', message);

    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    errorDiv.style.zIndex = '9999';
    errorDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(errorDiv);

    setTimeout(() => {
        if (errorDiv && errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

function showSuccess(message) {
    console.log('Success:', message);

    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    successDiv.style.zIndex = '9999';
    successDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(successDiv);

    setTimeout(() => {
        if (successDiv && successDiv.parentNode) {
            successDiv.remove();
        }
    }, 3000);
}

// Global action functions for requirement and purchase actions
function postNewRequirement() {
    console.log('📝 Post new requirement clicked');

    // Check if user has sufficient credits
    if (buyerData && buyerData.wallet_details && !buyerData.wallet_details.message) {
        const freeCredits = buyerData.wallet_details.free_credits || 0;
        const paidCredits = buyerData.wallet_details.paid_credits || 0;
        const totalCredits = freeCredits + paidCredits;

        if (totalCredits <= 1) {
            showError('You need more than 1 credit to post a new requirement. Please purchase credits to continue.');
            return;
        }
    } else {
        showError('Unable to check credit balance. Please try again.');
        return;
    }

    // If credits are sufficient, redirect to requirement form
    window.location.href = '/requirement-form/';
}

function editRequirement(requirementId) {
    console.log('✏️ Edit requirement:', requirementId);
    window.location.href = `/requirement-form/?edit=${requirementId}`;
}

function pauseRequirement(requirementId) {
    console.log('⏸️ Pause requirement:', requirementId);
    if (confirm('Are you sure you want to pause this requirement?')) {
        // This would need API implementation
        console.log('Requirement paused:', requirementId);
    }
}

function viewRequirementDetails(requirementId) {
    console.log('👁️ View requirement details:', requirementId);
    window.location.href = `/requirement-detail/?id=${requirementId}`;
}

function viewPurchaseDetails(purchaseId) {
    console.log('👁️ View purchase details:', purchaseId);
    window.location.href = `/purchase-detail/?id=${purchaseId}`;
}

function editProfile() {
    console.log('👤 Edit profile clicked');
    // Scroll to settings tab
    const settingsTab = document.querySelector('[data-tab="settings"]');
    if (settingsTab) {
        settingsTab.click();
    }
}

// Settings form functions
function editProfile() {
    console.log('✏️ Edit profile clicked');
    toggleProfileEdit(true);
}

function editCompanyInfo() {
    console.log('🏢 Edit company info clicked');
    toggleCompanyEdit(true);
}

function toggleProfileEdit(enable) {
    // Get user type to determine which fields to enable
    const userTypeEl = document.getElementById('userType');
    const isCorporate = userTypeEl && userTypeEl.value === 'buyer_corporate';

    // Basic fields for all users
    const basicFields = ['fullName', 'email'];

    // Individual-specific fields (only for non-corporate users)
    const individualFields = ['addressline1', 'addressline2', 'cityname', 'statename', 'addresspincode', 'panNumber', 'individualAadharNumber'];
    const individualSelectFields = ['individualIdSelect'];

    const editBtn = document.querySelector('#profileForm').closest('.card').querySelector('.btn');

    // Handle basic fields (always editable)
    basicFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.readOnly = !enable;
            if (enable) {
                field.classList.add('editable');
            } else {
                field.classList.remove('editable');
            }
        }
    });

    // Handle individual-specific fields (only for non-corporate users)
    if (!isCorporate) {
        individualFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.readOnly = !enable;
                if (enable) {
                    field.classList.add('editable');
                } else {
                    field.classList.remove('editable');
                }
            }
        });

        // Handle select fields for individual users
        individualSelectFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.disabled = !enable;
                if (enable) {
                    field.classList.add('editable');
                } else {
                    field.classList.remove('editable');
                }
            }
        });

        // Add change event listener for ID type selection when in edit mode
        if (enable) {
            const idSelectField = document.getElementById('individualIdSelect');
            if (idSelectField) {
                idSelectField.addEventListener('change', function () {
                    toggleIdFields(this.value);
                });
            }
        }
    }

    if (enable) {
        editBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save Profile';
        editBtn.onclick = saveProfile;
    } else {
        editBtn.innerHTML = '<i class="fas fa-edit me-2"></i>Edit Profile';
        editBtn.onclick = editProfile;
    }
}

function toggleCompanyEdit(enable) {
    const companyTextFields = [
        'companyName', 'companyPanNumber', 'companyCinNumber', 'gstNumber',
        'companyAddressLine1', 'companyAddressLine2', 'companyCity', 'companyState', 'companyPincode'
    ];
    const companySelectFields = ['companyIdSelect'];
    const editBtn = document.getElementById('editCompanyBtn');

    // Handle text fields
    companyTextFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.readOnly = !enable;
            if (enable) {
                field.classList.add('editable');
            } else {
                field.classList.remove('editable');
            }
        }
    });

    // Handle select fields
    companySelectFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.disabled = !enable;
            if (enable) {
                field.classList.add('editable');
            } else {
                field.classList.remove('editable');
            }
        }
    });

    // Add change event listener for company ID type selection when in edit mode
    if (enable) {
        const companyIdSelectField = document.getElementById('companyIdSelect');
        if (companyIdSelectField) {
            companyIdSelectField.addEventListener('change', function () {
                toggleCompanyIdFields(this.value);
            });
        }
    }

    // Toggle button text and functionality
    if (enable) {
        editBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save Company Info';
        editBtn.onclick = saveCompanyInfo;
    } else {
        editBtn.innerHTML = '<i class="fas fa-edit me-2"></i>Edit Company Info';
        editBtn.onclick = editCompanyInfo;
    }
}

async function saveProfile() {
    try {
        console.log('💾 Saving profile changes...');

        // Get user type to determine which fields to save
        const userTypeEl = document.getElementById('userType');
        const isCorporate = userTypeEl && userTypeEl.value === 'buyer_corporate';

        // Prepare basic profile data (common for all users)
        const profileData = {
            name: document.getElementById('fullName').value,
            email: document.getElementById('email').value
            // Phone is now non-editable
        };

        // Add individual-specific fields only for non-corporate users
        if (!isCorporate) {
            // Add new address fields
            const addressLine1El = document.getElementById('addressline1');
            if (addressLine1El && addressLine1El.value) {
                profileData.addressline1 = addressLine1El.value;
            }

            const addressLine2El = document.getElementById('addressline2');
            if (addressLine2El && addressLine2El.value) {
                profileData.addressline2 = addressLine2El.value;
            }

            const cityEl = document.getElementById('cityname');
            if (cityEl && cityEl.value) {
                profileData.cityname = cityEl.value;
            }

            const stateEl = document.getElementById('statename');
            if (stateEl && stateEl.value) {
                profileData.statename = stateEl.value;
            }

            const pincodeEl = document.getElementById('addresspincode');
            if (pincodeEl && pincodeEl.value) {
                profileData.addresspincode = pincodeEl.value;
            }

            // Add ID type and number based on selection
            const idTypeEl = document.getElementById('individualIdSelect');
            if (idTypeEl) {
                const selectedIdType = idTypeEl.value;

                if (selectedIdType === 'pan') {
                    const panEl = document.getElementById('panNumber');
                    if (panEl && panEl.value) {
                        // Validate PAN before saving
                        if (!validatePanCard(panEl.value)) {
                            showPanValidationError('panNumber', 'Invalid PAN format. Expected format: AAAPA1234A');
                            throw new Error('Please correct the PAN number format before saving.');
                        }
                        profileData.pan_number = panEl.value;
                    }
                    // Clear aadhar number when PAN is selected
                    profileData.aadhar_number = '';
                } else if (selectedIdType === 'aadhar') {
                    const aadharEl = document.getElementById('individualAadharNumber');
                    if (aadharEl && aadharEl.value) {
                        profileData.aadhar_number = aadharEl.value;
                    }
                    // Clear PAN number when Aadhar is selected
                    profileData.pan_number = '';
                }
            }
        }

        console.log('📤 Profile data to be sent:', profileData);

        // Call the update API
        const [success, response] = await callApi(
            'PUT',
            `/user-api/update-user-details-api/${currentUserId}/`,
            profileData,
            csrf_token
        );

        if (success && response.success) {
            showSuccess('Profile updated successfully!');

            // Remove all field highlighting (red borders)
            removeFieldHighlighting();

            // Update all field values and placeholders with the saved data
            updateFieldsAfterSave(profileData);

            // Toggle back to read-only mode
            toggleProfileEdit(false);

            // Refresh profile data to get any server-side changes
            await loadBuyerProfile();
        } else {
            throw new Error(response.error || 'Failed to update profile');
        }
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        showError('Failed to update profile: ' + error.message);
    }
}

/**
 * Update field values and placeholders after successful save
 */
function updateFieldsAfterSave(profileData) {
    console.log('🔄 Updating fields after save with data:', profileData);

    // Update basic profile fields
    if (profileData.name) {
        const fullNameEl = document.getElementById('fullName');
        if (fullNameEl) {
            fullNameEl.value = profileData.name;
            fullNameEl.placeholder = profileData.name;
        }
    }

    if (profileData.email) {
        const emailEl = document.getElementById('email');
        if (emailEl) {
            emailEl.value = profileData.email;
            emailEl.placeholder = profileData.email;
        }
    }

    if (profileData.address) {
        const addressEl = document.getElementById('address');
        if (addressEl) {
            addressEl.value = profileData.address;
            addressEl.placeholder = profileData.address;
        }
    }

    // Update address fields
    if (profileData.addressline1) {
        const addressLine1El = document.getElementById('addressline1');
        if (addressLine1El) {
            addressLine1El.value = profileData.addressline1;
            addressLine1El.placeholder = profileData.addressline1;
        }
    }

    if (profileData.addressline2) {
        const addressLine2El = document.getElementById('addressline2');
        if (addressLine2El) {
            addressLine2El.value = profileData.addressline2;
            addressLine2El.placeholder = profileData.addressline2;
        }
    }

    // Handle both frontend and backend field names for city, state, pincode
    const cityValue = profileData.cityname || profileData.city;
    if (cityValue) {
        const cityEl = document.getElementById('cityname');
        if (cityEl) {
            cityEl.value = cityValue;
            cityEl.placeholder = cityValue;
        }
    }

    const stateValue = profileData.statename || profileData.state;
    if (stateValue) {
        const stateEl = document.getElementById('statename');
        if (stateEl) {
            stateEl.value = stateValue;
            stateEl.placeholder = stateValue;
        }
    }

    const pincodeValue = profileData.addresspincode || profileData.address_pincode;
    if (pincodeValue) {
        const pincodeEl = document.getElementById('addresspincode');
        if (pincodeEl) {
            pincodeEl.value = pincodeValue;
            pincodeEl.placeholder = pincodeValue;
        }
    }

    // Update ID fields
    if (profileData.pan_number) {
        const panEl = document.getElementById('panNumber');
        if (panEl) {
            panEl.value = profileData.pan_number;
            panEl.placeholder = profileData.pan_number;
        }
    }

    if (profileData.aadhar_number) {
        const aadharEl = document.getElementById('individualAadharNumber');
        if (aadharEl) {
            aadharEl.value = profileData.aadhar_number;
            aadharEl.placeholder = profileData.aadhar_number;
        }
    }
}

async function saveCompanyInfo() {
    try {
        console.log('🏢 Saving company information...');

        // Prepare basic company data
        const companyData = {
            company_name: document.getElementById('companyName').value,
            gst_number: document.getElementById('gstNumber').value,
            addressline1: document.getElementById('companyAddressLine1').value,
            addressline2: document.getElementById('companyAddressLine2').value,
            city: document.getElementById('companyCity').value,
            state: document.getElementById('companyState').value,
            address_pincode: document.getElementById('companyPincode').value
        };

        // Handle ID type selection (PAN or CIN)
        const companyIdTypeEl = document.getElementById('companyIdSelect');
        if (companyIdTypeEl) {
            const selectedIdType = companyIdTypeEl.value;

            if (selectedIdType === 'pan') {
                const companyPanEl = document.getElementById('companyPanNumber');
                if (companyPanEl && companyPanEl.value) {
                    // Validate company PAN before saving
                    if (!validatePanCard(companyPanEl.value)) {
                        showPanValidationError('companyPanNumber', 'Invalid PAN format. Expected format: AAAPA1234A');
                        throw new Error('Please correct the company PAN number format before saving.');
                    }
                    companyData.pan_number = companyPanEl.value;
                }
                // Clear CIN number when PAN is selected
                companyData.cin_number = '';
            } else if (selectedIdType === 'cin') {
                const companyCinEl = document.getElementById('companyCinNumber');
                if (companyCinEl && companyCinEl.value) {
                    companyData.cin_number = companyCinEl.value;
                }
                // Clear PAN number when CIN is selected
                companyData.pan_number = '';
            }
        }

        console.log('📤 Company data to be sent:', companyData);

        // Call the update API
        const [success, response] = await callApi(
            'PUT',
            `/user-api/update-user-details-api/${currentUserId}/`,
            companyData,
            csrf_token
        );

        if (success && response.success) {
            showSuccess('Company information updated successfully!');

            // Remove all field highlighting (red borders)
            removeFieldHighlighting();

            toggleCompanyEdit(false);

            // Refresh profile data to get updated values
            await loadBuyerProfile();
        } else {
            throw new Error(response.error || 'Failed to update company information');
        }
    } catch (error) {
        console.error('❌ Error updating company info:', error);
        showError('Failed to update company information: ' + error.message);
    }
}

function saveProfileSettings() {
    console.log('💾 Saving profile settings...');

    // Check if we're in edit mode
    const saveBtn = document.querySelector('.btn-primary-custom');
    if (saveBtn && saveBtn.innerHTML.includes('Save Changes')) {
        // We're in save mode, so save the data
        saveProfile();
    } else {
        // We're in view mode, so enable edit mode
        enableEditMode();
    }
}

/**
 * Enable edit mode for profile forms
 */
function enableEditMode() {
    console.log('✏️ Enabling edit mode...');

    // Enable profile fields (excluding phone which should remain readonly)
    const profileFields = ['fullName', 'email', 'address'];

    profileFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.readOnly = false;
            field.classList.add('editable');
        }
    });

    // Enable company fields if corporate user
    const companyInfoCard = document.getElementById('companyInfoCard');
    if (companyInfoCard && companyInfoCard.style.display !== 'none') {
        const companyTextFields = ['companyName', 'gstNumber', 'panNumber', 'companyAddress'];
        const companySelectFields = ['industry'];

        // Handle text fields
        companyTextFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.readOnly = false;
                field.classList.add('editable');
            }
        });

        // Handle select fields
        companySelectFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.disabled = false;
                field.classList.add('editable');
            }
        });
    }

    // Update button text and functionality
    const saveBtn = document.querySelector('.btn-primary-custom');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save Changes';
    }
}

/**
 * Disable edit mode and return to view mode (legacy function - kept for backward compatibility)
 */
function disableEditMode() {
    console.log('👁️ Disabling edit mode...');

    // Disable text fields
    const textFields = ['fullName', 'email', 'address', 'companyName', 'gstNumber', 'panNumber', 'companyAddress'];
    const selectFields = ['industry'];

    textFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.readOnly = true;
            field.classList.remove('editable');
        }
    });

    // Disable select fields
    selectFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.disabled = true;
            field.classList.remove('editable');
        }
    });

    // Update button text and functionality
    const saveBtn = document.querySelector('.btn-primary-custom');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-edit me-2"></i>Edit Profile';
    }
}

/**
 * Show success message
 */
function showSuccess(message) {
    // Create success alert
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    successDiv.style.zIndex = '9999';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(successDiv);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (successDiv && successDiv.parentNode) {
            successDiv.remove();
        }
    }, 3000);
}

/**
 * Show error message
 */
function showError(message) {
    // Create error alert
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    errorDiv.style.zIndex = '9999';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(errorDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (errorDiv && errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

function deactivateAccount() {
    console.log('❌ Deactivate account clicked');

    if (confirm('Are you sure you want to deactivate your account? This action cannot be undone.')) {
        if (confirm('This will permanently deactivate your account and remove all your data. Type "DEACTIVATE" in the next prompt to confirm.')) {
            const confirmation = prompt('Please type "DEACTIVATE" to confirm:');
            if (confirmation === 'DEACTIVATE') {
                showSuccess('Account deactivation request submitted.');
            } else {
                showError('Account deactivation cancelled - incorrect confirmation text.');
            }
        }
    }
}



/**
 * Update verification status display
 */
function updateVerificationStatus(userDetails, corporateDetails) {
    const verificationStatusEl = document.getElementById('verificationStatus');

    if (!verificationStatusEl) {
        console.log('⚠️ Verification status element not found');
        return;
    }

    // Check if user is approved
    if (corporateDetails.is_approved === false || corporateDetails.is_approved === 'false') {
        console.log('🔍 User is not approved - showing verification status and disabling post requirement buttons');
        verificationStatusEl.style.display = 'block';

        // Disable all post requirement buttons
        disablePostRequirementButtons(true);
    } else {
        console.log('✅ User is approved - hiding verification status and enabling post requirement buttons');
        verificationStatusEl.style.display = 'none';

        // Enable all post requirement buttons

    }
}

/**
 * Enable or disable all post requirement buttons
 */
function disablePostRequirementButtons(disable) {
    const postRequirementButtons = document.querySelectorAll('.post-requirement-btn');
    const postRequirementButtons2 = document.getElementById('postRequirementBtn2');



    postRequirementButtons.forEach(button => {
        button.disabled = disable;

        button.disabled = true;
        button.style.opacity = '0.6';
        button.style.cursor = 'not-allowed';
        button.title = 'Account verification required to post requirements';
        console.log('🚫 Post requirement button disabled:', button);

    });

    console.log(`${disable ? '🚫 Disabled' : '✅ Enabled'} ${postRequirementButtons.length} post requirement buttons`);
}


/**
 * Simple logout functionality
 */
function logout() {
    console.log('🔐 Logout initiated');

    // Clear all localStorage data
    localStorage.clear();

    // Clear sessionStorage as well
    sessionStorage.clear();

    console.log('✅ User data cleared successfully');

    // Redirect to direct login page
    window.location.href = '/directlogin/';
}

/**
 * Initialize simple logout button functionality
 */
function initializeSimpleLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
        console.log('🔐 Simple logout button initialized');
    }
}

/**
 * Toggle between PAN and Aadhar fields based on selection
 */
function toggleIdFields(selectedType) {
    const panGroup = document.getElementById('individualPanGroup');
    const aadharGroup = document.getElementById('individualAadharGroup');
    const panInput = document.getElementById('panNumber');
    const aadharInput = document.getElementById('individualAadharNumber');

    if (selectedType === 'pan') {
        if (panGroup) panGroup.style.display = 'block';
        if (aadharGroup) aadharGroup.style.display = 'none';
        // Clear Aadhar value when switching to PAN
        if (aadharInput) aadharInput.value = '';
    } else if (selectedType === 'aadhar') {
        if (panGroup) panGroup.style.display = 'none';
        if (aadharGroup) aadharGroup.style.display = 'block';
        // Clear PAN value when switching to Aadhar
        if (panInput) panInput.value = '';
    }
}

/**
 * Toggle company ID fields (PAN/CIN) based on selection
 */
function toggleCompanyIdFields(selectedType) {
    const companyPanGroup = document.getElementById('companyPanGroup');
    const companyCinGroup = document.getElementById('companyCinGroup');
    const companyPanInput = document.getElementById('companyPanNumber');
    const companyCinInput = document.getElementById('companyCinNumber');

    if (selectedType === 'pan') {
        if (companyPanGroup) companyPanGroup.style.display = 'block';
        if (companyCinGroup) companyCinGroup.style.display = 'none';
        // Clear CIN value when switching to PAN
        if (companyCinInput) companyCinInput.value = '';
    } else if (selectedType === 'cin') {
        if (companyPanGroup) companyPanGroup.style.display = 'none';
        if (companyCinGroup) companyCinGroup.style.display = 'block';
        // Clear PAN value when switching to CIN
        if (companyPanInput) companyPanInput.value = '';
    }
}

/**
 * Validate PAN card format (AAAPA1234A)
 * @param {string} panNumber - PAN number to validate
 * @returns {boolean} - true if valid, false if invalid
 */
function validatePanCard(panNumber) {
    if (!panNumber) return false;

    // PAN format: AAAPA1234A (5 letters, 4 numbers, 1 letter)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(panNumber.toUpperCase());
}

/**
 * Show validation error for PAN field
 * @param {string} fieldId - ID of the PAN input field
 * @param {string} message - Error message to display
 */
function showPanValidationError(fieldId, message) {
    // Remove any existing error
    removePanValidationError(fieldId);

    const field = document.getElementById(fieldId);
    if (!field) return;

    // Create error element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'pan-validation-error';
    errorDiv.id = fieldId + '-error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle me-1"></i>${message}`;

    // Insert error after the field
    field.parentNode.insertBefore(errorDiv, field.nextSibling);

    // Add error styling to field
    field.classList.add('is-invalid');
}

/**
 * Remove validation error for PAN field
 * @param {string} fieldId - ID of the PAN input field
 */
function removePanValidationError(fieldId) {
    const errorDiv = document.getElementById(fieldId + '-error');
    if (errorDiv) {
        errorDiv.remove();
    }

    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.remove('is-invalid');
    }
}

/**
 * Set up PAN validation for a field
 * @param {string} fieldId - ID of the PAN input field
 */
function setupPanValidation(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // Add event listeners for validation
    field.addEventListener('blur', function () {
        const panValue = this.value.trim();
        if (panValue && !validatePanCard(panValue)) {
            showPanValidationError(fieldId, 'Invalid PAN format. Expected format: AAAPA1234A');
        } else {
            removePanValidationError(fieldId);
        }
    });

    field.addEventListener('input', function () {
        // Convert to uppercase
        this.value = this.value.toUpperCase();

        // Remove error on input if field becomes valid
        const panValue = this.value.trim();
        if (panValue && validatePanCard(panValue)) {
            removePanValidationError(fieldId);
        }
    });
}

// Make functions globally available for HTML onclick events
window.editProfile = function () {
    console.log('👤 Edit profile clicked (global)');
    toggleProfileEdit(true);
};

window.editCompanyInfo = function () {
    console.log('🏢 Edit company info clicked (global)');
    toggleCompanyEdit(true);
};

// Add window focus event listener to refresh wallet data when returning to page
window.addEventListener('focus', function () {
    if (currentUserId && buyerData) {
        console.log('🔄 Window focused - refreshing wallet data...');
        loadBuyerProfile();
    }
});

console.log('🔐 WasteBazar Buyer Profile System Loaded');

// Initialize postNewRequirementthe buyer profile when page loads
/**
 * Calculate profile completion percentage for individual users
 */
function calculateProfileCompletion(userDetails, corporateDetails) {
    if (!userDetails) return 0;

    const isCorporate = userDetails.role === 'buyer_corporate';
    let completedFields = 0;
    let totalFields = 0;

    if (isCorporate) {
        // Corporate user fields (11 total)
        const corporateRequiredFields = [
            'name',           // Full name
            'email',          // Email address  
            'contact_number', // Phone number
        ];

        // Corporate specific fields from corporateDetails
        const corporateCompanyFields = [
            'company_name',   // Company name
            'gst_number',     // GST number
            'addressline1',   // Address Line 1
            'addressline2',   // Address Line 2
            'city',           // City
            'state',          // State
            'address_pincode' // Pincode
        ];

        // Check basic user fields
        corporateRequiredFields.forEach(field => {
            if (userDetails[field] && userDetails[field].toString().trim() !== '') {
                completedFields++;
            }
        });

        // Check corporate company fields
        if (corporateDetails && !corporateDetails.message) {
            corporateCompanyFields.forEach(field => {
                if (corporateDetails[field] && corporateDetails[field].toString().trim() !== '') {
                    completedFields++;
                }
            });

            // Count ID field (PAN or CIN) as one field
            const hasIdDocument = corporateDetails.pan_number || corporateDetails.cin_number;
            if (hasIdDocument) {
                completedFields++;
            }
        }

        totalFields = 11; // 3 basic + 7 company + 1 ID field

    } else {
        // Individual user fields (9 total)
        const individualRequiredFields = [
            'name',           // Full name
            'email',          // Email address  
            'contact_number', // Phone number
            'addressline1',   // Address Line 1
            'addressline2',   // Address Line 2
            'city',           // City
            'state',          // State
            'address_pincode' // Pincode
        ];

        // Check each required field
        individualRequiredFields.forEach(field => {
            if (userDetails[field] && userDetails[field].toString().trim() !== '') {
                completedFields++;
            }
        });

        // Count ID field (PAN or Aadhar) as one field
        const hasIdDocument = userDetails.pan_number || userDetails.aadhar_number;
        if (hasIdDocument) {
            completedFields++;
        }

        totalFields = 9; // 8 regular fields + 1 ID field
    }

    const percentage = Math.round((completedFields / totalFields) * 100);

    console.log(`📊 Profile completion (${isCorporate ? 'Corporate' : 'Individual'}): ${completedFields}/${totalFields} fields (${percentage}%)`);
    return { percentage, completedFields, totalFields };
}

/**
 * Update profile completion UI
 */
function updateProfileCompletion(userDetails, corporateDetails) {
    const profileCompletionCard = document.getElementById('profileCompletionCard');
    const progressBar = document.getElementById('profileProgressBar');
    const progressText = document.getElementById('profileProgressText');
    const profileCompletionTitle = document.querySelector('#profileCompletionCard .profile-completion-title');

    if (!profileCompletionCard || !progressBar || !progressText) {
        console.log('Profile completion elements not found');
        return;
    }

    if (!userDetails) {
        profileCompletionCard.style.display = 'none';
        return;
    }

    const isCorporate = userDetails.role === 'buyer_corporate';
    const completionData = calculateProfileCompletion(userDetails, corporateDetails);
    const { percentage, completedFields, totalFields } = completionData;

    // Update title based on user type
    if (profileCompletionTitle) {
        profileCompletionTitle.textContent = `Complete Your ${isCorporate ? 'Corporate' : ''} Profile`;
    }

    // Show card only if profile is not complete
    if (percentage < 100) {
        profileCompletionCard.style.display = 'block';

        // Update progress bar
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
        progressText.textContent = `${percentage}%`;

        // Update completion text to show field count
        const completionText = document.querySelector('#profileCompletionCard .profile-completion-text');
        if (completionText) {
            completionText.textContent = `${completedFields} of ${totalFields} fields completed`;
        }

        // Change progress bar color based on completion
        progressBar.className = 'progress-bar ';
        if (percentage < 30) {
            progressBar.classList.add('bg-danger');
        } else if (percentage < 70) {
            progressBar.classList.add('bg-warning');
        } else {
            progressBar.classList.add('bg-success');
        }

    } else {
        // Hide card if profile is complete
        profileCompletionCard.style.display = 'none';
    }
}

/**
 * Handle complete profile button click
 */
function completeProfile() {
    console.log('✏️ Complete profile clicked');

    // Switch to settings tab
    const settingsTab = document.querySelector('[data-tab="settings"]');
    if (settingsTab) {
        settingsTab.click();

        // Scroll to settings section after a short delay and enable edit mode with highlighting
        setTimeout(() => {
            const settingsSection = document.getElementById('settings-tab');
            if (settingsSection) {
                settingsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // Enable edit mode and highlight missing fields
                enableEditModeAndHighlightMissing();

                // Focus on first missing field after highlighting
                setTimeout(() => {
                    focusFirstMissingField();
                }, 200);
            }
        }, 300);
    }
}

/**
 * Enable edit mode and highlight missing fields
 */
function enableEditModeAndHighlightMissing() {
    console.log('✏️ Enabling edit mode and highlighting missing fields');

    // Enable edit mode for profile
    toggleProfileEdit(true);

    // For corporate users, also enable company edit mode
    if (buyerData && buyerData.user_details && buyerData.user_details.role === 'buyer_corporate') {
        toggleCompanyEdit(true);
    }

    // Highlight missing fields after a short delay to ensure edit mode is active
    setTimeout(() => {
        highlightMissingFields();
    }, 100);
}

/**
 * Highlight missing fields in red
 */
function highlightMissingFields() {
    console.log('🔴 Highlighting missing fields');

    if (!buyerData || !buyerData.user_details) {
        console.log('❌ No buyer data available for highlighting');
        return;
    }

    const userDetails = buyerData.user_details;
    const corporateDetails = buyerData.corporate_details;
    const isCorporate = userDetails.role === 'buyer_corporate';

    // Define required fields based on user type
    let requiredFields = [];

    if (isCorporate) {
        // Corporate user required fields
        requiredFields = [
            { field: 'name', element: 'fullName', value: userDetails.name },
            { field: 'email', element: 'email', value: userDetails.email },
            { field: 'contact_number', element: 'phone', value: userDetails.contact_number }
        ];

        // Corporate specific fields
        if (corporateDetails && !corporateDetails.message) {
            requiredFields.push(
                { field: 'company_name', element: 'companyName', value: corporateDetails.company_name },
                { field: 'gst_number', element: 'gstNumber', value: corporateDetails.gst_number },
                { field: 'addressline1', element: 'companyAddressLine1', value: corporateDetails.addressline1 },
                { field: 'addressline2', element: 'companyAddressLine2', value: corporateDetails.addressline2 },
                { field: 'city', element: 'companyCity', value: corporateDetails.city },
                { field: 'state', element: 'companyState', value: corporateDetails.state },
                { field: 'address_pincode', element: 'companyPincode', value: corporateDetails.address_pincode }
            );

            // Check ID fields (PAN or CIN)
            const hasIdDocument = corporateDetails.pan_number || corporateDetails.cin_number;
            if (!hasIdDocument) {
                const companyPanEl = document.getElementById('companyPanNumber');
                const companyCinEl = document.getElementById('companyCinNumber');
                if (companyPanEl) requiredFields.push({ field: 'pan_number', element: 'companyPanNumber', value: '' });
                if (companyCinEl) requiredFields.push({ field: 'cin_number', element: 'companyCinNumber', value: '' });
            }
        }
    } else {
        // Individual user required fields
        requiredFields = [
            { field: 'name', element: 'fullName', value: userDetails.name },
            { field: 'email', element: 'email', value: userDetails.email },
            { field: 'contact_number', element: 'phone', value: userDetails.contact_number },
            { field: 'addressline1', element: 'addressline1', value: userDetails.addressline1 },
            { field: 'addressline2', element: 'addressline2', value: userDetails.addressline2 },
            { field: 'city', element: 'cityname', value: userDetails.city },
            { field: 'state', element: 'statename', value: userDetails.state },
            { field: 'address_pincode', element: 'addresspincode', value: userDetails.address_pincode }
        ];

        // Check ID fields (PAN or Aadhar)
        const hasIdDocument = userDetails.pan_number || userDetails.aadhar_number;
        if (!hasIdDocument) {
            const panEl = document.getElementById('panNumber');
            const aadharEl = document.getElementById('individualAadharNumber');
            if (panEl) requiredFields.push({ field: 'pan_number', element: 'panNumber', value: '' });
            if (aadharEl) requiredFields.push({ field: 'aadhar_number', element: 'individualAadharNumber', value: '' });
        }
    }

    // Apply highlighting to missing fields
    requiredFields.forEach(fieldInfo => {
        const element = document.getElementById(fieldInfo.element);
        if (element && (!fieldInfo.value || fieldInfo.value.toString().trim() === '')) {
            element.classList.add('missing-field');
            console.log(`🔴 Highlighted missing field: ${fieldInfo.field}`);
        }
    });

    // Add CSS for missing field highlighting if not already added
    addMissingFieldStyles();

    // Set up field highlighting listeners
    setupFieldHighlightingListeners();
}

/**
 * Focus on the first missing field
 */
function focusFirstMissingField() {
    console.log('🎯 Focusing on first missing field');

    const firstMissingField = document.querySelector('.missing-field');
    if (firstMissingField) {
        // Scroll the field into view
        firstMissingField.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        // Focus the field after a short delay
        setTimeout(() => {
            firstMissingField.focus();
            console.log(`🎯 Focused on missing field: ${firstMissingField.id}`);
        }, 500);
    } else {
        console.log('✅ No missing fields found to focus on');
    }
}

/**
 * Remove highlighting from a specific field
 */
function removeFieldHighlight(element) {
    if (element) {
        element.classList.remove('missing-field');
    }
}

/**
 * Remove all field highlighting
 */
function removeFieldHighlighting() {
    console.log('✅ Removing field highlighting');
    const highlightedFields = document.querySelectorAll('.missing-field');
    highlightedFields.forEach(field => {
        field.classList.remove('missing-field');
    });
}

/**
 * Check all fields and remove missing-field class from fields that have values
 */
function cleanupMissingFieldClasses() {
    const allFormFields = document.querySelectorAll('input, select, textarea');
    allFormFields.forEach(field => {
        if (field.value && field.value.trim() !== '') {
            removeFieldHighlight(field);
        }
    });
}

/**
 * Set up event listeners to remove field highlighting when users start typing
 */
function setupFieldHighlightingListeners() {
    console.log('🎯 Setting up field highlighting listeners');

    // Add event listeners to all form inputs
    const formFields = [
        'fullName', 'email', 'phone', 'addressline1', 'addressline2',
        'cityname', 'statename', 'addresspincode', 'panNumber', 'individualAadharNumber',
        'companyName', 'gstNumber', 'companyAddressLine1', 'companyAddressLine2',
        'companyCity', 'companyState', 'companyPincode', 'companyPanNumber', 'companyCinNumber'
    ];

    formFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            // Remove highlighting when user starts typing
            element.addEventListener('input', function () {
                if (this.value && this.value.trim() !== '') {
                    removeFieldHighlight(this);
                }
            });

            // Remove highlighting when field gets focus
            element.addEventListener('focus', function () {
                if (this.value && this.value.trim() !== '') {
                    removeFieldHighlight(this);
                }
            });
        }
    });
}

/**
 * Add CSS styles for missing field highlighting
 */
function addMissingFieldStyles() {
    // Check if styles already exist
    if (document.getElementById('missing-field-styles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'missing-field-styles';
    style.textContent = `
        .missing-field {
            border: 2px solid #dc3545 !important;
            box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
            background-color: rgba(220, 53, 69, 0.05) !important;
        }
        
        .missing-field:focus {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
        }
        
        .missing-field::placeholder {
            color: #dc3545 !important;
            opacity: 0.7;
        }
    `;
    document.head.appendChild(style);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        console.log('🚀 DOM loaded, initializing buyer profile...');
        initializeSimpleLogout();
    });
} else {
    // DOM already loaded
    console.log('🚀 DOM already loaded, initializing buyer profile...');
    initializeSimpleLogout();
}
