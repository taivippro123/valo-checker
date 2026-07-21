import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import translations from '../i18n';

const FAQ = ({ language = 'en' }) => {
  const [openIndex, setOpenIndex] = useState(-1); // closed by default
  const lang = language || 'en';
  const t = translations[lang] || translations.en;
  const faqs = t.faqItems || [];

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 mt-8">
      <div className="glass-panel rounded-xl p-6 border border-white/5 bg-gradient-to-b from-black/30 to-black/10">
        <h3 className="text-2xl font-extrabold tracking-wider text-valorant-red mb-6">{t.faqTitle}</h3>
        <div className="space-y-4">
          {faqs.map((f, idx) => (
            <div key={idx} className="bg-valorant-darker/60 border border-white/5 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === idx ? -1 : idx)}
                className="w-full text-left px-6 py-6 md:py-5 flex items-center justify-between gap-3 min-h-[72px]"
                aria-expanded={openIndex === idx}
              >
                <span className="font-semibold text-white text-base md:text-lg">{f.question}</span>
                <ChevronDown className={`w-5 h-5 text-valorant-red transition-transform duration-300 ${openIndex === idx ? 'rotate-180' : 'rotate-0'}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-out ${openIndex === idx ? 'max-h-[360px] py-5 opacity-100' : 'max-h-0 py-0 opacity-0'}`}>
                <div className="px-6 text-sm md:text-base text-valorant-gray">
                  {f.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
