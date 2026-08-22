import Link from "../components/Link";
import { Icon } from "../components/icons";

export function NotFoundPage() {
  return <section className="confirmation-page"><div className="confirmation-card"><div className="modal-icon"><Icon name="community" /></div><p className="eyebrow">404 · OUTSIDE THE CIRCLE</p><h1>We couldn’t find that page.</h1><p>The link may have changed or the content may no longer be available.</p><div className="confirmation-actions"><Link className="button button-primary" href="/">Return Home</Link><Link className="button button-secondary" href="/about-support">Contact Support</Link></div></div></section>;
}
