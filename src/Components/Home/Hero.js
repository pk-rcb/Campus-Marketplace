import React from 'react';
import { Link, useHistory } from 'react-router-dom';
import './Hero.css';

function Hero() {
  const history = useHistory();

  const handleExplore = (e) => {
    e.preventDefault();
    // Scroll down to the first section (CategoryGrid) smoothly
    window.scrollBy({ top: 600, left: 0, behavior: 'smooth' });
  };

  return (
    <div className="heroParentDiv">
      <h4 className="heroSubtitle">Elevating Campus Life</h4>
      <h1 className="heroTitle">
        Buy, Sell & Trade<br />Within Your Campus
      </h1>
      <p className="heroDescription">
        The ultimate marketplace for students. Find textbooks, gear, tech, and more from your fellow peers.
      </p>
      
      <div className="heroButtons">
        <button className="heroBtnPrimary" onClick={handleExplore}>
          Explore Items
        </button>
        <Link to="/create" className="heroBtnSecondary">
          Start Selling &gt;
        </Link>
      </div>
    </div>
  );
}

export default Hero;
