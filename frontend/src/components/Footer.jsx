import React from 'react';
import translations from '../i18n';

const Footer = ({ language = 'en' }) => {
  const lang = language || 'en';
  const t = translations[lang] || translations.en;

  return (
    <footer className="mt-10 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
      <div className="max-w-7xl mx-auto p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h4 className="text-2xl font-extrabold text-valorant-red tracking-wider">{t.brand}</h4>
          <p className="mt-2 text-sm text-valorant-gray max-w-xl">{t.footerText}</p>
        </div>

        <div className="ml-auto text-right flex flex-col items-end gap-2">
          <a href="https://github.com/taivippro123/valo-checker" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-valorant-gray hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
              <path d="M12 0.5C5.37 0.5 0 5.87 0 12.5c0 5.28 3.438 9.75 8.205 11.33.6.11.82-.26.82-.58 0-.29-.01-1.04-.016-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.39-1.333-1.76-1.333-1.76-1.09-.75.082-.73.082-.73 1.205.085 1.84 1.24 1.84 1.24 1.07 1.83 2.807 1.3 3.492.99.108-.77.418-1.3.76-1.6-2.665-.3-5.466-1.33-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 013.003-.404c1.02.005 2.045.138 3.004.404 2.29-1.552 3.296-1.23 3.296-1.23.654 1.653.244 2.873.12 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.805 5.625-5.475 5.92.43.37.815 1.1.815 2.22 0 1.6-.014 2.89-.014 3.28 0 .32.216.696.825.578C20.565 22.247 24 17.78 24 12.5 24 5.87 18.63.5 12 .5z" />
            </svg>
            <span className="text-sm">{t.githubText}</span>
          </a>
          <div className="text-xs text-valorant-gray mt-2">© {new Date().getFullYear()} {t.brand}.</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
