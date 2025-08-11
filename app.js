// app.js — Google Books + Infinite Scroll + Cart + Notifications

// ============ CONFIG ============
const API_KEY = "AIzaSyD7l5ueQMjH3vpWsJ0IcR2E4hN3Q6dCAPg";
const MAX_RESULTS = 12;

// ============ STATE ============
let lastQuery = "";
let startIndex = 0;
let loading = false;
let totalItems = null;
let books = [];
let cart = [];


// ============ DOM ============
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resultsEl = document.getElementById("results");
const categoriesEl = document.getElementById("categories");
const cartToggle = document.getElementById("cartToggle");
const cartCountEl = document.getElementById("cartCount");

let cartPopup = document.getElementById("cart-popup");
let cartItemsTbody = document.getElementById("cart-items");
let cartTotalEl = document.getElementById("total-price");
let checkoutBtn = document.getElementById("checkout-btn");
let closeCartBtn = document.getElementById("close-cart-btn");

// ============ PREVIEW POPUP ============
let previewPopup = document.getElementById("preview-popup");
if (!previewPopup) {
  previewPopup = document.createElement("div");
  previewPopup.id = "preview-popup";
  previewPopup.className = "hidden";
  previewPopup.innerHTML = `
    <div class="preview-modal">
      <button id="preview-close" class="preview-close">Đóng</button>
      <iframe id="preview-iframe" class="preview-iframe" src="" frameborder="0"></iframe>
    </div>
  `;
  document.body.appendChild(previewPopup);
  const s = document.createElement("style");
  s.innerHTML = `
    #preview-popup { position: fixed; inset: 0; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.5); z-index:1200; }
    #preview-popup.hidden{display:none}
    .preview-modal{width:80%; max-width:900px; background:#fff; border-radius:8px; overflow:hidden; position:relative}
    .preview-close{position:absolute; right:8px; top:8px; z-index:10; padding:6px 8px; cursor:pointer}
    .preview-iframe{width:100%; height:70vh; border:0; display:block}
  `;
  document.head.appendChild(s);
}
const previewIframe = document.getElementById("preview-iframe");
const previewClose = document.getElementById("preview-close");

// ============ NOTIFICATION POPUP ============
let notifyPopup = document.getElementById("notify-popup");
if (!notifyPopup) {
  notifyPopup = document.createElement("div");
  notifyPopup.id = "notify-popup";
  notifyPopup.className = "hidden";
  document.body.appendChild(notifyPopup);
  const style = document.createElement("style");
  style.innerHTML = `
    #notify-popup {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 10px 16px;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      font-size: 14px;
      z-index: 2000;
      opacity: 0;
      transform: translateY(-10px);
      transition: all 0.3s ease;
    }
    #notify-popup.show {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);
}
function showNotification(message, color="#4caf50") {
  notifyPopup.textContent = message;
  notifyPopup.style.background = color;
  notifyPopup.classList.add("show");
  setTimeout(() => {
    notifyPopup.classList.remove("show");
  }, 2500);
}

// ============ HELPERS ============
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function formatMoney(n){ return (Math.round(n*100)/100).toLocaleString(); }
function findCartItem(id, type){
  return cart.find(it => it.id === id && it.type === type);
}
function addToCart(item){
  const existing = findCartItem(item.id, item.type);
  if (existing) existing.qty += 1;
  else cart.push({...item, qty:1});
  renderCart();
}
function renderCart(){
  const count = cart.reduce((s,i)=>s+i.qty,0);
  if (cartCountEl) cartCountEl.textContent = count;
  cartItemsTbody.innerHTML = "";
  let total = 0;
  cart.forEach(it=>{
    const tr = document.createElement("tr");
    const itemTotal = it.price * it.qty;
    total += itemTotal;
    tr.innerHTML = `<td>${it.title}${it.type === 'rent' ? ' <small>(Thuê)</small>' : ''}</td>
                    <td>${formatMoney(it.price)} VND</td>
                    <td>${it.qty}</td>
                    <td>${formatMoney(itemTotal)} VND</td>`;
    cartItemsTbody.appendChild(tr);
  });
  cartTotalEl.textContent = formatMoney(total);
}

// ============ SEARCH & LOAD ============
function buildEndpoint(query, index){
  return `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&startIndex=${index}&maxResults=${MAX_RESULTS}&key=${API_KEY}`;
}
async function loadBooks(append = false){
  if (!lastQuery || loading) return;
  loading = true;
  if (!append) resultsEl.innerHTML = `<div>Đang tải...</div>`;
  try {
    const url = buildEndpoint(lastQuery, startIndex);
    const res = await fetch(url);
    const json = await res.json();
    const items = json.items || [];
    totalItems = json.totalItems ?? null;
    if (append) books = books.concat(items);
    else books = items;
    renderBooks(items, append);
    startIndex += MAX_RESULTS;
  } catch (e){
    console.error(e);
  } finally {
    loading = false;
  }
}
function performSearchFromInput(){
  const q = (searchInput && searchInput.value || "").trim();
  if (!q) return;
  lastQuery = q;
  startIndex = 0;
  books = [];
  totalItems = null;
  loadBooks(false);
}

// ============ RENDER BOOKS ============
function renderBooks(items, append=false){
  const html = (items||[]).map(it=>{
    const info = it.volumeInfo || {};
    const title = info.title || "Không có tiêu đề";
    const authors = (info.authors || []).join(", ");
    const thumb = info.imageLinks?.thumbnail || "";
    let salePrice = it.saleInfo?.listPrice?.amount ?? (Math.round((Math.random()*20 + 5)*100)/100);
    const rentPrice = Math.round(salePrice * 0.30 * 100)/100;
    const id = it.id;
    return `
      <div class="book-card" data-id="${id}">
        <div class="book-cover">${thumb ? `<img src="${thumb}" alt="${title}"/>` : `<div>No Image</div>`}</div>
        <div class="book-body">
          <div class="book-title">${title}</div>
          <div class="book-auth">${authors}</div>
          <div class="book-actions">
            <button class="action-btn buy-btn" data-id="${id}" data-type="buy" data-price="${salePrice}" data-title="${title}">Mua ${salePrice.toFixed(2)} VND</button>
            <button class="action-btn rent-btn" data-id="${id}" data-type="rent" data-price="${rentPrice}" data-title="${title}">Thuê ${rentPrice.toFixed(2)} VND</button>
            <button class="action-btn preview-btn" data-id="${id}" data-preview="${info.previewLink || ''}" data-title="${title}">Đọc thử</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
  if (!append) resultsEl.innerHTML = html || `<div>Không tìm thấy sách phù hợp.</div>`;
  else resultsEl.insertAdjacentHTML("beforeend", html);
}

// ============ EVENT DELEGATION ============
resultsEl && resultsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  // Kiểm tra đăng nhập trước khi làm bất kỳ hành động nào
  if (!requireLogin(e)) return;

  if (btn.classList.contains("buy-btn")) {
    const id = btn.dataset.id;
    const title = btn.dataset.title || "No title";
    const price = parseFloat(btn.dataset.price) || 0;
    addToCart({ id, title, price, type: "buy" });
    showNotification(`Đã mua "${title}" thành công!`);
    return;
  }

  if (btn.classList.contains("rent-btn")) {
    const id = btn.dataset.id;
    const title = btn.dataset.title ? btn.dataset.title + " (Thuê)" : "No title";
    const price = parseFloat(btn.dataset.price) || 0;
    addToCart({ id, title, price, type: "rent" });
    showNotification(`Đã thuê "${title}" thành công!`, "#2196f3");
    return;
  }

  if (btn.classList.contains("preview-btn")) {
    const previewLink = btn.dataset.preview;
    openPreview(previewLink, btn.dataset.id);
    return;
  }
});


// ============ PREVIEW FUNCTIONS ============
function openPreview(previewLink, id){
  let url = previewLink || `https://books.google.com/books?id=${encodeURIComponent(id)}&output=embed`;
  if (url.includes("books.google") && !url.includes("output=embed")) {
    url += (url.includes("?") ? "&" : "?") + "output=embed";
  }
  previewIframe.src = url;
  previewPopup.classList.remove("hidden");
}
previewClose && previewClose.addEventListener("click", ()=>{
  previewIframe.src = "";
  previewPopup.classList.add("hidden");
});
previewPopup.addEventListener("click", (e)=>{
  if (e.target === previewPopup) {
    previewIframe.src = "";
    previewPopup.classList.add("hidden");
  }
});

// ============ CART EVENTS ============
cartToggle && cartToggle.addEventListener("click", (e) => {
  if (!requireLogin(e)) return; // ⛔ Chặn nếu chưa login
  renderCart();
  cartPopup.classList.remove("hidden");
});

closeCartBtn && closeCartBtn.addEventListener("click", (e) => {
  if (!requireLogin(e)) return; // ⛔ Chặn nếu chưa login
  cartPopup.classList.add("hidden");
});

cartPopup.addEventListener("click", (e) => {
  if (!requireLogin(e)) return; // ⛔ Chặn nếu chưa login
  if (e.target === cartPopup) cartPopup.classList.add("hidden");
});

checkoutBtn && checkoutBtn.addEventListener("click", (e) => {
  if (!requireLogin(e)) return; // ⛔ Chặn nếu chưa login
  if (cart.length === 0) { 
    alert("Giỏ hàng trống!"); 
    return; 
  }
  alert("Thanh toán thành công!");
  cart = [];
  renderCart();
  cartPopup.classList.add("hidden");
});


// ============ INFINITE SCROLL ============
window.addEventListener("scroll", ()=>{
  if (loading) return;
  if (totalItems !== null && books.length >= totalItems) return;
  if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 220) {
    loadBooks(true);
  }
});

// ============ CATEGORIES CLICK ============
if (categoriesEl){
  categoriesEl.addEventListener("click", (e)=>{
    const li = e.target.closest("li[data-category]");
    if (!li) return;
    const cat = li.dataset.category;
    if (!cat) return;
    lastQuery = `subject:${cat}`;
    startIndex = 0;
    books = [];
    totalItems = null;
    loadBooks(false);
    qsa("#categories li").forEach(x=>x.classList.remove("active"));
    li.classList.add("active");
  });
}

// ============ SEARCH BUTTON ============
if (searchBtn) searchBtn.addEventListener("click", performSearchFromInput);
if (searchInput) searchInput.addEventListener("keydown", (e)=> { if (e.key === "Enter") performSearchFromInput(); });

// Init default
(function initDefault(){
  if (!lastQuery) {
    lastQuery = "bestseller";
    startIndex = 0;
    loadBooks(false);
  }
})();

// Mở popup
document.getElementById("show-register").addEventListener("click", () => {
  document.getElementById("register-popup").classList.add("show");
});
document.getElementById("show-login").addEventListener("click", () => {
  document.getElementById("login-popup").classList.add("show");
});

// Đóng popup
document.querySelectorAll(".close-popup").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.closest(".popup").classList.remove("show");
  });
});

// Đăng ký
document.getElementById("register-btn").addEventListener("click", () => {
  const username = document.getElementById("reg-username").value.trim();
  const password = document.getElementById("reg-password").value.trim();

  if (!username || !password) {
    alert("Vui lòng nhập đầy đủ thông tin");
    return;
  }

  if (localStorage.getItem(username)) {
    alert("Tên đăng nhập đã tồn tại");
    return;
  }

  // Lưu tài khoản
  localStorage.setItem(username, password);

  // Tự động đăng nhập
  loggedInUser = username;
  localStorage.setItem("loggedInUser", username);

  alert("Đăng ký thành công và đã đăng nhập!");
  document.getElementById("register-popup").classList.remove("show");
  document.getElementById("logout-btn").style.display = "inline-block";

});


// Đăng nhập
document.getElementById("login-btn").addEventListener("click", () => {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!username || !password) {
    alert("Vui lòng nhập đầy đủ thông tin");
    return;
  }

  const storedPassword = localStorage.getItem(username);
  if (storedPassword && storedPassword === password) {
    loggedInUser = username;
    localStorage.setItem("loggedInUser", username);
    alert("Đăng nhập thành công!");
    document.getElementById("login-popup").classList.remove("show");
    document.getElementById("logout-btn").style.display = "inline-block";
    document.getElementById("username-display").textContent = loggedInUser;
    document.getElementById("user-info").classList.remove("hidden");

  } else {
    alert("Sai tên đăng nhập hoặc mật khẩu");
  }
});


let loggedInUser = localStorage.getItem("loggedInUser") || null;




function requireLogin(e) {
  if (!loggedInUser) {
    document.getElementById("username-display").textContent = loggedInUser;
    ocument.getElementById("user-info").classList.remove("hidden");
    alert("⚠ Bạn cần đăng nhập để sử dụng chức năng này!");
    if (e) {
      e.preventDefault();     // Ngăn hành vi mặc định
      e.stopImmediatePropagation(); // Ngăn tất cả handler khác chạy
    }
    return false;
  }
  return true;
}


document.addEventListener("click", function(e) {
  const blockedSelectors = [
    ".buy-btn", ".rent-btn", ".read-btn",
    "#cartToggle", "#search-btn", ".category-item"
  ];

  if (blockedSelectors.some(sel => e.target.closest(sel))) {
    if (!requireLogin()) {
      e.preventDefault();
      return;
    }
  }
}, true);

// Xử lý đăng xuất
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    loggedInUser = null;
    alert("🚪 Bạn đã đăng xuất!");
    logoutBtn.style.display = "none";
    document.getElementById("user-info").classList.add("hidden");
    location.reload();
  });
}

// Khi load trang, nếu có user thì hiện nút đăng xuất
if (loggedInUser) {
  document.getElementById("logout-btn").style.display = "inline-block";
}


