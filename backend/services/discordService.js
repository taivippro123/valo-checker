import axios from "axios";
import sharp from "sharp";
import FormData from "form-data";

// Tải ảnh từ url về buffer
const fetchImageBuffer = async (url) => {
  const res = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(res.data);
};

// Ghép nhiều ảnh skin thành 1 ảnh collage dạng lưới 2 cột (2xN) + watermark link ở giữa
const buildCollage = async (
  imageUrls,
  watermarkText = "https://valocheck.vercel.app/",
) => {
  const cellWidth = 480;
  const cellHeight = 260;
  const cols = 2;
  const rows = Math.ceil(imageUrls.length / cols);
  const canvasWidth = cellWidth * cols;
  const canvasHeight = cellHeight * rows;

  // Tải + resize từng ảnh cho vừa khung ô (giữ nguyên tỉ lệ, nền trong suốt)
  const buffers = await Promise.all(
    imageUrls.map(async (url) => {
      const raw = await fetchImageBuffer(url);
      return sharp(raw)
        .resize(cellWidth, cellHeight, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
    }),
  );

  const composites = buffers.map((buf, i) => ({
    input: buf,
    left: (i % cols) * cellWidth,
    top: Math.floor(i / cols) * cellHeight,
  }));

  // Watermark chữ, đặt giữa canvas (khoảng trống giữa các hàng ảnh), mờ nhẹ để không che ảnh
  const watermarkSvg = `
    <svg width="${canvasWidth}" height="${canvasHeight}">
      <text
        x="50%"
        y="50%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Arial, sans-serif"
        font-size="33"
        font-weight="bold"
        fill="rgba(255,255,255,1)"
      >${watermarkText}</text>
    </svg>
  `;
  composites.push({ input: Buffer.from(watermarkSvg), left: 0, top: 0 });

  const canvas = sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(composites);

  return canvas.png().toBuffer();
};

const sendDailyShopDiscord = async (
  webhookUrl,
  accountName,
  skins,
  shard = "ap",
) => {
  if (!webhookUrl) {
    console.log(
      "[DiscordService] No webhook URL provided, skipping Discord notification",
    );
    return false;
  }

  if (!skins || skins.length === 0) {
    console.log("[DiscordService] No skins to send");
    return false;
  }

  try {
    const skinListText = skins
      .map((skin, index) => {
        const price = skin.price ? `${skin.price} VP` : "N/A";
        const tier = skin.tier ? ` (${skin.tier})` : "";
        return `**${index + 1}. ${skin.displayName}**${tier} — ${price}`;
      })
      .join("\n");

    const imageUrls = skins
      .map((skin) => skin.displayIcon || skin.displayIcon2 || "")
      .filter(Boolean);

    const embed = {
      title: `🎮 Daily Shop - ${accountName}`,
      description: `Region: ${shard.toUpperCase()}\n${skins.length} skins available today\n\nhttps://valocheck.vercel.app/\n\n${skinListText}`,
      color: 0xff4655,
      timestamp: new Date().toISOString(),
      footer: {
        text: "Valorant Shop Checker",
      },
    };

    if (imageUrls.length > 0) {
      // Ghép tất cả ảnh skin thành 1 collage duy nhất -> hiển thị full, không bị crop, không cần bấm
      const collageBuffer = await buildCollage(imageUrls);
      embed.image = { url: "attachment://collage.png" };

      const form = new FormData();
      form.append("payload_json", JSON.stringify({ embeds: [embed] }));
      form.append("files[0]", collageBuffer, {
        filename: "collage.png",
        contentType: "image/png",
      });

      await axios.post(webhookUrl, form, { headers: form.getHeaders() });
    } else {
      await axios.post(webhookUrl, { embeds: [embed] });
    }

    console.log("[DiscordService] Daily shop notification sent successfully");
    return true;
  } catch (error) {
    console.error(
      "[DiscordService] Failed to send Discord webhook:",
      error.message,
    );
    return false;
  }
};

export { sendDailyShopDiscord };
