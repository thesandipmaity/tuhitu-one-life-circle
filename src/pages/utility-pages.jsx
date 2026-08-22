import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Link from "../components/Link";
import BrandLogo from "../components/BrandLogo";
import MembershipCard from "../components/MembershipCard";
import { useApp } from "../components/app-provider";
import { EmptyState, ProductCard, SectionHeading } from "../components/ui";
import { Icon } from "../components/icons";
import { catalogue, contactConfig, formatCurrency, plans, savingFor } from "../data/site-data";
import { apiRequest, readableApiError } from "../lib/api";
import { beginPayment } from "../lib/payments";

function dateLabel(value, fallback = "Activates after payment") {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

function LoginPage() {
  const { member, login, track } = useApp();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!identifier.trim() || !password) return setError("Enter your Member ID, email or mobile number and password.");
    setSubmitting(true);
    try {
      track("login_attempt", { hasIdentifier: true });
      await login({ identifier, password, remember });
    } catch (loginError) {
      setError(readableApiError(loginError, "Login was unsuccessful."));
    } finally {
      setSubmitting(false);
    }
  }
  if (member) return <UtilityShell eyebrow="MEMBER LOGIN" title="You are already signed in." copy={`${member.memberId} · ${member.statusLabel}`}><div className="hero-actions"><Link className="button button-primary" href="/account">My Account</Link>{member.canAccessStore && <Link className="button button-secondary" href="/store">Open Store</Link>}</div></UtilityShell>;
  return <section className="auth-page">
    <div className="auth-visual"><img src="/assets/inclusive-hero.webp" alt="One Life Circle members across different life stages" /><div><p className="eyebrow">ONE DIGITAL IDENTITY</p><h1>Welcome back to your Circle.</h1><p>Access your membership, digital card, protected Store, bookings and payments.</p></div></div>
    <div className="auth-panel"><Link href="/" className="auth-logo"><BrandLogo size="login" /></Link><p className="eyebrow">MEMBER LOGIN</p><h2>Access your secure account.</h2><p>Use the Member ID issued at registration, your registered email, or mobile number.</p>
      <form onSubmit={submit} noValidate>
        <label className="field"><span>Member ID, email or mobile<i className="required-marker" aria-hidden="true">*</i></span><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} required placeholder="OLC-LSI-26-000001" autoComplete="username" /></label>
        <div className="field password-field"><label htmlFor="member-password">Password<i className="required-marker" aria-hidden="true">*</i></label><div><input id="member-password" value={password} onChange={(event) => setPassword(event.target.value)} required type={showPassword ? "text" : "password"} autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}><Icon name="eye" /></button></div></div>
        {error && <div className="form-alert" role="alert"><Icon name="lock" /> {error}</div>}
        <div className="login-options"><label><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Remember this device</label><Link href="/forgot-password">Forgot password?</Link></div>
        <button className="button button-primary button-full" type="submit" disabled={submitting}>{submitting ? "Signing in securely…" : "Member Login"} <Icon name="arrow" /></button>
      </form>
      <div className="or-divider"><span>New to the Circle?</span></div><Link className="button button-secondary button-full" href="/membership-registration">Create Membership Account</Link>
      <small className="auth-note"><Icon name="shield" /> Passwords are protected server-side and sessions use secure, HTTP-only cookies.</small>
      <div className="auth-support"><span>Need help with your Member ID?</span><Link href="/about-support?intent=Membership%20support">Contact Support</Link></div>
    </div>
  </section>;
}

function AccountPage() {
  const { member, hydrated, saved, logout, openWhatsApp, refreshMember } = useApp();
  const [tab, setTab] = useState("Overview");
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadAccount = async () => {
    try {
      setLoading(true);
      setAccount(await apiRequest("/api/account"));
      setError("");
    } catch (accountError) {
      setError(readableApiError(accountError));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (member) loadAccount();
    else setLoading(false);
  }, [member]);
  if (!hydrated || loading) return <PageLoader />;
  if (!member) return <ProtectedState title="Your member account is protected." copy="Register or log in to view your personal Member ID, payment status, digital card, orders and bookings." returnTo="/account" />;
  if (error) return <UtilityShell eyebrow="MY ACCOUNT" title="We could not load your account." copy={error}><button className="button button-primary" onClick={loadAccount}>Try Again</button></UtilityShell>;
  const currentMember = account?.member || member;
  const savedItems = catalogue.filter((item) => saved.includes(item.slug));
  return <section className="account-page">
    <div className="account-hero"><div className="container account-hero-inner"><div><p className="eyebrow">MY ACCOUNT</p><h1>Good to see you, {currentMember.name.split(" ")[0]}.</h1><p>{currentMember.memberId} · {currentMember.plan} · {currentMember.statusLabel}</p></div><div className="account-actions">{currentMember.canAccessStore && <Link href="/access-card" className="button button-light"><Icon name="card" /> Access My Card</Link>}<button className="button button-outline-light" onClick={logout}>Sign Out</button></div></div></div>
    <div className="container account-layout"><aside className="account-nav" aria-label="Account sections">{["Overview", "Orders & Bookings", "Saved Offers", "Community", "Membership", "Support"].map((value) => <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value}<Icon name="arrow" /></button>)}</aside>
      <div className="account-content">
        {tab === "Overview" && <AccountOverview member={currentMember} account={account} />}
        {tab === "Orders & Bookings" && <OrdersBookings orders={account?.orders || []} bookings={account?.bookings || []} />}
        {tab === "Saved Offers" && <div id="saved"><SectionHeading eyebrow="SAVED OFFERS" title="Your shortlist." copy="Saved offers remain on this device; purchase eligibility is always checked on the server." />{savedItems.length ? <div className="product-grid two-col">{savedItems.map((item) => <ProductCard key={item.slug} item={item} />)}</div> : <EmptyState icon="heart" title="No saved offers yet." copy="Save an offer in the Member Store to see it here." action={<Link className="button button-primary" href="/store">Explore Store</Link>} />}</div>}
        {tab === "Community" && <CommunityAccount bookings={account?.bookings || []} />}
        {tab === "Membership" && <MembershipAccount member={currentMember} onUpdated={async () => { await refreshMember(); await loadAccount(); }} />}
        {tab === "Support" && <div><SectionHeading eyebrow="MEMBER SUPPORT" title="Help across membership, orders and bookings." /><div className="support-options"><Link href="/about-support?intent=Membership%20support"><Icon name="user" /><span><strong>Membership support</strong>Card, ID, plan and access help.</span></Link><Link href="/about-support?intent=Order%20%2F%20booking%20support"><Icon name="bag" /><span><strong>Order & booking support</strong>References, fulfilment and provider queries.</span></Link>{contactConfig.whatsappDigits ? <button onClick={() => openWhatsApp("support")}><Icon name="whatsapp" /><span><strong>WhatsApp support</strong>{contactConfig.whatsappDisplay}</span></button> : <Link href="/about-support?intent=Membership%20support"><Icon name="shield" /><span><strong>Contact the support team</strong>Submit a secure enquiry with a reference.</span></Link>}</div></div>}
      </div>
    </div>
  </section>;
}

function AccountOverview({ member, account }) {
  const { saved, cartCount } = useApp();
  const activeBookings = (account?.bookings || []).filter((item) => ["confirmed", "payment_pending"].includes(item.status));
  return <div><SectionHeading eyebrow="MEMBER OVERVIEW" title="Your Circle at a glance." />
    {!member.canAccessStore && <ActivationBanner member={member} />}
    <div className="account-stat-grid"><article><Icon name="card" /><strong>{member.plan.replace(" Member", "")}</strong><span>Selected plan</span></article><article><Icon name="heart" /><strong>{saved.length}</strong><span>Saved offers</span></article><article><Icon name="bag" /><strong>{cartCount}</strong><span>Items in cart</span></article><article><Icon name="calendar" /><strong>{activeBookings.length}</strong><span>Active bookings</span></article></div>
    {member.canAccessStore && <div className="account-card-preview"><MembershipCard compact member={member} /><div><p className="eyebrow">MY DIGITAL CARD</p><h3>Built from your verified member record.</h3><p>Your name, plan, status and unique Member ID appear here—never unrelated sample data.</p><Link className="button button-secondary" href="/access-card">Open Full Card <Icon name="arrow" /></Link></div></div>}
    <OrdersBookings compact orders={account?.orders || []} bookings={account?.bookings || []} />
  </div>;
}

function ActivationBanner({ member }) {
  return <div className="activation-banner"><Icon name="lock" /><div><strong>Membership payment pending</strong><span>Your account and Member ID are secure. Complete annual payment from the Membership tab to unlock Store prices, bookings and the digital card.</span></div><span>{member.memberId}</span></div>;
}

function OrdersBookings({ compact = false, orders = [], bookings = [] }) {
  const records = [
    ...bookings.map((item) => ({ id: item.id, icon: "calendar", title: item.title_snapshot, detail: [item.requested_date, item.requested_time].filter(Boolean).join(" · ") || "Schedule confirmation pending", status: item.status })),
    ...orders.map((item) => ({ id: item.id, icon: "bag", title: `Order ${item.id}`, detail: `${formatCurrency(item.total_paise / 100)} · ${dateLabel(item.created_at, "")}`, status: item.status })),
  ].slice(0, compact ? 3 : 20);
  return <div className={compact ? "account-subsection" : ""}><SectionHeading eyebrow="ORDERS & BOOKINGS" title={compact ? "Recent activity." : "Your transaction history."} copy="Every reference below comes from your own server-backed account." />
    {records.length ? records.map((record) => <div className="account-record" key={record.id}><div className="record-icon"><Icon name={record.icon} /></div><div><strong>{record.title}</strong><span>{record.id}</span><span>{record.detail}</span></div><span className={`status-pill ${record.status === "confirmed" || record.status === "paid" ? "" : "muted"}`}>{record.status.replaceAll("_", " ")}</span></div>) : <EmptyState icon="bag" title="No transactions yet." copy="Paid orders and confirmed bookings will appear here automatically." action={<Link className="button button-secondary" href="/store">Explore Store</Link>} />}
  </div>;
}

function CommunityAccount({ bookings }) {
  const community = bookings.filter((item) => item.source_type === "event");
  return <div><SectionHeading eyebrow="COMMUNITY" title="Your community registrations." />{community.length ? community.map((item) => <div className="account-record" key={item.id}><div className="record-icon"><Icon name="calendar" /></div><div><strong>{item.title_snapshot}</strong><span>{item.requested_date} · {item.requested_time}</span><span>{item.id}</span></div><span className="status-pill">{item.status.replaceAll("_", " ")}</span></div>) : <EmptyState icon="community" title="No community registrations yet." copy="Explore upcoming activities and reserve an eligible place." action={<Link className="button button-primary" href="/community">Explore Experiences</Link>} />}</div>;
}

function MembershipAccount({ member, onUpdated }) {
  const { paymentConfigured } = useApp();
  const plan = plans.find((item) => item.id === member.planId) || plans[0];
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  async function pay() {
    setPaying(true); setError("");
    try { await beginPayment({ purpose: "membership", referenceId: plan.id }); await onUpdated(); }
    catch (paymentError) { setError(readableApiError(paymentError)); }
    finally { setPaying(false); }
  }
  return <div><SectionHeading eyebrow="MEMBERSHIP" title={`${plan.name} Member access.`} />
    <div className="membership-account-card"><div><span className={`status-pill ${member.canAccessStore ? "" : "muted"}`}>{member.statusLabel}</span><h3>{plan.name}</h3><strong>{formatCurrency(plan.annualPrice)} <small>/ year</small></strong>{plan.regularPrice && <p>Launch annual price · Regular <s>{formatCurrency(plan.regularPrice)}</s></p>}<p>{member.canAccessStore ? `Valid till ${dateLabel(member.validUntil)}` : "Store access activates after verified payment."}</p></div><ul className="check-list">{plan.benefits.map((benefit) => <li key={benefit}><Icon name="check" /> {benefit}</li>)}</ul></div>
    {!member.canAccessStore && <><button className="button button-primary button-large" onClick={pay} disabled={paying || !paymentConfigured}>{paying ? "Preparing secure payment…" : paymentConfigured ? `Pay ${formatCurrency(plan.annualPrice)} & Activate` : "Online payment activation pending"} <Icon name="arrow" /></button>{!paymentConfigured && <p className="payment-pending-note">Your account and Member ID are saved. Online payment will open after merchant activation.</p>}{error && <div className="form-alert" role="alert"><Icon name="shield" /> {error}</div>}</>}
    <div className="upgrade-note"><Icon name="spark" /><div><strong>Compare your options</strong><span>Review benefit levels before changing or renewing a plan.</span></div><Link href="/membership">Compare Memberships</Link></div>
  </div>;
}

function AccessCardPage() {
  const { member, hydrated } = useApp();
  if (!hydrated) return <PageLoader />;
  if (!member?.canAccessStore) return <ProtectedState title="Your digital card activates with membership." copy="Log in and complete annual payment to access the active digital card and verification route." returnTo="/access-card" />;
  return <UtilityShell eyebrow="MY DIGITAL CARD" title="One identity for your Circle." copy="This card is generated from your personal member record."><div className="full-card-view"><MembershipCard member={member} /></div><div className="card-utility-grid"><article><Icon name="shield" /><h3>Active membership</h3><p>{member.plan} · Valid till {dateLabel(member.validUntil)}</p></article><article><Icon name="card" /><h3>Unique member ID</h3><p>{member.memberId}</p></article><article><Icon name="eye" /><h3>Minimum-data verification</h3><p>Only name, status, plan and validity appear.</p></article></div><div className="hero-actions"><button className="button button-primary" onClick={() => window.print()}>Print or Save Card</button><Link className="button button-secondary" href={`/verify/${member.verificationToken}`}>Open Verification Page</Link></div></UtilityShell>;
}

function VerifyPage() {
  const { token = "" } = useParams();
  const [state, setState] = useState({ loading: true, membership: null, error: "" });
  useEffect(() => {
    apiRequest(`/api/members/verify/${encodeURIComponent(token)}`).then((response) => setState({ loading: false, membership: response.membership, verifiedAt: response.verifiedAt, error: "" })).catch((error) => setState({ loading: false, membership: null, error: readableApiError(error) }));
  }, [token]);
  if (state.loading) return <PageLoader />;
  if (state.error) return <section className="verify-page"><div className="verify-card"><BrandLogo size="verify" /><div className="verify-icon"><Icon name="lock" /></div><p className="eyebrow">VERIFICATION UNAVAILABLE</p><h1>Membership not verified</h1><p>{state.error}</p></div></section>;
  const member = state.membership;
  return <section className="verify-page"><div className="verify-card"><BrandLogo size="verify" /><div className="verify-icon"><Icon name="shield" /></div><p className="eyebrow">MEMBERSHIP VERIFIED</p><h1>{member.name}</h1><div className="verify-data"><span><b>Status</b><em className="active-text">{member.status === "active" ? "Active" : "Inactive"}</em></span><span><b>Plan</b>{member.plan}</span><span><b>Valid till</b>{dateLabel(member.validUntil)}</span><span><b>Verified at</b>{dateLabel(state.verifiedAt, "Just now")}</span></div><p className="privacy-note"><Icon name="lock" /> This page intentionally shows only the minimum data needed for verification.</p></div></section>;
}

function ProductDetailPage() {
  const { slug = "" } = useParams();
  const item = catalogue.find((entry) => entry.slug === slug);
  const { memberActive, addToCart, openBooking, requestGate, toggleSaved, saved, openWhatsApp, track } = useApp();
  useEffect(() => { if (item) track("product_view", { slug: item.slug }); }, [item, track]);
  if (!item) return <UtilityShell eyebrow="MEMBER STORE" title="Offer not found." copy="This catalogue item may have changed or been removed."><Link className="button button-primary" href="/store">Back to Store</Link></UtilityShell>;
  const saving = savingFor(item);
  const transactionReady = item.verified && item.checkoutEnabled !== false;
  const action = () => memberActive ? item.type === "Product" && transactionReady ? addToCart(item.slug) : openBooking({ slug: item.slug, source: "catalogue" }) : requestGate(`/store/${slug}`);
  return <section className="product-detail-page"><div className="container breadcrumb"><Link href="/store">Member Store</Link><span>/</span><span>{item.category}</span></div><div className="container product-detail-grid"><div className="product-detail-image"><img src={item.image} alt={item.title} />{item.badge && <span className="image-badge">{item.badge}</span>}</div><div className="product-detail-copy"><div className="product-meta"><span>{item.brand}</span><span>{item.type}</span></div><h1>{item.title}</h1><p className="detail-description">{item.description}</p><div className={`detail-price ${memberActive && transactionReady ? "unlocked" : "locked"}`}>{memberActive && transactionReady ? <><span className="list-price">List price {formatCurrency(item.listPrice)}</span><strong>{formatCurrency(item.memberPrice)}</strong>{saving && <span className="saving-badge">You save {formatCurrency(saving)}</span>}</> : <><Icon name="lock" /><strong>{memberActive ? "Price awaiting approval" : "Member price locked"}</strong><span>{memberActive ? "Register interest and the team will update you when this offer is enabled." : "Register and activate membership to access protected pricing."}</span></>}</div><div className="detail-location"><Icon name="calendar" /><div><strong>Location & fulfilment</strong><span>{item.location}</span></div></div><ul className="check-list detail-inclusions">{item.inclusions.map((value) => <li key={value}><Icon name="check" /> {value}</li>)}</ul><div className="detail-actions"><button className="button button-primary button-large" onClick={action}>{memberActive ? transactionReady ? item.cta : "Register Interest" : "Login to Unlock"}<Icon name="arrow" /></button><button className={`icon-button detail-save ${saved.includes(item.slug) ? "saved" : ""}`} onClick={() => toggleSaved(item.slug)} aria-label="Save offer"><Icon name="heart" /></button></div><div className="terms-box"><strong>Partner terms</strong><p>{item.terms}</p><small>{transactionReady ? "Price and eligibility are rechecked securely before payment." : "Online payment remains disabled until partner, price and fulfilment approval are complete."}</small></div>{contactConfig.whatsappDigits ? <button className="text-link" onClick={() => openWhatsApp("booking")}>Need help with this offer? Chat on WhatsApp <Icon name="whatsapp" /></button> : <Link className="text-link" href="/about-support?intent=Order%20%2F%20booking%20support">Need help with this offer? Contact support <Icon name="arrow" /></Link>}</div></div><div className="container related-section"><SectionHeading eyebrow="MORE IN THE CIRCLE" title="You may also be interested in." /><div className="product-grid three-col">{catalogue.filter((entry) => entry.slug !== item.slug && (entry.category === item.category || entry.type === item.type)).slice(0, 3).map((entry) => <ProductCard key={entry.slug} item={entry} />)}</div></div></section>;
}

function CartPage() {
  const { memberActive, hydrated, cart, setCartQuantity, removeFromCart } = useApp();
  if (!hydrated) return <PageLoader />;
  if (!memberActive) return <ProtectedState title="Your cart is member-only." copy="Register, activate membership and log in to use protected Store prices and checkout." returnTo="/cart" />;
  const lines = cart.map((line) => ({ ...line, item: catalogue.find((item) => item.slug === line.slug) })).filter((line) => line.item);
  const subtotal = lines.reduce((sum, line) => sum + line.item.memberPrice * line.quantity, 0);
  const listTotal = lines.reduce((sum, line) => sum + line.item.listPrice * line.quantity, 0);
  const unavailable = lines.some((line) => !line.item.verified || line.item.checkoutEnabled === false);
  return <UtilityShell eyebrow="MEMBER CART" title="Review your selected products." copy="Server-side checkout revalidates membership, item eligibility and price before opening payment.">{!lines.length ? <EmptyState icon="bag" title="Your cart is empty." copy="Explore curated member products and passes in the Store." action={<Link href="/store" className="button button-primary">Explore Member Store</Link>} /> : <div className="cart-layout"><div className="cart-lines">{lines.map(({ item, quantity }) => <article className="cart-line" key={item.slug}><img src={item.image} alt="" /><div><span>{item.brand}</span><Link href={`/store/${item.slug}`}>{item.title}</Link><small>{item.location}</small>{(!item.verified || item.checkoutEnabled === false) && <small className="item-pending-label">Online checkout approval pending</small>}<button onClick={() => removeFromCart(item.slug)}>Remove</button></div><div className="quantity-control"><button onClick={() => setCartQuantity(item.slug, quantity - 1)} aria-label="Decrease quantity"><Icon name="minus" /></button><span>{quantity}</span><button onClick={() => setCartQuantity(item.slug, quantity + 1)} aria-label="Increase quantity"><Icon name="plus" /></button></div><strong>{formatCurrency(item.memberPrice * quantity)}</strong></article>)}</div><aside className="cart-summary"><h2>Order summary</h2><span><b>List-price total</b><s>{formatCurrency(listTotal)}</s></span><span><b>Member subtotal</b><strong>{formatCurrency(subtotal)}</strong></span><span className="savings-total"><b>Member saving</b><strong>{formatCurrency(listTotal - subtotal)}</strong></span><span><b>Delivery</b><em>Calculated after address</em></span><div className="summary-total"><b>Estimated total</b><strong>{formatCurrency(subtotal)}</strong></div>{unavailable ? <Link href="/about-support?intent=Order%20%2F%20booking%20support" className="button button-secondary button-full">Ask About Availability</Link> : <Link href="/checkout" className="button button-primary button-full">Continue to Checkout <Icon name="arrow" /></Link>}<small>{unavailable ? "One or more items await final partner approval, so payment is safely disabled." : "Taxes, delivery and final availability are confirmed before payment."}</small></aside></div>}</UtilityShell>;
}

function CheckoutPage() {
  const { memberActive, member, hydrated, cart, clearCart, track } = useApp();
  const navigate = useNavigate();
  const [shipping, setShipping] = useState({ name: member?.name || "", mobile: member?.mobile || "", address: "", area: member?.locality || "", city: member?.city || "", pincode: "" });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  if (!hydrated) return <PageLoader />;
  if (!memberActive) return <ProtectedState title="Checkout requires active membership." copy="Complete membership activation and log in to continue." returnTo="/checkout" />;
  const lines = cart.map((line) => ({ ...line, item: catalogue.find((item) => item.slug === line.slug) })).filter((line) => line.item);
  const total = lines.reduce((sum, line) => sum + line.item.memberPrice * line.quantity, 0);
  if (!lines.length) return <UtilityShell eyebrow="CHECKOUT" title="There is nothing to check out yet." copy="Add an eligible product from the Member Store."><Link href="/store" className="button button-primary">Explore Store</Link></UtilityShell>;
  async function submit(event) {
    event.preventDefault(); setProcessing(true); setError("");
    try {
      const response = await beginPayment({ purpose: "store", items: cart, shipping });
      track("checkout_submit", { items: lines.length, total, verified: true });
      clearCart();
      navigate(`/order-confirmation?ref=${encodeURIComponent(response.reference || "")}`);
    } catch (checkoutError) { setError(readableApiError(checkoutError)); }
    finally { setProcessing(false); }
  }
  const update = (name, value) => setShipping((current) => ({ ...current, [name]: value }));
  return <section className="checkout-page"><div className="container checkout-header"><p className="eyebrow">SECURE MEMBER CHECKOUT</p><h1>Confirm delivery, then pay securely.</h1><p>Prices and membership eligibility are revalidated on the server before payment opens.</p></div><div className="container checkout-layout"><form className="checkout-form" onSubmit={submit}><section><div className="checkout-step"><span>1</span><div><h2>Delivery address</h2><p>Used for order fulfilment and support.</p></div></div><div className="form-grid two-col">{Object.entries({ name: "Full name", mobile: "Mobile number", address: "Address line", area: "Area / landmark", city: "City", pincode: "PIN code" }).map(([name, label]) => <label className="field" key={name}><span>{label}{name === "area" ? <em>Optional</em> : <i className="required-marker" aria-hidden="true">*</i>}</span><input value={shipping[name]} onChange={(event) => update(name, event.target.value)} required={name !== "area"} inputMode={name === "mobile" || name === "pincode" ? "numeric" : undefined} autoComplete={name === "pincode" ? "postal-code" : undefined} /></label>)}</div></section><section><div className="checkout-step"><span>2</span><div><h2>Delivery</h2><p>Final timing and any delivery charge are confirmed by the fulfilment partner.</p></div></div><label className="delivery-option"><input type="radio" name="delivery" defaultChecked /><span><strong>Standard partner delivery</strong>Available in eligible service locations.</span><em>Confirmed with order</em></label></section><section><div className="checkout-step"><span>3</span><div><h2>Secure payment</h2><p>UPI, cards, netbanking and other enabled methods appear in the payment gateway.</p></div></div><label className="delivery-option"><input type="radio" name="payment" defaultChecked /><span><strong>Online payment</strong>Amount and order reference are created securely on the server.</span><Icon name="shield" /></label></section><label className="check-field"><input type="checkbox" required /><span>I confirm the delivery information and accept the <Link href="/legal/store-terms">Store Terms</Link> and <Link href="/legal/cancellation-refund">Cancellation & Refund Policy</Link>.</span></label>{error && <div className="form-alert" role="alert"><Icon name="shield" /> {error}</div>}<button className="button button-primary button-full button-large" disabled={processing} type="submit">{processing ? "Preparing secure payment…" : `Pay ${formatCurrency(total)}`}<Icon name="arrow" /></button></form><aside className="checkout-summary"><h2>Your items</h2>{lines.map(({ item, quantity }) => <div className="checkout-line" key={item.slug}><img src={item.image} alt="" /><span><strong>{item.title}</strong><small>Qty {quantity}</small></span><b>{formatCurrency(item.memberPrice * quantity)}</b></div>)}<div className="summary-total"><b>Member total</b><strong>{formatCurrency(total)}</strong></div><small>Server validation prevents client-side price changes from affecting the charged amount.</small></aside></div></section>;
}

function ConfirmationPage({ type }) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const reference = params.get("ref") || "Your account reference";
  const title = params.get("title") || "Your selected experience";
  const interest = params.get("status") === "interest";
  const order = type === "order";
  return <section className="confirmation-page"><div className="confirmation-card"><div className="success-icon"><Icon name="check" /></div><p className="eyebrow">{order ? "PAYMENT VERIFIED" : interest ? "INTEREST REGISTERED" : "BOOKING CONFIRMED"}</p><h1>{order ? "Your order has been received." : interest ? `We will update you about ${title}.` : `Your place for ${title} is recorded.`}</h1><p>{order ? `Reference ${reference}. It is now available in your account for fulfilment updates.` : `Reference ${reference}. Booking status and future updates appear in your account.`}</p><div className="confirmation-actions"><Link className="button button-primary" href="/account">View My Account <Icon name="arrow" /></Link><Link className="button button-secondary" href={order ? "/store" : "/community"}>{order ? "Continue Shopping" : "Explore Experiences"}</Link></div></div></section>;
}

function ForgotPasswordPage() {
  const [memberId, setMemberId] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState({ sending: false, sent: false, message: "", error: "" });
  async function submit(event) {
    event.preventDefault(); setState({ sending: true, sent: false, message: "", error: "" });
    try { const response = await apiRequest("/api/auth/recover", { method: "POST", body: { memberId, contact } }); setState({ sending: false, sent: true, message: response.message, error: "" }); }
    catch (error) { setState({ sending: false, sent: false, message: "", error: readableApiError(error) }); }
  }
  return <UtilityShell eyebrow="MEMBER ACCESS" title="Reset your password." copy="Enter your Member ID and the email or mobile number used during registration.">{state.sent ? <div className="success-inline"><Icon name="check" /><div><h3>Recovery request received.</h3><p>{state.message}</p></div></div> : <form className="narrow-form" onSubmit={submit}><label className="field"><span>Member ID<i className="required-marker" aria-hidden="true">*</i></span><input value={memberId} onChange={(event) => setMemberId(event.target.value)} required autoComplete="username" /></label><label className="field"><span>Registered email or mobile<i className="required-marker" aria-hidden="true">*</i></span><input value={contact} onChange={(event) => setContact(event.target.value)} required autoComplete="email" /></label>{state.error && <div className="form-alert" role="alert">{state.error}</div>}<button className="button button-primary button-full" disabled={state.sending}>{state.sending ? "Submitting…" : "Send Recovery Instructions"}</button></form>}<Link className="text-link" href="/login">Back to Member Login</Link></UtilityShell>;
}

const legalContent = {
  privacy: { title: "Privacy Policy", copy: "How One Life Circle handles account, enquiry and transaction information.", sections: [{ title: "Information we collect", body: "We collect information needed to create and manage membership accounts, process enquiries, support bookings and orders, prevent misuse and meet legal or operational requirements. Avoid sharing medical or highly sensitive information through general forms." }, { title: "How information is used", body: "Information is used to provide requested services, verify membership, process transactions, communicate service updates, resolve support requests and improve operational reliability. Access should be limited to authorised personnel and approved service providers." }, { title: "Your choices", body: "Members may request access, correction or deletion where applicable, and may withdraw optional marketing consent. Transaction and compliance records may need to be retained for legitimate legal or operational periods." }] },
  "membership-terms": { title: "Terms of Membership", copy: "Core rules for annual membership, access and benefit use.", sections: [{ title: "Activation and identity", body: "A membership account is created at registration. Store access, bookings and the active digital card begin only after annual payment is verified. Member IDs and credentials are personal and must not be shared." }, { title: "Benefits and availability", body: "Benefits depend on the selected plan, eligibility, location, provider availability and specific programme terms. Monthly allowances, exclusions, booking limits and lapse or rollover rules will be shown in the applicable benefit terms." }, { title: "Suspension and support", body: "Fraud, credential sharing, abuse or misuse may lead to restricted access while the issue is reviewed. Members can use the support route for account, payment, booking or grievance assistance." }] },
  "store-terms": { title: "Member Store Terms", copy: "Rules for protected member pricing, orders, bookings and fulfilment.", sections: [{ title: "Eligibility and price", body: "Only active members can access protected Store prices. The server revalidates membership status, item eligibility and price before creating a payment order." }, { title: "Partner fulfilment", body: "Products, services and experiences may be supplied by approved partners. The responsible provider, location, availability, taxes, delivery or booking conditions are shown before a transaction is enabled." }, { title: "Orders and support", body: "Paid orders and bookings receive a unique reference in the member account. Use Order and Booking Support for fulfilment, rescheduling, cancellation, return or escalation requests." }] },
  "partner-terms": { title: "Partner Terms & Disclaimers", copy: "How partner benefits and responsibilities are represented.", sections: [{ title: "Approved participation", body: "A partner offer should be enabled for transactions only after commercial terms, pricing, fulfilment responsibility and member eligibility are approved." }, { title: "Verification and data", body: "Only the minimum information needed for verification or fulfilment should be shared, under approved privacy, settlement and grievance arrangements." }] },
  "cancellation-refund": { title: "Cancellation & Refund Policy", copy: "Cancellation and refund eligibility differs by membership, product, service and experience.", sections: [{ title: "Before payment", body: "The applicable cancellation, rescheduling, return and refund terms must be reviewed before enabling a listing or membership payment in live mode." }, { title: "After payment", body: "Requests are assessed against the terms shown for that transaction, payment status, provider policy and applicable law. Approved refunds are returned through the original payment method where supported." }, { title: "Support route", body: "Submit the order or booking reference through the support form so the correct fulfilment owner can review the request." }] },
  "medical-disclaimer": { title: "Medical Information Disclaimer", copy: "One Life Circle is a membership and access ecosystem, not an emergency service.", sections: [{ title: "General information", body: "Website information is not diagnosis, treatment or a substitute for advice from a qualified professional." }, { title: "Emergencies", body: "Use appropriate local emergency services for urgent medical or safety concerns." }, { title: "Provider responsibility", body: "Professional eligibility, suitability, consent and service delivery remain subject to the approved provider process." }] },
};

function LegalPage() {
  const { slug = "privacy" } = useParams();
  const content = legalContent[slug] || legalContent.privacy;
  return <UtilityShell eyebrow="LEGAL & TRUST" title={content.title} copy={content.copy}><div className="legal-sections">{content.sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}</div><p className="legal-updated">Effective 11 August 2026 · Read together with the applicable plan, partner and transaction terms.</p></UtilityShell>;
}

function UtilityShell({ eyebrow, title, copy, children }) { return <section className="utility-page"><div className="container utility-header"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div><div className="container utility-content">{children}</div></section>; }
function ProtectedState({ title, copy, returnTo }) { const { requestGate } = useApp(); return <section className="utility-page"><div className="container utility-content"><EmptyState icon="lock" title={title} copy={copy} action={<div className="hero-actions"><button className="button button-primary" onClick={() => requestGate(returnTo)}>Login or Activate</button><Link href="/membership" className="button button-secondary">Explore Membership</Link></div>} /></div></section>; }
function PageLoader() { return <div className="page-loader"><span /><p>Preparing your Circle...</p></div>; }

export { AccessCardPage, AccountPage, CartPage, CheckoutPage, ConfirmationPage, ForgotPasswordPage, LegalPage, LoginPage, ProductDetailPage, VerifyPage };
