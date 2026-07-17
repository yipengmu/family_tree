import React from "react";
import BRAND from "../../constants/brand.js";
import "./BrandLogo.css";

const BrandLogo = ({ alt = BRAND.name, className = "", ...props }) => (
  <img
    className={`brand-logo ${className}`.trim()}
    src={BRAND.logoSrc}
    alt={alt}
    decoding="async"
    {...props}
  />
);

export default BrandLogo;
