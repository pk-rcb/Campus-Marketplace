import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../Components/Layout/Layout';
import { AuthContext } from '../contextStore/AuthContext';
import { supabase } from 'backend/config';
import { formatPrice } from '../utils/formatters';
import './Transactions.css';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function StatusBadge({ status }) {
  const map = {
    active:  { label: 'Active',   color: '#16a34a' },
    pending: { label: 'Pending',  color: '#d97706' },
    sold:    { label: 'Sold',     color: '#6b7280' },
    draft:   { label: 'Draft',    color: '#9ca3af' },
    expired: { label: 'Expired',  color: '#ef4444' },
  };
  const s = map[status] || { label: status, color: '#6b7280' };
  return (
    <span style={{
      background: s.color, color: '#fff', borderRadius: 12,
      padding: '2px 10px', fontSize: 12, fontWeight: 600,
    }}>{s.label}</span>
  );
}

function TransactionsPage() {
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState('buying');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.id || user?.uid;

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setItems([]);

    async function fetchData() {
      if (tab === 'selling') {
        // All products listed by this seller
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error) setItems(data || []);
      } else {
        // Fetch actual purchases from transactions table
        const { data: txs, error: txError } = await supabase
          .from('transactions')
          .select('id, created_at, amount, status, products(*), profiles!seller_id(name)')
          .eq('buyer_id', userId)
          .order('created_at', { ascending: false });

        // Fetch inquiries (conversations without a completed transaction)
        const { data: convs, error } = await supabase
          .from('conversations')
          .select('*, products(*)')
          .eq('buyer_id', userId)
          .order('created_at', { ascending: false });

        const purchases = [];
        if (!txError && txs) {
          txs.forEach(t => {
            if (t.products) {
               purchases.push({
                 ...t.products,
                 transaction_id: t.id,
                 purchase_amount: t.amount,
                 purchase_date: t.created_at,
                 is_purchase: true,
                 seller_name: t.profiles?.name || t.products?.seller_name || 'Seller'
               });
            }
          });
        }

        const inquiries = [];
        if (!error && convs) {
          // Filter out convs for products that were already purchased by this user
          const purchasedProductIds = purchases.map(p => p.id);
          convs.forEach(c => {
            if (c.products && !purchasedProductIds.includes(c.products.id)) {
              inquiries.push({
                ...c.products,
                conversation_id: c.id,
                conv_created_at: c.created_at,
                is_purchase: false,
                seller_name: c.products?.seller_name || 'Seller',
              });
            }
          });
        }

        setItems([...purchases, ...inquiries]);
      }
      setLoading(false);
    }

    fetchData();
  }, [userId, tab]);

  if (!user) {
    return (
      <Layout>
        <div className="transactionsPage">
          <p>Please <Link to="/login">log in</Link> to view your transactions.</p>
        </div>
      </Layout>
    );
  }

  const queueItems  = tab === 'selling' ? items.filter(p => p.status === 'active' || p.status === 'pending') : [];
  const soldItems   = tab === 'selling' ? items.filter(p => p.status === 'sold') : [];
  
  const purchasedItems = tab === 'buying' ? items.filter(p => p.is_purchase) : [];
  const inquiryItems   = tab === 'buying' ? items.filter(p => !p.is_purchase) : [];

  return (
    <Layout>
      <div className="transactionsPage">
        <h1>My Transactions</h1>

        {/* Tab selector */}
        <div className="transactionsTabs">
          <button type="button" className={tab === 'buying'  ? 'active' : ''} onClick={() => setTab('buying')}>
            🛒 Buying History
          </button>
          <button type="button" className={tab === 'selling' ? 'active' : ''} onClick={() => setTab('selling')}>
            🏷️ Selling History
          </button>
        </div>

        {loading ? (
          <p style={{ padding: 24 }}>Loading…</p>
        ) : tab === 'selling' ? (
          <>
            {/* ON QUEUE */}
            <section>
              <h2 style={{ fontSize: 16, margin: '24px 0 8px', color: '#374151' }}>
                🟡 On Queue ({queueItems.length})
              </h2>
              {queueItems.length === 0 ? (
                <p className="transactionsEmpty">No active listings.</p>
              ) : (
                <ul className="transactionsList">
                  {queueItems.map(p => (
                    <ProductRow key={p.id} product={p} role="seller" />
                  ))}
                </ul>
              )}
            </section>

            {/* SOLD */}
            <section>
              <h2 style={{ fontSize: 16, margin: '24px 0 8px', color: '#374151' }}>
                ✅ Previously Sold ({soldItems.length})
              </h2>
              {soldItems.length === 0 ? (
                <p className="transactionsEmpty">No sold items yet.</p>
              ) : (
                <ul className="transactionsList">
                  {soldItems.map(p => (
                    <ProductRow key={p.id} product={p} role="seller" />
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          /* BUYING */
          <>
            <section>
              <h2 style={{ fontSize: 16, margin: '24px 0 8px', color: '#16a34a' }}>
                🛍️ Purchased Items ({purchasedItems.length})
              </h2>
              {purchasedItems.length === 0 ? (
                <p className="transactionsEmpty">No completed purchases yet.</p>
              ) : (
                <ul className="transactionsList">
                  {purchasedItems.map(p => (
                    <ProductRow key={p.transaction_id || p.id} product={p} role="buyer" />
                  ))}
                </ul>
              )}
            </section>
            
            <section>
              <h2 style={{ fontSize: 16, margin: '24px 0 8px', color: '#374151' }}>
                💭 Inquiries & Active Chats ({inquiryItems.length})
              </h2>
              {inquiryItems.length === 0 ? (
                <p className="transactionsEmpty">
                  No active inquiries. Browse ads and chat with sellers to get started!
                </p>
              ) : (
                <ul className="transactionsList">
                  {inquiryItems.map(p => (
                    <ProductRow key={p.conversation_id || p.id} product={p} role="buyer" />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}

function ProductRow({ product, role }) {
  const thumb = product.thumbnail_url || (product.images || [])[0] || product.url;
  const date = product.is_purchase ? product.purchase_date : (role === 'buyer' ? product.conv_created_at : (product.sold_at || product.created_at));
  
  // Show the actual negotiated purchase amount if it exists, otherwise list price
  const displayPrice = product.is_purchase && product.purchase_amount ? product.purchase_amount : product.price;

  return (
    <li className="transactionsItem">
      <div className="transactionsItemImage">
        {thumb ? <img src={thumb} alt="" /> : <span>📦</span>}
      </div>
      <div className="transactionsItemBody">
        <Link to={`/ad/${product.id}`} className="transactionsItemTitle">
          {product.name || product.title || 'Ad'}
        </Link>
        <p className="transactionsItemMeta">
          {role === 'buyer' ? `Seller: ${product.seller_name || '—'}` : `Listed by you`}
        </p>
        <p className="transactionsItemAmount">{formatPrice(displayPrice)}</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
          {product.is_purchase ? (
            <span style={{
              background: '#16a34a', color: '#fff', borderRadius: 12,
              padding: '2px 10px', fontSize: 12, fontWeight: 600,
            }}>Purchased</span>
          ) : (
            <StatusBadge status={product.status} />
          )}
          {date && <span className="transactionsItemDate">{formatDate(date)}</span>}
        </div>
        {role === 'buyer' && !product.is_purchase && (
          <Link to={`/chat/${product.conversation_id}`} style={{ fontSize: 13, color: '#2563eb', marginTop: 4, display: 'inline-block' }}>
            💬 Continue chat
          </Link>
        )}
      </div>
    </li>
  );
}

export default TransactionsPage;
