import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

// Standard installation paths for Chrome and Edge on Windows
const WINDOWS_CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
];

const WINDOWS_EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

/**
 * Automatically locate Chrome or Microsoft Edge executable on the Windows filesystem
 * @returns {string} Executable path
 */
export const findBrowserExecutable = () => {
  // Check Chrome paths first
  for (const p of WINDOWS_CHROME_PATHS) {
    if (p && fs.existsSync(p)) {
      console.log(`[PuppeteerService] Found Google Chrome at: ${p}`);
      return p;
    }
  }

  // Check Edge paths
  for (const p of WINDOWS_EDGE_PATHS) {
    if (p && fs.existsSync(p)) {
      console.log(`[PuppeteerService] Found Microsoft Edge at: ${p}`);
      return p;
    }
  }

  throw new Error('No compatible Google Chrome or Microsoft Edge browser installation found. Please install a standard chromium browser.');
};

/**
 * Launch non-headless browser to authenticate with Riot and capture token redirect
 * @returns {Promise<{accessToken: string, idToken: string}>}
 */
export const launchRiotLoginPopup = () => {
  return new Promise(async (resolve, reject) => {
    let browser = null;
    let checkInterval = null;
    let resolved = false;

    const rsoAuthUrl = 'https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token+id_token&nonce=1&scope=openid+link+ban+lol_region';

    try {
      const executablePath = findBrowserExecutable();
      
      console.log('[PuppeteerService] Launching Riot Sign-On popup...');
      browser = await puppeteer.launch({
        executablePath,
        headless: false,
        defaultViewport: null,
        args: [
          '--window-size=500,660',
          '--disable-blink-features=AutomationControlled', // Disable blink features that announce automation
          `--app=${rsoAuthUrl}` // Launches Chrome in app mode (clean wrapper frame with no browser tabs/URL address bar)
        ]
      });

      const pages = await browser.pages();
      const page = pages[0] || await browser.newPage();

      // Override navigator.webdriver to fully bypass automation checks
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      });

      // Monitor URL navigation to intercept the redirect hash
      checkInterval = setInterval(async () => {
        try {
          const currentUrl = page.url();
          
          if (currentUrl.includes('playvalorant.com/opt_in')) {
            clearInterval(checkInterval);
            resolved = true;
            
            console.log(`[PuppeteerService] Intercepted redirect URL: ${currentUrl}`);

            // Parse tokens from hash parameters
            // URL hashes (starts with #) can be parsed easily by swapping '#' with '?' to treat them as query parameters
            const urlObj = new URL(currentUrl.replace('#', '?'));
            const accessToken = urlObj.searchParams.get('access_token');
            const idToken = urlObj.searchParams.get('id_token');

            // Close the browser automatically
            await browser.close();

            if (accessToken) {
              console.log('[PuppeteerService] Successfully extracted Access Token.');
              resolve({ accessToken, idToken });
            } else {
              reject(new Error('Failed to find access_token in the redirect URL hash parameters.'));
            }
          }
        } catch (err) {
          // If the page/browser is closed before we capture the redirect, catch the error
          clearInterval(checkInterval);
          if (!resolved) {
            reject(new Error('Login window closed before authentication was completed.'));
          }
        }
      }, 500);

      // Listen for browser close event to ensure we clean up the interval and reject the promise
      browser.on('disconnected', () => {
        clearInterval(checkInterval);
        if (!resolved) {
          reject(new Error('Login window closed before authentication was completed.'));
        }
      });

    } catch (error) {
      clearInterval(checkInterval);
      if (browser) {
        try {
          await browser.close();
        } catch (e) {}
      }
      reject(error);
    }
  });
};
