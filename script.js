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
        galleryMainImg.src = `assets/room ${index}.jpg`;
        thumbs.forEach(t => t.classList.remove('active'));
        if (thumbs[index - 1]) {
            thumbs[index - 1].classList.add('active');
            thumbs[index - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }

    // ──────────────────────────────────────────────
    //  🔥 FIRESTORE DATA LOADING (replaces Strapi)
    // ──────────────────────────────────────────────

    // Fetch Hero from Firestore
    db.collection("siteContent").doc("hero").get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            if (data.heroTitle) document.getElementById('hero-title').innerHTML = data.heroTitle;
            if (data.heroSubtitle) document.getElementById('hero-subtitle').innerHTML = data.heroSubtitle;
            if (data.heroImage) document.getElementById('hero-img').src = data.heroImage;
        }
    }).catch(err => console.log('Hero fetch:', err));

    // Fetch About from Firestore
    db.collection("siteContent").doc("about").get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            if (data.title) document.getElementById('about-title').innerHTML = data.title;
            if (data.description) document.getElementById('about-description').innerHTML = data.description;
            if (data.image) document.getElementById('about-img').src = data.image;
        }
    }).catch(err => console.log('About fetch:', err));

    // Fetch Rooms from Firestore
    const roomsList = document.getElementById('rooms-list');
    if (roomsList) {
        roomsList.style.listStyle = "none";
        roomsList.style.padding = "0";

        db.collection("rooms").get().then(snapshot => {
            const rooms = [];
            snapshot.forEach(doc => rooms.push(doc.data()));

            if (rooms.length > 0) {
                roomsList.innerHTML = '';
                rooms.forEach(room => {
                    const li = document.createElement('li');
                    li.style.display = "flex";
                    li.style.alignItems = "center";
                    li.style.marginBottom = "15px";
                    li.style.background = "#fff";
                    li.style.padding = "10px";
                    li.style.borderRadius = "8px";
                    li.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";

                    const imgHtml = room.image
                        ? `<img src="${room.image}" alt="${room.title}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; margin-right: 15px;">`
                        : `<div style="width: 80px; height: 80px; background: #eee; border-radius: 6px; margin-right: 15px; display: flex; align-items:center; justify-content:center; color:#999; font-size:12px;">No Image</div>`;

                    li.innerHTML = `
                        ${imgHtml}
                        <div>
                            <strong style="display:block; font-size:1.1rem; color:#333;">${room.title || 'Room'}</strong>
                            ${room.price ? '<span style="color:var(--primary); font-weight:600;">₹' + room.price + ' /night</span>' : ''}
                        </div>
                    `;
                    roomsList.appendChild(li);
                });
            } else {
                roomsList.innerHTML = '<li>Check back soon for available rooms.</li>';
            }
        }).catch(err => {
            console.error('Rooms fetch:', err);
            roomsList.innerHTML = '<li>Unable to load rooms at this time.</li>';
        });
    }

    // Fetch Services (What's New) from Firestore
    const facilitiesList = document.getElementById('facilities-list');
    if (facilitiesList) {
        db.collection("services").get().then(snapshot => {
            const items = [];
            snapshot.forEach(doc => items.push(doc.data()));

            if (items.length > 0) {
                facilitiesList.innerHTML = '';
                items.forEach(item => {
                    const imgHtml = item.image
                        ? `<img src="${item.image}" alt="${item.name}" style="width:100%; height:150px; object-fit:cover; border-radius:8px 8px 0 0; margin-bottom:15px;">`
                        : `<div class="card-icon" style="font-size:3rem; margin-bottom:15px; padding-top: 20px;">🏨</div>`;

                    const card = document.createElement('div');
                    card.className = "card glass-card";
                    card.style.background = "white";
                    card.style.padding = item.image ? "0 0 20px 0" : "30px";
                    card.style.overflow = "hidden";

                    card.innerHTML = `
                        ${imgHtml}
                        <div style="padding: 0 20px;">
                            <h3>${item.name || 'Facility'}</h3>
                            <p>${item.description || ''}</p>
                        </div>
                    `;
                    facilitiesList.appendChild(card);
                });
            } else {
                facilitiesList.innerHTML = '<p>Check back soon for our facilities.</p>';
            }
        }).catch(err => console.log('Services fetch:', err));
    }

    // Fetch Offers from Firestore
    const offersList = document.getElementById('offers-list');
    if (offersList) {
        db.collection("offers").get().then(snapshot => {
            const items = [];
            snapshot.forEach(doc => items.push(doc.data()));

            if (items.length > 0) {
                offersList.innerHTML = '';
                items.forEach(item => {
                    const imgHtml = item.image
                        ? `<img src="${item.image}" alt="${item.title}" style="width:100%; height:200px; object-fit:cover; border-radius:8px 8px 0 0; margin-bottom:15px;">`
                        : `<div class="card-icon" style="font-size:3rem; margin-bottom:15px; padding-top:20px;">🎁</div>`;

                    const card = document.createElement('div');
                    card.className = "card glass-card";
                    card.style.background = "white";
                    card.style.padding = item.image ? "0 0 20px 0" : "30px";
                    card.style.overflow = "hidden";

                    card.innerHTML = `
                        ${imgHtml}
                        <div style="padding: 0 20px;">
                            <h3>${item.title || 'Special Offer'}</h3>
                            <p>${item.description || ''}</p>
                        </div>
                    `;
                    offersList.appendChild(card);
                });
            } else {
                offersList.innerHTML = '<p>No special offers at this time.</p>';
            }
        }).catch(err => console.log('Offers fetch:', err));
    }

    // Fetch Dining from Firestore
    db.collection("siteContent").doc("dining").get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            if (data.title) document.getElementById('dining-title').innerHTML = data.title;
            if (data.description) document.getElementById('dining-desc').innerHTML = data.description;
            if (data.image) document.getElementById('dining-img').src = data.image;
        }
    }).catch(err => console.log('Dining fetch:', err));

    // Fetch Reviews from Firestore (only approved)
    const reviewsList = document.getElementById('reviews-list');
    if (reviewsList) {
        db.collection("reviews").where("approved", "==", true).orderBy("createdAt", "desc").get().then(snapshot => {
            const items = [];
            snapshot.forEach(doc => items.push(doc.data()));

            if (items.length > 0) {
                reviewsList.innerHTML = '';
                items.forEach(item => {
                    let starsHtml = '';
                    for (let i = 0; i < 5; i++) {
                        starsHtml += i < (item.rating || 5) ? '★' : '☆';
                    }

                    const card = document.createElement('div');
                    card.className = "review-card";
                    card.innerHTML = `
                        <div class="review-header">
                            <span class="review-author">${item.name || 'Anonymous'}</span>
                            <span class="stars">${starsHtml}</span>
                        </div>
                        <p class="review-body">"${item.content || ''}"</p>
                    `;
                    reviewsList.appendChild(card);
                });
            } else {
                reviewsList.innerHTML = '<p>No reviews yet. Be the first to share your experience!</p>';
            }
        }).catch(err => {
            console.log('Reviews fetch:', err);
            if (reviewsList) reviewsList.innerHTML = '<p>No reviews yet. Be the first to share your experience!</p>';
        });
    }

    // Handle Review Form Submission → Save to Firestore
    const reviewForm = document.getElementById('review-form');
    if (reviewForm) {
        reviewForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('reviewer-name').value;
            const content = document.getElementById('review-content').value;
            let rating = 5;
            const ratingInput = document.querySelector('input[name="rating"]:checked');
            if (ratingInput) rating = parseInt(ratingInput.value);

            const submitMsg = document.getElementById('review-submit-msg');
            const submitBtn = reviewForm.querySelector('button[type="submit"]');

            submitBtn.textContent = "Submitting...";
            submitBtn.disabled = true;

            db.collection("reviews").add({
                name: name,
                rating: rating,
                content: content,
                approved: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                reviewForm.reset();
                submitMsg.textContent = "Thank you! Your review has been submitted and is pending approval.";
                submitMsg.style.display = "block";
                submitMsg.style.color = "var(--primary)";
            }).catch(err => {
                submitMsg.textContent = "An error occurred. Please try again later.";
                submitMsg.style.display = "block";
                submitMsg.style.color = "red";
                console.error("Review Submit Error:", err);
            }).finally(() => {
                submitBtn.textContent = "Submit Review";
                submitBtn.disabled = false;
                setTimeout(() => submitMsg.style.display = "none", 5000);
            });
        });
    }

});
