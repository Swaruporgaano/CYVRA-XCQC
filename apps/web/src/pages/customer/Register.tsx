import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { customerApiPost, useCustomerAuth } from "../../customer-auth";
import { AuthLayout } from "./AuthLayout";

export function CustomerRegisterPage() {
  const { apiBase } = useCustomerAuth();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await customerApiPost<{
        customer: { mobile: string };
        otp: { otpId: string; devOtp?: string };
      }>("/api/v1/auth/register", apiBase, {
        mobile,
        email: email || undefined,
        name: name || undefined,
      });
      navigate("/account/verify", {
        state: {
          mobile: data.customer.mobile,
          otpId: data.otp.otpId,
          devOtp: data.otp.devOtp,
        },
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Create account" subtitle="Register with your mobile number. We'll send a one-time code.">
      <form onSubmit={onSubmit} className="auth-form">
        <label>
          Mobile number *
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="9876543210"
            required
            autoComplete="tel"
          />
        </label>
        <label>
          Email (optional)
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
        <label>
          Name (optional)
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Registering…" : "Register & send OTP"}
        </button>
      </form>
      <p className="auth-foot">
        Already registered? <Link to="/account/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
