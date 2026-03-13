export default function AboutPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
      <h1>About ScamGuard</h1>

      <p>
        ScamGuard is a free cybersecurity tool designed to help users detect
        phishing websites, scam emails, suspicious SMS messages, and malicious
        links.
      </p>

      <h2>What ScamGuard Does</h2>

      <p>
        The platform analyzes suspicious content using automated security
        checks. ScamGuard can scan:
      </p>

      <ul>
        <li>Website URLs</li>
        <li>Email text</li>
        <li>SMS messages</li>
        <li>Screenshots that may contain scam content</li>
      </ul>

      <p>
        The system evaluates signals such as phishing keywords, suspicious
        domains, shortened links, scam patterns and other indicators to
        estimate the probability that the content is malicious.
      </p>

      <h2>Why ScamGuard Exists</h2>

      <p>
        Online scams are becoming increasingly common. Many users receive fake
        emails, SMS delivery scams, or messages pretending to be from banks,
        government agencies or large companies.
      </p>

      <p>
        ScamGuard helps people quickly check suspicious content and understand
        whether it might be a scam before interacting with it.
      </p>

      <h2>How to Use ScamGuard</h2>

      <p>
        Paste a suspicious link, message or email into the scanner and the
        system will analyze it and return a risk score with explanations of the
        detected security signals.
      </p>
    </main>
  )
}