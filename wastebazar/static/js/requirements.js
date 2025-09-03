// Requirements Page JavaScript - API Driven

// Import necessary libraries
const AOS = window.AOS // Declare AOS variable
const bootstrap = window.bootstrap // Declare bootstrap variable

// Global variables for API endpoints and CSRF token
let csrf_token = null;
let all_requirements_api_url = null;
let categories_api_url = "/marketplace-api/categories/"; // Categories API endpoint

// Categories data
let categoriesData = [];

// Current filters state
let filters = {
    search: '',
    category_id: '',
    subcategory_id: '',
    city_location: '',
    state_location: '',
    unit: ''
};

// Pagination state
let currentPage = 1;
let itemsPerPage = 20;
let totalItems = 0;

// Initialize app function
async function RequirementsApp(csrf_token_param, all_requirements_api_url_param) {
    console.log("🚀 Initializing WasteBazar Requirements Page");
    console.log("🔧 CSRF Token:", csrf_token_param ? "Present" : "Missing");
    console.log("🔧 API URL:", all_requirements_api_url_param);

    csrf_token = csrf_token_param;
    all_requirements_api_url = all_requirements_api_url_param;

    if (!csrf_token || !all_requirements_api_url) {
        console.error("❌ Missing required parameters for RequirementsApp");
        console.error("❌ CSRF Token:", csrf_token);
        console.error("❌ API URL:", all_requirements_api_url);
        return;
    }

    console.log("✅ RequirementsApp initialized successfully");
    console.log("📡 About to load requirements from API on initialization...");

    initializePage();
}

function getCsrfToken() {
    return csrf_token;
}

// Initialize page elements and events
function initializePage() {
    console.log("🔧 Initializing page elements and events...");

    // Load categories first, then requirements
    loadCategories();

    // Set up event listeners
    setupEventListeners();

    // Hide deprecated filters if present in DOM
    hideDeprecatedFilters();

    // Initialize AOS animations
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: false,
            mirror: true
        });
    }

    console.log("✅ Page initialization complete");
}

// Load categories from API
async function loadCategories() {
    try {
        console.log("📡 Loading categories from API...");

        const response = await fetch("/marketplace-api/categories/with_subcategories/", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCsrfToken(),
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ Categories loaded successfully:", data);

        // Handle both data.data and data response formats
        const rawData = data.data || data || [];
        categoriesData = rawData;
        populateCategories();

        // After categories are loaded, reload requirements to apply any URL filters
        loadRequirementsFromAPI();

    } catch (error) {
        console.error("❌ Error loading categories:", error);
        // If API fails, still try to load requirements
        setUrlParameterValues();
        loadRequirementsFromAPI();
    }
}

// Populate category dropdowns
function populateCategories() {
    const categorySelect = document.getElementById("categoryFilter");

    if (!categoriesData.length || !categorySelect) {
        console.log("⚠️ Category select element not found or no categories data");
        return;
    }

    // Clear existing options except the first "All Categories" option
    while (categorySelect.children.length > 1) {
        categorySelect.removeChild(categorySelect.lastChild);
    }

    // Add categories
    categoriesData.forEach(category => {
        const option = document.createElement("option");
        option.value = category.category_id || category.id;
        option.textContent = category.title || category.name;
        categorySelect.appendChild(option);
    });

    console.log("✅ Categories populated in dropdown");

    // After populating categories, set values from URL parameters if they exist
    setUrlParameterValues();
}

// Populate subcategories based on selected category
function populateSubcategories(categoryId) {
    const subcategorySelect = document.getElementById("subcategoryFilter");

    if (!subcategorySelect || !categoriesData.length) {
        console.log("⚠️ Subcategory select element not found or no categories data");
        return;
    }

    // Clear existing options
    subcategorySelect.innerHTML = '<option value="">All Subcategories</option>';

    if (!categoryId) {
        return;
    }

    // Find the selected category
    const selectedCategory = categoriesData.find(cat => (cat.category_id || cat.id) == categoryId);

    if (selectedCategory && selectedCategory.subcategories) {
        selectedCategory.subcategories.forEach(subcategory => {
            const option = document.createElement("option");
            option.value = subcategory.sub_category_id || subcategory.id;
            option.textContent = subcategory.title || subcategory.name;
            subcategorySelect.appendChild(option);
        });
    }

    console.log(`✅ Subcategories populated for category ${categoryId}`);
}

// Set form values from URL parameters
function setUrlParameterValues() {
    const urlParams = new URLSearchParams(window.location.search);

    // Map URL parameters to filters
    const urlParamMapping = {
        'category_id': 'category_id',
        'subcategory_id': 'subcategory_id',
        'search': 'search',
        'city_location': 'city_location',
        'state_location': 'state_location',
        'unit': 'unit'
    };

    // Update filters from URL parameters
    Object.entries(urlParamMapping).forEach(([urlParam, filterKey]) => {
        const value = urlParams.get(urlParam);
        if (value) {
            filters[filterKey] = value;

            // Update corresponding form elements
            const elementId = getFilterElementId(filterKey);
            const element = document.getElementById(elementId);
            if (element) {
                element.value = value;

                // If this is a category selection, populate subcategories
                if (filterKey === 'category_id') {
                    populateSubcategories(value);
                }
            }
        }
    });

    console.log("✅ URL parameters applied to form elements");
}

// Helper function to get element ID for filter
function getFilterElementId(filterKey) {
    const mapping = {
        'category_id': 'categoryFilter',
        'subcategory_id': 'subcategoryFilter',
        'search': 'searchInput',
        'city_location': 'locationFilter',
        'state_location': 'locationFilter',
        'unit': 'unitFilter'
    };
    return mapping[filterKey] || filterKey;
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }

    // Filter change handlers
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function () {
            filters.category_id = this.value;
            populateSubcategories(this.value);
            loadRequirementsFromAPI();
        });
    }

    const subcategoryFilter = document.getElementById('subcategoryFilter');
    if (subcategoryFilter) {
        subcategoryFilter.addEventListener('change', function () {
            filters.subcategory_id = this.value;
            loadRequirementsFromAPI();
        });
    }

    const locationFilter = document.getElementById('locationFilter');
    if (locationFilter) {
        locationFilter.addEventListener('change', function () {
            filters.city_location = this.value;
            loadRequirementsFromAPI();
        });
    }

    // View toggle buttons
    const gridView = document.getElementById('gridView');
    const listView = document.getElementById('listView');
    const filtersView = document.getElementById('filtersView');

    if (gridView && listView && filtersView) {
        gridView.addEventListener('click', () => toggleView('grid'));
        listView.addEventListener('click', () => toggleView('list'));
        filtersView.addEventListener('click', () => toggleFilters());
    }

    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFilters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }

    console.log("✅ Event listeners set up successfully");
}

// Handle search
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        filters.search = searchInput.value.trim();
        currentPage = 1; // Reset to first page
        loadRequirementsFromAPI();
    }
}

// Toggle view (grid/list)
function toggleView(viewType) {
    const gridBtn = document.getElementById('gridView');
    const listBtn = document.getElementById('listView');
    const container = document.getElementById('listingsContainer');

    if (!gridBtn || !listBtn || !container) return;

    if (viewType === 'grid') {
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
        container.classList.remove('list-view');
    } else if (viewType === 'list') {
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
        container.classList.add('list-view');
    }
}

// Toggle filters visibility
function toggleFilters() {
    const filtersContainer = document.querySelector('.filters-container');
    const filtersBtn = document.getElementById('filtersView');

    if (!filtersContainer || !filtersBtn) return;

    filtersContainer.classList.toggle('active');
    filtersBtn.classList.toggle('active');
}

// Clear all filters
function clearAllFilters() {
    // Reset filters object
    filters = {
        search: '',
        category_id: '',
        subcategory_id: '',
        city_location: '',
        state_location: '',
        unit: ''
    };

    // Clear form elements
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    const selects = ['categoryFilter', 'subcategoryFilter', 'locationFilter'];
    selects.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });

    // Clear subcategories
    populateSubcategories('');

    // Reload requirements
    currentPage = 1;
    loadRequirementsFromAPI();
}

// Hide deprecated filters (Quantity Range and Sort By) if present
function hideDeprecatedFilters() {
    const idsToHide = ['minQuantity', 'maxQuantity', 'sortFilter'];
    idsToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Try hiding the closest common wrapper if available
            const wrapper = el.closest('.filter-group') || el.closest('.form-group') || el.closest('.input-group') || el.parentElement;
            if (wrapper) {
                wrapper.style.display = 'none';
            } else {
                el.style.display = 'none';
            }
        }
    });
}

// Load requirements from API
async function loadRequirementsFromAPI() {
    try {
        console.log("📡 Loading requirements from API...");

        // Show loading state
        showLoadingState();

        // Build query parameters
        const queryParams = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value && value.toString().trim() !== '') {
                queryParams.append(key, value);
            }
        });

        // Add pagination parameters
        queryParams.append('page', currentPage);
        queryParams.append('page_size', itemsPerPage);

        const url = `${all_requirements_api_url}?${queryParams.toString()}`;
        console.log("🔗 API URL:", url);

        const [success, response] = await callApi('GET', url, null, getCsrfToken());

        if (success && response.success) {
            const requirements = response.data || [];
            console.log("✅ Requirements loaded:", requirements);

            renderRequirements(requirements);
            updateResultsInfo(requirements.length);
            // Note: API doesn't provide total count, so we'll work with what we have
        } else {
            console.error("❌ Failed to load requirements:", response.error);
            renderRequirements([]);
            updateResultsInfo(0);
        }

    } catch (error) {
        console.error("❌ Error loading requirements:", error);
        renderRequirements([]);
        updateResultsInfo(0);
    }
}

// Show loading state
function showLoadingState() {
    const container = document.getElementById('listingsContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted">Loading requirements...</p>
        </div>
    `;
}

// Render requirements
function renderRequirements(requirements) {
    const container = document.getElementById('listingsContainer');
    if (!container) return;

    if (!requirements || requirements.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h4 class="text-muted">No requirements found</h4>
                <p class="text-muted">Try adjusting your search filters or check back later for new requirements.</p>
            </div>
        `;
        return;
    }

    const requirementsHTML = requirements.map(requirement => createRequirementCard(requirement)).join('');
    container.innerHTML = requirementsHTML;

    // Re-initialize AOS animations
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
}

// Create requirement card HTML
function createRequirementCard(requirement) {
    const categoryInfo = getCategoryInfo(requirement.category_id, requirement.subcategory_id);
    const formattedDate = formatDate(requirement.created_at);
    const timeAgo = getTimeAgo(requirement.created_at);

    return `
        <div class="listing-card" >
            <div class="listing-content">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h3 class="listing-title mb-0">${categoryInfo.categoryName} - ${categoryInfo.subcategoryName || 'All Types'}</h3>
                    <span class="badge bg-primary">Requirement</span>
                </div>
                
                <div class="listing-details">
                    <div class="detail-item">
                        <div class="detail-icon">
                            <i class="fas fa-cube"></i>
                        </div>
                        <div class="detail-text">
                            <strong>Quantity:</strong><br>
                            ${requirement.quantity} ${requirement.unit}
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-icon">
                            <i class="fas fa-map-marker-alt"></i>
                        </div>
                        <div class="detail-text">
                            <strong>Location:</strong><br>
                            ${requirement.city_location}, ${requirement.state_location}
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-icon">
                            <i class="fas fa-calendar"></i>
                        </div>
                        <div class="detail-text">
                            <strong>Posted:</strong><br>
                            ${timeAgo}
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="detail-text">
                            <strong>Status:</strong><br>
                            <span class="badge bg-success">${requirement.status}</span>
                        </div>
                    </div>
                </div>

                ${requirement.description ? `
                    <div class="requirement-description">
                        <p class="text-muted">${truncateText(requirement.description, 100)}</p>
                    </div>
                ` : ''}
                
                <div class="listing-footer">
                    <div class="listing-date">
                        Posted on ${formattedDate}
                    </div>
                    <button class="btn-view-details" onclick="viewRequirementDetails('${requirement.requirement_id}')">
                        View Details
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Get category information
function getCategoryInfo(categoryId, subcategoryId) {
    let categoryName = 'General';
    let subcategoryName = '';

    if (categoriesData.length > 0 && categoryId) {
        const category = categoriesData.find(cat => (cat.category_id || cat.id) == categoryId);
        if (category) {
            categoryName = category.title || category.name;

            if (subcategoryId && category.subcategories) {
                const subcategory = category.subcategories.find(sub => (sub.sub_category_id || sub.id) == subcategoryId);
                if (subcategory) {
                    subcategoryName = subcategory.title || subcategory.name;
                }
            }
        }
    }

    return { categoryName, subcategoryName };
}

// Get category icon
function getCategoryIcon(categoryId) {
    const iconMap = {
        1: 'fas fa-recycle',      // Plastic
        2: 'fas fa-cogs',         // Metal
        3: 'fas fa-newspaper',    // Paper
        4: 'fas fa-microchip',    // Electronic
        5: 'fas fa-tshirt',       // Textile
    };

    return iconMap[categoryId] || 'fas fa-box';
}

// Update results info
function updateResultsInfo(count) {
    const resultsCount = document.getElementById('resultsCount');
    const resultsDescription = document.getElementById('resultsDescription');

    if (resultsCount) {
        resultsCount.textContent = `Showing ${count} requirement${count !== 1 ? 's' : ''}`;
    }

    if (resultsDescription) {
        resultsDescription.textContent = count > 0
            ? 'Active buyer requirements from verified businesses'
            : 'No requirements match your search criteria';
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// View requirement details (placeholder function)
function viewRequirementDetails(requirementId) {
    console.log("Viewing requirement details for:", requirementId);
    // TODO: Implement navigation to requirement details page
    alert(`Requirement details for ID: ${requirementId}\n\nThis feature will be implemented to show detailed requirement information.`);
}

// Ad management functions (keeping from original listings page)
function closeAd(adId) {
    const adElement = document.getElementById(adId);
    if (adElement) {
        adElement.style.display = 'none';
    }
}

// Initialize mobile ad modal
function initializeMobileAds() {
    // Show mobile ad modal on smaller screens
    if (window.innerWidth < 992) {
        const modal = new bootstrap.Modal(document.getElementById('mobileAdModal'));

        // Show ad modal after 3 seconds
        setTimeout(() => {
            modal.show();
        }, 3000);
    }
}

// Window load event
window.addEventListener('load', function () {
    initializeMobileAds();
});

// Export functions for global access
window.RequirementsApp = RequirementsApp;
window.closeAd = closeAd;
window.viewRequirementDetails = viewRequirementDetails;
