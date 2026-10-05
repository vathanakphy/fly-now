import { buttonClassName, Card, LinkButton } from '../components/ui'
import { PageContainer } from '../components/layout/PageContainer'

export const LandingPage = () => (
  <>
    <PageContainer className="py-16 sm:py-24">
      <section className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-semibold text-primary">A clearer path to deployment</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Deploy without the complexity.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
          Connect your source, configure your application, and get ready to deploy.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <LinkButton to="/register" size="lg">
            Start Building
          </LinkButton>
          <a href="#how-it-works" className={buttonClassName({ size: 'lg', variant: 'secondary' })}>
            Learn More
          </a>
        </div>
      </section>
      <section id="how-it-works" aria-labelledby="workflow-title" className="mt-20 scroll-mt-20">
        <div className="text-center">
          <h2 id="workflow-title" className="text-2xl font-bold">
            How FlyNow Works
          </h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ['1', 'Add Source', 'Connect GitHub or upload a ZIP archive.'],
            ['2', 'Configure', 'Set the runtime and environment variables.'],
            ['3', 'Ready', 'Run checks and resolve readiness issues.'],
          ].map(([number, title, description]) => (
            <Card key={number} className="p-6 text-left">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
                {number}
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{description}</p>
            </Card>
          ))}
        </div>
      </section>
      <section id="features" aria-labelledby="features-title" className="mt-20 scroll-mt-20">
        <h2 id="features-title" className="text-center text-2xl font-bold">
          Everything needed to get ready
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            'GitHub',
            'ZIP Upload',
            'Configuration',
            'Environment Variables',
            'Readiness Check',
          ].map((feature) => (
            <div
              key={feature}
              className="rounded-card border bg-surface p-4 text-center text-sm font-semibold"
            >
              {feature}
            </div>
          ))}
        </div>
      </section>
    </PageContainer>
    <section className="border-y bg-primary-light">
      <PageContainer className="py-12 text-center">
        <h2 className="text-2xl font-bold">Ready to prepare your application?</h2>
        <p className="mt-2 text-muted">Create an account and start with your source.</p>
        <LinkButton to="/register" size="lg" className="mt-6">
          Get Started
        </LinkButton>
      </PageContainer>
    </section>
  </>
)
