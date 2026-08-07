interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  // mieletepices.fr is now a verified sending domain in Resend, so use it
  // directly instead of the onboarding@resend.dev sandbox sender, which can
  // only deliver to the Resend account's own email — not real customers.
  const from = 'Miel et Épices <commandes@mieletepices.fr>';
  if (!apiKey || !to) return;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error('Resend email error:', await res.text());
    }
  } catch (err) {
    console.error('Resend email exception:', err);
  }
}
