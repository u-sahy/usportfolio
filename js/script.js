// Wait for the page to load before removing preloader
window.addEventListener("load", () => {
    const preloader = document.getElementById("preloader");
    if (preloader) { // Check if preloader exists
        setTimeout(() => {
            preloader.style.opacity = "0";
            preloader.style.visibility = "hidden";
        }, 600);
    }
});

// Theme Toggle (Light / Dark Mode)
const themeToggle = document.getElementById("themeToggle");
const body = document.body;

// Load saved theme from localStorage
if (localStorage.getItem("theme") === "light") {
    body.classList.add("light");
    body.classList.remove("dark");
} else {
    body.classList.add("dark");
}

// Toggle theme on click
if (themeToggle) { // Check if the toggle exists
    themeToggle.addEventListener("click", (e) => {

        if (e.target.classList.contains("toggle-text")) return;
    // Toggle the theme class
        if (body.classList.contains("light")) {
            body.classList.replace("light", "dark");
            localStorage.setItem("theme", "dark");
        } else {
            body.classList.replace("dark", "light");
            localStorage.setItem("theme", "light");
        }
    });
}

// --- New Code Block for Theme Switch ICON Logic ---
document.addEventListener("DOMContentLoaded", () => {
    const themeSwitchButton = document.getElementById("theme-switch");
    const body = document.body;

    if (!themeSwitchButton) return; // Exit if the new button isn't found

    // The observer watches the body element for changes in the 'class' attribute
    // This allows the icon to update regardless of which piece of JS triggers the theme change.
    const observer = new MutationObserver((mutationsList, observer) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                updateThemeIcons();
            }
        }
    });

    // Configuration for the observer: watch for attribute changes
    const config = { attributes: true };

    // Start observing the body for class changes
    observer.observe(body, config);

    // Initial check and function to set the icons based on the body class
    const updateThemeIcons = () => {
        const isLight = body.classList.contains("light");
        const moonIcon = themeSwitchButton.querySelector('bi bi-sun-fill');
        const sunIcon = themeSwitchButton.querySelector('.bi-moon-stars-fill');
        
        // This logic is mostly handled by your CSS, but it's good practice
        // to have a fallback or initial state set in JS.
        if (isLight) {
            // Light Mode: Show Moon icon (for switching to dark)
            if (moonIcon) moonIcon.style.display = 'inline-block';
            if (sunIcon) sunIcon.style.display = 'none';
        } else {
            // Dark Mode: Show Sun icon (for switching to light)
            if (moonIcon) moonIcon.style.display = 'none';
            if (sunIcon) sunIcon.style.display = 'inline-block';
        }
    };

    // Run the initial update when the page loads
    updateThemeIcons();
    
    // 💡 Attach the existing theme-toggle logic to the new button
    // This connects the new button to the existing logic that toggles the 'light'/'dark' classes.
    const themeToggleLogic = document.getElementById("themeToggle");
    if (themeToggleLogic) {
        // If the old logic exists, remove its ID to prevent double-firing
        themeToggleLogic.id = 'old-theme-toggle'; 
    }
    
    // Attach the click event to the NEW button
    themeSwitchButton.addEventListener("click", () => {
        if (body.classList.contains("light")) {
            body.classList.replace("light", "dark");
            localStorage.setItem("theme", "dark");
        } else {
            body.classList.replace("dark", "light");
            localStorage.setItem("theme", "light");
        }
        // The MutationObserver will call updateThemeIcons() automatically
    });
});
// -------------------------------------------------------------


// ------------------------------------------------------------------
// SIDE MENU (Menu logic runs safely on ALL pages)
// ------------------------------------------------------------------
const sidemenu = document.getElementById("sidemenu");
const menuBtn = document.getElementById("menuBtn");
const closeBtn = document.getElementById("closeBtn"); // Get close button directly by ID

if (sidemenu && menuBtn && closeBtn) {
// Functions to be called by onclick in HTML
    window.openmenu = function () {
        sidemenu.classList.add("open");
    };
    window.closemenu = function () {
        sidemenu.classList.remove("open");
    };
}

// cv download
document.getElementById("forceDownload").addEventListener("click", () => {
    fetch("Umar_Sahy_CV.pdf")
        .then(response => response.blob())
        .then(blob => {
            const fileURL = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = fileURL;
            a.download = "Umar_Sahy_CV.pdf"; // file name
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(fileURL);
        })
        .catch(err => {
            alert("Could not download the file ❌");
            console.error(err);
        });
});

//floting plus
const toTop = document.querySelector(".floating-social")
window.addEventListener("scroll", () => {
    if (window.pageYOffset > 100) {
        toTop.classList.add("active");
    } else {
        toTop.classList.remove("active");
    }
})

// fill language
// --- New Code Block for Language Bar Animation (Refined) ---
document.addEventListener("DOMContentLoaded", () => {
    const languagesSection = document.querySelector(".languages");
    
    if (!languagesSection) return;

    const fillBars = languagesSection.querySelectorAll(".fill");
    
    fillBars.forEach(bar => {
        // Read the inline style width (e.g., "90%") and save it to a data attribute
        const finalWidth = bar.style.width;
        bar.setAttribute('data-final-width', finalWidth);
        
        // Ensure the initial state is controlled by the CSS file
        // By removing the inline style temporarily, the CSS rule 'width: 0;' takes effect.
        bar.style.removeProperty('width'); 
    });

    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                fillBars.forEach(bar => {
                    const finalWidth = bar.getAttribute('data-final-width');
                    // This sets the width and triggers the animation
                    bar.style.width = finalWidth;
                });
                
                observer.unobserve(languagesSection);
            }
        });
    };

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.2
    };

    const languageObserver = new IntersectionObserver(observerCallback, observerOptions);
    languageObserver.observe(languagesSection);
});

document.addEventListener("DOMContentLoaded", () => {
    // Select all elements tagged for animation
    const animatedElements = document.querySelectorAll('.animate-on-scroll');

    // Set observer options: Trigger when 10% of the element is visible
    const observerOptions = {
        root: null, // viewport
        rootMargin: '0px',
        // Use a threshold array to trigger on both entry (0.1) and exit (0.0)
        threshold: [0.0, 0.1]
    };

    // Callback function executed when an element intersects the viewport
    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            // Check if element is at least 10% visible (entering view)
            if (entry.intersectionRatio >= 0.1) {
                // Fade-In: Add the final state class
                entry.target.classList.add('in-view');
            } else if (entry.intersectionRatio < 0.1) {
                // Fade-Out: Remove the final state class
                // This will trigger the transition back to the initial state
                entry.target.classList.remove('in-view');
            }
            // Note: We no longer unobserve the element because we need to
            // keep tracking it for the fade-out effect.
        });
    };
    
    // Create the Intersection Observer
    const scrollObserver = new IntersectionObserver(observerCallback, observerOptions);

    // Loop through all elements and observe them
    animatedElements.forEach(element => {
        scrollObserver.observe(element);
    });
});

// Footer Year (Always safe to run)
const yearSpan = document.getElementById("year");
if (yearSpan) {
    document.getElementById("year").textContent = new Date().getFullYear();
}

// ------------------------------------------------------------------
// MESSAGE COUNTDOWN (Only runs if 'sendBtn' and 'formMessage' exist)
// NOTE: The main form logic is now inlined in contact.html for better page-specific context.
// This block is only for the event listener on the main script.js file.
// Since you had the form logic in contact.html, I've left the core logic there, 
// but if you move it back here, ensure the elements are checked for existence.
// I've removed the redundant click listener logic from here as it was defined in contact.html.
// ------------------------------------------------------------------