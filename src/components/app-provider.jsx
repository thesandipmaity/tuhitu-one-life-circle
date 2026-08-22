import { useLocation, useNavigate } from "react-router-dom";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { catalogue, contactConfig, events, formatCurrency, pageMessages, plans } from "../data/site-data";
import { apiRequest, readableApiError } from "../lib/api";
import { beginPayment } from "../lib/payments";
import { Icon } from "./icons";
import Link from "./Link";
import BrandLogo from "./BrandLogo";

const AppContext = createContext(null);

const navItems = [
  { href: "/", label: "Home" },
  { href: "/membership", label: "Plans & Benefits" },
  { href: "/store", label: "Store" },
  { href: "/community", label: "Community & Experiences" },
  { href: "/about-support", label: "About & Support" },
];

function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}

function AppProvider({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [paymentConfigured, setPaymentConfigured] = useState(false);
  const [cart, setCart] = useState([]);
  const [saved, setSaved] = useState([]);
  const [storageReady, setStorageReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinSource, setJoinSource] = useState("Website organic");
  const [joinPlan, setJoinPlan] = useState("community");
  const [bookingTarget, setBookingTarget] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const refreshMember = useCallback(async () => {
    try {
      const response = await apiRequest("/api/auth/session");
      setMember(response.member || null);
      setPaymentConfigured(Boolean(response.paymentConfigured));
      return response.member || null;
    } catch {
      setMember(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMember();
    try {
      setCart(JSON.parse(localStorage.getItem("olc_cart") || "[]"));
      setSaved(JSON.parse(localStorage.getItem("olc_saved") || "[]"));
    } catch {
      setCart([]);
      setSaved([]);
    }
    setStorageReady(true);
  }, [refreshMember]);

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    if (storageReady) localStorage.setItem("olc_cart", JSON.stringify(cart));
  }, [cart, storageReady]);
  useEffect(() => {
    if (storageReady) localStorage.setItem("olc_saved", JSON.stringify(saved));
  }, [saved, storageReady]);
  useEffect(() => {
    if (!gateOpen && !joinOpen && !bookingTarget) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleModalKey = (event) => {
      if (event.key === "Escape") {
        if (bookingTarget) setBookingTarget(null);
        else if (joinOpen) setJoinOpen(false);
        else setGateOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = document.querySelector('.modal[role="dialog"]');
      const focusable = [...(dialog?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])') || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleModalKey);
    return () => {
      document.removeEventListener("keydown", handleModalKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [bookingTarget, gateOpen, joinOpen]);

  const track = useCallback((event, payload = {}) => {
    window.dispatchEvent(new CustomEvent("olc:analytics", { detail: { event, payload } }));
  }, []);

  function toast(message) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 3600);
  }

  function openJoin(source = "Website organic", planId = "community") {
    setJoinSource(source);
    setJoinPlan(plans.some((plan) => plan.id === planId) ? planId : "community");
    setJoinOpen(true);
    track("membership_join_click", { source, plan: planId, page: pathname });
  }

  function requestGate(returnTo = pathname || "/store") {
    sessionStorage.setItem("olc_return_to", returnTo);
    setGateOpen(true);
    track("store_gate_view", { returnTo, signedIn: Boolean(member), active: Boolean(member?.canAccessStore) });
  }

  async function login(credentials, destination) {
    const response = await apiRequest("/api/auth/login", { method: "POST", body: credentials });
    setMember(response.member);
    setGateOpen(false);
    const requested = destination || sessionStorage.getItem("olc_return_to");
    sessionStorage.removeItem("olc_return_to");
    const returnTo = response.member.canAccessStore ? requested || "/account" : "/account";
    toast(response.member.canAccessStore ? `Welcome back, ${response.member.name.split(" ")[0]}.` : "Welcome back. Complete payment to activate member access.");
    navigate(returnTo);
    return response.member;
  }

  async function logout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } finally {
      setMember(null);
      setCart([]);
      setSaved([]);
      toast("You have signed out securely.");
      navigate("/");
    }
  }

  function requireActive(returnTo) {
    if (!member?.canAccessStore) {
      requestGate(returnTo);
      return false;
    }
    return true;
  }

  function addToCart(slug) {
    if (!requireActive(`/store/${slug}`)) return;
    setCart((current) => {
      const line = current.find((item) => item.slug === slug);
      return line
        ? current.map((item) => item.slug === slug ? { ...item, quantity: Math.min(item.quantity + 1, 9) } : item)
        : [...current, { slug, quantity: 1 }];
    });
    track("add_to_cart", { slug });
    toast("Added to your cart.");
  }

  function setCartQuantity(slug, quantity) {
    if (quantity <= 0) return removeFromCart(slug);
    setCart((current) => current.map((item) => item.slug === slug ? { ...item, quantity: Math.min(quantity, 9) } : item));
  }

  function removeFromCart(slug) {
    setCart((current) => current.filter((item) => item.slug !== slug));
  }

  function clearCart() {
    setCart([]);
  }

  function toggleSaved(slug) {
    if (!requireActive(`/store/${slug}`)) return;
    setSaved((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
  }

  function openBooking(target) {
    const returnTo = target.source === "catalogue" ? `/store/${target.slug}` : `/experiences/${target.slug}`;
    if (!requireActive(returnTo)) return;
    setBookingTarget(target);
  }

  function openWhatsApp(intent) {
    track("whatsapp_click", { intent, page: pathname });
    if (!contactConfig.whatsappDigits) {
      toast("WhatsApp support will activate when the approved business number is added.");
      return;
    }
    window.open(`https://wa.me/${contactConfig.whatsappDigits}?text=${encodeURIComponent(pageMessages[intent])}`, "_blank", "noopener,noreferrer");
  }

  const cartCount = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);
  const value = {
    member,
    memberActive: Boolean(member?.canAccessStore),
    hydrated: !authLoading && storageReady,
    authLoading,
    paymentConfigured,
    cart,
    saved,
    cartCount,
    openJoin,
    requestGate,
    login,
    logout,
    refreshMember,
    addToCart,
    setCartQuantity,
    removeFromCart,
    clearCart,
    toggleSaved,
    openBooking,
    openWhatsApp,
    toast,
    track,
  };
  const hideMobileCta = ["/checkout", "/cart", "/login", "/membership-registration"].includes(pathname) || joinOpen;

  return <AppContext.Provider value={value}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <Header member={member} cartCount={cartCount} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} openJoin={openJoin} />
    <main id="main-content" tabIndex={-1}>{children}</main>
    <Footer openJoin={openJoin} openWhatsApp={openWhatsApp} />
    {contactConfig.whatsappDigits && <button className="whatsapp-fab" aria-label="Chat with One Life Circle on WhatsApp" onClick={() => openWhatsApp(pathname.includes("store") ? "store" : "support")}>
      <Icon name="whatsapp" />
    </button>}
    {!member && !hideMobileCta && <button className="mobile-join-cta" onClick={() => openJoin("Mobile sticky CTA")}>Join <Icon name="arrow" /></button>}
    {gateOpen && <AccessGate
      member={member}
      onClose={() => setGateOpen(false)}
      onLogin={() => { setGateOpen(false); navigate("/login"); }}
      onJoin={() => { setGateOpen(false); openJoin("Store access gate"); }}
      onAccount={() => { setGateOpen(false); navigate("/account"); }}
    />}
    {joinOpen && <JoinModal source={joinSource} defaultPlan={joinPlan} onClose={() => setJoinOpen(false)} />}
    {bookingTarget && <BookingModal target={bookingTarget} onClose={() => setBookingTarget(null)} />}
    <div className={`toast ${toastMessage ? "is-visible" : ""}`} role="status" aria-live="polite"><Icon name="check" /><span>{toastMessage}</span></div>
  </AppContext.Provider>;
}

function Header({ member, cartCount, mobileOpen, setMobileOpen, openJoin }) {
  const { pathname } = useLocation();
  return <header className="site-header">
    <div className="header-inner">
      <Link href="/" className="brand-link" aria-label="One Life Circle home"><BrandLogo size="header" /></Link>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {navItems.map((item) => <Link key={item.href} href={item.href} className={item.href === "/" ? pathname === "/" ? "active" : "" : pathname.startsWith(item.href) ? "active" : ""}>{item.label}</Link>)}
      </nav>
      <div className="header-actions">
        {member ? <>
          {member.canAccessStore && <Link href="/cart" className="icon-button cart-button" aria-label={`Cart with ${cartCount} items`}><Icon name="bag" />{cartCount > 0 && <span>{cartCount}</span>}</Link>}
          <Link href="/account" className="member-pill"><span className="avatar">{member.initials}</span><span>{member.name.split(" ")[0]}</span></Link>
        </> : <><Link href="/login" className="login-link">Login</Link><button className="button button-primary header-join" onClick={() => openJoin("Header CTA")}>Join</button></>}
        <button className="icon-button menu-button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}><Icon name={mobileOpen ? "close" : "menu"} /></button>
      </div>
    </div>
    {mobileOpen && <nav className="mobile-nav" aria-label="Mobile navigation">
      {navItems.map((item) => <Link key={item.href} href={item.href}>{item.label} <Icon name="arrow" /></Link>)}
      {member ? <div className="mobile-member-links"><Link href="/account">My Account</Link>{member.canAccessStore && <Link href="/cart">Cart ({cartCount})</Link>}</div> : <div className="mobile-member-links"><Link href="/login">Member Login</Link><button className="button button-primary" onClick={() => openJoin("Mobile menu")}>Join</button></div>}
    </nav>}
  </header>;
}

function Footer({ openJoin, openWhatsApp }) {
  return <footer className="site-footer">
    <div className="footer-main container">
      <div className="footer-brand"><BrandLogo size="footer" tone="dark" /><p>One membership for wellness, care and better living — for you and your family.</p><button className="button button-light" onClick={() => openJoin("Footer CTA")}>Become a Member <Icon name="arrow" /></button></div>
      <div><h3>Explore</h3><Link href="/membership">Plans & Benefits</Link><Link href="/store">Member Store</Link><Link href="/community">Community & Experiences</Link><Link href="/about-support">About & Support</Link></div>
      <div><h3>Member</h3><Link href="/login">Member Login</Link><Link href="/account">My Account</Link><Link href="/access-card">Access My Card</Link>{contactConfig.whatsappDigits ? <button className="footer-text-button" onClick={() => openWhatsApp("support")}>WhatsApp Support</button> : <Link href="/about-support?intent=Membership%20support">Contact Support</Link>}</div>
      <div><h3>Legal</h3><Link href="/legal/privacy">Privacy Policy</Link><Link href="/legal/membership-terms">Terms of Membership</Link><Link href="/legal/store-terms">Store Terms</Link><Link href="/legal/cancellation-refund">Cancellation & Refund</Link><Link href="/legal/medical-disclaimer">Medical Disclaimer</Link></div>
    </div>
    <div className="footer-bottom container"><span>© 2026 One Life Circle. All rights reserved.</span><span>{contactConfig.serviceArea}</span></div>
  </footer>;
}

function AccessGate({ member, onClose, onLogin, onJoin, onAccount }) {
  const paymentPending = member && !member.canAccessStore;
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="modal gate-modal" role="dialog" aria-modal="true" aria-labelledby="gate-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="modal-close" onClick={onClose} aria-label="Close member access dialog" autoFocus><Icon name="close" /></button>
      <div className="modal-icon"><Icon name="lock" /></div><p className="eyebrow">MEMBER ACCESS</p>
      <h2 id="gate-title">{paymentPending ? "Complete activation to unlock the Store." : "Member prices stay protected."}</h2>
      <p>{paymentPending ? `Your account ${member.memberId} is registered. Complete annual payment from My Account to activate Store prices, bookings and checkout.` : "Register for a membership or log in with your Member ID to access protected prices, bookings and checkout."}</p>
      <div className="gate-actions">
        {paymentPending ? <button className="button button-primary" onClick={onAccount}>Go to My Account</button> : <button className="button button-primary" onClick={onLogin}>Already registered? Login</button>}
        <button className="button button-secondary" onClick={onJoin}>Explore Membership</button>
        <Link href="/membership" onClick={onClose}>Compare all plans</Link>
      </div>
      <small>Store access is activated only after membership payment is verified.</small>
    </section>
  </div>;
}

function JoinModal({ source, defaultPlan, onClose }) {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(defaultPlan || "community");
  const plan = plans.find((item) => item.id === selectedPlan) || plans[0];
  function continueToRegistration() {
    onClose();
    navigate(`/membership-registration?plan=${selectedPlan}&source=${encodeURIComponent(source)}`);
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="modal join-modal" role="dialog" aria-modal="true" aria-labelledby="join-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="modal-close" onClick={onClose} aria-label="Close plan selector" autoFocus><Icon name="close" /></button>
      <p className="eyebrow">ANNUAL MEMBERSHIP</p><h2 id="join-title">Choose a plan to create your member account.</h2>
      <p className="modal-lede">Registration creates your secure login and personalised Member ID. Store access activates after verified annual payment.</p>
      <label className="field"><span>Membership plan<i className="required-marker" aria-hidden="true">*</i></span><select value={selectedPlan} required onChange={(event) => setSelectedPlan(event.target.value)}>{plans.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatCurrency(item.annualPrice)}/year</option>)}</select></label>
      <div className="selected-plan-summary"><strong>{plan.potentialValueLabel} potential annual value</strong><span>{plan.summary}</span></div>
      <button className="button button-primary button-full" onClick={continueToRegistration}>Register for {plan.name} <Icon name="arrow" /></button>
      <small>Benefit use, availability and eligibility are subject to plan and partner terms.</small>
    </section>
  </div>;
}

function Field({ label, name, type = "text", required, error, placeholder, autoComplete, inputMode, minLength }) {
  return <label className="field"><span>{label}{required ? <i className="required-marker" aria-hidden="true">*</i> : <em>Optional</em>}</span><input name={name} type={type} required={required} placeholder={placeholder} autoComplete={autoComplete} inputMode={inputMode} minLength={minLength} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} />{error && <span className="field-error" id={`${name}-error`} role="alert">{error}</span>}</label>;
}

function BookingModal({ target, onClose }) {
  const navigate = useNavigate();
  const { member, paymentConfigured, refreshMember, track } = useApp();
  const item = target.source === "catalogue" ? catalogue.find((entry) => entry.slug === target.slug) : events.find((entry) => entry.slug === target.slug);
  const isEvent = target.source === "event";
  const bookable = isEvent ? item?.bookingOpen === true : item?.verified === true && item?.checkoutEnabled !== false;
  const paidBookingUnavailable = bookable && Number(item?.memberPrice) > 0 && !paymentConfigured;
  const [requestedDate, setRequestedDate] = useState("");
  const [requestedTime, setRequestedTime] = useState("");
  const [attendeeCount, setAttendeeCount] = useState("1");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  if (!item) return null;

  async function submit(event) {
    event.preventDefault();
    setError("");
    setProcessing(true);
    try {
      if (!bookable) {
        const response = await apiRequest("/api/forms/support", { method: "POST", body: {
          name: member.name,
          contact: member.email || member.mobile,
          intent: "Community / Event enquiry",
          eventInterest: item.title,
          message: `Please notify me when online booking opens for ${item.title}. ${notes}`,
          consent: true,
        } });
        onClose();
        navigate(`/booking-confirmation?status=interest&title=${encodeURIComponent(item.title)}&ref=${encodeURIComponent(response.reference)}`);
        return;
      }
      const response = await beginPayment({
        purpose: "booking",
        sourceType: isEvent ? "event" : "catalogue",
        referenceId: item.slug,
        requestedDate: isEvent ? item.date : requestedDate,
        requestedTime: isEvent ? item.time : requestedTime,
        attendeeCount,
        notes,
      });
      await refreshMember();
      track(isEvent ? "event_reserve" : "service_booking", { slug: target.slug, paid: response.paymentRequired !== false });
      onClose();
      navigate(`/booking-confirmation?title=${encodeURIComponent(item.title)}&ref=${encodeURIComponent(response.reference || "")}`);
    } catch (paymentError) {
      setError(readableApiError(paymentError));
    } finally {
      setProcessing(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="modal booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="modal-close" onClick={onClose} aria-label="Close booking form" autoFocus><Icon name="close" /></button>
      <p className="eyebrow">{bookable ? isEvent ? "RESERVE YOUR PLACE" : "MEMBER BOOKING" : "GET NOTIFIED"}</p><h2 id="booking-title">{item.title}</h2>
      <p className="modal-lede">{bookable ? Number(item.memberPrice) > 0 ? `Your member price is ${formatCurrency(item.memberPrice)}. Payment follows secure booking confirmation.` : "This eligible member booking is currently complimentary." : "The schedule or partner configuration is not final. Register your interest and the team will contact you when booking opens."}</p>
      <form onSubmit={submit}>
        {isEvent ? <div className="booking-event-summary"><span><Icon name="calendar" /> {item.date} · {item.time}</span><span><Icon name="community" /> {item.location}</span></div> : <div className="form-grid two-col"><label className="field"><span>Preferred date<i className="required-marker" aria-hidden="true">*</i></span><input type="date" required value={requestedDate} min={today} onChange={(event) => setRequestedDate(event.target.value)} /></label><label className="field"><span>Preferred time<i className="required-marker" aria-hidden="true">*</i></span><select required value={requestedTime} onChange={(event) => setRequestedTime(event.target.value)}><option value="">Select</option><option>10:00 AM</option><option>12:30 PM</option><option>4:00 PM</option></select></label></div>}
        {isEvent && <label className="field"><span>Attendees</span><select value={attendeeCount} onChange={(event) => setAttendeeCount(event.target.value)}>{[1, 2, 3, 4].map((count) => <option key={count}>{count}</option>)}</select></label>}
        <label className="field"><span>Booking note <em>Optional</em></span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add a scheduling note only. Do not share medical information." /></label>
        {error && <div className="form-alert" role="alert"><Icon name="shield" /> {error}</div>}
        <button className="button button-primary button-full" type="submit" disabled={processing || paidBookingUnavailable}>{processing ? "Please wait…" : !bookable ? "Notify Me When Booking Opens" : paidBookingUnavailable ? "Online payment activation pending" : Number(item.memberPrice) > 0 ? `Reserve & Pay ${formatCurrency(item.memberPrice)}` : "Confirm Booking"} <Icon name="arrow" /></button>
        <small>{paidBookingUnavailable ? "Your place is not charged or confirmed until the approved merchant account is active." : bookable ? "Payment is activated only through the verified server order and gateway flow." : "No payment is taken until the schedule, price and capacity are confirmed."}</small>
      </form>
    </section>
  </div>;
}

export { AppProvider, Field, useApp };
