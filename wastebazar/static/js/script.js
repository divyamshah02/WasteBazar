
// How It Works Section - Tab functionality
document.addEventListener('DOMContentLoaded', function () {
    // Check for existing user login and redirect if authenticated


    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetTab = this.dataset.tab;

            // Remove active class from all tabs and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            // Add active class to clicked tab
            this.classList.add('active');

            // Show corresponding panel
            const targetPanel = document.getElementById(targetTab + '-panel');
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // Video play functionality
    const playButtons = document.querySelectorAll('.video-play-button');

    playButtons.forEach(button => {
        button.addEventListener('click', function () {
            const videoUrl = this.dataset.video;
            const videoWrapper = this.closest('.video-wrapper');

            if (videoUrl && videoWrapper) {
                // Create iframe element
                const iframe = document.createElement('iframe');
                iframe.src = videoUrl + '?autoplay=1';
                iframe.className = 'video-iframe';
                iframe.allowFullscreen = true;
                iframe.allow = 'autoplay';

                // Replace thumbnail with iframe
                videoWrapper.innerHTML = '';
                videoWrapper.appendChild(iframe);
            }
        });
    });
});

// Initialize AOS
AOS.init({
    duration: 1000,
    once: true,
    offset: 100,
    easing: 'ease-out-cubic'
});

// Navbar scroll effect
window.addEventListener('scroll', function () {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// // Search tabs functionality
// document.querySelectorAll('.search-tab').forEach(tab => {
//     tab.addEventListener('click', function () {
//         document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
//         this.classList.add('active');

//         const tabType = this.dataset.tab;
//         console.log('Search tab changed to:', tabType);

//         // Update form placeholder text based on tab
//         // const searchBtn = document.querySelector('.search-btn');
//         // if (tabType === 'buy') {
//         //     searchBtn.innerHTML = '<i class="fas fa-search me-2"></i>Find Sellers';
//         // } else if (tabType === 'sell') {
//         //     searchBtn.innerHTML = '<i class="fas fa-search me-2"></i>Find Buyers';
//         // } else {
//         //     searchBtn.innerHTML = '<i class="fas fa-search me-2"></i>View Requirements';
//         // }
//     });
// });

// Search form submission
// document.getElementById('searchForm').addEventListener('submit', function (e) {
//     e.preventDefault();

//     const formData = {
//         category: document.getElementById('category').value,
//         subcategory: document.getElementById('subcategory').value,
//         location: document.getElementById('location').value,
//         // minQuantity: document.getElementById('minQuantity').value,
//         // maxQuantity: document.getElementById('maxQuantity').value,
//         // priceRange: document.getElementById('priceRange').value
//     };

//     console.log('Search submitted:', formData);

//     // Show loading state
//     const searchBtn = document.querySelector('.search-btn');
//     const originalText = searchBtn.innerHTML;
//     searchBtn.innerHTML = '<div class="loading"></div> Searching...';
//     searchBtn.disabled = true;

//     // Simulate search delay
//     setTimeout(() => {
//         searchBtn.innerHTML = originalText;
//         searchBtn.disabled = false;
//         window.location.href = `listings.html?${new URLSearchParams(formData).toString()}`;
//     }, 1500);
// });

// Category card click handlers
document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', function () {
        const categoryTitle = this.querySelector('.category-title').textContent;
        console.log('Category clicked:', categoryTitle);

        // Add click animation
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = '';
            window.location.href = `listings.html?category=${encodeURIComponent(categoryTitle)}`;
        }, 150);
    });
});

// Hero CTA buttons
document.querySelectorAll('.btn-hero, .btn-hero-outline').forEach(btn => {
    btn.addEventListener('click', function () {
        const action = this.textContent.trim();
        console.log('Hero CTA clicked:', action);

        if (action.includes('Browse') || action.includes('Listings')) {
            window.location.href = '/listings/';
        } else if (action.includes('Post')) {
            // Check authentication for posting
            showPostListingModal();
        } else if (action.includes('Login') || action.includes('Sign In')) {
            // Handle login button
            showLoginModal();
        } else if (action.includes('Register') || action.includes('Sign Up')) {
            // Redirect to registration
            window.location.href = '/register/';
        }
    });
});


// View details buttons
document.querySelectorAll('.btn-view-details').forEach(btn => {
    btn.addEventListener('click', function () {
        console.log('View details clicked');
        window.location.href = 'listing-detail.html';
    });
});

// FAQ functionality
document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', function () {
        const faqItem = this.parentElement;
        const isActive = faqItem.classList.contains('active');

        // Close all FAQ items
        document.querySelectorAll('.faq-item').forEach(item => {
            item.classList.remove('active');
        });

        // Open clicked item if it wasn't active
        if (!isActive) {
            faqItem.classList.add('active');
        }
    });
});

// Newsletter form
// document.querySelector('.newsletter-form').addEventListener('submit', function (e) {
//     e.preventDefault();
//     const email = this.querySelector('.newsletter-input').value;
//     const btn = this.querySelector('.newsletter-btn');

//     // Show loading state
//     btn.innerHTML = '<div class="loading"></div>';
//     btn.disabled = true;

//     // Simulate subscription
//     setTimeout(() => {
//         btn.innerHTML = 'Subscribed!';
//         btn.style.background = 'var(--success-color)';
//         this.querySelector('.newsletter-input').value = '';

//         setTimeout(() => {
//             btn.innerHTML = 'Subscribe';
//             btn.style.background = '';
//             btn.disabled = false;
//         }, 2000);
//     }, 1000);

//     console.log('Newsletter subscription:', email);
// });

// Smooth scrolling for anchor links
// document.querySelectorAll('a[href^="#"]').forEach(anchor => {
//     anchor.addEventListener('click', function (e) {
//         e.preventDefault();
//         const target = document.querySelector(this.getAttribute('href'));
//         if (target) {
//             target.scrollIntoView({
//                 behavior: 'smooth',
//                 block: 'start'
//             });
//         }
//     });
// });

// Counter animation for stats
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');

    counters.forEach(counter => {
        const target = counter.textContent;
        const numericValue = parseInt(target.replace(/[^\d]/g, ''));
        const suffix = target.replace(/[\d]/g, '');

        let current = 0;
        const increment = numericValue / 100;
        const timer = setInterval(() => {
            current += increment;
            if (current >= numericValue) {
                counter.textContent = target;
                clearInterval(timer);
            } else {
                counter.textContent = Math.floor(current) + suffix;
            }
        }, 30);
    });
}

// Trigger counter animation when hero section is visible
const heroSection = document.querySelector('.hero-section');
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            setTimeout(animateCounters, 1000);
            observer.unobserve(entry.target);
        }
    });
});
observer.observe(heroSection);

// Dynamic price updates (simulate real-time data)
function updatePrices() {
    const priceElements = document.querySelectorAll('.price-value');
    priceElements.forEach(element => {
        if (element.textContent.includes('₹')) {
            const currentPrice = parseInt(element.textContent.replace(/[^\d]/g, ''));
            const variation = Math.random() * 0.02 - 0.01; // ±1% variation
            const newPrice = Math.round(currentPrice * (1 + variation));
            element.textContent = `₹${newPrice.toLocaleString()}/ton`;
        }
    });
}

// Update prices every 30 seconds
setInterval(updatePrices, 30000);

// Mobile menu enhancements
const navbarToggler = document.querySelector('.navbar-toggler');
const navbarCollapse = document.querySelector('.navbar-collapse');

navbarToggler.addEventListener('click', function () {
    setTimeout(() => {
        if (navbarCollapse.classList.contains('show')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    }, 300);
});

// Close mobile menu when clicking outside
document.addEventListener('click', function (e) {
    if (!navbarCollapse.contains(e.target) && !navbarToggler.contains(e.target)) {
        if (navbarCollapse.classList.contains('show')) {
            navbarToggler.click();
        }
    }
});

// // Modal functions (placeholders)
// function showLoginModal() {
//     // Check if user is already logged in
//     const userId = localStorage.getItem('user_id');
//     const userRole = localStorage.getItem('user_role');

//     if (userId && userRole) {
//         // User is already logged in, redirect to their dashboard
//         console.log('🔄 User already logged in, redirecting to dashboard');
//         redirectBasedOnRole(userRole);
//     } else {
//         // Redirect to direct login page
//         console.log('🚪 Redirecting to login page');
//         window.location.href = '/directlogin/';
//     }
// }

// function showPostListingModal() {
//     // Check if user is logged in
//     const userId = localStorage.getItem('user_id');
//     const userRole = localStorage.getItem('user_role');

//     if (userId && userRole) {
//         // User is logged in, redirect to listing form
//         if (userRole.includes('seller')) {
//             console.log('🏪 Seller authenticated, redirecting to listing form');
//             window.location.href = '/listing-form/';
//         } else {
//             // Buyer trying to post - suggest seller registration
//             alert('To post listings, you need a seller account. Would you like to register as a seller?');
//             // You can redirect to seller registration here
//         }
//     } else {
//         // User not logged in, redirect to login first
//         console.log('🔒 User not authenticated, redirecting to login');
//         alert('Please log in to post a listing');
//         window.location.href = '/directlogin/';
//     }
// }

// Parallax effect for floating shapes
window.addEventListener('scroll', function () {
    const scrolled = window.pageYOffset;
    const parallax = document.querySelectorAll('.floating-shape');
    const speed = 0.5;

    parallax.forEach(element => {
        const yPos = -(scrolled * speed);
        element.style.transform = `translateY(${yPos}px)`;
    });
});

// Add loading states to buttons
// document.querySelectorAll('button').forEach(button => {
//     button.addEventListener('click', function () {
//         if (!this.disabled && !this.classList.contains('no-loading')) {
//             const originalText = this.innerHTML;
//             this.style.position = 'relative';

//             // Add subtle loading effect
//             setTimeout(() => {
//                 this.style.position = '';
//             }, 200);
//         }
//     });
// });

// Intersection Observer for animations
const animatedElements = document.querySelectorAll('[data-aos]');
const animationObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('aos-animate');
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

animatedElements.forEach(element => {
    animationObserver.observe(element);
});

// Performance optimization: Debounce scroll events
let scrollTimeout;
window.addEventListener('scroll', function () {
    if (scrollTimeout) {
        clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(function () {
        // Additional scroll-based functionality
    }, 10);
});

// Add hover effects to cards
document.querySelectorAll('.listing-card, .requirement-card, .testimonial-card').forEach(card => {
    card.addEventListener('mouseenter', function () {
        this.style.transform = 'translateY(-10px) scale(1.02)';
    });

    card.addEventListener('mouseleave', function () {
        this.style.transform = '';
    });
});

// Interactive Category Explorer functionality
document.addEventListener('DOMContentLoaded', function () {
    console.log('🔧 Initializing category explorer...');

    // Electronic Devices Section - Category switching functionality
    const categoryItems = document.querySelectorAll('.category-main-item');
    const subcategorySections = document.querySelectorAll('.subcategory-section');

    console.log('📂 Found category items:', categoryItems.length);
    console.log('📋 Found subcategory sections:', subcategorySections.length);

    // Category data mapping for Electronic Devices
    const categoryData = {
        'Mobile Phones': {
            id: 'mobile-phones',
            title: 'Mobile Phones',
            subcategories: [
                { icon: 'fas fa-mobile-alt', name: 'Smartphones' },
                { icon: 'fas fa-tablet-alt', name: 'Tablets' },
                { icon: 'fas fa-headphones', name: 'Earphones & Headsets' },
                { icon: 'fas fa-battery-half', name: 'Mobile Batteries' }
            ]
        },
        'Laptops & Computers': {
            id: 'laptops-computers',
            title: 'Laptops & Computers',
            subcategories: [
                { icon: 'fas fa-laptop', name: 'Laptops' },
                { icon: 'fas fa-desktop', name: 'Desktop Computers' },
                { icon: 'fas fa-server', name: 'Servers' },
                { icon: 'fas fa-memory', name: 'RAM & Storage' }
            ]
        },
        'Electronic Components': {
            id: 'electronic-components',
            title: 'Electronic Components',
            subcategories: [
                { icon: 'fas fa-keyboard', name: 'Keyboards' },
                { icon: 'fas fa-mouse', name: 'Computer Mouse' },
                { icon: 'fas fa-tv', name: 'Monitors' },
                { icon: 'fas fa-print', name: 'Printers' }
            ]
        },
        'Accessories & Parts': {
            id: 'accessories-parts',
            title: 'Accessories & Parts',
            subcategories: [
                { icon: 'fas fa-microchip', name: 'Circuit Boards' },
                { icon: 'fas fa-plug', name: 'Power Adapters' },
                { icon: 'fas fa-wifi', name: 'Network Equipment' },
                { icon: 'fas fa-camera', name: 'Camera Equipment' }
            ]
        }
    };

    // Function to update subcategory content for Electronic Devices
    function updateSubcategoryContent(categoryName) {
        const data = categoryData[categoryName];
        if (!data) return;

        // Hide all subcategory sections
        subcategorySections.forEach(section => {
            section.style.display = 'none';
        });

        // Find or create the target section
        let targetSection = document.getElementById(data.id);
        if (targetSection) {
            targetSection.style.display = 'block';
        } else {
            // Create new section if it doesn't exist
            const subcategoryGrid = document.getElementById('subcategory-content');
            targetSection = document.createElement('div');
            targetSection.className = 'subcategory-section';
            targetSection.id = data.id;
            targetSection.style.display = 'block';

            const titleElement = document.createElement('h4');
            titleElement.className = 'subcategory-title';
            titleElement.textContent = data.title;

            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'subcategory-items';

            data.subcategories.forEach(sub => {
                const itemElement = document.createElement('div');
                itemElement.className = 'subcategory-item';
                itemElement.innerHTML = `
                    <div class="item-icon"><i class="${sub.icon}"></i></div>
                    <span>${sub.name}</span>
                `;

                // Add click handler for subcategory items
                itemElement.addEventListener('click', function () {
                    console.log('Subcategory clicked:', sub.name);
                    window.location.href = `listings.html?category=${encodeURIComponent(categoryName)}&subcategory=${encodeURIComponent(sub.name)}`;
                });

                itemsContainer.appendChild(itemElement);
            });

            targetSection.appendChild(titleElement);
            targetSection.appendChild(itemsContainer);
            subcategoryGrid.appendChild(targetSection);
        }
    }

    // Add click handlers to Electronic Devices category items
    categoryItems.forEach(item => {
        item.addEventListener('click', function () {
            // Remove active class from all items in the same section
            categoryItems.forEach(i => i.classList.remove('active'));

            // Add active class to clicked item
            this.classList.add('active');

            // Get category name and update content
            const categoryName = this.textContent.trim();
            updateSubcategoryContent(categoryName);

            console.log('Electronic Device category switched to:', categoryName);
        });
    });

    // Metal Scrap & Alloys Section Functionality
    const metalCategoryItems = document.querySelectorAll('.metal-main-item');
    const metalSubcategorySections = document.querySelectorAll('.metal-subcategory-section');

    console.log('🔩 Found metal category items:', metalCategoryItems.length);
    console.log('⚡ Found metal subcategory sections:', metalSubcategorySections.length);

    // Metal category mapping
    const metalCategoryMapping = {
        'Ferrous Metals': 'ferrous-metals',
        'Non-Ferrous Metals': 'non-ferrous-metals',
        'Precious Metals': 'precious-metals',
        'Industrial Alloys': 'industrial-alloys'
    };

    // Add click handlers to Metal category items
    metalCategoryItems.forEach(item => {
        item.addEventListener('click', function () {
            // Remove active class from all metal items
            metalCategoryItems.forEach(i => i.classList.remove('active'));

            // Add active class to clicked item
            this.classList.add('active');

            // Get category name and show corresponding subcategory section
            const categoryName = this.textContent.trim();
            const targetId = metalCategoryMapping[categoryName];

            // Hide all metal subcategory sections
            metalSubcategorySections.forEach(section => {
                section.style.display = 'none';
            });

            // Show the target section
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.style.display = 'block';
            }

            console.log('Metal category switched to:', categoryName);
        });
    });

    // Add click handlers to metal subcategory items
    document.addEventListener('click', function (e) {
        if (e.target.closest('.metal-subcategory-section .subcategory-item')) {
            const item = e.target.closest('.subcategory-item');
            const subcategoryName = item.querySelector('span').textContent;
            const sectionTitle = item.closest('.metal-subcategory-section').querySelector('.subcategory-title').textContent;
            console.log('Metal subcategory clicked:', subcategoryName, 'in section:', sectionTitle);
            window.location.href = `listings.html?category=Metal Scrap & Alloys&subcategory=${encodeURIComponent(subcategoryName)}`;
        }
    });

    // Plastic & Polymer Waste Section Functionality
    const plasticCategoryItems = document.querySelectorAll('.plastic-main-item');
    const plasticSubcategorySections = document.querySelectorAll('.plastic-subcategory-section');

    console.log('🧪 Found plastic category items:', plasticCategoryItems.length);
    console.log('♻️ Found plastic subcategory sections:', plasticSubcategorySections.length);

    // Plastic category mapping
    const plasticCategoryMapping = {
        'PET & HDPE': 'pet-hdpe',
        'Industrial Plastics': 'industrial-plastics',
        'Packaging Materials': 'packaging-materials',
        'Polymer Films': 'polymer-films'
    };

    // Add click handlers to Plastic category items
    plasticCategoryItems.forEach(item => {
        item.addEventListener('click', function () {
            // Remove active class from all plastic items
            plasticCategoryItems.forEach(i => i.classList.remove('active'));

            // Add active class to clicked item
            this.classList.add('active');

            // Get category name and show corresponding subcategory section
            const categoryName = this.textContent.trim();
            const targetId = plasticCategoryMapping[categoryName];

            // Hide all plastic subcategory sections
            plasticSubcategorySections.forEach(section => {
                section.style.display = 'none';
            });

            // Show the target section
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.style.display = 'block';
            }

            console.log('Plastic category switched to:', categoryName);
        });
    });

    // Add click handlers to plastic subcategory items
    document.addEventListener('click', function (e) {
        if (e.target.closest('.plastic-subcategory-section .subcategory-item')) {
            const item = e.target.closest('.subcategory-item');
            const subcategoryName = item.querySelector('span').textContent;
            const sectionTitle = item.closest('.plastic-subcategory-section').querySelector('.subcategory-title').textContent;
            console.log('Plastic subcategory clicked:', subcategoryName, 'in section:', sectionTitle);
            window.location.href = `listings.html?category=Plastic & Polymer Waste&subcategory=${encodeURIComponent(subcategoryName)}`;
        }
    });

    // Add hover effects to subcategory items for all sections
    document.addEventListener('click', function (e) {
        if (e.target.closest('.subcategory-item')) {
            const item = e.target.closest('.subcategory-item');
            const subcategoryName = item.querySelector('span').textContent;
            console.log('Subcategory item clicked:', subcategoryName);
        }
    });

    // WasteBazar Materials Section - Desktop Tab functionality
    const materialsTabButtons = document.querySelectorAll('.materials-tab-button');
    const materialsTabPanels = document.querySelectorAll('.materials-tab-panel');

    materialsTabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetTab = this.dataset.tab;

            // Remove active class from all buttons and panels
            materialsTabButtons.forEach(btn => btn.classList.remove('active'));
            materialsTabPanels.forEach(panel => panel.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Show corresponding panel
            const targetPanel = document.getElementById(targetTab);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // Top-level materials category tabs (Plastic, Metal, Paper) - Updated for Swiffy Slider
    // Top-level materials category tabs (Bootstrap Scrollable)
    const categoryNavButtons = document.querySelectorAll('#materialsScrollContainer .nav-link');
    const categoryPanels = document.querySelectorAll('.category-panel');

    categoryNavButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            // activate button - remove active from all buttons in container
            categoryNavButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const cat = this.getAttribute('data-category');
            // toggle panels
            let activePanel = null;
            categoryPanels.forEach(panel => {
                if (panel.getAttribute('data-category') === cat) {
                    panel.style.display = 'block';
                    activePanel = panel;
                } else {
                    panel.style.display = 'none';
                }
            });
            // auto-select first material in the active panel
            if (activePanel) {
                const firstItem = activePanel.querySelector('.selector-item');
                if (firstItem) firstItem.click();
            }
        });
    });

    // Horizontal scroll functionality
    const scrollContainer = document.getElementById('materialsScroller');
    const scrollPrevBtn = document.getElementById('scrollPrev');
    const scrollNextBtn = document.getElementById('scrollNext');

    if (scrollContainer && scrollPrevBtn && scrollNextBtn) {
        const scrollAmount = 200; // Amount to scroll per click

        function updateScrollButtons() {
            const scrollLeft = scrollContainer.scrollLeft;
            const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;

            // Update button states
            scrollPrevBtn.disabled = scrollLeft <= 0;
            scrollNextBtn.disabled = scrollLeft >= maxScroll;
        }

        scrollPrevBtn.addEventListener('click', () => {
            scrollContainer.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
        });

        scrollNextBtn.addEventListener('click', () => {
            scrollContainer.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
        });

        // Update button states on scroll
        scrollContainer.addEventListener('scroll', updateScrollButtons);

        // Initial button state update
        updateScrollButtons();

        // Update on window resize
        window.addEventListener('resize', updateScrollButtons);
    }
    // WasteBazar Materials Section - Mobile Tab functionality (Bootstrap)
    const mobileTabTriggers = document.querySelectorAll('#materials-mobile-tabs button[data-bs-toggle="pill"]');

    mobileTabTriggers.forEach(trigger => {
        trigger.addEventListener('shown.bs.tab', function (e) {
            // Add any additional functionality when mobile tabs are switched
            console.log('Mobile materials tab switched to:', e.target.getAttribute('aria-controls'));
        });
    });
});
// JavaScript for materials section interactivity

document.addEventListener('DOMContentLoaded', function () {
    const detailContents = document.querySelectorAll('.detail-content');
    const materialImages = document.querySelectorAll('.material-image');
    const overlayBadges = document.querySelectorAll('.overlay-badge');

    // delegate click from container to support per-panel scoping
    document.addEventListener('click', function (e) {
        const item = e.target.closest('.selector-item');
        if (!item) return;

        // Remove active from siblings only (current grid)
        const grid = item.closest('.selector-grid');
        if (grid) {
            grid.querySelectorAll('.selector-item').forEach(i => i.classList.remove('active'));
        }
        item.classList.add('active');

        const materialId = item.dataset.material;
        // Toggle detail content
        detailContents.forEach(content => {
            if (content.dataset.material === materialId) content.classList.add('active');
            else content.classList.remove('active');
        });
        // Toggle images and badges
        materialImages.forEach(img => img.style.display = (img.dataset.material === materialId) ? 'block' : 'none');
        overlayBadges.forEach(badge => badge.style.display = (badge.dataset.material === materialId) ? 'block' : 'none');
    });
});

// Mega Dropdown Enhancement - Click and Hover
document.addEventListener('DOMContentLoaded', function () {
    const megaDropdown = document.querySelector('.mega-dropdown');
    const megaDropdownMenu = document.querySelector('.mega-dropdown-menu');
    const categoriesDropdown = document.getElementById('categoriesDropdown');

    if (megaDropdown && megaDropdownMenu && categoriesDropdown) {
        let hoverTimeout;

        // Function to show dropdown
        function showDropdown() {
            clearTimeout(hoverTimeout);
            categoriesDropdown.classList.add('show');
            categoriesDropdown.setAttribute('aria-expanded', 'true');
            megaDropdownMenu.classList.add('show');

            // Add entrance animation stagger effect
            const items = megaDropdownMenu.querySelectorAll('.mega-dropdown-item');
            items.forEach((item, index) => {
                item.style.animationDelay = `${index * 0.03}s`;
                item.classList.add('fade-in-up');
            });
        }

        // Function to hide dropdown with delay
        function hideDropdown(immediate = false) {
            if (immediate) {
                clearTimeout(hoverTimeout);
                hideDropdownNow();
            } else {
                hoverTimeout = setTimeout(hideDropdownNow, 150);
            }
        }

        // Function to immediately hide dropdown
        function hideDropdownNow() {
            categoriesDropdown.classList.remove('show');
            categoriesDropdown.setAttribute('aria-expanded', 'false');
            megaDropdownMenu.classList.remove('show');

            // Remove animation classes
            const items = megaDropdownMenu.querySelectorAll('.mega-dropdown-item');
            items.forEach(item => {
                item.classList.remove('fade-in-up');
                item.style.animationDelay = '';
            });
        }

        // Click Toggle Behavior
        categoriesDropdown.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            // Simple toggle logic
            if (categoriesDropdown.classList.contains('show') || megaDropdownMenu.classList.contains('show')) {
                // Currently open - close it
                hideDropdown(true);
                console.log('Dropdown closed by click');
            } else {
                // Currently closed - open it
                showDropdown();
                console.log('Dropdown opened by click');
            }
        });

        // Hover Behavior
        megaDropdown.addEventListener('mouseenter', function () {
            showDropdown();
            console.log('Dropdown opened by hover');
        });

        megaDropdown.addEventListener('mouseleave', function () {
            hideDropdown();
            console.log('Dropdown hiding by hover leave');
        });

        // Keep dropdown open when hovering over the menu
        megaDropdownMenu.addEventListener('mouseenter', function () {
            clearTimeout(hoverTimeout);
        });

        megaDropdownMenu.addEventListener('mouseleave', function () {
            hideDropdown();
        });

        // Close on outside click
        document.addEventListener('click', function (e) {
            if (!megaDropdown.contains(e.target)) {
                hideDropdown(true);
            }
        });

        // Prevent dropdown menu clicks from closing the dropdown
        megaDropdownMenu.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        // Add ripple effect to dropdown items
        const dropdownItems = megaDropdownMenu.querySelectorAll('.mega-dropdown-item');
        dropdownItems.forEach(item => {
            item.addEventListener('click', function (e) {
                // Create ripple effect
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;

                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                ripple.classList.add('ripple');

                this.appendChild(ripple);

                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });
    }
});

// Initialize platform
console.log('🚀 WasteBazar platform initialized successfully!');
console.log('📊 Platform features: Information sharing, Direct connections, Market insights');
console.log('🌱 Sustainable trading for a better tomorrow');
