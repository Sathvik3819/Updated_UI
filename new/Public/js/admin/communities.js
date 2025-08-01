// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menu-toggle');
  const communityModal = document.getElementById('communityModal');
  const viewCommunityModal = document.getElementById('viewCommunityModal');
  const deleteConfirmationModal = document.getElementById('deleteConfirmationModal');
  const addCommunityBtn = document.getElementById('addCommunityBtn');
  const modalCloseButtons = document.querySelectorAll('.modal-close, .btn-secondary[data-dismiss="modal"]');
  const saveCommunityBtn = document.getElementById('saveCommunity');
  const editFromViewBtn = document.getElementById('editFromView');
  const confirmDeleteBtn = document.getElementById('confirmDelete');
  const communityForm = document.getElementById('communityForm');
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const locationFilter = document.getElementById('locationFilter');

  const communitiesTableBody = document.getElementById('communitiesTableBody');
  
  // Variables
  let communities = []; // Will be populated with data from the server
  let filteredCommunities = [];
  let selectedCommunityId = null;
  let isEditing = false;

  // Event Listeners
  if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
  if (addCommunityBtn) addCommunityBtn.addEventListener('click', openAddCommunityModal);
  if (saveCommunityBtn) saveCommunityBtn.addEventListener('click', saveCommunity);
  if (editFromViewBtn) editFromViewBtn.addEventListener('click', editCommunityFromView);
  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', deleteCommunity);
  if (searchInput) searchInput.addEventListener('input', filterCommunities);
  if (statusFilter) statusFilter.addEventListener('change', filterCommunities);
  if (locationFilter) locationFilter.addEventListener('change', filterCommunities);

  // Close modals
  modalCloseButtons.forEach(button => {
    button.addEventListener('click', () => {
      communityModal.classList.remove('show');
      viewCommunityModal.classList.remove('show');
      deleteConfirmationModal.classList.remove('show');
    });
  });

  // Toggle sidebar
  function toggleSidebar() {
    sidebar.classList.toggle('show');
  }

  // Fetch all communities from server
  async function fetchCommunities() {
  try {
    // Determine how many to fetch based on screen size
    const screenWidth = window.innerWidth;
    let limit = 10; // Default
    
    if (screenWidth < 768) {
      limit = 5; // Mobile
    } else if (screenWidth < 1024) {
      limit = 6; // Tablet
    }
    
    // If we already have communities, use them (for initial server-side rendering)
    if (window.initialCommunities && window.initialCommunities.length > 0) {
      communities = window.initialCommunities;
      filteredCommunities = [...communities];
      return;
    }
    
    const response = await fetch(`/admin/api/communities?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch communities');
    
    const data = await response.json();
    communities = data.communities;
    filteredCommunities = [...communities];
  } catch (error) {
    console.error('Error fetching communities:', error);
    showNotification('Error loading communities. Please try again.', 'error');
  }
}

  // Setup action buttons for each community row
  function setupActionButtons() {
    const viewButtons = document.querySelectorAll('.btn-view');
    const editButtons = document.querySelectorAll('.btn-edit');
    const deleteButtons = document.querySelectorAll('.btn-delete');
    
    viewButtons.forEach(button => {
      button.addEventListener('click', () => {
        const communityId = button.getAttribute('data-id');
        viewCommunity(communityId);
      });
    });
    
    editButtons.forEach(button => {
      button.addEventListener('click', () => {
        const communityId = button.getAttribute('data-id');
        editCommunity(communityId);
      });
    });
    
    deleteButtons.forEach(button => {
      button.addEventListener('click', () => {
        const communityId = button.getAttribute('data-id');
        openDeleteConfirmationModal(communityId);
      });
    });
  }

  // Filter communities based on search input and filters
  function filterCommunities() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;
    const locationValue = locationFilter.value;
    
    filteredCommunities = communities.filter(community => {
      const matchSearch = 
        community.name.toLowerCase().includes(searchTerm) ||
        community.location.toLowerCase().includes(searchTerm) ||
        (community.communityManager && community.communityManager.name && 
         community.communityManager.name.toLowerCase().includes(searchTerm));
      
      const matchStatus = statusValue === '' || community.status === statusValue;
      const matchLocation = locationValue === '' || community.location === locationValue;
      
      return matchSearch && matchStatus && matchLocation;
    });
    
    displayCommunities();
  }

  // Display first 7 communities with option to show more
 function displayCommunities() {
  const header = document.querySelector('.header'); // adjust selector as needed
  const filterSection = document.querySelector('.filter-section'); // adjust selector as needed

  const headerHeight = header ? header.offsetHeight : 0;
  const filterHeight = filterSection ? filterSection.offsetHeight : 0;
  const rowHeight = 56; // Approximate average table row height (px). Adjust as needed.

  const totalAvailableHeight = window.innerHeight - headerHeight - filterHeight - 100; // buffer for paddings/margins
  const initialRowsToShow = Math.floor(totalAvailableHeight / rowHeight);

  const showAll = communitiesTableBody.getAttribute('data-show-all') === 'true';
  const displayedCommunities = showAll ? filteredCommunities : filteredCommunities.slice(0, initialRowsToShow-1);

  let html = '';
  if (displayedCommunities.length === 0) {
    html = '<tr><td colspan="7" class="text-center">No communities found</td></tr>';
  } else {
    displayedCommunities.forEach(community => {
      const formattedDate = new Date(community.createdAt).toLocaleDateString();
      html += `
        <tr data-id="${community._id}">
          <td>${community.name}</td>
          <td>${community.location}</td>
          <td>${community.totalMembers || 0}</td>
          <td>${formattedDate}</td>
          <td><span class="table-status status-${community.status.toLowerCase()}">${community.status}</span></td>
          <td>${community.communityManager ? community.communityManager.name : 'Unassigned'}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-sm btn-icon btn-view" data-id="${community._id}">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-sm btn-icon btn-edit" data-id="${community._id}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-icon btn-delete" data-id="${community._id}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

   
  }

  communitiesTableBody.innerHTML = html;
  setupActionButtons();

  const toggleBtn = document.getElementById('toggleDisplayBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const currentlyShowingAll = communitiesTableBody.getAttribute('data-show-all') === 'true';
      communitiesTableBody.setAttribute('data-show-all', !currentlyShowingAll);
      displayCommunities();
    });
  }
}


  // Open the Add Community modal
  function openAddCommunityModal() {
    isEditing = false;
    selectedCommunityId = null;
    document.getElementById('modalTitle').textContent = 'Add New Community';
    communityForm.reset();
    communityModal.classList.add('show');
  }

  // Open the View Community modal
  async function viewCommunity(communityId) {
    try {
      selectedCommunityId = communityId;
      
      // Fetch the latest data for this community
      const response = await fetch(`/admin/api/communities/${communityId}`);
      if (!response.ok) throw new Error('Failed to fetch community details');
      
      const community = await response.json();
      
      document.getElementById('detailName').textContent = community.name;
      document.getElementById('detailLocation').textContent = community.location;
      document.getElementById('detailMembers').textContent = community.totalMembers || 0;
      document.getElementById('detailStatus').textContent = community.status;
      document.getElementById('detailManager').textContent = community.communityManager ? community.communityManager.name : 'Unassigned';
      document.getElementById('detailCreated').textContent = new Date(community.createdAt).toLocaleDateString();
      document.getElementById('detailDescription').textContent = community.description || 'No description available';
      
      viewCommunityModal.classList.add('show');
    } catch (error) {
      console.error('Error fetching community details:', error);
      showNotification('Error loading community details. Please try again.', 'error');
    }
  }

  // Edit Community from the main list
  async function editCommunity(communityId) {
    try {
      isEditing = true;
      selectedCommunityId = communityId;
      
      // Fetch the latest data for this community
      const response = await fetch(`/admin/api/communities/${communityId}`);
      if (!response.ok) throw new Error('Failed to fetch community details');
      
      const community = await response.json();
      
      document.getElementById('modalTitle').textContent = 'Edit Community';
      document.getElementById('communityName').value = community.name;
      document.getElementById('communityLocation').value = community.location;
      document.getElementById('communityDescription').value = community.description || '';
      document.getElementById('communityStatus').value = community.status;
      
      // Set the community manager in the select dropdown
      const managerSelect = document.getElementById('communityManager');
      managerSelect.value = community.communityManager ? community.communityManager._id : '';
      
      communityModal.classList.add('show');
    } catch (error) {
      console.error('Error fetching community details for edit:', error);
      showNotification('Error loading community data for editing. Please try again.', 'error');
    }
  }

  // Edit Community from the view details modal
  function editCommunityFromView() {
    viewCommunityModal.classList.remove('show');
    editCommunity(selectedCommunityId);
  }

  // Open the Delete Confirmation modal
  function openDeleteConfirmationModal(communityId) {
    selectedCommunityId = communityId;
    const community = communities.find(c => c._id === communityId);
    
    if (community) {
      document.getElementById('deleteCommunityName').textContent = community.name;
      deleteConfirmationModal.classList.add('show');
    }
  }

  // Save Community (Add or Edit)
  async function saveCommunity() {
    try {
      const name = document.getElementById('communityName').value;
      const location = document.getElementById('communityLocation').value;
      const description = document.getElementById('communityDescription').value;
      const status = document.getElementById('communityStatus').value;
      const managerId = document.getElementById('communityManager').value;
      
      if (!name || !location || !status) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }
      
      const communityData = {
        name,
        location,
        description,
        status,
        communityManagerId: managerId || null
      };
      
      let response;
      
      if (isEditing && selectedCommunityId) {
        // Update existing community
        response = await fetch(`/admin/api/communities/${selectedCommunityId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(communityData)
        });
      } else {
        // Add new community
        response = await fetch('/admin/api/communities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(communityData)
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save community');
      }
      
      // Reset and update UI
      communityForm.reset();
      communityModal.classList.remove('show');
      
      // Refresh data
      await fetchCommunities();
      displayCommunities();
      
      showNotification(isEditing ? 'Community updated successfully!' : 'Community added successfully!', 'success');
    } catch (error) {
      console.error('Error saving community:', error);
      showNotification(error.message || 'Failed to save community. Please try again.', 'error');
    }
  }

  // Delete Community
  async function deleteCommunity() {
    try {
      if (!selectedCommunityId) return;
      
      const response = await fetch(`/admin/api/communities/${selectedCommunityId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete community');
      }
      
      deleteConfirmationModal.classList.remove('show');
      
      // Refresh data
      await fetchCommunities();
      displayCommunities();
      
      showNotification('Community deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting community:', error);
      showNotification(error.message || 'Failed to delete community. Please try again.', 'error');
    }
  }

  // Show notification function
  function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
      </div>
      <button class="notification-close">&times;</button>
    `;
    
    // Add styles if they don't exist
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        .notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
        }
        .notification {
          background-color: white;
          border-radius: 4px;
          box-shadow: 0 3px 6px rgba(0,0,0,0.16);
          margin-bottom: 10px;
          padding: 15px;
          width: 300px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          animation: slideIn 0.3s ease-out forwards;
        }
        .notification-content {
          display: flex;
          align-items: center;
        }
        .notification-content i {
          margin-right: 10px;
        }
        .notification.success i {
          color: #28a745;
        }
        .notification.error i {
          color: #dc3545;
        }
        .notification.info i {
          color: #17a2b8;
        }
        .notification-close {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          color: #6c757d;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Create container if it doesn't exist
    let container = document.querySelector('.notification-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
    
    // Add to document
    container.appendChild(notification);
    
    // Add close event
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      notification.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => {
        container.removeChild(notification);
      }, 300);
    });
    
    // Auto close after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => {
          if (notification.parentNode) {
            container.removeChild(notification);
          }
        }, 300);
      }
    }, 5000);
  }

  // Script initialization to handle server-side data
  function initializeWithServerData() {
    // Add this to the EJS template to pass server data to JS
    if (typeof window.initialCommunities === 'undefined') {
      window.initialCommunities = [];
      // Try to get communities from DOM if they exist
      const communityRows = document.querySelectorAll('#communitiesTableBody tr[data-id]');
      communityRows.forEach(row => {
        const id = row.getAttribute('data-id');
        const name = row.cells[0].textContent;
        const location = row.cells[1].textContent;
        const totalMembers = parseInt(row.cells[2].textContent) || 0;
        const createdAt = row.cells[3].textContent;
        const status = row.cells[4].textContent.trim();
        const managerName = row.cells[5].textContent.trim();
        
        window.initialCommunities.push({
          _id: id,
          name,
          location,
          totalMembers,
          createdAt: new Date(createdAt), 
          status,
          communityManager: managerName !== 'Unassigned' ? { name: managerName } : null
        });
      });
    }
  }

  // Initialize with any server-side data
  initializeWithServerData();
  // Add this near your other event listeners
window.addEventListener('resize', () => {
  // Only refresh if we're not showing all communities
  if (communitiesTableBody.getAttribute('data-show-all') !== 'true') {
    displayCommunities();
  }
});
  // Initial fetch and display
  fetchCommunities().then(() => {
    displayCommunities();
  });
});