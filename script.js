

const CART_KEY = "sport_store_cart_v1";



function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function updateCartCount() {
  const countEl = document.getElementById("cart-count");
  if (!countEl) return;
  const cart = loadCart();
  const qty = cart.reduce((s, it) => s + it.quantity, 0);
  countEl.textContent = qty;
}

/* ---------- Index page: render products ---------- */

function renderProductsGrid(filter = {}) {
  const grid = document.getElementById("products-grid");
  if (!grid) return;
  let list = [...products];

  // search
  if (filter.q) {
    const q = filter.q.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        (p.name + " " + p.description + " " + (p.category||"")).toLowerCase().includes(q)
      );
    }
  }

  if (filter.category) {
    list = list.filter(p => p.category === filter.category);
  }

  if (filter.sort === "price-asc") list.sort((a,b)=>a.price-b.price);
  else if (filter.sort === "price-desc") list.sort((a,b)=>b.price-a.price);
  else list.sort((a,b)=>b.id - a.id); // newest = higher id

  grid.innerHTML = list.map(p => productCardHTML(p)).join("");
  attachAddButtons();
}

function productCardHTML(p) {
  return `
    <article class="card" data-id="${p.id}">
      <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" />
      <h3>${escapeHtml(p.name)}</h3>
      <p class="meta">${escapeHtml(p.category)}</p>
      <p class="price">${formatPrice(p.price)} <small>EGP</small></p>
      <div class="actions">
        <a class="btn" href="product.html?id=${p.id}">عرض</a>
        <button class="btn add-to-cart" data-id="${p.id}">أضف للسلة</button>
      </div>
    </article>
  `;
}

function attachAddButtons() {
  document.querySelectorAll(".add-to-cart").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-id"));
      addToCart(id, 1);
      showToast("تمت الإضافة للسلة");
    });
  });
}

/* ---------- Product page ---------- */

function renderProductDetail() {
  const el = document.getElementById("product-detail");
  if (!el) return;
  const id = getQueryParam("id");
  const pid = Number(id);
  const p = products.find(x => x.id === pid);
  if (!p) {
    el.innerHTML = "<p>المنتج غير موجود.</p>";
    return;
  }

  el.innerHTML = `
    <div>
      <img src="${p.image}" alt="${escapeHtml(p.name)}" />
    </div>
    <div class="product-info">
      <h2>${escapeHtml(p.name)}</h2>
      <div class="meta">${escapeHtml(p.category)} • <strong class="price">${formatPrice(p.price)} EGP</strong></div>
      <p>${escapeHtml(p.description)}</p>

      <div>
        <div class="options">
          ${p.sizes ? p.sizes.map(s=>`<div class="option size-option">${escapeHtml(s)}</div>`).join("") : ""}
        </div>
        <div class="options">
          ${p.colors ? p.colors.map(c=>`<div class="option color-option">${escapeHtml(c)}</div>`).join("") : ""}
        </div>
      </div>

      <div style="margin-top:12px">
        <label>الكمية
          <input id="qty-input" type="number" min="1" value="1" style="width:80px;padding:6px;margin-right:8px;border-radius:6px;border:1px solid #e2e8f0" />
        </label>
      </div>

      <div style="margin-top:12px">
        <button id="add-to-cart-btn" class="btn primary">أضف للسلة</button>
        <a href="cart.html" class="btn">اذهب للسلة</a>
      </div>
    </div>
  `;

  // options selection UX
  document.querySelectorAll(".size-option").forEach(o => o.addEventListener("click", () => {
    document.querySelectorAll(".size-option").forEach(x=>x.classList.remove("selected"));
    o.classList.add("selected");
  }));
  document.querySelectorAll(".color-option").forEach(o => o.addEventListener("click", () => {
    document.querySelectorAll(".color-option").forEach(x=>x.classList.remove("selected"));
    o.classList.add("selected");
  }));

  document.getElementById("add-to-cart-btn").addEventListener("click", () => {
    const qty = Number(document.getElementById("qty-input").value) || 1;
    addToCart(pid, qty);
    showToast("تمت الإضافة للسلة");
  });
}

/* ---------- Cart page ---------- */

function renderCartPage() {
  const el = document.getElementById("cart-content");
  if (!el) return;
  const cart = loadCart();
  if (cart.length === 0) {
    el.innerHTML = `<div class="cart-content"><p>السلة فارغة</p><a class="btn" href="index.html">تسوق الآن</a></div>`;
    document.getElementById("checkout-btn")?.classList?.add("disabled");
    return;
  }

  const lines = cart.map(it => {
    const p = products.find(x => x.id === it.productId) || {};
    return `
      <div class="cart-item" data-id="${it.productId}">
        <img src="${p.image || ''}" alt="${escapeHtml(p.name || '')}" />
        <div style="flex:1">
          <h4 style="margin:0">${escapeHtml(p.name || 'منتج')}</h4>
          <div class="meta">${escapeHtml(p.category || '')}</div>
          <div class="qty">
            <button class="qty-decrease" data-id="${it.productId}">−</button>
            <span class="qty-value">${it.quantity}</span>
            <button class="qty-increase" data-id="${it.productId}">+</button>
            <span style="margin-inline-start:12px" class="price">${formatPrice((p.price||0) * it.quantity)} EGP</span>
          </div>
        </div>
        <div>
          <button class="btn remove-item" data-id="${it.productId}">حذف</button>
        </div>
      </div>
    `;
  }).join("");

  const total = cart.reduce((s,it)=> {
    const p = products.find(x => x.id === it.productId) || {price:0};
    return s + (p.price || 0) * it.quantity;
  }, 0);

  el.innerHTML = `
    <div class="cart-content">
      ${lines}
      <div class="cart-summary">
        <div>المجموع: <strong>${formatPrice(total)} EGP</strong></div>
      </div>
    </div>
  `;

  
  document.querySelectorAll(".qty-increase").forEach(b => b.addEventListener("click", () => {
    const id = Number(b.dataset.id);
    changeQty(id, 1);
  }));
  document.querySelectorAll(".qty-decrease").forEach(b => b.addEventListener("click", () => {
    const id = Number(b.dataset.id);
    changeQty(id, -1);
  }));
  document.querySelectorAll(".remove-item").forEach(b => b.addEventListener("click", () => {
    const id = Number(b.dataset.id);
    removeFromCart(id);
    renderCartPage();
    showToast("تم الحذف من السلة");
  }));

 
  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn) checkoutBtn.classList.remove("disabled");
}



function renderCheckoutPage() {
  const summaryEl = document.getElementById("order-summary");
  if (!summaryEl) return;
  const cart = loadCart();
  if (cart.length === 0) {
    summaryEl.innerHTML = "<p>السلة فارغة. الرجاء إضافة منتجات قبل إتمام الطلب.</p>";
    document.querySelector(".checkout-form .primary")?.setAttribute("disabled", "true");
    return;
  }
  const lines = cart.map(it => {
    const p = products.find(x => x.id === it.productId) || {};
    return `<div>${escapeHtml(p.name || '')} × ${it.quantity} — ${formatPrice((p.price||0)*it.quantity)} EGP</div>`;
  }).join("");
  const total = cart.reduce((s,it)=> {
    const p = products.find(x => x.id === it.productId) || {price:0};
    return s + (p.price || 0) * it.quantity;
  }, 0);
  summaryEl.innerHTML = `<div>${lines}<hr><div>المجموع: <strong>${formatPrice(total)} EGP</strong></div></div>`;

  
  const form = document.getElementById("checkout-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const order = {
      id: 'ORD-' + Date.now(),
      name: formData.get('name'),
      email: formData.get('email'),
      address: formData.get('address'),
      payment: formData.get('payment'),
      items: cart,
      total: total,
      createdAt: new Date().toISOString()
    };
  
    const orders = JSON.parse(localStorage.getItem("sport_store_orders_v1") || "[]");
    orders.push(order);
    localStorage.setItem("sport_store_orders_v1", JSON.stringify(orders));

    saveCart([]);

    localStorage.setItem("sport_store_last_order_v1", JSON.stringify(order));


    window.location.href = "thanks.html";
  });
}



function renderThanksPage() {
  const el = document.getElementById("thanks-msg");
  if (!el) return;
  const order = JSON.parse(localStorage.getItem("sport_store_last_order_v1") || "null");
  if (!order) {
    el.textContent = "شكراً لك! تم استلام طلبك.";
    return;
  }
  el.innerHTML = `طلبك رقم <strong>${escapeHtml(order.id)}</strong> بمجموع <strong>${formatPrice(order.total)} EGP</strong>. تم إرسال تفاصيل الطلب إلى ${escapeHtml(order.email)} (تجريبي).`;
 


function addToCart(productId, quantity = 1) {
  const cart = loadCart();
  const idx = cart.findIndex(it => it.productId === productId);
  if (idx >= 0) {
    cart[idx].quantity += quantity;
  } else {
    cart.push({ productId, quantity });
  }
  saveCart(cart);
}

function changeQty(productId, delta) {
  const cart = loadCart();
  const idx = cart.findIndex(it => it.productId === productId);
  if (idx >= 0) {
    cart[idx].quantity += delta;
    if (cart[idx].quantity <= 0) cart.splice(idx, 1);
  }
  saveCart(cart);
  renderCartPage();
}

function removeFromCart(productId) {
  let cart = loadCart();
  cart = cart.filter(it => it.productId !== productId);
  saveCart(cart);
}



function formatPrice(n) {
  return new Intl.NumberFormat('ar-EG').format(n);
}

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function escapeHtml(text) {
  if (!text && text !== 0) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


function showToast(text, ms = 1500) {
  if (!text) return;
  const t = document.createElement("div");
  t.textContent = text;
  t.style.position = "fixed";
  t.style.bottom = "20px";
  t.style.left = "20px";
  t.style.padding = "10px 14px";
  t.style.background = "#111";
  t.style.color = "#fff";
  t.style.borderRadius = "8px";
  t.style.zIndex = 9999;
  document.body.appendChild(t);
  setTimeout(()=> t.style.opacity = "0.85", 10);
  setTimeout(()=> {
    t.style.opacity = "0";
    setTimeout(()=> t.remove(), 400);
  }, ms);
}



document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();

  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const sortFilter = document.getElementById("sort-filter");
  const clearFilters = document.getElementById("clear-filters");

  if (searchInput || document.getElementById("products-grid")) {
  
    renderProductsGrid({});

  
    if (searchInput) {
      searchInput.addEventListener("input", () => renderProductsGrid({
        q: searchInput.value,
        category: categoryFilter?.value,
        sort: sortFilter?.value
      }));
    }
    if (categoryFilter) categoryFilter.addEventListener("change", () => renderProductsGrid({
      q: searchInput?.value,
      category: categoryFilter.value,
      sort: sortFilter?.value
    }));
    if (sortFilter) sortFilter.addEventListener("change", () => renderProductsGrid({
      q: searchInput?.value,
      category: categoryFilter?.value,
      sort: sortFilter.value
    }));
    if (clearFilters) clearFilters.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (categoryFilter) categoryFilter.value = "";
      if (sortFilter) sortFilter.value = "new";
      renderProductsGrid({});
    });
  }

  if (document.getElementById("product-detail")) {
    renderProductDetail();
  }

  if (document.getElementById("cart-content")) {
    renderCartPage();
  }

  if (document.getElementById("checkout-form")) {
    renderCheckoutPage();
  }

 
  if (document.getElementById("thanks-msg")) {
    renderThanksPage();
  }
});

