// vaultManager.js - Module for managing multiple database vaults
window.VaultManager = (function() {
    // Private variables
    const VAULTS_API_URL = '/api/vaults';
    let currentVault = 'main';
    
    // Initialize the vault manager
    function initialize() {
      console.log('Initializing VaultManager');
      
      // Add vault manager button to sidebar
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        const vaultButton = document.createElement('button');
        vaultButton.id = 'vault-manager-button';
        vaultButton.className = 'feature-toggle';
        vaultButton.textContent = 'Vaults';
        vaultButton.title = 'Manage database vaults';
        vaultButton.addEventListener('click', openVaultManager);
        
        // Add to sidebar
        sidebar.appendChild(vaultButton);
        
        // Add vault indicator
        const vaultIndicator = document.createElement('div');
        vaultIndicator.id = 'current-vault-indicator';
        vaultIndicator.className = 'vault-indicator';
        vaultIndicator.title = 'Current active vault';
        sidebar.appendChild(vaultIndicator);
        
        // Update vault indicator
        updateVaultIndicator();
      }
    }
    
    // Update the vault indicator with current vault name
    function updateVaultIndicator() {
      const indicator = document.getElementById('current-vault-indicator');
      if (indicator) {
        indicator.textContent = `Vault: ${currentVault}`;
        indicator.title = `Current active vault: ${currentVault}`;
      }
    }
    
    // Open the vault manager modal
    function openVaultManager() {
      // Remove any existing modals
      const existingOverlay = document.querySelector('.vault-manager-overlay');
      if (existingOverlay) document.body.removeChild(existingOverlay);
      const existingModal = document.getElementById('vault-manager-modal');
      if (existingModal) document.body.removeChild(existingModal);
      
      document.body.style.overflow = 'hidden';
      
      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'vault-manager-overlay';
      document.body.appendChild(overlay);
      
      // Create modal
      const modal = document.createElement('div');
      modal.id = 'vault-manager-modal';
      
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      modalContent.style.cssText = 'width: 500px !important; max-width: 500px !important; box-sizing: border-box; margin: 0; padding: 20px; background-color: white;';
      
      const header = document.createElement('h2');
      header.textContent = 'Database Vault Manager';
      
      const closeButton = document.createElement('span');
      closeButton.className = 'close-button';
      closeButton.innerHTML = '&times;';
      
      const closeModal = () => {
        if (overlay.parentNode) document.body.removeChild(overlay);
        if (modal.parentNode) document.body.removeChild(modal);
        document.body.style.overflow = '';
      };
      
      closeButton.onclick = closeModal;
      overlay.onclick = closeModal;
      
      // Create vault list section
      const vaultListSection = document.createElement('div');
      vaultListSection.className = 'vault-list-section';
      
      const vaultListHeader = document.createElement('h3');
      vaultListHeader.textContent = 'Available Vaults';
      
      const vaultList = document.createElement('div');
      vaultList.className = 'vault-list';
      vaultList.innerHTML = '<p>Loading vaults...</p>';
      
      // Load vaults
      loadVaults().then(data => {
        vaultList.innerHTML = '';
        
        data.vaults.forEach(vault => {
          const vaultItem = document.createElement('div');
          vaultItem.className = 'vault-item';
          if (vault === data.currentVault) {
            vaultItem.classList.add('active');
          }
          
          const vaultName = document.createElement('span');
          vaultName.className = 'vault-name';
          vaultName.textContent = vault;
          
          const vaultActions = document.createElement('div');
          vaultActions.className = 'vault-actions';
          
          // Switch button
          const switchButton = document.createElement('button');
          switchButton.className = 'switch-vault-button';
          switchButton.textContent = vault === data.currentVault ? 'Current' : 'Switch';
          switchButton.disabled = vault === data.currentVault;
          switchButton.onclick = () => switchVault(vault, closeModal);
          
          // Delete button (not for main vault)
          if (vault !== 'main') {
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-vault-button';
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteVault(vault, () => openVaultManager());
            vaultActions.appendChild(deleteButton);
          }
          
          vaultActions.appendChild(switchButton);
          vaultItem.appendChild(vaultName);
          vaultItem.appendChild(vaultActions);
          vaultList.appendChild(vaultItem);
        });
      });
      
      // Create new vault section
      const newVaultSection = document.createElement('div');
      newVaultSection.className = 'new-vault-section';
      
      const newVaultHeader = document.createElement('h3');
      newVaultHeader.textContent = 'Create New Vault';
      
      const vaultForm = document.createElement('div');
      vaultForm.className = 'vault-form';
      
      const nameLabel = document.createElement('label');
      nameLabel.htmlFor = 'vault-name-input';
      nameLabel.textContent = 'Vault Name:';
      
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.id = 'vault-name-input';
      nameInput.placeholder = 'Enter vault name (letters, numbers, hyphens, underscores)';
      
      const descLabel = document.createElement('label');
      descLabel.htmlFor = 'vault-desc-input';
      descLabel.textContent = 'Description (optional):';
      
      const descInput = document.createElement('input');
      descInput.type = 'text';
      descInput.id = 'vault-desc-input';
      descInput.placeholder = 'Enter vault description';
      
      const createButton = document.createElement('button');
      createButton.className = 'create-vault-button';
      createButton.textContent = 'Create Vault';
      createButton.onclick = () => {
        const name = nameInput.value.trim();
        const description = descInput.value.trim();
        
        if (!name) {
          alert('Please enter a vault name');
          return;
        }
        
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
          alert('Invalid vault name. Use only letters, numbers, hyphens and underscores.');
          return;
        }
        
        createVault(name, description, () => openVaultManager());
      };
      
      // Export/Import section
      const transferSection = document.createElement('div');
      transferSection.className = 'vault-transfer-section';
      
      const transferHeader = document.createElement('h3');
      transferHeader.textContent = 'Transfer Between Vaults';
      
      const transferDescription = document.createElement('p');
      transferDescription.textContent = 'Use the export/import functionality to transfer data between vaults:';
      
      const exportImportButtons = document.createElement('div');
      exportImportButtons.className = 'export-import-buttons';
      
      const transferExportButton = document.createElement('button');
      transferExportButton.textContent = 'Export from Current Vault';
      transferExportButton.onclick = () => {
        closeModal();
        if (window.DatabaseExportImportManager) {
          DatabaseExportImportManager.openExportModal();
        }
      };
      
      const transferImportButton = document.createElement('button');
      transferImportButton.textContent = 'Import to Current Vault';
      transferImportButton.onclick = () => {
        closeModal();
        if (window.DatabaseExportImportManager) {
          DatabaseExportImportManager.openImportModal();
        }
      };
      
      // Assemble the sections
      exportImportButtons.appendChild(transferExportButton);
      exportImportButtons.appendChild(transferImportButton);
      
      transferSection.appendChild(transferHeader);
      transferSection.appendChild(transferDescription);
      transferSection.appendChild(exportImportButtons);
      
      vaultForm.appendChild(nameLabel);
      vaultForm.appendChild(nameInput);
      vaultForm.appendChild(descLabel);
      vaultForm.appendChild(descInput);
      vaultForm.appendChild(createButton);
      
      newVaultSection.appendChild(newVaultHeader);
      newVaultSection.appendChild(vaultForm);
      
      vaultListSection.appendChild(vaultListHeader);
      vaultListSection.appendChild(vaultList);
      
      // Assemble the modal
      modalContent.appendChild(closeButton);
      modalContent.appendChild(header);
      modalContent.appendChild(vaultListSection);
      modalContent.appendChild(newVaultSection);
      modalContent.appendChild(transferSection);
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      
      overlay.style.display = 'block';
      modal.style.display = 'flex';
    }
    
    // Load available vaults
    async function loadVaults() {
      try {
        const response = await fetch(VAULTS_API_URL);
        if (!response.ok) {
          throw new Error('Failed to fetch vaults');
        }
        return await response.json();
      } catch (error) {
        console.error('Error loading vaults:', error);
        return { vaults: ['main'], currentVault: 'main' };
      }
    }
    
    // Create a new vault
    async function createVault(name, description, callback) {
      try {
        const response = await fetch(VAULTS_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name, description })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          alert(`Error: ${data.error || 'Failed to create vault'}`);
          return;
        }
        
        alert(`Vault "${name}" created successfully!`);
        if (callback) callback();
      } catch (error) {
        console.error('Error creating vault:', error);
        alert('Failed to create vault. See console for details.');
      }
    }
    
    // Switch to a different vault
    async function switchVault(vault, callback) {
      try {
        // Show loading indicator
        document.body.classList.add('loading');
        
        const response = await fetch(`${VAULTS_API_URL}/switch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ vault })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          alert(`Error: ${data.error || 'Failed to switch vault'}`);
          document.body.classList.remove('loading');
          return;
        }
        
        // Update current vault
        currentVault = vault;
        
        // Reload the page to refresh data from new vault
        window.location.href = `/?vault=${vault}`;
      } catch (error) {
        console.error('Error switching vault:', error);
        alert('Failed to switch vault. See console for details.');
        document.body.classList.remove('loading');
      }
    }
    
    // Delete a vault
    async function deleteVault(vault, callback) {
      try {
        if (!confirm(`Are you sure you want to delete the vault "${vault}"? This action cannot be undone.`)) {
          return;
        }
        
        const response = await fetch(`${VAULTS_API_URL}/${vault}`, {
          method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          alert(`Error: ${data.error || 'Failed to delete vault'}`);
          return;
        }
        
        alert(`Vault "${vault}" deleted successfully!`);
        if (callback) callback();
      } catch (error) {
        console.error('Error deleting vault:', error);
        alert('Failed to delete vault. See console for details.');
      }
    }
    
    // Get current vault name
    function getCurrentVault() {
      return currentVault;
    }
    
    // Public API
    return {
      initialize,
      openVaultManager,
      getCurrentVault,
      loadVaults,
      switchVault
    };
  })();