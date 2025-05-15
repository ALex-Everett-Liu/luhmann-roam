// databaseExportImportManager.js - Module for exporting/importing database tables
window.DatabaseExportImportManager = (function() {
    // Private variables
    const EXPORT_URL = '/api/database/export';
    const IMPORT_URL = '/api/database/import';
    
    // Initialize the export/import manager
    function initialize() {
      console.log('Initializing DatabaseExportImportManager');
      
      // Add event listeners to export/import buttons
      const exportButton = document.getElementById('export-database') || createExportButton();
      const importButton = document.getElementById('import-database') || createImportButton();
      
      exportButton.addEventListener('click', openExportModal);
      importButton.addEventListener('click', openImportModal);
    }
    
    // Create export button if not already in DOM
    function createExportButton() {
      const button = document.createElement('button');
      button.id = 'export-database';
      button.className = 'export-button';
      button.textContent = 'Export Data';
      button.title = 'Export database tables to JSON file';
      
      // Add to sidebar
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.appendChild(button);
      }
      
      return button;
    }
    
    // Create import button if not already in DOM
    function createImportButton() {
      const button = document.createElement('button');
      button.id = 'import-database';
      button.className = 'import-button';
      button.textContent = 'Import Data';
      button.title = 'Import database tables from JSON file';
      
      // Add to sidebar
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.appendChild(button);
      }
      
      return button;
    }
    
    // Updated openExportModal function
    function openExportModal() {
      // Remove any existing modals and overlays first
      const existingOverlay = document.querySelector('.database-export-overlay');
      if (existingOverlay) document.body.removeChild(existingOverlay);
      const existingModal = document.getElementById('export-modal');
      if (existingModal) document.body.removeChild(existingModal);

      document.body.style.overflow = 'hidden'; // Prevent background scrolling

      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'database-export-overlay';
      document.body.appendChild(overlay);

      // Create modal container
      const modal = document.createElement('div');
      modal.id = 'export-modal';
      // modal.className = 'modal'; // The ID is specific enough for styling

      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      modalContent.style.cssText = 'width: 500px !important; max-width: 500px !important; box-sizing: border-box; margin: 0; padding: 20px; background-color: white;';

      const header = document.createElement('h2');
      header.textContent = 'Export Database Tables';

      const closeButton = document.createElement('span');
      closeButton.className = 'close-button';
      closeButton.innerHTML = '&times;';

      const closeModal = () => {
        if (overlay.parentNode) document.body.removeChild(overlay);
        if (modal.parentNode) document.body.removeChild(modal);
        document.body.style.overflow = '';
        document.removeEventListener('keydown', escapeHandler);
      };

      closeButton.onclick = closeModal;
      overlay.onclick = closeModal; // Click on overlay also closes

      function escapeHandler(e) {
        if (e.key === 'Escape') {
          closeModal();
        }
      }
      document.addEventListener('keydown', escapeHandler);

      const tablesList = document.createElement('div');
      tablesList.className = 'tables-list';
      const loadingMsg = document.createElement('p');
      loadingMsg.textContent = 'Loading available tables...';
      tablesList.appendChild(loadingMsg);

      loadAvailableTables().then(tables => {
        tablesList.innerHTML = '';
        const finalTables = (!tables || tables.length === 0) ? [
          { id: 'nodes', name: 'Nodes' }, { id: 'links', name: 'Links' },
          { id: 'tasks', name: 'Tasks' }, { id: 'node_attributes', name: 'Node Attributes' },
          { id: 'bookmarks', name: 'Bookmarks' }, { id: 'blog_pages', name: 'Blog Pages' },
          { id: 'dcim_images', name: 'DCIM Images' }
        ] : tables.map(t => typeof t === 'string' ? {id: t, name: t} : t);

        finalTables.forEach(table => {
          const tableRow = document.createElement('div');
          tableRow.className = 'table-row';
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = `export-${table.id}`;
          checkbox.value = table.id;
          const label = document.createElement('label');
          label.htmlFor = checkbox.id;
          label.textContent = table.name;
          tableRow.appendChild(checkbox);
          tableRow.appendChild(label);
          tablesList.appendChild(tableRow);
        });
      });

      const selectAllRow = document.createElement('div');
      selectAllRow.className = 'button-row';
      const selectAllButton = document.createElement('button');
      selectAllButton.textContent = 'Select All';
      selectAllButton.onclick = () => tablesList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
      const deselectAllButton = document.createElement('button');
      deselectAllButton.textContent = 'Deselect All';
      deselectAllButton.onclick = () => tablesList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
      selectAllRow.appendChild(selectAllButton);
      selectAllRow.appendChild(deselectAllButton);

      const exportActionButton = document.createElement('button');
      exportActionButton.textContent = 'Export Selected Tables';
      exportActionButton.className = 'export-action-button';
      exportActionButton.onclick = () => {
        const selectedTables = Array.from(tablesList.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        if (selectedTables.length === 0) {
          alert('Please select at least one table to export');
          return;
        }
        exportTables(selectedTables);
        closeModal();
      };

      // Assemble modal content
      modalContent.appendChild(closeButton); // Close button inside modal-content for padding
      modalContent.appendChild(header);
      modalContent.appendChild(tablesList);
      modalContent.appendChild(selectAllRow);
      modalContent.appendChild(exportActionButton);
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Show them
      overlay.style.display = 'block';
      modal.style.display = 'flex'; // Use flex for internal layout
    }
    
    // Export selected tables to JSON file
    async function exportTables(tables) {
      try {
        const exportButton = document.getElementById('export-database');
        const originalText = exportButton.textContent;
        exportButton.textContent = 'Exporting...';
        exportButton.disabled = true;
        
        // Call the export API endpoint
        const response = await fetch(EXPORT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tables })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Export failed');
        }
        
        const jsonData = await response.json();
        
        // Create and download the JSON file
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
        const fileName = `database-export-${timestamp}.json`;
        
        const dataStr = JSON.stringify(jsonData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const dataUrl = URL.createObjectURL(dataBlob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = dataUrl;
        downloadLink.download = fileName;
        downloadLink.click();
        
        URL.revokeObjectURL(dataUrl);
        
        // Show success message
        exportButton.textContent = 'Export Successful!';
        exportButton.classList.add('success');
        
        setTimeout(() => {
          exportButton.textContent = originalText;
          exportButton.disabled = false;
          exportButton.classList.remove('success');
        }, 2000);
        
      } catch (error) {
        console.error('Error exporting tables:', error);
        
        // Show error message
        const exportButton = document.getElementById('export-database');
        exportButton.textContent = 'Export Failed!';
        exportButton.classList.add('error');
        
        setTimeout(() => {
          exportButton.textContent = 'Export Data';
          exportButton.disabled = false;
          exportButton.classList.remove('error');
        }, 2000);
      }
    }
    
    // Updated openImportModal function
    function openImportModal() {
      const existingOverlay = document.querySelector('.database-import-overlay');
      if (existingOverlay) document.body.removeChild(existingOverlay);
      const existingModal = document.getElementById('import-modal');
      if (existingModal) document.body.removeChild(existingModal);

      document.body.style.overflow = 'hidden';

      const overlay = document.createElement('div');
      overlay.className = 'database-import-overlay';
      document.body.appendChild(overlay);

      const modal = document.createElement('div');
      modal.id = 'import-modal';

      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      modalContent.style.cssText = 'width: 500px !important; max-width: 500px !important; box-sizing: border-box; margin: 0; padding: 20px; background-color: white;';

      const header = document.createElement('h2');
      header.textContent = 'Import Database Tables';

      const closeButton = document.createElement('span');
      closeButton.className = 'close-button';
      closeButton.innerHTML = '&times;';

      const closeModal = () => {
        if (overlay.parentNode) document.body.removeChild(overlay);
        if (modal.parentNode) document.body.removeChild(modal);
        document.body.style.overflow = '';
        document.removeEventListener('keydown', escapeHandler);
      };

      closeButton.onclick = closeModal;
      overlay.onclick = closeModal;

      function escapeHandler(e) {
        if (e.key === 'Escape') {
          closeModal();
        }
      }
      document.addEventListener('keydown', escapeHandler);
      
      const fileDescription = document.createElement('p');
      fileDescription.textContent = 'Select a JSON file previously exported from this application.';
      fileDescription.style.marginBottom = '10px';

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'json-file-input';
      fileInput.accept = '.json';

      const importOptions = document.createElement('div');
      importOptions.className = 'import-options';
      
      // Create option for handling sequence IDs
      const sequenceOption = document.createElement('div');
      sequenceOption.className = 'option-row';
      const sequenceCheckbox = document.createElement('input');
      sequenceCheckbox.type = 'checkbox';
      sequenceCheckbox.id = 'regenerate-sequence-ids';
      sequenceCheckbox.checked = true;
      const sequenceLabel = document.createElement('label');
      sequenceLabel.htmlFor = 'regenerate-sequence-ids';
      sequenceLabel.textContent = 'Regenerate sequence IDs (recommended)';
      sequenceOption.appendChild(sequenceCheckbox);
      sequenceOption.appendChild(sequenceLabel);
      importOptions.appendChild(sequenceOption);

      const conflictOption = document.createElement('div');
      conflictOption.className = 'option-row';
      const conflictLabel = document.createElement('label');
      conflictLabel.htmlFor = 'conflict-strategy';
      conflictLabel.textContent = 'Conflict resolution:';
      const conflictSelect = document.createElement('select');
      conflictSelect.id = 'conflict-strategy';
      const optionsData = [
        { value: 'replace', text: 'Replace existing records' },
        { value: 'skip', text: 'Skip existing records' },
        { value: 'merge', text: 'Merge with existing records' }
      ];
      optionsData.forEach(opt => {
        const optionElement = document.createElement('option');
        optionElement.value = opt.value;
        optionElement.textContent = opt.text;
        conflictSelect.appendChild(optionElement);
      });
      conflictOption.appendChild(conflictLabel);
      conflictOption.appendChild(conflictSelect);
      importOptions.appendChild(conflictOption);

      const importActionButton = document.createElement('button');
      importActionButton.textContent = 'Import Data';
      importActionButton.className = 'import-action-button';
      importActionButton.disabled = true;
      fileInput.onchange = () => importActionButton.disabled = !fileInput.files.length;
      importActionButton.onclick = () => {
        if (!fileInput.files.length) {
          alert('Please select a file to import');
          return;
        }
        const file = fileInput.files[0];
        const regenerateIds = sequenceCheckbox.checked;
        const conflictStrategy = conflictSelect.value;
        importFile(file, regenerateIds, conflictStrategy);
        closeModal();
      };

      modalContent.appendChild(closeButton);
      modalContent.appendChild(header);
      modalContent.appendChild(fileDescription);
      modalContent.appendChild(fileInput);
      modalContent.appendChild(importOptions);
      modalContent.appendChild(importActionButton);
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      overlay.style.display = 'block';
      modal.style.display = 'flex'; // Use flex for internal layout
    }
    
    // Import data from JSON file
    async function importFile(file, regenerateIds, conflictStrategy) {
      try {
        const importButton = document.getElementById('import-database');
        const originalText = importButton.textContent;
        importButton.textContent = 'Importing...';
        importButton.disabled = true;
        
        // Read the file content
        const fileReader = new FileReader();
        
        fileReader.onload = async (event) => {
          try {
            const jsonData = JSON.parse(event.target.result);
            
            // Send data to server for import
            const response = await fetch(IMPORT_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                data: jsonData,
                options: {
                  regenerateIds,
                  conflictStrategy
                }
              })
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Import failed');
            }
            
            const result = await response.json();
            
            // Show success message
            importButton.textContent = 'Import Successful!';
            importButton.classList.add('success');
            
            // Refresh nodes display
            if (window.fetchNodes) {
              window.fetchNodes(true);
            }
            
            setTimeout(() => {
              importButton.textContent = originalText;
              importButton.disabled = false;
              importButton.classList.remove('success');
            }, 2000);
            
          } catch (error) {
            console.error('Error processing import file:', error);
            
            importButton.textContent = 'Import Failed!';
            importButton.classList.add('error');
            
            setTimeout(() => {
              importButton.textContent = originalText;
              importButton.disabled = false;
              importButton.classList.remove('error');
            }, 2000);
          }
        };
        
        fileReader.readAsText(file);
        
      } catch (error) {
        console.error('Error importing database:', error);
        
        const importButton = document.getElementById('import-database');
        importButton.textContent = 'Import Failed!';
        importButton.classList.add('error');
        
        setTimeout(() => {
          importButton.textContent = 'Import Data';
          importButton.disabled = false;
          importButton.classList.remove('error');
        }, 2000);
      }
    }
    
    // Load available tables from the server
    async function loadAvailableTables() {
      try {
        const response = await fetch('/api/database/tables');
        if (!response.ok) {
          throw new Error('Failed to fetch table list');
        }
        
        const data = await response.json();
        return data.tables;
      } catch (error) {
        console.error('Error loading tables:', error);
        return [];
      }
    }
    
    // Get schema information for a specific table
    async function getTableSchema(tableName) {
      try {
        const response = await fetch(`/api/database/schema/${tableName}`);
        if (!response.ok) {
          throw new Error('Failed to fetch table schema');
        }
        
        const data = await response.json();
        return data.schema;
      } catch (error) {
        console.error(`Error loading schema for ${tableName}:`, error);
        return [];
      }
    }
    
    // Public API
    return {
      initialize,
      exportTables,
      importFile,
      loadAvailableTables,
      getTableSchema
    };
  })();