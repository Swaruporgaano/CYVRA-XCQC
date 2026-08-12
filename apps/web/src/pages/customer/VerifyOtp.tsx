import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { customerApiPost, useCustomerAuth } from "../../customer-auth";
import { AuthLayout } from "./AuthLayout";

type VerifyState = {
  mobile?: string;
  otpId?: string;
  devOtp?: string;
};

export function CustomerVerifyPage() {
  const { apiBase, setSession } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as VerifyState;

  const [mobile, setMobile] = useState(state.mobile ?? "");
  const [otpId, setOtpId] = useState(state.otpId ?? "");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState(state.devOtp ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function resend() {
    if (!mobile) return;
    setBusy(true);
    setError(null);
    try {
      const data = await customerApiPost<{
        otp: { otpId: string; devOtp?: string };
      }>("/api/v1/auth/request-otp", apiBase, { mobile });
      setOtpId(data.otp.otpId);
      if (data.otp.devOtp) setDevOtp(data.otp.devOtp);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await customerApiPost<{
        token: string;
        customer: Parameters<typeof setSession>[1];
      }>("/api/v1/auth/verify-otp", apiBase, {
        mobile,
        otp,
        otpId: otpId || undefined,
      });
      setSession(data.token, data.customer);
      navigate("/account");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Verify OTP" subtitle="Enter the 6-digit code sent to your mobile.">
      {devOtp && (
        <div className="dev-otp-banner">
          <strong>Dev mode OTP:</strong> <code className="mono">{devOtp}</code>
          <span> (visible when API has OTP_DEV_MODE=true)</span>
        </div>
      )}
      <form onSubmit={onSubmit} className="auth-form">
        <label>
          Mobile number
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
            autoComplete="tel"
          />
        </label>
        <label>
          6-digit OTP
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            required
            autoComplete="one-time-code"
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <div className="row">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Verifying…" : "Verify & sign in"}
          </button>
          <button className="btn secondary" type="button" onClick={resend} disabled={busy || !mobile}>
            Resend OTP
          </button>
        </div>
      </form>
      <p className="auth-foot">
        <Link to="/account/login">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
