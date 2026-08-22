import { useState } from "react";
import Link from "../components/Link";
import { Icon } from "../components/icons";
import { companionFormConfig } from "../data/forms";
import { useApp } from "../components/app-provider";
import { apiRequest, readableApiError } from "../lib/api";

export function CompanionPage() {
  const { track } = useApp();
  const [occupation, setOccupation] = useState("");
  const [interests, setInterests] = useState([]);
  const [days, setDays] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");

  function toggleInterest(value) {
    setInterests((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function toggleDay(value) {
    setDays((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = {};
    if (!String(data.get("fullName") || "").trim()) next.fullName = "Please enter your full name.";
    if (!/^\+?[0-9\s-]{10,15}$/.test(String(data.get("mobile") || ""))) next.mobile = "Enter a valid mobile number.";
    if (!/^\S+@\S+\.\S+$/.test(String(data.get("email") || ""))) next.email = "Enter a valid email address.";
    if (!String(data.get("city") || "").trim()) next.city = "Please enter your city.";
    if (!String(data.get("ageGroup") || "").trim()) next.ageGroup = "Select your age group.";
    if (!String(data.get("language") || "").trim()) next.language = "Select a preferred language.";
    if (!occupation) next.occupation = "Select your current background.";
    if (occupation === "Other" && !String(data.get("occupationDetail") || "").trim()) next.occupationDetail = "Tell us your current occupation or background.";
    if (!String(data.get("introduction") || "").trim()) next.introduction = "Please add a short introduction.";
    if (!interests.length) next.interests = "Select at least one area of interest.";
    if (interests.includes("Other") && !String(data.get("otherInterest") || "").trim()) next.otherInterest = "Describe your other interest.";
    if (!days.length) next.days = "Select at least one preferred day.";
    if (!String(data.get("scheduleType") || "").trim()) next.scheduleType = "Select weekday or weekend availability.";
    if (!String(data.get("timeSlot") || "").trim()) next.timeSlot = "Select a preferred time slot.";
    if (!String(data.get("mode") || "").trim()) next.mode = "Select a participation mode.";
    if (!String(data.get("serviceArea") || "").trim()) next.serviceArea = "Add your preferred service area.";
    if (!String(data.get("frequency") || "").trim()) next.frequency = "Select a participation frequency.";
    if (!String(data.get("idAvailable") || "").trim()) next.idAvailable = "Confirm whether an ID is available.";
    if (!String(data.get("emergencyName") || "").trim()) next.emergencyName = "Add an emergency contact name.";
    if (!/^\+?[0-9\s-]{10,15}$/.test(String(data.get("emergencyNumber") || ""))) next.emergencyNumber = "Enter a valid emergency contact number.";
    if (!data.get("verification")) next.verification = "Verification consent is required.";
    if (!data.get("conduct")) next.conduct = "Conduct and safeguarding consent is required.";
    if (!data.get("contactConsent")) next.contactConsent = "Contact consent is required.";
    setErrors(next);
    if (Object.keys(next).length) {
      const formElement = event.currentTarget;
      window.requestAnimationFrame(() => (formElement.querySelector('[aria-invalid="true"]') || formElement.querySelector('input[type="checkbox"]'))?.focus());
      return;
    }

    setSubmitting(true);
    track("companion_form_submit", { source: companionFormConfig.source, interests });
    try {
      const payload = Object.fromEntries(data.entries());
      const response = await apiRequest("/api/forms/companion", { method: "POST", body: {
        ...payload,
        name: payload.fullName,
        contact: payload.email || payload.mobile,
        occupation,
        interests,
        days,
        verification: Boolean(data.get("verification")),
        conduct: Boolean(data.get("conduct")),
        contactConsent: Boolean(data.get("contactConsent")),
        photoConsent: Boolean(data.get("photoConsent")),
        consent: Boolean(data.get("contactConsent")),
      } });
      setReference(response.reference);
      setSubmitted(true);
    } catch (error) {
      setErrors((current) => ({ ...current, form: readableApiError(error) }));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <section className="confirmation-page"><div className="confirmation-card companion-success"><div className="success-icon"><Icon name="check" /></div><p className="eyebrow">APPLICATION RECEIVED</p><h1>Thank you for stepping into the Circle.</h1><p>{companionFormConfig.successMessage}</p><div className="issued-member-id"><span>APPLICATION REFERENCE</span><strong>{reference}</strong></div><div className="draft-notice"><Icon name="shield" /><div><strong>Review is required</strong><span>Submitting this form does not guarantee selection or approval.</span></div></div><div className="confirmation-actions"><Link className="button button-primary" href="/community">Explore Community</Link><Link className="button button-secondary" href="/">Return Home</Link></div></div></section>;
  }

  return (
    <section className="companion-page">
      <div className="companion-hero">
        <div className="container companion-hero-grid">
          <div><p className="eyebrow">BECOME A COMPANION</p><h1>Give time, attention and energy where it can mean the most.</h1><p>One Life Circle Companions may support conversation, community activities, digital confidence, events and practical engagement with seniors and families.</p></div>
          <div className="companion-principles"><span><Icon name="shield" /> Verified participation</span><span><Icon name="heart" /> Respectful engagement</span><span><Icon name="community" /> Programme-led matching</span></div>
        </div>
      </div>
      <div className="container companion-layout">
        <form className="companion-form form-card" onSubmit={submit} noValidate>
          <FormSection number="1" title="Personal information" copy="Tell us how to contact and understand you.">
            <div className="form-grid two-col">
              <TextField label="Full name" name="fullName" error={errors.fullName} required />
              <TextField label="Mobile number" name="mobile" type="tel" error={errors.mobile} required />
              <TextField label="Email address" name="email" type="email" error={errors.email} required />
              <TextField label="City" name="city" error={errors.city} required />
              <TextField label="Area or locality" name="locality" />
              <SelectField label="Age group" name="ageGroup" options={companionFormConfig.ageGroups} error={errors.ageGroup} required />
              <SelectField label="Preferred language" name="language" options={companionFormConfig.languages} error={errors.language} required />
              <label className="field"><span>Current background</span><select name="occupation" value={occupation} onChange={(event) => setOccupation(event.target.value)}><option value="">Select</option>{companionFormConfig.occupations.map((item) => <option key={item}>{item}</option>)}</select>{errors.occupation && <span className="field-error">{errors.occupation}</span>}</label>
              <TextField label="Current occupation" name="occupationDetail" error={errors.occupationDetail} required={occupation === "Other"} />
              <TextField label="Organisation or institution" name="organisation" />
            </div>
            <label className="field"><span>Relevant experience <em>Optional</em></span><textarea name="experience" rows="4" placeholder="Seniors, caregiving, healthcare, wellness, volunteering or community work" /></label>
            <label className="field"><span>Short introduction</span><textarea name="introduction" rows="4" aria-invalid={Boolean(errors.introduction)} /></label>
            {errors.introduction && <span className="field-error">{errors.introduction}</span>}
          </FormSection>

          <FormSection number="2" title="Areas of interest" copy="Select every area in which you would genuinely like to participate.">
            <div className="checkbox-grid">{companionFormConfig.interests.map((item) => <label key={item} className={`option-check ${interests.includes(item) ? "selected" : ""}`}><input type="checkbox" checked={interests.includes(item)} onChange={() => toggleInterest(item)} /><span><Icon name="check" />{item}</span></label>)}</div>
            {errors.interests && <span className="field-error">{errors.interests}</span>}
            {interests.includes("Other") && <TextField label="Other interest" name="otherInterest" error={errors.otherInterest} required />}
          </FormSection>

          <FormSection number="3" title="Availability" copy="This helps the team match approved companions to suitable programmes.">
            <div className="day-selector"><span>Preferred days</span><div className="checkbox-grid day-grid">{companionFormConfig.days.map((item) => <label key={item} className={`option-check ${days.includes(item) ? "selected" : ""}`}><input type="checkbox" checked={days.includes(item)} onChange={() => toggleDay(item)} /><span><Icon name="check" />{item}</span></label>)}</div>{errors.days && <span className="field-error">{errors.days}</span>}</div>
            <div className="form-grid two-col">
              <SelectField label="Weekday / weekend availability" name="scheduleType" options={companionFormConfig.scheduleTypes} error={errors.scheduleType} required />
              <SelectField label="Preferred time slot" name="timeSlot" options={companionFormConfig.timeSlots} error={errors.timeSlot} required />
              <SelectField label="Participation mode" name="mode" options={companionFormConfig.modes} error={errors.mode} required />
              <TextField label="Preferred service area" name="serviceArea" error={errors.serviceArea} required />
              <SelectField label="Participation frequency" name="frequency" options={companionFormConfig.frequencies} error={errors.frequency} required />
            </div>
          </FormSection>

          <FormSection number="4" title="Verification and consent" copy="Safeguarding, privacy and suitable programme matching come before participation.">
            <div className="form-grid two-col">
              <SelectField label="Government ID available" name="idAvailable" options={["Yes", "No", "Prefer to discuss"]} error={errors.idAvailable} required />
              <TextField label="Emergency contact name" name="emergencyName" error={errors.emergencyName} required />
              <TextField label="Emergency contact number" name="emergencyNumber" type="tel" error={errors.emergencyNumber} required />
            </div>
            <Consent name="verification" error={errors.verification}>I am willing to undergo identity verification, orientation, an interview and background checks where required.</Consent>
            <Consent name="conduct" error={errors.conduct}>I agree to follow One Life Circle conduct, safeguarding and privacy guidelines.</Consent>
            <Consent name="contactConsent" error={errors.contactConsent}>I consent to being contacted regarding this application and suitable participation opportunities.</Consent>
            <Consent name="photoConsent" optional>I separately consent to photographs or content during approved activities. This is optional.</Consent>
          </FormSection>

          {errors.form && <div className="form-alert" role="alert"><Icon name="shield" /> {errors.form}</div>}
          <div className="companion-submit"><div><strong>Important</strong><p>Selection remains subject to verification, orientation, suitable programme availability and management approval.</p></div><button className="button button-primary button-large" type="submit" disabled={submitting}>{submitting ? "Submitting securely…" : "Submit Companion Application"}<Icon name="arrow" /></button></div>
          <small>Your application is securely saved for review. Do not include medical, financial or highly sensitive information.</small>
        </form>
        <aside className="companion-sidebar"><div className="terms-box"><strong>What happens next?</strong><ol><li>Application review</li><li>Verification, if shortlisted</li><li>Conversation or orientation</li><li>Programme-based matching</li><li>Management approval</li></ol></div><div className="privacy-note"><Icon name="lock" /><span>Do not share medical, financial or highly sensitive personal information in this form.</span></div><Link className="text-link" href="/legal/privacy">Read the privacy notice <Icon name="arrow" /></Link></aside>
      </div>
    </section>
  );
}

function FormSection({ number, title, copy, children }) {
  return <section className="companion-form-section"><div className="checkout-step"><span>{number}</span><div><h2>{title}</h2><p>{copy}</p></div></div>{children}</section>;
}

function TextField({ label, name, type = "text", placeholder, error, required = false }) {
  return <label className="field"><span>{label}{required ? <i className="required-marker" aria-hidden="true">*</i> : <em>Optional</em>}</span><input name={name} type={type} required={required} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} />{error && <span className="field-error" id={`${name}-error`} role="alert">{error}</span>}</label>;
}

function SelectField({ label, name, options, error, required = false }) {
  return <label className="field"><span>{label}{required ? <i className="required-marker" aria-hidden="true">*</i> : <em>Optional</em>}</span><select name={name} defaultValue="" required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined}><option value="">Select</option>{options.map((item) => <option key={item}>{item}</option>)}</select>{error && <span className="field-error" id={`${name}-error`} role="alert">{error}</span>}</label>;
}

function Consent({ name, error, optional = false, children }) {
  return <><label className="check-field"><input type="checkbox" name={name} /><span>{children}{optional && <em> Optional</em>}</span></label>{error && <span className="field-error">{error}</span>}</>;
}
