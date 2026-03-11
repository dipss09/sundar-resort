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

    const revealOnScroll = new IntersectionObserver(function (entries, observer) {
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

    // Room Gallery Modal Logic
    const galleryModal = document.getElementById('roomGalleryModal');
    const openGalleryBtn = document.getElementById('openGalleryBtn');
    const closeGalleryBtn = document.getElementById('closeGalleryBtn');
    const galleryMainImg = document.getElementById('galleryMainImg');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const thumbs = document.querySelectorAll('.thumb');

    let currentImageIndex = 1;
    const totalImages = 10;

    if (openGalleryBtn && galleryModal) {
        openGalleryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            galleryModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            updateGallery(currentImageIndex);
        });

        closeGalleryBtn.addEventListener('click', () => {
            galleryModal.classList.remove('active');
            document.body.style.overflow = '';
        });

        // Close on background click
        galleryModal.addEventListener('click', (e) => {
            if (e.target === galleryModal) {
                galleryModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentImageIndex = currentImageIndex > 1 ? currentImageIndex - 1 : totalImages;
                updateGallery(currentImageIndex);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                currentImageIndex = currentImageIndex < totalImages ? currentImageIndex + 1 : 1;
                updateGallery(currentImageIndex);
            });
        }
    }

    window.setGalleryImage = function (index) {
        currentImageIndex = index;
        updateGallery(index);
    };

    function updateGallery(index) {
        if (!galleryMainImg) return;
        galleryMainImg.src = `room ${index}.jpg`;
        thumbs.forEach(t => t.classList.remove('active'));
        if (thumbs[index - 1]) {
            thumbs[index - 1].classList.add('active');
            thumbs[index - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }


});
