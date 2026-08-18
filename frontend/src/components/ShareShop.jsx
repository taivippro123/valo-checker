import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  Share2,
  Download,
  Copy,
  Link as LinkIcon,
  Check,
  X,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

/**
 * Nút chia sẻ ảnh shop.
 *
 * Ảnh được render ở backend (services/shopImageService.js) để web, Discord và
 * link chia sẻ dùng chung một layout. Component này chỉ lo tải về, copy,
 * share native và tạo link.
 */

// Clipboard của Chrome chỉ nhận image/png khi ghi ảnh, trong khi server trả JPEG
// (nhẹ hơn nhiều). Chuyển sang PNG ngay trên trình duyệt, không tốn thêm render.
const toPngBlob = (blob) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (png) => (png ? resolve(png) : reject(new Error("toBlob failed"))),
        "image/png",
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode failed"));
    };
    image.src = url;
  });

const RIOT_ID_PREF_KEY = "valocheck:share:showRiotId";

// Mặc định hiện Riot ID; user tắt đi thì lựa chọn đó được nhớ lại.
const readRiotIdPref = () => {
  try {
    return localStorage.getItem(RIOT_ID_PREF_KEY) !== "0";
  } catch {
    return true;
  }
};

const ShareShop = ({
  API_URL,
  storefront,
  variant = "daily",
  shard = "",
  riotId = "",
  language = "vn",
  t = {},
  label,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [showRiotId, setShowRiotId] = useState(readRiotIdPref);
  const [shareLink, setShareLink] = useState("");
  const blobRef = useRef(null);
  const previewUrlRef = useRef("");
  const wishlistRef = useRef(null);

  const vn = language !== "en";

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
  }, []);

  useEffect(() => releasePreview, [releasePreview]);

  // Wishlist chỉ có với user đã đăng nhập; lấy một lần, lỗi thì bỏ qua im lặng.
  const loadWishlistUuids = useCallback(async () => {
    if (wishlistRef.current) return wishlistRef.current;

    const token = localStorage.getItem("token");
    if (!token) {
      wishlistRef.current = [];
      return wishlistRef.current;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const accountsRes = await axios.get(`${API_URL}/api/user/accounts`, { headers });
      const accounts = accountsRes.data?.accounts || [];
      const lists = await Promise.all(
        accounts.slice(0, 3).map((account) =>
          axios
            .get(`${API_URL}/api/user/wishlist/${account.id || account._id}`, { headers })
            .then((res) => res.data?.wishlist || res.data?.items || [])
            .catch(() => []),
        ),
      );
      wishlistRef.current = [
        ...new Set(lists.flat().map((item) => item.skinUuid).filter(Boolean)),
      ];
    } catch {
      wishlistRef.current = [];
    }
    return wishlistRef.current;
  }, [API_URL]);

  const buildPayload = useCallback(
    (wishlistUuids) => ({
      storefront,
      variant,
      lang: vn ? "vn" : "en",
      shard,
      riotId,
      showRiotId,
      wishlistUuids: wishlistUuids || [],
    }),
    [storefront, variant, vn, shard, riotId, showRiotId],
  );

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const wishlistUuids = await loadWishlistUuids();
      const res = await axios.post(
        `${API_URL}/api/share/image`,
        buildPayload(wishlistUuids),
        { responseType: "blob" },
      );
      releasePreview();
      blobRef.current = res.data;
      const url = URL.createObjectURL(res.data);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch (error) {
      const message =
        error.response?.status === 429
          ? vn
            ? "Bạn tạo ảnh quá nhanh, thử lại sau ít phút."
            : "Too many requests, try again shortly."
          : vn
            ? "Không tạo được ảnh shop."
            : "Could not generate the shop image.";
      toast.error(message);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, [API_URL, buildPayload, loadWishlistUuids, releasePreview, vn]);

  // Đổi tuỳ chọn hiện Riot ID thì render lại ảnh.
  useEffect(() => {
    if (open) loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, showRiotId]);

  const fileName = `valocheck-${variant}-${new Date().toISOString().slice(0, 10)}.jpg`;

  const handleDownload = () => {
    if (!blobRef.current) return;
    const url = URL.createObjectURL(blobRef.current);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success(vn ? "Đã tải ảnh" : "Image downloaded");
  };

  const handleCopy = async () => {
    if (!blobRef.current) return;
    setBusy("copy");
    try {
      const png = await toPngBlob(blobRef.current);
      await navigator.clipboard.write([new window.ClipboardItem({ "image/png": png })]);
      toast.success(vn ? "Đã copy ảnh" : "Image copied");
    } catch {
      toast.error(
        vn
          ? "Trình duyệt không cho copy ảnh, hãy dùng nút Tải ảnh."
          : "Clipboard blocked, use Download instead.",
      );
    } finally {
      setBusy("");
    }
  };

  const handleNativeShare = async () => {
    if (!blobRef.current) return;
    const file = new File([blobRef.current], fileName, { type: "image/jpeg" });
    if (!navigator.canShare?.({ files: [file] })) {
      handleDownload();
      return;
    }
    try {
      await navigator.share({ files: [file], title: "VALOCHECK" });
    } catch {
      /* user huỷ - không cần báo lỗi */
    }
  };

  const handleCreateLink = async () => {
    setBusy("link");
    try {
      const wishlistUuids = await loadWishlistUuids();
      const res = await axios.post(
        `${API_URL}/api/share/snapshot`,
        buildPayload(wishlistUuids),
      );
      const url = res.data?.pageUrl;
      setShareLink(url);
      try {
        await navigator.clipboard.writeText(url);
        toast.success(vn ? "Đã copy link chia sẻ" : "Share link copied");
      } catch {
        toast.success(vn ? "Đã tạo link chia sẻ" : "Share link created");
      }
    } catch (error) {
      toast.error(
        error.response?.status === 429
          ? vn
            ? "Bạn tạo link quá nhiều, thử lại sau."
            : "Too many links, try again later."
          : vn
            ? "Không tạo được link chia sẻ."
            : "Could not create the share link.",
      );
    } finally {
      setBusy("");
    }
  };

  const closeModal = () => {
    setOpen(false);
    setShareLink("");
    releasePreview();
    setPreviewUrl("");
    blobRef.current = null;
  };

  // Modal phu kin trang nen phai khoa scroll nen, kem Esc de dong.
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-valorant-gold transition-colors hover:border-valorant-red/40 hover:text-white"
      >
        <Share2 className="h-3.5 w-3.5" />
        {label || t.shareImage || (vn ? "Chia sẻ" : "Share")}
      </button>

      {/*
        Bat buoc dung portal ra document.body: khu vuc shop nam trong .glass-panel,
        ma backdrop-filter tao containing block moi cho position:fixed - de nguyen
        tai cho thi inset-0 bam vao panel do va modal bi lech sang phai.
      */}
      {open && typeof document !== "undefined"
        ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
        >
          <div
            className="glass-panel relative flex max-h-[calc(100dvh-1rem)] w-full max-w-[96vw] flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/50 sm:max-h-[calc(100dvh-2rem)] sm:max-w-md"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-valorant-red">
                {t.shareImageTitle || (vn ? "Chia sẻ ảnh shop" : "Share shop image")}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-white/5 bg-black/30 p-2">
                {loading ? (
                  <Loader2 className="h-7 w-7 animate-spin text-valorant-red" />
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Shop preview"
                    className="max-h-[46vh] w-auto max-w-full rounded-lg object-contain"
                  />
                ) : null}
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowRiotId((value) => {
                    const next = !value;
                    try {
                      localStorage.setItem(RIOT_ID_PREF_KEY, next ? "1" : "0");
                    } catch {
                      /* chế độ riêng tư chặn localStorage - bỏ qua */
                    }
                    return next;
                  })
                }
                className="mt-3 flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-left transition-colors hover:border-valorant-red/30"
              >
                <span className="flex items-center gap-2 text-xs text-white">
                  {showRiotId ? (
                    <Eye className="h-4 w-4 text-valorant-gold" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-valorant-gray" />
                  )}
                  {t.shareShowRiotId || (vn ? "Hiện Riot ID trên ảnh" : "Show Riot ID on image")}
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      showRiotId
                        ? "bg-valorant-red/20 text-valorant-red"
                        : "bg-white/10 text-valorant-gray"
                    }`}
                  >
                    {showRiotId
                      ? vn ? "Đang hiện" : "Shown"
                      : vn ? "Đang ẩn" : "Hidden"}
                  </span>
                </span>
                <span
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    showRiotId ? "bg-valorant-red" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                      showRiotId ? "left-[1.15rem]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>
              <p className="mt-1.5 px-1 text-[10px] leading-relaxed text-valorant-gray">
                {t.shareRiotIdHint ||
                  (vn
                    ? "Đang hiện trên ảnh để phân biệt các acc. Tắt đi nếu bạn không muốn lộ Riot ID."
                    : "Shown on the image so you can tell accounts apart. Turn it off to keep your Riot ID private.")}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!previewUrl}
                  onClick={handleDownload}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-valorant-red px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-valorant-red-hover disabled:opacity-40"
                >
                  <Download className="h-4 w-4" />
                  {t.shareDownload || (vn ? "Tải ảnh" : "Download")}
                </button>
                <button
                  type="button"
                  disabled={!previewUrl || busy === "copy"}
                  onClick={handleCopy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:border-valorant-red/40 disabled:opacity-40"
                >
                  {busy === "copy" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {t.shareCopy || (vn ? "Copy ảnh" : "Copy")}
                </button>
                <button
                  type="button"
                  disabled={!previewUrl}
                  onClick={handleNativeShare}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:border-valorant-red/40 disabled:opacity-40 sm:hidden"
                >
                  <Share2 className="h-4 w-4" />
                  {t.shareNative || (vn ? "Chia sẻ" : "Share")}
                </button>
                <button
                  type="button"
                  disabled={busy === "link"}
                  onClick={handleCreateLink}
                  className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:border-valorant-red/40 disabled:opacity-40 sm:col-span-2"
                >
                  {busy === "link" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : shareLink ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <LinkIcon className="h-4 w-4" />
                  )}
                  {t.shareCreateLink || (vn ? "Tạo link chia sẻ" : "Create share link")}
                </button>
              </div>

              {shareLink ? (
                <div className="mt-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-valorant-gray">
                    {t.shareLinkLabel || (vn ? "Link chia sẻ" : "Share link")}
                  </p>
                  <a
                    href={shareLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-all text-xs font-medium text-valorant-gold hover:text-white"
                  >
                    {shareLink}
                  </a>
                  <p className="mt-1.5 text-[10px] text-valorant-gray">
                    {t.shareLinkHint ||
                      (vn
                        ? "Dán link vào Discord/Facebook sẽ tự hiện ảnh shop. Link sống 30 ngày."
                        : "Pasting this into Discord/Facebook shows the shop image. Valid for 30 days.")}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>,
          document.body,
        )
        : null}
    </>
  );
};

export default ShareShop;
