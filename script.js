/* Sabzi Sorted v3.0 - PHP Edition 
   Features: Split Pantry, Smart Defaults, LocalStorage Cookbook
*/

// --- DATA: The Ingredients List ---
const freshIngredients = [
    "Potato (Aloo)", "Onion", "Tomato", "Paneer", "Green Chili",
    "Ginger", "Garlic", "Cauliflower (Gobi)", "Spinach (Palak)", 
    "Peas (Matar)", "Yoghurt (Dahi)", "Chicken", "Eggs", "Okra (Bhindi)", "Capsicum"
];

const pantrySpices = [
    "Salt", "Oil/Ghee", "Turmeric (Haldi)", "Red Chili Powder", "Cumin (Jeera)", 
    "Coriander Powder", "Garam Masala", "Mustard Seeds", "Dal (Lentils)", "Rice", "Atta (Flour)"
];

// --- STATE: What is currently selected? ---
// We default to the "Essentials" + "Masala Dabba"
let selectedIngredients = new Set([
    "Onion", "Tomato", "Green Chili", 
    "Salt", "Oil/Ghee", "Turmeric (Haldi)", "Red Chili Powder", "Cumin (Jeera)"
]);

// --- 1. RENDER LOGIC (Drawing the buttons) ---
const freshGrid = document.getElementById('freshGrid');
const spiceGrid = document.getElementById('spiceGrid');
const spiceToggle = document.getElementById('spiceToggle');

function renderGrids() {
    freshGrid.innerHTML = "";
    spiceGrid.innerHTML = "";

    // 1. Draw Fresh Items
    freshIngredients.forEach(ing => createButton(ing, freshGrid));
    
    // 2. Draw Spice Items
    pantrySpices.forEach(ing => createButton(ing, spiceGrid));

    // 3. Draw Custom Items (User added via search)
    selectedIngredients.forEach(ing => {
        if (!freshIngredients.includes(ing) && !pantrySpices.includes(ing)) {
            createButton(ing, freshGrid); // Default custom items to fresh grid
        }
    });
}

function createButton(name, container) {
    const btn = document.createElement('div');
    // If it's in our Set, add the 'selected' CSS class (orange color)
    btn.className = `ingredient-btn ${selectedIngredients.has(name) ? 'selected' : ''}`;
    btn.innerText = name;
    
    btn.onclick = () => {
        if (selectedIngredients.has(name)) {
            selectedIngredients.delete(name);
            // Visual Polish: If user manually unchecks a spice, turn off the "Master Toggle"
            if (pantrySpices.includes(name)) spiceToggle.checked = false;
        } else {
            selectedIngredients.add(name);
        }
        renderGrids();
    };
    container.appendChild(btn);
}

// --- 2. SMART DEFAULTS (The Masala Dabba Toggle) ---
window.toggleStandardSpices = () => {
    const isChecked = spiceToggle.checked;
    const standardSpices = ["Salt", "Oil/Ghee", "Turmeric (Haldi)", "Red Chili Powder", "Cumin (Jeera)"];

    if (isChecked) {
        standardSpices.forEach(s => selectedIngredients.add(s));
    } else {
        standardSpices.forEach(s => selectedIngredients.delete(s));
    }
    renderGrids();
}

window.addCustom = () => {
    const input = document.getElementById('customInput');
    const val = input.value.trim();
    if (val) {
        selectedIngredients.add(val);
        input.value = "";
        renderGrids();
    }
}

// --- 3. THE AI BRAIN (Calling proxy.php) ---
window.generateRecipes = async () => {
    if (selectedIngredients.size < 1) {
        alert("Please select at least some ingredients!");
        return;
    }

    const btn = document.getElementById('generateBtn');
    const loader = document.getElementById('loader');
    const results = document.getElementById('results');
    const skill = document.querySelector('input[name="skill"]:checked').value;

    // UI Loading State
    btn.disabled = true;
    loader.style.display = "block";
    results.innerHTML = "";

    try {
        const promptText = `
            Act as an Indian Chef. User has these ingredients: ${Array.from(selectedIngredients).join(", ")}.
            User skill level: ${skill}.
            Goal: Suggest 3 distinct Indian recipes that can be made in <20 mins.
            Strictly follow this JSON structure (return ONLY raw JSON, no markdown):
            [{"emoji": "🍛", "name": "Recipe Name", "time": "15 mins", "instructions": "..."}]
        `;

        // CALL THE PHP PROXY
        const response = await fetch("proxy.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: promptText })
        });

        const data = await response.json();

        if (data.error) throw new Error(data.error.message || "API Error");

        // Parse Google's Response
        const text = data.candidates[0].content.parts[0].text;
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "");
        const recipes = JSON.parse(cleanJson);

        // Render Cards
        recipes.forEach(recipe => {
            // We generate a unique ID for saving (based on name)
            const recipeId = recipe.name.replace(/\s+/g, '').toLowerCase();
            
            results.innerHTML += `
                <div class="recipe-card">
                    <div class="recipe-header">
                        <div class="recipe-title">${recipe.emoji} ${recipe.name}</div>
                        <button class="save-btn" onclick="toggleSave('${recipeId}', '${encodeURIComponent(JSON.stringify(recipe))}', this)">🤍</button>
                    </div>
                    <span class="meta">⏱️ ${recipe.time} • Skill: ${skill}</span>
                    <div class="instructions">${recipe.instructions.replace(/\n/g, "<br>")}</div>
                </div>
            `;
        });

    } catch (error) {
        console.error(error);
        results.innerHTML = `<div style="color:red; text-align:center;">Error: ${error.message}</div>`;
    }

    btn.disabled = false;
    loader.style.display = "none";
}

// --- 4. COOKBOOK LOGIC (Local Storage) ---
// We use 'localStorage' which is like a tiny database in the user's browser.

window.toggleSave = (id, encodedRecipe, btnElement) => {
    const recipe = JSON.parse(decodeURIComponent(encodedRecipe));
    let cookbook = JSON.parse(localStorage.getItem('sabziCookbook') || "[]");

    // Check if recipe is already saved
    const index = cookbook.findIndex(r => r.name === recipe.name);

    if (index === -1) {
        // SAVE IT
        cookbook.push(recipe);
        btnElement.innerText = "❤️"; // Change icon to filled heart
    } else {
        // REMOVE IT (Toggle off)
        cookbook.splice(index, 1);
        btnElement.innerText = "🤍"; // Change icon back to empty heart
    }

    // Update the browser storage
    localStorage.setItem('sabziCookbook', JSON.stringify(cookbook));
    renderCookbook(); // Refresh the cookbook view
}

window.renderCookbook = () => {
    const grid = document.getElementById('cookbookGrid');
    const cookbook = JSON.parse(localStorage.getItem('sabziCookbook') || "[]");

    if (cookbook.length === 0) {
        grid.innerHTML = "<p style='text-align:center; color:#888;'>No saved recipes yet. Go find some!</p>";
        return;
    }

    grid.innerHTML = "";
    cookbook.forEach(recipe => {
        // Note: In cookbook view, the heart is always Red (Remove logic)
        const recipeId = recipe.name.replace(/\s+/g, '').toLowerCase();
        
        grid.innerHTML += `
            <div class="recipe-card">
                 <div class="recipe-header">
                        <div class="recipe-title">${recipe.emoji} ${recipe.name}</div>
                        <button class="save-btn" onclick="removeFromCookbook('${recipe.name}')">🗑️</button>
                    </div>
                <span class="meta">⏱️ ${recipe.time}</span>
                <div class="instructions">${recipe.instructions.replace(/\n/g, "<br>")}</div>
            </div>
        `;
    });
}

window.removeFromCookbook = (name) => {
    let cookbook = JSON.parse(localStorage.getItem('sabziCookbook') || "[]");
    cookbook = cookbook.filter(r => r.name !== name);
    localStorage.setItem('sabziCookbook', JSON.stringify(cookbook));
    renderCookbook();
}

window.clearCookbook = () => {
    if(confirm("Are you sure you want to delete all saved recipes?")) {
        localStorage.removeItem('sabziCookbook');
        renderCookbook();
    }
}

// --- 5. NAVIGATION (Tabs) ---
window.switchTab = (tab) => {
    const pantryView = document.getElementById('pantryView');
    const cookbookView = document.getElementById('cookbookView');
    const btnPantry = document.getElementById('tabPantry');
    const btnCookbook = document.getElementById('tabCookbook');

    if (tab === 'pantry') {
        pantryView.style.display = 'block';
        cookbookView.style.display = 'none';
        btnPantry.classList.add('active');
        btnCookbook.classList.remove('active');
    } else {
        pantryView.style.display = 'none';
        cookbookView.style.display = 'block';
        btnPantry.classList.remove('active');
        btnCookbook.classList.add('active');
        renderCookbook(); // Ensure cookbook is fresh
    }
}

// Initial Render on Load
renderGrids();
