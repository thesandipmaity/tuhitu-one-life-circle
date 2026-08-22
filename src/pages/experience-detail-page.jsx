import { useParams } from "react-router-dom";
import Link from "../components/Link";
import { Icon } from "../components/icons";
import { useApp } from "../components/app-provider";
import { events, formatCurrency } from "../data/site-data";

export function ExperienceDetailPage() {
  const { slug } = useParams();
  const event = events.find((item) => item.slug === slug);
  const { memberActive, openBooking, requestGate, openJoin } = useApp();

  if (!event) return <section className="utility-page"><div className="container utility-content"><h1>Experience not found.</h1><Link className="button button-primary" href="/community">Back to Community</Link></div></section>;

  const reserve = () => memberActive ? openBooking({ slug: event.slug, source: "event" }) : requestGate(`/experiences/${event.slug}`);
  const actionLabel = event.bookingOpen
    ? event.memberPrice > 0 ? `Reserve & Pay ${formatCurrency(event.memberPrice)}` : "Reserve Seat"
    : "Express Interest";

  return <section className="product-detail-page"><div className="container breadcrumb"><Link href="/community">Community & Experiences</Link><span>/</span><span>{event.theme}</span></div><div className="container product-detail-grid"><div className="product-detail-image"><img src={event.image} alt={`${event.title} community experience`} /><span className="image-badge">{event.status}</span></div><div className="product-detail-copy"><div className="product-meta"><span>{event.theme}</span><span>{event.frequency}</span></div><h1>{event.title}</h1><p className="detail-description">{event.description}</p><div className="detail-price unlocked"><span>Member access</span><strong>{event.accessLabel}</strong></div><div className="detail-location"><Icon name="calendar" /><div><strong>{event.date} · {event.time}</strong><span>{event.location} · {event.capacity} places</span></div></div><div className="detail-actions"><button className="button button-primary button-large" onClick={reserve}>{actionLabel} <Icon name="arrow" /></button>{!memberActive && <button className="button button-secondary" onClick={() => openJoin("Experience detail")}>Become a Member</button>}</div><div className="terms-box"><strong>{event.bookingOpen ? "Booking & payment" : "Programme schedule"}</strong><p>{event.bookingOpen ? "The server creates the booking reference and verifies any payment before confirmation appears in the member account." : "The activity is visible for planning; no payment is taken until date, price, capacity and venue are approved."}</p></div></div></div></section>;
}
