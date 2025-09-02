// Login Script for WasteBazar
let currentStep = 1
let selectedRole = ""
let selectedType = ""
let userType = ""
let mobileNumber = ""
let otpId = ""
let userId = ""
let resendTimer = 30
let resendInterval

// Global variables for API endpoints and CSRF token
let csrf_token = null;
let otp_api_url = null;
let user_details_api_url = null;
let buyer_detail_api_url = null;
let seller_detail_api_url = null;
let categories_api_url = null;
let preferred_category_api_url = null;

async function LoginApp(csrf_token_param, otp_api_url_param, user_details_api_url_param, buyer_detail_api_url_param, seller_detail_api_url_param, categories_api_url_param, preferred_category_api_url_param) {
    csrf_token = csrf_token_param;
    otp_api_url = otp_api_url_param;
    user_details_api_url = user_details_api_url_param;
    buyer_detail_api_url = buyer_detail_api_url_param;
    seller_detail_api_url = seller_detail_api_url_param;
    categories_api_url = categories_api_url_param;
    preferred_category_api_url = preferred_category_api_url_param;

    console.log("🚀 Initializing WasteBazar Login Flow")
    console.log("🔧 CSRF Token:", csrf_token_param ? "Present" : "Missing");
    console.log("🔧 OTP API URL:", otp_api_url_param);
    console.log("🔧 User Details API URL:", user_details_api_url_param);
    console.log("🔧 Buyer Detail API URL:", buyer_detail_api_url_param);
    console.log("🔧 Seller Detail API URL:", seller_detail_api_url_param);
    console.log("🔧 Categories API URL:", categories_api_url_param);
    console.log("🔧 Preferred Category API URL:", preferred_category_api_url_param);

    initializeLoginFlow()
}


function initializeLoginFlow() {
    // Step 1: Role selection
    setupRoleSelection()

    // Step 2: Type selection
    setupTypeSelection()

    // Step 3: Mobile verification
    setupMobileVerification()

    // Step 4: OTP verification
    setupOtpVerification()

    // Step 5: Preferred category selection
    setupPreferredCategorySelection()

    // Step 6: User details form
    setupUserDetailsForm()

    // Navigation buttons
    setupNavigationButtons()
}

function getCsrfToken() {
    return csrf_token;
}

// Get appropriate redirect URL based on user role
function getRedirectUrl(userRole) {
    console.log("🔄 Determining redirect URL for role:", userRole);

    if (userRole === "seller" || userRole === "seller_individual" || userRole === "seller_corporate") {
        console.log("➡️ Redirecting to seller profile");
        return "/seller-profile/?first=1";
    } else if (userRole === "buyer" || userRole === "buyer_individual" || userRole === "buyer_corporate") {
        console.log("➡️ Redirecting to buyer profile");
        return "/buyer-profile";
    } else {
        console.log("⚠️ Unknown role, redirecting to home");
        return "/";
    }
}

// Step 1: Role Selection (Buyer/Seller)
function setupRoleSelection() {
    const roleCards = document.querySelectorAll("#step1 .user-type-card")
    const nextBtn = document.getElementById("nextStep1")

    roleCards.forEach((card) => {
        card.addEventListener("click", function () {
            // Remove selection from all cards
            roleCards.forEach((c) => c.classList.remove("selected"))

            // Select current card
            this.classList.add("selected")
            selectedRole = this.dataset.role

            // Enable next button
            nextBtn.disabled = false

            console.log("Selected role:", selectedRole)
        })
    })

    nextBtn.addEventListener("click", () => {
        if (selectedRole) {
            goToStep(2)
        }
    })
}

// Step 2: Type Selection (Individual/Corporate)
function setupTypeSelection() {
    const typeCards = document.querySelectorAll("#step2 .user-type-card")
    const nextBtn = document.getElementById("nextStep2")

    typeCards.forEach((card) => {
        card.addEventListener("click", function () {
            // Remove selection from all cards
            typeCards.forEach((c) => c.classList.remove("selected"))

            // Select current card
            this.classList.add("selected")
            selectedType = this.dataset.type

            // Set user type for API
            userType = `${selectedRole}_${selectedType}`

            // Enable next button
            nextBtn.disabled = false

            console.log("Selected type:", selectedType)
            console.log("User type for API:", userType)
        })
    })

    nextBtn.addEventListener("click", () => {
        if (selectedType) {
            goToStep(3)
        }
    })
}

// Step 3: Mobile Verification
function setupMobileVerification() {
    const mobileInput = document.getElementById("mobileNumber")
    const sendOtpBtn = document.getElementById("sendOtp")

    mobileInput.addEventListener("input", function () {
        const mobile = this.value.trim()
        sendOtpBtn.disabled = mobile.length !== 10 || !/^\d{10}$/.test(mobile)
    })

    sendOtpBtn.addEventListener("click", async () => {
        const mobile = mobileInput.value.trim()

        if (mobile.length !== 10 || !/^\d{10}$/.test(mobile)) {
            showError("Please enter a valid 10-digit mobile number")
            return
        }

        mobileNumber = mobile
        await sendOtp()
    })
}

// Step 4: OTP Verification
function setupOtpVerification() {
    const otpInputs = document.querySelectorAll(".otp-input")
    const verifyBtn = document.getElementById("verifyOtp")
    const resendBtn = document.getElementById("resendOtp")

    // OTP input handling
    otpInputs.forEach((input, index) => {
        input.addEventListener("input", function () {
            if (this.value.length === 1) {
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus()
                }
            }

            // Check if all inputs are filled
            const allFilled = Array.from(otpInputs).every((inp) => inp.value.length === 1)
            verifyBtn.disabled = !allFilled
        })

        input.addEventListener("keydown", function (e) {
            if (e.key === "Backspace" && this.value === "" && index > 0) {
                otpInputs[index - 1].focus()
            }
        })
    })

    verifyBtn.addEventListener("click", async () => {
        const otp = Array.from(otpInputs)
            .map((input) => input.value)
            .join("")
        if (otp.length === 6) {
            await verifyOtp(otp)
        }
    })

    resendBtn.addEventListener("click", async () => {
        await sendOtp()
    })
}

// Step 5: User Details Form
function setupUserDetailsForm() {
    const form = document.getElementById("userDetailsForm")

    form.addEventListener("submit", async (e) => {
        e.preventDefault()

        // Validate form before submission
        if (validateUserDetailsForm()) {
            await submitUserDetails()
        }
    })
}

// Add form validation function
function validateUserDetailsForm() {
    if (selectedType === "corporate") {
        // For corporate users, only validate contact name and email
        const contactName = document.getElementById('contactName')
        const corporateEmail = document.getElementById('corporateEmail')

        let isValid = true

        // Validate contact name
        if (!contactName || contactName.value.trim() === '') {
            if (contactName) contactName.classList.add('is-invalid')
            isValid = false
        } else {
            if (contactName) contactName.classList.remove('is-invalid')
        }

        // Validate email
        if (!corporateEmail || corporateEmail.value.trim() === '' ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(corporateEmail.value.trim())) {
            if (corporateEmail) corporateEmail.classList.add('is-invalid')
            isValid = false
        } else {
            if (corporateEmail) corporateEmail.classList.remove('is-invalid')
        }

        if (!isValid) {
            showError("Please fill in contact name and valid email address")
        }

        return isValid
    } else {
        // For individual users, validate all required fields
        const requiredFields = document.querySelectorAll('#individualFields input[required]')
        let isValid = true

        requiredFields.forEach(field => {
            if (field.offsetParent !== null && field.value.trim() === '') {
                field.classList.add('is-invalid')
                isValid = false
            } else {
                field.classList.remove('is-invalid')
            }
        })

        if (!isValid) {
            showError("Please fill in all required fields")
        }

        return isValid
    }
}

// Step 5: Preferred Category Selection
function setupPreferredCategorySelection() {
    const categorySelect = document.getElementById("preferredCategory")
    const nextBtn = document.getElementById("nextStep5")

    // Load categories when step is reached
    loadCategories()

    // Enable next button when category is selected
    categorySelect.addEventListener("change", function () {
        if (this.value) {
            nextBtn.disabled = false
            console.log("Selected preferred category:", this.value)
        } else {
            nextBtn.disabled = true
        }
    })

    // Handle next button click
    nextBtn.addEventListener("click", async () => {
        if (categorySelect.value && userId) {
            await savePreferredCategory(categorySelect.value)
        }
    })
}

// Load categories from API
async function loadCategories() {
    try {
        console.log("📡 Loading categories from:", categories_api_url)

        const [success, result] = await callApi('GET', categories_api_url, null, getCsrfToken())

        if (success && result.success) {
            const categories = result.data
            const categorySelect = document.getElementById("preferredCategory")

            // Clear existing options except the default one
            categorySelect.innerHTML = '<option value="">Choose a category...</option>'

            // Add category options
            categories.forEach(category => {
                const option = document.createElement('option')
                option.value = category.category_id
                option.textContent = category.title
                categorySelect.appendChild(option)
            })

            console.log("✅ Loaded", categories.length, "categories")
        } else {
            console.error("❌ Failed to load categories:", result.error)
            showError("Failed to load categories. Please try again.")
        }
    } catch (error) {
        console.error("❌ Error loading categories:", error)
        showError("Failed to load categories. Please try again.")
    }
}

// Save preferred category
async function savePreferredCategory(categoryId) {
    try {
        console.log("💾 Saving preferred category:", categoryId, "for user:", userId)

        const [success, result] = await callApi('PUT', `${preferred_category_api_url}${userId}/`, {
            preferred_category: categoryId
        }, getCsrfToken())

        if (success && result.success) {
            console.log("✅ Preferred category saved successfully")
            showSuccess("Preferred category selected!")
            goToStep(6) // Go to user details form
        } else {
            console.error("❌ Failed to save preferred category:", result.error)
            showError(result.error || "Failed to save preferred category")
        }
    } catch (error) {
        console.error("❌ Error saving preferred category:", error)
        showError("Failed to save preferred category. Please try again.")
    }
}

// Navigation buttons
function setupNavigationButtons() {
    document.getElementById("backStep1").addEventListener("click", () => goToStep(1))
    document.getElementById("backStep2").addEventListener("click", () => goToStep(2))
    document.getElementById("backStep3").addEventListener("click", () => goToStep(3))
    document.getElementById("backStep4").addEventListener("click", () => goToStep(4))
}

// Navigation functions
function goToStep(step) {
    // Hide all steps
    document.querySelectorAll(".step-container").forEach((container) => {
        container.classList.add("step-hidden")
    })

    // Show current step
    document.getElementById(`step${step}`).classList.remove("step-hidden")

    // Update progress dots
    updateProgressDots(step)

    currentStep = step

    // Special handling for step 4
    if (step === 4) {
        document.getElementById("displayMobile").textContent = mobileNumber
        startResendTimer()
    }

    // Special handling for step 5
    if (step === 5) {
        setupPreferredCategorySelection()
    }

    // Special handling for step 6
    if (step === 6) {
        setupUserDetailsFields()
    }

    console.log("Moved to step:", step)
}


function updateProgressDots(step) {
    for (let i = 1; i <= 6; i++) {
        const dot = document.getElementById(`dot${i}`)
        dot.classList.remove("active", "completed")

        if (i < step) {
            dot.classList.add("completed")
        } else if (i === step) {
            dot.classList.add("active")
        }
    }
}


function setupUserDetailsFields() {
    const individualFields = document.getElementById("individualFields")
    const corporateFields = document.getElementById("corporateFields")

    if (selectedType === "individual") {
        individualFields.style.display = "block"
        corporateFields.style.display = "none"

        // Remove required attribute from corporate fields
        corporateFields.querySelectorAll('input[required], textarea[required]').forEach(field => {
            field.removeAttribute('required')
        })

        // Add required attribute to individual fields
        individualFields.querySelectorAll('input').forEach(field => {
            if (field.type !== 'url') {
                field.setAttribute('required', 'required')
            }
        })

        // Initialize individual PAN/Aadhar selector
        setupIndividualIdSelector()
    } else {
        individualFields.style.display = "none"
        corporateFields.style.display = "block"

        // Remove required attribute from individual fields
        individualFields.querySelectorAll('input[required]').forEach(field => {
            field.removeAttribute('required')
        })

        // For corporate users, only contact name and email are required
        corporateFields.querySelectorAll('input, textarea').forEach(field => {
            field.removeAttribute('required')
        })

        // Add required attribute only to contact name and email
        const contactName = document.getElementById('contactName')
        const corporateEmail = document.getElementById('corporateEmail')
        if (contactName) contactName.setAttribute('required', 'required')
        if (corporateEmail) corporateEmail.setAttribute('required', 'required')

        // Initialize PAN/CIN selector
        setupCorporateIdSelector()

        // Setup real-time validation for corporate form
        setupCorporateFormValidation()
    }
}

// Setup real-time validation for corporate form
function setupCorporateFormValidation() {
    const contactName = document.getElementById('contactName')
    const corporateEmail = document.getElementById('corporateEmail')
    const submitBtn = document.querySelector('#userDetailsForm button[type="submit"]')

    function validateCorporateForm() {
        const nameValid = contactName && contactName.value.trim().length > 0
        const emailValid = corporateEmail && corporateEmail.value.trim().length > 0 &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(corporateEmail.value.trim())

        const isValid = nameValid && emailValid

        if (submitBtn) {
            submitBtn.disabled = !isValid

            // Visual feedback
            if (isValid) {
                submitBtn.style.opacity = '1'
                submitBtn.style.cursor = 'pointer'
            } else {
                submitBtn.style.opacity = '0.6'
                submitBtn.style.cursor = 'not-allowed'
            }
        }

        return isValid
    }

    // Add event listeners for real-time validation
    if (contactName) {
        contactName.addEventListener('input', validateCorporateForm)
        contactName.addEventListener('blur', validateCorporateForm)
    }

    if (corporateEmail) {
        corporateEmail.addEventListener('input', validateCorporateForm)
        corporateEmail.addEventListener('blur', validateCorporateForm)
    }

    // Initial validation
    validateCorporateForm()
}

// PAN/CIN selector for corporate users (dropdown based)
function setupCorporateIdSelector() {
    const selectEl = document.getElementById('corpIdSelect')
    const panGroup = document.getElementById('corpPanGroup')
    const cinGroup = document.getElementById('corpCinGroup')
    const panInput = document.getElementById('corporatepanNumber')
    const cinInput = document.getElementById('cinNumber')

    if (!selectEl || !panGroup || !cinGroup || !panInput || !cinInput) {
        return
    }

    const applySelection = () => {
        const which = selectEl.value
        if (which === 'pan') {
            panGroup.style.display = 'block'
            cinGroup.style.display = 'none'
            panInput.setAttribute('required', 'required')
            cinInput.removeAttribute('required')
            cinInput.value = ''
        } else {
            cinGroup.style.display = 'block'
            panGroup.style.display = 'none'
            cinInput.setAttribute('required', 'required')
            panInput.removeAttribute('required')
            panInput.value = ''
        }
    }

    selectEl.addEventListener('change', applySelection)
    // Initialize based on default selection
    applySelection()
}

// PAN/Aadhar selector for individual users (dropdown based)
function setupIndividualIdSelector() {
    const selectEl = document.getElementById('individualIdSelect')
    const panGroup = document.getElementById('individualPanGroup')
    const aadharGroup = document.getElementById('individualAadharGroup')
    const panInput = document.getElementById('panNumber')
    const aadharInput = document.getElementById('individualAadharNumber')

    if (!selectEl || !panGroup || !aadharGroup || !panInput || !aadharInput) {
        return
    }

    const applySelection = () => {
        const which = selectEl.value
        if (which === 'pan') {
            panGroup.style.display = 'block'
            aadharGroup.style.display = 'none'
            panInput.setAttribute('required', 'required')
            aadharInput.removeAttribute('required')
            aadharInput.value = ''
        } else {
            aadharGroup.style.display = 'block'
            panGroup.style.display = 'none'
            aadharInput.setAttribute('required', 'required')
            panInput.removeAttribute('required')
            panInput.value = ''
        }
    }

    selectEl.addEventListener('change', applySelection)
    applySelection()
}

// API Functions
async function sendOtp() {
    const sendOtpBtn = document.getElementById("sendOtp")
    const originalText = sendOtpBtn.innerHTML

    try {
        // Show loading
        sendOtpBtn.innerHTML = '<div class="loading"></div> Sending...'
        sendOtpBtn.disabled = true

        const [success, result] = await callApi("POST", otp_api_url, {
            mobile: mobileNumber,
        }, getCsrfToken())

        if (success && result.success) {
            otpId = result.data.otp_id
            showSuccess("OTP sent successfully!")
            goToStep(4)
            console.log("OTP sent. ID:", otpId)

            // For development - show OTP in console and auto-fill
            if (result.data.otp) {
                console.log("🔐 OTP for testing:", result.data.otp)
                // Auto-fill OTP inputs for development
                autoFillOtpInputs(result.data.otp)
            }
        } else {
            showError(result.error || "Failed to send OTP. Please try again.")
        }
    } catch (error) {
        console.error("Send OTP error:", error)
        showError("Network error. Please check your connection.")
    } finally {
        sendOtpBtn.innerHTML = originalText
        sendOtpBtn.disabled = false
    }
}

async function verifyOtp(otp) {
    const verifyBtn = document.getElementById("verifyOtp")
    const originalText = verifyBtn.innerHTML

    try {
        // Show loading
        verifyBtn.innerHTML = '<div class="loading"></div> Verifying...'
        verifyBtn.disabled = true

        const [success, result] = await callApi("PUT", `${otp_api_url}${otpId}/`, {
            otp: otp,
            user_type: userType,
        }, getCsrfToken())

        if (success && result.success) {
            if (result.data.otp_verified) {
                userId = result.data.user_id

                if (result.data.user_details) {
                    // User details already filled, redirect to appropriate profile
                    const userRole = result.data.user_role || selectedRole;
                    const is_approved = result.data.is_approved;
                    const profile_complete = result.data.profile_completed;
                    const loggedin = 'true';

                    const redirectUrl = getRedirectUrl(userRole);

                    showSuccess("Login successful! Redirecting...")

                    // Store user info in localStorage for profile pages
                    localStorage.setItem('user_id', userId);
                    localStorage.setItem('user_role', userRole);
                    localStorage.setItem('login_timestamp', new Date().toISOString());
                    localStorage.setItem('is_logged_in', loggedin);
                    localStorage.setItem('is_approved', is_approved);
                    localStorage.setItem('profile_complete', profile_complete);

                    setTimeout(() => {
                        window.location.href = redirectUrl
                    }, 1500)
                } else {
                    // Need to fill user details
                    showSuccess("OTP verified! Please complete your profile.")
                    goToStep(5)
                }

                console.log("OTP verified. User ID:", userId)
            } else {
                showError(result.data.message || "OTP verification failed")
                clearOtpInputs()
            }
        } else {
            showError(result.error || "OTP verification failed")
            clearOtpInputs()
        }
    } catch (error) {
        console.error("Verify OTP error:", error)
        showError("Network error. Please check your connection.")
        clearOtpInputs()
    } finally {
        verifyBtn.innerHTML = originalText
        verifyBtn.disabled = true // Keep disabled until new OTP entered
    }
}

async function submitUserDetails() {
    const submitBtn = document.querySelector('#userDetailsForm button[type="submit"]')
    const submitText = submitBtn.querySelector('.submit-text')
    const originalText = submitText.textContent

    try {
        // Show loading
        submitText.textContent = 'Saving...'
        submitBtn.disabled = true

        let formData = {}

        if (selectedType === "individual") {
            const indivIdType = document.getElementById('individualIdSelect')?.value
            const panVal = indivIdType === 'pan' ? document.getElementById("panNumber")?.value.trim() : ''
            const aadharVal = indivIdType === 'aadhar' ? document.getElementById("individualAadharNumber")?.value.trim() : ''

            formData = {
                name: document.getElementById("fullName").value.trim(),
                email: document.getElementById("email").value.trim(),
                pan_number: panVal,
                aadhar_number: aadharVal,
                addressline1: document.getElementById("addressline1").value.trim(),
                addressline2: document.getElementById("addressline2").value.trim(),
                city: document.getElementById("cityname").value.trim(),
                state: document.getElementById("statename").value.trim(),
                address_pincode: document.getElementById("addresspincode").value.trim()
            }
        } else {
            const idType = document.getElementById('corpIdSelect')?.value
            // const panVal = idType === 'pan' ? document.getElementById("corporatepanNumber").value.trim() : ''
            // const cinVal = idType === 'cin' ? document.getElementById("cinNumber").value.trim() : ''

            formData = {
                name: document.getElementById("contactName").value.trim(),
                email: document.getElementById("corporateEmail").value.trim(),
                // Only include company details if they are filled
                company_name: document.getElementById("companyName")?.value.trim() || '',
                addressline1: document.getElementById("companyAddressLine1")?.value.trim() || '',
                addressline2: document.getElementById("companyAddressLine2")?.value.trim() || '',
                city: document.getElementById("companyCity")?.value.trim() || '',
                state: document.getElementById("companyState")?.value.trim() || '',
                address_pincode: document.getElementById("companyPincode")?.value.trim() || '',
            }
        }

        const [success, result] = await callApi("PUT", `${user_details_api_url}${userId}/`, formData, getCsrfToken())

        if (success && result.success) {
            showSuccess("Registration completed successfully!")

            if (selectedType === "corporate" && selectedRole === "buyer") {
                // Corporate buyer needs approval
                setTimeout(() => {
                    // alert("Your corporate account is under review. You will be notified once approved.")
                    window.location.href = "/buyer-profile"
                }, 2000)
                // Store user info in localStorage for profile pages
                localStorage.setItem('user_id', userId);
                localStorage.setItem('user_role', selectedRole);
                localStorage.setItem('login_timestamp', new Date().toISOString());
                localStorage.setItem('is_logged_in', 'true');
                localStorage.setItem('is_approved', 'false'); // Corporate buyer needs approval
                localStorage.setItem('profile_complete', 'true');

            } else {
                // Redirect to appropriate profile based on role
                const redirectUrl = getRedirectUrl(selectedRole);

                // Store user info in localStorage for profile pages
                localStorage.setItem('user_id', userId);
                localStorage.setItem('user_role', selectedRole);
                localStorage.setItem('login_timestamp', new Date().toISOString());
                localStorage.setItem('is_logged_in', 'true');
                localStorage.setItem('is_approved', 'true'); // Other users are auto-approved
                localStorage.setItem('profile_complete', 'true');

                setTimeout(() => {
                    window.location.href = redirectUrl
                }, 1500)
            }

            console.log("User details saved successfully")
        } else {
            showError(result.error || "Failed to save user details")
        }
    } catch (error) {
        console.error("Submit user details error:", error)
        showError("Network error. Please check your connection.")
    } finally {
        submitText.textContent = originalText
        submitBtn.disabled = false
    }
}

// Utility functions
function showError(message) {
    const errorDiv = document.getElementById("errorMessage")
    const successDiv = document.getElementById("successMessage")

    successDiv.style.display = "none"
    errorDiv.textContent = message
    errorDiv.style.display = "block"

    // Auto hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = "none"
    }, 5000)
}

function showSuccess(message) {
    const errorDiv = document.getElementById("errorMessage")
    const successDiv = document.getElementById("successMessage")

    errorDiv.style.display = "none"
    successDiv.textContent = message
    successDiv.style.display = "block"

    // Auto hide after 3 seconds
    setTimeout(() => {
        successDiv.style.display = "none"
    }, 3000)
}

function clearOtpInputs() {
    document.querySelectorAll(".otp-input").forEach((input) => {
        input.value = ""
    })
    document.querySelectorAll(".otp-input")[0].focus()
}

function startResendTimer() {
    const timerSpan = document.getElementById("resendTimer")
    const resendLink = document.getElementById("resendOtp")

    resendTimer = 30
    timerSpan.style.display = "inline"
    resendLink.style.display = "none"

    resendInterval = setInterval(() => {
        resendTimer--
        timerSpan.textContent = `Resend OTP in ${resendTimer}s`

        if (resendTimer <= 0) {
            clearInterval(resendInterval)
            timerSpan.style.display = "none"
            resendLink.style.display = "inline"
        }
    }, 1000)
}

/**
 * Auto-fills the OTP input fields with the provided OTP value
 * @param {string|number} otp - The OTP value to fill in the inputs
 */
function autoFillOtpInputs(otp) {
    console.log('🔄 Auto-filling OTP inputs with value:', otp);

    const otpInputs = document.querySelectorAll('.otp-input');
    const otpString = otp.toString();

    // Clear all inputs first
    otpInputs.forEach(input => {
        input.value = '';
    });

    // Fill each input with the corresponding digit
    otpInputs.forEach((input, index) => {
        if (index < otpString.length) {
            input.value = otpString[index];

            // Add a small animation effect
            input.style.transform = 'scale(1.1)';
            setTimeout(() => {
                input.style.transform = 'scale(1)';
            }, 150);
        }
    });

    // Enable the verify button if OTP is complete
    if (otpString.length === 6) {
        const verifyOtpBtn = document.getElementById('verifyOtp');
        if (verifyOtpBtn) {
            verifyOtpBtn.disabled = false;

            // Add visual feedback
            verifyOtpBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            setTimeout(() => {
                verifyOtpBtn.style.background = '';
            }, 300);
        }
    }
}


console.log("🔐 WasteBazar Login System Initialized")
