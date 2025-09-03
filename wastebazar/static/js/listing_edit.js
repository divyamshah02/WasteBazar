// Listing Edit Page JavaScript - API Driven

// Global variables for API endpoints and CSRF token
let csrf_token = null;
let listing_api_url = null;
let categories_api_url = "/marketplace-api/categories/"; // Categories API endpoint
let listingId = null;

// Photo upload variables
let featuredImage = null;
let galleryImages = [];
let existingFeaturedImage = null;
let existingGalleryImages = [];
let removedExistingImages = []; // Track removed existing images
const maxGalleryImages = 5;
const maxFileSize = 5 * 1024 * 1024; // 5MB in bytes

// Categories data
let categoriesData = [];
let currentListingData = null;

// Initialize app function
async function ListingEditApp(csrf_token_param, listing_api_url_param, listing_id) {
    console.log("🚀 Initializing WasteBazar Listing Edit Page");
    console.log("🔧 CSRF Token:", csrf_token_param ? "Present" : "Missing");
    console.log("🔧 API URL:", listing_api_url_param);
    console.log("🔧 Listing ID:", listing_id);

    csrf_token = csrf_token_param;
    listing_api_url = listing_api_url_param;
    listingId = listing_id;

    if (!csrf_token) {
        console.error("❌ Missing CSRF Token for ListingEditApp");
        return;
    }

    if (!listingId) {
        console.error("❌ Missing Listing ID");
        showError('Listing ID not found.');
        return;
    }

    await initializeEditForm();
}

function getCsrfToken() {
    return csrf_token;
}

// Initialize form functionality
async function initializeEditForm() {
    console.log("🔧 Initializing edit form components...");

    // Check if user is logged in and is a seller
    const user_id = localStorage.getItem('user_id');
    const user_role = localStorage.getItem('user_role');

    if (!user_id) {
        console.error("❌ No user ID found in localStorage");
        showError('Please log in to edit listings.');
        return;
    }

    if (!user_role || (!user_role.includes('seller'))) {
        console.error("❌ User is not a seller");
        showError('Only sellers can edit listings. Please log in with a seller account.');
        return;
    }

    console.log("✅ User authenticated as seller:", user_id);

    try {
        // Load categories first
        await loadCategories();

        // Load listing data
        await loadListingData();

        // Initialize form components
        // initializePhotoUpload();
        initializeFormSubmission();
        await initializeCategorySubcategory();
        initializeStateDropdown();
        initializeCancelButton();

        // Pre-fill form with existing data
        await prefillForm();

        // Initialize image previews
        // updateFeaturedImagePreview();
        // updateGalleryImagesPreview();
        updateImageCount();

        // Show the form
        document.querySelector('.form-header').style.display = 'block';
        document.getElementById('listingEditForm').style.display = 'block';
        document.getElementById('loadingMessage').style.display = 'none';

        console.log("✅ Edit form initialization complete");

    } catch (error) {
        console.error("❌ Error initializing edit form:", error);
        showError('Failed to load listing data. Please try again.');
    }
}

// Load listing data from API
async function loadListingData() {
    try {
        console.log("📥 Loading listing data...");

        // Get user_id for authorization
        const user_id = localStorage.getItem('user_id');
        if (!user_id) {
            throw new Error('User ID not found. Please log in again.');
        }

        // Use the custom edit endpoint
        const editUrl = `/marketplace-api/listing-detail/${listingId}`;

        const [success, result] = await callApi(
            'GET',
            editUrl,
            null,
            getCsrfToken()
        );

        if (success && result.success !== false) {
            currentListingData = result.data || result;
            console.log("✅ Listing data loaded successfully:", currentListingData);

            // Store existing images
            existingFeaturedImage = currentListingData.featured_image_url;
            existingGalleryImages = currentListingData.gallery_images || [];

        } else {
            throw new Error(result.message || result.error || 'Failed to load listing data');
        }
    } catch (error) {
        console.error("❌ Error loading listing data:", error);
        throw error;
    }
}

// Pre-fill form with existing data
async function prefillForm() {
    if (!currentListingData) {
        console.error("❌ No listing data available for pre-filling");
        return;
    }

    console.log("📝 Pre-filling form with existing data...");

    // Set hidden listing ID
    document.getElementById('listingId').value = currentListingData.listing_id;

    // Fill basic fields
    document.getElementById('quantity').value = currentListingData.quantity || '';
    document.getElementById('unit').value = currentListingData.unit || '';
    document.getElementById('pricePerUnit').value = currentListingData.priceperunit || '';
    document.getElementById('description').value = currentListingData.description || '';
    document.getElementById('city_location').value = currentListingData.city_location || '';
    document.getElementById('state_location').value = currentListingData.state_location || '';
    document.getElementById('pincode_location').value = currentListingData.pincode_location || '';
    document.getElementById('address').value = currentListingData.address || '';

    // Set category and subcategory
    if (currentListingData.category_id) {
        document.getElementById('category').value = currentListingData.category_id;
        // Populate subcategories for the selected category
        populateSubcategories(document.getElementById('subcategory'), currentListingData.category_id);

        // Set subcategory after a short delay to ensure options are populated
        setTimeout(() => {
            if (currentListingData.subcategory_id) {
                document.getElementById('subcategory').value = currentListingData.subcategory_id;
            }
        }, 100);
    }

    // Display existing images
    displayExistingImages();

    console.log("✅ Form pre-filled successfully");
}

// Display existing images
function displayExistingImages() {
    // Display existing featured image
    if (existingFeaturedImage) {
        const existingFeaturedContainer = document.getElementById('existingFeaturedImage');
        const existingFeaturedImageContainer = document.getElementById('existingFeaturedImageContainer');

        existingFeaturedImageContainer.innerHTML = `
            <div class="existing-image">
                <img src="${existingFeaturedImage}" alt="Current Featured Image">
                
            </div>
        `;
        existingFeaturedContainer.style.display = 'block';
    }

    // Display existing gallery images
    if (existingGalleryImages && existingGalleryImages.length > 0) {
        const existingGalleryContainer = document.getElementById('existingGalleryImages');
        const existingGalleryImagesContainer = document.getElementById('existingGalleryImagesContainer');

        existingGalleryImagesContainer.innerHTML = '';

        existingGalleryImages.forEach((imageUrl, index) => {
            const imageDiv = document.createElement('div');
            imageDiv.className = 'existing-image';
            imageDiv.innerHTML = `
                <img src="${imageUrl}" alt="Current Gallery Image ${index + 1}">
                
            `;
            existingGalleryImagesContainer.appendChild(imageDiv);
        });

        existingGalleryContainer.style.display = 'block';
    }
}

// Remove existing featured image
// window.removeExistingFeaturedImage = function () {
//     if (existingFeaturedImage) {
//         removedExistingImages.push({
//             type: 'featured',
//             url: existingFeaturedImage
//         });
//         existingFeaturedImage = null;
//         document.getElementById('existingFeaturedImage').style.display = 'none';
//         updateImageCount();
//     }
// };

// Remove existing gallery image
// window.removeExistingGalleryImage = function (index) {
//     if (existingGalleryImages[index]) {
//         removedExistingImages.push({
//             type: 'gallery',
//             url: existingGalleryImages[index],
//             index: index
//         });
//         existingGalleryImages.splice(index, 1);
//         displayExistingImages();
//         updateImageCount();
//     }
// };

// // Initialize photo upload functionality
// function initializePhotoUpload() {
//     const featuredInput = document.getElementById('featuredImage');
//     const galleryInput = document.getElementById('galleryImages');
//     const featuredPreview = document.getElementById('featuredImagePreview');
//     const galleryPreview = document.getElementById('galleryPreviewContainer');
//     const featuredDropZone = document.getElementById('featuredDropZone');
//     const galleryDropZone = document.getElementById('galleryDropZone');

//     if (!featuredInput || !galleryInput || !featuredPreview || !galleryPreview) {
//         console.error("❌ Photo upload elements not found");
//         return;
//     }

//     // Featured image input change event
//     featuredInput.addEventListener('change', function (e) {
//         const file = e.target.files[0];
//         if (file) {
//             handleFeaturedImageSelection(file);
//         }
//     });

//     // Gallery images input change event
//     galleryInput.addEventListener('change', function (e) {
//         const files = Array.from(e.target.files);
//         handleGalleryImagesSelection(files);
//     });

//     // Featured image drop zone events
//     if (featuredDropZone) {
//         setupDropZone(featuredDropZone, featuredInput, handleFeaturedImageSelection, false);
//     }

//     // Gallery images drop zone events
//     if (galleryDropZone) {
//         setupDropZone(galleryDropZone, galleryInput, handleGalleryImagesSelection, true);
//     }
// }

// Setup drop zone functionality
// function setupDropZone(dropZone, input, handler, isMultiple) {
//     dropZone.addEventListener('click', function (e) {
//         if (e.target !== input) {
//             input.click();
//         }
//     });

//     dropZone.addEventListener('dragover', function (e) {
//         e.preventDefault();
//         e.stopPropagation();
//         dropZone.classList.add('drag-over');
//     });

//     dropZone.addEventListener('dragleave', function (e) {
//         e.preventDefault();
//         e.stopPropagation();
//         if (!dropZone.contains(e.relatedTarget)) {
//             dropZone.classList.remove('drag-over');
//         }
//     });

//     dropZone.addEventListener('drop', function (e) {
//         e.preventDefault();
//         e.stopPropagation();
//         dropZone.classList.remove('drag-over');

//         const files = Array.from(e.dataTransfer.files);
//         if (isMultiple) {
//             handler(files);
//         } else {
//             handler(files[0]);
//         }
//     });
// }

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
    const totalExisting = existingGalleryImages.length;
    const totalNew = galleryImages.length;
    const totalAfterAdd = totalExisting + totalNew + files.length;

    if (totalAfterAdd > maxGalleryImages) {
        showError(`You can only have a maximum of ${maxGalleryImages} gallery photos total.`);
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
                    <img src="${e.target.result}" alt="New Featured Image">
                   
                    <div class="image-label">New Featured Image</div>
                </div>
            `;
        };
        reader.readAsDataURL(featuredImage);
    } else {
        featuredPreview.innerHTML = `
            <div class="image-placeholder">
                <i class="fas fa-camera"></i>
                <p>Click or drag to add new featured image</p>
            </div>
        `;
    }
}

// Update gallery images preview
function updateGalleryImagesPreview() {
    const galleryPreview = document.getElementById('galleryPreviewContainer');

    // Clear the preview container
    galleryPreview.innerHTML = '';

    // Show new selected images first
    galleryImages.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'gallery-image-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="New Gallery Image ${index + 1}">
                
                <div class="image-label">New Gallery ${index + 1}</div>
            `;
            galleryPreview.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });

    // Add placeholder for remaining slots (matching listing form style)
    const totalImages = galleryImages.length + existingGalleryImages.length;
    const remainingSlots = maxGalleryImages - totalImages;

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
}// Update image count display
function updateImageCount() {
    const imageCount = document.getElementById('imageCount');
    if (imageCount) {
        const totalFeatured = (existingFeaturedImage ? 1 : 0) + (featuredImage ? 1 : 0);
        const totalGallery = existingGalleryImages.length + galleryImages.length;
        const totalImages = totalFeatured + totalGallery;
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
};// Validate individual file
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
    const form = document.getElementById('listingEditForm');

    if (!form) {
        console.error("❌ Form element not found");
        return;
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Check if we have at least one image (existing or new)
        const hasFeaturedImage = existingFeaturedImage || featuredImage;
        const hasGalleryImages = existingGalleryImages.length > 0 || galleryImages.length > 0;

        if (!hasFeaturedImage && !hasGalleryImages) {
            showError('Please keep at least one image (featured or gallery).');
            return false;
        }

        handleFormSubmission();
    });
}

// Initialize cancel button
function initializeCancelButton() {
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
            if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
                window.location.href = '/seller-profile';
            }
        });
    }
}

// Handle form submission
async function handleFormSubmission() {
    const submitBtn = document.getElementById('submitBtn');
    const successMessage = document.getElementById('successMessage');
    const form = document.getElementById('listingEditForm');

    clearError();

    if (!validateFormFields()) {
        return;
    }

    try {
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating Listing...';

        // Create FormData object
        const formData = new FormData();

        // Get user_id from localStorage
        const user_id = localStorage.getItem('user_id');
        const sellerName = localStorage.getItem('user_name');

        if (!user_id) {
            showError('User ID not found. Please log in again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Update Listing';
            return;
        }

        // Add form fields
        formData.append('user_id', user_id);
        formData.append('listing_id', listingId);
        formData.append('category_id', document.getElementById('category').value);
        formData.append('subcategory_id', document.getElementById('subcategory').value);
        formData.append('quantity', document.getElementById('quantity').value);
        formData.append('unit', document.getElementById('unit').value);
        formData.append('priceperunit', document.getElementById('pricePerUnit').value);
        formData.append('seller_name', sellerName);
        formData.append('description', document.getElementById('description').value);
        formData.append('city_location', document.getElementById('city_location').value);
        formData.append('state_location', document.getElementById('state_location').value);
        formData.append('pincode_location', document.getElementById('pincode_location').value);
        formData.append('address', document.getElementById('address').value);

        // Add new featured image if selected
        if (featuredImage) {
            formData.append('featured_image', featuredImage);
            console.log("📤 Adding new featured image:", featuredImage.name);
        }

        // Add new gallery images
        galleryImages.forEach((file, index) => {
            formData.append(`gallery_image_${index + 1}`, file);
        });

        // Add information about removed existing images
        if (removedExistingImages.length > 0) {
            // Handle removed existing images
            const removedImageUrls = removedExistingImages.map(img => img.url);
            formData.append('remove_gallery_images', JSON.stringify(removedImageUrls));

            // If featured image was removed, mark it for removal
            const removedFeaturedImage = removedExistingImages.find(img => img.type === 'featured');
            if (removedFeaturedImage) {
                formData.append('remove_featured_image', 'true');
                console.log("📤 Marking featured image for removal:", removedFeaturedImage.url);
            }
        }

        console.log("📤 Updating listing with ID:", listingId);
        console.log("📤 New featured image:", featuredImage ? featuredImage.name : 'None');
        console.log("📤 New gallery images:", galleryImages.length);
        console.log("📤 Removed existing images:", removedExistingImages.length);
        console.log("📤 Current existingFeaturedImage:", existingFeaturedImage);
        console.log("📤 Current featuredImage:", featuredImage);

        // Log all FormData entries for debugging
        console.log("📤 FormData contents:");
        for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
                console.log(`  ${key}: ${value.name} (${value.size} bytes)`);
            } else {
                console.log(`  ${key}: ${value}`);
            }
        }

        // Make API call using the centralized API caller
        const [success, result] = await callApi(
            'PUT', // or 'PATCH' depending on your API
            `${listing_api_url}${listingId}/`,
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
            throw new Error(result.message || 'Failed to update listing');
        }

    } catch (error) {
        console.error('Error updating listing:', error);
        showError('Failed to update listing: ' + error.message);

    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Update Listing';
    }
}

// Validate form fields
function validateFormFields() {
    const requiredFields = [
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

    // // Category change event listener
    // categorySelect.addEventListener('change', function () {
    //     const selectedCategoryId = this.value;
    //     populateSubcategories(subcategorySelect, selectedCategoryId);
    // });
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
