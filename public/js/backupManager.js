// backupManager.js - Module for database backup functionality
window.BackupManager = (function() {
    // Private variables
    const BASE_URL = '/api/backup';
    
    // Initialize the backup manager
    function initialize() {
      console.log('Initializing BackupManager');
      
      // Add event listener to backup button if it exists
      const backupButton = document.getElementById('backup-database');
      if (backupButton) {
        backupButton.addEventListener('click', triggerBackup);
      } else {
        console.warn('Backup button not found in the DOM');
      }
    }
    
    // Trigger database backup function
    async function triggerBackup() {
      try {
        // Update button state during backup
        const backupButton = document.getElementById('backup-database');
        const originalText = backupButton.textContent;
        backupButton.textContent = 'Backing up...';
        backupButton.disabled = true;
        
        // Get current vault from VaultManager
        const currentVault = window.VaultManager?.getCurrentVault() || 'main';
        
        // Call the backup API endpoint with the current vault
        const response = await fetch(`${BASE_URL}/${currentVault}`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Backup failed');
        }
        
        const result = await response.json();
        
        // Show success message with vault name
        backupButton.textContent = `${currentVault} Backup Successful!`;
        backupButton.classList.add('success');
        
        // Maybe show a notification with the backup filename
        console.log(`Backup created for vault ${result.vault}:`, result.filename);
        
        // Reset button after delay
        setTimeout(() => {
          backupButton.textContent = originalText;
          backupButton.disabled = false;
          backupButton.classList.remove('success');
        }, 2000);
      } catch (error) {
        console.error('Error backing up database:', error);
        
        // Show error message
        const backupButton = document.getElementById('backup-database');
        backupButton.textContent = 'Backup Failed!';
        backupButton.classList.add('error');
        
        // Reset button after delay
        setTimeout(() => {
          backupButton.textContent = 'Backup Database';
          backupButton.disabled = false;
          backupButton.classList.remove('error');
        }, 2000);
      }
    }
    
    // Public API
    return {
      initialize,
      triggerBackup
    };
})();