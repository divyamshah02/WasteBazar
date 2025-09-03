// Dashboard JavaScript
document.addEventListener("DOMContentLoaded", () => {
    // Navigation handling
    const navItems = document.querySelectorAll(".nav-item")
    const contentSections = document.querySelectorAll(".content-section")
    const pageTitle = document.querySelector(".page-title")
    const menuToggle = document.querySelector(".menu-toggle")
    const sidebar = document.querySelector(".sidebar")

    // Navigation click handler
    navItems.forEach((item) => {
        item.addEventListener("click", function (e) {
            e.preventDefault()

            // Remove active class from all nav items
            navItems.forEach((nav) => nav.classList.remove("active"))

            // Add active class to clicked item
            this.classList.add("active")

            // Hide all content sections
            contentSections.forEach((section) => section.classList.remove("active"))

            // Show target section
            const targetSection = this.getAttribute("data-section")
            const targetElement = document.getElementById(targetSection)
            if (targetElement) {
                targetElement.classList.add("active")

                // Update page title
                // const sectionTitle = this.querySelector("span").textContent
                // pageTitle.textContent = sectionTitle
            }

            // Close sidebar on mobile
            if (window.innerWidth <= 1024) {
                sidebar.classList.remove("open")
            }
        })
    })

    // Mobile menu toggle
    menuToggle.addEventListener("click", () => {
        sidebar.classList.toggle("open")
    })

    // Close sidebar when clicking outside on mobile
    document.addEventListener("click", (e) => {
        if (window.innerWidth <= 1024) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove("open")
            }
        }
    })

    // Handle window resize
    window.addEventListener("resize", () => {
        if (window.innerWidth > 1024) {
            sidebar.classList.remove("open")
        }
    })

    // Approve/Reject button handlers
    document.addEventListener("click", (e) => {
        if (e.target.closest(".btn-icon.approve")) {
            const row = e.target.closest("tr")
            if (row) {
                row.style.backgroundColor = "#dcfce7"
                setTimeout(() => {
                    row.remove()
                }, 1000)
            }
        }

        if (e.target.closest(".btn-icon.reject")) {
            const row = e.target.closest("tr")
            if (row) {
                row.style.backgroundColor = "#fef2f2"
                setTimeout(() => {
                    row.remove()
                }, 1000)
            }
        }
    })

    // Approve All button handlers
    document.addEventListener("click", (e) => {
        if (e.target.closest(".btn-secondary")) {
            const buttonText = e.target.closest(".btn-secondary").textContent.trim()
            if (buttonText.includes("Approve All")) {
                const section = e.target.closest(".content-section")
                const rows = section.querySelectorAll("tbody tr")

                rows.forEach((row, index) => {
                    setTimeout(() => {
                        row.style.backgroundColor = "#dcfce7"
                        setTimeout(() => {
                            row.remove()
                        }, 500)
                    }, index * 200)
                })
            }
        }
    })

    // Search functionality
    const searchInput = document.querySelector(".search-box input")
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            const searchTerm = this.value.toLowerCase()
            const activeSection = document.querySelector(".content-section.active")

            if (activeSection) {
                const rows = activeSection.querySelectorAll("tbody tr")
                rows.forEach((row) => {
                    const text = row.textContent.toLowerCase()
                    if (text.includes(searchTerm)) {
                        row.style.display = ""
                    } else {
                        row.style.display = "none"
                    }
                })
            }
        })
    }

    // Filter dropdown handlers
    document.addEventListener("change", (e) => {
        if (e.target.classList.contains("filter-dropdown")) {
            const filterValue = e.target.value
            const targetId = e.target.getAttribute("data-target")
            const targetContainer = document.getElementById(targetId)

            if (targetContainer) {
                if (targetContainer.tagName === "TBODY") {
                    // Handle table filtering
                    const rows = targetContainer.querySelectorAll("tr")
                    rows.forEach((row) => {
                        if (filterValue === "all") {
                            row.style.display = ""
                        } else {
                            const status = row.getAttribute("data-status") || row.getAttribute("data-role")
                            if (status === filterValue) {
                                row.style.display = ""
                            } else {
                                row.style.display = "none"
                            }
                        }
                    })
                } else {
                    // Handle grid filtering (requirements)
                    const cards = targetContainer.querySelectorAll(".requirement-card")
                    cards.forEach((card) => {
                        if (filterValue === "all") {
                            card.style.display = ""
                        } else {
                            const status = card.getAttribute("data-status")
                            if (status === filterValue) {
                                card.style.display = ""
                            } else {
                                card.style.display = "none"
                            }
                        }
                    })
                }
            }
        }
    })

    // Dashboard card links navigation
    const dashboardCardLinks = document.querySelectorAll('.card-link')
    dashboardCardLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault()

            const targetSection = this.getAttribute('data-section')

            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'))

            // Find and activate the corresponding nav item
            const correspondingNavItem = document.querySelector(`.nav-item[data-section="${targetSection}"]`)
            if (correspondingNavItem) {
                correspondingNavItem.classList.add('active')
            }

            // Hide all content sections
            contentSections.forEach(section => section.classList.remove('active'))

            // Show target section
            const targetElement = document.getElementById(targetSection)
            if (targetElement) {
                targetElement.classList.add('active')
            }

            // Close sidebar on mobile
            if (window.innerWidth <= 1024) {
                sidebar.classList.remove('open')
            }
        })
    })
})
