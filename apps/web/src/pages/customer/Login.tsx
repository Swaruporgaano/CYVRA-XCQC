import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { customerApiPost, useCustomerAuth } from "../../customer-auth";
import { AuthLayout } from "./AuthLayout";

export function CustomerLoginPage() {
  const { apiBase } = useCustomerAuth();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await customerApiPost<{
        step: string;
        otp: { otpId: string; devOtp?: string };
      }>("/api/v1/auth/login", apiBase, { mobile });
      navigate("/account/verify", {
        state: {
          mobile,
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
    <AuthLayout title="Sign in" subtitle="Enter your mobile number to receive a one-time code.">
      <form onSubmit={onSubmit} className="auth-form">
        <label>
          Mobile number
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="9876543210"
            required
            autoComplete="tel"
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Sending OTP…" : "Send OTP"}
        </button>
      </form>
      <p className="auth-foot">
        New here? <Link to="/account/register">Create account</Link>
      </p>
    </AuthLayout>
  );
}
