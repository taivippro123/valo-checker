import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Send } from "lucide-react";

const ENABLE_SURVEY = true; // Toggle this to enable/disable survey

const SurveyModal = ({ API_URL }) => {
  const [showModal, setShowModal] = useState(false);
  const [surveyLanguage, setSurveyLanguage] = useState("vn");
  const [userName, setUserName] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const translations = {
    vn: {
      title: "Khảo sát",
      nameLabel: "Tên của bạn",
      namePlaceholder: "Nhập tên của bạn...",
      content:
        "Nếu có tính năng tự thông báo skin hằng ngày, bạn muốn nhận thông báo qua đâu?",
      options: {
        ntfy: "ntfy (ứng dụng thông báo nhẹ, mã nguồn mở)",
        discord: "Discord",
        custom: "Khác (nhập bên dưới)",
      },
      placeholder: "Nhập phương thức thông báo khác...",
      submit: "Gửi",
      sending: "Đang gửi...",
      success: "Cảm ơn bạn đã tham gia khảo sát!",
      error: "Không gửi được khảo sát.",
      close: "Đóng",
    },
    en: {
      title: "Survey",
      nameLabel: "Your Name",
      namePlaceholder: "Enter your name...",
      content:
        "If there was a daily skin notification feature, where would you like to receive notifications?",
      options: {
        ntfy: "ntfy (lightweight notification app, open source)",
        discord: "Discord",
        custom: "Other (enter below)",
      },
      placeholder: "Enter other notification method...",
      submit: "Submit",
      sending: "Sending...",
      success: "Thank you for participating in the survey!",
      error: "Failed to submit survey.",
      close: "Close",
    },
  };

  const t = translations[surveyLanguage];

  // Generate or get device ID
  const getDeviceId = () => {
    let deviceId = localStorage.getItem("survey_device_id");
    if (!deviceId) {
      deviceId =
        "device_" +
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      localStorage.setItem("survey_device_id", deviceId);
    }
    return deviceId;
  };

  // Check if survey has been submitted
  const hasSubmittedSurvey = () => {
    return localStorage.getItem("survey_submitted") === "true";
  };

  useEffect(() => {
    if (!ENABLE_SURVEY) return;

    // Show modal if not submitted yet
    if (!hasSubmittedSurvey()) {
      // Small delay to ensure page is loaded
      setTimeout(() => {
        setShowModal(true);
      }, 1000);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    let notificationMethod = selectedOption;
    if (selectedOption === "custom") {
      notificationMethod = customInput.trim();
    }

    if (!notificationMethod) {
      setError(
        surveyLanguage === "vn"
          ? "Vui lòng chọn hoặc nhập phương thức thông báo."
          : "Please select or enter a notification method.",
      );
      setSubmitting(false);
      return;
    }

    if (!userName || !userName.trim()) {
      setError(
        surveyLanguage === "vn"
          ? "Vui lòng nhập tên của bạn."
          : "Please enter your name.",
      );
      setSubmitting(false);
      return;
    }

    try {
      const deviceId = getDeviceId();
      const res = await axios.post(`${API_URL}/api/survey`, {
        deviceId,
        userName: userName.trim(),
        notificationMethod,
        language: surveyLanguage,
      });

      setMessage(t.success);
      localStorage.setItem("survey_submitted", "true");

      setTimeout(() => {
        setShowModal(false);
        setMessage("");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || t.error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!ENABLE_SURVEY || !showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="glass-panel rounded-xl border border-white/5 p-6 w-full max-w-md">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-valorant-gold">{t.title}</h3>
        </div>

        {/* Language Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSurveyLanguage("vn")}
            className={`px-3 py-1 rounded text-sm ${surveyLanguage === "vn" ? "bg-valorant-red text-white" : "text-valorant-gray hover:text-white"}`}
          >
            VN
          </button>
          <button
            onClick={() => setSurveyLanguage("en")}
            className={`px-3 py-1 rounded text-sm ${surveyLanguage === "en" ? "bg-valorant-red text-white" : "text-valorant-gray hover:text-white"}`}
          >
            EN
          </button>
        </div>

        <p className="text-sm text-valorant-gray mb-4">{t.content}</p>
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gold mb-2">
            {t.nameLabel} *
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder={t.namePlaceholder}
            className="w-full bg-valorant-dark border border-white/10 rounded-lg px-3 py-2 text-white placeholder-valorant-gray/50 focus:outline-none focus:border-valorant-red"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 cursor-pointer hover:border-valorant-red/40 transition-colors">
              <input
                type="radio"
                name="notificationMethod"
                value="ntfy"
                checked={selectedOption === "ntfy"}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="w-4 h-4 accent-valorant-red flex-shrink-0"
              />
              <span className="text-sm text-white">
                <a
                  href="https://ntfy.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-valorant-red font-medium underline hover:opacity-80 transition-opacity"
                >
                  ntfy
                </a>{" "}
                (ứng dụng thông báo nhẹ, mã nguồn mở)
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 cursor-pointer hover:border-valorant-red/40 transition-colors">
              <input
                type="radio"
                name="notificationMethod"
                value="discord"
                checked={selectedOption === "discord"}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="w-4 h-4 accent-valorant-red"
              />
              <span className="text-sm text-white">{t.options.discord}</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-white/10 cursor-pointer hover:border-valorant-red/40 transition-colors">
              <input
                type="radio"
                name="notificationMethod"
                value="custom"
                checked={selectedOption === "custom"}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="w-4 h-4 accent-valorant-red"
              />
              <span className="text-sm text-white">{t.options.custom}</span>
            </label>
          </div>

          {selectedOption === "custom" && (
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder={t.placeholder}
              className="w-full bg-valorant-dark border border-white/10 rounded-lg px-3 py-2 text-white placeholder-valorant-gray/50 focus:outline-none focus:border-valorant-red"
            />
          )}

          {message && <div className="text-sm text-emerald-400">{message}</div>}
          {error && <div className="text-sm text-valorant-red">{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-valorant-red hover:bg-valorant-red-hover text-white font-bold py-3 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Send className="w-4 h-4 animate-pulse" />
                {t.sending}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {t.submit}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SurveyModal;
