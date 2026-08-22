import { useEffect, useState } from "react";
import Link from "../components/Link";
import BrandLogo from "../components/BrandLogo";
import { useApp, Field } from "../components/app-provider";
import { Accordion, PageHero, SectionHeading } from "../components/ui";
import { Icon } from "../components/icons";
import { contactConfig, faqs, partners, supportIntents, teamMembers, visionMission } from "../data/site-data";
import { apiRequest, readableApiError } from "../lib/api";

function AboutSupportPage() {
  const { openJoin, openWhatsApp, track } = useApp();
  const [intent, setIntent] = useState("Membership enquiry");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [reference, setReference] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const value = new URLSearchParams(window.location.search).get("intent");
      if (value && supportIntents.includes(value)) setIntent(value);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = {};
    if (!String(data.get("name") || "").trim()) next.name = "Please complete this field.";
    const contact = String(data.get("contact") || "").trim();
    if (!contact) next.contact = "Please add a contact number or email.";
    else if (contact.includes("@") ? !/^\S+@\S+\.\S+$/.test(contact) : !/^\+?[0-9\s-]{10,15}$/.test(contact)) next.contact = "Enter a valid email address or mobile number.";
    if (!String(data.get("message") || "").trim()) next.message = "Please tell us how we can help.";
    if (!data.get("consent")) next.consent = "Consent is required to submit.";
    setErrors(next);
    if (Object.keys(next).length) {
      const formElement = event.currentTarget;
      window.requestAnimationFrame(() => (formElement.querySelector('[aria-invalid="true"]') || formElement.querySelector('input[name="consent"]'))?.focus());
      return;
    }
    track(intent === "Become a partner" ? "partner_form_submit" : "support_form_submit", { intent, source: "About & Support" });
    setSubmitting(true);
    try {
      const payload = Object.fromEntries(data.entries());
      const response = await apiRequest("/api/forms/support", { method: "POST", body: { ...payload, intent, consent: Boolean(data.get("consent")) } });
      setReference(response.reference);
      setSubmitted(true);
    } catch (error) {
      setErrors((current) => ({ ...current, form: readableApiError(error) }));
    } finally {
      setSubmitting(false);
    }
  }

  return <>
      <PageHero
        eyebrow="ABOUT ONE LIFE CIRCLE"
        title="Better living should be easier to access."
        copy="One Life Circle is a membership ecosystem built to make wellness, better everyday choices, meaningful experiences and community more accessible across different stages of life."
        image="/assets/intergenerational-community.webp"
        imageAlt="Young and older adults participating together in a community activity"
      >
        <button className="button button-primary button-large" onClick={() => openJoin("About hero")}>Become a Member <Icon name="arrow" /></button>
        <button className="button button-secondary button-large" onClick={() => document.getElementById("support-form")?.scrollIntoView({ behavior: "smooth" })}>Contact the Circle</button>
      </PageHero>

      <section className="section ecosystem-model-section">
        <div className="container">
          <SectionHeading eyebrow="HOW THE ECOSYSTEM WORKS" title="One membership. Different value at different stages." copy="The Circle connects people and families with opportunities that can help them live better — individually and together." align="center" />
          <div className="ecosystem-model universal-model">
            <article><div className="model-icon"><Icon name="spark" /></div><span>01</span><h3>Better choices and savings</h3><p>Everyday products, member pricing and practical wellness options.</p></article>
            <div className="model-centre"><BrandLogo size="compact" /><strong>ONE DIGITAL IDENTITY</strong></div>
            <article><div className="model-icon"><Icon name="wellness" /></div><span>02</span><h3>Wellness and experiences</h3><p>Selected therapies, services, community programmes and experiences.</p></article>
          </div>
          <div className="partner-examples">
            {partners.map((partner) => <article key={partner.id}>
                <img src={partner.logo} alt={partner.name} />
                <div><span>{partner.category}</span><p>{partner.description}</p></div>
                <Icon name="shield" />
              </article>)}
            <p>Additional partners and benefits appear only after terms are approved.</p>
          </div>
        </div>
      </section>

      <section className="section vision-mission-section">
        <div className="container">
          <SectionHeading eyebrow="OUR DIRECTION" title="Built for better access and everyday value." align="center" />
          <div className="vision-mission-grid">
            <article><span>OUR VISION</span><h2>A Circle that remains relevant through life.</h2><p>{visionMission.vision}</p></article>
            <article><span>OUR MISSION</span><h2>Bring useful value together through one membership.</h2><p>{visionMission.mission}</p></article>
          </div>
        </div>
      </section>

      <section className="section team-section">
        <div className="container">
          <SectionHeading eyebrow="THE TEAM BEHIND THE CIRCLE" title="Different functions. One coordinated member experience." copy="The operating model brings membership support, partner coordination, wellness access and community programming together." />
          {teamMembers.length ? <div className="team-grid">{teamMembers.map((member) => <article key={member.name}><img src={member.image} alt={member.name} /><div><h3>{member.name}</h3><span>{member.role}</span><p>{member.bio}</p></div></article>)}</div> : <div className="team-function-grid">
            <article><Icon name="user" /><h3>Membership & Support</h3><p>Registration, account access, benefit guidance and issue resolution.</p></article>
            <article><Icon name="wellness" /><h3>Wellness Coordination</h3><p>Provider pathways, booking coordination and benefit eligibility.</p></article>
            <article><Icon name="community" /><h3>Community Programmes</h3><p>Experiences, companionship, participation and local engagement.</p></article>
            <article><Icon name="shield" /><h3>Partner & Operations</h3><p>Offer approval, fulfilment ownership, quality controls and escalation.</p></article>
          </div>}
        </div>
      </section>

      <section className="section support-form-section" id="support-form">
        <div className="container support-form-grid">
          <div className="support-form-intro">
            <p className="eyebrow">ONE FORM. THE RIGHT ROUTE.</p>
            <h2>How can we help?</h2>
            <p>Select your enquiry type. Your submission is securely saved with a reference so the team can route it to membership, partner, doctor, society, event or support follow-up.</p>
            <div className="intent-list" role="list" aria-label="Enquiry type">
              {supportIntents.map((value) => <button role="listitem" key={value} className={intent === value ? "active" : ""} onClick={() => {
                setIntent(value);
                setSubmitted(false);
                setErrors({});
              }}><span>{value}</span><Icon name="arrow" /></button>)}
            </div>
          </div>
          <div className="dynamic-form-card">
              {intent === "Become a Companion" ? <div className="companion-route-card"><div className="modal-icon"><Icon name="community" /></div><p className="eyebrow">COMMUNITY PARTICIPATION</p><h2>Apply to become a One Life Circle Companion.</h2><p>The dedicated application covers interests, availability, verification, safeguarding and programme matching.</p><Link className="button button-primary button-full" href="/become-a-companion">Open Companion Application <Icon name="arrow" /></Link><small>Submitting an application does not guarantee selection.</small></div> : submitted ? <div className="success-state form-success"><div className="success-icon"><Icon name="check" /></div><p className="eyebrow">ENQUIRY RECEIVED</p><h2>Thank you. The right team can now follow up.</h2><p>Your reference is <strong>{reference}</strong>. Keep it for any follow-up about this {intent.toLowerCase()} enquiry.</p><button className="button button-secondary" onClick={() => setSubmitted(false)}>Submit Another Enquiry</button></div> : <form onSubmit={submit} noValidate>
                <div className="form-title-row"><div><p className="eyebrow">SELECTED ROUTE</p><h3>{intent}</h3></div><Icon name="spark" /></div>
                <DynamicFields intent={intent} errors={errors} />
                <label className="check-field"><input type="checkbox" name="consent" /><span>I consent to be contacted regarding this enquiry and accept the <Link href="/legal/privacy">privacy notice</Link>.</span></label>
                {errors.consent && <span className="field-error">{errors.consent}</span>}
                {errors.form && <div className="form-alert" role="alert"><Icon name="shield" /> {errors.form}</div>}
                <button className="button button-primary button-full" type="submit" disabled={submitting}>{submitting ? "Submitting securely…" : "Submit Enquiry"} <Icon name="arrow" /></button>
                <small>Your enquiry is stored for follow-up. Do not share medical or highly sensitive personal information.</small>
              </form>}
          </div>
        </div>
      </section>

      <section className="section about-faq-section">
        <div className="container about-faq-grid">
          <div><SectionHeading eyebrow="FREQUENTLY ASKED" title="Simple answers before the next step." /><Accordion items={faqs.filter((faq) => faq.page === "support")} /></div>
          <aside className="contact-card">
            <p className="eyebrow">CONTACT & SUPPORT</p><h2>Reach the Circle in the way that suits you.</h2>
            <div className="contact-list">
              <span><b>Service area</b>{contactConfig.serviceArea}</span>
              <span><b>Email</b>{contactConfig.email}</span>
              {contactConfig.whatsappDigits && <span><b>WhatsApp</b>{contactConfig.whatsappDisplay}</span>}
              <span><b>Business hours</b>{contactConfig.businessHours}</span>
            </div>
            {contactConfig.whatsappDigits ? <button className="button button-primary button-full" onClick={() => openWhatsApp("support")}>Chat on WhatsApp <Icon name="whatsapp" /></button> : <button className="button button-primary button-full" onClick={() => document.getElementById("support-form")?.scrollIntoView({ behavior: "smooth" })}>Send an Enquiry <Icon name="arrow" /></button>}
            <button className="button button-secondary button-full" onClick={() => openJoin("Support contact card")}>Get Membership</button>
            <Link className="text-link companion-contact-link" href="/become-a-companion">Become a Companion <Icon name="arrow" /></Link>
          </aside>
        </div>
      </section>
    </>;
}

function DynamicFields({ intent, errors }) {
  const common = <div className="form-grid two-col"><Field label={intent === "Doctor partnership" ? "Doctor name" : intent === "Become a partner" ? "Company / contact name" : intent === "Society / RWA collaboration" ? "Society / contact name" : "Name"} name="name" required error={errors.name} /><Field label="Contact number or email" name="contact" required error={errors.contact} /></div>;
  return <>
      {common}
      {intent === "Membership enquiry" && <div className="form-grid two-col"><Field label="City" name="city" /><Field label="Plan or benefit interest" name="interest" /></div>}
      {intent === "Membership support" && <div className="form-grid two-col"><Field label="Member ID" name="memberId" /><Field label="Issue type" name="issueType" /></div>}
      {intent === "Become a partner" && <><div className="form-grid two-col"><Field label="Category" name="category" /><Field label="City coverage" name="coverage" /></div><Field label="Website" name="website" type="url" /></>}
      {intent === "Doctor partnership" && <div className="form-grid two-col"><Field label="Speciality" name="speciality" /><Field label="Registration details" name="registration" /></div>}
      {intent === "Society / RWA collaboration" && <div className="form-grid two-col"><Field label="Location" name="location" /><Field label="Approx. resident count" name="residentCount" type="number" /></div>}
      {intent === "Community / Event enquiry" && <div className="form-grid two-col"><Field label="Event or interest" name="eventInterest" /><Field label="Preferred location" name="location" /></div>}
      {intent === "Order / booking support" && <div className="form-grid two-col"><Field label="Member ID" name="memberId" /><Field label="Order / booking reference" name="reference" /></div>}
      <label className="field"><span>{intent === "Become a partner" ? "Proposed member benefit" : intent === "Society / RWA collaboration" ? "Proposed activity" : "How can we help?"}</span><textarea name="message" rows={5} aria-invalid={Boolean(errors.message)} /></label>
      {errors.message && <span className="field-error">{errors.message}</span>}
    </>;
}

export { AboutSupportPage };
