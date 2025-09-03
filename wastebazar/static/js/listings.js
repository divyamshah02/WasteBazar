// Listings Page JavaScript - API Driven

// Import necessary libraries
const AOS = window.AOS // Declare AOS variable
const bootstrap = window.bootstrap // Declare bootstrap variable

// Global variables for API endpoints and CSRF token
let csrf_token = null;
let all_listings_api_url = null;
let categories_api_url = "/marketplace-api/categories/"; // Categories API endpoint
let ads_enabled_top = "false";
let ads_enabled_sidebar = "false";
// Categories data.
let categoriesData = [];

// Initialize app function
async function ListingsApp(csrf_token_param, all_listings_api_url_param) {
  console.log("🚀 Initializing WasteBazar Listings Page");
  console.log("🔧 CSRF Token:", csrf_token_param ? "Present" : "Missing");
  console.log("🔧 API URL:", all_listings_api_url_param);

  csrf_token = csrf_token_param;
  all_listings_api_url = all_listings_api_url_param;

  if (!csrf_token || !all_listings_api_url) {
    console.error("❌ Missing required parameters for ListingsApp");
    console.error("❌ CSRF Token:", csrf_token);
    console.error("❌ API URL:", all_listings_api_url);
    return;
  }

  console.log("✅ ListingsApp initialized successfully");
  console.log("📡 About to load listings from API on initialization...");

  initializePage();
}

function getCsrfToken() {
  return csrf_token;
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

    // Handle both data.data and data response formats, and ensure we use the correct structure
    const rawData = data.data || data || [];
    categoriesData = rawData;
    populateCategories();

    // After categories are loaded, reload listings to apply any URL filters
    loadListingsFromAPI();

  } catch (error) {
    console.error("❌ Error loading categories:", error);
    // If API fails, we'll rely on existing hardcoded options
    // Still try to set URL parameters and load listings
    setUrlParameterValues();
    loadListingsFromAPI();
  }
}// Populate category dropdowns
function populateCategories() {
  const categorySelect = document.getElementById("categoryFilter");

  if (!categoriesData.length) {
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

// Set form values from URL parameters (called after categories are loaded)
function setUrlParameterValues() {
  const urlParams = new URLSearchParams(window.location.search);

  // Map URL parameters to filters
  const urlParamMapping = {
    'category_id': 'category_id',
    'subcategory_id': 'subcategory_id',
    'search': 'search',
    'location': 'location',
    'city_location': 'city_location',
    'state_location': 'state_location',
    'min_quantity': 'minQuantity',
    'max_quantity': 'maxQuantity',
    'unit': 'unit',
    'sort': 'sort'
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

// Sample listings data (keeping as fallback)
const sampleListings = [
  {
    id: 1,
    title: "High-Grade PET Bottle Bales",
    category: "plastic",
    location: "mumbai",
    price: 35000,
    quantity: 25,
    grade: "Food Grade",
    availability: "Pickup Available",
    badge: "Premium",
    postedDate: "2 days ago",
    icon: "fas fa-recycle",
  },
  {
    id: 2,
    title: "Industrial Steel Scrap",
    category: "metal",
    location: "delhi",
    price: 42000,
    quantity: 50,
    grade: "Industrial Grade",
    availability: "Immediate",
    badge: "Verified",
    postedDate: "1 day ago",
    icon: "fas fa-cog",
  },

]

// Advertisement data
const advertisements = [
  {
    id: "topAd",
    title: "Premium Scrap Processing Equipment",
    description: "Increase your efficiency with our industrial-grade machinery",
    image: "/placeholder.svg?height=120&width=728",
    type: "top",
  },
  {
    id: "leftAd1",
    title: "Waste Management Solutions",
    description: "Complete recycling services",
    image: "/placeholder.svg?height=250&width=160",
    type: "sidebar",
  },
  {
    id: "leftAd2",
    title: "Scrap Transportation",
    description: "Nationwide pickup & delivery",
    image: "/placeholder.svg?height=250&width=160",
    type: "sidebar",
  },
  {
    id: "rightAd1",
    title: "Quality Testing Services",
    description: "Certified material analysis",
    image: "/placeholder.svg?height=250&width=160",
    type: "sidebar",
  },
  {
    id: "rightAd2",
    title: "Insurance Coverage",
    description: "Protect your scrap investments",
    image: "/placeholder.svg?height=250&width=160",
    type: "sidebar",
  },
]

// Global variables
let currentListings = []
let apiListings = [] // Store API data
let currentPage = 1
const itemsPerPage = 20
let currentView = "grid"
let filters = {
  search: "",
  category_id: "",
  subcategory_id: "",
  location: "",
  city_location: "",
  state_location: "",
  priceRange: "",
  minQuantity: "",
  maxQuantity: "",
  unit: "",
  sort: "newest",
}

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 DOM Content Loaded");
  setupEventListeners()
  initializeMobileAds()

  // Initialize AOS
  AOS.init({
    duration: 1000,
    once: true,
    offset: 100,
  })

  // Note: initializePage() will be called from ListingsApp() after API parameters are set
})

function initializePage() {

  if (ads_enabled_top === "false" || ads_enabled_top === false) {
    console.log("🚫 Ads disabled - hiding ad containers");
    setTimeout(() => {


      const topAd = document.querySelector('.top-ad-banner');
      if (topAd) {
        topAd.style.setProperty('display', 'none', 'important');
      }
    }, 100);
  }

  // Handle ads display based on ads_enabled setting
  if (ads_enabled_sidebar === "false" || ads_enabled_sidebar === false) {
    console.log("🚫 Ads disabled - hiding ad containers and adjusting main content layout");

    // Wait for DOM to be ready, then hide ads
    setTimeout(() => {
      // Hide left sidebar ads
      const leftSidebarAds = document.querySelector('.left-sidebar-ads');
      console.log("🔍 Left sidebar ads element:", leftSidebarAds);
      if (leftSidebarAds) {
        leftSidebarAds.style.setProperty('display', 'none', 'important');
        console.log("✅ Left sidebar ads hidden");
      } else {
        console.log("⚠️ Left sidebar ads element not found");
      }

      // Hide right sidebar ads
      const rightSidebarAds = document.querySelector('.right-sidebar-ads');
      console.log("🔍 Right sidebar ads element:", rightSidebarAds);
      if (rightSidebarAds) {
        rightSidebarAds.style.setProperty('display', 'none', 'important');
        console.log("✅ Right sidebar ads hidden");
      } else {
        console.log("⚠️ Right sidebar ads element not found");
      }



      // Remove display grid from main-content to center the content
      const mainContent = document.querySelector('.main-content');
      console.log("🔍 Main content element:", mainContent);
      if (mainContent) {
        mainContent.style.setProperty('display', 'block', 'important');
        mainContent.style.setProperty('justify-content', 'center', 'important');
        console.log("✅ Main content layout adjusted");
      } else {
        console.log("⚠️ Main content element not found");
      }
    }, 100);
  } else {
    console.log("✅ Ads enabled - keeping default layout");
  }

  // Load categories first (this will also trigger loadListingsFromAPI after categories are loaded)
  loadCategories();

  // Check authentication status and update navbar
  updateNavbarAuth();

  // Navbar scroll effect
  window.addEventListener("scroll", () => {
    const navbar = document.getElementById("navbar")
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled")
    } else {
      navbar.classList.remove("scrolled")
    }
  })

  // URL parameters will be applied after categories load in setUrlParameterValues()
}

// Helper function to map filter keys to element IDs
function getFilterElementId(filterKey) {
  const mapping = {
    'search': 'searchInput',
    'category_id': 'categoryFilter',
    'subcategory_id': 'subcategoryFilter',
    'location': 'locationFilter',
    'city_location': 'cityLocationFilter',
    'state_location': 'stateLocationFilter',
    'minQuantity': 'minQuantity',
    'maxQuantity': 'maxQuantity',
    'unit': 'unitFilter',
    'sort': 'sortFilter'
  };
  return mapping[filterKey] || filterKey;
}

// API Functions
async function loadListingsFromAPI() {
  try {
    console.log("🔄 Loading listings from API...");
    console.log("🔍 Current filters:", filters);

    // Check if API URL is available
    if (!all_listings_api_url) {
      console.error("❌ API URL is not set, using sample data");
      currentListings = [...sampleListings];
      applyFilters();
      loadListings();
      return;
    }

    // Show loading state
    showLoadingState();

    // Build query parameters based on current filters
    let queryParams = {};

    // Category filter
    if (filters.category_id && filters.category_id.trim() !== '') {
      queryParams.category_id = filters.category_id;
    }

    // Subcategory filter
    if (filters.subcategory_id && filters.subcategory_id.trim() !== '') {
      queryParams.subcategory_id = filters.subcategory_id;
    }

    // Location filters
    if (filters.city_location && filters.city_location.trim() !== '') {
      queryParams.city_location = filters.city_location;
    }

    if (filters.state_location && filters.state_location.trim() !== '') {
      queryParams.state_location = filters.state_location;
    }

    // Legacy location filter - map to city_location if no specific city is set
    if (filters.location && filters.location.trim() !== '' && !filters.city_location) {
      queryParams.city_location = filters.location;
    }

    // Search filter
    if (filters.search && filters.search.trim() !== '') {
      queryParams.search = filters.search;
    }

    // Quantity range filtering
    if (filters.minQuantity && filters.minQuantity.trim() !== '') {
      queryParams.min_quantity = filters.minQuantity;
    }

    if (filters.maxQuantity && filters.maxQuantity.trim() !== '') {
      queryParams.max_quantity = filters.maxQuantity;
    }

    // Unit filter
    if (filters.unit && filters.unit.trim() !== '') {
      queryParams.unit = filters.unit;
    }

    // Sorting parameters
    if (filters.sort && filters.sort !== 'newest') {
      if (filters.sort === 'oldest') {
        queryParams.sort_by = 'approved_at';
        queryParams.sort_order = 'asc';
      } else if (filters.sort === 'quantity-low') {
        queryParams.sort_by = 'quantity';
        queryParams.sort_order = 'asc';
      } else if (filters.sort === 'quantity-high') {
        queryParams.sort_by = 'quantity';
        queryParams.sort_order = 'desc';
      } else if (filters.sort === 'location') {
        queryParams.sort_by = 'city_location';
        queryParams.sort_order = 'asc';
      }
    }

    // Build query string - only add if we have parameters
    const queryString = Object.keys(queryParams).length > 0 ? '?' + new URLSearchParams(queryParams).toString() : '';
    const apiUrl = all_listings_api_url + queryString;

    console.log("🔍 API URL:", apiUrl);
    console.log("📋 Query Params:", queryParams);

    const [success, result] = await callApi("GET", apiUrl, null, getCsrfToken());

    if (success && result.success) {
      apiListings = result.data || [];
      console.log("✅ API Response Success:", result);
      console.log("✅ Loaded", apiListings.length, "listings from API");

      // Transform API data to match frontend format
      currentListings = transformApiListings(apiListings);

      // Apply any additional client-side filters
      applyFilters();

      // Load listings into UIdd
      loadListings();

      // Update results count
      updateResultsCount();

    } else {
      console.error("❌ API Response Error:", result);
      console.error("❌ Failed to load listings from API:", result.error || "Unknown error");
      showErrorState("Failed to load listings. Please try again.");

      // Fallback to sample data
      console.log("🔄 Using sample data as fallback");
      currentListings = [...sampleListings];
      applyFilters();
      loadListings();
    }

  } catch (error) {
    console.error("❌ Error loading listings:", error);
    showErrorState("Network error. Please check your connection.");

    // Fallback to sample data
    console.log("🔄 Using sample data as fallback");
    currentListings = [...sampleListings];
    applyFilters();
    loadListings();
  }
}

// Show loading state
function showLoadingState() {
  const container = document.getElementById("listingsContainer");
  if (container) {
    container.innerHTML = createLoadingSkeletons();
  }
}

// Show error state
function showErrorState(message) {
  const container = document.getElementById("listingsContainer");
  if (container) {
    container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Something went wrong</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="loadListingsFromAPI()">Try Again</button>
      </div>
    `;
  }
}

// Transform API data to match frontend format
function transformApiListings(apiData) {
  return apiData.map(listing => ({
    id: listing.listing_id,
    title: `${listing.category_name || 'Unknown Category'} - ${listing.subcategory_name || 'Unknown Subcategory'}`,
    category: (listing.category_name || 'unknown').toLowerCase(),
    location: (listing.city_location || 'unknown').toLowerCase(),
    price: listing.priceperunit || 0, // Use priceperunit from API
    priceperunit: listing.priceperunit || 0, // Add explicit priceperunit field
    quantity: listing.quantity || 0,
    grade: listing.subcategory_name || 'Standard',
    availability: "Available",
    badge: "Verified",
    postedDate: formatDate(listing.created_at),
    icon: getCategoryIcon(listing.category_name || 'default'),
    unit: listing.unit || 'Tons',
    description: listing.description || '',
    city: listing.city_location || '',
    state: listing.state_location || '',
    address: listing.address || '',
    seller_id: listing.seller_user_id,
    seller_name: listing.seller_name || 'Unknown Seller', // Add seller name field
    featured_image_url: listing.featured_image_url || null,
    gallery_images: listing.gallery_images || [],
    has_images: !!(listing.featured_image_url || (listing.gallery_images && listing.gallery_images.length > 0))
  }));
}

// Get category icon
function getCategoryIcon(category) {
  const categoryIcons = {
    'plastic': 'fas fa-recycle',
    'metal': 'fas fa-cog',
    'paper': 'fas fa-newspaper',
    'electronic': 'fas fa-laptop',
    'textile': 'fas fa-tshirt',
    'glass': 'fas fa-wine-glass',
    'default': 'fas fa-box'
  };

  if (!category || typeof category !== 'string') {
    return categoryIcons['default'];
  }

  return categoryIcons[category.toLowerCase()] || categoryIcons['default'];
}

// Format date
function formatDate(dateString) {
  if (!dateString) {
    return "Recently posted";
  }

  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Recently posted";
    }

    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return "1 day ago";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (error) {
    console.warn("Error formatting date:", error);
    return "Recently posted";
  }
}

// Update results count
function updateResultsCount() {
  const resultsCountElement = document.getElementById("resultsCount");
  const resultsDescriptionElement = document.getElementById("resultsDescription");

  if (resultsCountElement) {
    const totalCount = currentListings.length;
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, totalCount);

    resultsCountElement.textContent = `Showing ${startIndex}-${endIndex} of ${totalCount} listings`;
  }

  if (resultsDescriptionElement) {
    resultsDescriptionElement.textContent = "Premium scrap materials from verified sellers";
  }
}

function setupEventListeners() {
  console.log("🔧 Setting up event listeners...");

  // Search functionality
  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");

  if (searchBtn) {
    searchBtn.addEventListener("click", performSearch);
  }

  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        performSearch();
      }
    });
  }

  // Filter changes
  const categoryFilter = document.getElementById("categoryFilter");
  const subcategoryFilter = document.getElementById("subcategoryFilter");
  const locationFilter = document.getElementById("locationFilter");
  const cityLocationFilter = document.getElementById("cityLocationFilter");
  const stateLocationFilter = document.getElementById("stateLocationFilter");
  const priceFilter = document.getElementById("priceFilter");
  const minQuantity = document.getElementById("minQuantity");
  const maxQuantity = document.getElementById("maxQuantity");
  const unitFilter = document.getElementById("unitFilter");
  const sortFilter = document.getElementById("sortFilter");

  if (categoryFilter) {
    categoryFilter.addEventListener("change", (e) => {
      const categoryId = e.target.value;

      // Populate subcategories based on selected category
      populateSubcategories(categoryId);

      // Clear subcategory selection when category changes
      const subcategoryFilter = document.getElementById("subcategoryFilter");
      if (subcategoryFilter) {
        subcategoryFilter.value = "";
      }

      updateFilters();
    });
  }

  if (subcategoryFilter) subcategoryFilter.addEventListener("change", updateFilters);
  if (locationFilter) locationFilter.addEventListener("change", updateFilters);
  if (cityLocationFilter) cityLocationFilter.addEventListener("change", updateFilters);
  if (stateLocationFilter) stateLocationFilter.addEventListener("change", updateFilters);
  if (priceFilter) priceFilter.addEventListener("change", updateFilters);
  if (minQuantity) minQuantity.addEventListener("input", debounce(updateFilters, 500));
  if (maxQuantity) maxQuantity.addEventListener("input", debounce(updateFilters, 500));
  if (unitFilter) unitFilter.addEventListener("change", updateFilters);
  if (sortFilter) sortFilter.addEventListener("change", updateFilters);

  // Clear filters
  const clearFiltersBtn = document.getElementById("clearFilters");
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", clearAllFilters);
  }

  // View toggle
  const gridView = document.getElementById("gridView");
  const listView = document.getElementById("listView");
  const filtersView = document.getElementById("filtersView");

  if (gridView) gridView.addEventListener("click", () => setView("grid"));
  if (listView) listView.addEventListener("click", () => setView("list"));
  if (filtersView) filtersView.addEventListener("click", () => toggleFilters());

  // Category dropdown navigation
  document.querySelectorAll("[data-category]").forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      const category = this.dataset.category;
      const subcategory = this.dataset.subcategory || "";

      console.log("🔍 Category clicked:", category, "Subcategory:", subcategory);

      // Find category ID from categoriesData if available
      let categoryId = "";
      let subcategoryId = "";

      if (categoriesData && categoriesData.length > 0) {
        // Try multiple matching strategies for robustness
        let categoryData = null;

        // First try: exact name match (case insensitive)
        categoryData = categoriesData.find(cat =>
          (cat.title || cat.name) && (cat.title || cat.name).toLowerCase() === category.toLowerCase()
        );

        // Second try: partial name match (for cases like "plastic" matching "Plastic")
        if (!categoryData) {
          categoryData = categoriesData.find(cat =>
            (cat.title || cat.name) && (cat.title || cat.name).toLowerCase().includes(category.toLowerCase())
          );
        }

        // Third try: if category is a number, use it as ID directly
        if (!categoryData && !isNaN(category)) {
          categoryData = categoriesData.find(cat => (cat.category_id || cat.id).toString() === category);
        }

        if (categoryData) {
          categoryId = (categoryData.category_id || categoryData.id).toString();
          console.log("✅ Found category ID:", categoryId, "for category:", category);

          // Find subcategory ID if subcategory is specified
          if (subcategory && categoryData.subcategories) {
            let subcategoryData = null;

            // Try exact match first
            subcategoryData = categoryData.subcategories.find(sub =>
              (sub.title || sub.name) && (sub.title || sub.name).toLowerCase() === subcategory.toLowerCase()
            );

            // Try partial match
            if (!subcategoryData) {
              subcategoryData = categoryData.subcategories.find(sub =>
                (sub.title || sub.name) && (sub.title || sub.name).toLowerCase().includes(subcategory.toLowerCase())
              );
            }

            // Try ID match if subcategory is a number
            if (!subcategoryData && !isNaN(subcategory)) {
              subcategoryData = categoryData.subcategories.find(sub => (sub.sub_category_id || sub.id).toString() === subcategory);
            }

            if (subcategoryData) {
              subcategoryId = (subcategoryData.sub_category_id || subcategoryData.id).toString();
              console.log("✅ Found subcategory ID:", subcategoryId, "for subcategory:", subcategory);
            }
          }
        } else {
          console.warn("⚠️ Could not find category data for:", category);
        }
      } else {
        console.warn("⚠️ No categories data available for mapping");
      }

      // Update filters with the mapped IDs
      filters.category_id = categoryId;
      filters.subcategory_id = subcategoryId;

      console.log("🔄 Updated filters - Category ID:", categoryId, "Subcategory ID:", subcategoryId);

      // Update form elements
      if (categoryFilter) {
        categoryFilter.value = categoryId;
        console.log("✅ Updated category filter dropdown to:", categoryId);
      }

      if (subcategoryFilter) {
        // Populate subcategories for the selected category first
        populateSubcategories(categoryId);

        // Set subcategory value after population
        setTimeout(() => {
          subcategoryFilter.value = subcategoryId;
          console.log("✅ Updated subcategory filter dropdown to:", subcategoryId);
        }, 100);
      }

      // Apply the filters and reload listings
      updateFilters();
    });
  });
}

function performSearch() {
  const searchTerm = document.getElementById("searchInput").value.trim()
  filters.search = searchTerm
  updateFilters()
}

function updateFilters() {
  // Update filter object
  filters.search = document.getElementById("searchInput")?.value.trim() || "";
  filters.category_id = document.getElementById("categoryFilter")?.value || "";
  filters.subcategory_id = document.getElementById("subcategoryFilter")?.value || "";
  filters.location = document.getElementById("locationFilter")?.value || "";
  filters.city_location = document.getElementById("cityLocationFilter")?.value || "";
  filters.state_location = document.getElementById("stateLocationFilter")?.value || "";
  filters.priceRange = document.getElementById("priceFilter")?.value || "";
  filters.minQuantity = document.getElementById("minQuantity")?.value || "";
  filters.maxQuantity = document.getElementById("maxQuantity")?.value || "";
  filters.unit = document.getElementById("unitFilter")?.value || "";
  filters.sort = document.getElementById("sortFilter")?.value || "newest";

  // Reload listings from API with new filters
  loadListingsFromAPI()
}

function applyFilters() {
  // Since we're using API-based filtering, we mostly just pass through the data
  // Only apply client-side filters that the API doesn't support
  let filteredListings = [...currentListings];

  // Legacy location filter (if needed for backward compatibility)
  if (filters.location && !filters.city_location && !filters.state_location) {
    filteredListings = filteredListings.filter((listing) =>
      listing.location.toLowerCase().includes(filters.location.toLowerCase()) ||
      listing.city.toLowerCase().includes(filters.location.toLowerCase())
    );
  }

  // Price range filter (if API doesn't support this)
  if (filters.priceRange) {
    const [min, max] = filters.priceRange.split("-").map(Number);
    filteredListings = filteredListings.filter((listing) => {
      if (max) {
        return listing.price >= min && listing.price <= max;
      } else {
        return listing.price >= min;
      }
    });
  }

  // Additional client-side sorting for price-based sorts (if API doesn't handle these)
  if (filters.sort === "price-low" || filters.sort === "price-high") {
    filteredListings.sort((a, b) => {
      if (filters.sort === "price-low") {
        return a.price - b.price;
      } else {
        return b.price - a.price;
      }
    });
  }

  currentListings = filteredListings;
  currentPage = 1;
}

function clearAllFilters() {
  // Reset all filter inputs
  const inputElements = [
    "searchInput", "categoryFilter", "subcategoryFilter", "locationFilter",
    "cityLocationFilter", "stateLocationFilter", "priceFilter",
    "minQuantity", "maxQuantity", "unitFilter", "sortFilter"
  ];

  inputElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
      element.value = elementId === "sortFilter" ? "newest" : "";
    }
  });

  // Clear subcategories when category is cleared
  const subcategoryFilter = document.getElementById("subcategoryFilter");
  if (subcategoryFilter) {
    subcategoryFilter.innerHTML = '<option value="">All Subcategories</option>';
  }

  // Reset filter object
  filters = {
    search: "",
    category_id: "",
    subcategory_id: "",
    location: "",
    city_location: "",
    state_location: "",
    priceRange: "",
    minQuantity: "",
    maxQuantity: "",
    unit: "",
    sort: "newest",
  };

  // Reload listings from API
  loadListingsFromAPI()
}

function setView(viewType) {
  currentView = viewType

  // Update view buttons
  document.querySelectorAll(".view-btn").forEach((btn) => btn.classList.remove("active"))
  document.getElementById(viewType + "View").classList.add("active")

  // Update listings container
  const container = document.getElementById("listingsContainer")
  if (viewType === "list") {
    container.classList.add("list-view")
  } else {
    container.classList.remove("list-view")
  }
}


// Toggle filters visibility
function toggleFilters() {
  const filtersContainer = document.querySelector(".filters-container");
  const filtersBtn = document.getElementById("filtersView");

  if (filtersContainer) {
    const isActive = filtersContainer.classList.contains("active");

    if (isActive) {
      filtersContainer.classList.remove("active");
      filtersBtn.classList.remove("active");
    } else {
      filtersContainer.classList.add("active");
      filtersBtn.classList.add("active");
    }
  }
}

function loadListings() {
  const container = document.getElementById("listingsContainer")
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const pageListings = currentListings.slice(startIndex, endIndex)

  // CTA banner to add at the top of listings container
  const cta = `<div class="cta-banner col-12">
      <div class="container">
        <div class="row align-items-center">
          <div class="col-lg-8 col-md-7">
            <h3 style="color: white; margin: 0; font-weight: 600; font-size: 1.5rem;">
              Not finding what you need?
            </h3>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 1rem;">
              Click the button to list a required material
            </p>
          </div>
          <div class="col-lg-4 col-md-5 text-end">
            <a href="/requirement-form/" class="btn" style="background: white; color: #1577ffff; font-weight: 600; padding: 12px 30px; border-radius: 8px; text-decoration: none; border: none; font-size: 1rem; transition: all 0.3s ease;">
              LIST REQUIRED MATERIAL
            </a>
          </div>
        </div>
      </div>
    </div>`

  // Show loading state with CTA banner
  container.innerHTML = cta + createLoadingSkeletons()

  // Simulate loading delay
  setTimeout(() => {
    if (pageListings.length === 0) {
      container.innerHTML = cta + createNoResultsMessage()
    } else {
      container.innerHTML = cta + pageListings.map((listing) => createListingCard(listing)).join("")
    }

    updateResultsInfo()
    updatePagination()

    // Add click handlers to listing cards
    document.querySelectorAll(".listing-card").forEach((card) => {
      card.addEventListener("click", function () {
        const listingId = this.dataset.listingId
        viewListingDetails(listingId)
      })
    })
  }, 500)
}

function createListingCard(listing) {
  const locationNames = {
    mumbai: "Mumbai, MH",
    delhi: "Delhi, NCR",
    bangalore: "Bangalore, KA",
    chennai: "Chennai, TN",
    pune: "Pune, MH",
    hyderabad: "Hyderabad, TS",
  }

  // Handle both API and sample data format
  const displayLocation = listing.city && listing.state ?
    `${listing.city}, ${listing.state}` :
    (locationNames[listing.location] || listing.location);

  const displayPrice = listing.priceperunit ? `₹${listing.priceperunit.toLocaleString()}/${listing.unit}` : 'Price on Request';
  const displayQuantity = listing.unit ? `${listing.quantity} ${listing.unit}` : `${listing.quantity} Tons Available`;
  const displaySellerName = listing.seller_name || 'Unknown Seller';

  return `
        <div class="listing-card" data-listing-id="${listing.listing_id || listing.id}" data-aos="fade-up">
            <div class="listing-image">
                ${listing.featured_image_url ? `
                    <img src="${listing.featured_image_url}" 
                         alt="${listing.title}" 
                         class="listing-featured-image"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="listing-icon-fallback" style="display: none;">
                        <i class="${listing.icon}"></i>
                    </div>
                ` : `
                    <div class="listing-icon-fallback">
                        <i class="${listing.icon}"></i>
                    </div>
                `}
                <div class="listing-badge">${listing.badge}</div>
                ${listing.gallery_images && listing.gallery_images.length > 0 ? `
                    <div class="gallery-count">
                        <i class="fas fa-images"></i>
                        <span>+${listing.gallery_images.length}</span>
                    </div>
                ` : ''}
            </div>
            <div class="listing-content">
                <h3 class="listing-title">${listing.title}</h3>
                <div class="listing-details">
                    <div class="detail-item">
                        <div class="detail-icon">
                            <i class="fas fa-weight-hanging"></i>
                        </div>
                        <div class="detail-text">${displayQuantity}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-icon">
                            <i class="fas fa-map-marker-alt"></i>
                        </div>
                        <div class="detail-text">${displayLocation}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-icon">
                            <i class="fas fa-certificate"></i>
                        </div>
                        <div class="detail-text">${listing.grade}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-icon">
                            <i class="fas fa-truck"></i>
                        </div>
                        <div class="detail-text">${listing.availability}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-icon">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="detail-text">${displaySellerName}</div>
                    </div>
                </div>
                <div class="listing-price">${displayPrice}</div>
                <div class="listing-footer">
                    <div class="listing-date">Posted ${listing.postedDate}</div>
                    <button class="btn-view-details" onclick="event.stopPropagation(); viewListingDetails('${listing.listing_id || listing.id}')">
                        View Details
                    </button>
                </div>
            </div>
        </div>
    `
}

function createLoadingSkeletons() {
  const skeletons = []
  for (let i = 0; i < 6; i++) {
    skeletons.push(`
            <div class="listing-card loading">
                <div class="listing-image loading-skeleton"></div>
                <div class="listing-content">
                    <div class="listing-title loading-skeleton" style="height: 24px; margin-bottom: 1rem;"></div>
                    <div class="listing-details">
                        <div class="detail-item">
                            <div class="detail-icon loading-skeleton"></div>
                            <div class="detail-text loading-skeleton" style="height: 16px; width: 80px;"></div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-icon loading-skeleton"></div>
                            <div class="detail-text loading-skeleton" style="height: 16px; width: 100px;"></div>
                        </div>
                    </div>
                    <div class="listing-price loading-skeleton" style="height: 28px; width: 120px; margin-bottom: 1rem;"></div>
                </div>
            </div>
        `)
  }
  return skeletons.join("")
}

function createNoResultsMessage() {
  return `
        <div class="no-results" style="text-align: center; padding: 4rem 2rem; grid-column: 1 / -1;">
            <i class="fas fa-search" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 2rem;"></i>
            <h3 style="color: var(--text-dark); margin-bottom: 1rem;">No listings found</h3>
            <p style="color: var(--text-light); margin-bottom: 2rem;">Try adjusting your filters or search terms to find what you're looking for.</p>
            <button class="btn btn-primary" onclick="clearAllFilters()">Clear All Filters</button>
        </div>
    `
}

function updateResultsInfo() {
  const total = currentListings.length
  const startIndex = (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, total)

  document.getElementById("resultsCount").textContent = `Showing ${startIndex}-${endIndex} of ${total} listings`

  // Get category name from categoriesData for display
  let categoryText = "";
  if (filters.category_id && categoriesData.length > 0) {
    const categoryData = categoriesData.find(cat => (cat.category_id || cat.id).toString() === filters.category_id);
    if (categoryData && (categoryData.title || categoryData.name)) {
      const categoryName = categoryData.title || categoryData.name;
      categoryText = categoryName.charAt(0).toUpperCase() + categoryName.slice(1) + " ";
    }
  }

  document.getElementById("resultsDescription").textContent = `${categoryText}scrap materials from verified sellers`
}

function updatePagination() {
  const totalPages = Math.ceil(currentListings.length / itemsPerPage)
  const pagination = document.getElementById("pagination")

  if (totalPages <= 1) {
    pagination.innerHTML = ""
    return
  }

  let paginationHTML = ""

  // Previous button
  paginationHTML += `
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `

  // Page numbers
  const startPage = Math.max(1, currentPage - 2)
  const endPage = Math.min(totalPages, currentPage + 2)

  if (startPage > 1) {
    paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(1); return false;">1</a>
            </li>
        `
    if (startPage > 2) {
      paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
            <li class="page-item ${i === currentPage ? "active" : ""}">
                <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
            </li>
        `
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`
    }
    paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${totalPages}); return false;">${totalPages}</a>
            </li>
        `
  }

  // Next button
  paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `

  pagination.innerHTML = paginationHTML
}

function changePage(page) {
  if (page < 1 || page > Math.ceil(currentListings.length / itemsPerPage)) {
    return
  }

  currentPage = page
  loadListings()

  // Scroll to top of listings
  document.querySelector(".results-header").scrollIntoView({
    behavior: "smooth",
    block: "start",
  })
}

function viewListingDetails(listingId) {
  console.log("Viewing details for listing:", listingId)
  // Navigate to the listing detail page with the listing ID
  window.location.href = `/listing-detail/?id=${listingId}`
}

// Advertisement Management
function closeAd(adId) {
  const adElement = document.getElementById(adId)
  if (adElement) {
    // adElement.style.transform = "translateX(-100%)"
    // adElement.style.opacity = 
    // "0"
    setTimeout(() => {
      adElement.style.removeProperty("display")
      adElement.style.display = "none"

    }, 300)
  }

  // Store closed ad in localStorage
  const closedAds = JSON.parse(localStorage.getItem("closedAds") || "[]")
  if (!closedAds.includes(adId)) {
    closedAds.push(adId)
    localStorage.setItem("closedAds", JSON.stringify(closedAds))
  }
}

// Mobile Advertisement System
function initializeMobileAds() {
  // Only run on mobile devices
  if (window.innerWidth >= 1200) {
    return
  }

  // Check if ads should be shown
  const lastAdTime = localStorage.getItem("lastMobileAdTime")
  const currentAdIndex = Number.parseInt(localStorage.getItem("currentMobileAdIndex") || "0")
  const now = Date.now()

  // Show ad every 5 minutes (300000 ms)
  const adInterval = 300000


  if (!lastAdTime || now - Number.parseInt(lastAdTime) >= adInterval) {
    showMobileAd(currentAdIndex)
  }

  // Set up timer for next ad
  const timeUntilNextAd = lastAdTime ? adInterval - (now - Number.parseInt(lastAdTime)) : adInterval

  setTimeout(
    () => {
      setInterval(() => {
        const nextIndex =
          (Number.parseInt(localStorage.getItem("currentMobileAdIndex") || "0") + 1) % advertisements.length
        showMobileAd(nextIndex)
      }, adInterval)
    },
    Math.max(0, timeUntilNextAd),
  )
}

function showMobileAd(adIndex) {
  if (window.innerWidth >= 1200) {
    return
  }

  const ad = advertisements[adIndex]
  if (!ad) return

  // Update stored values
  localStorage.setItem("lastMobileAdTime", Date.now().toString())
  localStorage.setItem("currentMobileAdIndex", adIndex.toString())

  // Create ad content
  const adContent = `
        <img src="${ad.image}" alt="${ad.title}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 12px; margin-bottom: 1rem;">
        <h5 style="font-size: 1.3rem; font-weight: 700; color: var(--text-dark); margin-bottom: 1rem;">${ad.title}</h5>
        <p style="color: var(--text-light); font-size: 1rem; line-height: 1.6; margin: 0;">${ad.description}</p>
    `

  // Show modal
  document.getElementById("mobileAdContent").innerHTML = adContent
  const modal = new bootstrap.Modal(document.getElementById("mobileAdModal"))
  modal.show()

  console.log(`Showing mobile ad ${adIndex + 1}:`, ad.title)
}

// Utility functions
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Add debounced search
document.getElementById("searchInput")?.addEventListener(
  "input",
  debounce(function () {
    if (this.value.length >= 3 || this.value.length === 0) {
      performSearch()
    }
  }, 500),
)

// Fallback initialization if ListingsApp is not called
setTimeout(() => {
  if (!all_listings_api_url) {
    console.log("⚠️  ListingsApp not initialized, using sample data");
    currentListings = [...sampleListings];
    applyFilters();
    loadListings();
  }
}, 2000);

console.log("🚀 Listings page initialized successfully!")
console.log("📊 Features: Advanced filtering, Search, Pagination, Mobile ads")
console.log("📱 Mobile ads will show every 5 minutes")
