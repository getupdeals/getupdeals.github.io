// ======================== PRODUCT MANAGER (with full image management) ========================
const db = firebase.firestore();
const storage = firebase.storage();
const rtdb = firebase.database();

// ---------- Helpers ----------
function slugify(t) { return t.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-"); }
async function uploadImage(file, path) { if(!file) return null; const ref = storage.ref(path); await ref.put(file); return await ref.getDownloadURL(); }
function escapeHtml(str) { if(!str) return ""; return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
function escapeAttr(str) { if(!str) return ""; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function capitalizeWords(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
// Delete file from Storage by URL
async function deleteStorageFile(url) {
    if (!url) return;
    try {
        const ref = firebase.storage().refFromURL(url);
        await ref.delete();
    } catch(e) { console.warn("Storage delete failed (maybe file not exists):", e); }
}

// ---------- Category Management (NO IMAGES) ----------
const catSelect = document.getElementById("catSelect");
const subcatSelect = document.getElementById("subcatSelect");
const subsubcatSelect = document.getElementById("subsubcatSelect");
const newCategoryName = document.getElementById("newCategoryName");
const newSubcategoryName = document.getElementById("newSubcategoryName");
const newSubsubcategoryName = document.getElementById("newSubsubcategoryName");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const addSubcategoryBtn = document.getElementById("addSubcategoryBtn");
const addSubsubcategoryBtn = document.getElementById("addSubsubcategoryBtn");

function resetCategoryState() {
    subcatSelect.innerHTML = '<option value="">Select Subcategory</option>';
    subsubcatSelect.innerHTML = '<option value="">Select Sub-Subcategory</option>';
    subcatSelect.disabled = true;
    subsubcatSelect.disabled = true;
    newSubcategoryName.disabled = true;
    newSubsubcategoryName.disabled = true;
    addSubcategoryBtn.disabled = true;
    addSubsubcategoryBtn.disabled = true;
}

async function loadCategories(selectedId = "") {
    catSelect.innerHTML = '<option value="">Select Category</option>';
    const snap = await db.collection("categories").orderBy("name").get();
    const seen = new Set();
    snap.forEach(d => {
        if (!seen.has(d.id)) {
            seen.add(d.id);
            catSelect.innerHTML += `<option value="${d.id}">${escapeHtml(d.data().name)}</option>`;
        }
    });
    if (selectedId && catSelect.querySelector(`option[value="${selectedId}"]`)) {
        catSelect.value = selectedId;
        catSelect.dispatchEvent(new Event("change"));
    }
}

async function loadSubcategories(categoryId, selectedId = "") {
    subcatSelect.innerHTML = '<option value="">Select Subcategory</option>';
    if (!categoryId) return;
    const snap = await db.collection("categories").doc(categoryId).collection("list").orderBy("name").get();
    const seen = new Set();
    snap.forEach(d => {
        if (!seen.has(d.id)) {
            seen.add(d.id);
            subcatSelect.innerHTML += `<option value="${d.id}">${escapeHtml(d.data().name)}</option>`;
        }
    });
    if (selectedId && subcatSelect.querySelector(`option[value="${selectedId}"]`)) {
        subcatSelect.value = selectedId;
        subcatSelect.dispatchEvent(new Event("change"));
    }
}

async function loadSubsubcategories(categoryId, subcategoryId, selectedId = "") {
    subsubcatSelect.innerHTML = '<option value="">Select Sub-Subcategory</option>';
    if (!categoryId || !subcategoryId) return;
    const snap = await db.collection("subsubcategories").doc(categoryId).collection(subcategoryId).orderBy("name").get();
    const seen = new Set();
    snap.forEach(d => {
        if (!seen.has(d.id)) {
            seen.add(d.id);
            subsubcatSelect.innerHTML += `<option value="${d.id}">${escapeHtml(d.data().name)}</option>`;
        }
    });
    if (selectedId && subsubcatSelect.querySelector(`option[value="${selectedId}"]`)) {
        subsubcatSelect.value = selectedId;
    }
}

catSelect.onchange = async () => {
    subcatSelect.innerHTML = '<option value="">Select Subcategory</option>';
    subsubcatSelect.innerHTML = '<option value="">Select Sub-Subcategory</option>';
    subcatSelect.disabled = true;
    subsubcatSelect.disabled = true;
    newSubcategoryName.disabled = true;
    newSubsubcategoryName.disabled = true;
    addSubcategoryBtn.disabled = true;
    addSubsubcategoryBtn.disabled = true;
    if (!catSelect.value) return;
    subcatSelect.disabled = false;
    newSubcategoryName.disabled = false;
    addSubcategoryBtn.disabled = false;
    await loadSubcategories(catSelect.value);
};

subcatSelect.onchange = async () => {
    subsubcatSelect.innerHTML = '<option value="">Select Sub-Subcategory</option>';
    subsubcatSelect.disabled = true;
    newSubsubcategoryName.disabled = true;
    addSubsubcategoryBtn.disabled = true;
    if (!subcatSelect.value) return;
    subsubcatSelect.disabled = false;
    newSubsubcategoryName.disabled = false;
    addSubsubcategoryBtn.disabled = false;
    await loadSubsubcategories(catSelect.value, subcatSelect.value);
};

addCategoryBtn.onclick = async () => {
    try {
        const name = capitalizeWords(newCategoryName.value.trim());
        if (!name) return alert("Enter category name");
        const id = slugify(name);
        const existingById = await db.collection("categories").doc(id).get();
        if (existingById.exists) return alert("Category already exists");
        const nameQuery = await db.collection("categories").where("name", "==", name).get();
        if (!nameQuery.empty) return alert("A category with this name already exists");
        await db.collection("categories").doc(id).set({
            name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newCategoryName.value = "";
        await loadCategories(id);
        alert(`Category "${name}" added successfully!`);
    } catch (error) {
        console.error("Add category error:", error);
        alert("Error adding category: " + error.message);
    }
};

addSubcategoryBtn.onclick = async () => {
    try {
        const catId = catSelect.value;
        if (!catId) return alert("Select category first");
        const name = capitalizeWords(newSubcategoryName.value.trim());
        if (!name) return alert("Enter subcategory name");
        const id = slugify(name);
        const existingById = await db.collection("categories").doc(catId).collection("list").doc(id).get();
        if (existingById.exists) return alert("Subcategory already exists under this category");
        const nameQuery = await db.collection("categories").doc(catId).collection("list").where("name", "==", name).get();
        if (!nameQuery.empty) return alert("A subcategory with this name already exists under this category");
        await db.collection("categories").doc(catId).collection("list").doc(id).set({
            name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newSubcategoryName.value = "";
        await loadSubcategories(catId, id);
        alert(`Subcategory "${name}" added successfully!`);
    } catch (error) {
        console.error("Add subcategory error:", error);
        alert("Error adding subcategory: " + error.message);
    }
};

addSubsubcategoryBtn.onclick = async () => {
    if (addSubsubcategoryBtn.disabled) return;
    addSubsubcategoryBtn.disabled = true;
    try {
        const catId = catSelect.value;
        const subId = subcatSelect.value;
        if (!catId) return alert("Select category first");
        if (!subId) return alert("Select subcategory first");
        const name = capitalizeWords(newSubsubcategoryName.value.trim());
        if (!name) return alert("Enter sub‑subcategory name");
        const id = slugify(name);
        const existingById = await db.collection("subsubcategories").doc(catId).collection(subId).doc(id).get();
        if (existingById.exists) return alert("Sub‑subcategory already exists");
        await db.collection("subsubcategories").doc(catId).collection(subId).doc(id).set({
            name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newSubsubcategoryName.value = "";
        await loadSubsubcategories(catId, subId, id);
        alert(`Sub‑subcategory "${name}" added successfully!`);
    } catch (error) {
        console.error("Add subsubcategory error:", error);
        alert("Error adding sub‑subcategory: " + error.message);
    } finally {
        addSubsubcategoryBtn.disabled = false;
    }
};

resetCategoryState();
loadCategories();

// ---------- Products Table Logic ----------
let allProducts = [], filteredProducts = [], currentPage = 1, itemsPerPage = 10;
const productsTbody = document.getElementById("productsTableBody");
const searchInput = document.getElementById("searchProducts");
const categoryFilter = document.getElementById("categoryFilter");
const statusFilter = document.getElementById("statusFilter");
const sortBy = document.getElementById("sortBy");
const prevPageBtn = document.getElementById("prevPage"), nextPageBtn = document.getElementById("nextPage"), pageInfo = document.getElementById("pageInfo");

async function loadProductsIntoMemory() {
    const snap = await db.collection("products").get();
    allProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    try {
        const clicksSnap = await rtdb.ref("clicks").once("value");
        const clicksMap = {};
        if(clicksSnap.exists()){
            Object.values(clicksSnap.val()).forEach(userClicks => {
                Object.values(userClicks).forEach(click => {
                    if(click.productId) clicksMap[click.productId] = (clicksMap[click.productId] || 0) + 1;
                });
            });
        }
        allProducts = allProducts.map(p => ({ ...p, clickCount: clicksMap[p.id] || 0 }));
    } catch(e) { console.warn("Could not load clicks", e); allProducts = allProducts.map(p => ({ ...p, clickCount: 0 })); }
    applyFiltersAndRender();
}
function applyFiltersAndRender() {
    let filtered = [...allProducts];
    const searchTerm = searchInput.value.toLowerCase();
    if(searchTerm) filtered = filtered.filter(p => p.title?.toLowerCase().includes(searchTerm) || p.id.toLowerCase().includes(searchTerm));
    const cat = categoryFilter.value;
    if(cat !== "all") filtered = filtered.filter(p => p.category === cat);
    const stat = statusFilter.value;
    if(stat !== "all") filtered = filtered.filter(p => p.status === stat);
    const sort = sortBy.value;
    if(sort === "price_asc") filtered.sort((a,b) => (a.price||0) - (b.price||0));
    else if(sort === "price_desc") filtered.sort((a,b) => (b.price||0) - (a.price||0));
    else if(sort === "date_desc") filtered.sort((a,b) => (b.createdAt?.toMillis?.()||0) - (a.createdAt?.toMillis?.()||0));
    filteredProducts = filtered;
    currentPage = 1;
    renderTablePage();
}
function renderTablePage() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const start = (currentPage-1)*itemsPerPage, end = start+itemsPerPage;
    const pageItems = filteredProducts.slice(start, end);
    if(pageItems.length === 0 && filteredProducts.length === 0) { productsTbody.innerHTML = '<tr><td colspan="8" class="loading-placeholder">No products found.</td></tr>'; }
    else {
        productsTbody.innerHTML = pageItems.map(p => `
            <tr>
                <td><div class="product-name-cell"><img src="${escapeHtml(p.image||'')}" class="product-thumb" onerror="this.src='https://placehold.co/44x44'"><span class="product-name">${escapeHtml(p.title||'')}</span></div></td>
                <td>${escapeHtml(p.category||'')}</td>
                <td><span class="stock-badge">${p.sold !== undefined ? p.sold : 0}</span></td>
                <td>₹${(p.originalPrice||0).toLocaleString()}</td>
                <td>₹${(p.price||0).toLocaleString()}</td>
                <td>${p.clickCount || 0}</td>
                <td><span class="status-badge ${p.status==='active'?'status-active':'status-inactive'}">${p.status||'inactive'}</span></td>
                <td><div class="action-buttons"><button class="action-btn edit" data-id="${p.id}"><i class="fas fa-edit"></i></button><button class="action-btn delete" data-id="${p.id}"><i class="fas fa-trash-alt"></i></button></div></td>
            </tr>
        `).join("");
    }
    pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
}
function nextPage() { if(currentPage < Math.ceil(filteredProducts.length/itemsPerPage)) { currentPage++; renderTablePage(); } }
function prevPage() { if(currentPage > 1) { currentPage--; renderTablePage(); } }
prevPageBtn.onclick = prevPage; nextPageBtn.onclick = nextPage;
searchInput.oninput = applyFiltersAndRender;
categoryFilter.onchange = applyFiltersAndRender;
statusFilter.onchange = applyFiltersAndRender;
sortBy.onchange = applyFiltersAndRender;

// ---------- Product Modal (Add/Edit with full image management) ----------
let currentEditId = null;
let isSaving = false;
const modal = document.getElementById("productModal");
const modalTitle = document.getElementById("modalTitle");
const productIdField = document.getElementById("productId");
const productTitle = document.getElementById("productTitle"), productBrand = document.getElementById("productBrand");
const productCategory = document.getElementById("productCategory"), productSubcategory = document.getElementById("productSubcategory"), productSubsubcategory = document.getElementById("productSubsubcategory");
const productOriginalPrice = document.getElementById("productOriginalPrice"), productPrice = document.getElementById("productPrice");
const discountLabel = document.getElementById("discountLabel"), calcDiscountBtn = document.getElementById("calcDiscountBtn");
const productSold = document.getElementById("productSold"), productRating = document.getElementById("productRating"), productTags = document.getElementById("productTags");
const productMainImage = document.getElementById("productMainImage"), productGallery = document.getElementById("productGallery");
// Two separate containers for image previews (update your HTML accordingly)
const mainImagePreview = document.getElementById("mainImagePreview");
const galleryPreviewContainer = document.getElementById("galleryPreviewContainer");
const affiliateLinksContainer = document.getElementById("affiliateLinksContainer");
const affiliateBadgesContainer = document.getElementById("affiliateBadgesContainer");
const downloadsContainer = document.getElementById("downloadsContainer");
const specificationsContainer = document.getElementById("specificationsContainer");
const extraFieldsContainer = document.getElementById("extraFieldsContainer");
const productDescription = document.getElementById("productDescription"), productStatus = document.getElementById("productStatus");
const saveBtn = document.getElementById("saveProductBtn");

// Global state for image changes during edit
let _removedMainImage = false;
let _removedGalleryIndices = [];   // indices in the original gallery array to delete
let _newGalleryFiles = [];          // array of File objects to upload

function populateCategorySelects() {
    db.collection("categories").orderBy("name").get().then(snap => {
        productCategory.innerHTML = '<option value="">Select Category</option>';
        snap.forEach(d => { productCategory.innerHTML += `<option value="${d.id}">${escapeHtml(d.data().name)}</option>`; });
    });
}

productCategory.onchange = async () => {
    productSubcategory.innerHTML = '<option value="">Select Subcategory</option>';
    productSubsubcategory.innerHTML = '<option value="">Select Sub-subcategory</option>';
    productSubsubcategory.disabled = true;
    if(!productCategory.value) {
        productSubcategory.disabled = true;
        return;
    }
    productSubcategory.disabled = false;
    const snap = await db.collection("categories").doc(productCategory.value).collection("list").orderBy("name").get();
    snap.forEach(d => {
        productSubcategory.innerHTML += `<option value="${d.id}">${escapeHtml(d.data().name)}</option>`;
    });
};

productSubcategory.onchange = async () => {
    productSubsubcategory.innerHTML = '<option value="">Select Sub-subcategory</option>';
    if(!productSubcategory.value) {
        productSubsubcategory.disabled = true;
        return;
    }
    productSubsubcategory.disabled = false;
    const snap = await db.collection("subsubcategories").doc(productCategory.value).collection(productSubcategory.value).orderBy("name").get();
    snap.forEach(d => {
        productSubsubcategory.innerHTML += `<option value="${d.id}">${escapeHtml(d.data().name)}</option>`;
    });
};

calcDiscountBtn.onclick = () => {
    const price = parseFloat(productPrice.value), original = parseFloat(productOriginalPrice.value);
    if(price && original && original>0) { const disc = Math.round(((original-price)/original)*100); discountLabel.value = `${disc}% OFF`; }
    else alert("Enter both original and deal price");
};

// Dynamic rows helpers
function addAffiliateRow(store="", url="") {
    const div = document.createElement("div"); div.className = "dynamic-row";
    div.innerHTML = `<input type="text" placeholder="Store name" value="${escapeAttr(store)}"><input type="url" placeholder="Affiliate URL" value="${escapeAttr(url)}"><button type="button" class="remove-row">&times;</button>`;
    div.querySelector(".remove-row").onclick = () => div.remove();
    affiliateLinksContainer.appendChild(div);
}
function addAffiliateBadgeRow(badge="") {
    const div = document.createElement("div"); div.className = "dynamic-row";
    div.innerHTML = `<input type="text" placeholder="Badge text" value="${escapeAttr(badge)}"><button type="button" class="remove-row">&times;</button>`;
    div.querySelector(".remove-row").onclick = () => div.remove();
    affiliateBadgesContainer.appendChild(div);
}
function addDownloadRow(name="", url="") {
    const div = document.createElement("div"); div.className = "dynamic-row";
    div.innerHTML = `<input type="text" placeholder="File name" value="${escapeAttr(name)}"><input type="url" placeholder="File URL" value="${escapeAttr(url)}"><button type="button" class="remove-row">&times;</button>`;
    div.querySelector(".remove-row").onclick = () => div.remove();
    downloadsContainer.appendChild(div);
}
function addSpecificationRow(name="", value="") {
    const div = document.createElement("div"); div.className = "dynamic-row";
    div.innerHTML = `<input type="text" placeholder="Attribute" value="${escapeAttr(name)}"><input type="text" placeholder="Value" value="${escapeAttr(value)}"><button type="button" class="remove-row">&times;</button>`;
    div.querySelector(".remove-row").onclick = () => div.remove();
    specificationsContainer.appendChild(div);
}
function addExtraFieldRow(key="", val="") {
    const div = document.createElement("div"); div.className = "dynamic-row";
    div.innerHTML = `<input type="text" placeholder="Field name" value="${escapeAttr(key)}"><input type="text" placeholder="Value" value="${escapeAttr(val)}"><button type="button" class="remove-row">&times;</button>`;
    div.querySelector(".remove-row").onclick = () => div.remove();
    extraFieldsContainer.appendChild(div);
}

document.getElementById("addAffiliateLinkBtn").onclick = () => addAffiliateRow();
document.getElementById("addAffiliateBadgeBtn").onclick = () => addAffiliateBadgeRow();
document.getElementById("addDownloadBtn").onclick = () => addDownloadRow();
document.getElementById("addSpecificationBtn").onclick = () => addSpecificationRow();
document.getElementById("addExtraFieldBtn").onclick = () => addExtraFieldRow();

// Handle new gallery files selection (append to _newGalleryFiles and preview)
productGallery.onchange = () => {
    const files = Array.from(productGallery.files);
    files.forEach(file => {
        // Avoid duplicates? simple: add all
        _newGalleryFiles.push(file);
        const wrapper = document.createElement("div");
        wrapper.className = "preview-item new-gallery-item";
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.style.width = "80px"; img.style.height = "80px"; img.style.objectFit = "cover";
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "✖";
        removeBtn.type = "button";
        removeBtn.onclick = () => {
            wrapper.remove();
            // remove this file from _newGalleryFiles
            const idx = _newGalleryFiles.findIndex(f => f === file);
            if (idx !== -1) _newGalleryFiles.splice(idx, 1);
        };
        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        galleryPreviewContainer.appendChild(wrapper);
    });
    productGallery.value = ""; // allow reselecting same files
};

// Helper to render existing images in edit mode
function renderExistingImages(productData) {
    // Main image
    mainImagePreview.innerHTML = "";
    if (productData.image) {
        const wrapper = document.createElement("div");
        wrapper.className = "preview-item main-preview";
        const img = document.createElement("img");
        img.src = productData.image;
        img.style.width = "100px"; img.style.height = "100px"; img.style.objectFit = "cover";
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "✖";
        removeBtn.type = "button";
        removeBtn.onclick = () => {
            wrapper.remove();
            _removedMainImage = true;
            // Also delete from storage? We'll do it on save.
        };
        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        mainImagePreview.appendChild(wrapper);
    }
    // Gallery images
    galleryPreviewContainer.innerHTML = "";
    _removedGalleryIndices = [];
    if (productData.gallery && productData.gallery.length) {
        productData.gallery.forEach((url, idx) => {
            const wrapper = document.createElement("div");
            wrapper.className = "preview-item gallery-preview";
            const img = document.createElement("img");
            img.src = url;
            img.style.width = "80px"; img.style.height = "80px"; img.style.objectFit = "cover";
            const removeBtn = document.createElement("button");
            removeBtn.textContent = "✖";
            removeBtn.type = "button";
            removeBtn.onclick = () => {
                wrapper.remove();
                _removedGalleryIndices.push(idx);
            };
            wrapper.appendChild(img);
            wrapper.appendChild(removeBtn);
            galleryPreviewContainer.appendChild(wrapper);
        });
    }
}

async function updatePriceHistory(productId, oldPrice, newPrice) {
    if(oldPrice === newPrice) return;
    const productRef = db.collection("products").doc(productId);
    const doc = await productRef.get();
    if(!doc.exists) return;
    const currentHistory = doc.data().priceHistory || [];
    const newEntry = { date: new Date().toISOString().split('T')[0], price: newPrice };
    currentHistory.push(newEntry);
    if(currentHistory.length > 30) currentHistory.shift();
    await productRef.update({ priceHistory: currentHistory });
}

async function saveProduct() {
    if (isSaving) return;
    isSaving = true;
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        let title = capitalizeWords(productTitle.value.trim());
        if(!title) throw new Error("Title required");
        const price = parseFloat(productPrice.value);
        if(isNaN(price)) throw new Error("Deal price required");
        const originalPrice = parseFloat(productOriginalPrice.value) || null;
        let brand = productBrand.value.trim();
        if (brand) brand = capitalizeWords(brand);
        const category = productCategory.value;
        if(!category) throw new Error("Select category");
        const subcategory = productSubcategory.value || "";
        const subsubcategory = productSubsubcategory.value || "";
        const sold = parseInt(productSold.value) || 0;
        let rating = parseFloat(productRating.value) || 0;
        if (rating < 0) rating = 0;
        if (rating > 5) rating = 5;
        const tags = productTags.value.split(",").map(t=>capitalizeWords(t.trim())).filter(t=>t);
        const description = productDescription.value;
        const status = productStatus.value;
        
        const affiliateLinks = Array.from(affiliateLinksContainer.querySelectorAll(".dynamic-row")).map(row => {
            const inputs = row.querySelectorAll("input");
            return { store: capitalizeWords(inputs[0].value.trim()), url: inputs[1].value.trim() };
        }).filter(l => l.store && l.url);
        
        const affiliateBadges = Array.from(affiliateBadgesContainer.querySelectorAll(".dynamic-row")).map(row => {
            return capitalizeWords(row.querySelector("input").value.trim());
        }).filter(b => b);
        
        const downloads = Array.from(downloadsContainer.querySelectorAll(".dynamic-row")).map(row => {
            const inputs = row.querySelectorAll("input");
            return { name: capitalizeWords(inputs[0].value.trim()), url: inputs[1].value.trim() };
        }).filter(d => d.name && d.url);
        
        const specifications = {};
        Array.from(specificationsContainer.querySelectorAll(".dynamic-row")).forEach(row => {
            const inputs = row.querySelectorAll("input");
            if(inputs[0].value && inputs[1].value) specifications[capitalizeWords(inputs[0].value.trim())] = capitalizeWords(inputs[1].value.trim());
        });
        
        const extraFields = {};
        Array.from(extraFieldsContainer.querySelectorAll(".dynamic-row")).forEach(row => {
            const inputs = row.querySelectorAll("input");
            if(inputs[0].value && inputs[1].value) extraFields[capitalizeWords(inputs[0].value.trim())] = capitalizeWords(inputs[1].value.trim());
        });
        
        const productId = currentEditId || slugify(title)+"-"+Date.now();
        let finalMainImage = null;
        let finalGallery = [];
        
        // Fetch existing product data if editing
        let existingData = null;
        if(currentEditId) {
            const doc = await db.collection("products").doc(productId).get();
            if(doc.exists) existingData = doc.data();
        }
        
        // Handle main image
        if (productMainImage.files.length > 0) {
            // New main image uploaded
            finalMainImage = await uploadImage(productMainImage.files[0], `products/${productId}/main.jpg`);
            if (existingData && existingData.image) {
                // Optionally delete old main image from storage
                await deleteStorageFile(existingData.image);
            }
        } else if (currentEditId && !_removedMainImage && existingData && existingData.image) {
            // Keep existing main image
            finalMainImage = existingData.image;
        } else {
            // Main image removed or not set -> null
            finalMainImage = null;
        }
        
        // Handle gallery
        // Start with existing gallery (if any) minus removed indices
        let keptGallery = [];
        if (existingData && existingData.gallery && !_removedGalleryIndices.length) {
            keptGallery = [...existingData.gallery];
        } else if (existingData && existingData.gallery) {
            keptGallery = existingData.gallery.filter((_, idx) => !_removedGalleryIndices.includes(idx));
            // Delete removed images from storage
            for (let idx of _removedGalleryIndices) {
                const url = existingData.gallery[idx];
                if (url) await deleteStorageFile(url);
            }
        }
        
        // Upload new gallery files
        const newGalleryUrls = [];
        for (let file of _newGalleryFiles) {
            const url = await uploadImage(file, `products/${productId}/gallery/${Date.now()}_${file.name}`);
            newGalleryUrls.push(url);
        }
        finalGallery = [...keptGallery, ...newGalleryUrls].slice(0, 8);
        
        const discount = discountLabel.value ? parseInt(discountLabel.value) : 0;
        const offer = discountLabel.value || "";
        
        const productData = {
            id: productId, title, brand, price, originalPrice, discount, offer,
            sold, rating, tags, category, subcategory, subsubcategory,
            image: finalMainImage, gallery: finalGallery,
            affiliateLinks, affiliateBadges, downloads, specifications, extraFields,
            description, status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if(!currentEditId) productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        
        if(currentEditId && existingData && existingData.price !== price) {
            await updatePriceHistory(productId, existingData.price, price);
        } else if(!currentEditId) {
            productData.priceHistory = [{ date: new Date().toISOString().split('T')[0], price: price }];
        }
        
        await db.collection("products").doc(productId).set(productData, { merge: true });
        alert("Product saved!");
        modal.style.display = "none";
        // Reset image state variables
        _removedMainImage = false;
        _removedGalleryIndices = [];
        _newGalleryFiles = [];
        productMainImage.value = "";
        productGallery.value = "";
        await loadProductsIntoMemory();
    } catch (err) {
        alert("Error: " + err.message);
        console.error(err);
    } finally {
        isSaving = false;
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Product";
    }
}
saveBtn.onclick = saveProduct;

// Edit and Delete handlers
document.addEventListener("click", (e) => {
    if(e.target.closest(".edit")) {
        const id = e.target.closest(".edit").dataset.id;
        openEditModal(id);
    }
    if(e.target.closest(".delete")) {
        const id = e.target.closest(".delete").dataset.id;
        const product = allProducts.find(p => p.id === id);
        document.getElementById("deleteProductName").innerText = product?.title || "";
        currentEditId = id;
        document.getElementById("deleteProductModal").style.display = "flex";
    }
});

async function openEditModal(id) {
    const doc = await db.collection("products").doc(id).get();
    if(!doc.exists) return;
    const p = doc.data();
    currentEditId = id;
    modalTitle.innerHTML = "<i class='fas fa-edit'></i> Edit Product";
    productIdField.value = id;
    productTitle.value = p.title;
    productBrand.value = p.brand || "";
    productOriginalPrice.value = p.originalPrice || "";
    productPrice.value = p.price;
    discountLabel.value = p.offer || "";
    productSold.value = p.sold || 0;
    productRating.value = p.rating || 0;
    productTags.value = (p.tags||[]).join(", ");
    productDescription.value = p.description || "";
    productStatus.value = p.status || "active";
    
    affiliateLinksContainer.innerHTML = "";
    (p.affiliateLinks||[]).forEach(l => addAffiliateRow(l.store, l.url));
    affiliateBadgesContainer.innerHTML = "";
    (p.affiliateBadges||[]).forEach(b => addAffiliateBadgeRow(b));
    downloadsContainer.innerHTML = "";
    (p.downloads||[]).forEach(d => addDownloadRow(d.name, d.url));
    specificationsContainer.innerHTML = "";
    if(p.specifications) Object.entries(p.specifications).forEach(([k,v]) => addSpecificationRow(k,v));
    extraFieldsContainer.innerHTML = "";
    if(p.extraFields) Object.entries(p.extraFields).forEach(([k,v]) => addExtraFieldRow(k,v));
    
    // Reset image state
    _removedMainImage = false;
    _removedGalleryIndices = [];
    _newGalleryFiles = [];
    productMainImage.value = "";
    productGallery.value = "";
    renderExistingImages(p);
    
    // Set category and wait for subcategories to load
    productCategory.value = p.category;
    await new Promise((resolve) => {
        productCategory.dispatchEvent(new Event("change"));
        const observer = new MutationObserver((mutations, obs) => {
            if (productSubcategory.options.length > 1) {
                obs.disconnect();
                resolve();
            }
        });
        observer.observe(productSubcategory, { childList: true, subtree: true });
        setTimeout(() => { observer.disconnect(); resolve(); }, 3000);
    });
    
    productSubcategory.value = p.subcategory;
    await new Promise((resolve) => {
        productSubcategory.dispatchEvent(new Event("change"));
        const observer = new MutationObserver((mutations, obs) => {
            if (productSubsubcategory.options.length > 1) {
                obs.disconnect();
                resolve();
            }
        });
        observer.observe(productSubsubcategory, { childList: true, subtree: true });
        setTimeout(() => { observer.disconnect(); resolve(); }, 3000);
    });
    
    productSubsubcategory.value = p.subsubcategory;
    
    modal.style.display = "flex";
}

document.getElementById("confirmDeleteProductBtn").onclick = async () => {
    if(currentEditId) {
        const product = allProducts.find(p => p.id === currentEditId);
        if (product) {
            // Delete images from storage (optional)
            if (product.image) await deleteStorageFile(product.image);
            if (product.gallery && product.gallery.length) {
                for (let url of product.gallery) await deleteStorageFile(url);
            }
        }
        await db.collection("products").doc(currentEditId).delete();
        alert("Deleted");
        loadProductsIntoMemory();
    }
    document.getElementById("deleteProductModal").style.display = "none";
};
document.querySelectorAll(".modal-close, .modal-cancel").forEach(el => el.onclick = () => { modal.style.display = "none"; document.getElementById("deleteProductModal").style.display = "none"; });
document.getElementById("addProductBtn").onclick = () => {
    currentEditId = null;
    modalTitle.innerHTML = "<i class='fas fa-plus-circle'></i> Add Product";
    document.getElementById("productModal").querySelectorAll("input, select, textarea").forEach(f => { if(f.type !== "file") f.value = ""; });
    productSold.value = "0";
    affiliateLinksContainer.innerHTML = "";
    affiliateBadgesContainer.innerHTML = "";
    downloadsContainer.innerHTML = "";
    specificationsContainer.innerHTML = "";
    extraFieldsContainer.innerHTML = "";
    mainImagePreview.innerHTML = "";
    galleryPreviewContainer.innerHTML = "";
    productCategory.value = "";
    productSubcategory.innerHTML = '<option value="">Select Subcategory</option>';
    productSubsubcategory.innerHTML = '<option value="">Select Sub-subcategory</option>';
    // Reset image state
    _removedMainImage = false;
    _removedGalleryIndices = [];
    _newGalleryFiles = [];
    productMainImage.value = "";
    productGallery.value = "";
    modal.style.display = "flex";
};

async function loadCategoryFilter() {
    const snap = await db.collection("categories").orderBy("name").get();
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    snap.forEach(d => { categoryFilter.innerHTML += `<option value="${d.id}">${escapeHtml(d.data().name)}</option>`; });
}
// ======================== AUTOCOMPLETE: 5 most recent products ========================
function getRecentProducts(query = "") {
    const sorted = [...allProducts].sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
    });
    if (query.trim() === "") return sorted.slice(0, 5);
    const lowerQuery = query.toLowerCase();
    const matches = sorted.filter(p => p.title?.toLowerCase().includes(lowerQuery));
    return matches.slice(0, 5);
}

async function fillFormWithProductData(product) {
    // Clear images and previews
    mainImagePreview.innerHTML = "";
    galleryPreviewContainer.innerHTML = "";
    productMainImage.value = "";
    productGallery.value = "";
    _removedMainImage = false;
    _removedGalleryIndices = [];
    _newGalleryFiles = [];

    // Basic fields
    productTitle.value = product.title || "";
    productBrand.value = product.brand || "";
    productOriginalPrice.value = product.originalPrice || "";
    productPrice.value = product.price || "";
    discountLabel.value = product.offer || "";
    productSold.value = product.sold || 0;
    productRating.value = product.rating || 0;
    productTags.value = (product.tags || []).join(", ");
    productDescription.value = product.description || "";
    productStatus.value = product.status || "active";

    // Video URL if exists
    const videoUrlField = document.getElementById("productVideoUrl");
    if (videoUrlField) videoUrlField.value = product.videoUrl || "";

    // Dynamic rows
    affiliateBadgesContainer.innerHTML = "";
    (product.affiliateBadges || []).forEach(b => addAffiliateBadgeRow(b));
    downloadsContainer.innerHTML = "";
    (product.downloads || []).forEach(d => addDownloadRow(d.name, d.url));
    affiliateLinksContainer.innerHTML = "";
    (product.affiliateLinks || []).forEach(l => addAffiliateRow(l.store, l.url));
    specificationsContainer.innerHTML = "";
    if (product.specifications) Object.entries(product.specifications).forEach(([k, v]) => addSpecificationRow(k, v));
    extraFieldsContainer.innerHTML = "";
    if (product.extraFields) Object.entries(product.extraFields).forEach(([k, v]) => addExtraFieldRow(k, v));

    // Category & subcategories (async)
    productCategory.value = product.category;
    await new Promise((resolve) => {
        productCategory.dispatchEvent(new Event("change"));
        const observer = new MutationObserver((mutations, obs) => {
            if (productSubcategory.options.length > 1) {
                obs.disconnect();
                resolve();
            }
        });
        observer.observe(productSubcategory, { childList: true, subtree: true });
        setTimeout(() => { observer.disconnect(); resolve(); }, 3000);
    });
    productSubcategory.value = product.subcategory || "";
    await new Promise((resolve) => {
        productSubcategory.dispatchEvent(new Event("change"));
        const observer = new MutationObserver((mutations, obs) => {
            if (productSubsubcategory.options.length > 1) {
                obs.disconnect();
                resolve();
            }
        });
        observer.observe(productSubsubcategory, { childList: true, subtree: true });
        setTimeout(() => { observer.disconnect(); resolve(); }, 3000);
    });
    productSubsubcategory.value = product.subsubcategory || "";
}

// Function to render suggestions based on a query
function renderSuggestions(query) {
    const recentProducts = getRecentProducts(query);
    if (recentProducts.length === 0) {
        suggestionsBox.style.display = "none";
        return;
    }
    suggestionsBox.innerHTML = recentProducts.map(p => `
        <div class="suggestion-item" data-id="${p.id}">
            <img src="${escapeHtml(p.image || 'https://placehold.co/40x40')}" 
                 onerror="this.src='https://placehold.co/40x40'">
            <div>
                <strong>${escapeHtml(p.title)}</strong><br>
                <small>₹${(p.price || 0).toLocaleString()}</small>
            </div>
        </div>
    `).join("");
    suggestionsBox.style.display = "block";

    // Attach click handlers to new suggestion items
    document.querySelectorAll(".suggestion-item").forEach(item => {
        item.removeEventListener("click", suggestionClickHandler);
        item.addEventListener("click", suggestionClickHandler);
    });
}

// Shared click handler for suggestions
async function suggestionClickHandler(event) {
    event.stopPropagation();
    const productId = this.dataset.id;
    const selectedProduct = allProducts.find(p => p.id === productId);
    if (selectedProduct) {
        await fillFormWithProductData(selectedProduct);
        suggestionsBox.style.display = "none";
        titleInput.value = selectedProduct.title;
        if (currentEditId !== null) {
            // Switch to add mode if we were editing
            currentEditId = null;
            modalTitle.innerHTML = "<i class='fas fa-plus-circle'></i> Add Product";
        }
    }
}

const titleInput = document.getElementById("productTitle");
const suggestionsBox = document.getElementById("titleSuggestions");

// Show suggestions on focus (empty query -> 5 most recent)
titleInput.addEventListener("focus", () => {
    if (currentEditId !== null) return; // disabled in edit mode
    renderSuggestions("");
});

// Filter suggestions as user types
titleInput.addEventListener("input", (e) => {
    if (currentEditId !== null) return;
    renderSuggestions(e.target.value);
});

// Hide suggestions when clicking outside
document.addEventListener("click", (e) => {
    if (!titleInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.style.display = "none";
    }
});
loadCategoryFilter();
loadProductsIntoMemory();
populateCategorySelects();