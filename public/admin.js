document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('auth-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginBtn = document.getElementById('login-btn');
    const adminPassInput = document.getElementById('admin-pass');
    const showPassToggle = document.getElementById('show-pass-toggle');
    
    let adminToken = '';

    showPassToggle.addEventListener('change', () => {
        adminPassInput.type = showPassToggle.checked ? 'text' : 'password';
    });

    loginBtn.addEventListener('click', async () => {
        const pass = adminPassInput.value.trim();
        if (pass) {
            loginBtn.innerText = 'Verifying...';
            try {
                const response = await fetch('/api/auth-check', {
                    headers: { 'Authorization': pass }
                });
                
                if (response.ok) {
                    adminToken = pass;
                    authSection.style.display = 'none';
                    dashboardSection.style.display = 'block';
                    fetchVideos();
                    fetchPrices();
                } else {
                    alert('Incorrect password! Please try again.');
                }
            } catch (error) {
                console.error('Auth error:', error);
                alert('Network error while checking password.');
            } finally {
                loginBtn.innerText = 'Login';
            }
        }
    });

    // --- Password Reset Flow ---
    const forgotPassLink = document.getElementById('forgot-pass-link');
    const resetSection = document.getElementById('reset-section');
    const secretQuestionDisplay = document.getElementById('secret-question-display');
    const resetBtn = document.getElementById('reset-btn');
    const cancelResetBtn = document.getElementById('cancel-reset-btn');
    const secretAnswerInput = document.getElementById('secret-answer');
    const resetNewPassInput = document.getElementById('reset-new-pass');

    forgotPassLink.addEventListener('click', async (e) => {
        e.preventDefault();
        authSection.style.display = 'none';
        resetSection.style.display = 'block';
        
        try {
            const res = await fetch('/api/secret-question');
            if (res.ok) {
                const data = await res.json();
                secretQuestionDisplay.innerText = data.question;
            } else {
                secretQuestionDisplay.innerText = 'Failed to load question.';
            }
        } catch (error) {
            secretQuestionDisplay.innerText = 'Network error.';
        }
    });

    cancelResetBtn.addEventListener('click', () => {
        resetSection.style.display = 'none';
        authSection.style.display = 'block';
    });

    resetBtn.addEventListener('click', async () => {
        const answer = secretAnswerInput.value.trim();
        const newPassword = resetNewPassInput.value.trim();
        if (!answer || newPassword.length < 4) {
            alert('Please provide the answer and a password (min 4 chars).');
            return;
        }

        try {
            const res = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answer, newPassword })
            });
            if (res.ok) {
                alert('Password reset successfully! Please log in.');
                resetSection.style.display = 'none';
                authSection.style.display = 'block';
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to reset password.');
            }
        } catch (error) {
            alert('Network error.');
        }
    });

    // --- Change Password Flow ---
    const changePassBtn = document.getElementById('change-pass-btn');
    const changePassInput = document.getElementById('change-pass-input');

    changePassBtn.addEventListener('click', async () => {
        const newPassword = changePassInput.value.trim();
        if (newPassword.length < 4) {
            alert('Password must be at least 4 chars.');
            return;
        }
        try {
            const res = await fetch('/api/change-password', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                },
                body: JSON.stringify({ newPassword })
            });
            if (res.ok) {
                alert('Password updated successfully!');
                adminToken = newPassword; // Update token in memory
                changePassInput.value = '';
            } else {
                alert('Failed to update password.');
            }
        } catch (error) {
            alert('Network error.');
        }
    });

    // Extract YouTube ID from URL or accept raw 11-char ID
    function extractVideoID(url) {
        if (!url) return null;
        // If it's exactly 11 characters and has no URL symbols, assume it's a raw ID
        if (url.length === 11 && !url.includes('/') && !url.includes('?')) return url;
        
        // Match standard URLs, embed URLs, and Shorts URLs
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    const videoPlatformSelect = document.getElementById('video-platform');
    const addVideoBtn = document.getElementById('add-video-btn');
    const ytUrlInput = document.getElementById('yt-url');
    const ytTitleInput = document.getElementById('yt-title');

    addVideoBtn.addEventListener('click', async () => {
        const platform = videoPlatformSelect.value;
        const url = ytUrlInput.value.trim();
        const title = ytTitleInput.value.trim();
        
        let videoId = '';
        let videoUrl = '';
        
        if (platform === 'youtube') {
            videoId = extractVideoID(url);
            if (!videoId) {
                alert('Invalid YouTube URL');
                return;
            }
        } else {
            videoUrl = url;
            if (!videoUrl) {
                alert('Invalid URL');
                return;
            }
        }

        try {
            const response = await fetch('/api/videos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                },
                body: JSON.stringify({ 
                    youtube_id: videoId, 
                    title: title,
                    platform: platform,
                    video_url: videoUrl
                })
            });

            if (response.ok) {
                ytUrlInput.value = '';
                ytTitleInput.value = '';
                fetchVideos();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to add video');
            }
        } catch (error) {
            console.error('Error adding video:', error);
            alert('Network error');
        }
    });

    async function fetchVideos() {
        try {
            const response = await fetch('/api/videos');
            if (!response.ok) throw new Error('Failed to fetch');
            const videos = await response.json();
            
            const videoList = document.getElementById('video-list');
            videoList.innerHTML = '';

            if (videos.length === 0) {
                videoList.innerHTML = '<p style="color: var(--text-secondary);">No videos added yet.</p>';
                return;
            }

            videos.forEach(video => {
                const item = document.createElement('div');
                item.className = 'video-item';
                const platform = video.platform || 'youtube';
                let thumbUrl = `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`;
                if (platform === 'facebook') thumbUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/512px-2021_Facebook_icon.svg.png';
                else if (platform === 'google_drive') thumbUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/512px-Google_Drive_icon_%282020%29.svg.png';
                
                item.innerHTML = `
                    <div class="video-info">
                        <img src="${thumbUrl}" alt="Thumbnail" style="object-fit: cover; height: 67px;">
                        <div>
                            <h4>${video.title || 'Untitled Video'}</h4>
                            <p style="font-size: 12px; color: var(--text-secondary);">Platform: ${platform}</p>
                        </div>
                    </div>
                    <div>
                        <i class="ph ph-pencil-simple edit-btn" data-id="${video.id}" style="margin-right: 8px; cursor: pointer; color: var(--accent-color); font-size: 24px;"></i>
                        <i class="ph ph-trash delete-btn" data-id="${video.id}"></i>
                    </div>
                `;
                videoList.appendChild(item);
            });

            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const video = videos.find(v => v.id == id);
                    if (video) openEditModal(video);
                });
            });

            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (confirm('Are you sure you want to delete this video?')) {
                        const id = e.target.getAttribute('data-id');
                        deleteVideo(id);
                    }
                });
            });

        } catch (error) {
            console.error('Error fetching videos:', error);
        }
    }

    async function deleteVideo(id) {
        try {
            const response = await fetch(`/api/videos/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': adminToken
                }
            });

            if (response.ok) {
                fetchVideos();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to delete video');
            }
        } catch (error) {
            console.error('Error deleting video:', error);
            alert('Network error');
        }
    }

    // --- Edit Modal Logic ---
    const editModal = document.getElementById('edit-video-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const editVideoId = document.getElementById('edit-video-id');
    const editVideoPlatform = document.getElementById('edit-video-platform');
    const editVideoUrl = document.getElementById('edit-video-url');
    const editVideoTitle = document.getElementById('edit-video-title');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    function openEditModal(video) {
        editVideoId.value = video.id;
        editVideoPlatform.value = video.platform || 'youtube';
        editVideoUrl.value = (video.platform === 'facebook' || video.platform === 'google_drive') ? video.video_url : `https://www.youtube.com/watch?v=${video.youtube_id}`;
        editVideoTitle.value = video.title || '';
        
        editModal.style.display = 'block';
        modalOverlay.style.display = 'block';
    }

    function closeEditModal() {
        editModal.style.display = 'none';
        modalOverlay.style.display = 'none';
    }

    cancelEditBtn.addEventListener('click', closeEditModal);
    modalOverlay.addEventListener('click', closeEditModal);

    saveEditBtn.addEventListener('click', async () => {
        const id = editVideoId.value;
        const platform = editVideoPlatform.value;
        const url = editVideoUrl.value.trim();
        const title = editVideoTitle.value.trim();

        let videoId = '';
        let videoUrl = '';
        
        if (platform === 'youtube') {
            videoId = extractVideoID(url);
            if (!videoId) {
                alert('Invalid YouTube URL');
                return;
            }
        } else {
            videoUrl = url;
            if (!videoUrl) {
                alert('Invalid URL');
                return;
            }
        }

        try {
            const response = await fetch(`/api/videos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                },
                body: JSON.stringify({ 
                    youtube_id: videoId, 
                    title: title,
                    platform: platform,
                    video_url: videoUrl
                })
            });

            if (response.ok) {
                closeEditModal();
                fetchVideos();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to update video');
            }
        } catch (error) {
            console.error('Error updating video:', error);
            alert('Network error');
        }
    });

    // --- Package Pricing Logic ---
    async function fetchPrices() {
        try {
            const response = await fetch('/api/settings/prices');
            if (response.ok) {
                const prices = await response.json();
                document.getElementById('price-tuition-input').value = prices.price_tuition || '500';
                document.getElementById('price-smallbiz-input').value = prices.price_smallbiz || '500';
                document.getElementById('price-custom-input').value = prices.price_custom || '500';
            }
        } catch (error) {
            console.error('Error fetching prices:', error);
        }
    }

    const updatePricesBtn = document.getElementById('update-prices-btn');
    if (updatePricesBtn) {
        updatePricesBtn.addEventListener('click', async () => {
            const tuition = document.getElementById('price-tuition-input').value;
            const smallbiz = document.getElementById('price-smallbiz-input').value;
            const custom = document.getElementById('price-custom-input').value;

            updatePricesBtn.innerText = 'Updating...';
            try {
                const response = await fetch('/api/settings/prices', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': adminToken
                    },
                    body: JSON.stringify({
                        price_tuition: tuition,
                        price_smallbiz: smallbiz,
                        price_custom: custom
                    })
                });

                if (response.ok) {
                    alert('Prices updated successfully!');
                } else {
                    alert('Failed to update prices.');
                }
            } catch (error) {
                console.error('Error updating prices:', error);
                alert('Network error');
            } finally {
                updatePricesBtn.innerText = 'Update Prices';
            }
        });
    }
});
