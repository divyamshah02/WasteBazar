// Listing Form Page JavaScript - API Driven

// Global variables for API endpoints and CSRF token
let csrf_token = null;
let create_listing_api_url = null;
let categories_api_url = "/marketplace-api/categories/"; // Categories API endpoint

// Photo upload variables
let featuredImage = null;
let galleryImages = [];
const maxGalleryImages = 5;
const maxFileSize = 5 * 1024 * 1024; // 5MB in bytes

// Categories data
let categoriesData = [];

// Initialize app function
async function ListingsFormApp(csrf_token_param, create_listing_api_url_param) {
    console.log("🚀 Initializing WasteBazar Listing Form Page");
    console.log("🔧 CSRF Token:", csrf_token_param ? "Present" : "Missing");
    console.log("🔧 API URL:", create_listing_api_url_param);

    csrf_token = csrf_token_param;
    create_listing_api_url = create_listing_api_url_param;


    if (!csrf_token) {
        console.error("❌ Missing CSRF Token for ListingsFormApp");
        return;
    }

    await initializeForm();
}

function getCsrfToken() {
    return csrf_token;
}

// Initialize form functionality
async function initializeForm() {
    console.log("🔧 Initializing form components...");

    // Check if user is logged in and is a seller
    const user_id = localStorage.getItem('user_id');
    const user_role = localStorage.getItem('user_role');
    const user_name = localStorage.getItem('user_name'); // Default to 'Guest' if not set

    if (!user_id) {
        console.error("❌ No user ID found in localStorage");
        showError('Please log in to create a listing.');
        return;
    }

    if (!user_role || (!user_role.includes('seller'))) {
        console.error("❌ User is not a seller");
        showError('Only sellers can create listings. Please log in with a seller account.');
        return;
    }

    console.log("✅ User authenticated as seller:", user_id);

    // Load categories first
    await loadCategories();

    initializePhotoUpload();
    initializeFormSubmission();
    await initializeCategorySubcategory();
    initializeStateDropdown();
    initializeUnitPriceUpdater();

    // Initialize image previews
    updateFeaturedImagePreview();
    updateGalleryImagesPreview();
    updateImageCount();

    console.log("✅ Form initialization complete");
}

// Initialize photo upload functionality
function initializePhotoUpload() {
    const featuredInput = document.getElementById('featuredImage');
    const galleryInput = document.getElementById('galleryImages');
    const featuredPreview = document.getElementById('featuredImagePreview');
    const galleryPreview = document.getElementById('galleryPreviewContainer');
    const featuredDropZone = document.getElementById('featuredDropZone');
    const galleryDropZone = document.getElementById('galleryDropZone');

    if (!featuredInput || !galleryInput || !featuredPreview || !galleryPreview) {
        console.error("❌ Photo upload elements not found");
        return;
    }

    // Featured image input change event
    featuredInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            handleFeaturedImageSelection(file);
        }
    });

    // Gallery images input change event
    galleryInput.addEventListener('change', function (e) {
        const files = Array.from(e.target.files);
        handleGalleryImagesSelection(files);
    });

    // Featured image drop zone events
    if (featuredDropZone) {
        setupDropZone(featuredDropZone, featuredInput, handleFeaturedImageSelection, false);
    }

    // Gallery images drop zone events
    if (galleryDropZone) {
        setupDropZone(galleryDropZone, galleryInput, handleGalleryImagesSelection, true);
    }
}

// Setup drop zone functionality
function setupDropZone(dropZone, input, handler, isMultiple) {
    dropZone.addEventListener('click', function (e) {
        if (e.target !== input) {
            input.click();
        }
    });

    dropZone.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('drag-over');
        }
    });

    dropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');

        const files = Array.from(e.dataTransfer.files);
        if (isMultiple) {
            handler(files);
        } else {
            handler(files[0]);
        }
    });
}

// Handle featured image selection
function handleFeaturedImageSelection(file) {
    if (!file) return;

    if (!validateFile(file)) {
        return;
    }

    featuredImage = file;
    updateFeaturedImagePreview();
    clearError();
}

// Handle gallery images selection
function handleGalleryImagesSelection(files) {
    if (galleryImages.length + files.length > maxGalleryImages) {
        showError(`You can only upload a maximum of ${maxGalleryImages} gallery photos.`);
        return;
    }

    for (let file of files) {
        if (!validateFile(file)) {
            return;
        }
        galleryImages.push(file);
    }

    updateGalleryImagesPreview();
    updateImageCount();
    clearError();
}

// Update featured image preview
function updateFeaturedImagePreview() {
    const featuredPreview = document.getElementById('featuredImagePreview');

    if (featuredImage) {
        const reader = new FileReader();
        reader.onload = function (e) {
            featuredPreview.innerHTML = `
                <div class="featured-image-item">
                    <img src="${e.target.result}" alt="Featured Image">
                    <button type="button" class="image-remove-btn" onclick="removeFeaturedImage()" title="Remove featured image">
                        ×
                    </button>
                    <div class="image-label">Featured Image</div>
                </div>
            `;
        };
        reader.readAsDataURL(featuredImage);
    } else {
        featuredPreview.innerHTML = `
            <div class="image-placeholder">
                <i class="fas fa-camera"></i>
                <p>Click or drag to add featured image</p>
            </div>
        `;
    }
}

// Update gallery images preview
function updateGalleryImagesPreview() {
    const galleryPreview = document.getElementById('galleryPreviewContainer');
    galleryPreview.innerHTML = '';

    galleryImages.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'gallery-image-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="Gallery Image ${index + 1}">
                <button type="button" class="image-remove-btn" onclick="removeGalleryImage(${index})" title="Remove image">
                    ×
                </button>
                <div class="image-label">Gallery ${index + 1}</div>
            `;
            galleryPreview.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });

    // Add placeholder for remaining slots
    const remainingSlots = maxGalleryImages - galleryImages.length;
    for (let i = 0; i < remainingSlots; i++) {
        const placeholder = document.createElement('div');
        placeholder.className = 'gallery-image-placeholder';
        placeholder.innerHTML = `
            <i class="fas fa-plus"></i>
            <p>Add Image</p>
        `;
        // placeholder.onclick = () => document.getElementById('galleryImages').click();
        galleryPreview.appendChild(placeholder);
    }
}

// Update image count display
function updateImageCount() {
    const imageCount = document.getElementById('imageCount');
    if (imageCount) {
        const totalImages = (featuredImage ? 1 : 0) + galleryImages.length;
        const maxTotal = 1 + maxGalleryImages; // 1 featured + 5 gallery
        imageCount.textContent = `${totalImages}/${maxTotal} images selected`;
    }
}

// Remove featured image function (global)
window.removeFeaturedImage = function () {
    featuredImage = null;
    updateFeaturedImagePreview();
    updateImageCount();

    // Clear the file input
    const featuredInput = document.getElementById('featuredImage');
    if (featuredInput) {
        featuredInput.value = '';
    }
};

// Remove gallery image function (global)
window.removeGalleryImage = function (index) {
    galleryImages.splice(index, 1);
    updateGalleryImagesPreview();
    updateImageCount();

    // Update the file input
    const dt = new DataTransfer();
    galleryImages.forEach(file => dt.items.add(file));
    const galleryInput = document.getElementById('galleryImages');
    if (galleryInput) {
        galleryInput.files = dt.files;
    }
};

// Validate individual file
function validateFile(file) {
    if (!file.type.startsWith('image/')) {
        showError('Please select only image files.');
        return false;
    }

    if (file.size > maxFileSize) {
        showError('Each file must be smaller than 5MB.');
        return false;
    }

    return true;
}

// Initialize form submission
function initializeFormSubmission() {
    const form = document.getElementById('listingForm');

    if (!form) {
        console.error("❌ Form element not found");
        return;
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!featuredImage && galleryImages.length === 0) {
            showError('Please upload at least one image (featured or gallery).');
            return false;
        }

        handleFormSubmission();
    });
}

// Handle form submission
async function handleFormSubmission() {
    const submitBtn = document.getElementById('submitBtn');
    const successMessage = document.getElementById('successMessage');
    const form = document.getElementById('listingForm');

    clearError();

    if (!validateFormFields()) {
        return;
    }

    try {
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Listing...';

        // Create FormData object
        const formData = new FormData();

        // Get user_id from localStorage
        const user_id = localStorage.getItem('user_id');
        const sellerName = localStorage.getItem('user_name'); // Default to 'Guest' if not set
        console.log("User name :", sellerName);
        if (!user_id) {
            showError('User ID not found. Please log in again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create Listing';
            return;
        }

        // Add user_id to form data
        formData.append('user_id', user_id);

        // Add form fields
        formData.append('listing_name', document.getElementById('listing_name').value);
        formData.append('category_id', document.getElementById('category').value);
        formData.append('subcategory_id', document.getElementById('subcategory').value);
        formData.append('quantity', document.getElementById('quantity').value);
        formData.append('unit', document.getElementById('unit').value);
        formData.append('priceperunit', document.getElementById('pricePerUnit').value);
        formData.append('seller_name', sellerName); // Use the determined seller name
        formData.append('description', document.getElementById('description').value);
        formData.append('city_location', document.getElementById('city_location').value);
        formData.append('state_location', document.getElementById('state_location').value);
        formData.append('pincode_location', document.getElementById('pincode_location').value);
        formData.append('address', document.getElementById('address').value);
        formData.append('waste_packed_type', document.getElementById('waste_packed_type').value);
        formData.append('waste_stored', document.getElementById('waste_stored').value);

        // Add featured image
        if (featuredImage) {
            formData.append('featured_image', featuredImage);
        }

        // Add gallery images
        galleryImages.forEach((file, index) => {
            formData.append(`gallery_image_${index + 1}`, file);
        });

        console.log("📤 Submitting listing with user_id:", user_id);
        console.log("📤 Featured image:", featuredImage ? featuredImage.name : 'None');
        console.log("📤 Gallery images:", galleryImages.length);

        // Make API call using the centralized API caller
        const [success, result] = await callApi(
            'POST',
            create_listing_api_url,
            formData,
            getCsrfToken(),
            true // media_upload = true
        );

        if (success && result.success !== false) {
            // Success - show success message
            successMessage.style.display = 'block';
            form.style.display = 'none';

            // Scroll to top to show success message
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Redirect after delay
            setTimeout(() => {
                window.location.href = '/seller-profile';
            }, 3000);

        } else {
            throw new Error(result.message || 'Failed to create listing');
        }

    } catch (error) {
        console.error('Error creating listing:', error);
        showError('Failed to create listing: ' + error.message);

    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Listing';
    }
}

// Validate form fields
function validateFormFields() {
    const requiredFields = [
        { id: 'listing_name', name: 'Listing Title' },
        { id: 'category', name: 'Category' },
        { id: 'subcategory', name: 'Subcategory' },
        { id: 'quantity', name: 'Quantity' },
        { id: 'unit', name: 'Unit' },
        { id: 'pricePerUnit', name: 'Price Per Unit' },
        { id: 'description', name: 'Description' },
        { id: 'city_location', name: 'City' },
        { id: 'state_location', name: 'State' },
        { id: 'pincode_location', name: 'Pincode' },
        { id: 'address', name: 'Address' }
    ];

    for (let field of requiredFields) {
        const element = document.getElementById(field.id);
        if (!element.value.trim()) {
            showError(`Please fill in the ${field.name} field.`);
            element.focus();
            return false;
        }
    }

    // Validate pincode format
    const pincode = document.getElementById('pincode_location').value;
    if (!/^\d{6}$/.test(pincode)) {
        showError('Please enter a valid 6-digit pincode.');
        document.getElementById('pincode_location').focus();
        return false;
    }

    // Validate quantity
    const quantity = parseFloat(document.getElementById('quantity').value);
    if (quantity <= 0) {
        showError('Quantity must be greater than 0.');
        document.getElementById('quantity').focus();
        return false;
    }

    // Validate price per unit
    const pricePerUnit = parseFloat(document.getElementById('pricePerUnit').value);
    if (pricePerUnit < 0) {
        showError('Price per unit must be 0 or greater.');
        document.getElementById('pricePerUnit').focus();
        return false;
    }

    return true;
}

// Load categories from API
async function loadCategories() {
    try {
        console.log("📥 Loading categories from API...");

        const response = await fetch(`${categories_api_url}with_subcategories/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            categoriesData = result.data;
            console.log("✅ Categories loaded successfully:", categoriesData.length, "categories");
        } else {
            throw new Error(result.error || 'Failed to load categories');
        }
    } catch (error) {
        console.error("❌ Error loading categories:", error);
        showError('Failed to load categories. Please refresh the page.');
        // Fallback to empty categories
        categoriesData = [];
    }
}

// Initialize category-subcategory functionality
async function initializeCategorySubcategory() {
    const categorySelect = document.getElementById('category');
    const subcategorySelect = document.getElementById('subcategory');

    if (!categorySelect || !subcategorySelect) {
        console.error("❌ Category/Subcategory elements not found");
        return;
    }

    // Populate categories
    populateCategories(categorySelect);

    // Category change event listener
    categorySelect.addEventListener('change', function () {
        const selectedCategoryId = this.value;
        populateSubcategories(subcategorySelect, selectedCategoryId);
    });
}

// Populate categories dropdown
function populateCategories(categorySelect) {
    // Clear existing options except the first one
    categorySelect.innerHTML = '<option value="">Select Category</option>';

    if (categoriesData && categoriesData.length > 0) {
        categoriesData.forEach(category => {
            const option = document.createElement('option');
            option.value = category.category_id;
            option.textContent = category.title;
            categorySelect.appendChild(option);
        });
        console.log("✅ Categories populated:", categoriesData.length, "categories");
    } else {
        console.warn("⚠️ No categories available");
    }
}

// Populate subcategories dropdown based on selected category
function populateSubcategories(subcategorySelect, categoryId) {
    // Clear existing subcategories
    subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';

    if (!categoryId) {
        return;
    }

    // Find the selected category
    const selectedCategory = categoriesData.find(cat => cat.category_id == categoryId);

    if (selectedCategory && selectedCategory.subcategories && selectedCategory.subcategories.length > 0) {
        selectedCategory.subcategories.forEach(subcategory => {
            const option = document.createElement('option');
            option.value = subcategory.sub_category_id;
            option.textContent = subcategory.title;
            subcategorySelect.appendChild(option);
        });
        console.log("✅ Subcategories populated for category", selectedCategory.title, ":", selectedCategory.subcategories.length, "subcategories");
    } else {
        console.warn("⚠️ No subcategories found for category ID:", categoryId);
    }
}

// Initialize state dropdown
function initializeStateDropdown() {
    const stateSelect = document.getElementById('state_location');

    if (!stateSelect) {
        console.error("❌ State select element not found");
        return;
    }

    const indianStates = [
        'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
        'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
        'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
        'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
        'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
        'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry'
    ];

    indianStates.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateSelect.appendChild(option);
    });
}

// Initialize unit price updater
function initializeUnitPriceUpdater() {
    const unitSelect = document.getElementById('unit');
    const priceLabel = document.getElementById('pricePerUnitLabel');
    const priceHelp = document.getElementById('pricePerUnitHelp');

    if (!unitSelect || !priceLabel || !priceHelp) {
        console.error("❌ Unit price updater elements not found");
        return;
    }

    // Unit change event listener
    unitSelect.addEventListener('change', function () {
        const selectedUnit = this.value;
        updatePricePerUnitLabel(selectedUnit, priceLabel, priceHelp);
    });
}

// Update price per unit label based on selected unit
function updatePricePerUnitLabel(unit, labelElement, helpElement) {
    let labelText = 'Price Per Unit';
    let helpText = 'Price per unit selected above';

    if (unit) {
        // Create unit-specific labels
        const unitLowerCase = unit.toLowerCase();

        switch (unitLowerCase) {
            case 'kilograms':
                labelText = 'Price Per Kilogram';
                helpText = 'Price per kilogram (₹/KG)';
                break;
            case 'tons':
                labelText = 'Price Per Ton';
                helpText = 'Price per ton (₹/Ton)';
                break;
            case 'pieces':
                labelText = 'Price Per Piece';
                helpText = 'Price per individual piece (₹/Piece)';
                break;
            case 'bundles':
                labelText = 'Price Per Bundle';
                helpText = 'Price per bundle (₹/Bundle)';
                break;
            case 'bales':
                labelText = 'Price Per Bale';
                helpText = 'Price per bale (₹/Bale)';
                break;
            case 'containers':
                labelText = 'Price Per Container';
                helpText = 'Price per container (₹/Container)';
                break;
            case 'cubic meters':
                labelText = 'Price Per Cubic Meter';
                helpText = 'Price per cubic meter (₹/m³)';
                break;
            default:
                labelText = `Price Per ${unit}`;
                helpText = `Price per ${unit.toLowerCase()}`;
        }
    }

    // Update the label and help text
    labelElement.innerHTML = `${labelText} <span class="required">*</span>`;
    helpElement.textContent = helpText;

    console.log(`✅ Updated price label to: ${labelText}`);
}

// Error handling functions
function showError(message) {
    const uploadStatus = document.getElementById('uploadStatus');
    if (uploadStatus) {
        uploadStatus.className = 'upload-status error mt-2';
        uploadStatus.innerHTML = `<span>${message}</span>`;
    }
}

function clearError() {
    const uploadStatus = document.getElementById('uploadStatus');
    if (uploadStatus) {
        uploadStatus.className = 'upload-status mt-2';
        uploadStatus.innerHTML = '';
    }
    updateImageCount();
}
