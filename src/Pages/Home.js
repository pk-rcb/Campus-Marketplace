import React, { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import CategoryGrid from '../Components/Home/CategoryGrid';
import Hero from '../Components/Home/Hero';
import QuickMenu from '../Components/Home/QuickMenu';
import Layout from '../Components/Layout/Layout';
import NearbyAds from '../Components/Location/NearbyAds';
import Posts from '../Components/Posts/Posts';
import { LocationContext } from '../contextStore/LocationContext';
import { supabase } from 'backend/config';
import { seededShuffle } from '../utils/seededShuffle';
import './Home.css';

const QUICK_MENU_COUNT = 8;

/**
 * Sort products by admin-assigned marketingScore (desc) then by createdAt (desc).
 * Products with a higher marketingScore appear first in the Quick Menu.
 * Products without a score default to 0 and fall back to chronological order.
 */
function sortByMarketingScore(list) {
  return [...list].sort((a, b) => {
    const scoreA = Number(a.marketing_score) || 0;
    const scoreB = Number(b.marketing_score) || 0;
    if (scoreA !== scoreB) return scoreB - scoreA;
    // Same score — newest first
    const dateA = new Date(a.created_at || 0);
    const dateB = new Date(b.created_at || 0);
    return dateB - dateA;
  });
}

function Home() {
  const { browseLocation } = useContext(LocationContext);
  const history = useHistory();
  const [visitSeed] = useState(() => Date.now());
  const [allProducts, setAllProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setProductsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        setAllProducts([]);
      } else {
        setAllProducts(data || []);
      }
      setProductsLoading(false);
    };

    fetchProducts();
  }, []);

  // Quick Menu: top candidates by marketingScore, then time-seeded shuffle for variety per visit
  const quickMenuProducts = seededShuffle(
    sortByMarketingScore(allProducts).slice(0, QUICK_MENU_COUNT * 2),
    visitSeed
  ).slice(0, QUICK_MENU_COUNT);

  // Fresh Recommendations: time-seeded shuffle so order varies per visit
  const freshProducts = seededShuffle(allProducts, visitSeed);

  return (
    <Layout>
      <div className="homeParentDiv">
        <Hero />
        <CategoryGrid
          onSelectCategory={(name, id) =>
            history.push(
              id ? `/category/${id}` : `/search?q=${encodeURIComponent(name)}`
            )
          }
        />
        <QuickMenu products={quickMenuProducts} loading={productsLoading} />
        <Posts
          allPosts={allProducts}
          freshPosts={freshProducts}
          loading={productsLoading}
        />
        {browseLocation?.city && (
          <NearbyAds
            city={browseLocation.city}
            state={browseLocation.state}
            limit={8}
          />
        )}
      </div>
    </Layout>
  );
}

export default Home;
