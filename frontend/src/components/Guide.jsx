import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Lock,
  Globe,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  UserPlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import translations from "../i18n";

const Guide = () => {
  const [language, setLanguage] = useState("vn");
  const t = translations[language] || translations.vn;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(t.guide.copied);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-valorant-dark to-valorant-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-valorant-gold mb-2">
              {t.guide.title}
            </h1>
            <p className="text-valorant-gray">
              {t.guide.subtitle}
            </p>
          </div>
          <div className="relative">
            <Globe className="w-5 h-5 text-valorant-gray absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-valorant-dark border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-valorant-red"
            >
              <option value="en">English</option>
              <option value="vn">Tiếng Việt</option>
            </select>
          </div>
        </div>

        <div className="space-y-6">
          {/* Section 1: Get Riot Cookies */}
          <div className="glass-panel rounded-xl border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-valorant-red" />
              <h2 className="text-xl font-bold">{t.guide.section1Title}</h2>
            </div>
            <div className="space-y-4 text-valorant-gray">
              <div className="bg-valorant-dark/50 rounded-lg p-4 border border-white/10">
                <h3 className="font-semibold text-white mb-2">
                  {t.guide.watchVideo}{" "}
                  <a
                    href="https://youtu.be/13uThlwe5mU"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-valorant-red hover:underline"
                  >
                    {t.guide.here}
                  </a>
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>
                    {t.guide.step1}{" "}
                    <a
                      href="https://auth.riotgames.com/authorize?redirect_uri=https://playvalorant.com/opt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&scope=account%20openid&nonce=1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-valorant-red hover:underline"
                    >
                      {t.guide.here}
                    </a>{" "}
                    {t.guide.toLoginPage}
                  </li>
                  <li>
                    {t.guide.step2}{" "}
                    <a
                      href="https://login.riotgames.com/end-session-redirect?redirect_uri=https%3A%2F%2Fauth.riotgames.com%2Flogout"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-valorant-red hover:underline"
                    >
                      {t.guide.logout}
                    </a>
                  </li>
                  <li>
                    {t.guide.step3}
                  </li>
                  <li>
                    {t.guide.step4} <kbd>F12</kbd> {t.guide.toOpenDevTools}{" "}
                    <strong>Network </strong>
                    {t.guide.ifNotSee} <kbd>&gt;&gt;</kbd> {t.guide.toExpandMenu}.
                  </li>
                  <li>
                   {t.guide.step5} <strong>{t.guide.preserveLog}</strong>
                  </li>
                  <li>
                  {t.guide.step6}{" "}<strong>login-token?login_token=</strong>, {t.guide.status302} <strong>302</strong> {t.guide.typeDocument} <strong>document</strong>
                  </li>
                  <li>{t.guide.tickIt}{" "}<strong>Headers</strong>, {t.guide.responseHeaders} <strong>Response headers</strong>, {t.guide.setCookie} <strong>Set-Cookie</strong> {t.guide.andPaste} <strong>{t.guide.riotCookies}</strong> field</li>
                </ol>
              </div>

              <div className="bg-valorant-dark/50 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">
                    {t.guide.cookieFormatTitle}
                  </h3>
                  <button
                    onClick={() => copyToClipboard(t.guide.cookieFormatDesc + "\ncsid=your_csid_value; ssid=your_ssid_value; ccid=your_ccid_value; clid=your_clid_value;")}
                    className="p-1 hover:bg-white/10 rounded"
                    title={t.guide.copy}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm mb-2 text-valorant-gray">
                  {t.guide.cookieFormatDesc}
                </p>
                <div className="bg-black/30 p-3 rounded font-mono text-xs">
                  csid=your_csid_value; ssid=your_ssid_value; ccid=your_ccid_value; clid=your_clid_value;
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Discord Webhook */}
          <div className="glass-panel rounded-xl border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Terminal className="w-6 h-6 text-valorant-red" />
              <h2 className="text-xl font-bold">{t.guide.section2Title}</h2>
            </div>
            <div className="space-y-4 text-valorant-gray">
              <div className="bg-valorant-dark/50 rounded-lg p-4 border border-white/10">
                <h3 className="font-semibold text-white mb-2">
                  {t.guide.createWebhook}
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>{t.guide.webhookStep1}</li>
                  <li>{t.guide.webhookStep2}</li>
                  <li>
                    {t.guide.webhookStep3}{" "}
                    <span className="text-white">{t.guide.editChannel}</span>
                  </li>
                  <li>
                    {t.guide.webhookStep4} <span className="text-white">{t.guide.integrations}</span> →{" "}
                    <span className="text-white">{t.guide.webhooks}</span>
                  </li>
                  <li>
                    {t.guide.webhookStep5} <span className="text-white">{t.guide.newWebhook}</span> {t.guide.andSetName}
                  </li>
                  <li>
                    {t.guide.webhookStep6} <span className="text-white">{t.guide.copyWebhookUrl}</span>
                  </li>
                  <li>
                    {t.guide.webhookStep7}{" "}
                    <span className="text-white">{t.guide.discordWebhookUrl}</span> {t.guide.inAccountDetails}
                  </li>
                </ol>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm">
                <Check className="w-4 h-4 inline mr-2" />
                {t.guide.webhookNote}
              </div>
            </div>
          </div>

          {/* Section 3: Ntfy Topic */}
          <div className="glass-panel rounded-xl border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-6 h-6 text-valorant-red" />
              <h2 className="text-xl font-bold">{t.guide.section3Title}</h2>
            </div>
            <div className="space-y-4 text-valorant-gray">
              <div className="bg-valorant-dark/50 rounded-lg p-4 border border-white/10">
                <h3 className="font-semibold text-white mb-2">
                  {t.guide.useNtfy}
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>
                    {t.guide.ntfyStep1}{" "}
                    <a
                      href="https://ntfy.sh"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-valorant-red hover:underline"
                    >
                      ntfy.sh
                    </a>
                  </li>
                  <li>{t.guide.ntfyStep2}</li>
                  <li>
                    {t.guide.ntfyStep3}{" "}
                    <code className="bg-black/30 px-2 py-1 rounded">
                      https://ntfy.sh/your-topic-name
                    </code>
                  </li>
                  <li>{t.guide.ntfyStep4}</li>
                </ol>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm">
                <Check className="w-4 h-4 inline mr-2" />
                {t.guide.ntfyNote}
              </div>
            </div>
          </div>

          {/* Section 4: Wishlist */}
          <div className="glass-panel rounded-xl border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <UserPlus className="w-6 h-6 text-valorant-red" />
              <h2 className="text-xl font-bold">{t.guide.section4Title}</h2>
            </div>
            <div className="space-y-4 text-valorant-gray">
              <div className="bg-valorant-dark/50 rounded-lg p-4 border border-white/10">
                <h3 className="font-semibold text-white mb-2">
                  {t.guide.addSkinTitle}
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>{t.guide.addSkinStep1}</li>
                  <li>
                    {t.guide.addSkinStep2} <span className="text-white">{t.guide.wishlist}</span>
                  </li>
                  <li>{t.guide.addSkinStep3}</li>
                  <li>{t.guide.addSkinStep4}</li>
                  <li>
                    {t.guide.addSkinStep5} <span className="text-white">{t.guide.addToWishlist}</span>
                  </li>
                </ol>
              </div>
              <div className="bg-valorant-dark/50 rounded-lg p-4 border border-white/10">
                <h3 className="font-semibold text-white mb-2">
                  {t.guide.removeSkinTitle}
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>{t.guide.removeSkinStep1}</li>
                  <li>
                    {t.guide.removeSkinStep2}{" "}
                    <Trash2 className="w-4 h-4 inline text-valorant-red" /> {t.guide.nextToSkin}
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Section 5: Shop Check */}
          <div className="glass-panel rounded-xl border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <ExternalLink className="w-6 h-6 text-valorant-red" />
              <h2 className="text-xl font-bold">{t.guide.section5Title}</h2>
            </div>
            <div className="space-y-4 text-valorant-gray">
              <div className="bg-valorant-dark/50 rounded-lg p-4 border border-white/10">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>{t.guide.shopCheckStep1}</li>
                  <li>
                    {t.guide.shopCheckStep2} <span className="text-white">{t.guide.checkShop}</span>
                  </li>
                  <li>{t.guide.shopCheckStep3}</li>
                   <li>
                    {t.guide.shopCheckStep4} <span className="text-white">{t.guide.reauth}</span>
                  </li>
                  <li>
                    {t.guide.shopCheckStep5} <span className="text-white">{t.guide.riotCookies}</span> {t.guide.withoutWaiting}
                  </li>
                </ol>
              </div>
             
            </div>
          </div>

          {/* Back Button */}
          <div className="flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-valorant-red hover:bgvalorant-red-hover text-white font-bold px-6 py-3 rounded-lg transition-colors"
            >
              {t.guide.backToHome}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guide;
