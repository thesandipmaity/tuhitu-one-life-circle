import { useApp } from "../components/app-provider";
import { Accordion, PageHero, PlanCard, PlanComparisonTable, SectionHeading } from "../components/ui";
import { Icon } from "../components/icons";
import { benefitCategories, faqs, plans } from "../data/site-data";

function MembershipPage() {
  const { openJoin, track } = useApp();

  return <>
      <PageHero
        eyebrow="MEMBERSHIP PLANS & BENEFITS"
        title="Annual memberships designed to deliver far more value than they cost."
        copy="Start at ₹6,000/year for ₹50,000+ in potential annual benefit value, move to Active for ₹1 lakh+, or choose Signature for ₹2 lakh+ — based on eligible use across monthly benefits and year-round savings."
        image="/assets/inclusive-hero.webp"
        imageAlt="Indian people across several life stages representing One Life Circle membership"
      >
        <button className="button button-primary button-large" onClick={() => openJoin("Membership hero")}>
          Choose Your Plan <Icon name="arrow" />
        </button>
        <span className="helper-line"><Icon name="check" /> All memberships are annual and paid upfront.</span>
      </PageHero>

      <section className="section paid-plan-section">
        <div className="container">
          <SectionHeading
            eyebrow="PAY ONCE. USE THE VALUE ACROSS THE YEAR."
            title="Choose how deeply you want to use the Circle."
            copy="Community offers the strongest entry value. Active increases monthly allowances, savings and priority. Signature provides the highest eligible access and premium privileges."
            align="center"
          />
          <div className="plan-grid">
            {plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
          </div>
          <p className="plan-terms-note">Potential values are illustrative, not cash returns or guaranteed savings. Benefits, quotas, availability, location eligibility and fulfilment remain subject to plan, provider and programme terms.</p>
        </div>
      </section>

      <section className="section compare-section" id="compare-access">
        <div className="container compare-grid">
          <div>
            <SectionHeading eyebrow="COMPARE ACCESS" title="A clear view of all three memberships." copy="Compare the value, eligible monthly benefits, savings and priority at each membership level before you choose." />
            <PlanComparisonTable source="Membership access comparison" />
          </div>
          <div className="faq-column">
            <SectionHeading eyebrow="MEMBERSHIP FAQ" title="What to know before you join." />
            <Accordion items={faqs.filter((faq) => faq.page === "membership")} />
            <button className="button button-secondary" onClick={() => {
              track("plan_view", { section: "faq" });
              openJoin("Membership FAQ");
            }}>
              Become a Member <Icon name="arrow" />
            </button>
          </div>
        </div>
      </section>

      <section className="section benefit-category-section">
        <div className="container">
          <SectionHeading
            eyebrow="VALUE ACROSS THE ECOSYSTEM"
            title="Useful access, made visible."
            copy="Each layer connects to centrally managed products, services, experiences and approved ecosystem partners."
          />
          <div className="ecosystem-value-grid">
            {benefitCategories.map((category) => <article key={category.title}>
                <div className="ecosystem-value-image"><img src={category.image} alt="" loading="lazy" /></div>
                <div className="ecosystem-value-copy">
                  <h3>{category.title}</h3><p>{category.copy}</p>
                </div>
              </article>)}
          </div>
        </div>
      </section>
    </>;
}

export { MembershipPage };
