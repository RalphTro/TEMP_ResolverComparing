const RESOLVER_A = "https://resolver-st.gs1.org";
const RESOLVER_B = "https://id.gs1.de";

let products = [];

async function init() {
  products = await fetch("products.json").then(r => r.json());
  const select = document.getElementById("product");
  products.forEach((p, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${p.name} (GTIN ${p.gtin})`;
    select.appendChild(opt);
  });
  select.addEventListener("change", () => loadProduct(products[select.value]));
  document.getElementById("reload").addEventListener("click",
    () => loadProduct(products[select.value]));
  loadProduct(products[0]);
}

function loadProduct(product) {
  loadColumn("a", product, RESOLVER_A);
  loadColumn("b", product, RESOLVER_B);
}

async function loadColumn(side, product, resolverBase) {
  const statusEl = document.getElementById("status-" + side);
  const viewEl   = document.getElementById("view-" + side);
  statusEl.textContent = "Resolver wird angefragt …";
  statusEl.className = "status";
  viewEl.innerHTML = "";

  // Schritt 1: das Linkset holen – der CORS-kritische Aufruf.
  const linksetUrl = `${resolverBase}${product.dlPath}?linkType=linkset`;
  try {
    const res = await fetch(linksetUrl, {
      headers: { "Accept": "application/linkset+json" },
      mode: "cors",
      redirect: "follow"
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const linkset = await res.json();
    statusEl.innerHTML = `✅ Linkset erfolgreich geladen – App kennt das „Inhaltsverzeichnis" des Produkts`;
    statusEl.className = "status success";
    renderRichView(viewEl, product, resolverBase, linkset);
  } catch (err) {
    statusEl.textContent = "❌ Linkset konnte nicht geladen werden – App ist blind für dieses Produkt";
    statusEl.className = "status error";
    renderBrokenView(viewEl, product);
  }
}

// Hilfsfunktion: GS1 DL URI mit linkType bauen
function dlUri(resolverBase, dlPath, linkType) {
  return `${resolverBase}${dlPath}?linkType=${encodeURIComponent(linkType)}`;
}

// Verkürzt voll-qualifizierte Link-Type-URIs zu Kurzform "gs1:xxx"
function shortenLinkType(uri) {
  return uri
    .replace(/^https?:\/\/(www\.)?gs1\.org\/voc\/?#?/, "gs1:")
    .replace(/^https?:\/\/(www\.)?gs1\.org\/voc\//, "gs1:");
}

// Icon-Map + offizielle Beschreibungen (GS1 Web Vocabulary v1.17, alle "stable")
const LINK_INFO = {
  "gs1:relatedImage":       { icon: "📷", desc: "A link to any image that depicts or relates to the identified entity (e.g., trade item, assets, business process, patient record, location, organisation, etc.)" },
  "gs1:relatedVideo":       { icon: "🎬", desc: "A link to any video, or document that has an embedded video, that describes or relates to the identified item, organisation, or location in some way." },
  "gs1:masterData":         { icon: "📋", desc: "A link to a source of structured master data for the entity. This is typically for B2B applications." },
  "gs1:pip":                { icon: "🛒", desc: "A link to information specifically about the identified item, typically operated by the brand owner or a retailer of the product and aimed at consumers." },
  "gs1:promotion":          { icon: "🎁", desc: "A link to a promotion." },
  "gs1:tutorial":           { icon: "🎓", desc: "A link to a tutorial or set of tutorials, such as online classes, how-to videos etc." },
  "gs1:hasRetailers":       { icon: "🏬", desc: "A link to a list of retailers." },
  "gs1:recipeInfo":         { icon: "🍴", desc: "A link to a recipe website." },
  "gs1:sustainabilityInfo": { icon: "🌱", desc: "A link to information relating to sustainability and recycling requirements or processes." },
  "gs1:safetyInfo":         { icon: "⚠️", desc: "A link to safety information." },
  "gs1:instructions":       { icon: "📖", desc: "A link to instructions, such as assembly instructions, usage tips etc." },
  "gs1:allergenInfo":       { icon: "🥜", desc: "A link to a description of the allergen information." },
  "gs1:nutritionalInfo":    { icon: "🥗", desc: "A link to nutritional facts." },
  "gs1:ingredientsInfo":    { icon: "🧪", desc: "A link to facts about ingredients." },
  "gs1:faqs":               { icon: "❓", desc: "A link to a set of frequently asked questions." },
  "gs1:dpp":                { icon: "📑", desc: "A link to a digital product passport." },
  "gs1:epcis":              { icon: "🛰️", desc: "A link to an EPCIS repository of visibility event data." },
  "gs1:certificationInfo":  { icon: "🏅", desc: "A link to certification information." },
  "gs1:smartLabel":         { icon: "🏷️", desc: "A link to the product's SmartLabel page." },
  "gs1:defaultLink":        { icon: "🔗", desc: "The default link for a given identified item to which a resolver will redirect unless there is information in the request that is a better match." }
};
function iconFor(linkType) { return (LINK_INFO[linkType] || {}).icon || "🔗"; }
function descFor(linkType) { return (LINK_INFO[linkType] || {}).desc || ""; }

function renderRichView(container, product, resolverBase, linkset) {
  const L = product.links;
  const imageUri      = dlUri(resolverBase, product.dlPath, L.image.linkType);
  const videoUri      = dlUri(resolverBase, product.dlPath, L.video.linkType);
  const promotionUri  = dlUri(resolverBase, product.dlPath, L.promotion.linkType);
  const masterDataUri = dlUri(resolverBase, product.dlPath, L.masterData.linkType);

  container.innerHTML = `
    <article class="product-card">
      <h3>${product.name}</h3>
      <p class="gtin">GTIN: ${product.gtin}</p>

      <section class="linkset-box">
        <header>
          <h4>📑 Linkset – das „Inhaltsverzeichnis" dieses Produkts</h4>
          <small>vom Resolver geliefert via <code>?linkType=linkset</code></small>
        </header>
        ${renderLinksetTable(linkset)}
      </section>

      <h4 class="targets-headline">Daraus baut die App folgende Ansicht:</h4>
      <div class="targets">
        <div class="target">
          <h4>📷 Produktbild</h4>
          ${imageUri}}" loading="lazy">
          <small>via <code>?linkType=${L.image.linkType}</code></small>
        </div>

        <div class="target">
          <h4>🎬 Produktvideo</h4>
          ${videoUri} rel="noopener">
            <div class="video-thumb">▶</div>
            <span>Video ansehen<br><small>via <code>?linkType=${L.video.linkType}</code></small></span>
          </a>
        </div>

        <div class="target" style="grid-column: 1 / -1;">
          <h4>🎁 Aktuelle Promotion</h4>
          ${promotionUri}
          " target="_blank" rel="noopener">
            via <code>?linkType=${L.promotion.linkType}</code> – in neuem Tab öffnen
          </a>
        </div>

        <div class="target" style="grid-column: 1 / -1;">
          <h4>📋 Stammdaten</h4>
          <div class="masterdata-content"
               data-url="${masterDataUri}"
               data-accept="${L.masterData.accept}"
               data-lang="${L.masterData.lang}">Lade …</div>
        </div>
      </div>
    </article>
  `;
  fetchMasterData(container.querySelector(".masterdata-content"));
}

function renderLinksetTable(linkset) {
  // Linkset-Format: { "linkset": [ { "anchor": "...", "<linkTypeURI>": [ {href, title, hreflang, type, ...}, ... ] } ] }
  if (!linkset || !Array.isArray(linkset.linkset) || !linkset.linkset.length) {
    return "<p class='linkset-empty'><em>Kein Linkset im erwarteten Format gefunden.</em></p>";
  }
  const entry = linkset.linkset[0];
  const anchor = entry.anchor || "";

  const rows = [];
  for (const key of Object.keys(entry)) {
    if (key === "anchor") continue;
    const shortLt = shortenLinkType(key);
    const desc = descFor(shortLt);
    const links = Array.isArray(entry[key]) ? entry[key] : [entry[key]];
    for (const link of links) {
      const title = link.title || "—";
      const langs = link.hreflang
        ? (Array.isArray(link.hreflang) ? link.hreflang.join(", ") : link.hreflang)
        : "—";
      const type  = link.type || "—";
      const href  = link.href || "";
      rows.push(`
        <tr>
          <td title="${desc}"><span class="lt-icon">${iconFor(shortLt)}</span> <code>${shortLt}</code></td>
          <td>${title}</td>
          <td>${langs}</td>
          <td><code>${type}</code></td>
          <td>${href} title="${href}">↗</a></td>
        </tr>
      `);
    }
  }

  return `
    <div class="linkset-anchor"><span>Anchor:</span> <code>${anchor}</code></div>
    <table class="linkset-table">
      <thead>
        <tr>
          <th>Link-Typ</th><th>Titel</th><th>Sprache</th><th>Media Type</th><th>Ziel</th>
        </tr>
      </thead>
      <tbody>${rows.join("")}</tbody>
    </table>
    <p class="linkset-count">${rows.length} Einträge insgesamt</p>
  `;
}

async function fetchMasterData(el) {
  try {
    const res = await fetch(el.dataset.url, {
      headers: {
        "Accept":          el.dataset.accept,
        "Accept-Language": el.dataset.lang
      },
      mode: "cors",
      redirect: "follow"
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    el.innerHTML = renderMasterData(data);
  } catch (e) {
    el.innerHTML = "<em>Stammdaten konnten nicht geladen werden.</em>";
  }
}

function pickValue(field, lang = "de") {
  if (field == null) return null;
  if (typeof field === "string") return field;
  if (Array.isArray(field)) {
    const match = field.find(f => f && f["@language"] === lang) || field[0];
    return pickValue(match, lang);
  }
  if (typeof field === "object") {
    if ("@value" in field) return field["@value"];
    return field.brandName || field.name || field.productName || null;
  }
  return String(field);
}

function renderMasterData(data) {
  const fields = [
    ["Name",         pickValue(data.productName) || pickValue(data.name)],
    ["Marke",        pickValue(data.brand)],
    ["GTIN",         pickValue(data.gtin)],
    ["Nettoinhalt",  pickValue(data.netContent)],
    ["Beschreibung", pickValue(data.productDescription) || pickValue(data.description)]
  ].filter(([_, v]) => v);
  if (!fields.length) return "<em>Keine darstellbaren Felder gefunden.</em>";
  return `<dl>${fields.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
}

function renderBrokenView(container, product) {
  container.innerHTML = `
    <article class="product-card broken">
      <h3>${product.name}</h3>
      <p class="gtin">GTIN: ${product.gtin}</p>

      <section class="linkset-box broken-linkset">
        <header>
          <h4>📑 Linkset – das „Inhaltsverzeichnis" dieses Produkts</h4>
          <small>vom Resolver via <code>?linkType=linkset</code> angefragt</small>
        </header>
        <div class="broken-state">
          <div class="broken-icon">⚠️</div>
          <p class="broken-message">Kein Inhaltsverzeichnis verfügbar.</p>
          <p class="broken-detail">
            Diese App darf den Hersteller-Resolver aus Sicherheitsgründen des Browsers nicht direkt befragen.
            Ohne Linkset weiß die App nicht einmal, <em>welche</em> Inhalte es zum Produkt gibt.
          </p>
        </div>
      </section>

      <h4 class="targets-headline">Mögliche Inhalte – für diese App nicht erreichbar:</h4>
      <div class="broken-grid">
        <div class="broken-cell"><span class="icon">📷</span>Bild</div>
        <div class="broken-cell"><span class="icon">🎬</span>Video</div>
        <div class="broken-cell"><span class="icon">🎁</span>Promotion</div>
        <div class="broken-cell"><span class="icon">📋</span>Stammdaten</div>
      </div>
    </article>
  `;
}

init();