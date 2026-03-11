import { Resend } from "resend";
import type { SurveyPhase } from "@beacon/shared";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendSurveyInviteParams {
  to: string;
  firstName: string | null;
  phase: SurveyPhase;
  surveyUrl: string;
}

export const emailService = {
  async sendSurveyInvite({ to, firstName, phase, surveyUrl }: SendSurveyInviteParams) {
    const greeting = firstName ? `Hi ${firstName}` : "Hi there";
    const isPost = phase === "post";

    const subject = isPost
      ? "Your Post-Class Financial Assessment is Ready"
      : "Welcome — Please Complete Your Pre-Class Assessment";

    const body = isPost
      ? `
        <p>${greeting},</p>
        <p>Now that you've completed The Beacon House Financial Literacy Class, we'd love to hear how your understanding has grown.</p>
        <p>Please take a few minutes to complete your <strong>post-class assessment</strong>.</p>
        <p style="margin: 32px 0;">
          <a href="${surveyUrl}" style="background:#16a34a;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Complete Post-Class Assessment →
          </a>
        </p>
        <p style="color:#64748b;font-size:14px;">This link is unique to you and will expire in 7 days.</p>
      `
      : `
        <p>${greeting},</p>
        <p>Welcome to The Beacon House Financial Literacy Class. Before we get started, please complete this brief pre-class assessment.</p>
        <p style="margin: 32px 0;">
          <a href="${surveyUrl}" style="background:#16a34a;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Start Pre-Class Assessment →
          </a>
        </p>
        <p style="color:#64748b;font-size:14px;">This link is unique to you and will expire in 7 days.</p>
      `;

    await resend.emails.send({
      from: "The Beacon House <onboarding@resend.dev>",
      to,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;">
          <h2 style="color:#0f172a;margin-bottom:8px;">The Beacon House</h2>
          <p style="color:#64748b;font-size:14px;margin-bottom:32px;">Financial Literacy Program</p>
          ${body}
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;" />
          <p style="color:#94a3b8;font-size:12px;">
            You received this email because you are enrolled in the Beacon House Financial Literacy Program.
            Questions? <a href="mailto:info@beaconhouse.org">info@beaconhouse.org</a>
          </p>
        </div>
      `,
    });
  },
};