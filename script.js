/* ============================================
   🛡️ SAYODA | CYBER FORCE - SCRIPT
   ============================================ */

/* ============================================
   ☁️ SUPABASE
   ============================================ */
const SUPABASE_URL = 'https://brawrhpvtnzvvrzkguic.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Q8fBS3nVZqgvfd6diaul8A_cMvHUFtN';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ============================================
   📱 PWA REGISTER
   ============================================ */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('✅ Service Worker registered'))
            .catch(err => console.warn('❌ Service Worker error:', err));
    });
}

/* ============================================
   📊 LOADING SCREEN
   ============================================ */
window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('loadingScreen');
        if (loader) {
            loader.classList.add('hide');
            setTimeout(() => loader.remove(), 500);
        }
    }, 800);
});

/* ============================================
   🛡️ XSS SANITIZE
   ============================================ */
function sanitizeHTML(text) {
    if (!text) return '';
    const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'};
    return String(text).replace(/[&<>"'/`=]/g, s => map[s]);
}

/* ============================================
   🎵 SOUND
   ============================================ */
let audioCtx = null;
function playRewardSound() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            const startTime = now + (i * 0.08);
            const endTime = startTime + 0.35;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, endTime);
            osc.start(startTime);
            osc.stop(endTime);
        });
    } catch (e) {}
}

/* ============================================
   📦 SUPABASE FUNCTIONS
   ============================================ */
async function fetchCloudData() {
    try {
        const { data: users, error: usersError } = await sb.from('users').select('*');
        if (usersError) throw usersError;
        const { data: comments, error: commentsError } = await sb.from('comments').select('*');
        if (commentsError) throw commentsError;
        const usersObj = {};
        users.forEach(u => {
            usersObj[u.username] = {
                password: u.password,
                role: u.role,
                active: u.active,
                phone: u.phone || '',
                xp: u.xp || 0,
                level: u.level || 'مبتدئ',
                levelEmoji: u.level_emoji || '🟢',
                streak: u.streak || 0,
                badges: u.badges || [],
                videosWatched: u.videos_watched || [],
                totalRating: u.total_rating || 0,
                ratingCount: u.rating_count || 0,
                videos_locked: u.videos_locked !== undefined ? u.videos_locked : true,
                banned_features: u.banned_features || [],
                lastLogin: u.last_login || null
            };
        });
        const commentsObj = {};
        comments.forEach(c => {
            if (!commentsObj[c.video_id]) commentsObj[c.video_id] = [];
            commentsObj[c.video_id].push({ username: c.username, text: c.text, time: c.time });
        });
        return { users: usersObj, comments: commentsObj };
    } catch (e) {
        return { users: {}, comments: {} };
    }
}

/* ============================================
   📊 USER ACTIVITY
   ============================================ */
async function logActivity(activityType) {
    if (!currentUser || currentUser.isGuest) return;
    try {
        await sb.rpc('log_user_activity', {
            p_username: currentUser.username,
            p_activity_type: activityType
        });
    } catch (e) {}
}

async function getUserActivity(username, days = 7) {
    try {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        const { data, error } = await sb
            .from('user_activity')
            .select('*')
            .eq('username', username)
            .gte('activity_date', fromDate.toISOString().split('T')[0])
            .order('activity_date', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (e) { return []; }
}

/* ============================================
   💬 COMMENTS
   ============================================ */
async function loadComments(videoId) {
    try {
        const { data, error } = await sb.from('comments').select('*').eq('video_id', videoId);
        if (error) throw error;
        return data || [];
    } catch (e) { return []; }
}

async function saveComment(videoId, username, text) {
    const clean = sanitizeHTML(text.trim());
    if (!clean) return false;
    try {
        const { error } = await sb.from('comments').insert({
            video_id: videoId,
            username: sanitizeHTML(username),
            text: clean,
            time: new Date().toISOString()
        });
        if (error) throw error;
        return true;
    } catch (e) { return false; }
}

async function renderComments(videoId) {
    const container = document.getElementById('commentsContainer');
    if (!container) return;
    const comments = await loadComments(videoId);
    let html = `<div class="comments-section"><div class="comments-title">💬 التعليقات (${comments.length})</div>`;
    if (comments.length === 0) {
        html += `<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:6px;">لا توجد تعليقات، كن أول من يعلق!</div>`;
    } else {
        comments.slice(0, 30).forEach(c => {
            const time = new Date(c.time).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
            html += `<div class="comment-item"><span class="comment-user">${sanitizeHTML(c.username)}</span><span class="comment-time">${time}</span><div class="comment-text">${sanitizeHTML(c.text)}</div></div>`;
        });
    }
    if (currentUser?.isGuest) {
        html += `<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:6px;">🔒 يجب تسجيل الدخول للتعليق</div>`;
    } else if (isBanned('comment')) {
        html += `<div style="color:#ff6678;font-size:12px;text-align:center;padding:6px;">🚫 أنت محظور من التعليق</div>`;
    } else {
        html += `<div class="comment-input-area"><input type="text" id="commentInput" placeholder="اكتب تعليقك..." maxlength="500"><button onclick="postComment('${videoId}')" id="commentBtn">إرسال</button></div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
    document.getElementById('commentInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') postComment(videoId); });
}

async function postComment(videoId) {
    if (!checkGuestPermission('التعليق')) return;
    if (isBanned('comment')) { showToast('🚫 أنت محظور من التعليق', '🚫'); return; }
    const input = document.getElementById('commentInput');
    const btn = document.getElementById('commentBtn');
    const text = input.value.trim();
    if (!text) { showToast('⚠️ اكتب تعليقاً أولاً.', '⚠️'); return; }
    btn.disabled = true; btn.textContent = '⏳';
    const success = await saveComment(videoId, currentUser.username, text);
    if (success) { input.value = ''; showToast('✅ تم إضافة تعليقك!'); await renderComments(videoId); }
    else { showToast('❌ حدث خطأ.', '❌'); }
    btn.disabled = false; btn.textContent = 'إرسال';
}

/* ============================================
   👤 USER DATA
   ============================================ */
function getUserData() {
    if (!currentUser) return { xp:0, level:'مبتدئ', levelEmoji:'🟢', streak:0, lastVisit:null, videosWatched:[], badges:[], totalRating:0, ratingCount:0 };
    return currentUser.userData || {
        xp: Number(currentUser.xp || 0),
        level: currentUser.level || 'مبتدئ',
        levelEmoji: currentUser.levelEmoji || '🟢',
        streak: Number(currentUser.streak || 0),
        lastVisit: currentUser.lastVisit || null,
        videosWatched: Array.isArray(currentUser.videosWatched) ? currentUser.videosWatched : [],
        badges: Array.isArray(currentUser.badges) ? currentUser.badges : [],
        totalRating: Number(currentUser.totalRating || 0),
        ratingCount: Number(currentUser.ratingCount || 0)
    };
}

function saveUserData(d) {
    if (!currentUser || currentUser.isGuest) return;
    currentUser.userData = {...d};
    currentUser.xp = d.xp; currentUser.level = d.level; currentUser.levelEmoji = d.levelEmoji;
    currentUser.streak = d.streak; currentUser.videosWatched = d.videosWatched;
    currentUser.badges = d.badges; currentUser.totalRating = d.totalRating; currentUser.ratingCount = d.ratingCount;
    syncUserData();
}

function updateProfile() {
    const d = getUserData();
    document.getElementById('profileName').textContent = currentUser?.username || '-';
    document.getElementById('profileLevel').textContent = d.levelEmoji + ' ' + d.level;
    document.getElementById('profileLevel').className = 'level-badge level-' + (Math.floor(d.xp / 100) + 1);
    document.getElementById('profileXP').textContent = '⭐ ' + d.xp + ' XP';
    document.getElementById('profileStreak').textContent = '🔥 ' + d.streak + ' يوم';
    document.getElementById('profileVideos').textContent = d.videosWatched.length;
    document.getElementById('profileBadges').textContent = d.badges.length;
    document.getElementById('profileRating').textContent = d.ratingCount > 0 ? (d.totalRating / d.ratingCount).toFixed(1) : '0';

    const list = document.getElementById('profileBadgesList');
    const emojis = { first_video:'🎬', five_videos:'📺', ten_videos:'🏆', twenty_videos:'💎', fifty_videos:'👑', streak_7:'🔥', streak_30:'⚡', level_2:'🔵', level_3:'🟣', level_4:'🟡', level_5:'🔴' };
    const names = { first_video:'أول فيديو', five_videos:'5 فيديوهات', ten_videos:'10 فيديوهات', twenty_videos:'20 فيديو', fifty_videos:'50 فيديو', streak_7:'7 أيام متتالية', streak_30:'30 يوم متتالي', level_2:'المستوى 2', level_3:'المستوى 3', level_4:'المستوى 4', level_5:'المستوى 5' };
    list.innerHTML = d.badges.length ? d.badges.map(b => `<span class="profile-badge-item">${emojis[b]||'🏅'} ${names[b]||b}</span>`).join('') : '<span style="color:var(--text-muted);font-size:12px;">لا توجد شارات بعد</span>';

    if (currentUser?.lastLogin || currentUser?.last_login) {
        const lastLogin = currentUser.lastLogin || currentUser.last_login;
        const dt = new Date(lastLogin).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
        document.getElementById('lastLoginText').textContent = dt;
    } else {
        document.getElementById('lastLoginText').textContent = 'أول مرة';
    }
}

function addXP(amount) {
    const d = getUserData();
    d.xp += amount;
    const levels = [{ min: 0, title: 'مبتدئ', emoji: '🟢' }, { min: 100, title: 'متعلم', emoji: '🔵' }, { min: 300, title: 'خبير', emoji: '🟣' }, { min: 600, title: 'محترف', emoji: '🟡' }, { min: 1000, title: 'أسطورة', emoji: '🔴' }];
    let newLevel = levels[0];
    for (const l of levels) if (d.xp >= l.min) newLevel = l;

    if (newLevel.title !== d.level) {
        d.level = newLevel.title; d.levelEmoji = newLevel.emoji;
        const map = { 'متعلم':'level_2', 'خبير':'level_3', 'محترف':'level_4', 'أسطورة':'level_5' };
        if (map[d.level] && !d.badges.includes(map[d.level])) {
            d.badges.push(map[d.level]);
            showToast(`🎉 رفعت مستواك لـ ${d.levelEmoji} ${d.level}!`);
            playRewardSound();
            launchConfetti();
        }
    }
    saveUserData(d); updateProfile();
    return d;
}

function updateStreak() {
    const d = getUserData();
    const today = new Date().toDateString();
    if (d.lastVisit !== today) {
        const y = new Date(); y.setDate(y.getDate() - 1);
        if (d.lastVisit === y.toDateString()) {
            d.streak++;
            if (d.streak === 7 && !d.badges.includes('streak_7')) {
                d.badges.push('streak_7');
                showToast('🏅 شارة 7 أيام متتالية!');
                playRewardSound();
                launchConfetti();
            }
            if (d.streak === 30 && !d.badges.includes('streak_30')) {
                d.badges.push('streak_30');
                showToast('⚡ شارة 30 يوم متتالي!');
                playRewardSound();
                launchConfetti();
            }
        } else if (d.lastVisit !== today) d.streak = 1;
        d.lastVisit = today;
        saveUserData(d); updateProfile();
    }
}

function checkBadges() {
    const d = getUserData();
    const count = d.videosWatched.length;
    const newB = [];
    if (count >= 1 && !d.badges.includes('first_video')) newB.push('first_video');
    if (count >= 5 && !d.badges.includes('five_videos')) newB.push('five_videos');
    if (count >= 10 && !d.badges.includes('ten_videos')) newB.push('ten_videos');
    if (count >= 20 && !d.badges.includes('twenty_videos')) newB.push('twenty_videos');
    if (count >= 50 && !d.badges.includes('fifty_videos')) newB.push('fifty_videos');
    const names = { first_video:'🎬 أول فيديو', five_videos:'📺 5 فيديوهات', ten_videos:'🏆 10 فيديوهات', twenty_videos:'💎 20 فيديو', fifty_videos:'👑 50 فيديو' };
    newB.forEach(b => {
        d.badges.push(b);
        showToast(`🏅 شارة جديدة: ${names[b]}`);
        playRewardSound();
        launchConfetti();
    });
    if (newB.length) { saveUserData(d); updateProfile(); }
}

/* ============================================
   🚫 BAN CHECK
   ============================================ */
function isBanned(feature) {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return false;
    const banned = currentUser.banned_features || [];
    return banned.includes(feature) || banned.includes('all');
}

/* ============================================
   🏆 LEADERBOARD
   ============================================ */
function updateLeaderboard(cloud) {
    const list = document.getElementById('leaderboardList');
    if (!list || !cloud || !cloud.users) return;
    const entries = Object.entries(cloud.users).map(([username, data]) => {
        const videosWatched = data.videosWatched?.length || 0;
        const badgesCount = data.badges?.length || 0;
        const xp = data.xp || 0;
        const totalScore = (videosWatched * 10) + (badgesCount * 5) + xp;
        return { username, xp, videosWatched, badges: badgesCount, totalScore, level: data.level || 'مبتدئ', levelEmoji: data.levelEmoji || '🟢' };
    });
    entries.sort((a, b) => b.totalScore - a.totalScore);
    if (!entries.length) { list.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:14px;">لا يوجد مستخدمين بعد</div>'; return; }
    const medals = ['🥇', '🥈', '🥉'];
    list.innerHTML = entries.slice(0, 20).map((e, i) => {
        const rank = i < 3 ? medals[i] : `#${i+1}`;
        const isMe = e.username === currentUser?.username && !currentUser?.isGuest;
        return `<div class="leaderboard-entry" style="${isMe ? 'border-color:var(--accent);background:rgba(25,170,255,0.08);' : ''}">
            <span class="rank">${rank}</span>
            <span class="user">${sanitizeHTML(e.username)} ${isMe ? '👈' : ''}<span class="sub">${e.levelEmoji} ${e.level}</span></span>
            <span class="badges-count">🏅 ${e.badges}</span>
            <span class="badges-count">🎬 ${e.videosWatched}</span>
            <span class="score">⭐ ${e.xp}</span>
            <span class="total-score">🏆 ${e.totalScore}</span>
        </div>`;
    }).join('');
}

async function refreshLeaderboard() {
    showToast('🔄 جاري تحديث المتصدرين...');
    const cloud = await fetchCloudData();
    updateLeaderboard(cloud);
    showToast('✅ تم تحديث المتصدرين!');
}

/* ============================================
   🎉 CONFETTI
   ============================================ */
function launchConfetti() {
    const c = document.getElementById('confettiContainer');
    const colors = ['#ff6b6b','#feca57','#48dbfb','#1dd1a1','#a29bfe','#fd79a8','#fdcb6e'];
    for (let i = 0; i < 40; i++) {
        const el = document.createElement('div');
        el.className = 'confetti';
        el.style.left = Math.random() * 100 + '%';
        el.style.width = (Math.random() * 5 + 3) + 'px';
        el.style.height = (Math.random() * 5 + 3) + 'px';
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        el.style.animationDuration = (Math.random() * 1.2 + 0.8) + 's';
        el.style.animationDelay = (Math.random() * 0.5) + 's';
        c.appendChild(el);
        setTimeout(() => el.remove(), 2000);
    }
}

/* ============================================
   🔄 SYNC
   ============================================ */
async function syncUserData() {
    try {
        const u = currentUser?.username;
        if (!u || currentUser?.isGuest) return;
        
        const d = getUserData();
        
        const realVideoProgress = (videoProgress && Object.keys(videoProgress).length > 0) 
            ? {...videoProgress} 
            : (currentUser.video_progress || currentUser.videoProgress || {});
        
        const realViews = (views && Object.keys(views).length > 0) 
            ? {...views} 
            : (currentUser.views || {});
        
        const realRatings = (ratings && Object.keys(ratings).length > 0) 
            ? {...ratings} 
            : (currentUser.ratings || {});
        
        const payload = {
            xp: d.xp,
            level: d.level,
            level_emoji: d.levelEmoji,
            streak: d.streak,
            badges: d.badges,
            videos_watched: d.videosWatched,
            total_rating: d.totalRating,
            rating_count: d.ratingCount,
            views: realViews,
            ratings: realRatings,
            video_progress: realVideoProgress
        };
        
        const { error } = await sb.from('users').update(payload).eq('username', u);
        if (error) console.error('❌ Sync error:', error);
    } catch (e) {
        console.error('❌ Sync exception:', e);
    }
}

/* ============================================
   🔓 UNLOCK CODE
   ============================================ */
async function useUnlockCode() {
    if (!currentUser || currentUser.isGuest) {
        showToast('⚠️ يجب تسجيل الدخول', '⚠️');
        return;
    }
    
    const input = document.getElementById('unlockCodeInput');
    const msg = document.getElementById('unlockMsg');
    const code = input.value.trim().toUpperCase();
    
    if (!code) {
        msg.style.color = '#ff3344';
        msg.textContent = '⚠️ اكتب الكود';
        return;
    }
    
    msg.style.color = '#19aaff';
    msg.textContent = '⏳ جاري التحقق...';
    
    try {
        const { data, error } = await sb.rpc('use_unlock_code', {
            p_username: currentUser.username,
            p_code: code
        });
        
        if (error) throw error;
        
        if (data && data.success) {
            msg.style.color = '#25D366';
            msg.textContent = '✅ ' + data.message;
            input.value = '';
            showToast('🎉 تم فتح الفيديوهات!', '🎉');
            playRewardSound();
            launchConfetti();
            
            await refreshUserData();
        } else {
            msg.style.color = '#ff3344';
            msg.textContent = '❌ ' + (data?.message || 'الكود غير صحيح');
        }
    } catch (e) {
        console.error('Unlock error:', e);
        msg.style.color = '#ff3344';
        msg.textContent = '❌ حدث خطأ';
    }
}

async function refreshUserData() {
    try {
        const { data: userData } = await sb
            .from('users')
            .select('*')
            .eq('username', currentUser.username)
            .maybeSingle();
        
        if (userData) {
            currentUser.unlocked_videos = userData.unlocked_videos || {};
            currentUser.videos_locked = userData.videos_locked;
            currentUser.xp = userData.xp;
            currentUser.badges = userData.badges;
            renderVideos();
            renderMyActiveCodes();
        }
    } catch (e) {
        console.error('Refresh error:', e);
    }
}

function renderMyActiveCodes() {
    const container = document.getElementById('myActiveCodes');
    if (!container || !currentUser || currentUser.isGuest) return;
    
    const unlocked = currentUser.unlocked_videos || {};
    const keys = Object.keys(unlocked);
    
    if (!keys.length) {
        container.innerHTML = '';
        return;
    }
    
    const latestCode = unlocked.code || keys[keys.length - 1];
    const data = unlocked[latestCode] || unlocked;
    const expiresAt = data.expires_at || data.expiresAt;
    
    if (expiresAt) {
        const exp = new Date(expiresAt);
        const now = new Date();
        const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
            container.innerHTML = `
                <div style="background:rgba(37,211,102,.1);border:1px solid #25D366;border-radius:12px;padding:12px;">
                    <div style="color:#25D366;font-weight:900;font-size:14px;">✅ عندك كود مفعّل</div>
                    <div style="color:var(--text-secondary);font-size:12px;margin-top:4px;">
                        🎬 ${(data.videos || []).length} فيديو مفتوح
                    </div>
                    <div style="color:var(--gold);font-size:11px;margin-top:4px;">
                        ⏰ باقي ${diffDays} يوم
                    </div>
                </div>
            `;
        }
    }
}

/* ============================================
   📢 NOTIFICATIONS
   ============================================ */
async function loadUserNotifications(showToastMsg = false) {
    if (!currentUser || currentUser.isGuest) return [];
    try {
        const { data: notifications } = await sb.from('notifications').select('*').eq('target', 'all').order('created_at', { ascending: false }).limit(20);
        if (!notifications || notifications.length === 0) { updateNotificationBadge(0); return { all: [], unread: [] }; }
        const { data: reads } = await sb.from('notification_reads').select('notification_id').eq('username', currentUser.username);
        const readIds = (reads || []).map(r => r.notification_id);
        const unread = notifications.filter(n => !readIds.includes(n.id));
        if (unread.length > 0 && showToastMsg) showToast(`📢 ${unread[0].title}`, '📢');
        updateNotificationBadge(unread.length);
        return { all: notifications, unread: unread, readIds: readIds };
    } catch (e) { return { all: [], unread: [] }; }
}

function updateNotificationBadge(count) {
    let badge = document.getElementById('notificationBadge');
    const notifBtn = document.getElementById('notificationBtn');
    const sidebarBadge = document.getElementById('sidebarNotifBadge');
    if (notifBtn && !badge) {
        badge = document.createElement('span');
        badge.id = 'notificationBadge';
        badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#ff3344;color:#fff;font-size:9px;font-weight:bold;padding:1px 5px;border-radius:50%;min-width:16px;text-align:center;';
        notifBtn.appendChild(badge);
    }
    if (badge) { badge.textContent = count > 9 ? '9+' : count; badge.style.display = count > 0 ? 'block' : 'none'; }
    if (sidebarBadge) { sidebarBadge.textContent = count > 9 ? '9+' : count; sidebarBadge.style.display = count > 0 ? 'inline-block' : 'none'; }
}

async function openNotificationsModal() {
    if (!currentUser || currentUser.isGuest) { showToast('⚠️ يجب تسجيل الدخول', '⚠️'); return; }
    const result = await loadUserNotifications(false);
    const notifications = result.all || [];
    const readIds = result.readIds || [];
    let modal = document.getElementById('notificationsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'notificationsModal';
        modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:99999;align-items:center;justify-content:center;background:#000c;backdrop-filter:blur(12px);padding:16px;';
        modal.innerHTML = `<div style="background:rgba(5,13,24,.98);border:1px solid var(--border-color);border-radius:18px;max-width:520px;width:100%;max-height:85vh;overflow-y:auto;padding:20px;" onclick="event.stopPropagation()">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border-color);">
                <h3 style="color:var(--accent);font-size:18px;">📢 الإشعارات</h3>
                <div style="display:flex;gap:6px;">
                    <button onclick="markAllNotificationsAsRead()" style="background:rgba(25,170,255,.15);border:1px solid var(--accent);color:var(--accent);padding:5px 12px;border-radius:30px;font-size:11px;cursor:pointer;">✅ قراءة الكل</button>
                    <button onclick="closeNotificationsModal()" style="background:rgba(255,51,68,.15);border:1px solid var(--danger);color:#ff6678;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button>
                </div>
            </div>
            <div id="notificationsList"></div>
        </div>`;
        modal.addEventListener('click', e => { if (e.target === modal) closeNotificationsModal(); });
        document.body.appendChild(modal);
    }
    const list = document.getElementById('notificationsList');
    if (notifications.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:30px;font-size:14px;">📭 لا توجد إشعارات حالياً</div>';
    } else {
        list.innerHTML = notifications.map(n => {
            const isRead = readIds.includes(n.id);
            const time = new Date(n.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
            return `<div style="padding:12px;border-radius:12px;margin-bottom:8px;background:${isRead ? 'rgba(7,19,33,.3)' : 'rgba(25,170,255,.08)'};border:1px solid ${isRead ? 'var(--border-color)' : 'var(--accent)'};">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span style="color:${isRead ? 'var(--text-secondary)' : 'var(--accent)'};font-weight:bold;font-size:13px;">${isRead ? '📩' : '🔔'} ${sanitizeHTML(n.title)}</span>
                    <span style="color:var(--text-muted);font-size:10px;">${time}</span>
                </div>
                <div style="color:var(--text-secondary);font-size:12px;line-height:1.6;">${sanitizeHTML(n.body)}</div>
            </div>`;
        }).join('');
    }
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

async function markAllNotificationsAsRead() {
    if (!currentUser || currentUser.isGuest) return;
    const result = await loadUserNotifications(false);
    if (!result.unread || result.unread.length === 0) { showToast('✅ لا توجد إشعارات جديدة'); return; }
    const inserts = result.unread.map(n => ({ username: currentUser.username, notification_id: n.id }));
    await sb.from('notification_reads').insert(inserts);
    updateNotificationBadge(0);
    showToast('✅ تم قراءة كل الإشعارات');
    closeNotificationsModal();
}

/* ============================================
   🛡️ CONTENT PROTECTION
   ============================================ */
document.addEventListener('contextmenu', e => {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO' || 
        e.target.closest('.video-card') || e.target.closest('.player-wrapper') ||
        e.target.closest('#videoModal')) {
        e.preventDefault();
        showToast('🚫 غير مسموح', '🚫');
        return false;
    }
});

/* ============================================
   👤 GUEST MODE
   ============================================ */
let isGuest = false;

function checkGuestPermission(action) {
    if (currentUser?.isGuest) { showToast('⚠️ يجب تسجيل الدخول لعمل هذا', '⚠️'); return false; }
    return true;
}

/* ============================================
   🎬 VIDEO PLAYER
   ============================================ */
let ytPlayer = null;
let ytReady = false;
let progressInterval = null;
let currentVideoId = null;

(function loadYTAPI() {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
})();

window.onYouTubeIframeAPIReady = function() {
    ytReady = true;
};

function createYTPlayer(videoId) {
    const container = document.getElementById('ytPlayerDiv');
    container.innerHTML = '';
    const playerDiv = document.createElement('div');
    playerDiv.id = 'ytPlayerInner';
    container.appendChild(playerDiv);

    const savedTime = videoProgress[videoId] ? (videoProgress[videoId] / 100) * 100 : 0;

    ytPlayer = new YT.Player('ytPlayerInner', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'autoplay': 1, 'rel': 0, 'playsinline': 1, 'modestbranding': 1,
            'controls': 0, 'disablekb': 1, 'fs': 0, 'iv_load_policy': 3,
            'start': Math.floor(savedTime)
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) { event.target.playVideo(); updatePlayerUI(); }

function onPlayerStateChange(event) {
    const playBtn = document.getElementById('playPauseBtn');
    if (event.data === YT.PlayerState.PLAYING) { if (playBtn) playBtn.textContent = '⏸️'; }
    else if (event.data === YT.PlayerState.PAUSED) { if (playBtn) playBtn.textContent = '▶️'; }
    else if (event.data === YT.PlayerState.ENDED) { handleVideoComplete(); }
}

function updatePlayerUI() {
    if (!ytPlayer || !ytPlayer.getDuration) return;
    const dur = ytPlayer.getDuration() || 0;
    const cur = ytPlayer.getCurrentTime() || 0;
    if (dur > 0) {
        const percent = (cur / dur) * 100;
        document.getElementById('seekFill').style.width = percent + '%';
        document.getElementById('seekThumb').style.left = percent + '%';
        document.getElementById('timeDisplay').textContent = formatTime(cur) + ' / ' + formatTime(dur);
    }
}

function formatTime(sec) {
    sec = Math.floor(sec || 0);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function togglePlayPause() {
    if (!ytPlayer) return;
    const state = ytPlayer.getPlayerState();
    if (state === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
    else ytPlayer.playVideo();
}

function seekBy(seconds) {
    if (!ytPlayer) return;
    const cur = ytPlayer.getCurrentTime() || 0;
    ytPlayer.seekTo(Math.max(0, cur + seconds), true);
}

function seekTo(event) {
    if (!ytPlayer) return;
    const bar = document.getElementById('seekBar');
    const rect = bar.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percent = x / rect.width;
    const dur = ytPlayer.getDuration() || 0;
    ytPlayer.seekTo(percent * dur, true);
}

function changeVolume(value) { if (!ytPlayer) return; ytPlayer.setVolume(parseInt(value)); }
function changeSpeed(value) { if (!ytPlayer) return; ytPlayer.setPlaybackRate(parseFloat(value)); }

function toggleFrameFullscreen() {
    const box = document.getElementById('videoModalBox');
    box.classList.toggle('fullscreen-frame');
}

function handleVideoComplete() {
    if (!currentVideoId) return;
    const d = getUserData();
    if (!d.videosWatched.includes(currentVideoId)) {
        d.videosWatched.push(currentVideoId);
        addXP(10);
        checkBadges();
        saveUserData(d);
        updateProfile();
        logActivity('video_watch');
        showToast('🎉 أكملت الفيديو! +10 XP');
        playRewardSound();
        launchConfetti();
    }
    videoProgress[currentVideoId] = 100;
    saveProgress();
    renderVideos();
}

/* ============================================
   DATA
   ============================================ */
let videos = [], currentUser = null;
let videoProgress = {};
let views = {};
let ratings = {};
let userActivityChart = null;

if (localStorage.getItem('sayoda-theme') === 'light') {
    document.body.classList.add('light-mode');
}

/* ============================================
   📂 LOAD PROGRESS
   ============================================ */
function loadProgress() {
    const cached = JSON.parse(sessionStorage.getItem('sayoda_user') || '{}');
    
    const vp1 = currentUser?.video_progress;
    const vp2 = currentUser?.videoProgress;
    const vp3 = cached?.video_progress;
    const vp4 = cached?.videoProgress;
    
    if (vp1 && typeof vp1 === 'object' && Object.keys(vp1).length > 0) {
        videoProgress = {...vp1};
    } else if (vp2 && typeof vp2 === 'object' && Object.keys(vp2).length > 0) {
        videoProgress = {...vp2};
    } else if (vp3 && typeof vp3 === 'object' && Object.keys(vp3).length > 0) {
        videoProgress = {...vp3};
    } else if (vp4 && typeof vp4 === 'object' && Object.keys(vp4).length > 0) {
        videoProgress = {...vp4};
    } else {
        videoProgress = {};
    }
    
    const v = currentUser?.views || cached?.views || {};
    views = (v && typeof v === 'object') ? {...v} : {};
    
    const r = currentUser?.ratings || cached?.ratings || {};
    ratings = (r && typeof r === 'object') ? {...r} : {};
}

function saveProgress() {
    if (!currentUser || currentUser.isGuest) return;
    currentUser.video_progress = {...videoProgress};
    currentUser.videoProgress = {...videoProgress};
    currentUser.views = {...views};
    currentUser.ratings = {...ratings};
    syncUserData();
}

function showPlatform() {
    document.getElementById('app').classList.remove('hidden');

    const hour = new Date().getHours();
    let greeting = 'Learn. Build. Secure.';
    if (hour >= 5 && hour < 12) greeting = '☀️ صباح الخير، ' + (currentUser?.username || 'صديقي');
    else if (hour >= 12 && hour < 17) greeting = '🌤️ نهارك سعيد، ' + (currentUser?.username || 'صديقي');
    else if (hour >= 17 && hour < 21) greeting = '🌆 مساء الخير، ' + (currentUser?.username || 'صديقي');
    else greeting = '🌙 مساء الخير، ' + (currentUser?.username || 'صديقي');
    document.getElementById('greetingText').textContent = greeting;

    renderVideos();
    updateProfile();
    loadForum();
    renderMyActiveCodes();

    if (currentUser && currentUser.role === 'admin') {
        document.getElementById('adminBadge').style.display = 'inline';
        document.getElementById('adminLaunchButton').style.display = 'inline-flex';
        document.getElementById('adminPanelLink').style.display = 'flex';
    }

    setTimeout(async () => {
        const cloud = await fetchCloudData();
        updateLeaderboard(cloud);
    }, 600);

    if (!currentUser?.isGuest) {
        setTimeout(() => drawUserChart(), 800);
        setInterval(() => loadUserNotifications(true), 60000);
    }

    progressInterval = setInterval(() => {
        if (ytPlayer && ytPlayer.getCurrentTime && currentVideoId) {
            const dur = ytPlayer.getDuration() || 0;
            const cur = ytPlayer.getCurrentTime() || 0;
            if (dur > 0) {
                const percent = (cur / dur) * 100;
                videoProgress[currentVideoId] = Math.max(videoProgress[currentVideoId] || 0, percent);
                saveProgress();
                updatePlayerUI();
            }
        }
    }, 3000);
}

function logout() {
    sessionStorage.removeItem('sayoda_user');
    currentUser = null;
    isGuest = false;
    window.location.href = './login.html';
}

function extractID(input) {
    if (!input) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    const p = [/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/, /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/];
    for (const pp of p) { const m = input.match(pp); if (m) return m[1]; }
    const params = new URLSearchParams(input.split('?')[1] || '');
    const v = params.get('v');
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    return null;
}

/* ============================================
   🎬 RENDER VIDEOS
   ============================================ */
async function renderVideos() {
    const grid = document.getElementById('videoGrid');
    
    grid.innerHTML = Array(4).fill(0).map(() => `
        <div class="skeleton-card">
            <div class="skeleton-thumb"></div>
            <div class="skeleton-info">
                <div class="skeleton-title"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text short"></div>
            </div>
        </div>
    `).join('');
    
    try {
        const { data, error } = await sb
            .from('videos')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) throw error;
        
        videos = (data || []).map(v => ({
            id: v.id,
            title: v.title || 'بدون عنوان',
            description: v.description || '',
            category: v.category || 'Cybersecurity',
            youtube_id: v.youtube_id || v.youtube_url || '',
            thumbnail: v.thumbnail || 'sayed.png',
            locked: v.locked !== undefined ? v.locked : true
        }));
        
        if (!videos.length) {
            grid.innerHTML = '<div style="grid-column:1/-1;padding:25px;text-align:center;color:var(--text-muted);">📹 لا توجد فيديوهات.</div>';
            return;
        }
        const isGuest = currentUser?.isGuest || false;
        let visibleCount = 0;
        grid.innerHTML = videos.map((v, i) => {
            const title = sanitizeHTML(v?.title || `فيديو ${i+1}`);
            const desc = sanitizeHTML(v?.description || '');
            const cat = sanitizeHTML(v?.category || 'Cybersecurity');
            const raw = v?.youtube_id || '';
            const id = extractID(raw) || raw;
            const thumb = sanitizeHTML(v?.thumbnail || 'sayed.png');
            const progress = videoProgress[id] || 0;
            const viewsCount = views[id] || 0;
            const rating = ratings[id] || 0;
            const badge = progress > 0 ? `<span class="progress-badge">${Math.round(progress)}%</span>` : '';
            const watched = videoProgress[id] >= 100 ? '✅' : '';
            const resumeBadge = (progress > 0 && progress < 100) ? `<div class="resume-badge">⏯️ متابعة من ${Math.round(progress)}%</div>` : '';

            if (isGuest && v.locked !== false) return `<div class="video-card guest-hidden"></div>`;
            visibleCount++;

            let isLocked = false;

            if (currentUser && currentUser.role === 'admin') {
                isLocked = false;
            } else if (currentUser && currentUser.unlocked_videos) {
                const unlocked = currentUser.unlocked_videos;
                const unlockedIds = [];
                
                Object.keys(unlocked).forEach(key => {
                    const data = unlocked[key];
                    if (data && data.videos && Array.isArray(data.videos)) {
                        if (data.expires_at) {
                            const exp = new Date(data.expires_at);
                            if (exp > new Date()) {
                                data.videos.forEach(id => unlockedIds.push(String(id)));
                            }
                        } else {
                            data.videos.forEach(id => unlockedIds.push(String(id)));
                        }
                    }
                });
                
                if (unlockedIds.includes(String(v.id))) {
                    isLocked = false;
                } else {
                    if (currentUser.videos_locked !== undefined) {
                        isLocked = currentUser.videos_locked;
                    } else {
                        isLocked = true;
                    }
                    if (!isLocked) {
                        isLocked = i > 0 && (videoProgress[extractID(videos[i-1]?.youtube_id) || ''] || 0) < 30;
                    }
                }
            } else if (currentUser && currentUser.videos_locked !== undefined) {
                isLocked = currentUser.videos_locked;
                if (!isLocked) {
                    isLocked = i > 0 && (videoProgress[extractID(videos[i-1]?.youtube_id) || ''] || 0) < 30;
                }
            } else {
                isLocked = true;
            }

            return `<div class="video-card ${isLocked ? 'locked' : ''}">
                <div class="thumbnail">
                    ${resumeBadge}
                    <img src="${thumb}" alt="${title}" loading="lazy" onerror="this.src='sayed.png'">
                    <div class="play-overlay" data-id="${id}" data-title="${title}" data-index="${i}" onclick="playCard(this)">
                        <div class="play-btn">${isLocked ? '🔒' : '▶'}</div>
                    </div>
                </div>
                <div class="video-info">
                    <h3>${title} ${badge} ${watched}</h3>
                    <p>${desc || 'لا يوجد وصف.'} ${isLocked ? '<br><small style="color:#ff6678;font-size:10px;">🔒 مقفل</small>' : ''}</p>
                    <div class="meta">
                        <span>${cat}</span>
                        <span class="meta-views">👁️ ${viewsCount} مشاهدة</span>
                    </div>
                    <div class="stars" data-id="${id}">${[1,2,3,4,5].map(s => `<span class="star ${s <= rating ? 'active' : ''}" onclick="rateVideo('${id}', ${s})">★</span>`).join('')}</div>
                    <div class="progress-bar"><div class="fill" style="width:${progress}%;"></div></div>
                </div>
            </div>`;
        }).join('');

        if (isGuest && visibleCount === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1;padding:40px 20px;text-align:center;background:var(--card-bg);border-radius:14px;">
                <span style="font-size:48px;display:block;margin-bottom:10px;">🔒</span>
                <h3 style="color:var(--text-secondary);">المحتوى مقفل للضيوف</h3>
                <a href="login.html" style="display:inline-block;margin-top:12px;padding:10px 24px;border-radius:30px;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;font-weight:bold;text-decoration:none;">📝 إنشاء حساب</a>
            </div>`;
        }
    } catch (err) {
        console.error('❌ Error loading videos:', err);
        grid.innerHTML = '<div style="grid-column:1/-1;padding:25px;text-align:center;color:var(--text-muted);">⚠️ تعذر تحميل الفيديوهات.</div>';
    }
}

function rateVideo(id, rating) {
    if (!checkGuestPermission('التقييم')) return;
    if (isBanned('rating')) { showToast('🚫 أنت محظور من التقييم', '🚫'); return; }
    ratings[id] = rating;
    const d = getUserData();
    d.totalRating = (d.totalRating || 0) + rating;
    d.ratingCount = (d.ratingCount || 0) + 1;
    saveUserData(d); updateProfile(); renderVideos();
    showToast(`⭐ تم التقييم بـ ${rating} نجوم`);
}

function playCard(el) {
    const id = el?.dataset?.id || '';
    const title = el?.dataset?.title || 'SAYODA';
    const index = parseInt(el?.dataset?.index || 0);
    if (!id) return;

    if (currentUser && currentUser.videos_locked && currentUser.role !== 'admin') { 
        const unlocked = currentUser.unlocked_videos || {};
        let hasAccess = false;
        Object.keys(unlocked).forEach(key => {
            const data = unlocked[key];
            if (data && data.videos && Array.isArray(data.videos)) {
                if (data.expires_at) {
                    const exp = new Date(data.expires_at);
                    if (exp > new Date() && data.videos.some(v => String(v) === String(videos[index]?.id))) {
                        hasAccess = true;
                    }
                }
            }
        });
        
        if (!hasAccess) { showRequestModal(); return; }
    }

    if (index > 0) {
        const prevVideo = videos[index - 1];
        const prevId = extractID(prevVideo?.youtube_id) || '';
        if ((videoProgress[prevId] || 0) < 30) {
            const unlocked = currentUser?.unlocked_videos || {};
            let prevUnlocked = false;
            Object.keys(unlocked).forEach(key => {
                const data = unlocked[key];
                if (data && data.videos && Array.isArray(data.videos)) {
                    if (data.expires_at && new Date(data.expires_at) > new Date() && data.videos.some(v => String(v) === String(prevVideo?.id))) {
                        prevUnlocked = true;
                    }
                }
            });
            
            if (!prevUnlocked && currentUser?.role !== 'admin') {
                showToast('🔒 يجب مشاهدة 30% من الفيديو السابق أولاً.', '🔒');
                return;
            }
        }
    }
    openVideo(id, title);
}

function openVideo(id, title) {
    const vid = String(id || '').trim();
    if (!vid) return;
    currentVideoId = vid;
    views[vid] = (views[vid] || 0) + 1;
    document.getElementById('videoTitle').textContent = sanitizeHTML(title) || 'SAYODA';

    const phone = currentUser?.phone || '01041254010';
    document.getElementById('videoPhone').textContent = phone;

    document.getElementById('videoModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    renderComments(vid);

    if (ytReady) createYTPlayer(vid);
    else setTimeout(() => createYTPlayer(vid), 1000);

    logActivity('video_open');
}

function closeVideo() {
    if (ytPlayer && ytPlayer.stopVideo) { try { ytPlayer.stopVideo(); } catch(e){} }
    ytPlayer = null;
    document.getElementById('ytPlayerDiv').innerHTML = '';
    document.getElementById('videoModal').style.display = 'none';
    document.body.style.overflow = '';
    currentVideoId = null;
    saveProgress();
    renderVideos();
}

/* ============================================
   📊 CHART
   ============================================ */
async function drawUserChart() {
    if (!currentUser || currentUser.isGuest) return;
    const canvas = document.getElementById('userActivityChart');
    if (!canvas) return;

    const activityData = await getUserActivity(currentUser.username, 7);

    const labels = [];
    const dataMap = {};
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('ar-EG', { weekday: 'short' }));
        dataMap[key] = 0;
    }

    activityData.forEach(a => {
        if (dataMap[a.activity_date] !== undefined) dataMap[a.activity_date] += a.count;
    });

    const data = Object.values(dataMap);

    if (userActivityChart) userActivityChart.destroy();

    userActivityChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'عدد الأنشطة',
                data: data,
                borderColor: '#19aaff',
                backgroundColor: 'rgba(25,170,255,0.15)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#19aaff',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#60788c', stepSize: 1 }, grid: { color: 'rgba(25,170,255,0.08)' } },
                x: { ticks: { color: '#60788c' }, grid: { display: false } }
            }
        }
    });
}

/* ============================================
   💬 FORUM
   ============================================ */
let currentTopicId = null;

async function loadForum() {
    const container = document.getElementById('forumContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="forum-header">
            <button class="forum-new-btn" onclick="showNewTopicForm()">➕ موضوع جديد</button>
            <input type="text" class="forum-search" id="forumSearch" placeholder="🔍 بحث في المواضيع..." oninput="filterTopics(this.value)">
        </div>
        <div id="forumContent"></div>
    `;

    await loadTopics();
}

async function loadTopics(searchTerm = '') {
    const content = document.getElementById('forumContent');
    if (!content) return;
    content.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;">⏳ جاري التحميل...</div>';

    try {
        let query = sb.from('forum_topics').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(50);
        const { data: topics, error } = await query;
        if (error) throw error;

        let filtered = topics || [];
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(t => t.title.toLowerCase().includes(term) || t.body.toLowerCase().includes(term));
        }

        if (!filtered.length) {
            content.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:30px;font-size:14px;">📭 لا توجد مواضيع بعد. كن أول من ينشر!</div>';
            return;
        }

        content.innerHTML = filtered.map(t => {
            const time = new Date(t.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
            return `<div class="topic-card" onclick="openTopic('${t.id}')">
                <div class="topic-head">
                    <div class="topic-avatar">${t.author.charAt(0).toUpperCase()}</div>
                    <span class="topic-author">${sanitizeHTML(t.author)}</span>
                    <span class="topic-time">${time}</span>
                    ${t.pinned ? '<span style="background:var(--gold);color:#1a1a2e;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:bold;">📌 مثبت</span>' : ''}
                    ${t.closed ? '<span style="background:#ff334455;color:#ff6678;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:bold;">🔒 مغلق</span>' : ''}
                </div>
                <div class="topic-title">${sanitizeHTML(t.title)}</div>
                <div class="topic-body">${sanitizeHTML(t.body)}</div>
                <div class="topic-foot">
                    <span>❤️ ${t.likes || 0}</span>
                    <span>💬 ${t.replies_count || 0} رد</span>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        content.innerHTML = '<div style="text-align:center;color:#ff6678;padding:20px;">⚠️ تعذر تحميل المواضيع</div>';
    }
}

function filterTopics(term) { loadTopics(term); }

function showNewTopicForm() {
    if (!checkGuestPermission('النشر')) return;
    if (isBanned('forum')) { showToast('🚫 أنت محظور من المنتدي', '🚫'); return; }
    const content = document.getElementById('forumContent');
    content.innerHTML = `
        <button class="forum-back" onclick="loadForum()">← رجوع</button>
        <div class="forum-form">
            <h3>📝 موضوع جديد</h3>
            <input type="text" class="forum-input" id="newTopicTitle" placeholder="عنوان الموضوع" maxlength="150">
            <textarea class="forum-textarea" id="newTopicBody" placeholder="اكتب محتوى الموضوع..." maxlength="3000"></textarea>
            <button class="forum-submit" onclick="submitNewTopic()">🚀 نشر الموضوع</button>
        </div>
    `;
}

async function submitNewTopic() {
    if (isBanned('forum')) { showToast('🚫 أنت محظور من المنتدي', '🚫'); return; }
    const title = document.getElementById('newTopicTitle').value.trim();
    const body = document.getElementById('newTopicBody').value.trim();
    if (!title || !body) { showToast('⚠️ اكتب العنوان والمحتوى', '⚠️'); return; }

    const { error } = await sb.from('forum_topics').insert({
        title: sanitizeHTML(title),
        body: sanitizeHTML(body),
        author: currentUser.username
    });

    if (error) { showToast('❌ حدث خطأ', '❌'); return; }
    showToast('✅ تم نشر الموضوع!');
    playRewardSound();
    logActivity('forum_post');
    loadForum();
}

async function openTopic(topicId) {
    currentTopicId = topicId;
    const content = document.getElementById('forumContent');
    content.innerHTML = '<div style="text-align:center;padding:20px;">⏳</div>';

    try {
        const { data: topic } = await sb.from('forum_topics').select('*').eq('id', topicId).single();
        const { data: replies } = await sb.from('forum_replies').select('*').eq('topic_id', topicId).order('created_at', { ascending: true });

        const time = new Date(topic.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });

        let html = `
            <button class="forum-back" onclick="loadForum()">← رجوع للمنتدي</button>
            <div class="topic-detail">
                <div class="topic-head">
                    <div class="topic-avatar">${topic.author.charAt(0).toUpperCase()}</div>
                    <span class="topic-author">${sanitizeHTML(topic.author)}</span>
                    <span class="topic-time">${time}</span>
                </div>
                <div class="topic-detail-title">${sanitizeHTML(topic.title)}</div>
                <div class="topic-detail-body">${sanitizeHTML(topic.body)}</div>
                <div class="topic-foot" style="margin-top:14px;">
                    <span>❤️ ${topic.likes || 0} إعجاب</span>
                    <span>💬 ${replies?.length || 0} رد</span>
                    ${topic.closed ? '<span style="color:#ff6678;">🔒 مغلق</span>' : ''}
                </div>
            </div>
            <div style="margin-top:14px;">
                <h3 style="color:var(--accent);font-size:14px;margin-bottom:10px;">💬 الردود (${replies?.length || 0})</h3>
                <div id="repliesList">
        `;

        if (!replies || replies.length === 0) {
            html += '<div style="text-align:center;color:var(--text-muted);padding:14px;font-size:12px;">لا توجد ردود بعد</div>';
        } else {
            html += replies.map(r => {
                const rTime = new Date(r.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
                return `<div class="reply-card">
                    <div class="topic-head">
                        <div class="topic-avatar">${r.author.charAt(0).toUpperCase()}</div>
                        <span class="reply-author">${sanitizeHTML(r.author)}</span>
                        <span class="topic-time">${rTime}</span>
                    </div>
                    <div class="reply-body">${sanitizeHTML(r.body)}</div>
                </div>`;
            }).join('');
        }

        html += `</div></div>`;

        if (!currentUser?.isGuest && !topic.closed) {
            if (isBanned('forum')) {
                html += `<div style="text-align:center;color:#ff6678;padding:14px;font-size:13px;">🚫 أنت محظور من الرد علي المنتدي</div>`;
            } else {
                html += `
                    <div class="forum-form" style="margin-top:14px;">
                        <h3>💬 إضافة رد</h3>
                        <textarea class="forum-textarea" id="replyBody" placeholder="اكتب ردك..." maxlength="2000"></textarea>
                        <button class="forum-submit" onclick="submitReply()">📤 إرسال الرد</button>
                    </div>
                `;
            }
        }

        content.innerHTML = html;
    } catch (e) {
        content.innerHTML = '<div style="color:#ff6678;padding:20px;">⚠️ حدث خطأ</div>';
    }
}

async function submitReply() {
    if (!checkGuestPermission('الرد')) return;
    if (isBanned('forum')) { showToast('🚫 أنت محظور من المنتدي', '🚫'); return; }
    const body = document.getElementById('replyBody').value.trim();
    if (!body) { showToast('⚠️ اكتب الرد', '⚠️'); return; }

    const { error } = await sb.from('forum_replies').insert({
        topic_id: currentTopicId,
        body: sanitizeHTML(body),
        author: currentUser.username
    });

    if (error) { showToast('❌ حدث خطأ', '❌'); return; }
    showToast('✅ تم إضافة الرد!');
    logActivity('forum_reply');
    openTopic(currentTopicId);
}

/* ============================================
   🔔 TOAST
   ============================================ */
function showToast(msg, icon = '✅') {
    const t = document.getElementById('toast');
    const messageEl = document.getElementById('toastMessage');
    const iconEl = document.getElementById('toastIcon');
    if (!t) return;
    if (iconEl) iconEl.textContent = icon;
    messageEl.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ============================================
   🎨 THEME
   ============================================ */
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    const icon = isLight ? '🌞' : '🌙';
    document.querySelectorAll('.theme-toggle, .header-theme-btn').forEach(b => b.textContent = icon);
    localStorage.setItem('sayoda-theme', isLight ? 'light' : 'dark');
}

/* ============================================
   ☰ SIDEBAR
   ============================================ */
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
    document.body.style.overflow = document.getElementById('sidebar').classList.contains('open') ? 'hidden' : '';
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

/* ============================================
   🔒 REQUEST MODAL
   ============================================ */
function showRequestModal() {
    document.getElementById('requestModal').classList.add('show');
    const waBtn = document.getElementById('requestWaBtn');
    if (currentUser) {
        const phone = currentUser.phone || 'غير مسجل';
        const username = currentUser.username || 'مستخدم';
        waBtn.href = `https://wa.me/201070339419?text=📚%20طلب%20فتح%20المحاضرات%0A👤%20${encodeURIComponent(username)}%0A📱%20${encodeURIComponent(phone)}`;
    }
}
function closeRequestModal() {
    document.getElementById('requestModal').classList.remove('show');
}

/* ============================================
   ⬆️ SCROLL
   ============================================ */
window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    document.getElementById('topProgressBar').style.width = percent + '%';

    const backBtn = document.getElementById('backToTop');
    if (scrollTop > 400) backBtn.classList.add('show');
    else backBtn.classList.remove('show');
});

/* ============================================
   ⌨️ KEYBOARD
   ============================================ */
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeVideo(); closeNotificationsModal(); }
    if (e.code === 'Space' && document.getElementById('videoModal').style.display === 'flex') {
        e.preventDefault(); togglePlayPause();
    }
    const modalOpen = document.getElementById('videoModal')?.style.display === 'flex';
    if (modalOpen) {
        if (e.ctrlKey && ['c','C','u','U','s','S','a','A'].includes(e.key)) {
            e.preventDefault();
            showToast('🚫 غير مسموح بنسخ المحتوى', '🚫');
            return false;
        }
    }
});

/* ============================================
   🔐 CHECK SESSION
   ============================================ */
(async function checkSession() {
    const savedUser = sessionStorage.getItem('sayoda_user');
    if (!savedUser) {
        window.location.href = './login.html';
        return;
    }
    try {
        const user = JSON.parse(savedUser);

        if (user.role === 'guest' || user.isGuest) {
            currentUser = { username: 'ضيف', role: 'guest', active: true, videos_locked: false, isGuest: true };
            isGuest = true;
            document.getElementById('app').classList.remove('hidden');
            document.getElementById('guestBanner').style.display = 'flex';
            document.getElementById('guestBadge').style.display = 'inline';
            loadProgress();
            showPlatform();
        } else {
            const { data: userData, error } = await sb
                .from('users')
                .select('*')
                .eq('username', user.username)
                .maybeSingle();

            if (error || !userData) {
                sessionStorage.removeItem('sayoda_user');
                window.location.href = './login.html';
                return;
            }
            if (userData.active === false) {
                sessionStorage.removeItem('sayoda_user');
                window.location.href = './login.html';
                return;
            }

            const cached = JSON.parse(sessionStorage.getItem('sayoda_user') || '{}');

            currentUser = { 
                username: user.username, 
                ...userData,
                xp: (userData.xp !== null && userData.xp !== undefined) ? Number(userData.xp) : Number(cached.xp || 0),
                level: userData.level || cached.level || 'مبتدئ',
                level_emoji: userData.level_emoji || cached.level_emoji || '🟢',
                streak: (userData.streak !== null && userData.streak !== undefined) ? Number(userData.streak) : Number(cached.streak || 0),
                badges: (Array.isArray(userData.badges) && userData.badges.length > 0) ? userData.badges : (Array.isArray(cached.badges) ? cached.badges : []),
                videos_watched: (Array.isArray(userData.videos_watched) && userData.videos_watched.length > 0) ? userData.videos_watched : (Array.isArray(cached.videos_watched) ? cached.videos_watched : []),
                total_rating: (userData.total_rating !== null && userData.total_rating !== undefined) ? Number(userData.total_rating) : Number(cached.total_rating || 0),
                rating_count: (userData.rating_count !== null && userData.rating_count !== undefined) ? Number(userData.rating_count) : Number(cached.rating_count || 0),
                videos_locked: (userData.videos_locked !== null && userData.videos_locked !== undefined) ? userData.videos_locked : (cached.videos_locked !== undefined ? cached.videos_locked : true),
                banned_features: userData.banned_features || cached.banned_features || [],
                views: (userData.views && Object.keys(userData.views).length > 0) ? userData.views : (cached.views || {}),
                ratings: (userData.ratings && Object.keys(userData.ratings).length > 0) ? userData.ratings : (cached.ratings || {}),
                video_progress: (userData.video_progress && Object.keys(userData.video_progress).length > 0) ? userData.video_progress : (cached.video_progress || {}),
                unlocked_videos: userData.unlocked_videos || cached.unlocked_videos || {}
            };

            isGuest = false;

            currentUser.userData = {
                xp: currentUser.xp,
                level: currentUser.level,
                levelEmoji: currentUser.level_emoji,
                streak: currentUser.streak,
                lastVisit: userData.last_visit || cached.last_visit || null,
                videosWatched: currentUser.videos_watched,
                badges: currentUser.badges,
                totalRating: currentUser.total_rating,
                ratingCount: currentUser.rating_count
            };

            try {
                const updatedSession = {
                    ...cached,
                    username: currentUser.username,
                    role: currentUser.role,
                    active: currentUser.active,
                    phone: currentUser.phone,
                    xp: currentUser.xp,
                    level: currentUser.level,
                    level_emoji: currentUser.level_emoji,
                    streak: currentUser.streak,
                    badges: currentUser.badges,
                    videos_watched: currentUser.videos_watched,
                    total_rating: currentUser.total_rating,
                    rating_count: currentUser.rating_count,
                    videos_locked: currentUser.videos_locked,
                    banned_features: currentUser.banned_features,
                    views: currentUser.views,
                    ratings: currentUser.ratings,
                    video_progress: currentUser.video_progress,
                    unlocked_videos: currentUser.unlocked_videos
                };
                sessionStorage.setItem('sayoda_user', JSON.stringify(updatedSession));
            } catch(e) {
                console.error('sessionStorage update failed:', e);
            }

            document.getElementById('app').classList.remove('hidden');
            document.getElementById('guestBadge').style.display = 'none';
            loadProgress();
            showPlatform();
            updateStreak();
            logActivity('login');
        }
    } catch (e) {
        sessionStorage.removeItem('sayoda_user');
        window.location.href = './login.html';
    }
})();

console.log('🛡️ SAYODA | CYBER FORCE - Loaded ✅');