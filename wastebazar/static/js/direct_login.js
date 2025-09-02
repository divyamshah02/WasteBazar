/**
 * Direct Login Handler for WasteBazar
 * Handles the simplified login flow with OTP verification and role-based redirection
 */
let otpValue = "";
class DirectLoginHandler {

    constructor(config) {
        this.csrfToken = config.csrfToken;
        this.otpApiUrl = config.otpApiUrl;
        this.dashboardUrl = config.dashboardUrl;
        this.registerUrl = config.registerUrl;
        this.buyerProfileUrl = config.buyerProfileUrl;
        this.sellerProfileUrl = config.sellerProfileUrl;

        this.currentStep = 1;
        this.mobileNumber = "";
        this.otpId = "";
        this.resendTimer = 30;
        this.resendInterval = null;

        console.log('🚀 Direct Login Handler initialized');
        this.init();
    }

    init() {
        this.setupMobileInput();
        this.setupOtpInputs();
        this.setupSendOtp();
        this.setupVerifyOtp();
        this.setupBackButton();
        this.setupResendOtp();
    }

    setupMobileInput() {
        const mobileInput = document.getElementById('loginMobileNumber');
        const sendOtpBtn = document.getElementById('loginSendOtp');

        // Format mobile number input
        mobileInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 10) {
                value = value.slice(0, 10);
            }
            e.target.value = value;

            // Enable/disable send OTP button
            if (value.length === 10) {
                sendOtpBtn.disabled = false;
            } else {
                sendOtpBtn.disabled = true;
            }
        });

        // Allow submission on Enter key
        mobileInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && mobileInput.value.length === 10) {
                this.sendOtp();
            }
        });
    }

    setupOtpInputs() {
        const otpInputs = document.querySelectorAll('.login-otp-input');

        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value.replace(/\D/g, '');
                e.target.value = value;

                // Auto-focus next input
                if (value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }

                // Check if all inputs are filled
                this.checkOtpComplete();
            });

            input.addEventListener('keydown', (e) => {
                // Handle backspace
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1].focus();
                }

                // Handle Enter key when OTP is complete
                if (e.key === 'Enter') {
                    this.checkOtpComplete();
                    const otp = this.getOtpValue();
                    if (otp.length === 6) {
                        this.verifyOtp();
                    }
                }
            });

            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
                if (pastedData.length === 6) {
                    otpInputs.forEach((inp, idx) => {
                        inp.value = pastedData[idx] || '';
                    });
                    this.checkOtpComplete();
                }
            });
        });
    }

    setupSendOtp() {
        const sendOtpBtn = document.getElementById('loginSendOtp');
        sendOtpBtn.addEventListener('click', () => this.sendOtp());
    }

    setupVerifyOtp() {
        const verifyOtpBtn = document.getElementById('loginVerifyOtp');
        verifyOtpBtn.addEventListener('click', () => this.verifyOtp());
    }

    setupBackButton() {
        const backBtn = document.getElementById('loginBackStep1');
        backBtn.addEventListener('click', () => this.goBackToStep1());
    }

    setupResendOtp() {
        const resendLink = document.getElementById('loginResendOtp');
        resendLink.addEventListener('click', () => {
            if (!resendLink.style.display || resendLink.style.display === 'none') return;
            this.sendOtp(true);
        });
    }


    async sendOtp(isResend = false) {
        const mobileInput = document.getElementById('loginMobileNumber');
        const sendOtpBtn = document.getElementById('loginSendOtp');
        const btnText = sendOtpBtn.querySelector('.login-btn-text');
        const originalText = btnText.textContent;

        try {
            this.mobileNumber = mobileInput.value.trim();

            if (this.mobileNumber.length !== 10) {
                this.showError('Please enter a valid 10-digit mobile number');
                return;
            }

            // Show loading
            btnText.textContent = isResend ? 'Resending...' : 'Sending...';
            sendOtpBtn.disabled = true;

            console.log('📱 Sending OTP to:', this.mobileNumber);

            const [success, result] = await callApi("POST", this.otpApiUrl, {
                mobile: this.mobileNumber
            }, this.csrfToken);

            if (success && result.success) {
                this.otpId = result.data.otp_id;
                console.log('✅ OTP sent successfully, ID:', this.otpId);
                otpValue = result.data.otp; // Store OTP for testing purposes
                console.log('Otp for testing:', result.data.otp);

                // Check if user already exists and has completed profile
                if (result.data.user_exists && result.data.user_details_exist) {
                    const userRole = result.data.user_role;
                    console.log('🔄 Existing user found with role:', userRole);

                    // Show success message and redirect based on role
                    this.showSuccess('Welcome back! Redirecting to your profile...');
                    setTimeout(() => {
                        this.redirectBasedOnRole(userRole);
                    }, 1000);
                    return;
                }

                if (!isResend) {
                    this.goToStep2();
                    // Auto-fill OTP after transitioning to step 2
                    setTimeout(() => {
                        this.autoFillOtpInputs(result.data.otp);
                    }, 300); // Small delay to ensure step 2 is fully rendered
                } else {
                    // For resend, auto-fill immediately since we're already on step 2
                    this.autoFillOtpInputs(result.data.otp);
                }

                this.showSuccess(isResend ? 'OTP resent successfully!' : 'OTP sent successfully!');
                this.startResendTimer();
            } else {
                this.showError(result.error || 'Failed to send OTP. Please try again.');
            }
        } catch (error) {
            console.error('❌ Error sending OTP:', error);
            this.showError('Network error. Please check your connection.');
        } finally {
            btnText.textContent = originalText;
            if (!isResend) {
                sendOtpBtn.disabled = this.mobileNumber.length !== 10;
            }
        }
    }

    async verifyOtp() {
        const verifyOtpBtn = document.getElementById('loginVerifyOtp');
        const btnText = verifyOtpBtn.querySelector('.login-btn-text');
        const originalText = btnText.textContent;

        try {
            const otp = this.getOtpValue();


            if (otp.length !== 6) {
                this.showError('Please enter the complete 6-digit OTP');
                return;
            }

            // Show loading
            btnText.textContent = 'Verifying...';
            verifyOtpBtn.disabled = true;

            console.log('🔐 Verifying OTP:', otp);

            // For direct login, we use a placeholder user_type since the API requires it
            // The API will find existing user by mobile number and return their actual role
            const [success, result] = await callApi("PUT", `${this.otpApiUrl}${this.otpId}/`, {
                otp: otp,
                user_type: "buyer_individual" // Placeholder, actual role will come from existing user
            }, this.csrfToken);

            if (success && result.success) {
                if (result.data.otp_verified) {
                    const userId = result.data.user_id;
                    const userRole = result.data.user_role;
                    const userDetailsExist = result.data.user_details;

                    const loggedin = 'true';

                    console.log('✅ OTP verified successfully');
                    console.log('👤 User ID:', userId);
                    console.log('🎭 User Role:', userRole);
                    console.log('📋 User Details Exist:', userDetailsExist);

                    // Store user info in localStorage
                    localStorage.setItem('user_id', userId);
                    localStorage.setItem('user_role', userRole);
                    localStorage.setItem('login_timestamp', new Date().toISOString());
                    localStorage.setItem('is_logged_in', loggedin);

                    // Debug: Confirm values are stored
                    console.log('✅ Stored in localStorage:');
                    console.log('  - user_id:', localStorage.getItem('user_id'));
                    console.log('  - user_role:', localStorage.getItem('user_role'));
                    console.log('  - is_logged_in:', localStorage.getItem('is_logged_in'));

                    if (userDetailsExist) {
                        // User has completed profile, redirect based on role
                        this.redirectBasedOnRole(userRole);
                    } else {
                        // User needs to complete profile, redirect to registration
                        this.showSuccess('Login successful! Please complete your profile.');
                        setTimeout(() => {
                            window.location.href = this.registerUrl;
                        }, 1500);
                    }
                } else {
                    this.showError(result.data.message || 'OTP verification failed');
                }
            } else {
                this.showError(result.error || 'Failed to verify OTP. Please try again.');
            }
        } catch (error) {
            console.error('❌ Error verifying OTP:', error);
            this.showError('Network error. Please check your connection.');
        } finally {
            btnText.textContent = originalText;
            verifyOtpBtn.disabled = false;
        }
    }

    redirectBasedOnRole(userRole) {
        console.log('🚀 Redirecting user based on role:', userRole);

        // Check if we're currently on a listing detail page
        const currentPath = window.location.pathname;
        const isListingDetailPage = currentPath.includes('/listing-detail/') || currentPath.includes('/listing/');

        if (isListingDetailPage) {
            // If on listing detail page, redirect back to the same page
            this.showSuccess('Welcome back! Redirecting to listing...');
            setTimeout(() => {
                window.location.reload(); // Reload the current page to update login state
            }, 1500);
        } else if (userRole.includes('seller')) {
            // Redirect to seller profile
            this.showSuccess('Welcome back! Redirecting to your seller profile...');
            setTimeout(() => {
                window.location.href = this.sellerProfileUrl;
            }, 1500);
        } else if (userRole.includes('buyer')) {
            // Redirect to buyer profile
            this.showSuccess('Welcome back! Redirecting to your buyer profile...');
            setTimeout(() => {
                window.location.href = this.buyerProfileUrl;
            }, 1500);
        } else {
            // Fallback to dashboard for unknown roles
            this.showSuccess('Welcome back! Redirecting to dashboard...');
            setTimeout(() => {
                window.location.href = this.dashboardUrl;
            }, 1500);
        }
    }

    getOtpValue() {
        const otpInputs = document.querySelectorAll('.login-otp-input');
        // return Array.from(otpInputs).map(input => input.value).join('');
        return otpValue;

    }

    checkOtpComplete() {
        const otp = this.getOtpValue();
        // const otp = otpValue;
        const verifyOtpBtn = document.getElementById('loginVerifyOtp');

        if (otp.length === 6) {
            verifyOtpBtn.disabled = false;
        } else {
            verifyOtpBtn.disabled = true;
        }
    }

    /**
     * Auto-fills the OTP input fields with the provided OTP value
     * @param {string|number} otp - The OTP value to fill in the inputs
     */
    autoFillOtpInputs(otp) {
        console.log('🔄 Auto-filling OTP inputs with value:', otp);

        const otpInputs = document.querySelectorAll('.login-otp-input');
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
            const verifyOtpBtn = document.getElementById('loginVerifyOtp');
            verifyOtpBtn.disabled = false;

            // Add visual feedback
            verifyOtpBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            setTimeout(() => {
                verifyOtpBtn.style.background = '';
            }, 1000);
        }

        console.log('✅ OTP inputs auto-filled successfully');
    }

    goToStep2() {
        // Update progress indicator
        document.getElementById('loginDot1').classList.add('completed');
        document.getElementById('loginDot1').classList.remove('active');
        document.getElementById('loginDot2').classList.add('active');

        // Hide step 1, show step 2
        document.getElementById('loginStep1').classList.add('login-step-hidden');
        document.getElementById('loginStep2').classList.remove('login-step-hidden');

        // Update mobile number display
        document.getElementById('loginDisplayMobile').textContent = `+91 ${this.mobileNumber}`;

        // Focus on first OTP input
        document.querySelector('.login-otp-input').focus();

        this.currentStep = 2;
        console.log('📱 Moved to Step 2: OTP Verification');
    }

    goBackToStep1() {
        // Update progress indicator
        document.getElementById('loginDot2').classList.remove('active');
        document.getElementById('loginDot1').classList.remove('completed');
        document.getElementById('loginDot1').classList.add('active');

        // Show step 1, hide step 2
        document.getElementById('loginStep2').classList.add('login-step-hidden');
        document.getElementById('loginStep1').classList.remove('login-step-hidden');

        // Clear OTP inputs
        document.querySelectorAll('.login-otp-input').forEach(input => input.value = '');
        this.checkOtpComplete();

        // Clear any timer
        if (this.resendInterval) {
            clearInterval(this.resendInterval);
        }

        this.currentStep = 1;
        console.log('🔙 Back to Step 1: Mobile Number');
    }

    startResendTimer() {
        const resendTimer = document.getElementById('loginResendTimer');
        const resendLink = document.getElementById('loginResendOtp');

        this.resendTimer = 30;
        resendLink.style.display = 'none';
        resendTimer.style.display = 'inline';

        this.resendInterval = setInterval(() => {
            this.resendTimer--;
            resendTimer.textContent = `Resend OTP in ${this.resendTimer}s`;

            if (this.resendTimer <= 0) {
                clearInterval(this.resendInterval);
                resendTimer.style.display = 'none';
                resendLink.style.display = 'inline';
            }
        }, 1000);
    }

    showError(message) {
        const errorElement = document.getElementById('loginErrorMessage');
        const successElement = document.getElementById('loginSuccessMessage');

        successElement.style.display = 'none';
        errorElement.textContent = message;
        errorElement.style.display = 'block';

        console.error('❌ Error:', message);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        const errorElement = document.getElementById('loginErrorMessage');
        const successElement = document.getElementById('loginSuccessMessage');

        errorElement.style.display = 'none';
        successElement.textContent = message;
        successElement.style.display = 'block';

        console.log('✅ Success:', message);

        // Auto-hide after 3 seconds
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 3000);
    }
}

// Export for global use
window.DirectLoginHandler = DirectLoginHandler;

console.log('🔐 WasteBazar Direct Login System Loaded');