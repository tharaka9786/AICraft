document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    const menuIcon = mobileMenuBtn.querySelector('i');

    let isMenuOpen = false;

    function toggleMenu() {
        isMenuOpen = !isMenuOpen;
        if (isMenuOpen) {
            mobileMenu.classList.add('active');
            menuIcon.classList.remove('ph-list');
            menuIcon.classList.add('ph-x');
            document.body.style.overflow = 'hidden';
        } else {
            mobileMenu.classList.remove('active');
            menuIcon.classList.remove('ph-x');
            menuIcon.classList.add('ph-list');
            document.body.style.overflow = '';
        }
    }

    mobileMenuBtn.addEventListener('click', toggleMenu);

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (isMenuOpen) toggleMenu();
        });
    });

    // Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Scroll Reveal Animation
    function reveal() {
        const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
        for (let i = 0; i < reveals.length; i++) {
            const windowHeight = window.innerHeight;
            const elementTop = reveals[i].getBoundingClientRect().top;
            const elementVisible = 100;

            if (elementTop < windowHeight - elementVisible) {
                reveals[i].classList.add('active');
            }
        }
    }

    window.addEventListener('scroll', reveal);
    reveal(); // Trigger on load

    // Set Current Year
    document.getElementById('year').textContent = new Date().getFullYear();

    // Canvas Background Animation
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }

    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 2;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.speedY = Math.random() * 0.5 - 0.25;
            this.opacity = Math.random() * 0.5 + 0.1;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x < 0 || this.x > width) this.speedX *= -1;
            if (this.y < 0 || this.y > height) this.speedY *= -1;
        }
        draw() {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        const numParticles = Math.floor((width * height) / 15000);
        for (let i = 0; i < numParticles; i++) {
            particles.push(new Particle());
        }
    }

    initParticles();

    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
            
            // Draw lines between close particles
            for (let j = i; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 - distance/1000})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    
    animate();

    // Rating System Logic
    const stars = document.querySelectorAll('#star-rating i');
    const feedbackForm = document.getElementById('feedback-form');
    const submitBtn = document.getElementById('submit-rating');
    const feedbackComment = document.getElementById('feedback-comment');
    const ratingSuccess = document.getElementById('rating-success');
    let selectedRating = 0;

    stars.forEach(star => {
        star.addEventListener('mouseover', function() {
            const val = this.getAttribute('data-value');
            highlightStars(val);
        });

        star.addEventListener('mouseout', function() {
            highlightStars(selectedRating);
        });

        star.addEventListener('click', function() {
            selectedRating = this.getAttribute('data-value');
            highlightStars(selectedRating);
            feedbackForm.style.display = 'flex'; // Show comment box
        });
    });

    function highlightStars(val) {
        stars.forEach(star => {
            if (star.getAttribute('data-value') <= val) {
                star.classList.add('ph-fill');
                star.classList.add('active');
            } else {
                star.classList.remove('ph-fill');
                star.classList.remove('active');
            }
        });
    }

    submitBtn.addEventListener('click', async () => {
        if (selectedRating === 0) return;

        const comment = feedbackComment.value;
        submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Submitting...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/ratings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ stars: selectedRating, comment: comment })
            });

            if (response.ok) {
                feedbackForm.style.display = 'none';
                document.getElementById('star-rating').style.display = 'none';
                document.querySelector('.rating-container h3').style.display = 'none';
                ratingSuccess.style.display = 'flex';
                fetchAndDisplayRatings(); // Refresh ratings display
            } else {
                alert("Failed to submit rating. Please try again.");
                submitBtn.innerHTML = 'Submit Rating <i class="ph ph-paper-plane-tilt"></i>';
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error:', error);
            alert("An error occurred. Please try again.");
            submitBtn.innerHTML = 'Submit Rating <i class="ph ph-paper-plane-tilt"></i>';
            submitBtn.disabled = false;
        }
    });

    // Fetch and display ratings
    async function fetchAndDisplayRatings() {
        try {
            const response = await fetch('/api/ratings');
            if (!response.ok) return;
            const ratings = await response.json();
            
            if (ratings.length > 0) {
                document.getElementById('rating-overview').style.display = 'block';
                
                // Calculate Average
                const total = ratings.reduce((sum, r) => sum + r.stars, 0);
                const avg = (total / ratings.length).toFixed(1);
                
                document.getElementById('avg-score').textContent = avg;
                document.getElementById('total-reviews').textContent = `Based on ${ratings.length} review${ratings.length !== 1 ? 's' : ''}`;
                
                // Render Average Stars
                let avgStarsHtml = '';
                const fullStars = Math.floor(avg);
                const hasHalfStar = avg - fullStars >= 0.5;
                for (let i = 1; i <= 5; i++) {
                    if (i <= fullStars) {
                        avgStarsHtml += '<i class="ph-fill ph-star"></i>';
                    } else if (i === fullStars + 1 && hasHalfStar) {
                        avgStarsHtml += '<i class="ph-fill ph-star-half"></i>';
                    } else {
                        avgStarsHtml += '<i class="ph ph-star"></i>';
                    }
                }
                document.getElementById('avg-stars').innerHTML = avgStarsHtml;

                // Render Recent Reviews (up to 3 with comments)
                const reviewsWithComments = ratings.filter(r => r.comment && r.comment.trim() !== '');
                const recentReviews = reviewsWithComments.slice(0, 3);
                
                const reviewsGrid = document.getElementById('recent-reviews');
                if (recentReviews.length > 0) {
                    let reviewsHtml = '';
                    recentReviews.forEach(r => {
                        let starsHtml = '';
                        for(let i=1; i<=5; i++) {
                            starsHtml += `<i class="${i <= r.stars ? 'ph-fill' : 'ph'} ph-star"></i>`;
                        }
                        reviewsHtml += `
                            <div class="review-card">
                                <div class="stars">${starsHtml}</div>
                                <div class="review-comment">"${r.comment.replace(/</g, "&lt;").replace(/>/g, "&gt;")}"</div>
                            </div>
                        `;
                    });
                    reviewsGrid.innerHTML = reviewsHtml;
                }
            }
        } catch (error) {
            console.error('Failed to fetch ratings:', error);
        }
    }

    async function fetchAndDisplayVideos() {
        try {
            const response = await fetch('/api/videos');
            if (!response.ok) return;
            const videos = await response.json();
            
            const videoGrid = document.getElementById('public-video-grid');
            
            // Inject the pinned promotional video at the very beginning
            videos.unshift({
                platform: 'google_drive',
                video_url: 'https://drive.google.com/file/d/1ffyoeJWZ4L_4MZ8FQouwRvutbX4Eii1j/view?usp=drivesdk',
                title: 'AICraft Promotional Video'
            });

            if (videos.length === 0) {
                videoGrid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1; text-align: center;">New videos coming soon...</p>';
                return;
            }

            let videosHtml = '';
            
            videos.forEach((video, index) => {
                const isExtra = index >= 3;
                const platform = video.platform || 'youtube';
                let iframeHtml = '';
                
                if (platform === 'youtube') {
                    iframeHtml = `<iframe src="https://www.youtube.com/embed/${video.youtube_id}" title="${video.title || 'YouTube video'}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                } else if (platform === 'facebook') {
                    const encodedUrl = encodeURIComponent(video.video_url);
                    iframeHtml = `<iframe src="https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&width=auto" style="border:none;overflow:hidden; height:100%; width:100%; position:absolute; top:0; left:0;" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;
                } else if (platform === 'google_drive') {
                    const match = video.video_url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                    if (match && match[1]) {
                        const fileId = match[1];
                        iframeHtml = `<iframe src="https://drive.google.com/file/d/${fileId}/preview" width="100%" height="100%" style="border:none; position:absolute; top:0; left:0;" allow="autoplay" allowfullscreen></iframe>`;
                    } else {
                        iframeHtml = `<iframe src="${video.video_url}" width="100%" height="100%" style="border:none; position:absolute; top:0; left:0;" allow="autoplay" allowfullscreen></iframe>`;
                    }
                }

                videosHtml += `
                    <div class="video-card reveal-left ${isExtra ? 'extra-video' : ''}" style="${isExtra ? 'display: none;' : ''}">
                        <div class="video-iframe-container">
                            ${iframeHtml}
                        </div>
                        <div class="video-card-title">${video.title || 'Video Project'}</div>
                    </div>
                `;
            });
            videoGrid.innerHTML = videosHtml;
            
            // Re-trigger reveal logic for newly added items
            reveal(); 

            // Add Show More/Less button if there are more than 3 videos
            if (videos.length > 3) {
                const toggleContainer = document.createElement('div');
                toggleContainer.style.textAlign = 'center';
                toggleContainer.style.marginTop = '24px';
                toggleContainer.style.gridColumn = '1 / -1'; // span full width of grid

                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'btn-outline';
                toggleBtn.style.cursor = 'pointer';
                
                let isExpanded = false;
                
                const updateBtnText = () => {
                    toggleBtn.innerHTML = isExpanded 
                        ? 'Show Less <i class="ph ph-caret-up"></i>' 
                        : 'Show More <i class="ph ph-caret-down"></i>';
                };
                updateBtnText();
                
                toggleBtn.addEventListener('click', () => {
                    isExpanded = !isExpanded;
                    updateBtnText();
                    
                    const extraVideos = videoGrid.querySelectorAll('.extra-video');
                    extraVideos.forEach(card => {
                        card.style.display = isExpanded ? 'block' : 'none';
                        if (isExpanded) {
                            card.classList.remove('active');
                            setTimeout(() => reveal(), 50);
                        }
                    });
                    
                    if (!isExpanded) {
                        // Scroll back to the "Our Work" section if collapsed
                        const section = document.getElementById('portfolio');
                        if (section) {
                            section.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                });

                toggleContainer.appendChild(toggleBtn);
                videoGrid.appendChild(toggleContainer);
            }
        } catch (error) {
            console.error('Failed to fetch videos:', error);
        }
    }

    fetchAndDisplayRatings();
    fetchAndDisplayVideos();

    // Fetch and update total visits with session tracking
    async function updateVisits() {
        try {
            const apiUrl = window.location.origin.includes('localhost') 
                ? 'http://localhost:3000/api/visits' 
                : '/api/visits';
                
            // Check if this user has already been counted in this session
            const hasVisited = sessionStorage.getItem('has_visited');
            const method = hasVisited ? 'GET' : 'POST';
                
            const response = await fetch(apiUrl, { method: method });
            if (response.ok) {
                const data = await response.json();
                
                // If it was a new visit, mark session so we don't count reloads
                if (!hasVisited) {
                    sessionStorage.setItem('has_visited', 'true');
                }

                const visitElements = document.querySelectorAll('.visit-count-display');
                visitElements.forEach(el => {
                    // Add comma formatting for large numbers
                    el.innerText = parseInt(data.total_visits).toLocaleString();
                });
            }
        } catch (error) {
            console.error('Failed to update visits:', error);
        }
    }
    updateVisits();
    // Fetch and display dynamic prices
    async function fetchPublicPrices() {
        try {
            const response = await fetch('/api/settings/prices');
            if (response.ok) {
                const prices = await response.json();
                
                const tui = document.getElementById('price-tuition-display');
                if (tui && prices.price_tuition) tui.innerText = prices.price_tuition;
                
                const sb = document.getElementById('price-smallbiz-display');
                if (sb && prices.price_smallbiz) sb.innerText = prices.price_smallbiz;
                
                const cust = document.getElementById('price-custom-display');
                if (cust && prices.price_custom) cust.innerText = prices.price_custom;
            }
        } catch (error) {
            console.error('Failed to fetch prices:', error);
        }
    }
    fetchPublicPrices();
});
