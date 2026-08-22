import BrandLogo from "./BrandLogo";
import { Icon } from "./icons";

function cardDate(value, fallback) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export default function MembershipCard({ compact = false, member }) {
  if (!member) return null;
  const memberId = member.memberId || member.id;
  const status = member.statusLabel || (member.status === "active" ? "Active" : member.status);
  const issued = cardDate(member.issuedAt || member.issued, "After activation");
  const validTill = cardDate(member.validUntil || member.validTill, "After activation");
  return (
    <article className={`digital-membership-card ${compact ? "is-compact" : ""}`} aria-label={`${member.plan} digital membership card for ${member.name}`}>
      <div className="digital-card-top">
        <BrandLogo size="card" />
        <span className="digital-card-plan"><Icon name="spark" /> {member.plan.toUpperCase()}</span>
      </div>
      <div className="digital-card-body">
        <div>
          <span className="digital-card-label">MEMBER</span>
          <h3>{member.name}</h3>
          <p>{memberId}</p>
        </div>
        <div className="digital-card-qr" aria-label="Membership verification mark">
          <span /><span /><span />
        </div>
      </div>
      <div className="digital-card-footer">
        <span><b>Issued</b>{issued}</span>
        <span><b>Valid till</b>{validTill}</span>
        <span><b>Status</b>{status}</span>
      </div>
      <div className="digital-card-bottomline">
        <span>www.onelifecircle.in</span>
        <span>Benefits &amp; terms apply</span>
      </div>
    </article>
  );
}
