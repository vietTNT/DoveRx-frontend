import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "../../styles/LanguageSwitcher.css";
import globeIcon from "../../assets/icons/language.png";
const languages = [
  { code: "vi", label: "Tiếng Việt" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="language-switcher" ref={dropdownRef}>
      {/* Nút bấm hình quả địa cầu */}
      <button
        className={`lang-btn ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        title={i18n.t("language.select_language")}
      >
        <img src={globeIcon} alt="Language" className="globe-icon" />
      </button>

      {/* Menu xổ xuống */}
      {isOpen && (
        <div className="lang-dropdown">
          {languages.map((lang) => (
            <div
              key={lang.code}
              className={`lang-item ${
                i18n.language === lang.code ? "selected" : ""
              }`}
              onClick={() => changeLanguage(lang.code)}
            >
              <span className="lang-flag">{lang.flag}</span>
              <span className="lang-label">{lang.label}</span>
              {i18n.language === lang.code && (
                <span className="check-mark">✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
