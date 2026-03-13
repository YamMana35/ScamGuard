export default function ScamGuardPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>
      <h1>ScamGuard – Phishing Detection Tool</h1>

      <p>
        ScamGuard is a cybersecurity tool that helps users detect phishing
        websites, scam emails, suspicious SMS messages, and fraudulent links.
      </p>

      <p>
        The ScamGuard scanner analyzes suspicious content and calculates a risk
        score based on phishing indicators, scam keywords, domain signals and
        security patterns.
      </p>

      <h2>What ScamGuard Can Scan</h2>

      <ul>
        <li>Suspicious website URLs</li>
        <li>Phishing emails</li>
        <li>SMS scam messages</li>
        <li>Screenshots containing suspicious text</li>
      </ul>

      <h2>Why ScamGuard Exists</h2>

      <p>
        Online phishing attacks are becoming increasingly common. ScamGuard was
        created to give users a quick and simple way to check suspicious
        content before interacting with it.
      </p>

      <p>
        You can try the ScamGuard scanner here:
      </p>

      <p>
        <a href="https://scam-guard-umber.vercel.app">
          https://scam-guard-umber.vercel.app
        </a>
      </p>
    </main>
  )
}