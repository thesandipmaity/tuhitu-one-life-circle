import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Link from "../components/Link";
import BrandLogo from "../components/BrandLogo";
import { Icon } from "../components/icons";
import { useApp } from "../components/app-provider";
import { formatCurrency, plans } from "../data/site-data";
import { apiRequest, readableApiError } from "../lib/api";
import { beginPayment } from "../lib/payments";
import { buildSupabaseRegistrationPayload, getSupabaseClient, hasSupabaseAuth, resolveAuthMember } from "../lib/supabase";

const initialForm = {
  fullName: "",
  mobile: "",
  email: "",
  city: "",
  locality: "",
  ageGroup: "",
  interest: "Better everyday choices",
  password: "",
  confirmPassword: "",
  consent: false,
  website: "",
};

function registrationErrorMessage(error) {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "Cannot reach Supabase. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart the dev server.";
  }
  return readableApiError(error);
}

export function MembershipRegistrationPage() {
  const navigate = useNavigate();
  const { refreshMember, paymentConfigured, track } = useApp();
  const [planId, setPlanId] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("plan");
    return plans.some((plan) => plan.id === requested) ? requested : "community";
  });
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(null);
  const [paymentError, setPaymentError] = useState("");
  const [paying, setPaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const selectedPlan = plans.find((plan) => plan.id === planId) || plans[0];
  const supabase = getSupabaseClient();

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function validate() {
    const next = {};
    if (form.fullName.trim().length < 2) next.fullName = "Please enter your full name.";
    if (!/^\+?[0-9\s-]{10,16}$/.test(form.mobile.trim())) next.mobile = "Enter a valid mobile number.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (form.city.trim().length < 2) next.city = "Please enter your city.";
    if (form.password.length < 10 || !/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password)) next.password = "Use 10+ characters with uppercase, lowercase and a number.";
    if (form.confirmPassword !== form.password) next.confirmPassword = "Passwords do not match.";
    if (!form.consent) next.consent = "Consent is required to register.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    if (!validate()) {
      const formElement = event.currentTarget;
      window.requestAnimationFrame(() => (formElement.querySelector('[aria-invalid="true"]') || formElement.querySelector('input[type="checkbox"]'))?.focus());
      return;
    }
    setSubmitting(true);
    setPaymentError("");
    try {
      if (hasSupabaseAuth() && supabase) {
        const payload = buildSupabaseRegistrationPayload(form, planId, "email");
        const { data, error } = await supabase.auth.signUp(payload);
        if (error) throw error;
        const nextMember = await resolveAuthMember(supabase, data.user);
        setRegistered({ ...nextMember, verificationPending: !data.session });
        if (data.session) await refreshMember();
      } else {
        const response = await apiRequest("/api/auth/register", {
          method: "POST",
          body: { ...form, planId },
        });
        setRegistered(response.member);
        await refreshMember();
      }
      track("registration_submit", { source: "membership_registration_page", plan: selectedPlan.id });
    } catch (error) {
      setErrors((current) => ({ ...current, ...(error.details || {}), form: registrationErrorMessage(error) }));
    } finally {
      setSubmitting(false);
    }
  }

  async function activateMembership() {
    setPaymentError("");
    setPaying(true);
    try {
      await beginPayment({ purpose: "membership", referenceId: planId });
      await refreshMember();
      navigate("/account?activated=1");
    } catch (error) {
      setPaymentError(readableApiError(error));
    } finally {
      setPaying(false);
    }
  }

  async function copyMemberId() {
    await navigator.clipboard.writeText(registered.memberId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (registered) {
    return <section className="confirmation-page"><div className="confirmation-card registration-success-card">
      <div className="success-icon"><Icon name="check" /></div><p className="eyebrow">REGISTRATION COMPLETE</p>
      <h1>Your personal Member ID is ready.</h1>
      <p>{registered.verificationPending ? "Your account has been created. Verify the email sent by Supabase to finish activation, then log in with email + password." : "Save this ID with the password you created. You can log in immediately; Store prices, bookings and checkout activate after annual payment is verified."}</p>
      <div className="issued-member-id"><span>YOUR MEMBER ID</span><strong>{registered.memberId}</strong><button type="button" onClick={copyMemberId}>{copied ? "Copied" : "Copy ID"}</button></div>
      <div className="registration-next-step"><span>{selectedPlan.name} annual membership</span><strong>{formatCurrency(selectedPlan.annualPrice)}</strong><small>{selectedPlan.potentialValueLabel} potential annual value · Terms apply</small></div>
      {paymentError && <div className="form-alert" role="alert"><Icon name="shield" /> {paymentError}</div>}
      <div className="confirmation-actions">
        <button className="button button-primary" onClick={activateMembership} disabled={paying || !paymentConfigured}>{paying ? "Preparing secure payment…" : paymentConfigured ? `Pay ${formatCurrency(selectedPlan.annualPrice)} & Activate` : "Online payment activation pending"} <Icon name="arrow" /></button>
        <Link className="button button-secondary" href="/account">Open My Account</Link>
      </div>
      {!paymentConfigured && <small>Merchant credentials still need to be activated before online payment can open. Your registration and Member ID are already saved.</small>}
    </div></section>;
  }

  return <section className="registration-page">
    <div className="container registration-layout">
      <aside className="registration-intro">
        <BrandLogo size="registration" /><p className="eyebrow">{selectedPlan.name.toUpperCase()} MEMBERSHIP</p><h1>{formatCurrency(selectedPlan.annualPrice)} / year</h1>
        {selectedPlan.regularPrice && <p className="registration-regular-price">Regular annual price <s>{formatCurrency(selectedPlan.regularPrice)}</s></p>}
        <div className="registration-value"><span>Potential annual benefit value</span><strong>{selectedPlan.potentialValueLabel}</strong></div><p>{selectedPlan.summary}</p>
        <ul className="check-list">{selectedPlan.benefits.map((benefit) => <li key={benefit}><Icon name="check" /> {benefit}</li>)}</ul>
        <strong className="annual-payment-note">Annual membership · Paid upfront</strong>
      </aside>
      <form className="registration-form form-card" onSubmit={submit} noValidate>
        <h2>Create your member account</h2><p>Your password is securely protected. The Member ID is generated from your name, registration year and unique sequence—never from your phone number or date of birth.</p>
        <label className="field"><span>Membership plan<i className="required-marker" aria-hidden="true">*</i></span><select name="plan" value={planId} required onChange={(event) => setPlanId(event.target.value)}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {formatCurrency(plan.annualPrice)}/year</option>)}</select></label>
        <div className="form-grid two-col">
          <ControlledInput label="Full name" name="fullName" value={form.fullName} onChange={update} autoComplete="name" error={errors.fullName} required />
          <ControlledInput label="Mobile number" name="mobile" value={form.mobile} onChange={update} type="tel" inputMode="tel" placeholder="+91" autoComplete="tel" error={errors.mobile} required />
          <ControlledInput label="Email" name="email" value={form.email} onChange={update} type="email" inputMode="email" autoComplete="email" error={errors.email} required />
          <ControlledInput label="City" name="city" value={form.city} onChange={update} autoComplete="address-level2" placeholder="Panchkula" error={errors.city} required />
          <ControlledInput label="Area / society" name="locality" value={form.locality} onChange={update} autoComplete="address-line2" />
          <label className="field"><span>Age group <em>Optional</em></span><select value={form.ageGroup} onChange={(event) => update("ageGroup", event.target.value)}><option value="">Select</option><option>18-29</option><option>30-44</option><option>45-59</option><option>60+</option></select></label>
          <ControlledInput label="Create password" name="password" value={form.password} onChange={update} type="password" autoComplete="new-password" error={errors.password} required />
          <ControlledInput label="Confirm password" name="confirmPassword" value={form.confirmPassword} onChange={update} type="password" autoComplete="new-password" error={errors.confirmPassword} required />
        </div>
        <span className="field-help">Use at least 10 characters, including uppercase, lowercase and a number.</span>
        <label className="field"><span>Primary interest <em>Optional</em></span><select value={form.interest} onChange={(event) => update("interest", event.target.value)}><option>Better everyday choices</option><option>Wellness & therapies</option><option>Family wellness</option><option>Member savings & partner access</option><option>Community & experiences</option><option>Companionship</option></select></label>
        <label className="honeypot-field" aria-hidden="true"><span>Website</span><input tabIndex="-1" autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} /></label>
        <label className="check-field"><input type="checkbox" checked={form.consent} onChange={(event) => update("consent", event.target.checked)} /><span>I consent to account creation and membership contact, and accept the <Link href="/legal/privacy">Privacy Policy</Link> and <Link href="/legal/membership-terms">Membership Terms</Link>.</span></label>
        {errors.consent && <span className="field-error" role="alert">{errors.consent}</span>}
        {errors.form && <div className="form-alert" role="alert"><Icon name="shield" /> {errors.form}</div>}
        <button className="button button-primary button-full button-large" type="submit" disabled={submitting}>{submitting ? "Creating secure account…" : "Create Member ID & Continue"}<Icon name="arrow" /></button>
        <small>{hasSupabaseAuth() ? "Email login works once email auth is enabled in Supabase and the account email is verified if confirmation is turned on." : "Your Store access activates only after payment verification. Do not enter medical or highly sensitive information here."}</small>
      </form>
    </div>
  </section>;
}

function ControlledInput({ label, name, value, onChange, type = "text", placeholder, error, required = false, autoComplete, inputMode }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const input = <input id={name} name={name} value={value} onChange={(event) => onChange(name, event.target.value)} type={isPassword && visible ? "text" : type} required={required} placeholder={placeholder} autoComplete={autoComplete} inputMode={inputMode} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} />;
  const labelContent = <>{label}{required ? <i className="required-marker" aria-hidden="true">*</i> : <em>Optional</em>}</>;
  if (isPassword) return <div className="field password-field"><label htmlFor={name}>{labelContent}</label><div>{input}<button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}><Icon name="eye" /></button></div>{error && <span className="field-error" id={`${name}-error`} role="alert">{error}</span>}</div>;
  return <label className="field"><span>{labelContent}</span>{input}{error && <span className="field-error" id={`${name}-error`} role="alert">{error}</span>}</label>;
}
