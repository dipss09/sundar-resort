document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const header = document.querySelector('.header');
    
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.classList.add('mobile-menu-overlay');
    
    // Copy nav links to overlay
    const navLinks = document.querySelector('.nav-links').cloneNode(true);
    navLinks.style.display = 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.alignItems = 'center';
    
    overlay.appendChild(navLinks);
    document.body.appendChild(overlay);

    mobileMenuBtn.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.style.overflow = overlay.classList.contains('active') ? 'hidden' : '';
    });

    // Close mobile menu when a link is clicked
    overlay.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuBtn.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Header scroll background change
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Parallax effect for hero image
    const heroBg = document.querySelector('.parallax-img');
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        if (heroBg && scrolled < window.innerHeight) {
            heroBg.style.transform = `translateY(${scrolled * 0.4}px)`;
        }
    });

    // Intersection Observer for scroll animations
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-fade');
    
    const revealOpts = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            }
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
        });
    }, revealOpts);

    revealElements.forEach(el => {
        revealOnScroll.observe(el);
    });
});
