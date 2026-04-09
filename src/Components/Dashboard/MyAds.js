import React, { useState, useEffect, useContext } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { AuthContext } from '../../contextStore/AuthContext';
import { ToastContext } from '../../contextStore/ToastContext';
import { supabase } from 'backend/config';
import { isAdExpired } from '../../utils/adExpiry';
import PostCards from '../PostCards/PostCards';
import BarLoading from '../Loading/BarLoading';
import './Dashboard.css';

function getCreatedDate(product) {
  if (!product?.createdAt) return null;
  return product.createdAt.toDate
    ? product.createdAt.toDate()
    : new Date(product.createdAt);
}

function MyAds() {
  const { user } = useContext(AuthContext);
  const { addToast } = useContext(ToastContext) || {};
  const history = useHistory();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [deletingId, setDeletingId] = useState(null);
  const [publishingId, setPublishingId] = useState(null);

  useEffect(() => {
    const userId = user?.uid || user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load ads:', error);
          setLoading(false);
          return;
        }
        const list = (data || []).map((doc) => ({
          ...doc,
          createdAt: doc.created_at ? { toDate: () => new Date(doc.created_at) } : null,
        }));
        setPosts(list);
        setLoading(false);
      });
  }, [user?.uid, user?.id]);

  const pendingPosts = posts.filter((p) => p.status === 'pending');
  const draftPosts = posts.filter((p) => p.status === 'draft');
  const activePosts = posts.filter(
    (p) => p.status === 'active' && !isAdExpired(p)
  );
  const soldPosts = posts.filter((p) => p.status === 'sold');
  const expiredPosts = posts.filter(
    (p) => p.status === 'expired' || (p.status === 'active' && isAdExpired(p))
  );

  const handleDeleteDraft = (productId) => {
    if (deletingId) return;
    setDeletingId(productId);
    supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .then(({ error }) => {
        if (error) {
          addToast?.('Failed to delete draft.', 'error');
        } else {
          setPosts((prev) => prev.filter((p) => p.id !== productId));
          addToast?.('Draft deleted.', 'success');
        }
        setDeletingId(null);
      });
  };

  const handleEditDraft = (product) => {
    history.push(`/ad/${product.id}/edit`);
  };

  const handlePublishDraft = (product) => {
    if (publishingId) return;
    // Validate minimum required fields before publishing
    if (!product.name?.trim()) {
      addToast?.('Please add a title before publishing. Use "Edit" to complete your ad.', 'error');
      return;
    }
    if (!product.price && product.price !== 0) {
      addToast?.('Please add a price before publishing. Use "Edit" to complete your ad.', 'error');
      return;
    }
    const hasImages = (product.images?.length > 0) || product.url;
    if (!hasImages) {
      addToast?.('Please add at least one image before publishing. Use "Edit" to complete your ad.', 'error');
      return;
    }
    setPublishingId(product.id);
    supabase
      .from('products')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', product.id)
      .then(({ error }) => {
        if (error) {
          addToast?.('Failed to publish ad. Try again.', 'error');
        } else {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === product.id
                ? { ...p, status: 'active' }
                : p
            )
          );
          addToast?.('Ad published successfully!', 'success');
        }
        setPublishingId(null);
      });
  };

  const displayList =
    activeTab === 'pending'
      ? pendingPosts
      : activeTab === 'drafts'
        ? draftPosts
        : activeTab === 'active'
          ? activePosts
          : activeTab === 'sold'
            ? soldPosts
            : expiredPosts;

  return (
    <div>
      <div className="dashboardTabs dashboardTabsSub">
        <button
          type="button"
          className={`dashboardTab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending ({pendingPosts.length})
        </button>
        <button
          type="button"
          className={`dashboardTab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active ({activePosts.length})
        </button>
        <button
          type="button"
          className={`dashboardTab ${activeTab === 'drafts' ? 'active' : ''}`}
          onClick={() => setActiveTab('drafts')}
        >
          Drafts ({draftPosts.length})
        </button>
        <button
          type="button"
          className={`dashboardTab ${activeTab === 'sold' ? 'active' : ''}`}
          onClick={() => setActiveTab('sold')}
        >
          Sold ({soldPosts.length})
        </button>
        <button
          type="button"
          className={`dashboardTab ${activeTab === 'expired' ? 'active' : ''}`}
          onClick={() => setActiveTab('expired')}
        >
          Expired ({expiredPosts.length})
        </button>
      </div>
      {loading ? (
        <BarLoading />
      ) : displayList.length === 0 ? (
        <div className="emptyState">
          <p>
            {activeTab === 'pending'
              ? 'No pending ads. Post an ad to get started!'
              : activeTab === 'active'
              ? 'You have no active ads. Post one from the sell button above!'
              : activeTab === 'drafts'
                ? 'No drafts saved. Use "Save as draft" when creating an ad.'
                : activeTab === 'sold'
                  ? 'No sold ads yet.'
                  : 'No expired ads.'}
          </p>
        </div>
      ) : (
        <div className="myAdsGrid">
          {displayList.map((product, index) => (
            <div
              className="dashboardCard myAdsCardWrap"
              key={product.id || index}
            >
              <PostCards product={product} index={index} />
              <div className="myAdsCardFooter">
                {product.stats && (product.stats.views > 0 || product.stats.favorites > 0) && (
                  <div className="myAdsCardStats">
                    {product.stats.views > 0 && <span>{product.stats.views} views</span>}
                    {product.stats.favorites > 0 && <span>{product.stats.favorites} favorites</span>}
                  </div>
                )}
                {product.status === 'pending' && (
                  <div className="myAdsStatusBar myAdsStatusBar--pending">
                    <span className="myAdsStatusDot"></span> Pending Sell Order — under review
                  </div>
                )}
                {product.moderationStatus === 'rejected' && (
                  <div className="myAdsStatusBar myAdsStatusBar--rejected">
                    <span className="myAdsStatusDot"></span> Ad rejected
                  </div>
                )}
                {product.moderationStatus === 'flagged' && (
                  <div className="myAdsStatusBar myAdsStatusBar--flagged">
                    <span className="myAdsStatusDot"></span> Flagged for review
                  </div>
                )}
                {activeTab === 'active' && (
                  <div className="myAdsCardActions">
                    {product.featuredRequestStatus === 'approved' ? (
                      <div className="myAdsFeaturedApproved">
                        <span className="myAdsFeaturedStar">&#9733;</span> Featured
                      </div>
                    ) : product.featuredRequestStatus === 'requested' ? (
                      <div className="myAdsFeaturedPendingBar">
                        <span className="myAdsFeaturedClock">&#9203;</span> Awaiting Approval
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="myAdsRequestFeaturedBtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          supabase
                            .from('products')
                            .update({ is_featured: true })
                            .eq('id', product.id)
                            .then(({ error }) => {
                              if (error) {
                                addToast?.('Failed to request featured. Try again.', 'error');
                              } else {
                                setPosts((prev) =>
                                  prev.map((p) =>
                                    p.id === product.id
                                      ? { ...p, is_featured: true }
                                      : p
                                  )
                                );
                                addToast?.('Featured request submitted!', 'success');
                              }
                            });
                        }}
                      >
                        Request Featured
                      </button>
                    )}
                  </div>
                )}
                {activeTab === 'drafts' && (
                  <div className="myAdsDraftActions">
                    <button
                      type="button"
                      className="myAdsPublishDraftBtn"
                      disabled={publishingId === product.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePublishDraft(product);
                      }}
                    >
                      {publishingId === product.id ? 'Publishing...' : 'Publish'}
                    </button>
                    <div className="myAdsDraftSecondaryActions">
                      <button
                        type="button"
                        className="myAdsEditDraftBtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditDraft(product);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="myAdsDeleteDraftBtn"
                        disabled={deletingId === product.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDraft(product.id);
                        }}
                      >
                        {deletingId === product.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
                {activeTab === 'expired' && (
                  <div className="myAdsCardActions">
                    <Link
                      to={{ pathname: '/create', state: { repost: product } }}
                      className="myAdsRepostBtn"
                    >
                      Repost
                    </Link>
                  </div>
                )}
              </div>
              {activeTab === 'drafts' && (
                <span className="myAdsDraftBadge">Draft</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyAds;
