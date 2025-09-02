/**
 * Seller Profile Script for WasteBazar
 * Handles seller profile page functionality and API integration
 */

// Global variables
let csrf_token = null;
let user_details_api_url = null;
let seller_listings_api_url = null;
let seller_detail_api_url = "/user-api/seller-detail-api/";
let current_user_id = null;
let seller_data = null;

/**
 * Main function to initialize seller profile app
 */
async function SellerProfileApp(csrf_token_param, user_details_api_url_param, seller_listings_api_url_param) {
    try {
        // Set global variables
        csrf_token = csrf_token_param;
        user_details_api_url = user_details_api_url_param;
        seller_listings_api_url = seller_listings_api_url_param;

        console.log('🚀 Seller Profile App initialized');

        // Initialize the app
        await initializeApp();
    } catch (error) {
        console.error('❌ Failed to initialize Seller Profile App:', error);
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
        setupTabFunctionality();

        // Load all data
        await loadAllData();

    } catch (error) {
        console.error('❌ Error during initialization:', error);
        showError('Error loading data. Please try again.');
    }
}

/**
 * Get current user ID from localStorage
 */
function getCurrentUserId() {
    current_user_id = localStorage.getItem('user_id');

    if (!current_user_id) {
        console.error('❌ No user ID found in localStorage');
        showError('User not logged in. Please login again.');
        setTimeout(() => {
            window.location.href = '/login/';
        }, 3000);
        return;
    }

    console.log('👤 Current user ID:', current_user_id);
}

/**
 * Load all data from APIs
 */
async function loadAllData() {
    try {
        // Load seller profile first
        await loadSellerProfile();

        // Load listings
        await loadSellerListings();

    } catch (error) {
        console.error('❌ Error loading data:', error);
        showError('Error loading profile data.');
    }
}

/**
 * Load seller profile data
 */
async function loadSellerProfile() {
    try {
        console.log('📥 Loading seller profile...');

        const [success, response] = await callApi('GET', `${seller_detail_api_url}${current_user_id}/`, null, csrf_token);

        if (success && response.success) {
            seller_data = response.data;
            console.log('✅ Seller profile loaded:', seller_data);

            // Store user details in localStorage for future use
            if (seller_data.user_details) {
                const userName = seller_data.user_details.name;

                if (userName) {
                    localStorage.setItem('user_name', userName);
                    console.log('✅ Stored user name in localStorage:', userName);
                }
            }

            // Render profile data
            renderProfileData();

        } else {
            console.error('❌ Failed to load seller profile:', response.error);
            showError(response.error || 'Failed to load profile');
        }
    } catch (error) {
        console.error('❌ Error loading seller profile:', error);
        showError('Network error. Please try again.');
    }
}

/**
 * Load seller listings
 */
async function loadSellerListings() {
    try {
        console.log('📦 Loading seller listings...');

        // Use the new retrieve endpoint with user_id as path parameter
        const [success, response] = await callApi('GET', `${seller_listings_api_url}${current_user_id}/`, null, csrf_token);

        if (success && response.success) {
            const listings = response.data || [];
            const meta = response.meta || {};
            console.log('✅ Listings loaded:', listings);
            console.log('📊 Listings metadata:', meta);

            // Separate approved and unapproved listings
            const approvedListings = listings.filter(listing =>
                listing.status === 'active' || listing.status === 'approved'
            );
            const unapprovedListings = listings.filter(listing =>
                listing.status === 'pending' || listing.status === 'under_review' || listing.status === 'rejected'
            );

            renderListings(approvedListings);
            renderUnapprovedListings(unapprovedListings);
            updateListingsStats(listings, meta);
        } else {
            console.error('❌ Failed to load listings:', response?.error || 'Unknown error');
            // Show empty state instead of error to maintain UI
            renderListings([]);
            renderUnapprovedListings([]);
            updateListingsStats([], {});

            // Only show error if it's not just "no listings found"
            if (response?.error && !response.error.includes('not found')) {
                showError(response.error);
            }
        }
    } catch (error) {
        console.error('❌ Error loading listings:', error);
        renderListings([]);
        renderUnapprovedListings([]);
        updateListingsStats([], {});
        showError('Failed to load listings. Please refresh the page.');
    }
}

/**
 * Render profile data in HTML elements
 */
function renderProfileData() {
    if (!seller_data) return;

    const userDetails = seller_data.user_details;
    const corporateDetails = seller_data.corporate_details;
    localStorage.setItem('is_approved', userDetails.is_approved);
    localStorage.setItem('profile_complete', userDetails.profile_completed);
    // const walletDetails = seller_data.wallet_details;

    // Update profile header
    updateProfileHeader(userDetails, corporateDetails);

    // Update contact information
    updateContactInfo(userDetails, corporateDetails);

    // Update settings information
    updateSettingsInfo(userDetails, corporateDetails);

    // Update wallet information
    // updateWalletInfo(walletDetails);

    // Update profile completion status
    updateProfileCompletion(userDetails, corporateDetails);
}

/**
 * Update profile header elements
 */
function updateProfileHeader(userDetails, corporateDetails) {
    const sellerNameEl = document.getElementById('sellerName');
    const headerCompanyNameEl = document.getElementById('headerCompanyName');
    const sellerTypeEl = document.getElementById('sellerType');
    const verificationBadgeEl = document.getElementById('verificationBadge');
    const sellerEmailEl = document.getElementById('sellerEmail');
    const sellerPhoneEl = document.getElementById('sellerPhone');
    const sellerAddressEl = document.getElementById('sellerAddress');


    const isIndividual = userDetails.role === 'seller_individual';
    const displayName = userDetails.name || 'Seller';
    const companyName = corporateDetails && corporateDetails.company_name ? corporateDetails.company_name : '';

    // Update elements if they exist
    if (sellerNameEl) sellerNameEl.textContent = displayName;

    if (headerCompanyNameEl) {
        if (companyName) {
            headerCompanyNameEl.textContent = companyName;
            headerCompanyNameEl.style.display = 'block';
        } else {
            headerCompanyNameEl.style.display = 'none';
        }
    }

    if (sellerTypeEl) {
        sellerTypeEl.innerHTML = `
            <i class="fas fa-${isIndividual ? 'user' : 'building'} me-1"></i>
            ${isIndividual ? 'Individual' : 'Corporate'} Seller
        `;
    }

    if (verificationBadgeEl) {
        if (userDetails && userDetails.is_approved) {
            verificationBadgeEl.innerHTML = '<i class="fas fa-check-circle me-1"></i>Verified';
            verificationBadgeEl.style.display = 'inline-block';
        } else {
            verificationBadgeEl.style.display = 'none';
        }
    }

    if (sellerEmailEl) sellerEmailEl.textContent = userDetails.email || 'Email not provided';
    if (sellerPhoneEl) sellerPhoneEl.textContent = userDetails.contact_number || 'Phone not provided';

    // if (sellerAddressEl) {
    //     if (corporateDetails && corporateDetails.address) {
    //         sellerAddressEl.textContent = corporateDetails.address;
    //     } else {
    //         sellerAddressEl.textContent = 'Address not provided';
    //     }
    // }
}

/**
 * Update contact information in sidebar
 */
function updateContactInfo(userDetails, corporateDetails) {
    const sidebarTitleEl = document.getElementById('sidebarInfoTitle');
    const sidebarCompanyLabelEl = document.getElementById('sidebarCompanyLabel');
    const sidebarCompanyNameEl = document.getElementById('sidebarCompanyName');
    const sidebarEmailEl = document.getElementById('sidebarEmail');
    const sidebarPhoneEl = document.getElementById('sidebarPhone');
    const idDocItemEl = document.getElementById('sidebarIdDocItem');
    const idDocLabelEl = document.getElementById('sidebarIdDocLabel');
    const idDocValueEl = document.getElementById('sidebarIdDocValue');

    const isIndividual = userDetails.role === 'seller_individual';

    // Title: Company Information -> Seller Information for individuals
    if (sidebarTitleEl) {
        const titleText = isIndividual ? 'Seller Information' : 'Company Information';
        sidebarTitleEl.innerHTML = `<i class="fas fa-address-book"></i> ${titleText}`;
    }
    if (sidebarCompanyLabelEl) sidebarCompanyLabelEl.textContent = isIndividual ? 'Seller' : 'Company';

    if (sidebarCompanyNameEl) {
        if (!isIndividual && corporateDetails && corporateDetails.company_name) {
            sidebarCompanyNameEl.textContent = corporateDetails.company_name;
        } else {
            sidebarCompanyNameEl.textContent = userDetails.name || 'Not provided';
        }
    }

    if (sidebarEmailEl) sidebarEmailEl.textContent = userDetails.email || 'Not provided';
    if (sidebarPhoneEl) sidebarPhoneEl.textContent = userDetails.contact_number || 'Not provided';

    // Address/location is intentionally not displayed in the sidebar per requirement

    // Show PAN/Aadhar for individuals if available
    if (idDocItemEl && idDocLabelEl && idDocValueEl) {
        if (isIndividual) {
            const pan = userDetails.pan_number;
            const aadhar = userDetails.aadhar_number || (corporateDetails && corporateDetails.aadhar_number);
            if (pan) {
                idDocLabelEl.textContent = 'PAN';
                idDocValueEl.textContent = pan;
                idDocItemEl.style.display = 'flex';
            } else if (aadhar) {
                idDocLabelEl.textContent = 'Aadhar';
                idDocValueEl.textContent = aadhar;
                idDocItemEl.style.display = 'flex';
            } else {
                idDocItemEl.style.display = 'none';
            }
        } else {
            idDocItemEl.style.display = 'none';
        }
    }
}

/**
 * Update settings information
 */
function updateSettingsInfo(userDetails, corporateDetails) {
    console.log('📋 Updating settings info with:');
    console.log('👤 User Details:', userDetails);
    console.log('🏢 Corporate Details:', corporateDetails);

    // Update profile information fields with values and placeholders
    const fullNameEl = document.getElementById('fullName');
    const emailEl = document.getElementById('email');
    const phoneEl = document.getElementById('phone');
    const userTypeEl = document.getElementById('userType');

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
        userTypeEl.value = userDetails.role || 'seller_individual';
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
        }
        toggleIdFields('pan');
    } else if (userDetails.aadhar_number) {
        if (idSelectEl) idSelectEl.value = 'aadhar';
        if (aadharNumberEl) {
            aadharNumberEl.value = userDetails.aadhar_number;
        }
        toggleIdFields('aadhar');
    } else {
        toggleIdFields('pan'); // Default to PAN
    }

    // Show/hide individual fields based on user type
    const individualFields = document.getElementById('individualFields');
    const isCorporate = userDetails.role === 'seller_corporate';
    console.log('🔍 User role detection:', userDetails.role, '| Is Corporate:', isCorporate);

    if (individualFields) {
        if (isCorporate) {
            individualFields.style.display = 'none';
        } else {
            individualFields.style.display = 'block';
        }
    }

    // Show/hide and populate company information card
    const companyInfoCard = document.getElementById('companyInfoCard');
    console.log('🏢 Company Info Card Element:', companyInfoCard);
    console.log('🏢 Is Corporate:', isCorporate);
    console.log('🏢 Corporate Details:', corporateDetails);
    console.log('🏢 Corporate Details Message:', corporateDetails ? corporateDetails.message : 'No corporate details');

    if (companyInfoCard) {
        // Temporarily always show company card for testing
        if (isCorporate) {
            console.log('✅ Showing company info card for corporate user');
            companyInfoCard.style.display = 'block';

            // Create dummy corporate details if none exist
            const corporateData = corporateDetails || {
                company_name: '',
                pan_number: '',
                cin_number: '',
                gst_number: '',
                addressline1: '',
                addressline2: '',
                city: '',
                state: '',
                address_pincode: '',
                is_approved: false
            };

            updateCompanySettings(corporateData);
        } else {
            console.log('❌ Hiding company info card - Not a corporate user');
            companyInfoCard.style.display = 'none';
        }
    } else {
        console.error('❌ Company Info Card element not found with ID: companyInfoCard');
    }

    // Set up PAN validation for individual and corporate PAN fields
    setupPanValidation('panNumber');           // Individual PAN field
    setupPanValidation('companyPanNumber');    // Company PAN field
}

/**
 * Update company settings information
 */
function updateCompanySettings(corporateDetails) {
    console.log('🏢 Updating company settings with:', corporateDetails);

    // Update basic company information
    const companyNameEl = document.getElementById('companyName');
    console.log('🔍 Company Name Element:', companyNameEl);
    console.log('🏢 Company Name from data:', corporateDetails.company_name);

    if (companyNameEl) {
        const companyName = corporateDetails.company_name || '';
        companyNameEl.value = companyName;
        companyNameEl.placeholder = companyName || 'Enter company name';
        console.log('✅ Set company name value:', companyNameEl.value);
        console.log('✅ Set company name placeholder:', companyNameEl.placeholder);

        // Force visibility for testing
        if (companyNameEl.style.display === 'none') {
            companyNameEl.style.display = 'block';
        }
    } else {
        console.error('❌ Company Name Element not found with ID: companyName');
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
        }
        toggleCompanyIdFields('pan');
    } else if (corporateDetails.cin_number) {
        if (companyIdSelectEl) companyIdSelectEl.value = 'cin';
        if (companyCinEl) {
            companyCinEl.value = corporateDetails.cin_number;
        }
        toggleCompanyIdFields('cin');
    } else {
        toggleCompanyIdFields('pan'); // Default to PAN
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

    // Update verification status
    const settingsVerificationStatusEl = document.getElementById('settingsVerificationStatus');
    const settingsVerificationDateEl = document.getElementById('settingsVerificationDate');

    if (settingsVerificationStatusEl) {
        if (corporateDetails.is_approved) {
            settingsVerificationStatusEl.innerHTML = '<i class="fas fa-check-circle me-1"></i>Verified';
            settingsVerificationStatusEl.className = 'badge bg-success';
        } else if (corporateDetails.is_rejected) {
            settingsVerificationStatusEl.innerHTML = '<i class="fas fa-times-circle me-1"></i>Rejected';
            settingsVerificationStatusEl.className = 'badge bg-danger';
        } else {
            settingsVerificationStatusEl.innerHTML = '<i class="fas fa-clock me-1"></i>Pending';
            settingsVerificationStatusEl.className = 'badge bg-warning';
        }
    }

    // Update verification date
    if (settingsVerificationDateEl) {
        if (corporateDetails.approved_at) {
            settingsVerificationDateEl.textContent = `Verified on: ${formatDate(corporateDetails.approved_at)}`;
        } else if (corporateDetails.rejected_at) {
            settingsVerificationDateEl.textContent = `Rejected on: ${formatDate(corporateDetails.rejected_at)}`;
        } else {
            settingsVerificationDateEl.textContent = `Requested on: ${formatDate(corporateDetails.requested_at)}`;
        }
    }

    // Show/hide download certificate button
    // if (downloadCertificateBtn) {
    //     if (corporateDetails.certificate_url) {
    //         downloadCertificateBtn.style.display = 'inline-block';
    //         downloadCertificateBtn.onclick = function () {
    //             window.open(corporateDetails.certificate_url, '_blank');
    //         };
    //     } else {
    //         downloadCertificateBtn.style.display = 'none';
    //     }
    // }
}


/**
 * Render listings in the listings tab
 */
function renderListings(listings) {
    const container = document.getElementById('listings-container');
    if (!container) return;

    if (!listings || listings.length === 0) {
        container.innerHTML = `
            <div class="empty-state text-center py-5">
                <div class="empty-icon mb-3">
                    <i class="fas fa-boxes fa-3x text-muted"></i>
                </div>
                <h4>No Listings Yet</h4>
                <p class="text-muted">Start selling by creating your first listing!</p>
                <button class="btn btn-primary" onclick="window.location.href='/listing-form/'">
                    <i class="fas fa-plus me-2"></i>Create First Listing
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = listings.map(listing => `
        <div class="card mb-3 listing-card">
            <div class="card-body p-0">
                <div class="row g-0">
                    <!-- Featured Image Section -->
                    <div class="col-12 col-md-3 listing-image-container">
                        ${listing.featured_image_url ? `
                            <img src="${listing.featured_image_url}" 
                                 class="listing-featured-image" 
                                 alt="Featured image for ${listing.category}"
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZjNzU3ZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';">
                        ` : `
                            <div class="listing-no-image">
                                <i class="fas fa-image"></i>
                                <span>No Image</span>
                            </div>
                        `}
                        ${listing.gallery_images && listing.gallery_images.length > 0 ? `
                            <div class="gallery-indicator">
                                <i class="fas fa-images"></i>
                                <span>+${listing.gallery_images.length}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Content Section -->
                    <div class="col-12 col-md-9">
                        <div class="listing-content p-3">
                            <!-- Header with title and status -->
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div class="listing-header">
                                    <h5 class="card-title mb-1">${listing.category || 'Listing'} - ${listing.subcategory || ''}</h5>
                                    <small class="text-muted listing-id">#${listing.listing_id}</small>
                                </div>
                                <span class="badge bg-${getStatusBadgeColor(listing.status)} status-badge">${getStatusLabel(listing.status)}</span>
                            </div>
                            
                            <!-- Quick Details -->
                            <div class="row listing-details mb-2">
                                <div class="col-6 col-sm-3">
                                    <div class="detail-item">
                                        <i class="fas fa-weight-hanging text-primary"></i>
                                        <span class="detail-value">${listing.quantity} ${listing.unit || 'kg'}</span>
                                    </div>
                                </div>
                                <div class="col-6 col-sm-3">
                                    <div class="detail-item">
                                        <i class="fas fa-rupee-sign text-primary"></i>
                                        <span class="detail-value">₹${listing.priceperunit || '0'}/${listing.unit || 'unit'}</span>
                                    </div>
                                </div>
                                <div class="col-12 col-sm-6">
                                    <div class="detail-item">
                                        <i class="fas fa-map-marker-alt text-primary"></i>
                                        <span class="detail-value">${listing.city_location || 'Not specified'}${listing.state_location ? ', ' + listing.state_location : ''}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Description -->
                            <p class="card-text listing-description mb-2">${truncateText(listing.description || 'No description available', 100)}</p>
                            
                            <!-- Dates -->
                            <div class="listing-dates mb-3">
                                <small class="text-muted">
                                    <i class="fas fa-calendar me-1"></i>Created: ${formatDate(listing.created_at)}
                                    <span class="d-none d-sm-inline"> | <i class="fas fa-clock me-1"></i>Valid until: ${formatDate(listing.valid_until)}</span>
                                </small>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div class="listing-actions d-flex flex-wrap gap-2">
                                <button class="btn btn-outline-primary btn-sm flex-fill" onclick="editListing('${listing.listing_id}')">
                                    <i class="fas fa-edit"></i> <span class="d-none d-sm-inline">Edit</span>
                                </button>
                                <button class="btn btn-outline-warning btn-sm flex-fill" onclick="pauseListing('${listing.listing_id}')">
                                    <i class="fas fa-pause"></i> <span class="d-none d-sm-inline">Mark Sold</span>
                                </button>
                                <button class="btn btn-outline-info btn-sm flex-fill" onclick="viewListingDetails('${listing.listing_id}')">
                                    <i class="fas fa-eye"></i> <span class="d-none d-sm-inline">Details</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Render unapproved listings in the unapproved listings tab
 */
function renderUnapprovedListings(unapprovedListings) {
    const container = document.getElementById('unapproved-listings-container');
    if (!container) return;

    if (!unapprovedListings || unapprovedListings.length === 0) {
        container.innerHTML = `
            <div class="empty-state text-center py-5">
                <div class="empty-icon mb-3">
                    <i class="fas fa-clock fa-3x text-muted"></i>
                </div>
                <h4>No Unapproved Listings</h4>
                <p class="text-muted">All your listings are approved or you haven't created any listings yet.</p>
                <a href="/listing-form/" class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>Create New Listing
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = unapprovedListings.map(listing => `
        <div class="card mb-3 listing-card">
            <div class="card-body p-0">
                <div class="row g-0">
                    <!-- Featured Image Section -->
                    <div class="col-12 col-md-3 listing-image-container">
                        ${listing.featured_image_url ? `
                            <img src="${listing.featured_image_url}" 
                                 class="listing-featured-image" 
                                 alt="Featured image for ${listing.category}"
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZjNzU3ZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';">
                        ` : `
                            <div class="listing-no-image">
                                <i class="fas fa-image"></i>
                                <span>No Image</span>
                            </div>
                        `}
                        ${listing.gallery_images && listing.gallery_images.length > 0 ? `
                            <div class="gallery-indicator">
                                <i class="fas fa-images"></i>
                                <span>+${listing.gallery_images.length}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Content Section -->
                    <div class="col-12 col-md-9">
                        <div class="listing-content p-3">
                            <!-- Header with title and status -->
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div class="listing-header">
                                    <h5 class="card-title mb-1">${listing.category || 'Listing'} - ${listing.subcategory || ''}</h5>
                                    <small class="text-muted listing-id">#${listing.listing_id}</small>
                                </div>
                                <span class="badge bg-${getStatusBadgeColor(listing.status)} status-badge">${getStatusLabel(listing.status)}</span>
                            </div>
                            
                            <!-- Quick Details -->
                            <div class="row listing-details mb-2">
                                <div class="col-6 col-sm-4">
                                    <div class="detail-item">
                                        <i class="fas fa-weight-hanging text-primary"></i>
                                        <span class="detail-value">${listing.quantity} ${listing.unit || 'kg'}</span>
                                    </div>
                                </div>
                                <div class="col-6 col-sm-8">
                                    <div class="detail-item">
                                        <i class="fas fa-map-marker-alt text-primary"></i>
                                        <span class="detail-value">${listing.city_location || 'Not specified'}${listing.state_location ? ', ' + listing.state_location : ''}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Description -->
                            <p class="card-text listing-description mb-2">${truncateText(listing.description || 'No description available', 100)}</p>
                            
                            <!-- Rejection Reason (if any) -->
                            ${listing.rejection_reason ? `
                                <div class="alert alert-warning mb-2 p-2">
                                    <strong><i class="fas fa-exclamation-triangle me-2"></i>Rejection Reason:</strong>
                                    <br><small>${listing.rejection_reason}</small>
                                </div>
                            ` : ''}
                            
                            <!-- Dates -->
                            <div class="listing-dates mb-3">
                                <small class="text-muted">
                                    <i class="fas fa-calendar me-1"></i>Submitted: ${formatDate(listing.created_at)}
                                    ${listing.status === 'pending' ? '<span class="d-none d-sm-inline"> | <i class="fas fa-clock me-1"></i>Waiting for review</span>' : ''}
                                </small>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div class="listing-actions d-flex flex-wrap gap-2">
                                ${listing.status === 'rejected' ? `
                                    <button class="btn btn-outline-primary btn-sm flex-fill" onclick="editListing('${listing.listing_id}')">
                                        <i class="fas fa-edit"></i> <span class="d-none d-sm-inline">Edit & Resubmit</span>
                                    </button>
                                ` : ''}
                                <button class="btn btn-outline-info btn-sm flex-fill" onclick="viewListingDetails('${listing.listing_id}')">
                                    <i class="fas fa-eye"></i> <span class="d-none d-sm-inline">Details</span>
                                </button>
                                ${listing.status === 'pending' ? `
                                    <button class="btn btn-outline-danger btn-sm flex-fill" onclick="cancelListing('${listing.listing_id}')">
                                        <i class="fas fa-times"></i> <span class="d-none d-sm-inline">Cancel</span>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Update listings statistics
 */
function updateListingsStats(listings, meta = {}) {
    const totalListingsEl = document.getElementById('totalListings');
    const activeListingsEl = document.getElementById('activeListings');
    const soldItemsEl = document.getElementById('soldItems');

    // Use metadata if available, otherwise calculate from listings array
    const totalListings = meta.total_listings !== undefined ? meta.total_listings : listings.length;
    const activeListings = meta.approved_listings !== undefined ? meta.approved_listings :
        listings.filter(l => l.status === 'active' || l.status === 'approved').length;
    const soldItems = meta.sold_listings !== undefined ? meta.sold_listings :
        listings.filter(l => l.status === 'sold').length;

    if (totalListingsEl) totalListingsEl.textContent = totalListings;
    if (activeListingsEl) activeListingsEl.textContent = activeListings;
    if (soldItemsEl) soldItemsEl.textContent = soldItems;

    // Log statistics for debugging
    console.log('📊 Updated listings stats:', {
        total: totalListings,
        active: activeListings,
        sold: soldItems,
        pending: meta.pending_listings || 0,
        rejected: meta.rejected_listings || 0
    });
}

/**
 * Set up tab functionality
 */
function setupTabFunctionality() {
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

            // Handle different tab targets
            let targetContent;
            if (targetTab === 'approvedlistings') {
                targetContent = document.getElementById('listings-tab');
            } else if (targetTab === 'unapprovedlistings') {
                targetContent = document.getElementById('unapprovedlistings-tab');
            } else {
                targetContent = document.getElementById(targetTab + '-tab');
            }

            if (targetContent) {
                targetContent.classList.add('active');
            }
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
        'deleted': 'danger',
        'sold': 'info'
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
        'deleted': 'Deleted',
        'sold': 'Sold'
    };
    return labels[status] || status;
}

function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '';

    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star text-warning"></i>';
    }

    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt text-warning"></i>';
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star text-warning"></i>';
    }

    return stars;
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

    // Create error alert
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    errorDiv.style.zIndex = '9999';
    errorDiv.innerHTML = `
        ${message}
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

/**
 * Global functions for button actions
 */
window.editListing = function (listingId) {
    console.log('Edit listing:', listingId);
    window.location.href = `/listing-edit/${listingId}/`;
};

window.pauseListing = async function (listingId) {
    console.log('Mark as sold listing:', listingId);

    if (!confirm('Are you sure you want to mark this listing as sold?')) {
        return;
    }

    try {
        // Get user_id from localStorage
        const user_id = localStorage.getItem('user_id');
        if (!user_id) {
            showError('User not logged in. Please refresh the page and try again.');
            return;
        }

        console.log('📤 Marking listing as sold:', listingId, 'for user:', user_id);

        const [success, response] = await callApi(
            'PATCH',  // Use PATCH for partial_update method
            `/marketplace-api/seller-listings/${listingId}/`,  // Use listing-detail endpoint
            { user_id: user_id },  // Ensure user_id is explicitly sent
            csrf_token
        );

        if (success && response.success) {
            showSuccess('Listing marked as sold successfully!');
            // Reload listings to update the UI
            await loadSellerListings();
        } else {
            throw new Error(response.error || 'Failed to mark listing as sold');
        }
    } catch (error) {
        console.error('Error marking listing as sold:', error);
        showError('Failed to mark listing as sold: ' + error.message);
    }
};

window.viewListingDetails = function (listingId) {
    console.log('View listing details:', listingId);
    window.location.href = `/listing-detail/?id=${listingId}`;
};

window.cancelListing = async function (listingId) {
    console.log('Cancel listing:', listingId);

    if (!confirm('Are you sure you want to cancel this listing? This action cannot be undone.')) {
        return;
    }

    try {
        // For now, we'll mark it as inactive since there's no delete endpoint
        // You can implement a proper delete endpoint later if needed
        const [success, response] = await callApi(
            'PUT',
            `/marketplace-api/seller-listings/${listingId}/`,
            {

                user_id: current_user_id,
                status: 'deleted'
            },
            csrf_token
        );

        if (success && response.success) {
            showSuccess('Listing cancelled successfully!');
            // Reload listings to update the UI
            await loadSellerListings();
        } else {
            throw new Error(response.error || 'Failed to cancel listing');
        }
    } catch (error) {
        console.error('Error cancelling listing:', error);
        showError('Failed to cancel listing: ' + error.message);
    }
};

/**
 * Logout functionality
 */
window.logout = function () {
    console.log('🚪 Logging out user...');

    if (confirm('Are you sure you want to logout?')) {
        try {
            // Clear all user data from localStorage
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_role');
            localStorage.removeItem('user_name');
            localStorage.removeItem('user_email');
            localStorage.removeItem('is_logged_in');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');

            // Clear any other session data
            sessionStorage.clear();

            console.log('✅ User data cleared from localStorage');

            // Show logout message
            showSuccess('Logged out successfully!');

            // Redirect to direct login page after a short delay
            setTimeout(() => {
                window.location.href = '/directlogin/';
            }, 1000);

        } catch (error) {
            console.error('❌ Error during logout:', error);
            showError('Error during logout. Redirecting anyway...');

            // Force redirect even if there's an error
            setTimeout(() => {
                window.location.href = '/directlogin/';
            }, 1500);
        }
    }
};

/**
 * Profile editing functions
 */
window.editProfile = function () {
    console.log('👤 Edit profile clicked (global)');
    toggleProfileEdit(true);
};

window.editCompanyInfo = function () {
    console.log('🏢 Edit company info clicked (global)');
    toggleCompanyEdit(true);
};

function toggleProfileEdit(enable) {
    // Get user type to determine which fields to enable
    const userTypeEl = document.getElementById('userType');
    const isCorporate = userTypeEl && userTypeEl.value === 'seller_corporate';

    // Basic fields for all users
    const basicFields = ['fullName', 'email'];

    // Individual-specific fields (only for non-corporate users)
    const individualFields = ['addressline1', 'addressline2', 'cityname', 'statename', 'addresspincode', 'panNumber', 'individualAadharNumber'];
    const individualSelectFields = ['individualIdSelect'];

    const editBtn = document.querySelector('#profileForm').closest('.card').querySelector('.btn');

    // Clean up any missing field classes from fields that have values
    if (enable) {
        cleanupMissingFieldClasses();
    }

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
            const individualIdSelectField = document.getElementById('individualIdSelect');
            if (individualIdSelectField) {
                individualIdSelectField.onchange = function () {
                    toggleIdFields(this.value);
                };
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

    // Clean up any missing field classes from fields that have values
    if (enable) {
        cleanupMissingFieldClasses();
    }

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
            companyIdSelectField.onchange = function () {
                toggleCompanyIdFields(this.value);
            };
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
        const isCorporate = userTypeEl && userTypeEl.value === 'seller_corporate';

        // Prepare basic profile data (common for all users)
        const profileData = {
            name: document.getElementById('fullName').value,
            email: document.getElementById('email').value
        };

        // Add individual-specific fields only for non-corporate users
        if (!isCorporate) {
            // Address fields
            const addressLine1 = document.getElementById('addressline1').value;
            const addressLine2 = document.getElementById('addressline2').value;
            const city = document.getElementById('cityname').value;
            const state = document.getElementById('statename').value;
            const pincode = document.getElementById('addresspincode').value;

            if (addressLine1) profileData.addressline1 = addressLine1;
            if (addressLine2) profileData.addressline2 = addressLine2;
            if (city) profileData.city = city;
            if (state) profileData.state = state;
            if (pincode) profileData.address_pincode = pincode;

            // ID fields - only send the selected ID type
            const idType = document.getElementById('individualIdSelect').value;
            if (idType === 'pan') {
                const panNumber = document.getElementById('panNumber').value;
                if (panNumber) {
                    // Validate PAN format before saving
                    if (!validatePanCard(panNumber)) {
                        showError('Please enter a valid PAN number (AAAPA1234A format)');
                        return;
                    }
                    profileData.pan_number = panNumber.toUpperCase();
                    // Clear Aadhar if PAN is selected
                    profileData.aadhar_number = '';
                }
            } else if (idType === 'aadhar') {
                const aadharNumber = document.getElementById('individualAadharNumber').value;
                if (aadharNumber) {
                    profileData.aadhar_number = aadharNumber;
                    // Clear PAN if Aadhar is selected
                    profileData.pan_number = '';
                }
            }
        }

        console.log('📤 Profile data to be sent:', profileData);

        // Call the update API
        const [success, response] = await callApi(
            'PUT',
            `/user-api/update-user-details-api/${current_user_id}/`,
            profileData,
            csrf_token
        );

        if (success && response.success) {
            showSuccess('Profile updated successfully!');
            toggleProfileEdit(false);

            // Update field values and placeholders after successful save
            updateFieldsAfterSave(profileData);

            // Refresh profile data
            await loadSellerProfile();

            // Check if profile is now complete and update localStorage
            checkAndUpdateProfileCompletion();

        } else {
            console.error('❌ Failed to update profile:', response.error);
            showError(response.error || 'Failed to update profile');
        }
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        showError('Failed to update profile: ' + error.message);
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
            const idType = companyIdTypeEl.value;
            if (idType === 'pan') {
                const panNumber = document.getElementById('companyPanNumber').value;
                if (panNumber) {
                    // Validate PAN format before saving
                    if (!validatePanCard(panNumber)) {
                        showError('Please enter a valid PAN number (AAAPA1234A format)');
                        return;
                    }
                    companyData.pan_number = panNumber.toUpperCase();
                    // Clear CIN if PAN is selected
                    companyData.cin_number = '';
                }
            } else if (idType === 'cin') {
                const cinNumber = document.getElementById('companyCinNumber').value;
                if (cinNumber) {
                    companyData.cin_number = cinNumber.toUpperCase();
                    // Clear PAN if CIN is selected
                    companyData.pan_number = '';
                }
            }
        }

        console.log('📤 Company data to be sent:', companyData);

        // Call the update API
        const [success, response] = await callApi(
            'PUT',
            `/user-api/update-user-details-api/${current_user_id}/`,
            companyData,
            csrf_token
        );

        if (success && response.success) {
            showSuccess('Company information updated successfully!');
            toggleCompanyEdit(false);

            // Refresh profile data
            await loadSellerProfile();

            // Check if profile is now complete and update localStorage
            checkAndUpdateProfileCompletion();

        } else {
            console.error('❌ Failed to update company info:', response.error);
            showError(response.error || 'Failed to update company information');
        }
    } catch (error) {
        console.error('❌ Error updating company info:', error);
        showError('Failed to update company information: ' + error.message);
    }
}

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



// Override the new listing button clicks
document.addEventListener('DOMContentLoaded', function () {
    // Override clicks on "Create Listing" and "New Listing" buttons
    const newListingButtons = document.querySelectorAll('a[href="/listing-form/"], a[href*="listing-form"]');

    newListingButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault(); // Prevent default navigation
            window.location.href = '/listing-form/';
        });
    });

    // Set up logout button functionality
    const logoutButtons = document.querySelectorAll('a[href="#logout"], button[onclick*="logout"], .logout-btn, [data-action="logout"]');

    logoutButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault(); // Prevent default navigation
            logout();
        });
    });

    // Also handle any logout links in the navbar or sidebar
    const navLogoutLinks = document.querySelectorAll('a[href="/logout/"], a[href*="logout"]');

    navLogoutLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault(); // Prevent default navigation
            logout();
        });
    });
});

/**
 * Utility function to truncate text
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
            fullNameEl.placeholder = profileData.name;
        }
    }

    if (profileData.email) {
        const emailEl = document.getElementById('email');
        if (emailEl) {
            emailEl.placeholder = profileData.email;
        }
    }

    // Update address fields
    if (profileData.addressline1) {
        const addressLine1El = document.getElementById('addressline1');
        if (addressLine1El) {
            addressLine1El.placeholder = profileData.addressline1;
        }
    }

    if (profileData.addressline2) {
        const addressLine2El = document.getElementById('addressline2');
        if (addressLine2El) {
            addressLine2El.placeholder = profileData.addressline2;
        }
    }

    // Handle both frontend and backend field names for city, state, pincode
    const cityValue = profileData.cityname || profileData.city;
    if (cityValue) {
        const cityEl = document.getElementById('cityname');
        if (cityEl) {
            cityEl.placeholder = cityValue;
        }
    }

    const stateValue = profileData.statename || profileData.state;
    if (stateValue) {
        const stateEl = document.getElementById('statename');
        if (stateEl) {
            stateEl.placeholder = stateValue;
        }
    }

    const pincodeValue = profileData.addresspincode || profileData.address_pincode;
    if (pincodeValue) {
        const pincodeEl = document.getElementById('addresspincode');
        if (pincodeEl) {
            pincodeEl.placeholder = pincodeValue;
        }
    }

    // Update ID fields
    if (profileData.pan_number) {
        const panEl = document.getElementById('panNumber');
        if (panEl) {
            panEl.placeholder = profileData.pan_number;
        }
    }

    if (profileData.aadhar_number) {
        const aadharEl = document.getElementById('individualAadharNumber');
        if (aadharEl) {
            aadharEl.placeholder = profileData.aadhar_number;
        }
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
            showPanValidationError(fieldId, 'Invalid PAN format. Use AAAPA1234A format.');
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

/**
 * Update profile completion UI using API data
 */
function updateProfileCompletion(userDetails, corporateDetails) {
    console.log('📋 Updating profile completion UI');

    const completionCard = document.getElementById('profileCompletionCard');
    const progressBar = document.getElementById('profileProgressBar');
    const progressText = document.getElementById('profileProgressText');

    if (!completionCard || !progressBar || !progressText) {
        console.log('⚠️ Profile completion elements not found');
        return;
    }

    // Fetch completion data from the new API
    fetchProfileCompletionFromApi(current_user_id).then(completionData => {
        if (completionData) {
            const completionPercentage = completionData.completion_percentage || 0;

            console.log(`✅ Profile completion updated from API: ${completionPercentage}%`);

            // Update progress bar
            progressBar.style.width = `${completionPercentage}%`;
            progressBar.setAttribute('aria-valuenow', completionPercentage);
            progressText.textContent = `${completionPercentage}%`;

            // Show/hide completion card based on completion percentage
            if (completionPercentage < 100) {
                completionCard.style.display = 'block';

                // Update progress bar color based on completion
                progressBar.classList.remove('bg-danger', 'bg-warning', 'bg-success');
                if (completionPercentage < 30) {
                    progressBar.classList.add('bg-danger');
                } else if (completionPercentage < 70) {
                    // progressBar.classList.add('bg-warning');
                } else {
                    progressBar.classList.add('bg-success');
                }
            } else {
                completionCard.style.display = 'none';
                localStorage.setItem('profile_complete', 'true');
                localStorage.setItem('is_approved', completionData.is_approved ? 'true' : 'false');

                console.log('✅ Profile complete - status:', completionData.is_approved ? 'approved' : 'awaiting approval');
            }

            // Update localStorage with fresh completion data
            localStorage.setItem('profile_complete', completionData.profile_completed ? 'true' : 'false');
            localStorage.setItem('is_approved', completionData.is_approved ? 'true' : 'false');
        } else {
            console.log('⚠️ No completion data received from API');
            completionCard.style.display = 'none';
        }
    }).catch(error => {
        console.error('❌ Failed to fetch profile completion:', error);
        // Hide completion card on error
        completionCard.style.display = 'none';
    });
}

/**
 * Fetch profile completion data from API
 */
async function fetchProfileCompletionFromApi(userId) {
    try {
        const apiUrl = `/user-api/profile-completion-api/${userId}/`;
        const [success, response] = await callApi('GET', apiUrl, null, csrf_token);

        if (success && response.success) {
            console.log('✅ Profile completion data fetched:', response.data);
            return response.data;
        } else {
            console.error('❌ API error:', response.error);
            return null;
        }
    } catch (error) {
        console.error('❌ Network error fetching profile completion:', error);
        return null;
    }
}

/**
 * Check and update profile completion status using API
 */
async function checkAndUpdateProfileCompletion() {
    try {
        if (!current_user_id) {
            console.log('⚠️ No user ID available for profile completion check');
            return;
        }

        console.log(`🔍 Checking profile completion via API for user: ${current_user_id}`);

        // Fetch completion data from API
        const completionData = await fetchProfileCompletionFromApi(current_user_id);

        if (!completionData) {
            console.error('❌ Failed to fetch profile completion data');
            return;
        }

        const completionPercentage = completionData.completion_percentage || 0;
        console.log(`🔍 Profile completion check: ${completionPercentage}%`);

        if (completionPercentage >= 100) {
            // Profile is complete
            localStorage.setItem('profile_complete', 'true');
            localStorage.setItem('is_approved', completionData.is_approved ? 'true' : 'false');

            console.log('✅ Profile complete - localStorage updated', {
                profile_complete: 'true',
                is_approved: completionData.is_approved ? 'true' : 'false'
            });

            // Show success message about profile completion
            showSuccess('Profile completed! Your account is now under review for approval.');

            // Refresh the page after a short delay to update the status bar
            setTimeout(() => {
                console.log('🔄 Refreshing page to update status bar...');
                window.location.reload();
            }, 2000); // 2 second delay to allow user to see the success message

        } else {
            // Profile is not complete
            localStorage.setItem('profile_complete', 'false');
            console.log(`📝 Profile incomplete (${completionPercentage}%) - localStorage updated (profile_complete: false)`);

            // Show which fields are missing
            if (completionData.missing_fields && completionData.missing_fields.length > 0) {
                console.log('📝 Missing fields:', completionData.missing_fields);
            }
        }
    } catch (error) {
        console.error('❌ Error checking profile completion:', error);
    }
}

/**
 * Handle complete profile button click
 */
function completeProfile() {
    // Switch to settings tab
    const settingsTab = document.querySelector('[data-tab="settings"]');
    const settingsTabContent = document.getElementById('settings-tab');

    if (settingsTab && settingsTabContent) {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-button-home').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove active class from all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Add active class to settings tab
        settingsTab.classList.add('active');
        settingsTabContent.classList.add('active');

        // Scroll to settings section
        settingsTabContent.scrollIntoView({ behavior: 'smooth' });

        // Enable edit mode for both profile and company info
        setTimeout(() => {
            enableEditModeAndHighlightMissing();
        }, 500); // Small delay to ensure tab switch is complete

        console.log('📝 Switched to settings tab for profile completion');
    } else {
        console.error('❌ Settings tab not found');
    }
}

/**
 * Enable edit mode and highlight missing fields
 */
function enableEditModeAndHighlightMissing() {
    const userTypeEl = document.getElementById('userType');
    const isCorporate = userTypeEl && userTypeEl.value === 'seller_corporate';

    // Enable edit mode for profile
    toggleProfileEdit(true);

    // If corporate user, also enable company edit mode
    if (isCorporate) {
        toggleCompanyEdit(true);
    }

    // Highlight missing fields after a short delay to ensure edit mode is active
    setTimeout(() => {
        highlightMissingFields();
    }, 200);
}

/**
 * Highlight missing fields in red
 */
function highlightMissingFields() {
    const userTypeEl = document.getElementById('userType');
    const isCorporate = userTypeEl && userTypeEl.value === 'seller_corporate';

    // Remove existing highlighting first
    removeFieldHighlighting();

    // Define required fields based on user type
    let requiredFields = [];

    if (isCorporate) {
        // Corporate user required fields
        requiredFields = [
            { id: 'fullName', label: 'Full Name', card: 'profile' },
            { id: 'email', label: 'Email Address', card: 'profile' },
            { id: 'companyName', label: 'Company Name', card: 'company' },
            { id: 'companyPanNumber', label: 'Company PAN Number', card: 'company' },
            { id: 'gstNumber', label: 'GST Number', card: 'company' },
            { id: 'companyAddressLine1', label: 'Company Address Line 1', card: 'company' },
            { id: 'companyCity', label: 'Company City', card: 'company' },
            { id: 'companyState', label: 'Company State', card: 'company' },
            { id: 'companyPincode', label: 'Company Pincode', card: 'company' }
        ];
    } else {
        // Individual user required fields
        requiredFields = [
            { id: 'fullName', label: 'Full Name', card: 'profile' },
            { id: 'email', label: 'Email Address', card: 'profile' },
            { id: 'panNumber', label: 'PAN Number', card: 'profile' },
            { id: 'addressline1', label: 'Address Line 1', card: 'profile' },
            { id: 'cityname', label: 'City', card: 'profile' },
            { id: 'statename', label: 'State', card: 'profile' },
            { id: 'addresspincode', label: 'Pincode', card: 'profile' }
        ];
    }

    let missingFields = [];

    // Check each required field
    requiredFields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            const value = element.value ? element.value.trim() : '';
            if (!value) {
                // Add red border and background to highlight missing field
                element.classList.remove('editable');
                element.classList.add('missing-field', 'pulse');

                missingFields.push(field.label);

                // Add event listener to remove highlighting when field is filled
                const inputHandler = function () {
                    if (this.value.trim()) {
                        removeFieldHighlight(this);
                        // Remove the event listener to avoid memory leaks
                        this.removeEventListener('input', inputHandler);
                        this.removeEventListener('change', inputHandler);
                    }
                };

                // Add both input and change event listeners for better coverage
                element.addEventListener('input', inputHandler);
                element.addEventListener('change', inputHandler);

                // Add focus event to remove pulse animation
                element.addEventListener('focus', function () {
                    this.classList.remove('pulse');
                }, { once: true });
            } else {
                // If field has value but still has missing-field class, remove it
                if (element.classList.contains('missing-field')) {
                    removeFieldHighlight(element);
                }
            }
        }
    });

    // Don't highlight card headers - only highlight specific input fields

    // Show notification about missing fields
    if (missingFields.length > 0) {

        // Auto-scroll to first missing field after a short delay
        setTimeout(() => {
            const firstMissingField = document.querySelector('.missing-field');
            if (firstMissingField) {
                firstMissingField.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                // Focus on the first missing field
                setTimeout(() => {
                    firstMissingField.focus();
                }, 500);
            }
        }, 1000);
    } else {
        showSuccess('✅ All required fields are completed!');
        console.log('✅ All required fields are completed');
    }
}

/**
 * Remove highlighting from a specific field
 */
function removeFieldHighlight(element) {
    // Remove all missing field related classes and styles
    element.classList.remove('missing-field', 'pulse');
    element.style.borderColor = '';
    element.style.backgroundColor = '';
    element.style.boxShadow = '';

    // Also remove any Bootstrap validation classes that might interfere
    element.classList.remove('is-invalid');
}

/**
 * Remove all field highlighting
 */
function removeFieldHighlighting() {
    // Remove field highlighting only - no card header highlighting
    document.querySelectorAll('.missing-field').forEach(field => {
        removeFieldHighlight(field);
    });
}

/**
 * Check all fields and remove missing-field class from fields that have values
 */
function cleanupMissingFieldClasses() {
    // Get all elements with missing-field class
    document.querySelectorAll('.missing-field').forEach(element => {
        const value = element.value ? element.value.trim() : '';
        if (value) {
            // Field has value but still has missing-field class, remove it
            removeFieldHighlight(element);
            console.log('🧹 Cleaned up missing-field class from filled field:', element.id);
        }
    });
}

// Make completeProfile function globally available
window.completeProfile = completeProfile;

console.log('🔐 WasteBazar Seller Profile System Loaded');




