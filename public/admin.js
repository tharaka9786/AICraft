document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('auth-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginBtn = document.getElementById('login-btn');
    const adminPassInput = document.getElementById('admin-pass');
    
    let adminToken = '';

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

    // Extract YouTube ID from URL
    function extractVideoID(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    const addVideoBtn = document.getElementById('add-video-btn');
    const ytUrlInput = document.getElementById('yt-url');
    const ytTitleInput = document.getElementById('yt-title');

    addVideoBtn.addEventListener('click', async () => {
        const url = ytUrlInput.value.trim();
        const title = ytTitleInput.value.trim();
        const videoId = extractVideoID(url);

        if (!videoId) {
            alert('Invalid YouTube URL');
            return;
        }

        try {
            const response = await fetch('/api/videos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': adminToken
                },
                body: JSON.stringify({ youtube_id: videoId, title: title })
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
                item.innerHTML = `
                    <div class="video-info">
                        <img src="https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg" alt="Thumbnail">
                        <div>
                            <h4>${video.title || 'Untitled Video'}</h4>
                            <p style="font-size: 12px; color: var(--text-secondary);">ID: ${video.youtube_id}</p>
                        </div>
                    </div>
                    <i class="ph ph-trash delete-btn" data-id="${video.id}"></i>
                `;
                videoList.appendChild(item);
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
});
