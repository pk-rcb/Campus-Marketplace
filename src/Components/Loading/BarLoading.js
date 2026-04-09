import React from 'react';
import './barloading.css';
const Logo = `${process.env.PUBLIC_URL || ''}/assets/images/nit1.png`;

function BarLoading() {
  return (
    <div className="bar-loading">
      <div className="bar-loading-inner">
        <img src={Logo} alt="NIT" className="bar-loading-logo" />
        <div className="bar-loading-shimmer" />
      </div>
    </div>
  );
}

export default BarLoading;
