import axios from "axios";
import FormData from "form-data";
import { renderStorefrontImage, SITE_URL } from "./shopImageService.js";

const sendDiscordNotification = async (webhookUrl, message, title = 'Valorant Shop Checker') => {
  if (!webhookUrl) {
    console.log('[DiscordService] No webhook URL provided, skipping Discord notification');
    return false;
  }

  try {
    const embed = {
      title: title,
      description: message,
      color: 0xff4655,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Valorant Shop Checker'
      }
    };

    await axios.post(webhookUrl, { embeds: [embed] });
    console.log('[DiscordService] Notification sent successfully');
    return true;
  } catch (error) {
    console.error('[DiscordService] Failed to send Discord webhook:', error.message);
    return false;
  }
};

/**
 * Gửi shop hằng ngày kèm ảnh chia sẻ.
 *
 * Ảnh dùng chung đúng renderer với nút share trên web (shopImageService),
 * nên skin trùng nhau giữa các account chỉ tải/resize một lần nhờ cache.
 *
 * @param {string} webhookUrl
 * @param {string} accountName
 * @param {Array}  offers      - storefront.skinsPanel.offers dạng thô
 * @param {string} shard
 * @param {object} options     - { wishlistUuids, wishlistNames, lang, shareUrl, riotId }
 */
const sendDailyShopDiscord = async (webhookUrl, accountName, offers, shard = "ap", options = {}) => {
  if (!webhookUrl) {
    console.log("[DiscordService] No webhook URL provided, skipping Discord notification");
    return false;
  }

  if (!offers || offers.length === 0) {
    console.log("[DiscordService] No skins to send");
    return false;
  }

  const { wishlistUuids = [], wishlistNames = [], lang = 'vn', shareUrl = '', riotId = '' } = options;

  try {
    const skinListText = offers
      .map((offer, index) => {
        const meta = offer.metadata || offer;
        const name = meta.displayName || offer.displayName || 'Unknown Skin';
        const price = offer.priceVP ?? offer.price;
        const tier = meta.contentTier?.displayName || offer.tier;
        return `**${index + 1}. ${name}**${tier ? ` (${tier})` : ''} — ${price ? `${price} VP` : 'N/A'}`;
      })
      .join("\n");

    // Webhook thường của Discord không gửi được components nên không có nút bấm:
    // link chia sẻ đi vào tiêu đề embed (bấm được) và một dòng markdown cuối mô tả.
    const shareLine = shareUrl
      ? (lang === 'en'
          ? `\n\n[📤 Share this store](${shareUrl})`
          : `\n\n[📤 Chia sẻ shop này](${shareUrl})`)
      : '';

    const embed = {
      title: `🎮 Daily Shop - ${accountName}`,
      description: `Region: ${String(shard).toUpperCase()}\n${offers.length} skins available today\n\n${skinListText}${shareLine}`,
      color: 0xff4655,
      timestamp: new Date().toISOString(),
      footer: { text: SITE_URL.replace(/^https?:\/\//, '') }
    };

    if (shareUrl) embed.url = shareUrl;

    let image = null;
    try {
      image = await renderStorefrontImage(
        { skinsPanel: { offers } },
        {
          variant: 'daily',
          size: 'feed',
          lang,
          shard,
          riotId,
          showRiotId: Boolean(riotId),
          wishlistUuids,
          wishlistNames
        }
      );
    } catch (imageError) {
      // Ảnh hỏng thì vẫn phải gửi được danh sách chữ.
      console.warn('[DiscordService] Shop image render failed:', imageError.message);
    }

    if (image) {
      embed.image = { url: "attachment://shop.jpg" };
      const form = new FormData();
      form.append("payload_json", JSON.stringify({ embeds: [embed] }));
      form.append("files[0]", image.buffer, {
        filename: "shop.jpg",
        contentType: image.contentType
      });
      await axios.post(webhookUrl, form, { headers: form.getHeaders() });
    } else {
      await axios.post(webhookUrl, { embeds: [embed] });
    }

    console.log("[DiscordService] Daily shop notification sent successfully");
    return true;
  } catch (error) {
    console.error("[DiscordService] Failed to send Discord webhook:", error.message);
    return false;
  }
};

export { sendDailyShopDiscord, sendDiscordNotification };
