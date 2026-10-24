// =============================================
// JOBS PAGE JAVASCRIPT - WITH FIRESTORE
// =============================================

// =============================================
// GLOBAL STATE
// =============================================
let currentUserData = null;
let currentCommunity = 'kwamankese';
let allJobs = [];
let filteredJobs = [];
let currentCategory = 'all';
let currentSort = 'newest';
let currentUser = null;

// =============================================
// NAVIGATION CONFIGURATION
// =============================================
const NAV_PAGES = {
    'home': '../pages/home.html',
    'explore': '../pages/explore.html',
    'jobs': '../pages/jobs.html',
    'messages': '../pages/community.html',
    'profile': '../pages/profile.html',
    'post': '../pages/create-post.html'
};

// =============================================
// CATEGORIES WITH ICONS AND COLORS
// =============================================
const CATEGORIES = [
    { id: 'all', icon: 'fa-th-large', label: 'All Jobs', color: 'bg-primary text-white' },
    { id: 'full-time', icon: 'fa-clock', label: 'Full-time', color: 'bg-blue-500 text-white' },
    { id: 'part-time', icon: 'fa-hourglass-half', label: 'Part-time', color: 'bg-orange-500 text-white' },
    { id: 'contract', icon: 'fa-file-contract', label: 'Contract', color: 'bg-purple-500 text-white' },
    { id: 'remote', icon: 'fa-house-signal', label: 'Remote', color: 'bg-green-500 text-white' },
    { id: 'internship', icon: 'fa-graduation-cap', label: 'Internship', color: 'bg-yellow-500 text-white' }
];

// =============================================
// HELPER FUNCTIONS
// =============================================

function formatCurrency(amount) {
    return `GH₵ ${(amount || 0).toFixed(2)}`;
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function timeAgo(timestamp) {
    if (!timestamp) return 'Recently';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const seconds = Math.floor((new Date() - date) / 1000);
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
            }
        }
        return 'Just now';
    } catch (e) {
        return 'Recently';
    }
}

function getJobTypeLabel(type) {
    const labels = {
        'full-time': 'Full-time',
        'part-time': 'Part-time',
        'contract': 'Contract',
        'remote': 'Remote',
        'internship': 'Internship'
    };
    return labels[type] || type || 'Full-time';
}

function getJobTypeColor(type) {
    const colors = {
        'full-time': 'bg-blue-100 text-blue-700',
        'part-time': 'bg-orange-100 text-orange-700',
        'contract': 'bg-purple-100 text-purple-700',
        'remote': 'bg-green-100 text-green-700',
        'internship': 'bg-yellow-100 text-yellow-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
}

// =============================================
// NAVIGATION FUNCTIONS - FIXED
// =============================================

function navigateTo(page) {
    const currentPath = window.location.pathname;
    const isInPages = currentPath.includes('/pages/');
    
    let targetUrl = NAV_PAGES[page];
    if (!targetUrl) {
        console.warn('Unknown page:', page);
        return;
    }
    
    if (isInPages) {
        targetUrl = targetUrl.replace('../pages/', './');
    }
    
    window.location.href = targetUrl;
}

function setupNavItemListeners() {
    const navItems = document.querySelectorAll('.nav-item');
    const fabButton = document.querySelector('.fab-button');
    
    // FIRST: Remove any existing active classes from ALL nav items
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Determine which page we're on
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'jobs.html';
    const isJobsPage = currentPage === 'jobs.html';
    
    navItems.forEach(item => {
        const label = item.querySelector('.nav-label')?.textContent?.toLowerCase() || '';
        const icon = item.querySelector('.nav-icon');
        let page = null;
        
        if (label === 'home' || (icon && icon.classList.contains('fa-house'))) {
            page = 'home';
        } else if (label === 'explore' || (icon && icon.classList.contains('fa-magnifying-glass'))) {
            page = 'explore';
        } else if (label === 'messages' || (icon && icon.classList.contains('fa-comment-dots'))) {
            page = 'messages';
        } else if (label === 'profile' || (icon && icon.classList.contains('fa-user'))) {
            page = 'profile';
        }
        
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        // Set active state based on current page
        if (isJobsPage && page === 'explore') {
            newItem.classList.add('active');
        } else if (!isJobsPage && page === 'home' && currentPage === 'home.html') {
            newItem.classList.add('active');
        } else if (page === 'messages' && currentPage === 'community.html') {
            newItem.classList.add('active');
        } else if (page === 'profile' && currentPage === 'profile.html') {
            newItem.classList.add('active');
        }
        
        newItem.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetPage = page === 'home' ? 'home.html' : page + '.html';
            const currentPageName = window.location.pathname.split('/').pop() || 'home.html';
            
            if (currentPageName === targetPage) {
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                this.classList.add('active');
                return;
            }
            
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            
            if (page) {
                navigateTo(page);
            }
        });
    });
    
    if (fabButton) {
        const newFab = fabButton.cloneNode(true);
        fabButton.parentNode.replaceChild(newFab, fabButton);
        
        newFab.addEventListener('click', function(e) {
            e.preventDefault();
            showToast('Opening create post...', 'info');
            window.location.href = '../pages/create-post.html';
        });
    }
}

// =============================================
// FIRESTORE DATA FETCHERS
// =============================================

async function loadUserData() {
    const user = auth.currentUser;
    if (!user) return null;
    currentUser = user;
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            currentUserData = { id: userDoc.id, ...userDoc.data() };
            localStorage.setItem('bridgeconnect_user', JSON.stringify({
                uid: user.uid,
                ...currentUserData
            }));
            return currentUserData;
        }
        return null;
    } catch (error) {
        console.error('Error loading user data:', error);
        return null;
    }
}

async function loadJobs(community) {
    try {
        let query = db.collection('jobs')
            .where('status', '==', 'approved')
            .orderBy('createdAt', 'desc')
            .limit(50);
        
        if (community && community !== 'all') {
            query = db.collection('jobs')
                .where('community', '==', community)
                .where('status', '==', 'approved')
                .orderBy('createdAt', 'desc')
                .limit(50);
        }
        
        const snapshot = await query.get();
        const jobs = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            jobs.push({
                id: doc.id,
                ...data
            });
        });
        
        allJobs = jobs;
        filteredJobs = jobs;
        return jobs;
    } catch (error) {
        console.warn('Error loading jobs:', error.message);
        allJobs = [];
        filteredJobs = [];
        return [];
    }
}

// =============================================
// MODAL FUNCTIONS - PROFESSIONAL POST JOB MODAL
// =============================================

function openPostJobModal() {
    // Check if user is logged in
    if (!auth.currentUser) {
        showToast('Please sign in to post a job', 'error');
        setTimeout(() => {
            window.location.href = '../login.html';
        }, 1500);
        return;
    }
    
    // Remove any existing modal
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div class="modal-overlay" id="postJobModal">
            <div class="modal-content">
                <!-- Header -->
                <div class="sticky top-0 bg-white z-10 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">Post a New Job</h3>
                        <p class="text-sm text-gray-500 mt-0.5">Fill in the details to list a job</p>
                    </div>
                    <button class="modal-close w-10 h-10 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-400 hover:text-gray-600">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
                
                <!-- Form -->
                <div class="p-6 space-y-5">
                    <div>
                        <label class="text-sm font-semibold text-gray-700">Job Title <span class="text-red-500">*</span></label>
                        <input id="jobTitle" type="text" class="w-full mt-1.5 px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" placeholder="e.g. Senior Software Engineer" />
                    </div>
                    
                    <div>
                        <label class="text-sm font-semibold text-gray-700">Company Name <span class="text-red-500">*</span></label>
                        <input id="jobCompany" type="text" class="w-full mt-1.5 px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" placeholder="e.g. Tech Solutions Ltd" />
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-sm font-semibold text-gray-700">Job Type <span class="text-red-500">*</span></label>
                            <select id="jobType" class="w-full mt-1.5 px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none bg-white">
                                <option value="full-time">Full-time</option>
                                <option value="part-time">Part-time</option>
                                <option value="contract">Contract</option>
                                <option value="remote">Remote</option>
                                <option value="internship">Internship</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-sm font-semibold text-gray-700">Salary (GH₵)</label>
                            <input id="jobSalary" type="number" class="w-full mt-1.5 px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" placeholder="e.g. 5000" />
                        </div>
                    </div>
                    
                    <div>
                        <label class="text-sm font-semibold text-gray-700">Location <span class="text-red-500">*</span></label>
                        <select id="jobLocation" class="w-full mt-1.5 px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none bg-white">
                            <option value="kwamankese">Kwamankese</option>
                            <option value="abura">Abura</option>
                            <option value="asebu">Asebu</option>
                            <option value="cape_coast">Cape Coast</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="text-sm font-semibold text-gray-700">Job Description <span class="text-red-500">*</span></label>
                        <textarea id="jobDescription" rows="4" class="w-full mt-1.5 px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none" placeholder="Describe the job role, responsibilities, and requirements..."></textarea>
                    </div>
                    
                    <div>
                        <label class="text-sm font-semibold text-gray-700">Required Skills</label>
                        <input id="jobSkills" type="text" class="w-full mt-1.5 px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" placeholder="e.g. JavaScript, React, Node.js (comma separated)" />
                    </div>
                    
                    <div class="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <i class="fa-regular fa-circle-check text-primary text-xl"></i>
                        <div>
                            <p class="text-sm font-semibold text-gray-700">Featured Job</p>
                            <p class="text-xs text-gray-500">Highlight this job to attract more applicants</p>
                        </div>
                        <label class="toggle-switch ml-auto">
                            <input type="checkbox" id="jobFeatured" />
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="sticky bottom-0 bg-white z-10 px-6 py-4 border-t border-gray-100 flex gap-3">
                    <button class="modal-close flex-1 px-4 py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button id="submitJobBtn" class="flex-1 px-4 py-3 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                        <i class="fa-solid fa-paper-plane"></i> Post Job
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const container = document.getElementById('modalContainer');
    if (!container) return;
    
    container.innerHTML = modalHTML;
    
    const modal = document.getElementById('postJobModal');
    const closeBtns = modal.querySelectorAll('.modal-close');
    
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modalEl = document.getElementById('postJobModal');
            if (modalEl) {
                modalEl.remove();
                document.body.style.overflow = '';
            }
        }
    });
    
    // Submit handler
    document.getElementById('submitJobBtn').addEventListener('click', async function() {
        const title = document.getElementById('jobTitle').value.trim();
        const company = document.getElementById('jobCompany').value.trim();
        const type = document.getElementById('jobType').value;
        const salary = parseFloat(document.getElementById('jobSalary').value) || 0;
        const location = document.getElementById('jobLocation').value;
        const description = document.getElementById('jobDescription').value.trim();
        const skills = document.getElementById('jobSkills').value.split(',').map(s => s.trim()).filter(s => s);
        const featured = document.getElementById('jobFeatured').checked;
        
        // Validation
        if (!title) {
            showToast('Please enter a job title', 'error');
            document.getElementById('jobTitle').focus();
            document.getElementById('jobTitle').classList.add('border-red-500');
            return;
        }
        if (!company) {
            showToast('Please enter a company name', 'error');
            document.getElementById('jobCompany').focus();
            document.getElementById('jobCompany').classList.add('border-red-500');
            return;
        }
        if (!description) {
            showToast('Please enter a job description', 'error');
            document.getElementById('jobDescription').focus();
            document.getElementById('jobDescription').classList.add('border-red-500');
            return;
        }
        
        // Remove error states
        document.querySelectorAll('.border-red-500').forEach(el => el.classList.remove('border-red-500'));
        
        // Show loading state
        this.disabled = true;
        this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Posting...';
        
        try {
            const jobData = {
                title,
                company,
                type,
                salary,
                community: location,
                description,
                skills,
                featured,
                status: 'approved',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                postedBy: auth.currentUser?.uid || 'anonymous',
                postedByName: currentUserData?.fullName || currentUserData?.name || 'Anonymous'
            };
            
            await db.collection('jobs').add(jobData);
            
            showToast('Job posted successfully! 🎉', 'success');
            modal.remove();
            document.body.style.overflow = '';
            
            // Refresh jobs
            await refreshAllData(currentCommunity);
            
        } catch (error) {
            console.error('Error posting job:', error);
            showToast('Failed to post job: ' + error.message, 'error');
            this.disabled = false;
            this.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Post Job';
        }
    });
    
    document.body.style.overflow = 'hidden';
}

// =============================================
// RENDER FUNCTIONS
// =============================================

function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    container.innerHTML = CATEGORIES.map(cat => {
        const isActive = currentCategory === cat.id;
        return `
            <button class="category-pill px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border-2 flex items-center gap-2 touch-manipulation ${isActive ? cat.color + ' border-transparent shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}" data-category="${cat.id}">
                <i class="fa-solid ${cat.icon} text-xs"></i>
                ${cat.label}
                ${isActive ? `<span class="ml-1 bg-white/20 rounded-full px-2 py-0.5 text-[10px]">Active</span>` : ''}
            </button>
        `;
    }).join('');
    
    // Add click listeners
    container.querySelectorAll('.category-pill').forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.dataset.category;
            filterByCategory(category);
        });
    });
}

function renderFeaturedJobs(jobs) {
    const container = document.getElementById('featuredJobs');
    if (!container) return;
    
    // Get featured jobs (first 3 or those marked as featured)
    const featured = jobs.filter(j => j.featured === true).slice(0, 3);
    const displayJobs = featured.length > 0 ? featured : jobs.slice(0, 3);
    
    if (displayJobs.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <i class="fa-solid fa-briefcase text-3xl block mb-2 opacity-30"></i>
                <p class="text-sm">No featured jobs available</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = displayJobs.map(job => {
        const logo = job.companyLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company || 'Company')}&background=003f87&color=fff&size=100`;
        const company = job.company || 'Company';
        const title = job.title || 'Position';
        const location = job.community || job.district || 'N/A';
        const salary = job.salary ? formatCurrency(job.salary) : 'Salary not specified';
        const type = job.type || 'full-time';
        const typeColor = getJobTypeColor(type);
        const typeLabel = getJobTypeLabel(type);
        
        return `
            <div class="featured-job featured-gradient border border-gray-200 p-5 rounded-2xl shadow-sm flex flex-col items-center text-center group hover:border-primary hover:shadow-lg transition-all duration-300 cursor-pointer" onclick="window.location.href='job-detail.html?id=${job.id}'">
                <span class="self-start px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[10px] font-bold uppercase mb-3 flex items-center gap-1">
                    <i class="fa-solid fa-star text-xs"></i> Featured
                </span>
                <div class="w-14 h-14 rounded-full bg-white flex items-center justify-center p-2 border border-gray-200 mb-3 group-hover:scale-110 transition-transform">
                    <img class="w-full object-contain" src="${logo}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(company)}&background=003f87&color=fff&size=100'"/>
                </div>
                <h3 class="text-base font-bold mb-0.5 line-clamp-1">${title}</h3>
                <p class="text-xs text-gray-500 mb-2">${company}</p>
                <div class="flex items-center gap-1 text-gray-500 text-xs mb-2">
                    <i class="fa-solid fa-location-dot text-primary text-[10px]"></i> ${location}
                </div>
                <p class="text-secondary font-bold text-sm">${salary}</p>
            </div>
        `;
    }).join('');
}

function renderJobs(jobs) {
    const container = document.getElementById('jobsList');
    if (!container) return;
    
    if (!jobs || jobs.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                <i class="fa-solid fa-briefcase text-4xl block mb-3 opacity-30"></i>
                <p class="text-lg font-medium">No jobs found</p>
                <p class="text-sm mt-1">Try adjusting your filters or check back later</p>
                <button onclick="openPostJobModal()" class="mt-4 bg-primary text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                    <i class="fa-solid fa-plus mr-2"></i>Post a Job
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = jobs.map(job => {
        const logo = job.companyLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company || 'Company')}&background=003f87&color=fff&size=100`;
        const company = job.company || 'Company';
        const title = job.title || 'Position';
        const location = job.community || job.district || 'N/A';
        const salary = job.salary ? formatCurrency(job.salary) : 'Salary not specified';
        const type = job.type || 'full-time';
        const typeColor = getJobTypeColor(type);
        const typeLabel = getJobTypeLabel(type);
        const postedTime = job.createdAt ? timeAgo(job.createdAt) : 'Recently';
        const isVerified = job.verified !== false;
        
        return `
            <div class="job-card bg-white border border-gray-200 p-4 rounded-2xl hover:shadow-md transition-shadow cursor-pointer" onclick="window.location.href='job-detail.html?id=${job.id}'">
                <div class="flex flex-col md:flex-row gap-4">
                    <div class="flex-shrink-0 flex items-center md:items-start">
                        <div class="w-14 h-14 rounded-xl border border-gray-200 flex items-center justify-center p-2 bg-white">
                            <img class="w-full object-contain" src="${logo}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(company)}&background=003f87&color=fff&size=100'"/>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <h3 class="text-base font-bold text-gray-900 line-clamp-1">${title}</h3>
                            ${isVerified ? `<i class="fa-solid fa-check-circle text-primary text-sm flex-shrink-0"></i>` : ''}
                        </div>
                        <p class="text-sm text-gray-500">${company}</p>
                        <div class="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-1">
                            <span class="flex items-center gap-1"><i class="fa-solid fa-location-dot text-primary text-[10px]"></i> ${location}</span>
                            <span class="flex items-center gap-1"><i class="fa-regular fa-clock text-[10px]"></i> ${postedTime}</span>
                        </div>
                        <div class="flex flex-wrap gap-2 mt-2">
                            <span class="px-2.5 py-0.5 ${typeColor} rounded-lg text-[10px] font-medium">${typeLabel}</span>
                            ${job.workplace ? `<span class="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-medium">${job.workplace}</span>` : ''}
                        </div>
                    </div>
                    <div class="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 md:gap-2 min-w-[100px]">
                        <p class="text-secondary font-bold text-sm">${salary}</p>
                        <div class="flex gap-2">
                            <button class="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors save-job-btn touch-manipulation" data-id="${job.id}" onclick="event.stopPropagation(); saveJob('${job.id}')">
                                <i class="fa-regular fa-bookmark text-sm"></i>
                            </button>
                            <button class="bg-primary text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors active:scale-95 apply-job-btn touch-manipulation" data-id="${job.id}" onclick="event.stopPropagation(); applyForJob('${job.id}')">
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// =============================================
// JOB ACTIONS
// =============================================

function applyForJob(jobId) {
    const job = allJobs.find(j => j.id === jobId);
    if (!job) {
        showToast('Job not found', 'error');
        return;
    }
    
    if (!auth.currentUser) {
        showToast('Please sign in to apply for jobs', 'error');
        setTimeout(() => {
            window.location.href = '../login.html';
        }, 1500);
        return;
    }
    
    showToast(`✅ Applied to "${job.title || 'Job'}"!`, 'success');
}

function saveJob(jobId) {
    const job = allJobs.find(j => j.id === jobId);
    if (!job) {
        showToast('Job not found', 'error');
        return;
    }
    
    if (!auth.currentUser) {
        showToast('Please sign in to save jobs', 'error');
        setTimeout(() => {
            window.location.href = '../login.html';
        }, 1500);
        return;
    }
    
    showToast(`📌 Saved "${job.title || 'Job'}"!`, 'success');
}

// =============================================
// FILTER FUNCTIONS
// =============================================

function filterByCategory(categoryId) {
    currentCategory = categoryId;
    renderCategories();
    applyFilters();
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    let filtered = [...allJobs];
    
    // Category filter
    if (currentCategory !== 'all') {
        filtered = filtered.filter(job => 
            job.type?.toLowerCase() === currentCategory ||
            job.type?.toLowerCase().includes(currentCategory)
        );
    }
    
    // Search filter
    if (searchTerm) {
        filtered = filtered.filter(job => 
            job.title?.toLowerCase().includes(searchTerm) ||
            job.company?.toLowerCase().includes(searchTerm) ||
            job.description?.toLowerCase().includes(searchTerm) ||
            (job.skills && job.skills.some(skill => skill.toLowerCase().includes(searchTerm)))
        );
    }
    
    // Apply sort
    filtered = sortJobs(filtered);
    
    filteredJobs = filtered;
    renderJobs(filtered);
    renderFeaturedJobs(filtered);
}

function sortJobs(jobs) {
    switch(currentSort) {
        case 'newest':
            return [...jobs].sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA;
            });
        case 'oldest':
            return [...jobs].sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateA - dateB;
            });
        case 'salary-high':
            return [...jobs].sort((a, b) => (b.salary || 0) - (a.salary || 0));
        case 'salary-low':
            return [...jobs].sort((a, b) => (a.salary || 0) - (b.salary || 0));
        default:
            return jobs;
    }
}

// =============================================
// SORT DROPDOWN
// =============================================

function setupSortDropdown() {
    const sortLabel = document.getElementById('sortLabel');
    if (!sortLabel) return;
    
    const sortOptions = [
        { id: 'newest', label: 'Newest' },
        { id: 'oldest', label: 'Oldest' },
        { id: 'salary-high', label: 'Salary: High to Low' },
        { id: 'salary-low', label: 'Salary: Low to High' }
    ];
    
    sortLabel.addEventListener('click', function(e) {
        e.stopPropagation();
        
        const existingDropdown = document.querySelector('.sort-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
            return;
        }
        
        const dropdown = document.createElement('div');
        dropdown.className = 'sort-dropdown absolute bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 min-w-[180px]';
        
        const rect = this.getBoundingClientRect();
        dropdown.style.top = (rect.bottom + 8) + 'px';
        dropdown.style.left = Math.min(rect.left, window.innerWidth - 190) + 'px';
        
        dropdown.innerHTML = sortOptions.map(opt => `
            <div class="sort-option px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors ${currentSort === opt.id ? 'bg-blue-50 text-primary font-semibold' : ''}" data-sort="${opt.id}">
                ${opt.label}
                ${currentSort === opt.id ? '<i class="fa-solid fa-check text-primary text-xs"></i>' : ''}
            </div>
        `).join('');
        
        document.body.appendChild(dropdown);
        
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target) && e.target !== sortLabel) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 10);
        
        dropdown.querySelectorAll('.sort-option').forEach(opt => {
            opt.addEventListener('click', function() {
                const sortId = this.dataset.sort;
                currentSort = sortId;
                const label = sortOptions.find(s => s.id === sortId)?.label || 'Newest';
                sortLabel.innerHTML = `${label} <i class="fa-solid fa-chevron-down text-xs ml-1"></i>`;
                
                applyFilters();
                dropdown.remove();
                showToast(`Sorted by: ${label}`, 'info');
            });
        });
    });
}

// =============================================
// LOCATION DROPDOWN
// =============================================

function setupLocationDropdown() {
    const locationBtn = document.getElementById('locationBtn');
    const dropdown = document.getElementById('locationDropdown');
    let isOpen = false;

    if (!locationBtn || !dropdown) return;

    function toggleDropdown() {
        isOpen = !isOpen;
        dropdown.style.display = isOpen ? 'block' : 'none';
        if (isOpen) {
            setTimeout(() => {
                dropdown.classList.add('open');
            }, 10);
        } else {
            dropdown.classList.remove('open');
        }
    }

    locationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });

    document.addEventListener('click', (e) => {
        if (isOpen && !dropdown.contains(e.target) && e.target !== locationBtn && !e.target.closest('.location-option')) {
            toggleDropdown();
        }
    });

    document.querySelectorAll('.location-option').forEach(option => {
        option.addEventListener('click', function() {
            const location = this.dataset.location;
            const displayName = location === 'all' ? 'All Communities' : 
                location.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            
            const locationLabel = document.getElementById('locationLabel');
            if (locationLabel) locationLabel.textContent = displayName;
            
            localStorage.setItem('bridgeconnect_community', location);
            currentCommunity = location;
            
            showToast(`Switched to ${displayName}`, 'success');
            refreshAllData(location);
            
            if (isOpen) toggleDropdown();
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
            toggleDropdown();
        }
    });
}

// =============================================
// LOAD USER PROFILE
// =============================================

function loadUserProfile() {
    const userData = localStorage.getItem('bridgeconnect_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const name = user.fullName || user.name || 'User';
            
            const profileImg = document.getElementById('profileImage');
            if (profileImg && user.photoURL) {
                profileImg.src = user.photoURL;
            } else if (profileImg) {
                profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=003f87&color=fff&size=200`;
            }
            
            if (user.community) {
                const displayName = user.community.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
                const locationLabel = document.getElementById('locationLabel');
                if (locationLabel) locationLabel.textContent = displayName;
                currentCommunity = user.community;
            }
        } catch (e) {
            console.warn('Failed to parse user data:', e);
        }
    }
}

// =============================================
// NOTIFICATION BELL
// =============================================

function setupNotificationBell() {
    const notifBtn = document.getElementById('notificationBtn');
    const badge = document.getElementById('notificationBadge');
    
    if (!notifBtn) return;

    notifBtn.addEventListener('click', function() {
        showToast('Opening notifications...', 'info');
        window.location.href = 'notifications.html';
    });
}

// =============================================
// SEARCH FUNCTION
// =============================================

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    if (!searchInput) return;
    
    let timeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            applyFilters();
        }, 300);
    });
    
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            applyFilters();
            const query = searchInput.value.trim();
            if (query) {
                showToast(`Searching for "${query}"...`, 'info');
            }
        });
    }
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
}

// =============================================
// REFRESH DATA
// =============================================

async function refreshAllData(community) {
    showToast('Loading jobs...', 'info');
    
    try {
        const jobs = await loadJobs(community);
        allJobs = jobs;
        filteredJobs = jobs;
        
        renderCategories();
        renderFeaturedJobs(jobs);
        renderJobs(jobs);
        
        // Update loading state
        const loadingState = document.getElementById('loadingState');
        const jobsData = document.getElementById('jobsData');
        if (loadingState) loadingState.classList.add('hidden');
        if (jobsData) jobsData.classList.remove('hidden');
        
        showToast(`${jobs.length} jobs loaded!`, 'success');
    } catch (error) {
        console.error('Error refreshing data:', error);
        showToast('Error loading jobs', 'error');
    }
}

// =============================================
// LOAD NAVIGATION COMPONENT - FIXED
// =============================================

function loadNavigation() {
    const placeholder = document.getElementById('nav-placeholder');
    if (!placeholder) return;
    
    const currentPath = window.location.pathname;
    const isInPages = currentPath.includes('/pages/');
    const navPath = isInPages ? '../nav.html' : 'nav.html';
    
    fetch(navPath)
        .then(res => {
            if (!res.ok) throw new Error('Nav component not found');
            return res.text();
        })
        .then(html => {
            placeholder.innerHTML = html;
            setupNavItemListeners();
        })
        .catch(err => {
            console.warn('nav.html not loaded, using inline fallback.');
            placeholder.innerHTML = `
            <div class="bottom-nav-wrapper">
                <nav class="bottom-nav-glass" role="navigation" aria-label="Main navigation">
                    <a class="nav-item active" href="#" data-page="explore"><i class="fa-solid fa-magnifying-glass nav-icon"></i><span class="nav-label">Explore</span></a>
                    <a class="nav-item" href="#" data-page="home"><i class="fa-solid fa-house nav-icon"></i><span class="nav-label">Home</span></a>
                    <div class="fab-wrapper"><button class="fab-button" aria-label="Create new post"><i class="fa-solid fa-plus"></i></button><span class="fab-label">Post</span></div>
                    <a class="nav-item" href="#" data-page="messages"><i class="fa-regular fa-comment-dots nav-icon"></i><span class="nav-label">Community</span></a>
                    <a class="nav-item" href="#" data-page="profile"><i class="fa-regular fa-user nav-icon"></i><span class="nav-label">Profile</span></a>
                </nav>
            </div>
            `;
            setupNavItemListeners();
        });
}

// =============================================
// TOAST NOTIFICATIONS
// =============================================

function showToast(message, type) {
    if (type === undefined) type = 'info';
    
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 -translate-y-12 px-5 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 opacity-0 shadow-lg max-w-[90%] text-center';
        document.body.appendChild(toast);
    }
    
    const colors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600'
    };
    
    toast.textContent = message;
    toast.className = `fixed bottom-24 left-1/2 transform -translate-x-1/2 -translate-y-0 px-5 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 shadow-lg max-w-[90%] text-center ${colors[type] || colors.info}`;
    
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.className = `fixed bottom-24 left-1/2 transform -translate-x-1/2 -translate-y-12 px-5 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 opacity-0 shadow-lg max-w-[90%] text-center`;
    }, 3500);
}

// =============================================
// AUTH STATE LISTENER
// =============================================

function setupAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../login.html';
            return;
        }
        
        try {
            const userData = await loadUserData();
            if (userData) {
                loadUserProfile();
                
                const community = userData.community || localStorage.getItem('bridgeconnect_community') || 'kwamankese';
                currentCommunity = community;
                
                await refreshAllData(community);
                
                const firstName = (userData.fullName || userData.name || 'User').split(' ')[0];
                showToast(`Welcome back, ${firstName}! 💼`, 'success');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            loadUserProfile();
            const community = localStorage.getItem('bridgeconnect_community') || 'kwamankese';
            await refreshAllData(community);
        }
    });
}

// =============================================
// EVENT LISTENERS
// =============================================

function setupEventListeners() {
    // Post a Job - Opens professional modal
    const postJobBtn = document.getElementById('postJobBtn');
    if (postJobBtn) {
        postJobBtn.addEventListener('click', function() {
            openPostJobModal();
        });
    }
    
    // Filters
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            showToast('Opening advanced filters...', 'info');
        });
    }
    
    // View All Featured
    const viewAllFeatured = document.getElementById('viewAllFeatured');
    if (viewAllFeatured) {
        viewAllFeatured.addEventListener('click', function(e) {
            e.preventDefault();
            showToast('Viewing all featured jobs...', 'info');
        });
    }
}

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    loadNavigation();
    setupAuthListener();
    loadUserProfile();
    setupLocationDropdown();
    setupNotificationBell();
    setupSearch();
    setupSortDropdown();
    setupEventListeners();
    
    // Expose functions globally
    window.applyForJob = applyForJob;
    window.saveJob = saveJob;
    window.filterByCategory = filterByCategory;
    window.showToast = showToast;
    window.openPostJobModal = openPostJobModal;
    
    console.log('✅ BridgeConnect Jobs page initialized');
});