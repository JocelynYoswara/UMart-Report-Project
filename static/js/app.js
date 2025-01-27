document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("file-input");
  const fileNameDisplay = document.getElementById("file-name");
  const fileError = document.getElementById("file-error");
  const comboInput = document.getElementById("combo-input");
  const dropdownList = document.querySelector(".dropdown-list");
  const dropdownOptions = document.getElementById("dropdown-options");
  const exportButton = document.getElementById("export-btn");
  const stateImage = document.getElementById("state-image")

  let selectedOptions = new Set();
  let options = [];

  function populateDropdown(filteredOptions) {
    let searchValue = comboInput.value.trim();
    dropdownOptions.innerHTML = "";

    if (filteredOptions.length === 0) {
        let noOptions = document.createElement("li");
        noOptions.textContent = "No options";
        noOptions.style.textAlign = "center";
        noOptions.style.padding = "10px";
        noOptions.style.color = "#888";
        noOptions.style.fontWeight = "bold";
        noOptions.style.display = "flex";
        noOptions.style.justifyContent = "center";  
        noOptions.style.alignItems = "center";    
        noOptions.style.height = "100%";   
        dropdownOptions.appendChild(noOptions);
        return;
    }

    // Add "Select All" checkbox
    let selectAllLi = document.createElement("li");
    let selectAllCheckbox = document.createElement("input");
    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.id = "selectAllCheckbox";

    let selectAllLabel = document.createElement("label");
    selectAllLabel.textContent = "Select All";
    selectAllLabel.style.fontWeight = "bold";
    selectAllLabel.style.marginLeft = "5px";

    selectAllLi.appendChild(selectAllCheckbox);
    selectAllLi.appendChild(selectAllLabel);
    dropdownOptions.appendChild(selectAllLi);

    // Check if all filtered options are selected
    function updateSelectAllState() {
        const selectAllCheckbox = dropdownOptions.querySelector("#selectAllCheckbox");
        if (selectedOptions.size === filteredOptions.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;  
        }
        else if (selectedOptions.size === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;  // Show negative symbol (dash)
        }
        // If no items are selected, uncheck the "Select All" checkbox
        else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;  // No dash, it's fully unchecked
        }
        updateSelectAllLabel();
    }

    function updateSelectAllLabel() {
        const selectAllLabel = dropdownOptions.querySelector("#selectAllCheckbox + label");
        const firstListItem = dropdownOptions.querySelector("li:first-child");
        const selectedCount = selectedOptions.size;
        if (selectedCount > 0) {
            selectAllLabel.textContent = `${selectedCount} item(s) selected`;
            selectAllLabel.style.color = "white";
            selectAllLabel.style.backgroundColor = "#0F42A1"; 
            firstListItem.style.backgroundColor = "#0F42A1"; // Set background color of the first li
            firstListItem.style.color = "white";
        } else {
            selectAllLabel.textContent = "Select All";
            selectAllLabel.style.color = "#6C757D"; // Default color
            selectAllLabel.style.backgroundColor = ""; // Reset background to default
            firstListItem.style.backgroundColor = "#F7F7F7"; // Reset li background to default
            firstListItem.style.color = "#6C757D";
        }
    }

    // Handle "Select All" checkbox change
    selectAllCheckbox.addEventListener("change", function () {
        if (this.checked) {
            filteredOptions.forEach(option => selectedOptions.add(option));
        } else {
            filteredOptions.forEach(option => selectedOptions.delete(option));
        }
    
        updateCheckboxes();
        updateInputValue();
        updateSelectAllLabel();
        
        // Keep the search text if there is any
        comboInput.value = searchValue; 
    });

    // Populate category checkboxes
    filteredOptions.forEach(option => {
        let li = document.createElement("li");

        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = option;
        checkbox.checked = selectedOptions.has(option);

        let label = document.createElement("label");
        label.textContent = option;
        label.style.fontWeight = "normal";

        li.appendChild(checkbox);
        li.appendChild(label);
        dropdownOptions.appendChild(li);

        li.addEventListener("mouseover", function () {
            li.style.backgroundColor = "#e0f0ff";
        });
        li.addEventListener("mouseout", function () {
            li.style.backgroundColor = "";
        });

        checkbox.addEventListener("change", function () {
            if (this.checked) {
                selectedOptions.add(this.value);
                li.classList.add('highlight');
            } else {
                selectedOptions.delete(this.value);
                li.classList.remove('highlight');
            }
            updateSelectAllState();
            updateInputValue();

            comboInput.value = searchValue; 
        });
    });

    dropdownOptions.style.maxHeight = "150px";
    dropdownOptions.style.overflowY = "auto";

    updateSelectAllState(); // Set initial state for "Select All"
    updateCheckboxes();

    comboInput.value = searchValue;
    
}

// Function to update all checkboxes when "Select All" is clicked
function updateCheckboxes() {
    const checkboxes = dropdownOptions.querySelectorAll("input[type='checkbox']:not(#selectAllCheckbox)");
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectedOptions.has(checkbox.value);
        if (checkbox.checked) {
            checkbox.parentElement.classList.add('highlight');
        } else {
            checkbox.parentElement.classList.remove('highlight');
        }
    });
}

// Function to update input field with selected categories
function updateInputValue() {
    const selectedContainer = document.getElementById("selected-items"); // Add a div in HTML
    selectedContainer.innerHTML = ""; // Clear previous selections

    selectedOptions.forEach(option => {
        let badge = document.createElement("span");
        badge.className = "selected-badge";
        badge.textContent = option;

        let removeBtn = document.createElement("span");
        removeBtn.className = "remove-badge";
        removeBtn.textContent = " ×";
        removeBtn.addEventListener("click", function () {
            selectedOptions.delete(option);
            updateInputValue();
            populateDropdown(options);
        });

        badge.appendChild(removeBtn);
        selectedContainer.appendChild(badge);
    });

    comboInput.value = ""; // Keep input box empty for new searches
}


comboInput.addEventListener("click", function () {
    if (dropdownList.style.display === "block") {
        dropdownList.style.display = "none";
        comboInput.classList.remove("active");
    } else {
        dropdownList.style.display = "block";
        comboInput.classList.add("active");
        comboInput.select();
        populateDropdown(options);
    }
});

document.addEventListener("click", function (event) {
    if (!comboInput.contains(event.target) && !dropdownList.contains(event.target)) {
        dropdownList.style.display = "none";
        comboInput.classList.remove("active");
    }
});

comboInput.addEventListener("input", function () {
    const searchValue = comboInput.value.toLowerCase();
    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(searchValue)
    );
    populateDropdown(filteredOptions);
    dropdownList.style.display = "block";
    if (!comboInput.value) {
        comboInput.style.fontStyle = 'italic'; 
    } else {
        comboInput.style.fontStyle = 'normal'; 
    }
});

dropdownOptions.addEventListener("change", function () {
    if (comboInput.value || selectedOptions.size > 0) {
        comboInput.style.fontStyle = 'normal'; 
    } else {
        checkCheckboxes();
    }
});

function checkCheckboxes() {
    if (selectedOptions.size === 0 && !comboInput.value) {
        comboInput.style.fontStyle = 'italic'; 
    }
}


  fileInput.addEventListener("change", function () {
    fileError.textContent = ""; 
    const file = fileInput.files[0];

    if (!file) {
      fileNameDisplay.textContent = "No file chosen"; 
      return;
    }

    if (!file.name.endsWith(".csv")) {
      fileNameDisplay.textContent = "No file chosen"; 
      fileError.textContent = "File must be a type of .csv!";
      fileError.style.color = "red";
      fileError.style.fontWeight = "bold";
      stateImage.src = invalidFileImageUrl;
      stateImage.style.display = "block";
      return;
    }

    let fileName = file.name;

    if (fileName.length > 20) {  
        let namePart = fileName.substring(0, 10); 
        let extPart = fileName.slice(-8);
        fileName = `${namePart}...${extPart}`;
    }

    fileNameDisplay.textContent = fileName; 

    stateImage.style.display = "block"; 
    stateImage.src = loadingFileImageUrl; 

    // Send file to backend for processing
    const formData = new FormData();
    formData.append("file", file);

    fetch("http://product-sales-report-generator.onrender.com/upload", { 
      method: "POST",
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        console.log("Server Response:", data); 
        if (data.categories) {
          options = data.categories.map(category=>category.replace(/^=|"|"/g, '').trim());
          populateDropdown(options);
          stateImage.src = validFileImageUrl;  
          stateImage.style.display = "block";
        } else {
          fileError.textContent = "Error: No categories found!";
          stateImage.src = invalidFileImageUrl;  
          stateImage.style.display = "block";
        }
      })
      .catch(error => {
        console.error("Error uploading file:", error);
        stateImage.src = invalidFileImageUrl; 
        stateImage.style.display = "block";
      });
  });

  exportButton.addEventListener("click", function (event) {
    event.preventDefault();

    if (selectedOptions.size === 0) {
        alert("Please select at least one product category.");
        return;
    }

    console.log("Selected Categories:", Array.from(selectedOptions));

    exportButton.innerHTML = `<div class="loading-content">
        <img src="${exportingImageUrl}" alt="Loading" class="loading-icon">
        <span class="loading-text">Exporting...</span>
    </div>`;
    exportButton.style.backgroundColor = '#cccccc';  
    exportButton.disabled = true;

    fetch("http://product-sales-report-generator.onrender.com/export", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ selected_categories: Array.from(selectedOptions) }),
    })
    .then((response) => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.error || "Failed to export file.");
            });
        }

        const fileName = response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "sales_report.xlsx";

        return response.blob().then(blob => ({ blob, fileName }));
    })
    .then(({ blob, fileName }) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);

        //After downloading, reset the button state
        resetExportButton();
    })
    .catch((error) => {
        console.error("Error during file export:", error);
        if (error instanceof Error) {
          alert("An error occurred: " + error.message);
        } else {
          console.error("Raw error data:", error);
        }

        resetExportButton();
    });
  });
  function resetExportButton() {
    exportButton.innerHTML = 'Export Processed File';  
    exportButton.style.backgroundColor = '#28a745';  
    exportButton.disabled = false;  

    selectedOptions.clear();
    document.querySelectorAll("#dropdown-options input[type='checkbox']").forEach(checkbox => {
      checkbox.checked = false;
    });

    // Reset the combo input field
    comboInput.value = "Product Category...";
    comboInput.style.fontStyle = 'italic'; 

    const selectedContainer = document.getElementById("selected-items");
    selectedContainer.innerHTML = "";
  }
});
