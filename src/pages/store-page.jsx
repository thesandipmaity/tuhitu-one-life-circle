import Link from "../components/Link";
import { useMemo, useState } from "react";
import { useApp } from "../components/app-provider";
import { ProductCard, SectionHeading } from "../components/ui";
import { Icon } from "../components/icons";
import { catalogue, categoryFilters, contactConfig } from "../data/site-data";

const memberPreviewCatalogue = [
  {
    slug: "member-preview-herbal-reset-kit",
    brand: "OLC Member Preview",
    category: "Nutrition & Wellness",
    title: "Herbal Reset Kit",
    location: "Panchkula",
    type: "Product",
    image: "/assets/wellness-category.webp",
    badge: "Member preview",
    featured: true,
    verified: false,
    checkoutEnabled: false,
    listPrice: 2999,
    memberPrice: 2299,
    cta: "Request Access",
  },
  {
    slug: "member-preview-guided-therapy-session",
    brand: "OLC Member Preview",
    category: "Panchakarma & Ayurveda",
    title: "Guided Therapy Session",
    location: "Panchkula",
    type: "Service",
    image: "/assets/therapy-ayurveda.webp",
    badge: "Limited slots",
    featured: true,
    verified: false,
    checkoutEnabled: false,
    listPrice: 3500,
    memberPrice: 2800,
    cta: "Request Access",
  },
  {
    slug: "member-preview-family-screening-panel",
    brand: "OLC Member Preview",
    category: "Diagnostics",
    title: "Family Screening Panel",
    location: "Tricity",
    type: "Service",
    image: "/assets/diagnostics-consultation.webp",
    badge: "Popular",
    featured: true,
    verified: false,
    checkoutEnabled: false,
    listPrice: 4200,
    memberPrice: 3199,
    cta: "Request Access",
  },
  {
    slug: "member-preview-daily-nutrition-box",
    brand: "OLC Member Preview",
    category: "Healthy Convenience",
    title: "Daily Nutrition Box",
    location: "Selected locations",
    type: "Product",
    image: "/assets/young-everyday-choices.webp",
    badge: "Member favourite",
    featured: true,
    verified: false,
    checkoutEnabled: false,
    listPrice: 1899,
    memberPrice: 1499,
    cta: "Request Access",
  },
  {
    slug: "member-preview-online-wellbeing-checkin",
    brand: "OLC Member Preview",
    category: "Consultations",
    title: "Online Wellbeing Check-in",
    location: "Online",
    type: "Service",
    image: "/assets/diagnostics-consultation.webp",
    verified: false,
    checkoutEnabled: false,
    listPrice: 1500,
    memberPrice: 999,
    cta: "Request Access",
  },
  {
    slug: "member-preview-community-mobility-circle",
    brand: "OLC Member Preview",
    category: "Experiences",
    title: "Community Mobility Circle",
    location: "Tricity",
    type: "Experience",
    image: "/assets/intergenerational-community.webp",
    verified: false,
    checkoutEnabled: false,
    listPrice: 1200,
    memberPrice: 799,
    cta: "Request Access",
  },
];

function StorePage() {
  const { member, memberActive, cartCount, saved, requestGate, openJoin, openWhatsApp } = useApp();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [tab, setTab] = useState("All");
  const [location, setLocation] = useState("All locations");
  const storeCatalogue = member ? memberPreviewCatalogue : catalogue;

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return storeCatalogue.filter((item) => {
      const matchesSearch = !term || [item.brand, item.title, item.category, item.location].join(" ").toLowerCase().includes(term);
      const matchesTab = tab === "All" || item.type === tab;
      const matchesLocation = location === "All locations" || item.location.toLowerCase().includes(location.toLowerCase());
      const matchesCategory = category === "All" || item.category === category || category === "Consultations" && item.type === "Service" || category === "Senior Support" && ["Physiotherapy", "Family Wellness"].includes(item.category);
      return matchesSearch && matchesTab && matchesLocation && matchesCategory;
    });
  }, [search, category, tab, location, storeCatalogue]);
  const grouped = useMemo(() => {
    const groups = /* @__PURE__ */ new Map();
    filtered.forEach((item) => {
      const current = groups.get(item.category) || [];
      groups.set(item.category, [...current, item]);
    });
    return Array.from(groups.entries());
  }, [filtered]);
  return <>
      <section className="store-hero">
        <div className="container">
          <div className="store-title-row">
            <div>
              <p className="eyebrow">MEMBER STORE</p>
              <h1>Better products. Better services. Better member prices.</h1>
              <p>
                Explore a curated mix of everyday wellness, healthier choices, therapies, family services and experiences across different life stages.
              </p>
            </div>
            <div className={`member-status ${memberActive ? "unlocked" : "locked"}`}>
              <Icon name={memberActive ? "shield" : "lock"} />
              <div><strong>{memberActive ? "Active member access" : "Protected Member Store"}</strong><span>{memberActive ? "Eligible prices and actions are available." : "Register, pay and log in to unlock prices and checkout."}</span></div>
            </div>
          </div>

          <div className="store-toolbar">
            <label className="search-box">
              <Icon name="search" />
              <span className="sr-only">Search store</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, services or partners" />
            </label>
            <label className="select-control">
              <span className="sr-only">Filter by location</span>
              <select value={location} onChange={(event) => setLocation(event.target.value)}>
                <option>All locations</option>
                <option>Panchkula</option>
                <option>Tricity</option>
                <option>Online</option>
              </select>
              <Icon name="chevron" />
            </label>
            {memberActive ? <div className="store-quick-links">
                <Link href="/account#saved"><Icon name="heart" /> <span>Saved</span><b>{saved.length}</b></Link>
                <Link href="/cart"><Icon name="bag" /> <span>Cart</span><b>{cartCount}</b></Link>
                <Link href="/account"><Icon name="user" /> <span>Account</span></Link>
              </div> : <button className="button button-primary" onClick={() => requestGate("/store")}>Unlock Member Prices</button>}
          </div>

          <div className="store-tabs" role="tablist" aria-label="Catalogue type">
            {["All", "Product", "Service", "Experience"].map((value) => <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>
                {value === "All" ? "All offers" : `${value}s`}
              </button>)}
          </div>
          <div className="category-chips" aria-label="Store categories">
            {categoryFilters.map((value) => <button key={value} className={category === value ? "active" : ""} onClick={() => setCategory(value)}>{value}</button>)}
          </div>
        </div>
      </section>

      <section className="section featured-deals-section">
        <div className="container">
          <div className="section-heading-row">
            <SectionHeading eyebrow="FEATURED MEMBER DEALS" title={memberActive ? "A curated starting point for your membership." : "Preview the categories. Unlock the member layer."} copy={memberActive ? "Selected offers remain subject to final availability and partner terms." : "Exact member prices, booking and checkout remain protected until paid membership activation."} />
            {!member && <button className="text-link" onClick={() => requestGate("/store")}>Member Login <Icon name="arrow" /></button>}
          </div>
          <div className="product-grid four-col">
            {storeCatalogue.filter((item) => item.featured).slice(0, 4).map((item) => <ProductCard key={item.slug} item={item} compact />)}
          </div>
        </div>
      </section>

      <section className="section catalogue-section">
        <div className="container">
          <SectionHeading eyebrow="PARTNER CATALOGUE" title="Useful choices in one member destination." copy={`${filtered.length} editable listings match your current selection. Online transactions activate item by item after partner, price and fulfilment approval.`} />
          {grouped.length ? <div className="catalogue-groups">
              {grouped.map(([group, items]) => <section className="catalogue-group" key={group}>
                  <div className="catalogue-group-header"><h3>{group}</h3><span>{items.length} {items.length === 1 ? "offer" : "offers"}</span></div>
                  <div className="product-row-scroll">
                    {items.map((item) => <ProductCard key={item.slug} item={item} />)}
                  </div>
                </section>)}
            </div> : <div className="no-results"><Icon name="search" /><h3>No matching offers</h3><p>Try a different search, location or category.</p><button className="button button-secondary" onClick={() => {
    setSearch("");
    setCategory("All");
    setTab("All");
    setLocation("All locations");
  }}>Clear Filters</button></div>}
        </div>
      </section>

      {!memberActive && <section className="section store-gate-section">
          <div className="container store-gate-banner">
            <div className="gate-art"><Icon name="lock" /><span>MEMBER PRICES</span><span>BOOKINGS</span><span>CHECKOUT</span></div>
            <div>
              <p className="eyebrow">ONE DIGITAL IDENTITY</p>
              <h2>Unlock Member Prices with One Life Circle.</h2>
              <p>Choose a membership to access eligible member pricing, products, services and experiences across the ecosystem.</p>
              <div className="hero-actions"><Link className="button button-primary" href="/login">Member Login <Icon name="arrow" /></Link><button className="button button-secondary" onClick={() => openJoin("Store engagement gate")}>Explore Membership</button></div>
            </div>
          </div>
        </section>}

      <section className="section store-support-section">
        <div className="container support-band">
          <div><p className="eyebrow">STORE SUPPORT</p><h2>Orders, bookings, returns or partner terms?</h2><p>Use the dedicated support route with your Member ID and transaction reference.</p></div>
          <div className="support-band-actions"><Link href="/about-support?intent=Order%20%2F%20booking%20support" className="button button-secondary">Open Support Form</Link>{contactConfig.whatsappDigits && <button className="button button-primary" onClick={() => openWhatsApp("store")}>Chat on WhatsApp <Icon name="whatsapp" /></button>}</div>
        </div>
      </section>
    </>;
}
export {
  StorePage
};
