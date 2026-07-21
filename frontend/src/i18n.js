const translations = {
  en: {
    addAccount: 'Add Riot Account',
    editAccount: 'Edit Riot Account',
    alias: 'Friendly Alias',
    riotRedirect: 'Riot Web Redirect (Safe)',
    manualPassword: 'Password (Manual)',
    openRiotPortal: 'Open Riot Login Page',
    pasteRedirectUrl: 'https://playvalorant.com/...3600',
    pasteCookieString: 'Paste Riot cookie string',
    redirectHelp: 'After login the browser will redirect to playvalorant.com. Copy the full address bar and paste here.',
    cancel: 'Cancel',
    save: 'Save Account',
    refreshToken: 'Refresh Token',
    activeOffers: 'Active Daily Offers',
    resetCycle: 'Reset: 24h cycle',
    dashboardUser: 'Dashboard User',
    signOut: 'Sign Out',
    systemInfoSetup: 'System Information & Setup',
    editSettings: 'Edit Settings',
    noAccountsTitle: 'No Accounts Added',
    noAccountsBody: 'Please add a Riot games account to start checking daily weapon skins storefronts against your wishlist.',
    checkShop: 'Check Shop',
    checking: 'Checking...',
    tokenMode: 'Token Mode',
    riotIDLabel: 'Riot ID:',
    lastChecked: 'Last checked:',
    hideStorefront: 'Hide Shop storefront',
    matchBadge: 'Match',
    accountAliasRequired: 'Account alias is required.',
    redirectUrlRequired: 'Riot redirect URL is required.',
    cookieOrRedirectRequired: 'Please provide either a redirect URL or a Riot cookie string.',
    invalidCookieString: 'Invalid cookie string. Include ssid and valid key=value pairs.',
    invalidUrlFormat: 'Invalid URL format. Please make sure to copy the entire address from the playvalorant tab.',
    redirectUrlPrefixInvalid: 'Redirect URL must start with https://playvalorant.com/.',
    redirectUrlAccessTokenRequired: 'Please provide a Riot redirect URL containing an access_token.',
    invalidAccessToken: 'The provided access token is invalid.',
    storeCheckFailed: 'Store check failed. Please try again.',
    riotUsernameRequired: 'Riot Username is required.',
    riotPasswordRequired: 'Riot Password is required.',
    associatedRiotId: 'Associated Riot ID',
    openLoginPage: 'Open Riot Login Page',
    pasteRedirect: 'Paste redirect URL after login',
    redirectHelpText: 'After login the browser will redirect to playvalorant.com. Copy the full address bar and paste here.',
    cancelButton: 'Cancel',
    saveButton: 'Save Account',
    refreshTokenButton: 'Refresh Token'
    ,
    // Dashboard specific
    quickStepsTitle: 'Quick 3 steps',
    quickStep1: 'Sign in to Riot at the',
    quickStep2: 'After signing in, copy the full address bar URL from the browser.',
    quickStep3: 'Paste the URL into the box below and click the button to check.',
    guideTitle: 'Guide',
    loginButton: 'Check Shop',
    waitingPasteUrl: 'Paste a Riot redirect URL to view the shop.',
    noSignupNeeded: 'No account or long-term cookie storage required. Use a fresh URL each time to view the current shop.',
    logSavedInfo: 'The system logs the Riot ID for admin after a successful storefront fetch.'
    ,
    // FAQ and footer
    brand: 'VALOCHECK',
    faqTitle: 'FAQ',
    faqItems: [
      {
        question: "How can I trust VALOCHECK?",
        answer: "VALOCHECK is an open-source project. You can view the source code on GitHub to verify how it works. Check the footer for the link."
      },
      {
        question: 'Will check skins here get my account banned?',
        answer: 'This service only reads the storefront using a temporary token from the redirect URL. It does not modify your account.'
      },
      {
        question: 'Does this leak my account information?',
        answer: 'We only use the temporary token to fetch public storefront data and do not store passwords.'
      }
    ],
    footerText: 'VALOCHECK is an open-source project created for the Valorant community. We are not associated with Riot Games.',
    githubText: 'Source on GitHub'
  },
  vn: {
    addAccount: 'Thêm tài khoản Riot',
    editAccount: 'Chỉnh sửa tài khoản Riot',
    alias: 'Tên hiển thị',
    riotRedirect: 'Riot Web Redirect (An toàn)',
    manualPassword: 'Mật khẩu (Thủ công)',
    openRiotPortal: 'Mở trang đăng nhập Riot',
    pasteRedirectUrl: 'https://playvalorant.com/...3600',
    pasteCookieString: 'Dán chuỗi cookie Riot',
    redirectHelp: 'Sau khi đăng nhập, trình duyệt sẽ chuyển đến playvalorant.com. Hãy copy toàn bộ thanh địa chỉ và dán vào đây.',
    cancel: 'Hủy',
    save: 'Lưu tài khoản',
    refreshToken: 'Làm mới Token',
    activeOffers: 'Cửa hàng hôm nay',
    resetCycle: 'Thiết lập lại: chu kỳ 24 giờ',
    dashboardUser: 'Người dùng Dashboard',
    signOut: 'Đăng xuất',
    systemInfoSetup: 'Thông tin hệ thống & Cài đặt',
    editSettings: 'Chỉnh sửa',
    noAccountsTitle: 'Chưa có tài khoản nào',
    noAccountsBody: 'Vui lòng thêm tài khoản Riot để bắt đầu kiểm tra cửa hàng vũ khí hàng ngày theo wishlist của bạn.',
    checkShop: 'Kiểm tra shop',
    checking: 'Đang kiểm tra...',
    tokenMode: 'Chế độ Token',
    riotIDLabel: 'Riot ID:',
    lastChecked: 'Lần kiểm tra cuối:',
    hideStorefront: 'Ẩn cửa hàng',
    matchBadge: 'Trùng',
    accountAliasRequired: 'Tên tài khoản là bắt buộc.',
    redirectUrlRequired: 'URL chuyển hướng của Riot là bắt buộc.',
    cookieOrRedirectRequired: 'Vui lòng cung cấp URL chuyển hướng hoặc chuỗi cookie Riot.',
    invalidCookieString: 'Chuỗi cookie không hợp lệ. Hãy nhập ssid và các cặp key=value hợp lệ.',
    invalidUrlFormat: 'Định dạng URL không hợp lệ. Vui lòng sao chép toàn bộ địa chỉ từ tab playvalorant.',
    redirectUrlPrefixInvalid: 'URL chuyển hướng phải bắt đầu bằng https://playvalorant.com/.',
    redirectUrlAccessTokenRequired: 'Vui lòng cung cấp URL chuyển hướng Riot chứa access_token.',
    invalidAccessToken: 'Access token cung cấp không hợp lệ.',
    storeCheckFailed: 'Kiểm tra cửa hàng thất bại. Vui lòng thử lại.',
    riotUsernameRequired: 'Tên đăng nhập Riot là bắt buộc.',
    riotPasswordRequired: 'Mật khẩu Riot là bắt buộc.',
    associatedRiotId: 'Riot ID được liên kết',
    openLoginPage: 'Mở trang đăng nhập Riot',
    pasteRedirect: 'Dán URL chuyển hướng sau khi đăng nhập',
    redirectHelpText: 'Sau khi đăng nhập, trình duyệt sẽ chuyển sang playvalorant.com. Hãy copy toàn bộ thanh địa chỉ và dán vào đây.',
    cancelButton: 'Hủy',
    saveButton: 'Lưu tài khoản',
    refreshTokenButton: 'Làm mới Token'
    ,
    // Dashboard specific
    quickStepsTitle: '3 bước nhanh',
    quickStep1: 'Đăng nhập Riot tại',
    quickStep2: 'Sau khi đăng nhập, copy toàn bộ URL từ thanh địa chỉ.',
    quickStep3: 'Dán URL vào ô bên dưới và nhấn nút để lấy cửa hàng.',
    guideTitle: 'Hướng dẫn',
    loginButton: 'Xem cửa hàng',
    waitingPasteUrl: 'Chờ bạn dán URL Riot để xem cửa hàng.',
    noSignupNeeded: 'Không cần đăng ký tài khoản hay lưu cookie lâu dài. Mỗi lần dùng một URL mới để xem cửa hàng hiện tại.',
    logSavedInfo: 'Hệ thống sẽ ghi log Riot ID phía admin sau khi fetch storefront thành công.'
    ,
    // FAQ and footer
    brand: 'VALOCHECK',
    faqTitle: 'FAQ',
    faqItems: [
      {
        question: 'Làm sao để tin tưởng VALOCHECK?',
        answer: 'VALOCHECK là dự án mã nguồn mở. Bạn có thể xem mã nguồn trên GitHub để xác minh cách hoạt động. Kiểm tra footer để xem link.'
      },
      {
        question: 'Xem skin ở đây có bị khóa tài khoản không?',
        answer: 'Dịch vụ chỉ đọc cửa hàng bằng token tạm thời từ redirect URL. Không chỉnh sửa tài khoản.'
      },
      {
        question: 'Xem skin ở đây có bị lộ thông tin tài khoản không?',
        answer: 'Chúng tôi chỉ dùng token tạm thời để lấy dữ liệu cửa hàng và không lưu mật khẩu.'
      }
    ],
    footerText: 'VALOCHECK là một dự án mã nguồn mở phục vụ cộng đồng Valorant. Chúng tôi không liên kết với Riot Games.',
    githubText: 'Xem mã nguồn trên GitHub'
  }
};

export default translations;
