import { useState } from "react";
import {
  comparisonRows,
  formatCurrency,
  plans,
  savingFor
} from "../data/site-data";
import { useApp } from "./app-provider";
import { Icon } from "./icons";
import Link from "./Link";
function SectionHeading({
  eyebrow,
  title,
  copy,
  align = "left"
}) {
  return <div className={`section-heading ${align === "center" ? "center" : ""}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>;
}
function PageHero({
  eyebrow,
  title,
  copy,
  children,
  image,
  imageAlt
}) {
  return <section className={`page-hero ${image ? "with-image" : ""}`}>
      <div className="container page-hero-grid">
        <div className="page-hero-copy reveal">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{copy}</p>
          {children && <div className="hero-actions">{children}</div>}
        </div>
        {image && <div className="page-hero-image reveal delay-1">
            <img src={image} alt={imageAlt || ""} />
          </div>}
      </div>
    </section>;
}
function BenefitTile({
  number,
  icon,
  title,
  copy
}) {
  return <article className="benefit-tile">
      <div className="benefit-icon">
        {number || (icon ? <Icon name={icon} /> : <Icon name="spark" />)}
      </div>
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>;
}
function PlanCard({ plan }) {
  const { openJoin, track } = useApp();
  function selectPlan() {
    track("plan_select", { plan: plan.id });
    openJoin("Membership plan", plan.id);
  }
  return <article className={`plan-card ${plan.id === "active" ? "popular" : ""}`}>
      {plan.badge && <span className="plan-badge">{plan.badge}</span>}
      <div>
        <p className="plan-kicker">ANNUAL MEMBERSHIP</p>
        <h3>{plan.name}</h3>
        <p className="plan-summary">{plan.summary}</p>
      </div>
      <div className="plan-potential-value">
        <span>Potential annual benefit value</span>
        <strong>{plan.potentialValueLabel}</strong>
      </div>
      <div className="plan-price">
        {plan.regularPrice && <s>{formatCurrency(plan.regularPrice)}</s>}
        <strong>{formatCurrency(plan.annualPrice)}</strong>
        <span>/ {plan.billingPeriod}</span>
      </div>
      <p className="annual-upfront">Annual membership · Paid upfront</p>
      <p className="plan-refresh"><Icon name="calendar" /> {plan.refreshLabel}</p>
      <ul className="check-list">
        {plan.benefits.map((benefit) => <li key={benefit}><Icon name="check" /> {benefit}</li>)}
      </ul>
      <button className={`button ${plan.id === "active" ? "button-primary" : "button-secondary"}`} onClick={selectPlan}>
        {plan.cta} <Icon name="arrow" />
      </button>
    </article>;
}
function PlanComparisonTable({ source = "Plan comparison" }) {
  const { openJoin, track } = useApp();

  function choosePlan(plan) {
    track("plan_select", { plan: plan.id, source });
    openJoin(source, plan.id);
  }

  return <div className="plan-comparison-shell">
      <p className="comparison-mobile-hint">Swipe to compare all three memberships <Icon name="arrow" /></p>
      <div className="comparison-scroll" tabIndex={0} aria-label="Scrollable comparison of One Life Circle memberships">
        <table className="comparison-table plan-comparison-table">
          <thead>
            <tr>
              <th scope="col"><span className="comparison-benefit-heading">Benefit</span></th>
              {plans.map((plan) => <th key={plan.id} scope="col" className={plan.id === "active" ? "highlight" : ""}>
                  <div className="comparison-plan-head">
                    <span className="comparison-plan-name">{plan.name}</span>
                    <span className="comparison-plan-price">
                      {plan.regularPrice && <s>{formatCurrency(plan.regularPrice)}</s>}
                      <strong>{formatCurrency(plan.annualPrice)}</strong><small>/year</small>
                    </span>
                    <button type="button" className={`button comparison-plan-cta ${plan.id === "active" ? "is-active" : ""}`} onClick={() => choosePlan(plan)}>
                      Choose {plan.name} <Icon name="arrow" />
                    </button>
                  </div>
                </th>)}
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => <tr key={row.label}>
                <th scope="row"><span>{row.category}</span>{row.label}</th>
                <td>{row.community}</td>
                <td className="highlight">{row.active}</td>
                <td>{row.signature}</td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </div>;
}
function ProductCard({ item, compact = false }) {
  const { member, memberActive, saved, toggleSaved, addToCart, openBooking, requestGate, track } = useApp();
  const saving = savingFor(item);
  const isSaved = saved.includes(item.slug);
  const transactionReady = item.verified && item.checkoutEnabled !== false;
  const memberLoggedIn = Boolean(member);
  function action() {
    if (!memberActive) return requestGate(`/store/${item.slug}`);
    if (item.type === "Product" && transactionReady) addToCart(item.slug);
    else openBooking({ slug: item.slug, source: "catalogue" });
  }
  return <article className={`product-card ${compact ? "compact" : ""}`}>
      <div className="product-image-wrap">
        <Link
    href={`/store/${item.slug}`}
    className="product-image"
    onClick={() => track("product_view", { slug: item.slug })}
  >
          <img src={item.image} alt={item.title} />
          {item.badge && <span className="image-badge">{item.badge}</span>}
        </Link>
        <button
    type="button"
    className={`save-button ${isSaved ? "saved" : ""}`}
    aria-label={isSaved ? "Remove from saved offers" : "Save offer"}
    onClick={(event) => {
      event.preventDefault();
      toggleSaved(item.slug);
    }}
  >
          <Icon name="heart" />
        </button>
      </div>
      <div className="product-body">
        <div className="product-meta"><span>{item.brand}</span><span>{item.category}</span></div>
        <Link href={`/store/${item.slug}`} className="product-title">{item.title}</Link>
        <p className="product-location">{item.location}</p>
        {memberLoggedIn ? <div className="price-unlock">
            <div>
              <span className="list-price">{formatCurrency(item.listPrice)}</span>
              <strong>{formatCurrency(item.memberPrice)}</strong>
            </div>
            {saving && <span className="saving-badge">Save {formatCurrency(saving)}</span>}
          </div> : <button className="locked-price" onClick={() => requestGate(`/store/${item.slug}`)}>
            <Icon name="lock" /> Member price locked
          </button>}
        <button className="button button-card" onClick={action}>
          {memberLoggedIn ? memberActive && transactionReady ? item.cta : "Register Interest" : "Login to Unlock"} <Icon name="arrow" />
        </button>
      </div>
    </article>;
}
function EventCard({ event, featured = false }) {
  const { memberActive, openBooking, requestGate } = useApp();
  return <article className={`event-card ${featured ? "featured" : ""}`}>
      <div className="event-image"><img src={event.image} alt={`${event.title} community experience`} /></div>
      <div className="event-body">
        <div className="event-tags"><span>{event.theme}</span><span>{event.status}</span></div>
        <h3><Link href={`/experiences/${event.slug}`}>{event.title}</Link></h3>
        <p>{event.description}</p>
        <div className="event-details">
          <span><Icon name="calendar" /> {event.date} · {event.time}</span>
          <span><Icon name="community" /> {event.location} · {event.capacity} seats</span>
        </div>
        <div className="event-footer">
          <strong>{event.accessLabel || (event.memberPrice ? `${formatCurrency(event.memberPrice)} member price` : "Registration required")}</strong>
          <button
    className="button button-secondary"
    onClick={() => memberActive ? openBooking({ slug: event.slug, source: "event" }) : requestGate(`/experiences/${event.slug}`)}
  >
            {event.bookingOpen ? event.memberPrice > 0 ? `Reserve & Pay ${formatCurrency(event.memberPrice)}` : "Reserve Seat" : "Express Interest"} <Icon name="arrow" />
          </button>
        </div>
      </div>
    </article>;
}
function Accordion({ items }) {
  const [open, setOpen] = useState(0);
  return <div className="accordion">
      {items.map((item, index) => <article key={item.question} className={open === index ? "open" : ""}>
          <button onClick={() => setOpen(open === index ? null : index)} aria-expanded={open === index}>
            <span>{item.question}</span><Icon name={open === index ? "minus" : "plus"} />
          </button>
          <div className="accordion-panel"><p>{item.answer}</p></div>
        </article>)}
    </div>;
}
function EmptyState({
  icon,
  title,
  copy,
  action
}) {
  return <div className="empty-state">
      <div className="empty-icon"><Icon name={icon} /></div>
      <h2>{title}</h2>
      <p>{copy}</p>
      {action}
    </div>;
}
function TrustStrip() {
  return <div className="trust-strip">
      <span><Icon name="shield" /> One secure digital identity</span>
      <span><Icon name="heart" /> Family-relevant access</span>
      <span><Icon name="spark" /> Curated partner benefits</span>
    </div>;
}
export {
  Accordion,
  BenefitTile,
  EmptyState,
  EventCard,
  PageHero,
  PlanCard,
  PlanComparisonTable,
  ProductCard,
  SectionHeading,
  TrustStrip
};
