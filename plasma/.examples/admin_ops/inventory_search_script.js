// Simple script for inventory search modal - only essential functionality
$(document).ready(function() {
  // Initialize color filter autocomplete
  initializeColorFilterAutocomplete();
  
  // Add selected items to check functionality
  $('#addSelectedToCheck').on('click', function() {
    // Get all checked items
    const selectedItems = [];
    $('.item-checkbox:checked').each(function() {
      selectedItems.push($(this).data('imei'));
    });
    
    // Pass selected items back to parent page
    if (window.opener && !window.opener.closed) {
      window.opener.handleSelectedInventoryItems(selectedItems);
    } else {
      // For same window operation, use a callback
      if (typeof handleSelectedInventoryItems === 'function') {
        handleSelectedInventoryItems(selectedItems);
      }
    }
    
    // Close the modal
    $('#inventorySearchModal').modal('hide');
 });
  
  // Handle select all checkbox
  $('#select-all-checkbox').on('change', function() {
    $('.item-checkbox').prop('checked', this.checked);
  });
  
  // When modal is shown, load initial data and remove backdrop
  $('#inventorySearchModal').on('shown.bs.modal', function() {
    // Set a high z-index to ensure the modal appears on top
    $(this).css('z-index', '1051');
    $(this).find('.modal-content').css('z-index', '1052');
    
    // Remove the modal backdrop that blocks interaction
    $('.modal-backdrop').not('.modal').remove();
    
    // Hide any loading indicators that might be interfering
    $('.data-loading').show();
    
    // Load initial data (without filters)
    loadInventoryData();
  });
  
  // Apply filters button click
  $('.apply-filters').on('click', function(e) {
    e.preventDefault();
    currentPage = 1; // Reset to first page when applying filters
    loadInventoryData();
 });
  
  // Search model button click
 $('.search-model').on('click', function(e) {
    e.preventDefault();
    currentPage = 1; // Reset to first page when searching
    loadInventoryData();
  });
  
  // Pagination button clicks - use event delegation for dynamic content
  $(document).on('click', '.prev-next-btn', function(e) {
    e.preventDefault();
    
    const direction = $(this).data('value');
    console.log('Pagination button clicked:', direction, 'Current page:', currentPage, 'Total pages:', totalPages);
    
    if (direction === 'previous' && currentPage > 1) {
      loadInventoryData(currentPage - 1);
    } else if (direction === 'next' && currentPage < totalPages) {
      loadInventoryData(currentPage + 1);
    } else {
      console.log('Pagination click ignored - direction:', direction, 'currentPage:', currentPage, 'totalPages:', totalPages);
    }
  });
});

function initializeColorFilterAutocomplete() {
  const colorInput = $('.select-color')[0];
  if (!colorInput) return;

  const suggestionPanel = colorInput.parentElement.querySelector('.color-suggestion-panel');
  if (!suggestionPanel) return;

  let colorOptions = [];
  try {
    colorOptions = JSON.parse(colorInput.dataset.colorOptions || "[]");
  } catch (error) {
    colorOptions = [];
  }

  const MAX_RESULTS = 20;

  // Apply basic dropdown styling when JavaScript is active
  Object.assign(suggestionPanel.style, {
    position: "absolute",
    top: "100%",
    left: "0",
    right: "0",
    zIndex: "1000",
    background: "#ffffff",
    border: "1px solid #ccc",
    borderTop: "none",
    maxHeight: "220px",
    overflowY: "auto",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    padding: "0",
  });

  function hideSuggestions() {
    suggestionPanel.innerHTML = "";
    suggestionPanel.classList.add("hide");
    suggestionPanel.style.display = "none";
  }

  function showSuggestions(results, queryProvided) {
    if (!results.length) {
      if (queryProvided) {
        suggestionPanel.innerHTML = '<div class="color-suggestion-item" style="padding:8px 12px; color:#777; cursor:default;">No matches found</div>';
        suggestionPanel.classList.remove("hide");
        suggestionPanel.style.display = "block";
      } else {
        hideSuggestions();
      }
      return;
    }

    const itemsMarkup = results.map(function (color) {
      return `<div class="color-suggestion-item" data-value="${escapeHtml(color)}" style="padding:8px 12px; cursor:pointer;">${escapeHtml(color)}</div>`;
    }).join("");

    suggestionPanel.innerHTML = itemsMarkup;
    suggestionPanel.classList.remove("hide");
    suggestionPanel.style.display = "block";
  }

  function filterColorOptions(query) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery.length) {
      return colorOptions.slice(0, MAX_RESULTS);
    }

    const filtered = colorOptions.filter(function (color) {
      return color.toLowerCase().indexOf(normalizedQuery) !== -1;
    });

    return filtered.slice(0, MAX_RESULTS);
  }

  colorInput.addEventListener("input", function () {
    const query = this.value;
    const results = filterColorOptions(query);
    showSuggestions(results, query.trim().length > 0);
  });

  colorInput.addEventListener("focus", function () {
    const query = this.value;
    const results = filterColorOptions(query);
    showSuggestions(results, query.trim().length > 0);
  });

  colorInput.addEventListener("blur", function () {
    setTimeout(function () {
      hideSuggestions();
    }, 150);
  });

  suggestionPanel.addEventListener("mousedown", function (event) {
    const target = event.target;
    if (!target.classList.contains("color-suggestion-item")) return;
    const selectedValue = target.getAttribute("data-value") || "";
    colorInput.value = selectedValue;
    hideSuggestions();
  });

  hideSuggestions();
}

function escapeHtml(value) {
 if (!value) return "";
  return value.replace(/[&<>"']/g, function (char) {
    switch (char) {
      case "&":
        return "&";
      case "<":
        return "<";
      case ">":
        return ">";
      case '"':
        return '"';
      case "'":
        return "'";
      default:
        return char;
    }
  });
}

// Global variable to track current page
let currentPage = 1;
let totalPages = 0;

function loadInventoryData(page = 1) {
  // Show loading indicator
  $('.data-loading').show();
  
  // Update current page
  currentPage = page;
  
  // Get filter values
  const category = $('.select-category').val() || '';
  const color = $('.select-color').val() || '';
  const gb = $('.select-gb').val() || '';
  const grade = $('.select-grade').val() || '';
  const supplier = $('.select-supplier').val() || '';
  const model = $('.search-model-input').val() || '';
  
  // Prepare the data object with the expected parameter names
  const requestData = {
    category: category,
    color: color,
    gb: gb,
    searchMODEL: model,
    stockType: 'instock', // Only show in-stock items
    pageId: page // Use the page parameter
  };
  
  // Only add supplier if it has a value
  if (supplier) {
    requestData.supplier = supplier;
  }
  
  // Only add grade if it has a value
  if (grade) {
    requestData.grade = grade;
  }
  
  console.log('Loading inventory data for page:', page, 'with request data:', requestData);
  
  // Make AJAX request to fetch inventory data
  $.ajax({
    url: '../../products/imei/includes/fetch-imei-inventory-data.php', // Path relative to the modal file location
    type: 'POST',
    data: requestData,
    success: function(response) {
      console.log('Inventory data response:', response);
      
      try {
        const data = JSON.parse(response);
        console.log('Parsed inventory data:', data);
        renderInventoryTable(data.data || []);
        
        // Fetch total count to calculate pages
        fetchTotalCount(requestData);
      } catch (e) {
        console.error('Error parsing inventory data:', e);
        renderInventoryTable([]);
      }
    },
    error: function(xhr, status, error) {
      console.error('Error fetching inventory data:', error);
      console.error('XHR response text:', xhr.responseText);
      renderInventoryTable([]);
    },
    complete: function() {
      // Hide loading indicator
      $('.data-loading').hide();
    }
  });
}

function fetchTotalCount(requestData) {
  // Make AJAX request to get total count
  $.ajax({
    url: '../../products/imei/includes/fetch-total-data-rows.php',
    type: 'POST',
    data: requestData,
    success: function(response) {
      console.log('Total count response:', response); // Debug log
      
      try {
        // The response might be a JSON string or just a number
        let totalRows;
        if (typeof response === 'string') {
          // Try to parse as JSON first
          try {
            const parsed = JSON.parse(response);
            totalRows = parseInt(parsed);
          } catch (e) {
            // If not JSON, parse as direct number
            totalRows = parseInt(response);
          }
        } else {
          totalRows = parseInt(response);
        }
        
        console.log('Parsed total rows:', totalRows); // Debug log
        
        if (isNaN(totalRows) || totalRows <= 0) {
          totalPages = 0;
        } else {
          totalPages = Math.ceil(totalRows / 10); // 10 rows per page
        }
        
        console.log('Calculated total pages:', totalPages); // Debug log
        updatePaginationControls();
      } catch (e) {
        console.error('Error parsing total count:', e);
        totalPages = 0;
        updatePaginationControls();
      }
    },
    error: function(xhr, status, error) {
      console.error('Error fetching total count:', error);
      console.error('XHR response text:', xhr.responseText); // Debug log
      totalPages = 0;
      updatePaginationControls();
    }
  });
}

function updatePaginationControls() {
  $('.current-page').text(currentPage);
  $('.total-pages').text(totalPages);
  
  // Disable/enable previous button
  $('.prev-next-btn[data-value="previous"]').toggleClass('disabled', currentPage <= 1);
  
  // Disable/enable next button
  $('.prev-next-btn[data-value="next"]').toggleClass('disabled', currentPage >= totalPages);
}

function renderInventoryTable(rowsData) {
  const tbody = $('.searched-table tbody');
  tbody.empty();
  
  if (!rowsData || rowsData.length === 0) {
    $('.no-data-error').text('No inventory items found matching your criteria.');
    return;
  }
  
  $('.no-data-error').text('');
  
  // Get brand, supplier, and grade options
  const brandOptions = {};
  $('.brands-field option').each(function() {
    brandOptions[$(this).val()] = $(this).text();
  });
  
  const supplierOptions = {};
  $('.supplier-field option').each(function() {
    supplierOptions[$(this).val()] = $(this).text();
  });
  
  const gradeOptions = {};
  $('.grade-list span').each(function() {
    const text = $(this).text();
    const parts = text.split('%');
    if (parts.length === 2) {
      const title = parts[0];
      const id = parts[1];
      gradeOptions[id] = title;
    }
  });
  
  // Define grade mapping (integer to letter)
  const gradeMapping = {
    '0': 'NULL',
    '1': 'A',
    '2': 'B',
    '3': 'C',
    '4': 'D',
    '5': 'E',
    '6': 'F'
  };
  
  // Render each row
  rowsData.forEach(function(val) {
    const category = val.item_brand && val.item_brand.length > 0 ? brandOptions[val.item_brand] || val.item_brand : "";
    const supplier = val.supplier_id && val.supplier_id.length > 0 ? supplierOptions[val.supplier_id] || val.supplier_id : "";
    
    // Map grade integer to letter, handle null/empty values
    let gradeDisplay = '-';
    if (val.item_grade !== null && val.item_grade !== undefined && val.item_grade !== '') {
      const gradeStr = val.item_grade.toString();
      gradeDisplay = gradeMapping[gradeStr] || gradeStr;
    }
    
    const rowHtml = `
      <tr>
        <td><input type="checkbox" class="item-checkbox" data-imei="${val.item_imei}"></td>
        <td><a href="../../products/imei/item_details.php?item_code=${val.item_imei}" target="_blank">${val.item_imei}</a></td>
        <td>${val.item_details || ''}</td>
        <td>${val.item_color || ''}</td>
        <td>${val.item_gb ? (parseInt(val.item_gb, 10) >= 1024 ? (parseInt(val.item_gb, 10) / 1024) + ' TB' : val.item_gb + ' GB') : ''}</td>
        <td>${gradeDisplay}</td>
        <td>${supplier}</td>
        <td>${val.location || "Not Set"}</td>
      </tr>
    `;
    tbody.append(rowHtml);
  });
}