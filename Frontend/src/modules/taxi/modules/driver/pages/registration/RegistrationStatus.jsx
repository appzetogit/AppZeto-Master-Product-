import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { useSettings } from "../../../../shared/context/SettingsContext";
import {
  clearDriverRegistrationSession,
  getDriverApprovalStatus,
  clearDriverAuthState,
} from "../../services/registrationService";

const APPROVAL_POLL_MS = 2500;

const unwrapDriver = (response) =>
  response?.data?.data || response?.data || response;

const isDriverApproved = (driver) => {
  if (!driver) {
    return false;
  }

  const approval = String(driver.approve ?? "").toLowerCase();
  const status = String(driver.status || "").toLowerCase();

  return (
    driver.approve === true ||
    driver.approve === 1 ||
    ["true", "1", "yes", "approved"].includes(approval) ||
    ["approved", "active", "verified"].includes(status)
  );
};

const redirectToDriverLogin = (navigate) => {
  clearDriverAuthState();
  navigate("/taxi/driver/login", { replace: true });
};

const RegistrationStatus = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const [checking, setChecking] = useState(true);
  const [statusMessage, setStatusMessage] = useState(
    "Waiting for admin approval",
  );
  const timeoutRef = useRef(null);
  const requestInFlightRef = useRef(false);
  const mountedRef = useRef(false);

  const appName = settings.general?.app_name || "App";
  const appLogo = settings.general?.logo || settings.customization?.logo;

  const handleDashboard = () => {
    if (checking) {
      return;
    }

    const normalizedRole =
      String(
        localStorage.getItem("role") || location.state?.role || "driver",
      ).toLowerCase() === "owner"
        ? "owner"
        : "driver";
    navigate(
      normalizedRole === "owner" ? "/taxi/driver/profile" : "/taxi/driver/home",
    );
  };

  useEffect(() => {
    if (location.state?.role) {
      const normalizedRole =
        String(location.state.role).toLowerCase() === "owner"
          ? "owner"
          : "driver";
      localStorage.setItem("role", normalizedRole);
    }

    const onboardingToken =
      location.state?.completedRegistration?.token ||
      location.state?.token ||
      "";

    if (onboardingToken) {
      localStorage.setItem("token", onboardingToken);
      localStorage.setItem("driverToken", onboardingToken);
      const roleFromState = String(location.state?.role || "").toLowerCase();
      localStorage.setItem(
        "role",
        roleFromState === "owner" ? "owner" : "driver",
      );
    }

    mountedRef.current = true;

    const checkApproval = async () => {
      if (!mountedRef.current || requestInFlightRef.current) {
        return;
      }

      requestInFlightRef.current = true;
      const token =
        localStorage.getItem("driverToken") || localStorage.getItem("token");

      if (!token) {
        if (mountedRef.current) {
          setChecking(false);
          setStatusMessage(
            "Registration session not found. Please start again.",
          );
        }
        redirectToDriverLogin(navigate);
        requestInFlightRef.current = false;
        return;
      }

      try {
        const response = await getDriverApprovalStatus();
        const driver = unwrapDriver(response);
        const isApproved = isDriverApproved(driver);

        if (!mountedRef.current) {
          return;
        }

        if (isApproved) {
          clearDriverRegistrationSession();
          const normalizedRole =
            String(
              localStorage.getItem("role") || location.state?.role || "driver",
            ).toLowerCase() === "owner"
              ? "owner"
              : "driver";
          navigate(
            normalizedRole === "owner"
              ? "/taxi/driver/profile"
              : "/taxi/driver/home",
            {
              replace: true,
            },
          );
          requestInFlightRef.current = false;
          return;
        }

        setChecking(false);
        setStatusMessage("Your request has been sent to the admin team.");
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        if (error?.status === 401) {
          redirectToDriverLogin(navigate);
          requestInFlightRef.current = false;
          return;
        }

        if (error?.status === 404) {
          setStatusMessage("Driver account deleted. Redirecting to login...");
          redirectToDriverLogin(navigate);
          requestInFlightRef.current = false;
          return;
        }

        setChecking(false);
        setStatusMessage(
          error?.message || "Your request is still under review.",
        );
      } finally {
        requestInFlightRef.current = false;
      }
    };

    checkApproval();
    timeoutRef.current = setInterval(checkApproval, APPROVAL_POLL_MS);

    return () => {
      mountedRef.current = false;
      requestInFlightRef.current = false;
      clearInterval(timeoutRef.current);
    };
  }, [location.state, navigate]);

  return (
    <div className="min-h-screen bg-taxi-bg font-sans p-5 pt-8 select-none overflow-x-hidden flex flex-col items-center text-center">
      <div className="mb-8 flex items-center justify-center">
        {appLogo ? (
          <img
            src={appLogo}
            alt={appName}
            className="h-8 object-contain drop-shadow-sm"
          />
        ) : (
          <span className="text-xl font-black text-slate-900">{appName}</span>
        )}
      </div>

      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-amber-500 shadow-2xl shadow-amber-500/10 mb-6">
        <Clock size={32} strokeWidth={2.5} className="animate-pulse" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
          Verification Pending
        </h1>
        <p className="text-[11px] font-bold text-slate-400 opacity-80 uppercase tracking-widest leading-relaxed">
          Account under review by our team
        </p>
        <div className="pt-2">
          <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
            {checking ? "Checking approval status" : "Pending admin action"}
          </span>
        </div>
      </div>

      <div className="mt-8 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
            <ShieldCheck size={20} />
          </div>
          <div className="flex-1 space-y-0.5">
            <h4 className="text-[13px] font-black text-slate-900 leading-none">
              Security Check Passed
            </h4>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Initial KYC Verified
            </p>
          </div>
          <CheckCircle2 size={16} className="text-emerald-500" />
        </div>

        <div className="flex items-center gap-3 text-left opacity-60 grayscale scale-95 origin-left">
          <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900">
            <Mail size={18} />
          </div>
          <div className="flex-1 space-y-0.5">
            <h4 className="text-[13px] font-black text-slate-900 leading-none">
              Manual Audit
            </h4>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {statusMessage}
            </p>
          </div>
          <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
      </div>

      <div className="mt-8 p-5 bg-amber-50/50 rounded-2xl border border-amber-100/50 max-w-sm">
        <p className="text-[10px] font-bold text-slate-600 leading-relaxed italic">
          We have sent your request to admin. You will be able to open the
          driver panel only after approval.
        </p>
      </div>

      <div className="flex-1" />

      <div className="w-full max-w-sm space-y-4 pb-8">
        <button
          onClick={handleDashboard}
          disabled={checking}
          className="w-full h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 text-[13px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 active:scale-95 transition-transform">
          {checking ? "Waiting for Approval" : "Go to Dashboard"}{" "}
          <ChevronRight size={16} strokeWidth={3} />
        </button>
        <div className="flex items-center justify-center gap-2 text-slate-300">
          <Phone size={12} />
          <span className="text-[9px] font-black uppercase tracking-widest">
            +91 0000 0000 00 | Help Center
          </span>
        </div>
      </div>
    </div>
  );
};

export default RegistrationStatus;
