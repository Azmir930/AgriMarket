const allUsers = [
    { id: 1, name: 'John Farmer', email: 'john@farm.com', role: 'Farmer', kycStatus: 'Verified', status: 'Active', lastLogin: '2024-01-20' },
    { id: 2, name: 'Jane Buyer', email: 'jane@email.com', role: 'Buyer', kycStatus: 'Verified', status: 'Active', lastLogin: '2024-01-19' },
    { id: 3, name: 'Bob Smith', email: 'bob@farm.com', role: 'Farmer', kycStatus: 'Pending', status: 'Active', lastLogin: '2024-01-20' },
    { id: 4, name: 'Alice Johnson', email: 'alice@email.com', role: 'Buyer', kycStatus: 'Rejected', status: 'Inactive', lastLogin: '2024-01-10' },
    { id: 5, name: 'Admin User', email: 'admin@agri.com', role: 'Admin', kycStatus: 'Verified', status: 'Active', lastLogin: '2024-01-20' },
    { id: 6, name: 'Mike Wilson', email: 'mike@farm.com', role: 'Farmer', kycStatus: 'Pending', status: 'Active', lastLogin: '2024-01-20' }
];

function getPendingKYCCount() {
    return allUsers.filter(user => user.kycStatus === 'Pending').length;
}

function updatePendingTabLabel() {
    const pendingCount = getPendingKYCCount();
    const pendingBtn = document.getElementById('pending-tab');
    if (pendingBtn) {
        pendingBtn.textContent = `Pending KYC (${pendingCount})`;
    }
}

function getBadgeClass(type, value) {
    if (type === 'role') {
        return `badge badge-${value.toLowerCase()}`;
    } else if (type === 'kycStatus') {
        return `badge badge-${value.toLowerCase()}`;
    } else if (type === 'status') {
        return `badge badge-${value.toLowerCase()}`;
    }
}

function createTableRow(user) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>
            <div class="user-info">
                <p class="user-name">${user.name}</p>
                <p class="user-email">${user.email}</p>
            </div>
        </td>
        <td><span class="${getBadgeClass('role', user.role)}">${user.role}</span></td>
        <td><span class="${getBadgeClass('kycStatus', user.kycStatus)}">${user.kycStatus}</span></td>
        <td><span class="${getBadgeClass('status', user.status)}">${user.status}</span></td>
        <td>${user.lastLogin}</td>
        <td>
            <div class="actions">
                <button class="action-btn" title="View">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </button>
                ${user.kycStatus === 'Rejected' ?
            `<button class="action-btn approve" title="Approve">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <polyline points="16 11 18 13 22 9"></polyline>
                        </svg>
                    </button>` :
            `<button class="action-btn delete" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <line x1="17" x2="22" y1="8" y2="13"></line>
                            <line x1="22" x2="17" y1="8" y2="13"></line>
                        </svg>
                    </button>`
        }
            </div>
        </td>
    `;
    return row;
}

function populateAllUsersTable() {
    const tbody = document.getElementById('all-users-body');
    tbody.innerHTML = '';
    allUsers.forEach(user => {
        tbody.appendChild(createTableRow(user));
    });
}

function populatePendingKYCTable() {
    const tbody = document.getElementById('pending-users-body');
    tbody.innerHTML = '';
    const pendingUsers = allUsers.filter(user => user.kycStatus === 'Pending');
    pendingUsers.forEach(user => {
        tbody.appendChild(createTableRow(user));
    });
}

function setupTabSwitching() {
    const buttons = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');

            // Remove active class from all buttons and contents
            buttons.forEach(btn => btn.classList.remove('active'));
            contents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });
}

// Initialize on page load
window.addEventListener('load', function () {
    updatePendingTabLabel();
    populateAllUsersTable();
    populatePendingKYCTable();
    setupTabSwitching();
});
